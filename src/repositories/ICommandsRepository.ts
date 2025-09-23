import { Command, CommandDeployment, DeploymentScope } from "@prisma/client";


export interface ICommandRepository {
    create(name: string, hash: string): Promise<Command>;
    delete(id: string): Promise<Command>;

    getById(id: string): Promise<Command | null>;
    getByName(name: string): Promise<Command | null>;
    updateHash(commandId: string, hash: string): Promise<Command>;
    list(): Promise<Command[]>;

    upsertDeployment(params: {
        commandId: string;
        scope: DeploymentScope;
        guildId?: string;
    }): Promise<CommandDeployment>;

    deleteDeployment(params: {
        commandId: string;
        scope: DeploymentScope;
        guildId?: string;
    }): Promise<void>;


    getDeployment(params: {
        commandId: string;
        scope: DeploymentScope;
        guildId?: string;
    }): Promise<CommandDeployment | null>;

    listDeploymentsByCommand(commandId: string): Promise<CommandDeployment[]>;
    listGlobalDeployments(): Promise<CommandDeployment[]>;
    listDeploymentsByGuild(guildId: string): Promise<CommandDeployment[]>;
}
