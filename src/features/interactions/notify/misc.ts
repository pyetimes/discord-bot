import { OWNER } from "@/config";
import { Bot } from "@/types";
import { ChannelType, ChatInputCommandInteraction, Interaction, TextChannel } from "discord.js";

export const notifyChannels = "notify_channels";


export enum Phase {
    REVIEW = "review",
    PUBLISH = "publish",
}

export interface NotifyChannel {
    id: number;
    guild_id: string;
    phase: Phase;
    channel_id: string;
    channel_name: string;
    configured_by: string;
    configured_at: Date;
}

type P = (bot: Bot, interaction: ChatInputCommandInteraction, phase: Phase) => Promise<any>;

export const list: P = async (bot, interaction, phase) => {
    const { guildId } = interaction;
    if (!guildId) 
        return await interaction.reply("Comando solo disponible desde un servidor");
    
    const rows = await bot.db.connection(notifyChannels)
        .where({ guild_id: guildId, phase });

    const list = rows
        .map(r => `• <#${r.channel_id}> (configurado por <@${r.configured_by}>)`)
        .join('\n');
    
    await interaction.reply(list.length > 0 ?`Canales de notificación:\n${list}`: "no hay canales configurados");
}

export const unsubscribe: P = async (bot, interaction, phase) => {
    const { options, guildId } = interaction;
    const channel = options.getChannel("channel", true);

    const deleted = await bot.db.connection(notifyChannels)
        .where({ guild_id: guildId, channel_id: channel.id, phase, })
        .del();
    
    return await interaction.reply(deleted ? `Notificaciones \`desactivadas\` en ${channel}.` : `no hay notificaciones \`activas\` en ${channel}`);
}

export const subscribe: P = async (bot, interaction, phase) => {
    const { options, guildId, user } = interaction;

    const channel = options.getChannel("channel", true);

    if (channel.type !== ChannelType.GuildText || !(channel instanceof TextChannel)) 
        return await interaction.reply({ content: "selecciona un canal de texto valido" });

    if ((await bot.db.connection(notifyChannels).where({ guild_id: guildId, channel_id: channel.id })).length > 0) 
        return await interaction.reply({ content: `ya estoy notificando en ${channel}`});
    

    await bot.db.connection(notifyChannels).insert({
        guild_id: guildId,
        phase,
        channel_id: channel.id,
        channel_name: channel.name,
        configured_by: user.id
    });

    await interaction.reply({ content: `notificaciones \`activadas\` en ${channel}.` });
}