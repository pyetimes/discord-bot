import { RoleSubscription as RS } from "@prisma/client";
import { IRoleSubscription } from "./IRoleSubscription";
import { db } from "@/config";


export class RoleSubscription implements IRoleSubscription {
    async create(topic: string, guildId: string, roleId: string, userId: string): Promise<RS> {
        return await db.roleSubscription.create({ data: {
            topic,
            guildId,
            roleId,
            createdBy: userId,
        }});
    }

    async delete(id: string): Promise<RS> {
        return await db.roleSubscription.delete({ where: { id  }});
    }

    async getById(id: string): Promise<RS | null> {
        return await db.roleSubscription.findFirst({ where: { id } });
    }

    async getByRoleId(id: string): Promise<RS | null> {
        return await db.roleSubscription.findFirst({ where: { roleId: id } });
    }

    async list(filterBy: { topic?: string; userId?: string; guildId?: string; }): Promise<RS[]> {
        return await db.roleSubscription.findMany({ where: filterBy });
    }
}