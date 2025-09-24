import { ChannelSubscription } from "@prisma/client";


export interface IChannelSubscription {
    create(guildId: string, channelId: string, topic: string, userId: string): Promise<ChannelSubscription>;
    delete(id: string): Promise<ChannelSubscription>;

    getById(id: string): Promise<ChannelSubscription | null>;    
    getByChannel(id: string, topic?: string): Promise<ChannelSubscription[]>;
    
    list(filterBy?: { topic?: string, userId?: string, guildId?: string }): Promise<ChannelSubscription[]>;
}
