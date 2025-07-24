import { join, basename } from "path";
import { Client, GatewayIntentBits, Partials } from "discord.js"
import Knex  from "knex";
import { TOKEN, DATABASE_URL } from "@/config"
import { EventEmitter } from "stream";
import { get_files, load_module_sync } from "@/loader";
import { Bot, BotFeature } from "@/types";
import { FeatureStatus } from "@/types/enums";


const client = new Client({
    intents: [
        // GatewayIntentBits.AutoModerationConfiguration,
        // GatewayIntentBits.AutoModerationExecution,
        // GatewayIntentBits.DirectMessagePolls,
        // GatewayIntentBits.DirectMessageReactions,
        // GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.DirectMessages,
        // GatewayIntentBits.GuildExpressions,
        // GatewayIntentBits.GuildIntegrations,
        // GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMembers,
        // GatewayIntentBits.GuildMessagePolls,
        // GatewayIntentBits.GuildMessageReactions,
        // GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildMessages,
        // GatewayIntentBits.GuildModeration,
        // GatewayIntentBits.GuildPresences,
        // GatewayIntentBits.GuildScheduledEvents,
        // GatewayIntentBits.GuildVoiceStates,
        // GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent
    ],
    partials: [ 
        Partials.Channel,
        // Partials.GuildMember,
        // Partials.GuildScheduledEvent,
        // Partials.Message,
        // Partials.Reaction,
        // Partials.ThreadMember,
        Partials.User
    ]
});


const bot: Bot = {
    client, 
    root_dir: __dirname,
    path_features: join(__dirname, "features"),
    events: new EventEmitter(),
    features: new Map(),
    database: {
        async migrate(up) {
            await up(bot.database.session);
        },
        session: Knex({ client: "pg", connection: DATABASE_URL }),
    },
    async load_features(only_news: boolean = true, unmount: boolean = true) {
        for (const path_mod of get_files(bot.path_features)) {
            if (!path_mod.endsWith(".bf.js") && !path_mod.endsWith(".bf.ts")) 
                continue;
            if (only_news && bot.features.has(path_mod)) {
                if (unmount) {
                    const feature = bot.features.get(path_mod);
                    await bot.close_feature(feature!);
                }
                continue;
            }
            bot.features.set(path_mod, {
                path: path_mod,
                name: basename(path_mod),
                status: FeatureStatus.Pending
            });
        }
    },
    async init_feature(feature) {
        try {
            const mod = load_module_sync<BotFeature>(feature.path);
            if (!mod) {
                feature.status = FeatureStatus.Failed;
                feature.error  = `no tiene definicion`;
                return;
            }

            feature.mod = mod;

            if (mod.on_mount) 
                await feature.mod.on_mount!({ bot });

            if (mod.event) {
                if (mod.update) {
                    const updater = mod.update;
                    feature.mod.update = async (payload) => {
                        try {
                            await updater(payload);
                        } catch (error) {
                            if (feature.mod && feature.mod.on_unmount) {
                                feature.mod.on_unmount(payload);
                            }
                            feature.status = FeatureStatus.Failed;
                            feature.mod = undefined;
                            feature.error = String(error);
                        }                     
                    }

                    bot.events.on(mod.event, feature.mod.update);
                } else {
                    throw `Se registra en ${mod.event} sin definir que hacer`;
                }
            }

            if (mod.on_unmount) {
                const updater = mod.on_unmount;
                feature.mod.on_unmount = async (payload) => {
                    try {
                        await updater(payload);
                    } catch (error) {
                        feature.status = FeatureStatus.Failed;
                        feature.mod = undefined;
                        feature.error = String(error);
                    }
                }
            }
            feature.status = FeatureStatus.Loaded;
        } catch (error) {
            feature.status = FeatureStatus.Failed;
            feature.error = String(error);
            feature.mod = undefined;
        }
    },
    async close_feature(feature) {
        if (feature.mod && feature.mod.on_unmount) 
            try { await feature.mod.on_unmount({ bot }); } 
            catch (error) { feature.error = String(error); }
        feature.status = FeatureStatus.Unloaded;
        feature.mod = undefined;
    },

    async unload_features() {
        for (const feature of bot.features.values()) {
            await bot.close_feature(feature);
        }
        bot.features.clear();
        bot.events.removeAllListeners();
    },

    async init() {
        // ping database
        try {
            await bot.database.session.raw("SELECT 1");
        } catch (error) {
            await bot.destroy()
            console.error(error)
            return;
        }

        for (const feature of bot.features.values()) {
            await bot.init_feature(feature);
        }
    },

    async destroy() {
        try { await bot.unload_features(); } catch {};
        try { await bot.database.session.destroy(); } catch {}
        await bot.client.destroy();
    },
    async run() {
        await bot.load_features();
        await bot.init();
        await bot.client.login(TOKEN).catch(async (error) => {
            console.log("NO se pudo conectar con discord. ");
            console.error(error);
            await bot.destroy();
        });
    },
}


process.on("SIGINT", bot.destroy);
process.on("SIGTERM", bot.destroy);
process.on("uncaughtException", async (o_error) => {
    await bot.destroy();
    console.error(o_error);
});

bot.run();