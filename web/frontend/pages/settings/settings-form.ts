import type { CodSettings, UpdateCodSettings } from '../../hook/cod-settings';

export const emptySettingsForm: UpdateCodSettings = {
  enabled: true,
  defaultChannel: 'EMAIL',
  confirmationDeadlineMinutes: 1440,
  reminderDelayMinutes: 180,
  maxReminders: 2,
  autoCancelUnconfirmed: false,
  pendingTag: 'cod_pending',
  confirmedTag: 'cod_confirmed',
  cancelledTag: 'cod_cancelled',
  expiredTag: 'cod_no_response',
  riskTag: 'cod_risky',
  codPaymentNames: [],
};

export type SettingsValidation = {
  isValid: boolean;
  summary?: string;
  errors: Partial<Record<keyof UpdateCodSettings, string>>;
};

export function toSettingsForm(settings: CodSettings): UpdateCodSettings {
  return {
    enabled: settings.enabled,
    defaultChannel: settings.defaultChannel,
    confirmationDeadlineMinutes: settings.confirmationDeadlineMinutes,
    reminderDelayMinutes: settings.reminderDelayMinutes,
    maxReminders: settings.maxReminders,
    autoCancelUnconfirmed: settings.autoCancelUnconfirmed,
    pendingTag: settings.pendingTag,
    confirmedTag: settings.confirmedTag,
    cancelledTag: settings.cancelledTag,
    expiredTag: settings.expiredTag,
    riskTag: settings.riskTag,
    codPaymentNames: settings.codPaymentNames,
  };
}

export function toSettingsPatch(
  form: UpdateCodSettings,
  settings: CodSettings,
): Partial<UpdateCodSettings> {
  const baseline = toSettingsForm(settings);
  const keys = Object.keys(baseline) as Array<keyof UpdateCodSettings>;

  return Object.fromEntries(
    keys
      .filter(
        (key) => JSON.stringify(form[key]) !== JSON.stringify(baseline[key]),
      )
      .map((key) => [key, form[key]]),
  ) as Partial<UpdateCodSettings>;
}

export function validateSettingsForm(
  form: UpdateCodSettings,
): SettingsValidation {
  const errors: SettingsValidation['errors'] = {};

  if (!form.codPaymentNames[0]?.trim()) {
    errors.codPaymentNames = 'Select a COD payment method.';
  }

  validateIntegerRange(
    form.confirmationDeadlineMinutes,
    1,
    10080,
    'Confirmation deadline must be between 1 and 10080 minutes.',
    (message) => {
      errors.confirmationDeadlineMinutes = message;
    },
  );
  validateIntegerRange(
    form.reminderDelayMinutes,
    1,
    10080,
    'Reminder delay must be between 1 and 10080 minutes.',
    (message) => {
      errors.reminderDelayMinutes = message;
    },
  );
  validateIntegerRange(
    form.maxReminders,
    0,
    10,
    'Max reminders must be between 0 and 10.',
    (message) => {
      errors.maxReminders = message;
    },
  );

  if (
    !errors.confirmationDeadlineMinutes &&
    !errors.reminderDelayMinutes &&
    form.maxReminders > 0 &&
    form.reminderDelayMinutes >= form.confirmationDeadlineMinutes
  ) {
    errors.reminderDelayMinutes =
      'Reminder delay must be lower than the confirmation deadline when reminders are enabled.';
  }

  for (const key of [
    'pendingTag',
    'confirmedTag',
    'cancelledTag',
    'expiredTag',
    'riskTag',
  ] as const) {
    const value = form[key].trim();

    if (!value) {
      errors[key] = 'Tag is required.';
    } else if (value.length > 64) {
      errors[key] = 'Tag must be 64 characters or fewer.';
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    summary: isValid
      ? undefined
      : 'Please fix the highlighted settings before saving.',
    errors,
  };
}

function validateIntegerRange(
  value: number,
  min: number,
  max: number,
  message: string,
  setError: (message: string) => void,
) {
  if (!Number.isInteger(value) || value < min || value > max) {
    setError(message);
  }
}
