export const notify_channels = "notify_channels";
export const notify_permissions = "notify_permissions";


export enum Permissions {
    ADD = 1 << 0,
    REMOVE = 1 << 1,
    LIST = 1 << 2
}

export interface NotifyPermissions {
    id: number;
    user_id: string;
    guild_id: string;
    bitmask: number;
}

export interface NotifyChannel {
    id: number;
    guild_id: string;
    channel_id: string;
    channel_name: string;
    configured_by: string;
    configured_at: Date;
}