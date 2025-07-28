import { Server } from "http";
import express from "express";
import { EmbedBuilder } from "@discordjs/builders";
import { WEBHOOK_TOKEN as TOKEN } from "@/config";
import { Bot, BotFeature } from "@/types";
import { notifyChannels, NotifyChannel } from "./misc";


interface NotifyParams {
    bot: Bot;
    title: string; 
    url: string; 
    description: string; 
    image?: string; 
    thumbnail?: string; 
    authorName?: string; 
    authorIcon?: string;
}

function isURL(raw: string) {
    try {
        new URL(raw);
        return true;
    } catch {
        return false;
    }
}

const notifySubscribers = async (p: NotifyParams) => {
    const subscribers = p.bot.db.connection<NotifyChannel>(notifyChannels).select('*');

    const embed = new EmbedBuilder()
        .setTitle(p.title)
        .setURL(p.url)
        .setDescription(p.description)
        .setImage(p.image ?? null)
        .setThumbnail(p.thumbnail ?? null)
        .setColor([0, 153, 255])
        .setTimestamp();

    if (p.authorName) {
        embed.setAuthor({ name: p.authorName, iconURL: p.authorIcon });
    }

    for (const { channel_id } of (await subscribers).values()) {
        const channel = await p.bot.client.channels.fetch(channel_id).catch(() => null);

        if (channel && channel.isSendable()) {
            await channel.send({ embeds: [embed] }).catch(console.error);
        }
    }
}

const app = express();
app.use(express.json());


let server: Server | null = null;

export default {
    async onMount({ bot }) {
        app.post("/article", (req, res) => {
            if (req.headers['x-webhook-token'] !== TOKEN) {
                return res.status(401).send('Unauthorized');
            }
            const title = req.body?.title;
            const url = req.body?.url;
            const description = req.body?.description;
            const image = req.body?.image;
            const thumbnail = req.body?.thumbnail;
            const authorName = req.body?.author_name;
            const authorIcon = req.body?.author_icon;


            if (typeof title !== "string") 
                return res.status(400).send({ "msg": 'Se debe pasar un "title"' });

            if (typeof url !== "string" || (!isURL(url))) 
                return res.status(400).send({ "msg": 'Se debe pasar una "url" valida' });

            if (typeof description !== "string") 
                return res.status(400).send({ "msg": 'Se debe pasar una "description"' });

            if (image !== undefined && (typeof image === "string" && !isURL(image))) 
                return res.status(400).send({ "msg": 'Se debe pasar una "image" valida (enlace)' });

            if (thumbnail !== undefined && (typeof thumbnail === "string" && !isURL(url))) 
                return res.status(400).send({ "msg": 'Se debe pasar una "thumbnail" valida (enlace)' });

            if (authorIcon !== undefined && (typeof authorIcon !== "string" && !isURL(url))) 
                return res.status(400).send({ "msg": 'Se debe pasar una "author_icon" valida (enlace)' });

            if (authorName !== undefined && (typeof authorName !== "string")) 
                return res.status(400).send({ "msg": 'Se debe pasar una "author_name" valido (string)' });

            notifySubscribers({bot, title, url, description, image, thumbnail, authorIcon, authorName})
                .then(() => res.status(200).send({msg: 'notificados'}))
                .catch(err => {
                    console.error(err);
                    res.status(500).send({ msg: 'Error interno' });
                });
        });

        server = app.listen(3000, () => console.log('Webhook escuchando en el puerto 3000'));
    },
    async onUnmount() {
        server!.close();
    },
} as BotFeature;