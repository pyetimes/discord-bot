import { db } from "@/config";
import { ICommandRepository } from "./ICommandsRepository";
import { Command, CommandDeployment, DeploymentScope } from "@prisma/client";


export class CommandRepository implements ICommandRepository {
    async create(name: string, hash: string): Promise<Command> {
        return await db.command.create({ data: { name, hash } });
    }

    async delete(id: string): Promise<Command> {
        return await db.command.delete({ where: { id } });
    }

    async deleteDeployment(params: { commandId: string; scope: DeploymentScope; guildId?: string; }): Promise<void> {
        await db.commandDeployment.deleteMany({ where: params});
    }

    async getById(id: string): Promise<Command | null> {
        return await db.command.findFirst({ where: { id } });
    }

    async getByName(name: string): Promise<Command | null> {
        return await db.command.findFirst({ where: { name } });
    }

    async getDeployment(params: { commandId: string; scope: DeploymentScope; guildId?: string; }): Promise<CommandDeployment | null> {
        return await db.commandDeployment.findFirst({ where: params });
    }

    async list(): Promise<Command[]> {
        return await db.command.findMany();
    }

    async listDeploymentsByCommand(commandId: string): Promise<CommandDeployment[]> {
        return await db.commandDeployment.findMany({ where: { commandId } });
    }

    async listDeploymentsByGuild(guildId: string): Promise<CommandDeployment[]> {
        return await db.commandDeployment.findMany({ where: { guildId } });
    }

    async listGlobalDeployments(): Promise<CommandDeployment[]> {
        return await db.commandDeployment.findMany({ where: { scope: DeploymentScope.GLOBAL } });
    }

    async updateHash(commandId: string, hash: string): Promise<Command> {
        return await db.command.update({ where: { id: commandId }, data: { hash } });
    }

    async upsertDeployment(params: { commandId: string; scope: DeploymentScope; guildId?: string; }): Promise<CommandDeployment> {
        const { commandId, scope, guildId } = params;
        const currentGuildId = scope === DeploymentScope.SERVER ? guildId! : null;
        
        const existing = await db.commandDeployment.findFirst({
            where: { commandId, guildId: currentGuildId },
        });

        if (existing) {
            return await db.commandDeployment.update({
                where: { id: existing.id },
                data: { scope, configuredAt: new Date(), },
            });
        }

        return await db.commandDeployment.create({
            data: {
                commandId,
                scope,
                guildId: currentGuildId,
                configuredAt: new Date(),
            },
        });
    }
}
