import { Guild } from "@prisma/client";


export interface IGuildRepository {
    create(id: string, name: string, nameAcronym: string): Promise<Guild>;
    update(id: string, data: { name?: string, nameAcronym?: string, }): Promise<Guild>;
    delete(id: string): Promise<Guild>;
    
    getById(id: string): Promise<Guild | null>;
    getByName(name: string): Promise<Guild | null>;
    
    list(): Promise<Guild[]>;
}
