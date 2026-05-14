import React, { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ModerationService, type ModerationStatusPayload } from '../../services/moderation';

const statusCopy: Record<string, { title: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; tone: string }> = {
  active: { title: 'Account active', icon: 'shield-check-outline', tone: '#16A34A' },
  warned: { title: 'Warning active', icon: 'shield-alert-outline', tone: '#F59E0B' },
  suspended: { title: 'Account suspended', icon: 'pause-octagon-outline', tone: '#DC2626' },
  permanently_banned: { title: 'Account banned', icon: 'block-helper', tone: '#991B1B' },
};

function actionLabel(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ModerationStatusScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedActionId, setSelectedActionId] = useState<number | null>(null);
  const [appealText, setAppealText] = useState('');
  const [appealError, setAppealError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['moderation-status'],
    queryFn: () => ModerationService.getModerationStatus(),
    staleTime: 30_000,
  });

  const data: ModerationStatusPayload | undefined = query.data?.data;
  const status = data?.user?.moderation_status ?? 'active';
  const statusMeta = statusCopy[status] ?? { title: actionLabel(String(status)), icon: 'shield-account-outline' as const, tone: theme.colors.primary };
  const activeAppealActionIds = useMemo(
    () => new Set((data?.active_appeals ?? []).map((appeal) => appeal.action_id).filter((id): id is number => typeof id === 'number')),
    [data?.active_appeals],
  );
  const appealableActions = useMemo(
    () => (data?.appealable_actions ?? []).filter((action) => !activeAppealActionIds.has(action.id)),
    [activeAppealActionIds, data?.appealable_actions],
  );
  const selectedAction = appealableActions.find((action) => action.id === selectedActionId) ?? appealableActions[0] ?? null;

  useEffect(() => {
    if (!selectedAction && appealableActions.length > 0) {
      setSelectedActionId(appealableActions[0].id);
      return;
    }
    if (selectedActionId != null && !appealableActions.some((action) => action.id === selectedActionId)) {
      setSelectedActionId(appealableActions[0]?.id ?? null);
    }
  }, [appealableActions, selectedAction, selectedActionId]);

  const appealMutation = useMutation({
    mutationFn: () => {
      if (!selectedAction) {
        throw new Error('Select a moderation decision to appeal.');
      }

      return ModerationService.submitModerationAppeal({
        action_id: selectedAction.id,
        appeal_text: appealText.trim(),
      });
    },
    onSuccess: async () => {
      setAppealText('');
      setAppealError(null);
      setSelectedActionId(null);
      await queryClient.invalidateQueries({ queryKey: ['moderation-status'] });
      Alert.alert('Appeal submitted', 'Your appeal has been sent for review.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.appeal_text?.[0] ||
        error?.message ||
        'We could not submit your appeal.';
      setAppealError(message);
      Alert.alert('Appeal not submitted', message);
    },
  });

  const submitAppeal = () => {
    const text = appealText.trim();
    if (!selectedAction) {
      setAppealError('Select a moderation decision to appeal.');
      return;
    }
    if (text.length < 10) {
      setAppealError('Appeal text must be at least 10 characters.');
      return;
    }

    setAppealError(null);
    appealMutation.mutate();
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} iconColor={theme.colors.onSurface} onPress={() => navigation.goBack()} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Account Status</Text>
        <IconButton icon="refresh" size={22} iconColor={theme.colors.onSurface} onPress={() => query.refetch()} />
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>Could not load account status.</Text>
          <Button mode="contained" onPress={() => query.refetch()}>Retry</Button>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}
          showsVerticalScrollIndicator={false}
        >
          <Surface style={[styles.hero, { borderColor: statusMeta.tone + '55', backgroundColor: theme.colors.surface }]} elevation={0}>
            <View style={[styles.heroIcon, { backgroundColor: statusMeta.tone + '18' }]}>
              <MaterialCommunityIcons name={statusMeta.icon} size={28} color={statusMeta.tone} />
            </View>
            <View style={styles.heroText}>
              <Text style={[styles.heroTitle, { color: theme.colors.onSurface }]}>{statusMeta.title}</Text>
              <Text style={[styles.heroBody, { color: theme.colors.onSurfaceVariant }]}>
                {data?.user.strike_count ? `${data.user.strike_count} active strike${data.user.strike_count === 1 ? '' : 's'}` : 'No active strikes'}
              </Text>
              {data?.user.suspended_until ? (
                <Text style={[styles.heroBody, { color: theme.colors.onSurfaceVariant }]}>Suspended until {new Date(data.user.suspended_until).toLocaleDateString()}</Text>
              ) : null}
            </View>
          </Surface>

          <AppealForm
            actions={appealableActions}
            selectedActionId={selectedAction?.id ?? null}
            appealText={appealText}
            appealError={appealError}
            submitting={appealMutation.isPending}
            theme={theme}
            onSelectAction={(actionId) => {
              setSelectedActionId(actionId);
              setAppealError(null);
            }}
            onChangeText={(text) => {
              setAppealText(text);
              if (appealError) setAppealError(null);
            }}
            onSubmit={submitAppeal}
          />

          <Section title="Active Appeals" empty="No active appeals." theme={theme}>
            {data?.active_appeals.map((appeal) => (
              <InfoRow
                key={appeal.id}
                icon="file-document-edit-outline"
                title={`Appeal #${appeal.id}`}
                body={actionLabel(appeal.status)}
                theme={theme}
              />
            ))}
          </Section>

          <Section title="Active Strikes" empty="No active strikes." theme={theme}>
            {data?.active_strikes.map((strike) => (
              <InfoRow
                key={strike.id}
                icon="alert-outline"
                title={`${actionLabel(strike.category)} - ${actionLabel(strike.severity)}`}
                body={strike.reason}
                theme={theme}
              />
            ))}
          </Section>

          <Section title="Appealable Actions" empty="No appealable actions." theme={theme}>
            {data?.appealable_actions.map((action) => (
              <InfoRow
                key={action.id}
                icon="gavel"
                title={actionLabel(action.action)}
                body={activeAppealActionIds.has(action.id) ? 'Appeal already open' : (action.reason || 'Moderation decision')}
                theme={theme}
              />
            ))}
          </Section>
        </ScrollView>
      )}
    </View>
  );
}

function AppealForm({
  actions,
  selectedActionId,
  appealText,
  appealError,
  submitting,
  theme,
  onSelectAction,
  onChangeText,
  onSubmit,
}: {
  actions: ModerationStatusPayload['appealable_actions'];
  selectedActionId: number | null;
  appealText: string;
  appealError: string | null;
  submitting: boolean;
  theme: any;
  onSelectAction: (actionId: number) => void;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Surface style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Submit Appeal</Text>
      {actions.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No decisions are currently available to appeal.</Text>
      ) : (
        <View style={styles.appealForm}>
          <View style={styles.actionOptions}>
            {actions.map((action) => {
              const selected = action.id === selectedActionId;
              return (
                <TouchableOpacity
                  key={action.id}
                  activeOpacity={0.82}
                  onPress={() => onSelectAction(action.id)}
                  style={[
                    styles.actionOption,
                    {
                      borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                      backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                  <View style={styles.actionOptionText}>
                    <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{actionLabel(action.action)}</Text>
                    <Text style={[styles.rowBody, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                      {action.reason || 'Moderation decision'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            mode="outlined"
            label="Appeal message"
            value={appealText}
            onChangeText={onChangeText}
            multiline
            numberOfLines={5}
            style={styles.appealInput}
            outlineColor={appealError ? theme.colors.error : theme.colors.outlineVariant}
            activeOutlineColor={appealError ? theme.colors.error : theme.colors.primary}
            error={Boolean(appealError)}
          />
          {appealError ? <Text style={[styles.formError, { color: theme.colors.error }]}>{appealError}</Text> : null}
          <Button mode="contained" icon="send" loading={submitting} disabled={submitting} onPress={onSubmit}>
            Submit Appeal
          </Button>
        </View>
      )}
    </Surface>
  );
}

function Section({ title, empty, children, theme }: { title: string; empty: string; children?: React.ReactNode[] | React.ReactNode; theme: any }) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <Surface style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      {hasChildren ? <View style={styles.sectionItems}>{children}</View> : <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>{empty}</Text>}
    </Surface>
  );
}

function InfoRow({ icon, title, body, theme }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; body: string; theme: any }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{title}</Text>
        <Text style={[styles.rowBody, { color: theme.colors.onSurfaceVariant }]} numberOfLines={3}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 6,
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '900' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  errorText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  content: { paddingHorizontal: 16, gap: 12 },
  hero: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '900' },
  heroBody: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  section: { borderRadius: 12, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '900', marginBottom: 10 },
  sectionItems: { gap: 10 },
  emptyText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  appealForm: { gap: 12 },
  actionOptions: { gap: 8 },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  actionOptionText: { flex: 1 },
  appealInput: {
    minHeight: 118,
  },
  formError: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '900' },
  rowBody: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: '600' },
});
