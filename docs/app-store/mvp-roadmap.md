# MVP Build Order

## App Store-ready build order
1. Webhook orders/create
2. COD detection + save CodOrder
3. Verification token + public verify page
4. Email confirmation
5. Shopify order tagging
6. Dashboard pending/confirmed/cancelled
7. Settings page
8. Reminder/expire jobs
9. Compliance webhooks
10. Billing
11. Zalo/SMS integration
12. App Store submission

## MVP stop point
The first merchant-demo MVP should stop at steps 1-7.

That means the demo product should prove:
- New Shopify order arrives through orders/create webhook.
- COD payment method is detected.
- CodOrder is stored locally.
- Verification link is created without storing raw token.
- Customer can confirm or cancel on a public page.
- Shopify order tags are updated.
- Merchant can view dashboard and adjust settings.

## Post-MVP hardening
After the first demo is stable:
- Enable reminder/expire jobs.
- Verify privacy compliance webhooks in Partner Dashboard.
- Prepare public distribution and Shopify Billing.
- Add Zalo OA/SMS integrations.
- Prepare App Store listing assets and submit.
