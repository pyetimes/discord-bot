import { join } from "path";
import { readdirSync } from "fs";
import { GatewayIntentBits, Partials } from "discord.js";
import { CoreClient, LogLevel, Module } from "@core";
import { DS_TOKEN, NODE_ENV } from "@/config";
import { loadModuleSync } from "@/utils/loader";
import { closeModules, initModules } from "./utils";


const client = new CoreClient({
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


if (!DS_TOKEN) {
    throw new Error("Missing Discord bot token. Please set the 'DISCORD_TOKEN' environment variable.");
}

const destroyCore = async () => {
    await client.log({ level: LogLevel.INFO, message: "turning off", timestamp: (new Date()).toISOString() });
    await closeModules(client);
    await client.destroy();
}

process.on("SIGINT", destroyCore);
process.on("SIGTERM", destroyCore);
process.on("uncaughtException", async (error) => {
    await client.log({ level: LogLevel.FATAL, message: `${error.name}: ${error.message}`, timestamp: (new Date()).toISOString() });
    await destroyCore();
});

;(async () => {
    if (NODE_ENV === "development")
        client.onLog((e) => console.dir(e, { depth: null, colors: true }));
    else 
        client.onLog((e) => console.log(` [${e.timestamp}] [${e.level.toString()}]: ${e.message}`));

    readdirSync(join(__dirname, "modules"), { recursive: true, withFileTypes: true })
        .filter(d => d.isFile() && ((d.name.endsWith(".ts") && !d.name.endsWith(".d.ts")) || d.name.endsWith(".js")))
        .forEach(d => {
            const mod = loadModuleSync<Module>(join(d.parentPath, d.name));
            
            if (!mod)
                throw new Error(`Undefined ${join(d.parentPath, d.name)}`);

            if (client.modules.has(mod.name)) 
                throw new Error(`duplicate module: ${mod.name}`);

            client.modules.set(mod.name, mod);
        });
    
    await initModules(client);
    await client.login(DS_TOKEN);
})();
