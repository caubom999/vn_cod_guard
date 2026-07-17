UPDATE `cod_shop_settings`
SET `blacklistEmailScore` = 60
WHERE `blacklistEmailScore` = 70;

UPDATE `cod_shop_settings`
SET `blacklistAddressScore` = 40
WHERE `blacklistAddressScore` = 70;

ALTER TABLE `cod_shop_settings`
    MODIFY COLUMN `blacklistEmailScore` INTEGER NOT NULL DEFAULT 60,
    MODIFY COLUMN `blacklistAddressScore` INTEGER NOT NULL DEFAULT 40;

UPDATE `cod_risk_rules`
SET `actionJson` = JSON_SET(`actionJson`, '$.score', 40)
WHERE JSON_UNQUOTE(JSON_EXTRACT(`conditionJson`, '$.type')) = 'missing_phone'
  AND JSON_UNQUOTE(JSON_EXTRACT(`actionJson`, '$.reason')) = 'missing_phone'
  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(`actionJson`, '$.score')) AS UNSIGNED) = 60;

UPDATE `cod_risk_rules`
SET `actionJson` = JSON_SET(`actionJson`, '$.score', 5)
WHERE JSON_UNQUOTE(JSON_EXTRACT(`conditionJson`, '$.type')) = 'missing_email'
  AND JSON_UNQUOTE(JSON_EXTRACT(`actionJson`, '$.reason')) = 'missing_email'
  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(`actionJson`, '$.score')) AS UNSIGNED) = 20;

UPDATE `cod_risk_rules`
SET `actionJson` = JSON_SET(`actionJson`, '$.score', 20)
WHERE JSON_UNQUOTE(JSON_EXTRACT(`conditionJson`, '$.type')) = 'amount_gte'
  AND JSON_UNQUOTE(JSON_EXTRACT(`actionJson`, '$.reason')) = 'high_order_amount'
  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(`actionJson`, '$.score')) AS UNSIGNED) = 25;

UPDATE `cod_risk_rules`
SET `actionJson` = JSON_SET(`actionJson`, '$.score', 20)
WHERE JSON_UNQUOTE(JSON_EXTRACT(`conditionJson`, '$.type')) = 'location_in'
  AND JSON_UNQUOTE(JSON_EXTRACT(`actionJson`, '$.reason')) = 'risky_location'
  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(`actionJson`, '$.score')) AS UNSIGNED) = 30;
