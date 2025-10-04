import { Server } from "http";
import express from "express";
import { ChannelSubscriptionRepository } from "@/repositories/ChannelSubscription";
import { LogLevel, Module } from "@core";
import { CacheType, ChannelType, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import { WH_TOKEN as TOKEN } from "@/config";
import { RoleSubscription } from "@/repositories/RoleRepository";


const TOPIC_P = "T_NOTIFICATION_OF_PUBLICATION";
const TOPIC_R = "T_NOTIFICATION_OF_REVIEW";

const aux = async (interaction: ChatInputCommandInteraction<CacheType>, topic: string) => {
    switch (interaction.options.getSubcommand(true)) {
        case "add": {
            const { options, guildId, user } = interaction;
            const channel = options.getChannel("channel", true);
            
            if (guildId === null)
                return interaction.reply("I only notify in guilds");

            if (!(channel instanceof TextChannel))
                return interaction.reply("select a valid text channel");

            const repo = new ChannelSubscriptionRepository();
            
            if ((await repo.getByChannel(channel.id, topic)).length !== 0) 
                return interaction.reply(`I'm already notifying on ${channel}`);

            await repo.create(guildId, channel.id, topic, user.id);

            return interaction.reply(`Notifications enabled on ${channel}`);
        }
        case "remove": {
            const channel = interaction.options.getChannel("channel", true);
            const repo = new ChannelSubscriptionRepository();
            const c = await repo.getByChannel(channel.id, topic);

            if (c.length !== 0) for (const i of c)
                await repo.delete(i.id);

            return interaction.reply(`Notifications disabled on ${channel}`);
        }
        case "list": {
            const { guildId } = interaction;
            
            if (guildId === null)
                return interaction.reply("I only notify in guilds");

            const repo = new ChannelSubscriptionRepository();
            const list = (await repo.list({ guildId, topic }))
                .map((a) => `• <#${a.channelId}> configured by <@${a.createdBy}>`);
            
            return interaction.reply(list.length > 0
                ? `channels where I notify:\n${list.join("\n")}`
                : "no channels configured"
            );
        }
        case "add-role": {
            const { guildId } = interaction;
            const role = interaction.options.getRole("role", true);

            if (guildId === null)
                return interaction.reply("I only notify in guilds");
            
            const repo = new RoleSubscription();

            if (await repo.getByRoleId(role.id))
                return interaction.reply("I'm already notifying this role");
            
            await repo.create(topic, guildId, role.id, interaction.user.id);

            return interaction.reply(`I will now notify this role \`${role.name}\``);
        }
        case "remove-role": {
            const { guildId } = interaction;
            const role = interaction.options.getRole("role", true);

            if (guildId === null)
                return interaction.reply("I only notify in guilds");

            const repo = new RoleSubscription();

            const r = await repo.getByRoleId(role.id);

            if (r !== null)
                await repo.delete(r.id);
            
            return interaction.reply(`Notifications to the \`${role.name}\` role have been disabled.`);
        }
    }
}

const data = (name: string, description: string) => new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .addSubcommand(s => s
        .setName("add")
        .setDescription("Activate notifications on this channel")
        .addChannelOption(o => o
            .setName("channel")
            .setDescription("text channel")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(s => s
        .setName("remove")
        .setDescription("Turn off notifications on this channel")
        .addChannelOption(o => o
            .setName("channel")
            .setDescription("text channel")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(s => s
        .setName("list")
        .setDescription("Displays all channels configured to receive notifications")
    )
    .addSubcommand(s => s
        .setName("add-role")
        .setDescription("Add a role to the notification")
        .addRoleOption(o => o
            .setName("role")
            .setDescription("Select the role to receive notifications")
            .setRequired(true)
        )
    )
    .addSubcommand(s => s
        .setName("remove-role")
        .setDescription("Remove a role from the notification")
        .addRoleOption(o => o
            .setName("role")
            .setDescription("Select the role to remove from receiving notifications")
            .setRequired(true)
        )
    )

function isURL(raw: string) {
    try { new URL(raw); return true; } catch { return false; }
}

const ex = express();
let server: Server | null = null;

ex.use(express.json());

export default {
    name: "m_notify",
    commands: [
        {
            data: data("notify", "Notifications of new posts")
                    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
            execute: async (_, interaction) =>  await aux(interaction, TOPIC_P),
        },
        {
            data: data("notify-review", "Notifications of versions under review")
                    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            execute: async (_, interaction) => await aux(interaction, TOPIC_R),
        }
    ],
    init(client) {
        ex.post("/article", async (req, res) => {
            if (req.headers['x-webhook-token'] !== TOKEN) 
                return res.status(401).json({ message: 'Unauthorized: invalid webhook token' });

            const body = req.body ?? {};
            const errors = [];
            const content = body?.body;
            const title = body?.title;
            const url = body?.url;
            const description = body?.description;
            const image = body?.image;
            const thumbnail = body?.thumbnail;
            const authorName = body?.author_name;
            const authorIcon = body?.author_icon;
            const published = body?.published ?? false;

            if (typeof title !== 'string' || title.trim() === '') 
                errors.push({ field: 'title', message: 'Title is required and must be a non-empty string' });

            if (content !== undefined && typeof content !== 'string') 
                errors.push({ field: 'body', message: 'Body content is required and must be a non-empty string' });

            if (typeof url !== 'string' || !isURL(url)) 
                errors.push({ field: 'url', message: 'A valid URL is required for the url field' });

            if (typeof description !== 'string' || description.trim() === '') 
                errors.push({ field: 'description', message: 'Description is required and must be a non-empty string' });

            if (image !== undefined && (typeof image !== 'string' || !isURL(image))) 
                errors.push({ field: 'image', message: 'If provided, image must be a valid URL string' });

            if (thumbnail !== undefined && (typeof thumbnail !== 'string' || !isURL(thumbnail))) 
                errors.push({ field: 'thumbnail', message: 'If provided, thumbnail must be a valid URL string' });

            if (authorIcon !== undefined && (typeof authorIcon !== 'string' || !isURL(authorIcon))) 
                errors.push({ field: 'author_icon', message: 'If provided, author_icon must be a valid URL string' });

            if (authorName !== undefined && (typeof authorName !== 'string' || authorName.trim() === ''))
                errors.push({ field: 'author_name', message: 'If provided, author_name must be a non-empty string' });

            if (typeof published !== 'boolean') 
                errors.push({ field: 'published', message: 'Published must be a boolean value' });

            if (errors.length > 0)
                return res.status(400).json({ message: 'Invalid request payload', errors });

            const repoCSR = new ChannelSubscriptionRepository();
            const repoRS = new RoleSubscription();

            const topic = published ? TOPIC_P : TOPIC_R;

            const cs = repoCSR.list({ topic });

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setURL(url)
                .setDescription(description)
                .setImage(image)
                .setThumbnail(thumbnail)
                .setAuthor(authorName ? { name: authorName, iconURL: authorIcon } : null)
                .setColor([0, 153, 255])
                .setTimestamp();

            const map = (await cs).reduce((pv, cv) => {
                const a = pv.get(cv.guildId) ?? [];
                a.push(cv.channelId);
                pv.set(cv.guildId, a);
                return pv;
            }, new Map<string, string[]>());

            for (const [ guildId, channelsId ] of map) {
                const rs = await repoRS.list({ topic, guildId });
                
                const rContent = (rs.length > 0 ? `${rs.reduce((pv, cv) => pv + `<@&${cv.roleId}> `, "")}` : '')
                    + (content ? `\n${content}` : '');

                await client.notify({
                    embeds: [embed],
                    content: rContent ? rContent : undefined,
                }, channelsId);
            }
            res.status(200).send({ message: "Ok" });
        });

        server = ex.listen(3000, () => client.log({ 
            level: LogLevel.INFO, 
            message: "listening on port 3000",
            timestamp: (new Date()).toISOString(),
        }));
    },
    destroy: (_) => {
        if (server !== null) server.close();
    }
} as Module;
