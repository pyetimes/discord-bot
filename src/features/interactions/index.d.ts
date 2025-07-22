import { BasePaylaod, BotFeature } from "@/types";
import { CacheType, CommandInteraction } from "discord.js";

export interface InteractionPayload extends BasePaylaod{
    interaction: CommandInteraction<CacheType>;
}

export interface FeatureInteraction extends BotFeature<
    string, 
    Record<string, InteractionPayload>
> {}