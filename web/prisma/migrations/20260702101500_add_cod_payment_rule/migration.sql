CREATE TABLE `cod_payment_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopId` INTEGER NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `paymentMethodName` VARCHAR(255) NOT NULL DEFAULT 'Cash on Delivery (COD)',
    `hideBelowOrderTotal` DECIMAL(14, 2) NULL,
    `hideAboveOrderTotal` DECIMAL(14, 2) NULL,
    `shopifyPaymentCustomizationId` VARCHAR(128) NULL,
    `shopifyMetafieldId` VARCHAR(128) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cod_payment_rules_shopId_key`(`shopId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cod_payment_rules`
    ADD CONSTRAINT `cod_payment_rules_shopId_fkey`
    FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
