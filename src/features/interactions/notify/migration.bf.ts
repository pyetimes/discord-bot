import { BotFeature } from "@/types";
import { notifyChannels, Phase } from "./misc";


export default {
    async onMount({ bot }) {
        await bot.db.migrate(async (db) => {
            if (!(await db.schema.hasTable(notifyChannels))) {
                await db.schema.createTable(notifyChannels, table => {
                    table.increments("id").primary();
                    table.string("guild_id").nullable();
                    table.string("phase").notNullable().defaultTo(Phase.REVIEW);
                    table.string("channel_id").notNullable().index();
                    table.string("channel_name").notNullable();
                    table.string("configured_by").notNullable();
                    table.timestamp("configured_at").defaultTo(db.fn.now());
                });
            } else {
                if (!(await db.schema.hasColumn(notifyChannels, "phase"))) {
                    await db.schema.alterTable(notifyChannels, table => {
                        table.string("phase").notNullable().defaultTo(Phase.REVIEW);
                    });

                    await db(notifyChannels).update({ phase: Phase.REVIEW });
                }
            }
        });
    },
} as BotFeature;
