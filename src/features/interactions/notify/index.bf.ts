import { FeatureInteraction } from "../types";
import { list, Phase, subscribe, unsubscribe } from "./misc";


export default {
    event: "interaction.notify",
    async update({ bot, interaction }) {
        if (!interaction.isChatInputCommand()) return;
        
        switch (interaction.options.getSubcommand()) {
            case "add":
                return await subscribe(bot, interaction, Phase.PUBLISH);
            case "remove": 
                return await unsubscribe(bot, interaction, Phase.PUBLISH);
            case "list": 
                return await list(bot, interaction, Phase.PUBLISH);
        }
        return await interaction.reply({ content: 'Subcomando no reconocido.' });
    }
} as FeatureInteraction;
