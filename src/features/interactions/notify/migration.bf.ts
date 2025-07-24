import { BotFeature } from "@/types";


export default {
    async on_mount({ bot }) {
        await bot.database.migrate(async (db) => {
            if (!(await db.schema.hasTable("notify_channels"))) {
                await db.schema.createTable("notify_channels", table => {
                    table.increments("id").primary();
                    table.string("guild_id").nullable();
                    table.string("channel_id").notNullable().index();
                    table.string("channel_name").notNullable();
                    table.string("configured_by").notNullable();
                    table.timestamp("configured_at").defaultTo(db.fn.now());
                });
            }

            if (!(await db.schema.hasTable("notify_permissions"))) {
                await db.schema.createTable("notify_permissions", table => {
                    table.increments("id").primary();
                    table.string("user_id").notNullable().index();
                    table.string("guild_id").notNullable().index();
                    table.integer("bitmask").notNullable();
                });
            }
        });
    },
} as BotFeature;
