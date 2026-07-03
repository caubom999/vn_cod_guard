import {
  BlockStack,
  Button,
  Card,
  EmptySearchResult,
  FormLayout,
  IndexTable,
  InlineStack,
  Modal,
  Select,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import { useState } from 'react';
import {
  type BlacklistEntry,
  useBlacklist,
  useCreateBlacklistEntry,
  useDeleteBlacklistEntry,
} from '../../hook/cod-dashboard';
import {
  ErrorBanner,
  formatDateTime,
} from '../../components/dashboard/shared';

const blacklistTypeOptions = [
  { label: 'Phone', value: 'PHONE' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'Address', value: 'ADDRESS' },
];

function BlacklistScreen() {
  const { data, isLoading, error } = useBlacklist();
  const createEntry = useCreateBlacklistEntry();
  const deleteEntry = useDeleteBlacklistEntry();
  const [type, setType] = useState<BlacklistEntry['type']>('PHONE');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [deleteEntryId, setDeleteEntryId] = useState<number | null>(null);
  const entryToDelete = data?.find((entry) => entry.id === deleteEntryId);

  const canAdd = value.trim().length > 0 && !createEntry.isPending;

  const handleAdd = () => {
    if (!canAdd) {
      return;
    }

    createEntry.mutate(
      { type, value: value.trim(), reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setValue('');
          setReason('');
        },
      },
    );
  };

  if (error) {
    return <ErrorBanner error={error} />;
  }

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Add blacklist entry
          </Text>
          <FormLayout>
            <FormLayout.Group>
              <Select
                label="Type"
                options={blacklistTypeOptions}
                value={type}
                onChange={(nextType) =>
                  setType(nextType as BlacklistEntry['type'])
                }
              />
              <TextField
                label="Value"
                value={value}
                onChange={setValue}
                autoComplete="off"
                placeholder="Phone, email, or address"
              />
            </FormLayout.Group>
            <TextField
              label="Reason"
              value={reason}
              onChange={setReason}
              autoComplete="off"
            />
            {createEntry.error ? (
              <ErrorBanner error={createEntry.error} />
            ) : null}
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={!canAdd}
              loading={createEntry.isPending}
            >
              Add entry
            </Button>
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Blacklist
          </Text>
          {isLoading ? (
            <SkeletonBodyText lines={8} />
          ) : (
            <BlacklistTable
              entries={data || []}
              deleting={deleteEntry.isPending}
              onDelete={setDeleteEntryId}
            />
          )}
        </BlockStack>
      </Card>

      <Modal
        open={deleteEntryId !== null}
        onClose={() => setDeleteEntryId(null)}
        title="Delete blacklist entry?"
        primaryAction={{
          content: 'Delete entry',
          destructive: true,
          loading: deleteEntry.isPending,
          onAction: () => {
            if (deleteEntryId !== null) {
              deleteEntry.mutate(deleteEntryId, {
                onSuccess: () => setDeleteEntryId(null),
              });
            }
          },
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            disabled: deleteEntry.isPending,
            onAction: () => setDeleteEntryId(null),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              {entryToDelete
                ? `${formatEntryType(entryToDelete.type)}: ${entryToDelete.value}`
                : 'This blacklist entry'}
            </Text>
            <Text as="p" tone="subdued">
              Future orders will no longer be matched against this entry.
              Existing order risk scores will not change.
            </Text>
            {deleteEntry.error ? (
              <ErrorBanner error={deleteEntry.error} />
            ) : null}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}

function BlacklistTable({
  entries,
  deleting,
  onDelete,
}: {
  entries: BlacklistEntry[];
  deleting: boolean;
  onDelete: (id: number) => void;
}) {
  return (
    <IndexTable
      resourceName={{ singular: 'blacklist entry', plural: 'blacklist entries' }}
      itemCount={entries.length}
      selectable={false}
      hasZebraStriping
      lastColumnSticky
      headings={[
        { title: 'Type' },
        { title: 'Value' },
        { title: 'Reason' },
        { title: 'Hits', alignment: 'end' },
        { title: 'Last seen' },
        { title: 'Actions', alignment: 'end' },
      ]}
      emptyState={
        <EmptySearchResult
          title="No blacklist entries"
          description="Add a phone number, email, or address to start monitoring risky COD orders."
          withIllustration
        />
      }
    >
      {entries.map((entry, index) => (
        <IndexTable.Row
          id={String(entry.id)}
          key={entry.id}
          position={index}
        >
          <IndexTable.Cell>{formatEntryType(entry.type)}</IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" fontWeight="semibold">
              {entry.value}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{entry.reason || '-'}</IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" alignment="end" numeric>
              {entry.hitCount}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{formatDateTime(entry.lastSeenAt)}</IndexTable.Cell>
          <IndexTable.Cell>
            <InlineStack align="end">
                <Button
                  tone="critical"
                  size="slim"
                  disabled={deleting}
                  onClick={() => onDelete(entry.id)}
                >
                  Delete
                </Button>
            </InlineStack>
          </IndexTable.Cell>
        </IndexTable.Row>
      ))}
    </IndexTable>
  );
}

function formatEntryType(type: BlacklistEntry['type']) {
  const labels = {
    PHONE: 'Phone',
    EMAIL: 'Email',
    ADDRESS: 'Address',
  };

  return labels[type];
}

export default function BlacklistPage() {
  return <BlacklistScreen />;
}
