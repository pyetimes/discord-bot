import { ChannelType, ChatInputCommandInteraction, Interaction, TextChannel } from "discord.js";
import { FeatureInteraction } from "../types";
import { Bot } from "@/types";
import { OWNER } from "@/config";
import { notifyChannels, notifyPermissions, NotifyPermissions, Permissions } from "./misc";


type P = (bot: Bot, interaction: ChatInputCommandInteraction) => Promise<any>;


const add: P = async (bot, interaction) => {
    const { options, guildId, user } = interaction;

    const channel = options.getChannel("channel", true);

    if (channel.type !== ChannelType.GuildText || !(channel instanceof TextChannel)) 
        return await interaction.reply({ content: "selecciona un canal de texto valido" });

    if ((await bot.db.connection(notifyChannels).where({ guild_id: guildId, channel_id: channel.id })).length > 0) 
        return await interaction.reply({ content: `ya estoy notificando en ${channel}`});
    

    await bot.db.connection(notifyChannels).insert({
        guild_id: guildId,
        channel_id: channel.id,
        channel_name: channel.name,
        configured_by: user.id
    });

    await interaction.reply({ content: `notificaciones \`activadas\` en ${channel}.` });
}

const remove: P = async (bot, interaction) => {
    const { options, guildId } = interaction;
    const channel = options.getChannel("channel", true);

    const deleted = await bot.db.connection(notifyChannels)
        .where({ guild_id: guildId, channel_id: channel.id })
        .del();
    
    return await interaction.reply(deleted ? `Notificaciones \`desactivadas\` en ${channel}.` : `no hay notificaciones \`activas\` en ${channel}`);
}

const list: P = async (bot, interaction) => {
    const { guildId } = interaction;
    if (!guildId) 
        return await interaction.reply("Comando solo disponible desde un servidor");
    
    const rows = await bot.db.connection(notifyChannels)
        .where({ guild_id: guildId });

    const list = rows
        .map(r => `• <#${r.channel_id}> (configurado por <@${r.configured_by}>)`)
        .join('\n');
    
    await interaction.reply(`Canales de notificación:\n${list}`);
}

const hasPermission = async (bot: Bot, interaction: Interaction, perm: Permissions): Promise<boolean> => {
    const { user, guild } = interaction;

    if (user.id === guild?.ownerId || user.id === OWNER) 
        return true;

    const userPermissions = await bot.db.connection<NotifyPermissions>(notifyPermissions)
            .where({ user_id: user.id }).first();
            
    if (!userPermissions) 
        return false;

    return (userPermissions.bitmask & perm) === perm;
}

export default {
    event: "interaction.notify",
    async update({ bot, interaction }) {

        if (!interaction.isChatInputCommand()) return;
        
        switch (interaction.options.getSubcommand()) {
            case "add":
                if (await hasPermission(bot, interaction, Permissions.ADD))
                    await add(bot, interaction);
                else await interaction.reply({ content: "No tienes permiso para añadir notificaciones" });
                break;
            case "remove": {
                if (await hasPermission(bot, interaction, Permissions.REMOVE))
                    await remove(bot, interaction);
                else await interaction.reply({ content: "No tienes permiso para remover notificaciones" });
                break;
            }
            case "list": {
                if (await hasPermission(bot, interaction, Permissions.LIST))
                    await list(bot, interaction);
                else await interaction.reply({ content: "No tienes permiso para listar los canales que reciben notificaciones" });
                break;
            }
        }
        return await interaction.reply({ content: 'Subcomando no reconocido.' });
    }
} as FeatureInteraction;
