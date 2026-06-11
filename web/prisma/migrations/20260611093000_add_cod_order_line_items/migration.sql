-- AlterTable
ALTER TABLE `cod_orders` ADD COLUMN `lineItemsJson` JSON NULL AFTER `shippingAddressJson`;
