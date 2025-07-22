import { join } from "path";
import { Server } from "http";
import express from "express";
import bodyParser from "body-parser";
import { EmbedBuilder } from "@discordjs/builders";
import { OWNER, WEBHOOK_TOKEN as TOKEN } from "@/config";
import { Bot } from "@/types";
import { load_module_sync } from "@/loader";
import { FeatureInteraction } from "..";
import { ChannelType, TextChannel } from "discord.js";
import { writeFileSync } from "fs";



function is_url(raw: string) {
    try {
        new URL(raw);
        return true;
    } catch {
        return false;
    }
}

const path_subscribers = join(__dirname, "subscribers.json")

const load_subscribers = () => {
    return load_module_sync<string[]>(path_subscribers) ?? [];
}

const save_subscribers = (d: string[]) => {
    writeFileSync(path_subscribers, JSON.stringify(d));
}


interface NotifyParams {
    bot: Bot, title: string, url: string, description: string, 
    image?: string, thumbnail?: string, author_name?: string, author_icon?: string,
}

const notify_subscribers = async (p: NotifyParams) => {
    const subscribers = load_subscribers();

    const embed = new EmbedBuilder()
        .setTitle(p.title)
        .setURL(p.url)
        .setDescription(p.description)
        .setImage(p.image ?? null)
        .setThumbnail(p.thumbnail ?? null)
        .setColor([0, 153, 255])
        .setTimestamp();

    if (p.author_name) {
        embed.setAuthor({ name: p.author_name, iconURL: p.author_icon });
    }

    for (const channelId of subscribers.values()) {
        const channel = await p.bot.client.channels.fetch(channelId).catch(() => null);

        if (channel && channel.isSendable()) {
            await channel.send({ embeds: [embed] }).catch(console.error);
        }
    }
}


const app = express();
app.use(bodyParser.json());


let server: Server | null = null;

export default {
    on_mount({ bot }) {
        app.post("/webhook", (req, res) => {
            if (req.headers['x-webhook-token'] !== TOKEN) {
                return res.status(401).send('Unauthorized');
            }
            const title = req.body?.title;
            const url = req.body?.url;
            const description = req.body?.description;
            const image = req.body?.image;
            const thumbnail = req.body?.thumbnail;
            const author_name = req.body?.author_name;
            const author_icon = req.body?.author_icon;


            if (typeof title !== "string") {
                return res.status(400).send({ "msg": 'Se debe pasar un "title"' });
            }

            if (typeof url !== "string" || (!is_url(url))) {
                return res.status(400).send({ "msg": 'Se debe pasar una "url" valida' })
            }

            if (typeof description !== "string") {
                return res.status(400).send({ "msg": 'Se debe pasar una "description"' })
            }

            if (image !== undefined && (typeof image === "string" && !is_url(image))) {
                return res.status(400).send({ "msg": 'Se debe pasar una "image" valida (enlace)' })
            }

            if (thumbnail !== undefined && (typeof thumbnail === "string" && !is_url(url))) {
                return res.status(400).send({ "msg": 'Se debe pasar una "thumbnail" valida (enlace)' })
            }

            if (author_icon !== undefined && (typeof author_icon !== "string" && !is_url(url))) {
                return res.status(400).send({ "msg": 'Se debe pasar una "author_icon" valida (enlace)' })
            }

            if (author_name !== undefined && (typeof author_name !== "string")) {
                return res.status(400).send({ "msg": 'Se debe pasar una "author_name" valido (string)' })
            }

            notify_subscribers({bot, title, url, description, image, thumbnail, author_icon, author_name})
                .then(() => res.status(200).send({msg: 'notificados'}))
                .catch(err => {
                    console.error(err);
                    res.status(500).send({ msg: 'Error interno' });
                });
        });

        server = app.listen(3000, () => console.log('Webhook escuchando en el puerto 3000'));
    },

    on_unmount(p) {
        server!.close();
    },

    event: "interaction.notify",
    async update({ interaction }) {
        // Permisos
        if (interaction.user.id !== OWNER) {
            return await interaction.reply("No tienes permiso para configurar esto");
        }

        if (!interaction.isChatInputCommand()) return;
        const { options } = interaction;

        const subcommand = options.getSubcommand();
        const channel = interaction.options.getChannel('channel', true);

        if (channel.type !== ChannelType.GuildText || !(channel instanceof TextChannel)) {
            return await interaction.reply({ content: "selecciona un canal de texto valido" });
        }
        const subscribers = load_subscribers();
        
        switch (subcommand) {
            case "subscribe":
                if (subscribers.includes(channel.id)) {
                    return await interaction.reply({ content: `ya estoy notificando en ${channel}` });
                }

                subscribers.push(channel.id);
                save_subscribers(subscribers);
                
                return await interaction.reply({ content: `notificaciones \`activadas\` en ${channel}.`, });
            case "unsubscribe":
                if (!subscribers.includes(channel.id)) {
                    return await interaction.reply({ content: `no hay notificaciones \`activas\` en ${channel}` });
                }

                save_subscribers(subscribers.filter((c) => c !== channel.id));
                return await interaction.reply({ content: `Notificaciones \`desactivadas\` en ${channel}.` });
        }

        return await interaction.reply({ content: 'Subcomando no reconocido.' });
    }
} as FeatureInteraction;