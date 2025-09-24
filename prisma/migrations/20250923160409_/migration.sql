-- CreateEnum
CREATE TYPE "public"."DeploymentScope" AS ENUM ('GLOBAL', 'SERVER');

-- CreateTable
CREATE TABLE "public"."command" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAcronym" TEXT NOT NULL,

    CONSTRAINT "guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."command_deployment" (
    "id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "scope" "public"."DeploymentScope" NOT NULL DEFAULT 'GLOBAL',
    "guild_id" TEXT,
    "configured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."channel_subscription" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "command_name_key" ON "public"."command"("name");

-- CreateIndex
CREATE INDEX "command_deployment_guild_id_idx" ON "public"."command_deployment"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "command_deployment_command_id_guild_id_key" ON "public"."command_deployment"("command_id", "guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_subscription_topic_channel_id_key" ON "public"."channel_subscription"("topic", "channel_id");

-- AddForeignKey
ALTER TABLE "public"."command_deployment" ADD CONSTRAINT "command_deployment_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "public"."command"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."command_deployment" ADD CONSTRAINT "command_deployment_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
