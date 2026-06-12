export type LegalPageKey = 'privacy' | 'terms' | 'dataRetention';

export type LegalPage = {
  title: string;
  paragraphs: string[];
};

type LegalPageContext = {
  supportEmail: string;
};

export function getLegalPage(
  key: LegalPageKey,
  context: LegalPageContext,
): LegalPage {
  return legalPages[key](context);
}

const legalPages: Record<
  LegalPageKey,
  (context: LegalPageContext) => LegalPage
> = {
  privacy: ({ supportEmail }) => ({
    title: 'Privacy Policy',
    paragraphs: [
      'Vietnam COD Guard processes Shopify order and customer data only to verify COD orders, detect risky COD orders, send verification messages, and help merchants manage COD fulfilment decisions.',
      'Data we may store includes shop domain, shop contact email, COD order snapshots, customer contact details needed for verification, shipping location data, message delivery status, risk rule results, blacklist entries configured by the merchant, and Shopify offline session tokens required to operate the app.',
      'Verification tokens are generated randomly and only hashed tokens are stored. Raw verification tokens are not persisted in verification sessions or event metadata.',
      'We do not sell customer data. We do not log Shopify access tokens, app secrets, or raw webhook bodies. Production email logs mask recipient addresses.',
      'Shopify privacy webhooks are supported for customers/data_request, customers/redact, and shop/redact. Customer redaction anonymizes PII while preserving aggregate COD analytics. Shop redaction deletes shop data and sessions.',
      'For privacy requests, contact ' + supportEmail + '.',
    ],
  }),
  terms: ({ supportEmail }) => ({
    title: 'Terms of Service',
    paragraphs: [
      'Vietnam COD Guard helps Shopify merchants verify COD orders, manage risk rules, send verification messages, and reduce avoidable shipping costs.',
      'Merchants are responsible for configuring message channels, COD payment method names, risk rules, blacklist entries, and automatic cancellation settings according to their legal and operational requirements.',
      'The app may update Shopify order tags and notes based on customer verification decisions, expiry rules, risk rules, and merchant settings.',
      'The app does not guarantee that every fraudulent, invalid, or unreachable order will be detected. Merchants should review risky orders and local compliance requirements before fulfilment.',
      'Do not use the app to send unlawful, misleading, or unsolicited messages. Contact ' +
        supportEmail +
        ' for support.',
    ],
  }),
  dataRetention: () => ({
    title: 'Data Retention Policy',
    paragraphs: [
      'Active shop data is retained while the merchant keeps Vietnam COD Guard installed and the data is needed for COD verification, audit timelines, analytics, risk prevention, messaging, or merchant configuration.',
      'When the app is uninstalled, app/uninstalled cleanup removes the local shop record and Shopify sessions. Related COD settings, orders, events, jobs, templates, integrations, and blacklist entries are deleted by database cascade.',
      'When Shopify sends shop/redact, all local shop data and Shopify sessions for that shop are deleted.',
      'When Shopify sends customers/redact, customer PII in matching COD orders is anonymized. This includes customer name, email, phone, normalized phone, shipping address fields, verification IP/user-agent, message recipient/body/subject/provider message id, and event metadata for matching orders.',
      'Webhook payloads are not stored raw. Vietnam COD Guard stores only a SHA-256 payload hash for webhook deduplication and audit.',
      'Backups, if any, should expire according to the hosting provider backup policy and must not be used to restore redacted personal data except when required for security or disaster recovery.',
    ],
  }),
};
