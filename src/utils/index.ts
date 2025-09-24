import { CoreClient, Module } from "@core";


export async function loaderOfModules(client: CoreClient, pathFiles: string[]) {
    for (const m of pathFiles) {
        const mod: Module = await import(m);
        client.modules.set(mod.name, mod);
    }
}

async function safecall (c: () => any) {
    try { return await c(); } catch (e) { console.error(e); };
}

export async function initModules(client: CoreClient) {
    for (const m of client.modules.values()) {
        if (m.init) 
            await m.init(client);

        if (m.commands) for (const c of m.commands)
            client.commands.set(c.data.name, c);

        if (m.events) for (const e of m.events) {
            const fn = (...args: any[]) => safecall(async () => await e.execute(...args));
            if (e.once)
                client.once(e.name, fn);
            else
                client.addListener(e.name, fn);
        }
    }
}

export async function closeModules(client: CoreClient) {
    for (const m of client.modules.values().filter(m => !!m.destroy)) 
        await safecall(async () => await m.destroy!(client));
}