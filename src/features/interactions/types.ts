import { BasePaylaod, BotFeature } from "@/types";
import { CacheType, CommandInteraction } from "discord.js";

export interface InteractionPayload extends BasePaylaod{
    interaction: CommandInteraction<CacheType>;
}

type EventInteraction = `interaction.${string}`;

export type FeatureInteraction = BotFeature<
    EventInteraction, 
    Record<EventInteraction, InteractionPayload>
> 

export function isFeatureInteraction(bf: any): bf is FeatureInteraction {
    return typeof bf?.event === "string" && bf.event.startsWith("interaction.");
}