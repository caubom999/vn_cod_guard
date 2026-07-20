-- Remove constraints and indexes that reference the legacy column names.
ALTER TABLE `shop_billing_events`
  DROP FOREIGN KEY `shop_billing_events_shop_id_fkey`;

ALTER TABLE `shop_billing_subscriptions`
  DROP FOREIGN KEY `shop_billing_subscriptions_shop_id_fkey`;

DROP INDEX `shop_billing_events_shop_id_type_idx`
  ON `shop_billing_events`;

DROP INDEX `shop_billing_subscriptions_plan_key_status_idx`
  ON `shop_billing_subscriptions`;

DROP INDEX `shop_billing_subscriptions_shop_id_key`
  ON `shop_billing_subscriptions`;

DROP INDEX `shop_billing_subscriptions_shopify_subscription_gid_key`
  ON `shop_billing_subscriptions`;

-- Rename the legacy columns instead of dropping and recreating them so any
-- existing billing data remains intact.
ALTER TABLE `shop_billing_events`
  CHANGE COLUMN `created_at` `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CHANGE COLUMN `metadata_json` `metadataJson` JSON NULL,
  CHANGE COLUMN `shop_id` `shopId` INTEGER NOT NULL;

ALTER TABLE `shop_billing_subscriptions`
  CHANGE COLUMN `cancelled_at` `cancelledAt` DATETIME(3) NULL,
  CHANGE COLUMN `confirmation_url` `confirmationUrl` TEXT NULL,
  CHANGE COLUMN `created_at` `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CHANGE COLUMN `current_period_ends_at` `currentPeriodEndsAt` DATETIME(3) NULL,
  CHANGE COLUMN `current_period_started_at` `currentPeriodStartedAt` DATETIME(3) NULL,
  CHANGE COLUMN `plan_key` `planKey` ENUM('FREE', 'STARTER', 'GROWTH', 'PRO') NOT NULL DEFAULT 'FREE',
  CHANGE COLUMN `shop_id` `shopId` INTEGER NOT NULL,
  CHANGE COLUMN `shopify_subscription_gid` `shopifySubscriptionGid` VARCHAR(128) NULL,
  CHANGE COLUMN `trial_ends_at` `trialEndsAt` DATETIME(3) NULL,
  CHANGE COLUMN `updated_at` `updatedAt` DATETIME(3) NOT NULL;

CREATE INDEX `shop_billing_events_shopId_type_idx`
  ON `shop_billing_events`(`shopId`, `type`);

CREATE UNIQUE INDEX `shop_billing_subscriptions_shopId_key`
  ON `shop_billing_subscriptions`(`shopId`);

CREATE UNIQUE INDEX `shop_billing_subscriptions_shopifySubscriptionGid_key`
  ON `shop_billing_subscriptions`(`shopifySubscriptionGid`);

CREATE INDEX `shop_billing_subscriptions_planKey_status_idx`
  ON `shop_billing_subscriptions`(`planKey`, `status`);

ALTER TABLE `shop_billing_subscriptions`
  ADD CONSTRAINT `shop_billing_subscriptions_shopId_fkey`
  FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `shop_billing_events`
  ADD CONSTRAINT `shop_billing_events_shopId_fkey`
  FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
