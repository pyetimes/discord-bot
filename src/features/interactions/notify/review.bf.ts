import { OWNER } from "@/config";
import { FeatureInteraction } from "../types";
import { list, Phase, subscribe, unsubscribe } from "./misc";


export default {
    event: "interaction.notify-review",
    async update({ bot, interaction }) {
        if (interaction.user.id !== OWNER) 
            return interaction.reply("no tienes permiso para usar este comando");

        if (!interaction.isChatInputCommand()) return;
        
        switch (interaction.options.getSubcommand()) {
            case "add":
                return subscribe(bot, interaction, Phase.REVIEW);
            case "remove": {
                return unsubscribe(bot, interaction, Phase.REVIEW);
            }
            case "list": {
                return list(bot, interaction, Phase.REVIEW);
            }
        }
        return interaction.reply({ content: 'Subcomando no reconocido.' });
    }
} as FeatureInteraction;
