import { Module } from "@core";
import { SlashCommandBuilder } from "discord.js";


export default {
    name: "m_ping",
    commands: [{
        data: new SlashCommandBuilder()
                .setName("ping")
                .setDescription("Show discord latency"),
        execute(_, interaction) {
            interaction.reply(`The latency is \`${interaction.client.ws.ping}ms\``);
        },
    }],
} as Module;
