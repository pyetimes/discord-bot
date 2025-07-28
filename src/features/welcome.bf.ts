import { BotFeature } from "@/types";

export default {
    onMount({ bot }) {
        bot.client.once("ready", () => {
            console.log(` > ${bot.client.user!.username}: ready!`);
        });
    },
} as BotFeature<any>;