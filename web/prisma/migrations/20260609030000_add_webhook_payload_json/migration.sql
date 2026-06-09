-- AlterTable
ALTER TABLE `webhook_events` ADD COLUMN `payloadJson` JSON NULL AFTER `payloadHash`;
