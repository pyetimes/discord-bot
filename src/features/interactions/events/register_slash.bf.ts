import { join } from "path";
import { createHash } from "crypto";
import { ApplicationCommand, ChatInputApplicationCommandData } from "discord.js";
import { BotFeature } from "@/types";
import { loadModuleSync, getFiles } from "@/loader";
import { DB_Commands, DB_CommandServer, DB_TABLE_COMMAND_SERVERS, DB_TABLE_COMMANDS, getAllCommands, ServerId } from "./misc";
import { BOT_SERVER } from "@/config";

type Metadata = ChatInputApplicationCommandData;


const stabilize = (a: any): any => {
    if (Array.isArray(a))
        return a.map(stabilize);

    if (a !== null && typeof a === "object")
        return Object.keys(a).sort().reduce((acc, key) => {
            acc[key] = stabilize(a[key]);
            return acc;
        }, {} as Record<string, any>);

    return a;
}

const hashJSON = (json: any) => createHash('sha256').update(JSON.stringify(stabilize(json))).digest('hex');


export default {
    async onMount({ bot }) {
        bot.client.once("ready", async () => {
            const { application, guilds } = bot.client;

            if (!application) 
                return console.error("No se pudo subir metadata");

            const serversInDb = await bot.db
                .connection(DB_TABLE_COMMAND_SERVERS)
                .select("server");

            const ghostServers = serversInDb
                .map(r => r.server as ServerId)
                .filter(srv => srv !== "global" && !guilds.cache.has(srv));

            if (ghostServers.length > 0) {
                await bot.db
                    .connection(DB_TABLE_COMMAND_SERVERS)
                    .whereIn("server", ghostServers)
                    .del();

                console.log(`→ Servidores fantasma eliminados: ${ghostServers.join(", ")}`);
            }

            const prDBCommands = getAllCommands(bot.db.connection);
            const prGlobalCmds = application.commands.fetch();
            const guildCmdsArr: { guildId: ServerId, cmds: Map<string, ApplicationCommand> }[] = [];

            for (const [guildId, guild] of guilds.cache)
                guildCmdsArr.push({ guildId: guildId as ServerId, cmds: await guild.commands.fetch() });
            

            const pathFiles = getFiles(join(bot.pathFeatures, "interactions"));
            const metadata = new Map<string, Metadata>();

            for (const pathFile of pathFiles) {
                if (!pathFile.endsWith("metadata.json"))
                    continue;

                const mod = loadModuleSync<Metadata>(pathFile);

                if (!mod) 
                    continue;

                if (metadata.has(mod.name))
                    throw new Error(`Metadata duplicada para ${mod.name}`);

                metadata.set(mod.name, mod);
            }

            const dbCommands = await prDBCommands;
            const globalCmds = await prGlobalCmds;
            const dbMap = new Map<string, Map<ServerId, (DB_Commands & { server: ServerId })>>();
            const cuMap = new Map<string, Map<ServerId, ApplicationCommand>>();


            for (const cmd of dbCommands) {
                const inner = dbMap.get(cmd.name) ?? new Map();

                for (const srv of cmd.servers) 
                    inner.set(srv, { ...cmd, server: srv });
                
                dbMap.set(cmd.name, inner);
            }

            for (const cmd of globalCmds.values()) {
                const inner = cuMap.get(cmd.name) ?? new Map();
                inner.set("global", cmd);
                cuMap.set(cmd.name, inner);
            }

            for (const { guildId, cmds } of guildCmdsArr) {
                for (const cmd of cmds.values()) {
                    const inner = cuMap.get(cmd.name) ?? new Map();
                    inner.set(guildId, cmd);
                    cuMap.set(cmd.name, inner);
                }
            }

            for (const [name, meta] of metadata) {
                const hash = hashJSON(meta);
                const targets = Array.from(dbMap.get(name)?.keys() ?? []);

                if (targets.length === 0)
                    targets.push((BOT_SERVER as ServerId) ?? "global");

                for (const srv of targets) {
                    const dbEntry = dbMap.get(name)?.get(srv);
                    const cuEntry = cuMap.get(name)?.get(srv);

                    if (!dbEntry) {
                        const [newCmd] = await bot.db
                            .connection<DB_Commands>(DB_TABLE_COMMANDS)
                            .insert({ name, hash })
                            .returning("*");

                        await bot.db
                            .connection<DB_CommandServer>(DB_TABLE_COMMAND_SERVERS)
                            .insert({ command_id: newCmd.id, server: srv });

                        if (srv === "global") {
                            await application.commands.create(meta)
                                .then(() => console.log(`→ Creado /${name} @ ${srv}`))
                                .catch(error => console.error(error));
                        } else {
                            await guilds.cache.get(srv)!.commands.create(meta)
                                .then(() => console.log(`→ Creado /${name} @ ${srv}`))
                                .catch(error => console.error(error));
                        }

                        continue;
                    }

                    if (dbEntry.hash !== hash) {
                        if (cuEntry) {
                            await cuEntry.edit(meta)
                                .then(() => console.log(`→ Actualizado /${name} @ ${srv}`))
                                .catch(error => console.error(error));
                        } else {
                            if (srv === "global") {
                                await application.commands.create(meta)
                                    .then(() => console.log(`→ Creado /${name} @ ${srv}`))
                                    .catch(error => console.error(error));
                            } else {
                                await bot.client.guilds.cache
                                    .get(srv)!
                                    .commands.create(meta)
                                        .then(() => console.log(`→ Creado /${name} @ ${srv}`))
                                        .catch(error => console.error(error));
                            }
                        }

                        await bot.db
                            .connection("commands")
                            .where({ id: dbEntry.id })
                            .update({ hash, configured_at: bot.db.connection.fn.now() });
                    } else {
                        console.log(`→ Sin cambios /${name} @ ${srv}`);
                    }
                }
            }

            for (const [name, srvMap] of cuMap) {
                for (const [srv, dsCmd] of srvMap) {
                    const shouldExist = metadata.has(name) && (dbMap.get(name)?.has(srv) ?? false);

                    if (!shouldExist) {
                        if (srv === "global") {
                            await application.commands.delete(dsCmd.id);
                        } else {
                            await guilds.cache.get(srv)!.commands.delete(dsCmd.id);
                        }

                        const dbEntry = dbMap.get(name)?.get(srv);
                        
                        if (dbEntry) {
                            await bot.db
                                .connection(DB_TABLE_COMMAND_SERVERS)
                                .where({ command_id: dbEntry.id, server: srv })
                                .del();
                        }
                        
                        console.log(`→ Borrado /${name} @ ${srv}`);
                    }
                }
            }
        });
    },
} as BotFeature;