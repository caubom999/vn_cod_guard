export function normalizeVietnamPhone(phone?: string | null) {
  if (!phone) {
    return null;
  }

  let digits = phone.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    digits = `+${digits.slice(1).replace(/\D/g, '')}`;
  } else {
    digits = digits.replace(/\D/g, '');
  }

  if (digits.startsWith('0084')) {
    digits = `+84${digits.slice(4)}`;
  }

  if (digits.startsWith('84')) {
    digits = `+${digits}`;
  }

  if (digits.startsWith('0')) {
    digits = `+84${digits.slice(1)}`;
  }

  if (/^\d{9,10}$/.test(digits)) {
    digits = `+84${digits}`;
  }

  return /^\+84\d{9,10}$/.test(digits) ? digits : null;
}
