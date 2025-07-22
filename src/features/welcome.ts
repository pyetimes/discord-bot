import { BotFeature } from "@/types";

export default {
    on_mount({ bot }) {
        bot.client.once("ready", () => {
            console.log(` > ${bot.client.user!.username}: ready!`);
        });
    },
} as BotFeature<any>;