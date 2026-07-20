-- Create the billing tables before the following migration normalizes their
-- legacy snake_case columns to the Prisma schema's camelCase column names.
CREATE TABLE `shop_billing_subscriptions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `shop_id` INTEGER NOT NULL,
  `plan_key` ENUM('FREE', 'STARTER', 'GROWTH', 'PRO') NOT NULL DEFAULT 'FREE',
  `status` ENUM('ACTIVE', 'PENDING', 'CANCELLED', 'DECLINED', 'EXPIRED', 'FROZEN') NOT NULL DEFAULT 'ACTIVE',
  `shopify_subscription_gid` VARCHAR(128) NULL,
  `confirmation_url` TEXT NULL,
  `trial_ends_at` DATETIME(3) NULL,
  `current_period_started_at` DATETIME(3) NULL,
  `current_period_ends_at` DATETIME(3) NULL,
  `cancelled_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `shop_billing_subscriptions_shop_id_key`(`shop_id`),
  UNIQUE INDEX `shop_billing_subscriptions_shopify_subscription_gid_key`(`shopify_subscription_gid`),
  INDEX `shop_billing_subscriptions_plan_key_status_idx`(`plan_key`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `shop_billing_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `shop_id` INTEGER NOT NULL,
  `type` ENUM('SUBSCRIPTION_CREATED', 'SUBSCRIPTION_ACTIVATED', 'SUBSCRIPTION_CANCELLED', 'PLAN_CHANGED', 'USAGE_LIMIT_REACHED', 'USAGE_LIMIT_WARNING', 'SYNCED_FROM_SHOPIFY') NOT NULL,
  `message` TEXT NULL,
  `metadata_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `shop_billing_events_shop_id_type_idx`(`shop_id`, `type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `shop_billing_subscriptions`
  ADD CONSTRAINT `shop_billing_subscriptions_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `shop_billing_events`
  ADD CONSTRAINT `shop_billing_events_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
