import { readdirSync } from "fs";
import { extname, join } from "path";


export function getFiles(directory: string): string[] {    
    return readdirSync(directory, { withFileTypes: true, recursive: true })
        .filter((a) => a.isFile())
        .map(f => join(f.parentPath, f.name));
}

export function loadModuleSync<T>(fullFilePath: string): T | undefined {
    if (fullFilePath.endsWith(".d.ts")) 
        return undefined; 

    delete require.cache[require.resolve(fullFilePath)];

    const ext = extname(fullFilePath).toLowerCase();
    
    if (ext === ".json") {
        return require(fullFilePath);
    }

    const mod = require(fullFilePath);
    return mod?.default ?? mod;
}