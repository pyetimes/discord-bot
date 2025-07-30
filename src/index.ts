import { join, basename } from "path";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import Knex  from "knex";
import { TOKEN, DATABASE_URL } from "@/config"
import { EventEmitter } from "stream";
import { getFiles, loadModuleSync } from "@/loader";
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
    rootdir: __dirname,
    pathFeatures: join(__dirname, "features"),
    events: new EventEmitter(),
    features: new Map(),
    db: {
        async migrate(up) {
            await up(bot.db.connection);
        },
        connection: Knex({ client: "pg", connection: DATABASE_URL }),
    },
    async loadFeatures() {
        for (const pathMod of getFiles(bot.pathFeatures)) {
            if (!pathMod.endsWith(".bf.js") && !pathMod.endsWith(".bf.ts")) 
                continue;
            bot.features.set(pathMod, {
                pathAbsolute: pathMod,
                pathRelative: pathMod.slice(bot.rootdir.length),
                name: basename(pathMod),
                status: FeatureStatus.Pending
            });
        }
    },
    async initFeature(feature) {
        if (feature.status === FeatureStatus.Loaded) 
            return;

        try {
            const mod = loadModuleSync<BotFeature>(feature.pathAbsolute);
            if (!mod) {
                feature.status = FeatureStatus.Failed;
                feature.error  = `no tiene definicion`;
                return;
            }

            feature.mod = mod;

            if (mod.onMount) {
                try {
                    await feature.mod.onMount!({ bot });
                } catch (error) {
                    feature = {...feature, status: FeatureStatus.Failed, error: String(error), mod: undefined, };
                    return;
                }
            }

            if (mod.event) {
                if (mod.update) {
                    const updater = mod.update;
                    feature.mod.update = async (payload) => {
                        try {
                            await updater(payload);
                        } catch (error) {
                            if (feature.mod && feature.mod.onUnmount) {
                                await feature.mod.onUnmount(payload);
                            }
                            bot.events.removeListener(mod.event!, feature.mod!.update!);
                            feature = {...feature, status: FeatureStatus.Failed, mod: undefined, error: String(error), };
                        }
                    }
                    bot.events.on(mod.event, feature.mod.update);
                } else {
                    feature = {...feature, 
                        status: FeatureStatus.Failed, 
                        mod: undefined,
                        error: `Se registra en ${mod.event} sin definir que hacer`,
                    };
                    return;
                }
            }

            if (mod.onUnmount) {
                const updater = mod.onUnmount;
                feature.mod.onUnmount = async (payload) => {
                    try {
                        await updater(payload);
                    } catch (error) {
                        feature = {...feature, status: FeatureStatus.Failed, mod: undefined, error: String(error), };
                    }
                }
            }
            feature.status = FeatureStatus.Loaded;
        } catch (error) {
            feature = {...feature, status: FeatureStatus.Failed, mod: undefined, error: String(error), };
        }
    },
    async closeFeature(feature) {
        if (feature.mod) {
            const { mod } = feature;
            if (mod.event) {
                bot.events.removeListener(mod.event, mod.update!);
            }
            if (mod.onUnmount) {
                try { 
                    await mod.onUnmount({ bot }); 
                } catch (error) { 
                    feature.error = String(error); 
                }
            }
        }
        feature = {...feature, status: FeatureStatus.Unloaded, mod: undefined, };
    },

    async unloadFeatures() {
        for (const feature of bot.features.values()) {
            await bot.closeFeature(feature);
        }
        bot.features.clear();
        bot.events.removeAllListeners();
    },

    async init() {
        // ping database
        try {
            await bot.db.connection.raw("SELECT 1");
        } catch (error) {
            await bot.destroy();
            console.error(error);
            return;
        }

        for (const feature of bot.features.values()) {
            await bot.initFeature(feature);
        }
    },

    async destroy() {
        try { await bot.unloadFeatures(); } catch (error) {
            console.log(error);
        };
        try { await bot.db.connection.destroy(); } catch (error) {
            console.log(error);
        }
        await bot.client.destroy();
    },
    async run() {
        await bot.loadFeatures();
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
process.on("uncaughtException", async (error) => {
    await bot.destroy();
    console.error(error);
});

bot.run();