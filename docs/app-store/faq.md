# FAQ Draft

## What does Vietnam COD Guard do?
Vietnam COD Guard helps merchants verify cash-on-delivery orders before fulfilment. It detects COD orders, stores a local snapshot, sends a verification link, and updates Shopify tags based on the result.

## Is it only for Vietnam?
The MVP is focused on Vietnam because COD behaviour, phone formats, provinces, and local channels such as Zalo are important to the workflow. The app can still detect COD by payment method names, but the product positioning is Vietnam-first.

## Does it prevent all fake orders?
No. The app helps reduce fake, unreachable, or no-response COD orders, but merchants should still review risky orders before shipping.

## Which payment methods are detected as COD?
Merchants configure COD payment method names in Settings. The app matches new orders against those names.

## What happens when a customer confirms?
The COD order is marked confirmed in the app, a verification event is stored, and the Shopify order can receive the confirmed tag.

## What happens when a customer cancels?
The COD order is marked cancelled by customer, a verification event is stored, and the Shopify order can receive the cancelled tag.

## What happens if the customer does not respond?
The order can expire after the configured deadline. If auto-cancel is enabled, the app can cancel the Shopify order after expiry.

## Does the app store raw verification tokens?
No. The raw token is sent in the verification link. Only the token hash is stored in the database.

## Does the app support email, SMS, Zalo, and WhatsApp?
MVP supports email verification first. SMS, Zalo OA, and WhatsApp are planned after MVP.

## What data does the app store?
The app stores the data needed to verify and audit COD orders: shop data, order snapshot, customer contact details needed for verification, shipping location, risk results, message delivery status, and app settings.

## How can merchants get support?
Email support@vietnamcodguard.com.
