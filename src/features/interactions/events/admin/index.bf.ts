import { FeatureInteraction } from "../../types";
import { CommandWithServers, DB_TABLE_COMMAND_SERVERS, DB_TABLE_COMMANDS, getAllCommands, ServerId } from "../misc";
import { ChatInputCommandInteraction, InteractionResponse } from "discord.js";
import { Bot } from "@/types";


function relativeTimestamp(date: Date): string {
    const seconds = Math.floor(date.getTime() / 1000);
    return `<t:${seconds}:R>`;
}

const list = async (bot: Bot, i: ChatInputCommandInteraction, status: InteractionResponse, map: Map<string, CommandWithServers>) => {
    const name = i.options.getString("command", false) ?? "";
    if (name) {
        const entry = map.get(name);
        if (!entry) 
            return  status.edit(`El comando \`/${name}\` no existe`);

        return status.edit(`- \`/${entry.name}\` configurado ${relativeTimestamp(entry.configured_at)}\n\`\`\`json\n${
            JSON.stringify(entry.servers, null, 2)
        }\n\`\`\``);
    }

    const lines = Array.from(map.values())
        .map(c => `- \`/${c.name}\` configurado ${relativeTimestamp(c.configured_at)}\n\`\`\`json\n${
            JSON.stringify(c.servers, null, 2)
        }\n\`\`\``).join("\n");

    return status.edit(lines ?? "No hay comandos");
}

const add = async (bot: Bot, i: ChatInputCommandInteraction, status: InteractionResponse, map: Map<string, CommandWithServers>) => {
    const serverId = i.options.getString("server_id", true);
    const name = i.options.getString("command", false) ?? "";
    const entry = map.get(name);

    if (!entry)
        return  status.edit(`El comando \`/${name}\` no existe`);
    
    if (entry.servers.includes(serverId as ServerId)) 
        return status.edit(`\`/${name}\` ya esta en \`${serverId}\``);
    
    if (entry.servers.length === 1 && entry.servers[0] === "global") {
        await bot.db
            .connection(DB_TABLE_COMMAND_SERVERS)
            .where({ command_id: entry.id, server: "global" })
            .del();
        entry.servers = [];
    }

    await bot.db
        .connection(DB_TABLE_COMMAND_SERVERS)
        .insert({ command_id: entry.id, server: serverId });
    
    await bot.db
        .connection(DB_TABLE_COMMANDS)
        .where({ id: entry.id })
        .update({ configured_at: bot.db.connection.fn.now() });
    
    return status.edit(`\`/${name}\` añadido a **${serverId}**`);
}

const remove = async (bot: Bot, i: ChatInputCommandInteraction, status: InteractionResponse, map: Map<string, CommandWithServers>) => {
    const serverId = i.options.getString("server_id", true);
    const name = i.options.getString("command", false) ?? "";
    const entry = map.get(name);
    
    if (!entry) 
        return status.edit(`El comando \`/${name}\` no existe`);
    
    if (!entry.servers.includes(serverId as ServerId)) 
        return status.edit(`\`/${name}\` no esta en \`${serverId}\``);
    
    await bot.db
        .connection(DB_TABLE_COMMAND_SERVERS)
        .where({ command_id: entry.id, server: serverId })
        .del();
    
    const rem: ServerId[] = await bot.db
        .connection(DB_TABLE_COMMAND_SERVERS)
        .where({ command_id: entry.id })
        .pluck("server");

    if (rem.length === 0) {
        await bot.db
            .connection(DB_TABLE_COMMAND_SERVERS)
            .insert({ command_id: entry.id });

    }
    await bot.db
        .connection(DB_TABLE_COMMANDS)
        .where({ id: entry.id })
        .update({ configured_at: bot.db.connection.fn.now() });

    return status.edit(`\`/${name}\` removido de **${serverId}**.`);
}

const global = async (bot: Bot, i: ChatInputCommandInteraction, status: InteractionResponse, map: Map<string, CommandWithServers>) => {
    const name = i.options.getString("command", false) ?? "";
    const entry = map.get(name);

    if (!entry) 
        return status.edit(`El comando \`/${name}\` no existe`);

    await bot.db
          .connection(DB_TABLE_COMMAND_SERVERS)
          .where({ command_id: entry.id })
          .del();

    await bot.db
        .connection(DB_TABLE_COMMAND_SERVERS)
        .insert({ command_id: entry.id, server: "global" });

    await bot.db
        .connection(DB_TABLE_COMMANDS)
        .where({ id: entry.id })
        .update({ configured_at: bot.db.connection.fn.now() });

    return status.edit(`\`/${name}\` ahora es **global**`);
}

export default {
    event: "interaction.commands",
    async update({ bot, interaction }) {
        if (!interaction.isChatInputCommand()) 
            return;

        const status = await interaction.reply("*procesando...*");
        const all = await getAllCommands(bot.db.connection);
        const dbMap = new Map(all.map(c => [c.name, c]));

        switch (interaction.options.getSubcommand()) {
            case "list":
                return list(bot, interaction, status, dbMap);
            case "add": 
                return add(bot, interaction, status, dbMap);
            case "remove":
                return remove(bot, interaction, status, dbMap);
            case "global":
                return global(bot, interaction, status, dbMap);
        }
    }
} as FeatureInteraction;