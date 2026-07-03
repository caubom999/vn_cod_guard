# App Store Submission Checklist

## Product positioning
- App name: Vietnam COD Guard
- Tagline: Reduce COD fake orders for Vietnam Shopify stores.
- Primary audience: Vietnam Shopify merchants using COD.
- Claims are honest: reduce risk and manual review, not guarantee fraud prevention.

## Technical readiness
- orders/create webhook works and verifies HMAC.
- app/uninstalled webhook cleans shop data and sessions.
- customers/data_request, customers/redact, and shop/redact are implemented.
- Raw verification tokens are not stored.
- Access tokens, API keys, secrets, and PII are not logged.
- Billing uses Shopify Billing before public launch.
- Support email is configured.
- Privacy Policy, Terms of Service, and Data Retention Policy are live.

## Listing assets
- App icon created.
- Screenshots captured from demo store with masked PII.
- Demo store data prepared.
- Pricing page copy prepared.
- FAQ prepared.
- Support email inbox tested.

## MVP demo acceptance
- COD order is created in Shopify.
- App captures and displays it.
- Verification link opens publicly.
- Confirm updates app status and Shopify tags.
- Cancel updates app status and Shopify tags.
- Settings changes affect future orders.
