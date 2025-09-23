import { Guild } from "@prisma/client";
import { IGuildRepository } from "./IGuildRepository";
import { db } from "@/config";

export class GuildRepository implements IGuildRepository {
    async create(id: string, name: string, nameAcronym: string): Promise<Guild> {    
        return await db.guild.create({ data: { id, name, nameAcronym } });
    }

    async delete(id: string): Promise<Guild> {
        return await db.guild.delete({ where: { id } });
    }


    async update(id: string, data: { name?: string; nameAcronym?: string; }): Promise<Guild> {
        return await db.guild.update({ where: { id }, data });
    }

    async getById(id: string): Promise<Guild | null> {
        return await db.guild.findFirst({ where: { id } });
    }

    async getByName(name: string): Promise<Guild | null> {
        return await db.guild.findFirst({ where: { name } });
    }

    async list(): Promise<Guild[]> {
        return await db.guild.findMany();
    }
}
