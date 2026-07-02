import { SaveBar } from '@shopify/app-bridge-react';
import type { CodDeliveryRuleSaveBarProps } from '../../../types/cod-fee';

export function CodDeliveryRuleSaveBar({
  isDirty,
  isValid,
  isSaving,
  onSave,
  onDiscard,
}: CodDeliveryRuleSaveBarProps) {
  return (
    <SaveBar id="cod-delivery-rule-save-bar" open={isDirty}>
      <button
        variant="primary"
        disabled={!isValid || isSaving}
        loading={isSaving}
        onClick={onSave}
      >
        Save
      </button>
      <button disabled={isSaving} onClick={onDiscard}>
        Discard
      </button>
    </SaveBar>
  );
}
