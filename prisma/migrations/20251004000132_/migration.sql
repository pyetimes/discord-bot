-- AlterTable
ALTER TABLE "public"."command" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."role_subscription" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_subscription_topic_guild_id_role_id_key" ON "public"."role_subscription"("topic", "guild_id", "role_id");
