ALTER TABLE `cod_payment_rules`
    ADD COLUMN `hideByOrderTotal` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hideDiscountedOrders` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `minimumDiscountAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `advancedRulesJson` JSON NULL,
    ADD COLUMN `configurationVersion` INTEGER NOT NULL DEFAULT 1;

UPDATE `cod_payment_rules`
SET `hideByOrderTotal` = `enabled`;

UPDATE `cod_payment_rules` AS payment
INNER JOIN `cod_delivery_rules` AS delivery
    ON delivery.`shopId` = payment.`shopId`
SET payment.`advancedRulesJson` = delivery.`advancedRulesJson`
WHERE delivery.`advancedRulesJson` IS NOT NULL;
