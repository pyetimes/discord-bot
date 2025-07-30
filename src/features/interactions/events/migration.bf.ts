import { BOT_SERVER } from "@/config";
import { BotFeature } from "@/types";
import { DB_TABLE_COMMAND_SERVERS, DB_TABLE_COMMANDS } from "./misc";


export default {
    async onMount({ bot }) {
        await bot.db.migrate(async (conn) => {
            if (!(await conn.schema.hasTable(DB_TABLE_COMMANDS))) {
                await conn.schema.createTable(DB_TABLE_COMMANDS, table => {
                    table.increments("id").primary();
                    table.string("name").notNullable().unique();
                    table.string("hash").notNullable().index();
                    table.timestamp("configured_at").defaultTo(conn.fn.now());
                });
            }

            if (!(await conn.schema.hasTable(DB_TABLE_COMMAND_SERVERS))) {
                await conn.schema.createTable(DB_TABLE_COMMAND_SERVERS, table => {
                    table.integer("command_id")
                        .unsigned()
                        .notNullable()
                        .references("id")
                        .inTable(DB_TABLE_COMMANDS)
                        .onDelete("CASCADE");
                    table.string("server").notNullable().defaultTo(BOT_SERVER ?? "global");
                    table.primary(["command_id", "server"]);
                });
            }
        });
    },
} as BotFeature;