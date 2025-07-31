import { FeatureInteraction } from "../types";


export default {
    event: "interaction.restart",
    async update({ bot, interaction }) {
        
        const status = await interaction.reply("*Reiniciando...*");

        try {
            const pr_uf = bot.unloadFeatures();
            await status.edit("*Desmontando...*");
            bot.client.removeAllListeners();
            await pr_uf;

            const pr_lf = bot.loadFeatures();
            await status.edit("*Cargando...*");
            await pr_lf;

            const pr_in = bot.init();
            await status.edit("*Ultimos retoques...*");
            await pr_in;

            if (bot.client.isReady()) {
                bot.client.emit("ready", bot.client);
            }
    
            await status.edit("Reiniciado correctamente");
        } catch (error) {
            await status.edit(`${String(error)}\n\n *apagando*`);
            await bot.destroy();
        }
    },
} as FeatureInteraction;