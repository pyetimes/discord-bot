import { join } from "path";
import { ChatInputApplicationCommandData } from "discord.js";
import { BotFeature } from "@/types";
import { load_module_sync, get_files } from "@/loader";

type Metadata = ChatInputApplicationCommandData | ChatInputApplicationCommandData[]; 

export default {
    async on_mount({ bot }) {
        bot.client.once("ready", async () => {
            const { application } = bot.client;
            if (!application) {
                console.log("No se pudo subir la metadata de los 'Slash commands'");
                return;
            };
    
            const path_files = get_files(join(bot.path_features, "interactions"));
            const metadata = [];
            
            for (const path_file of path_files) {
                if (!path_file.endsWith("metadata.json")) 
                    continue;
                const mod = load_module_sync<Metadata>(path_file);        
                if (!mod) continue;
                if (Array.isArray(mod)) 
                    for (const m of mod) metadata.push(m);
                else metadata.push(mod);
            }
    
            const current = await application.commands.fetch();
            const desired: ChatInputApplicationCommandData[] = metadata;                   

            const currentByName = new Map(current.map(cmd => [cmd.name, cmd]));
            const desiredByName = new Map(desired.map(cmd => [cmd.name, cmd]));

            for (const [name, cmdData] of desiredByName) {
                const existing = currentByName.get(name);
                if (!existing) {
                    await application.commands.create(cmdData);
                    console.log(`→ Creado /${name}`);
                } else {
                    const sameDesc = existing.description === cmdData.description;
                    const sameOpts = JSON.stringify(existing.options) === JSON.stringify(cmdData.options || []);
                    
                    if (!sameDesc || !sameOpts) {
                        await existing.edit(cmdData);
                        console.log(`→ Actualizado /${name}`);
                    } else {
                        console.log(`→ Se mantiene /${name}`)
                    }
                }
            }
            
            for (const [id, cmd] of current) {
                if (!desiredByName.has(cmd.name)) {
                    await application.commands.delete(id);
                    console.log(`→ Borrado /${cmd.name}`);
                }
            }
        });
    },
} as BotFeature;