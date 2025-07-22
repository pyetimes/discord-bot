import { readdirSync } from "fs";
import { extname, join } from "path";


export function get_files(directory: string): string[] {
    let files: string[] = [];
    
    const items = readdirSync(directory, { withFileTypes: true, recursive: true });

    for (const item of items)
        if (item.isFile())
            files.push(join(item.parentPath, item.name));
    return files;
}


export function load_module_sync<T>(fullFilePath: string): T | undefined {
    if (fullFilePath.endsWith(".d.ts")) 
        return undefined; 
    
    // Limpiamos el archivo del cache antes de cargarlo
    delete require.cache[require.resolve(fullFilePath)];

    const ext = extname(fullFilePath).toLowerCase();
    
    switch (ext) {
        case '.json':
            return require(fullFilePath);
        case '.ts':
        case '.js':
            const mod = require(fullFilePath);
            return mod?.default ?? mod;
        // default:
            // throw new Error(`Unsupported module type for: ${fullFilePath}`);
    }
    return undefined;
}