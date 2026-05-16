import React, { useState, useEffect } from 'react';
import { Alert, View, StyleSheet, TextInput } from 'react-native';
import { Button, Modal, Portal, Text, useTheme } from 'react-native-paper';
import { Dropdown } from 'react-native-paper-dropdown';

const EXTEND_DURATION_OPTIONS = Array.from({ length: 30 }, (_, i) => ({
  label: `${i + 1} Day${i === 0 ? '' : 's'}`,
  value: String(i + 1),
}));

export type LastManStandingModalProps = {
  visible: boolean;
  onDismiss: () => void;
  winnerName: string;
  specId: string;
  onMatchAndDate: () => void;
  /** Called with the comment to send to the eliminated user and paid reopen duration. */
  onExtendSearch: (comment: string, durationDays: number) => void;
  availableCredits?: number;
  matchLoading?: boolean;
  extendLoading?: boolean;
};

export function LastManStandingModal({
  visible,
  onDismiss,
  winnerName,
  specId,
  onMatchAndDate,
  onExtendSearch,
  availableCredits = 0,
  matchLoading = false,
  extendLoading = false,
}: LastManStandingModalProps) {
  const theme = useTheme();
  const [showCommentStep, setShowCommentStep] = useState(false);
  const [comment, setComment] = useState('');
  const [durationDays, setDurationDays] = useState('30');

  useEffect(() => {
    if (!visible) {
      setShowCommentStep(false);
      setComment('');
      setDurationDays('30');
    }
  }, [visible]);

  const handleExtendSubmit = () => {
    if (availableCredits < 1) {
      Alert.alert(
        'Insufficient credits',
        'Extending this quest costs 1 credit, just like creating a new spec. Buy more credits before extending your search.'
      );
      return;
    }

    Alert.alert(
      'Extend this quest?',
      `Extending will charge 1 credit, remove the last person standing, and reopen this spec for ${durationDays} day${durationDays === '1' ? '' : 's'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Use 1 credit', onPress: () => onExtendSearch(comment.trim(), parseInt(durationDays, 10)) },
      ]
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
      >
        {!showCommentStep ? (
          <>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              It's a match!
            </Text>
            <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
              {winnerName} is the last one standing — the winner of the quest.
            </Text>
            <Text style={[styles.prompt, { color: theme.colors.onSurface }]}>
              Do you want to match and make this a date, or extend your search for 1 credit?
            </Text>

            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={onMatchAndDate}
                disabled={matchLoading || extendLoading}
                loading={matchLoading}
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
              >
                {matchLoading ? '' : 'Match and make this a date'}
              </Button>
              <Button
                mode="outlined"
                onPress={() => setShowCommentStep(true)}
                disabled={matchLoading || extendLoading}
                loading={extendLoading}
                style={[styles.button, { borderColor: theme.colors.outline }]}
              >
                {extendLoading ? '' : 'Extend your search'}
              </Button>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              Add a message
            </Text>
            <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
              Your message will be sent to the eliminated user so they know why you're extending the search.
            </Text>
            <Text style={[styles.costText, { color: theme.colors.error }]}>
              Extending costs 1 credit. Your balance: {availableCredits}
            </Text>
            <View style={styles.dropdownWrap}>
              <Dropdown
                label="Reopen For"
                mode="outlined"
                options={EXTEND_DURATION_OPTIONS}
                value={durationDays}
                onSelect={(value) => setDurationDays(value || '30')}
              />
            </View>
            <TextInput
              placeholder="e.g. I'd like to see more options before deciding"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              style={[
                styles.input,
                {
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outline,
                  backgroundColor: (theme.colors as any).surfaceContainerHighest ?? theme.colors.surfaceVariant,
                },
              ]}
            />
            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={handleExtendSubmit}
                disabled={extendLoading}
                loading={extendLoading}
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
              >
                {extendLoading ? '' : 'Send and extend search'}
              </Button>
              <Button
                mode="text"
                onPress={() => setShowCommentStep(false)}
                disabled={extendLoading}
              >
                Back
              </Button>
            </View>
          </>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 24,
    padding: 24,
    borderRadius: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  prompt: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  costText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
  button: {
    marginVertical: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 88,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  dropdownWrap: {
    marginBottom: 14,
  },
});
