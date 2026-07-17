ALTER TABLE `cod_shop_settings`
    ADD COLUMN `blacklistPhoneEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `blacklistPhoneScore` INTEGER NOT NULL DEFAULT 80,
    ADD COLUMN `blacklistEmailEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `blacklistEmailScore` INTEGER NOT NULL DEFAULT 70,
    ADD COLUMN `blacklistAddressEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `blacklistAddressScore` INTEGER NOT NULL DEFAULT 70;
