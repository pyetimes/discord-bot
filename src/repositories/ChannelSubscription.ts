import { ChannelSubscription } from "@prisma/client";
import { IChannelSubscription } from "./IChannelSubscription";
import { db } from "@/config";


export class ChannelSubscriptionRepository implements IChannelSubscription {
    async create(guildId: string, channelId: string, topic: string, userId: string): Promise<ChannelSubscription> {
        return await db.channelSubscription.create({ data: {
            guildId,
            channelId, 
            topic, 
            createdBy: userId, 
        }});
    }

    async delete(id: string): Promise<ChannelSubscription> {
        return await db.channelSubscription.delete({ where: { id } });
    }

    async getByChannel(id: string, topic?: string): Promise<ChannelSubscription[]> {
        return await db.channelSubscription.findMany({ where: { channelId: id, topic, } });
    }

    async getById(id: string): Promise<ChannelSubscription | null> {
        return await db.channelSubscription.findFirst({ where: { id } });
    }

    async list(filterBy?: { topic?: string, userId?: string, guildId?: string }): Promise<ChannelSubscription[]> {
        return await db.channelSubscription.findMany({ where: filterBy });
    }
}
