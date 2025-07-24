import { Bot, BotFeature } from "@/types";
import { CacheType, Interaction } from "discord.js";


const manager = async (bot: Bot, interaction: Interaction<CacheType>) => {
if (interaction.isCommand()) {
        bot.events.emit(`interaction.${interaction.commandName}`, { bot, interaction })
    }
}

let handler: undefined | ((interaction: Interaction<CacheType>) => void) = undefined;

export default {
    on_mount({ bot }) {
        handler = (interaction) => manager(bot, interaction);
        bot.client.on("interactionCreate", handler);
    },
    on_unmount({ bot }) {
        bot.client.removeListener("interactionCreate", handler!);
    },
} as BotFeature;
