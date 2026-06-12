# Demo Store Preparation

## Demo store
Development store: storevt23.myshopify.com

## Demo data to prepare
- Create one COD payment method name matching the app setting, for example: cod payment vt.
- Create at least 5 demo products with clear names and prices.
- Create test customers with Vietnamese-looking phone numbers and emails.
- Create sample orders covering these states:
  - COD pending
  - COD confirmed
  - COD cancelled by customer
  - COD expired/no response
  - COD risky
  - Non-COD skipped

## Demo flow
1. Install Vietnam COD Guard on the demo store.
2. Open Settings and configure COD payment method names.
3. Place a COD order.
4. Confirm that orders/create webhook creates a CodOrder.
5. Open the verification email/log and click the public verify link.
6. Confirm or cancel the order.
7. Show Shopify order tags updated.
8. Show the dashboard counters and order detail timeline.

## Demo notes
- Use dev-log email mode when testing without a verified email sending domain.
- Use Resend only with a verified sender/domain for real recipient emails.
- Do not show real customer PII in screenshots.
