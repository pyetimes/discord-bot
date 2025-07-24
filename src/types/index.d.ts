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
    on_mount?: (p: BasePaylaod) => void | Promise<void>;
    on_unmount?: (p: BasePaylaod) => void | Promise<void>;

    event?: E;
    update?: (payload: EventsMap[E]) => void | Promise<void>;
}

export interface Feature {
    name: string;
    path: string;
    event?: string;
    mod?: BotFeature<any>;
    status: FeatureStatus; 
    error?: string;
}

export interface Bot {
    readonly client: Client;
    readonly root_dir: string;
    readonly path_features: string;
    readonly events: EventEmitter;
    readonly features: Map<string, Feature>;
    readonly database: { 
        session: Knex;
        migrate: (up: (db: Knex) => Promise<void>) => Promise<void>;
    }
    init_feature: (f: Feature) => void | Promise<void>;
    close_feature: (f: Feature) => void | Promise<void>;
    load_features: () => void | Promise<void>;
    unload_features: () => void | Promise<void>;
    init: () => void | Promise<void>;
    destroy: () => void | Promise<void>;
    run: () => void | Promise<void>;
}
