/*
  Warnings:

  - You are about to drop the column `created_at` on the `shop_billing_events` table. All the data in the column will be lost.
  - You are about to drop the column `metadata_json` on the `shop_billing_events` table. All the data in the column will be lost.
  - You are about to drop the column `shop_id` on the `shop_billing_events` table. All the data in the column will be lost.
  - You are about to drop the column `cancelled_at` on the `shop_billing_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `confirmation_url` on the `shop_billing_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `shop_billing_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `current_period_ends_at` on the `shop_billing_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `current_period_started_at` on the `shop_billing_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `plan_key` on the `shop_billing_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `shop_id` on the `shop_billing_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `shopify_subscription_gid` on the `shop_billing_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `trial_ends_at` on the `shop_billing_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `shop_billing_subscriptions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[shopId]` on the table `shop_billing_subscriptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shopifySubscriptionGid]` on the table `shop_billing_subscriptions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shopId` to the `shop_billing_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopId` to the `shop_billing_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `shop_billing_subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `shop_billing_events` DROP FOREIGN KEY `shop_billing_events_shop_id_fkey`;

-- DropForeignKey
ALTER TABLE `shop_billing_subscriptions` DROP FOREIGN KEY `shop_billing_subscriptions_shop_id_fkey`;

-- DropIndex
DROP INDEX `shop_billing_events_shop_id_type_idx` ON `shop_billing_events`;

-- DropIndex
DROP INDEX `shop_billing_subscriptions_plan_key_status_idx` ON `shop_billing_subscriptions`;

-- DropIndex
DROP INDEX `shop_billing_subscriptions_shop_id_key` ON `shop_billing_subscriptions`;

-- DropIndex
DROP INDEX `shop_billing_subscriptions_shopify_subscription_gid_key` ON `shop_billing_subscriptions`;

-- AlterTable
ALTER TABLE `shop_billing_events` DROP COLUMN `created_at`,
    DROP COLUMN `metadata_json`,
    DROP COLUMN `shop_id`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `metadataJson` JSON NULL,
    ADD COLUMN `shopId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `shop_billing_subscriptions` DROP COLUMN `cancelled_at`,
    DROP COLUMN `confirmation_url`,
    DROP COLUMN `created_at`,
    DROP COLUMN `current_period_ends_at`,
    DROP COLUMN `current_period_started_at`,
    DROP COLUMN `plan_key`,
    DROP COLUMN `shop_id`,
    DROP COLUMN `shopify_subscription_gid`,
    DROP COLUMN `trial_ends_at`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    ADD COLUMN `confirmationUrl` TEXT NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `currentPeriodEndsAt` DATETIME(3) NULL,
    ADD COLUMN `currentPeriodStartedAt` DATETIME(3) NULL,
    ADD COLUMN `planKey` ENUM('FREE', 'STARTER', 'GROWTH', 'PRO') NOT NULL DEFAULT 'FREE',
    ADD COLUMN `shopId` INTEGER NOT NULL,
    ADD COLUMN `shopifySubscriptionGid` VARCHAR(128) NULL,
    ADD COLUMN `trialEndsAt` DATETIME(3) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE INDEX `shop_billing_events_shopId_type_idx` ON `shop_billing_events`(`shopId`, `type`);

-- CreateIndex
CREATE UNIQUE INDEX `shop_billing_subscriptions_shopId_key` ON `shop_billing_subscriptions`(`shopId`);

-- CreateIndex
CREATE UNIQUE INDEX `shop_billing_subscriptions_shopifySubscriptionGid_key` ON `shop_billing_subscriptions`(`shopifySubscriptionGid`);

-- CreateIndex
CREATE INDEX `shop_billing_subscriptions_planKey_status_idx` ON `shop_billing_subscriptions`(`planKey`, `status`);

-- AddForeignKey
ALTER TABLE `shop_billing_subscriptions` ADD CONSTRAINT `shop_billing_subscriptions_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shop_billing_events` ADD CONSTRAINT `shop_billing_events_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
