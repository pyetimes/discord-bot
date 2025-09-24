import { PrismaClient } from "@prisma/client";


type Env = 'development' | 'production';

interface EnvVars {
  DS_TOKEN?: string;
  OWNER_ID?: string;
  GUILD_ID?: string;
  WH_TOKEN?: string;
  NODE_ENV:  Env;
}

const { 
    DS_TOKEN, 
    OWNER_ID, 
    GUILD_ID, 
    WH_TOKEN,
    NODE_ENV = "development",
} = process.env as unknown as EnvVars;

export const db = new PrismaClient();

export async function initDB() {
    await db.$connect();
}

export async function closeDB() {
    await db.$disconnect();
}

export { DS_TOKEN, OWNER_ID, GUILD_ID, WH_TOKEN, NODE_ENV }