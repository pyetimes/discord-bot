import { FeatureInteraction } from "../index";


export default {
    event: "interaction.ping",
    async update({ interaction }) {
        await interaction.reply({ content: "pong!" });
    },

} as FeatureInteraction;
