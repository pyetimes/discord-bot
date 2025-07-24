import { Bot } from "@/types";
import { FeatureInteraction } from "..";
import { ChatInputCommandInteraction } from "discord.js";
import { notify_permissions, NotifyPermissions } from "./misc";
import { OWNER } from "@/config";


type P = (bot: Bot, interaction: ChatInputCommandInteraction) => Promise<any> 

const add: P = async (bot, interaction) => {
    const { options } = interaction;
    const user = options.getUser("user", true);
    const perm = options.getInteger("perm", true);

    const user_permissions = await bot.database.session<NotifyPermissions>(notify_permissions)
            .where({ user_id: user.id, guild_id: interaction.guildId! }).first();

    if (!user_permissions) {
        await bot.database.session(notify_permissions).insert({
            user_id: user.id,
            guild_id: interaction.guildId,
            bitmask: perm
        });
    } else {
        await bot.database.session(notify_permissions)
            .where({ user_id: user.id, guild_id: interaction.guildId })
            .update({ bitmask: user_permissions.bitmask | perm });
    }

    await interaction.reply("permisos del usuario actualizado");
}

const remove: P = async (bot, interaction) => {
    const { options } = interaction;
    const user = options.getUser("user", true);
    const perm = options.getInteger("perm", true);

    const user_permissions = await bot.database.session<NotifyPermissions>(notify_permissions)
            .where({ user_id: user.id }).first();

    if (user_permissions) {
        await bot.database.session(notify_permissions)
            .where({
                user_id: user.id,
                guild_id: interaction.guildId
            })
            .update({
                bitmask: user_permissions.bitmask & ~perm
            });
    }
    
    await interaction.reply("permisos del usuario actualizado");
}

// const status: P = async (bot, interaction) => {
//     const { options } = interaction;
//     const user = options.getUser("user", true);
// }

export default {
    event: "interaction.nperms",
    async update({ bot, interaction }) {
        if (!interaction.isChatInputCommand()) return;

        const { options, guild, user } = interaction;

        if (!guild) {
            return await interaction.reply("Solo disponible en servidores");
        }

        switch (options.getSubcommand()) {
            case "add":
                if (user.id === guild?.ownerId || user.id === OWNER)
                    await add(bot, interaction);
                else await interaction.reply("No tienes permiso para asignar permisos a un usuario");
                break;
            case "remove":
                if (user.id === guild?.ownerId || user.id === OWNER)
                    await remove(bot, interaction);
                else await interaction.reply("No tienes permiso para quitar permisos a un usuario");
                break;
            // case "status":
            //     if (user.id === guild?.ownerId || user.id === OWNER)
            //         await status(bot, interaction);
            //     else await interaction.reply("No tienes permiso para listar los permisos de un usuario");
            //     break;
        }
    },
} as FeatureInteraction;
