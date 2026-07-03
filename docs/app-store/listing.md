# Shopify App Store Listing Draft

## App name
Vietnam COD Guard

## One-line value proposition
Reduce COD fake orders for Vietnam Shopify stores.

## Short description
Vietnam COD Guard helps Shopify merchants in Vietnam verify cash-on-delivery orders before fulfilment, tag risky orders, and reduce wasted shipping costs from fake or unreachable customers.

## Long description
Vietnam COD Guard is built for Shopify stores that sell with COD in Vietnam. The app listens for new orders, detects configured COD payment methods, stores a local COD order snapshot, sends a verification link by email, and updates Shopify order tags when the customer confirms, cancels, or does not respond.

The goal is to help merchants make faster fulfilment decisions without repeatedly calling Shopify APIs or manually checking every COD order.

## Key benefits
- Detect COD orders from configurable payment method names.
- Save COD order snapshots for a faster dashboard.
- Send customer verification links by email.
- Tag Shopify orders as pending, confirmed, cancelled, risky, or no response.
- Track pending, confirmed, cancelled, expired, and risky COD orders.
- Configure verification deadlines, reminder timing, custom tags, and COD payment names.
- Support Shopify privacy webhooks required for public apps.

## Recommended App Store tagline
Reduce COD fake orders for Vietnam Shopify stores.

## Requirements to disclose
- The store must use Shopify orders and a COD payment method name that can be matched by the app settings.
- Email sending requires a configured email provider. Development mode can log emails instead of sending them.
- Paid plans require Shopify Billing and public app distribution.
- SMS, Zalo OA, and WhatsApp are planned after the MVP.

## Honest limitations
- The app reduces manual review work, but it cannot guarantee that every fraudulent or unreachable order will be detected.
- Merchants should review risky orders before fulfilment.
- Auto-cancel should only be enabled when the merchant is comfortable with automatic order cancellation rules.

## Support
Support email: support@vietnamcodguard.com

## Legal URLs
- Privacy Policy: /privacy
- Terms of Service: /terms
- Data Retention Policy: /data-retention
