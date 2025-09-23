import { Client, Events } from "discord.js";
import { CoreClient } from "@core";
import { LogLevel, Module } from "@core";


export default {
    name: "m_welcome",
    events: [{
        name: Events.ClientReady,
        once: true,
        execute(client: CoreClient<true>) {
            client.log({ 
                level: LogLevel.INFO, 
                message: `${client.user.username} is ready!`,
                timestamp: (new Date()).toISOString(),
            });
        },
    }],
} as Module;
