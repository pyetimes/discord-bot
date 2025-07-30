import { Knex } from "knex";

export interface DB_Commands {
    id: number;
    name: string;
    hash: string;
    configured_at: Date;
}

export type ServerId = "global" | `${number}`;

export interface DB_CommandServer {
    command_id: number;
    server: ServerId;
}

export interface CommandWithServers extends DB_Commands {
    servers: ServerId[];
}

export const DB_TABLE_COMMANDS = "commands";
export const DB_TABLE_COMMAND_SERVERS = "command_servers";

export async function getAllCommands(conn: Knex): Promise<CommandWithServers[]> {
    return await conn<CommandWithServers>("commands as c")
        .select(
            "c.id",
            "c.name",
            "c.hash",
            "c.configured_at"
        )
        .select(conn.raw(`
            COALESCE(
                array_agg(cs.server ORDER BY cs.server),
                ARRAY['global']
            ) AS servers
        `))
        .leftJoin(
            "command_servers as cs",
            "c.id",
            "cs.command_id"
        )
        .groupBy("c.id");
}