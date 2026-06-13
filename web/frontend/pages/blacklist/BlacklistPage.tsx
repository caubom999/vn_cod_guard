import {
  BlockStack,
  Button,
  Card,
  FormLayout,
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
  EmptyText,
  ErrorBanner,
  Td,
  Th,
  formatDateTime,
  tableStyle,
  tableWrapStyle,
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
              onDelete={(id) => deleteEntry.mutate(id)}
            />
          )}
        </BlockStack>
      </Card>
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
  if (entries.length === 0) {
    return <EmptyText text="No blacklist entries yet." />;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Type</Th>
            <Th>Value</Th>
            <Th>Reason</Th>
            <Th>Hits</Th>
            <Th>Last seen</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <Td>{entry.type}</Td>
              <Td>{entry.value}</Td>
              <Td>{entry.reason || '-'}</Td>
              <Td>{entry.hitCount}</Td>
              <Td>{formatDateTime(entry.lastSeenAt)}</Td>
              <Td>
                <Button
                  tone="critical"
                  size="slim"
                  disabled={deleting}
                  onClick={() => onDelete(entry.id)}
                >
                  Delete
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BlacklistPage() {
  return <BlacklistScreen />;
}

