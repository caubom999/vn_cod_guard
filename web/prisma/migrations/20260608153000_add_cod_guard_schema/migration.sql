-- CreateTable
CREATE TABLE `cod_shop_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopId` INTEGER NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `defaultChannel` ENUM('EMAIL', 'SMS', 'ZALO', 'WHATSAPP', 'MANUAL') NOT NULL DEFAULT 'EMAIL',
    `confirmationDeadlineMinutes` INTEGER NOT NULL DEFAULT 1440,
    `reminderDelayMinutes` INTEGER NOT NULL DEFAULT 180,
    `maxReminders` INTEGER NOT NULL DEFAULT 2,
    `autoCancelUnconfirmed` BOOLEAN NOT NULL DEFAULT false,
    `pendingTag` VARCHAR(64) NOT NULL DEFAULT 'cod_pending',
    `confirmedTag` VARCHAR(64) NOT NULL DEFAULT 'cod_confirmed',
    `cancelledTag` VARCHAR(64) NOT NULL DEFAULT 'cod_cancelled',
    `expiredTag` VARCHAR(64) NOT NULL DEFAULT 'cod_no_response',
    `riskTag` VARCHAR(64) NOT NULL DEFAULT 'cod_risky',
    `codPaymentNamesJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cod_shop_settings_shopId_key`(`shopId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopId` INTEGER NOT NULL,
    `topic` VARCHAR(128) NOT NULL,
    `shopifyWebhookId` VARCHAR(128) NULL,
    `shopifyOrderGid` VARCHAR(128) NULL,
    `payloadHash` VARCHAR(128) NOT NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `processedAt` DATETIME(3) NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `webhook_events_shopifyWebhookId_key`(`shopifyWebhookId`),
    INDEX `webhook_events_shopId_topic_idx`(`shopId`, `topic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cod_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopId` INTEGER NOT NULL,
    `shopifyOrderGid` VARCHAR(128) NOT NULL,
    `orderName` VARCHAR(64) NULL,
    `orderNumber` VARCHAR(64) NULL,
    `currency` VARCHAR(8) NULL,
    `totalAmount` DECIMAL(12, 2) NULL,
    `paymentMethod` VARCHAR(255) NULL,
    `financialStatus` VARCHAR(64) NULL,
    `fulfillmentStatus` VARCHAR(64) NULL,
    `customerName` VARCHAR(255) NULL,
    `customerEmail` VARCHAR(255) NULL,
    `customerPhone` VARCHAR(64) NULL,
    `normalizedPhone` VARCHAR(64) NULL,
    `shippingProvince` VARCHAR(128) NULL,
    `shippingCity` VARCHAR(128) NULL,
    `shippingDistrict` VARCHAR(128) NULL,
    `shippingAddressJson` JSON NULL,
    `isCod` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED_BY_CUSTOMER', 'EXPIRED', 'NEEDS_REVIEW', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `riskScore` INTEGER NOT NULL DEFAULT 0,
    `riskReasonJson` JSON NULL,
    `reminderCount` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cod_orders_shopId_shopifyOrderGid_key`(`shopId`, `shopifyOrderGid`),
    INDEX `cod_orders_shopId_status_idx`(`shopId`, `status`),
    INDEX `cod_orders_normalizedPhone_idx`(`normalizedPhone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codOrderId` INTEGER NOT NULL,
    `channel` ENUM('EMAIL', 'SMS', 'ZALO', 'WHATSAPP', 'MANUAL') NOT NULL,
    `tokenHash` VARCHAR(128) NOT NULL,
    `status` ENUM('ACTIVE', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `expiresAt` DATETIME(3) NOT NULL,
    `confirmedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `lastSentAt` DATETIME(3) NULL,
    `ipAddress` VARCHAR(64) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `verification_sessions_tokenHash_key`(`tokenHash`),
    INDEX `verification_sessions_codOrderId_status_idx`(`codOrderId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cod_message_deliveries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `verificationSessionId` INTEGER NOT NULL,
    `channel` ENUM('EMAIL', 'SMS', 'ZALO', 'WHATSAPP', 'MANUAL') NOT NULL,
    `provider` VARCHAR(64) NULL,
    `providerMessageId` VARCHAR(255) NULL,
    `recipient` VARCHAR(255) NOT NULL,
    `status` ENUM('QUEUED', 'SENT', 'DELIVERED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `error` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cod_message_deliveries_verificationSessionId_status_idx`(`verificationSessionId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cod_risk_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `conditionJson` JSON NOT NULL,
    `actionJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cod_risk_rules_shopId_enabled_priority_idx`(`shopId`, `enabled`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cod_blacklist_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopId` INTEGER NOT NULL,
    `type` ENUM('PHONE', 'EMAIL', 'ADDRESS') NOT NULL,
    `value` VARCHAR(255) NOT NULL,
    `normalizedValue` VARCHAR(255) NOT NULL,
    `reason` TEXT NULL,
    `hitCount` INTEGER NOT NULL DEFAULT 0,
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cod_blacklist_entries_shopId_type_normalizedValue_key`(`shopId`, `type`, `normalizedValue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cod_automation_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codOrderId` INTEGER NOT NULL,
    `type` ENUM('SEND_REMINDER', 'EXPIRE_ORDER', 'AUTO_CANCEL_ORDER') NOT NULL,
    `status` ENUM('SCHEDULED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `runAt` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cod_automation_jobs_status_runAt_idx`(`status`, `runAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cod_verification_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codOrderId` INTEGER NOT NULL,
    `verificationSessionId` INTEGER NULL,
    `type` VARCHAR(64) NOT NULL,
    `message` TEXT NULL,
    `metadataJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cod_verification_events_codOrderId_type_idx`(`codOrderId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cod_message_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopId` INTEGER NOT NULL,
    `type` ENUM('VERIFICATION', 'REMINDER', 'CONFIRMED', 'CANCELLED', 'EXPIRED') NOT NULL,
    `channel` ENUM('EMAIL', 'SMS', 'ZALO', 'WHATSAPP', 'MANUAL') NOT NULL,
    `locale` VARCHAR(16) NOT NULL DEFAULT 'vi',
    `subject` VARCHAR(255) NULL,
    `body` TEXT NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cod_message_templates_shopId_type_channel_locale_key`(`shopId`, `type`, `channel`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cod_channel_integrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopId` INTEGER NOT NULL,
    `provider` ENUM('EMAIL', 'ZALO_OA', 'SMS', 'WHATSAPP') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `senderName` VARCHAR(128) NULL,
    `configJson` JSON NULL,
    `encryptedSecretJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cod_channel_integrations_shopId_provider_key`(`shopId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cod_shop_settings` ADD CONSTRAINT `cod_shop_settings_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cod_orders` ADD CONSTRAINT `cod_orders_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_sessions` ADD CONSTRAINT `verification_sessions_codOrderId_fkey` FOREIGN KEY (`codOrderId`) REFERENCES `cod_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cod_message_deliveries` ADD CONSTRAINT `cod_message_deliveries_verificationSessionId_fkey` FOREIGN KEY (`verificationSessionId`) REFERENCES `verification_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cod_risk_rules` ADD CONSTRAINT `cod_risk_rules_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cod_blacklist_entries` ADD CONSTRAINT `cod_blacklist_entries_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cod_automation_jobs` ADD CONSTRAINT `cod_automation_jobs_codOrderId_fkey` FOREIGN KEY (`codOrderId`) REFERENCES `cod_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cod_verification_events` ADD CONSTRAINT `cod_verification_events_codOrderId_fkey` FOREIGN KEY (`codOrderId`) REFERENCES `cod_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cod_verification_events` ADD CONSTRAINT `cod_verification_events_verificationSessionId_fkey` FOREIGN KEY (`verificationSessionId`) REFERENCES `verification_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cod_message_templates` ADD CONSTRAINT `cod_message_templates_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cod_channel_integrations` ADD CONSTRAINT `cod_channel_integrations_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
