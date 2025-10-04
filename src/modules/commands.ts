import { createHash } from "crypto";
import { ApplicationCommandDataResolvable, CacheType, Events, Interaction, PermissionFlagsBits, SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";
import { CoreClient, LogLevel, Module } from "@core";
import { CommandRepository } from "@/repositories/CommandRepository";
import { GuildRepository } from "@/repositories/GuildRepository";
import { GUILD_ID } from "@/config";
import { Command, DeploymentScope } from "@prisma/client";


let interactionCreate: ((i: Interaction<CacheType>) => any) | undefined = undefined;

export default {
    name: "m_commands",
    init(client) {
        interactionCreate = async (i) => await managerInteractionCreate(client, i);
        client.on(Events.InteractionCreate, interactionCreate);
    },
    destroy(client) {
        if (interactionCreate) 
            client.removeListener(Events.InteractionCreate, interactionCreate);
    },
    commands: [
        {
            data: new SlashCommandBuilder()
                    .setName("commands")
                    .setDescription("View and configure the deployment of slash commands")
                    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                    .addSubcommand(s => s
                        .setName("list")
                        .setDescription("List guilds commands")
                        .addStringOption(o => o
                            .setName("guild")
                            .setDescription("Name of the guild")
                            .setRequired(false)
                            .setAutocomplete(true)
                        )
                    )
                    .addSubcommand(s => s
                        .setName("add")
                        .setDescription("Add a command to a specific guild")
                        .addStringOption(o => o
                            .setName("command")   
                            .setDescription("Name of the command to add")
                            .setRequired(true)
                            .setAutocomplete(true)
                        )
                        .addStringOption(o => o
                            .setName("guild")
                            .setDescription("Name of the guild where this command should be registered")
                            .setRequired(true)                      
                            .setAutocomplete(true)
                        )
                    )
                    .addSubcommand(s => s
                        .setName("remove")
                        .setDescription("Remove a command from a specific guild")
                        .addStringOption(o => o
                            .setName("command")
                            .setDescription("Name of the command to remove")
                            .setRequired(true)
                            .setAutocomplete(true)
                        )
                        .addStringOption(o => o
                            .setName("guild")
                            .setDescription("Name of the guild where this command should be removed")
                            .setRequired(true)
                            .setAutocomplete(true)   
                        )
                    )
                    .addSubcommand(s => s
                        .setName("global")
                        .setDescription("Make a command global")
                        .addStringOption(o => o
                            .setName("command")
                            .setDescription("Name of the command")
                            .setRequired(true)
                            .setAutocomplete(true)
                        )
                    ),
            async execute(client, interaction) {
                const prStatus = interaction.reply("*processing...*");
                const status = await prStatus;
                
                switch (interaction.options.getSubcommand()) {
                    case "list": {
                        const guildId = interaction.options.getString("guild", false) ?? null;
                        if (guildId) {
                            const guild = client.guilds.cache.get(guildId);
                            if (!guild) 
                                return status.edit("Guild not found");
                            
                            const cmds = await guild.commands.fetch();
                            if (cmds.size === 0) 
                                status.edit(`## ${guild.name} doesn't have any commands configured yet`);
                            else 
                                status.edit(`## ${guild.name}\n${cmds.reduce((r, c) => r + `\n- ${c.name}`, "")}`);
                        } else {
                            status.edit(`${client.guilds.cache.values().reduce((r, g) => {
                                const cmds = g.commands.cache;
                                if (cmds.size === 0) 
                                    return r + `\n## ${g.name} doesn't have any commands configured yet`;
                                return r + `\n## ${g.name}\n${cmds.reduce((r, c) => r + `\n- ${c.name}`, "")}`;
                            }, "")}`);
                        }
                        break;
                    }
                    case "global": {
                        const repo = new CommandRepository();
                        const cmdName = interaction.options.getString("command", true);
                        const actions: Action[] = [];
                        const cmd = await repo.getByName(cmdName);
                        
                        if (!cmd) 
                            return status.edit("command not found");
                        
                        let findGlobal = false;
                        for (const d of await repo.listDeploymentsByCommand(cmd.id)) {
                            if (d.scope === DeploymentScope.GLOBAL) {
                                findGlobal = true;
                                continue;
                            }
                            actions.push({
                                type: "De_DELETE",
                                commandId: d.commandId,
                                scope: d.scope,
                                guildId: d.guildId!,
                            });
                            const guild = client.guilds.cache.get(d.guildId!);
                            if (guild) {
                                for (const gCmd of guild.commands.cache.filter((c) => c.name === cmd.name).values()) {
                                    actions.push({
                                        type: "Ds_DELETE",
                                        id: gCmd.id,
                                        guildId: d.guildId!,
                                    });
                                }
                            }
                        }

                        if (!findGlobal) {
                            actions.push({
                                type: "De_CREATE",
                                commandId: cmd.id,
                                scope: DeploymentScope.GLOBAL,
                            });
                            const cCmd = client.commands.get(cmd.name);
                            if (cCmd) {
                                actions.push({ type: "Ds_CREATE", data: cCmd.data, });
                            }
                        }

                        for (const a of actions) {
                            await applyAction(client as CoreClient<true>, a);
                        }
                        status.edit(`Command \`/${cmd.name}\` is now global.`);
                        break;
                    }
                    case "add": {
                        const repo = new CommandRepository();
                        const cmdName = interaction.options.getString("command", true);
                        const guildId = interaction.options.getString("guild", true);
                        const actions: Action[] = [];
                        const guild = client.guilds.cache.get(guildId);
                        
                        if (!guild)
                            return status.edit("the bot is not in that guild");
                        
                        const cmd = await repo.getByName(cmdName);

                        if (!cmd) 
                            return status.edit("command not found");

                        const inGuild = await repo.getDeployment({
                            commandId: cmd.id,
                            scope: DeploymentScope.SERVER,
                            guildId,
                        });
                        
                        if (inGuild)
                            return status.edit(`Command \`/${cmd.name}\` is already enabled in guild ${guild.name}`);

                        actions.push({
                            type: "De_CREATE",
                            commandId: cmd.id,
                            scope: DeploymentScope.SERVER,
                            guildId,
                        });

                        const cCmd = client.commands.get(cmdName);
                        if (cCmd) {
                            actions.push({
                                type: "Ds_CREATE",
                                data: cCmd.data,
                                guildId,
                            });
                        }

                        for (const a of actions) {
                            await applyAction(client as CoreClient<true>, a);
                        }

                        status.edit(`Command \`/${cmd.name}\` added to guild \`${guild.name}\`.`);
                        break;
                    }
                    case "remove": {
                        const repo = new CommandRepository();
                        const cmdName = interaction.options.getString("command", true);
                        const guildId = interaction.options.getString("guild", true);
                        const actions: Action[] = [];
                        const guild = client.guilds.cache.get(guildId);
                        
                        if (!guild)
                            return status.edit("the bot is not in that guild");
                        
                        const cmd = await repo.getByName(cmdName);

                        if (!cmd) 
                            return status.edit("command not found");

                        const inGuild = await repo.getDeployment({
                            commandId: cmd.id,
                            scope: DeploymentScope.SERVER,
                            guildId,
                        });

                        if (!inGuild) 
                            return status.edit(`Command \`/${cmd.name}\` is not registered in guild \`${guild.name}\`.`);

                        actions.push({
                            type: "De_DELETE",
                            commandId: cmd.id,
                            scope: DeploymentScope.SERVER,
                            guildId,
                        });

                        for (const c of guild.commands.cache.filter(c => c.name === cmd.name).values()) {
                            actions.push({ type: "Ds_DELETE", id: c.id, guildId, });
                        }

                        for (const a of actions) {
                            await applyAction(client as CoreClient<true>, a);
                        }

                        status.edit(`Command \`/${cmd.name}\` removed from guild \`${guild.name}\`.`);
                        break;
                    }
                    default:
                        status.edit("the command does not work");
                        break;
                }

            },
            async autocomplete(client, interaction) {
                const focused = interaction.options.getFocused(true);
                switch (focused.name) {
                    case "guild":
                        await interaction.respond(
                            client.guilds.cache
                                .map(g => ({ name: g.name, value: g.id }))
                                .filter(c => c.name.toLowerCase().startsWith(focused.value.toLowerCase())),
                        );
                        break;
                    case "command":
                        await interaction.respond(
                            client.commands
                                .map(cmd => ({ name: cmd.data.name, value: cmd.data.name }))
                                .filter(c => c.name.toLowerCase().startsWith(focused.value.toLowerCase())),
                        )
                        break;
                }
            },
        },
    ],
    events: [{
        name: Events.ClientReady,
        once: true,
        execute: async (client) => {
            for (const a of await sync(client)) {
                console.dir(a, { depth: null, colors: true });
                await applyAction(client, a);
            }
        }
    }],
} as Module;


async function managerInteractionCreate(client: CoreClient, interaction: Interaction<CacheType>) {    
    if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        
        if (cmd) {
            try {
                return await cmd.execute(client, interaction);
            } catch (error) {
                return client.log({ 
                    level: LogLevel.ERROR, 
                    message: "Use Command",
                    context: interaction.toJSON() as Record<string, any>,
                    timestamp: (new Date()).toISOString(),
                    error,
                });
            }
        }
        interaction.reply(`the command does not work`);
        client.log({
            level: LogLevel.WARN,
            message: `The command ${interaction.commandName} isn't working right now`,
            timestamp: (new Date()).toISOString(),
        });
    }

    else if (interaction.isAutocomplete()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) return;
        
        await client.safecall(async () => await cmd.autocomplete?.(client, interaction), {
            context: interaction.toJSON() as Record<string, any>,
        });
    }
}

async function sync(client: CoreClient<true>) {
    const repoCR = new CommandRepository();
    const repoGR = new GuildRepository();
    const actions: Action[] = []; 

    // { cmdName: { data, hash } }
    const codeMap = new Map(Array.from(
        client.commands.values(), c => [c.data.name, { data: c.data, hash: hashJSON(c.data.toJSON())}],
    ));
    const codeNames = new Set(codeMap.keys());


    type T = { names: Set<string>; idByName: Map<string, string>; }
    type DsGuildId = `${number}`;


    const dsMap: Map<"global" | DsGuildId, T> = new Map();
    {
        dsMap.set("global", { names: new Set(), idByName: new Map() });
        const g = dsMap.get("global")!;
        for (const cmd of (await client.application.commands.fetch()).values()) {
            g.names.add(cmd.name);
            g.idByName.set(cmd.name, cmd.id);
        }

        for (const guild of client.guilds.cache.values()) {
            for (const cmd of (await guild.commands.fetch()).values()) {
                const m = dsMap.get(guild.id as DsGuildId) ?? { names: new Set(), idByName: new Map() };
                m.names.add(cmd.name);
                m.idByName.set(cmd.name, cmd.id);
                dsMap.set(guild.id as DsGuildId, m);
            }
        }
    }

    type O = { names: Set<string>; cmdByName: Map<string, Command & { guildId?: string }>; }
    const dbMap: Map<"global" | DsGuildId, O> = new Map();
    {
        const repo = new CommandRepository();
        const isGlobalCmd = (s: DeploymentScope) => s === DeploymentScope.GLOBAL;
        dbMap.set("global", { names: new Set(), cmdByName: new Map() });
        const g = dbMap.get("global")!;

        for (const cmd of await repo.list()) {
            for (const d of await repo.listDeploymentsByCommand(cmd.id)) {
                if (isGlobalCmd(d.scope)) {
                    g.names.add(cmd.name);
                    g.cmdByName.set(cmd.name, cmd);
                } else {
                    const m = dbMap.get(d.guildId! as DsGuildId) ?? { names: new Set(), cmdByName: new Map(), };
                    
                    m.names.add(cmd.name);
                    m.cmdByName.set(cmd.name, {...cmd, guildId: d.guildId! });
                    dbMap.set(d.guildId! as DsGuildId, m);
                }
            }
        }
    }
            

    for (const guild of client.guilds.cache.values()) {
        let dbGuild = await repoGR.getById(guild.id);

        if (!dbGuild) {
            actions.push({ type: "Gu_CREATE", id: guild.id, name: guild.name, nameAcronym: guild.nameAcronym });
        } else if (guild.name !== dbGuild.name || guild.nameAcronym !== dbGuild.nameAcronym) {
            actions.push({ type: "Gu_UPDATE", id: guild.id, name: guild.name, nameAcronym: guild.nameAcronym });
        }
    }

    for (const [guildId, { names, cmdByName }] of dbMap.entries()) {
        for (const cmdName of names.difference(codeNames)) {
            const cmd = cmdByName.get(cmdName)!;
            actions.push({
                type: "De_DELETE",
                commandId: cmd.id,
                scope: guildId === "global" ? DeploymentScope.GLOBAL : DeploymentScope.SERVER,
                guildId: guildId !== "global" ? guildId : undefined,
            });
        }
    }

    for (const [guildId, { names, idByName }] of dsMap) {
        for (const cmdName of names.difference(codeNames)) {
            actions.push({
                type: "Ds_DELETE",
                id: idByName.get(cmdName)!,
                guildId: guildId !== "global" ? guildId : undefined,
            });
        }

        for (const cmdName of names.intersection(codeNames).difference(dbMap.get(guildId)?.names ?? new Set())) {
            const cmd = codeMap.get(cmdName)!;  
            const dbCmd = await repoCR.getByName(cmdName);

            if (dbCmd) {
                actions.push({
                    type: "Ds_UPDATE",
                    id: idByName.get(cmdName)!,
                    data: cmd.data,
                    guildId: guildId !== "global" ? guildId : undefined,
                });
                actions.push({
                    type: "De_CREATE",
                    commandId: dbCmd.id,
                    scope: guildId === "global" ? DeploymentScope.GLOBAL : DeploymentScope.SERVER,
                    guildId: guildId !== "global" ? guildId : undefined,
                });
            } else {
                actions.push({
                    type: "Ds_DELETE",
                    id: idByName.get(cmdName)!,
                    guildId: guildId !== "global" ? guildId: undefined,
                });
            }
        }
    }

    {
        const updateHash = new Map<string, { id: string, hash: string }>();
        for (const [guildId, { names, idByName }] of dsMap) {
            for (const cmdName of codeNames.intersection(names).intersection(dbMap.get(guildId)?.names ?? new Set())) {
                const coCmd = codeMap.get(cmdName)!;
                const dbCmd = dbMap.get(guildId)!.cmdByName.get(cmdName)!;
                if (coCmd.hash !== dbCmd.hash) {
                    updateHash.set(cmdName, { id: dbCmd.id, hash: coCmd.hash });
                    console.log(`ID de discord: ${idByName.get(cmdName)}`)
                    actions.push({
                        type: "Ds_UPDATE",
                        data: coCmd.data,
                        id: idByName.get(cmdName)!,
                        guildId: guildId !== "global" ? guildId : undefined,
                    });
                    actions.push({
                        type: "De_UPDATE",
                        commandId: dbCmd.id,
                        scope: guildId === "global" ? DeploymentScope.GLOBAL : DeploymentScope.SERVER,
                        guildId: guildId !== "global" ? guildId : undefined,
                    });
                }
            }
        }

        for (const [cmdName, { id, hash }] of updateHash) {
            actions.push({ type: "Co_UPDATE", id,  hash, });
        }
    }

    for (const cmdName of codeNames.difference(dbMap.values().reduce((p, { names }) => p.union(names), new Set()))) {
        const cmd = codeMap.get(cmdName)!;
        const isGlobal = !(GUILD_ID && client.guilds.cache.has(GUILD_ID));
        actions.push({ type: "Co_CREATE", name: cmd.data.name, hash: cmd.hash, });
        actions.push({ type: "Ds_CREATE", data: cmd.data, guildId: !isGlobal ? GUILD_ID : undefined, });
        actions.push({
            type: "De_CREATE",
            commandId: async () => (await repoCR.getByName(cmd.data.name))!.id,
            scope: isGlobal ? DeploymentScope.GLOBAL : DeploymentScope.SERVER,
            guildId: !isGlobal ? GUILD_ID : undefined,
        });
    }

    return actions;
}

type Action = 
    | { type: "Ds_CREATE", data: ApplicationCommandDataResolvable, guildId?: string, }
    | { type: "Ds_UPDATE", data: ApplicationCommandDataResolvable, id: string, guildId?: string, }
    | { type: "Ds_DELETE", id: string, guildId?: string, }
    | { type: "Co_CREATE", name: string, hash: string, }
    | { type: "Co_UPDATE", id: string, hash: string, }
    | { type: "Co_DELETE", id: string, }    
    | { type: "Gu_CREATE", id: string, name: string, nameAcronym: string, }
    | { type: "Gu_UPDATE", id: string, name?: string, nameAcronym?: string, }
    | { type: "Gu_DELETE", id: string, }
    | { type: "De_CREATE", commandId: string | (() => Promise<string>), scope: DeploymentScope, guildId?: string }
    | { type: "De_UPDATE", commandId: string, scope: DeploymentScope, guildId?: string }
    | { type: "De_DELETE", commandId: string, scope: DeploymentScope, guildId?: string }


async function applyAction(client: CoreClient<true>, action: Action) {
    switch (action.type) {
        case "Ds_CREATE": 
        {
            if (action.guildId) {
                const guild = client.guilds.cache.get(action.guildId);
                if (!guild) 
                    throw new Error(`Guild (${action.guildId}) not found`);
                await guild.commands.create(action.data);
            } else {
                await client.application.commands.create(action.data);
            }
            break;
        }
        case "Ds_UPDATE":
        {
            if (action.guildId) {
                const guild = client.guilds.cache.get(action.guildId);
                if (!guild) 
                    throw new Error(`Guild (${action.guildId}) not found`);
                await guild.commands.edit(action.id, action.data);
            } else  {
                await client.application.commands.edit(action.id, action.data);
            }
            break;
        }
        case "Ds_DELETE":
        {
            if (action.guildId) {
                const guild = client.guilds.cache.get(action.guildId);
                if (!guild) 
                    throw new Error(`Guild (${action.guildId}) not found`);
                await guild.commands.delete(action.id);
            } else {
                await client.application.commands.delete(action.id);
            }
            break;
        }
        case "Co_CREATE":
        {
            const repo = new CommandRepository();
            await repo.create(action.name, action.hash);
            break;
        }
        case "Co_UPDATE":
        {
            const repo = new CommandRepository();
            console.log("ANTERIOR")
            console.dir(await repo.getById(action.id), { depth: null, colors: true });
            await repo.updateHash(action.id, action.hash);
            break;
        }
        case "Co_DELETE":
        {
            const repo = new CommandRepository();
            await repo.delete(action.id);
            break;
        }
        case "Gu_CREATE":
        {
            const repo = new GuildRepository();
            await repo.create(action.id, action.name, action.nameAcronym);
            break;
        }
        case "Gu_UPDATE":
        {
            const repo = new GuildRepository();
            await repo.update(action.id, { name: action.name, nameAcronym: action.nameAcronym });
            break;
        }
        case "Gu_DELETE":
        {
            const repo = new GuildRepository();
            await repo.delete(action.id);
            break;
        }
        case "De_CREATE":
        case "De_UPDATE":
        {
            const repo = new CommandRepository();
            await repo.upsertDeployment({
                scope: action.scope,
                guildId: action.guildId,
                commandId: typeof action.commandId === "string" ? action.commandId : await action.commandId(), 
            });
            break;
        }
        case "De_DELETE":
        {
            const repo = new CommandRepository();
            await repo.deleteDeployment({
                commandId: action.commandId,
                scope: action.scope,
                guildId: action.guildId,
            });
            break;
        }
    }
}


function stabilizeJSON(a: any): any {
    if (Array.isArray(a))
        return a.map(stabilizeJSON);

    if (a !== null && typeof a === "object")
        return Object.keys(a).sort().reduce((acc, key) => {
            acc[key] = stabilizeJSON(a[key]);
            return acc;
        }, {} as Record<string, any>);

    return a;
}

function safeStringify(a: any) {
    return JSON.stringify(a, (_k, v) => {
        if (typeof v === "bigint") {
            return v.toString();
        }
        return v;
    });
}

function hashJSON(json: any) {
    return createHash('sha256').update(safeStringify(stabilizeJSON(json))).digest('hex');
}
