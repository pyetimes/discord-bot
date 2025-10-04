import { RoleSubscription } from "@prisma/client";

export interface IRoleSubscription {
    create(topic: string, guildId: string, roleId: string, userId: string): Promise<RoleSubscription>;
    delete(id: string): Promise<RoleSubscription>;


    getById(id: string): Promise<RoleSubscription | null>;
    getByRoleId(id: string): Promise<RoleSubscription | null>;
    list(filterBy: { topic?: string, userId?: string, guildId?: string }): Promise<RoleSubscription[]>;
}