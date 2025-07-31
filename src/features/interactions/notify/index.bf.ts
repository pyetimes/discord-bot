import { FeatureInteraction } from "../types";
import { hasPermission, list, Permissions, Phase, subscribe, unsubscribe } from "./misc";


export default {
    event: "interaction.notify",
    async update({ bot, interaction }) {

        if (!interaction.isChatInputCommand()) return;
        
        switch (interaction.options.getSubcommand()) {
            case "add":
                if (await hasPermission(bot, interaction, Permissions.ADD))
                    await subscribe(bot, interaction, Phase.PUBLISH);
                else await interaction.reply({ content: "No tienes permiso para añadir notificaciones" });
                return;
            case "remove": {
                if (await hasPermission(bot, interaction, Permissions.REMOVE))
                    await unsubscribe(bot, interaction, Phase.PUBLISH);
                else await interaction.reply({ content: "No tienes permiso para remover notificaciones" });
                return;
            }
            case "list": {
                if (await hasPermission(bot, interaction, Permissions.LIST))
                    await list(bot, interaction, Phase.PUBLISH);
                else await interaction.reply({ content: "No tienes permiso para listar los canales que reciben notificaciones" });
                return;
            }
        }
        return await interaction.reply({ content: 'Subcomando no reconocido.' });
    }
} as FeatureInteraction;
