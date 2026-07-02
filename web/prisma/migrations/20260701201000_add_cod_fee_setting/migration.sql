CREATE TABLE `cod_fee_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopId` INTEGER NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `feeType` ENUM('FIXED', 'PERCENTAGE') NOT NULL DEFAULT 'FIXED',
    `feeAmount` DECIMAL(14, 2) NOT NULL DEFAULT 20000,
    `minimumOrderAmount` DECIMAL(14, 2) NULL,
    `provincesJson` JSON NULL,
    `excludedCustomerTagsJson` JSON NULL,
    `lineItemTitle` VARCHAR(255) NOT NULL DEFAULT 'COD fee',
    `displayMessage` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cod_fee_settings_shopId_key`(`shopId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cod_orders`
    ADD COLUMN `codFeeAmount` DECIMAL(14, 2) NULL,
    ADD COLUMN `codFeeAppliedAt` DATETIME(3) NULL,
    ADD COLUMN `codFeeError` TEXT NULL;

ALTER TABLE `cod_fee_settings`
    ADD CONSTRAINT `cod_fee_settings_shopId_fkey`
    FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
