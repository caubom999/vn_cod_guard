export const SMS_TEMPLATE_VARIABLES = [
  'shopName',
  'customerName',
  'orderName',
  'amount',
  'currency',
  'expiresAt',
] as const;

const ALLOWED_VARIABLES = new Set<string>(SMS_TEMPLATE_VARIABLES);
const MUSTACHE_VARIABLE = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export function getSmsTemplateValidationError(body: string) {
  const value = body.trim();

  if (!value) {
    return 'SMS template body is required';
  }

  if (/\$\{[^}]+}/.test(value)) {
    return 'Use {{variable}} placeholders; ${data.variable} is not supported';
  }

  if (/https?:\/\//i.test(value)) {
    return 'Do not include a URL in the SMS template; COD Guard appends the verification URL automatically';
  }

  for (const match of value.matchAll(MUSTACHE_VARIABLE)) {
    if (!ALLOWED_VARIABLES.has(match[1])) {
      return `Unsupported SMS template variable: {{${match[1]}}}`;
    }
  }

  const withoutVariables = value.replace(MUSTACHE_VARIABLE, '');
  if (withoutVariables.includes('{{') || withoutVariables.includes('}}')) {
    return 'SMS template contains a malformed {{variable}} placeholder';
  }

  return null;
}

export function isTemporaryVerificationUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    return (
      url.protocol !== 'https:' ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.trycloudflare.com')
    );
  } catch {
    return true;
  }
}
