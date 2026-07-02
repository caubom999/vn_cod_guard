ALTER TABLE `cod_payment_rules`
    ADD COLUMN `hideByOrderTotal` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hideDiscountedOrders` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `minimumDiscountAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0;

UPDATE `cod_payment_rules`
SET `hideByOrderTotal` = `enabled`;
