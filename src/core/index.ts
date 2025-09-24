import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, Client, ClientOptions, Collection, MessageCreateOptions, MessagePayload, SlashCommandBuilder } from "discord.js";
import { LogEntry, LogLevel } from "./logger";
export * from "./logger";

export type LogHandler = (entry: LogEntry) => Promise<void> | void;
export interface CoreOptions extends ClientOptions {}

export class CoreClient<Ready extends boolean = boolean> extends Client<Ready> {
    public readonly commands = new Collection<string, InteractionCommand>();
    public readonly modules  = new Map<string, Module>();
    protected logHandlers = new Set<LogHandler>();

    constructor(options: CoreOptions) {
        super(options);
    }
    
    async log(entry: LogEntry): Promise<void> {
        await Promise.all(Array.from(this.logHandlers).map(h => { try { h(entry); } catch {} }));
    }

    async notify(options: string | MessagePayload | MessageCreateOptions, channelsId: string[]): Promise<void> {
        for (const id of channelsId) {
            const channel = await this.channels.fetch(id);
            if (channel && channel.isSendable()) {
                await this.safecall(async () => await channel.send(options));
            }
        }
    }

    onLog(handler: LogHandler): void {
        this.logHandlers.add(handler);
    }

    offLog(handler: LogHandler): void {
        this.logHandlers.delete(handler);
    }

    async safecall<T = any>(
        h: () => Promise<T> | T, 
        opts: Partial<Omit<LogEntry, "error">> = {}
    ): Promise<T | undefined> {
        try {
            return await h();
        } catch (error) {
            const { 
                message = String(error), 
                level = LogLevel.ERROR,
                timestamp = new Date().toISOString(), 
            } = opts;

            this.log({...opts, level, message, error, timestamp, });
        }
        return undefined;
    }
}


export interface Event {
    name: string;
    once?: boolean;
    execute: (...args: any[]) => Promise<void>;
}

export interface InteractionCommand {
    data: SlashCommandBuilder;
    execute(client: CoreClient, interaction: ChatInputCommandInteraction): Promise<void>;
    autocomplete?(client: CoreClient, interaction: AutocompleteInteraction<CacheType>): Promise<void>;
}

export interface Module {
    name: string;
    init?(client: CoreClient): Promise<void> | void;
    destroy?(client: CoreClient): Promise<void> | void;

    commands?: Array<InteractionCommand>;
    events?: Array<Event>;
}

