import { Client } from "discord.js";
import { EventEmitter } from "stream";
import { FeatureStatus } from "./enums";
import { Knex } from "knex";


export interface BasePaylaod {
    bot: Bot;
}

export interface BotFeature<
    E extends keyof EventsMap = string,
    EventsMap extends Record<PropertyKey, BasePaylaod> = Record<E, BasePaylaod>,
> {
    onMount?: (p: BasePaylaod) => void | Promise<void>;
    onUnmount?: (p: BasePaylaod) => void | Promise<void>;

    event?: E;
    update?: (payload: EventsMap[E]) => void | Promise<void>;
}

export interface Feature {
    name: string;
    pathAbsolute: string;
    pathRelative: string;
    event?: string;
    mod?: BotFeature<any>;
    status: FeatureStatus; 
    error?: string;
}

export type Migrate = (db: Knex) => Promise<void>

export interface Bot {
    readonly client: Client;
    readonly rootdir: string;
    readonly pathFeatures: string;
    readonly events: EventEmitter;
    readonly features: Map<string, Feature>;
    readonly db: { 
        connection: Knex;
        migrate: (up: Migrate) => Promise<void>;
    }
    initFeature: (f: Feature) => void | Promise<void>;
    closeFeature: (f: Feature) => void | Promise<void>;
    loadFeatures: () => void | Promise<void>;
    unloadFeatures: () => void | Promise<void>;
    init: () => void | Promise<void>;
    destroy: () => void | Promise<void>;
    run: () => void | Promise<void>;
}
