import React from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SUPPORT_CATEGORIES, SupportService, type SupportCategory } from '../../services/support';
import { EmojiPickerButton } from '../../components';
import { insertEmojiAtSelection, type TextSelection } from '../../utils/emojiText';

export default function CreateSupportTicketScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [category, setCategory] = React.useState<SupportCategory>('safety');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [messageSelection, setMessageSelection] = React.useState<TextSelection>({ start: 0, end: 0 });

  const createMutation = useMutation({
    mutationFn: () => SupportService.createTicket({ category, subject, message }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      navigation.replace('SupportThread', { ticketId: res.data.id });
    },
    onError: (e: any) => {
      Alert.alert('Support request failed', e?.response?.data?.message || e?.message || 'Please try again.');
    },
  });

  const canSubmit = subject.trim().length >= 3 && message.trim().length >= 10 && !createMutation.isPending;
  const handleMessageEmoji = (emoji: string) => {
    const next = insertEmojiAtSelection(message, emoji, messageSelection);
    setMessage(next.value);
    setMessageSelection(next.selection);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>New Support Request</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Topic</Text>
        <View style={styles.categories}>
          {SUPPORT_CATEGORIES.map((item) => {
            const selected = item.value === category;
            return (
              <TouchableOpacity
                key={item.value}
                activeOpacity={0.78}
                onPress={() => setCategory(item.value)}
                style={[
                  styles.category,
                  {
                    backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                  },
                ]}
              >
                <View style={styles.categoryText}>
                  <Text style={[styles.categoryLabel, { color: theme.colors.onSurface }]}>{item.label}</Text>
                  <Text style={[styles.categoryHelper, { color: theme.colors.onSurfaceVariant }]}>{item.helper}</Text>
                </View>
                {selected ? <MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.primary} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          mode="outlined"
          label="Subject"
          value={subject}
          onChangeText={setSubject}
          maxLength={160}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="How can we help?"
          value={message}
          onChangeText={setMessage}
          selection={messageSelection}
          onSelectionChange={(event) => setMessageSelection(event.nativeEvent.selection)}
          multiline
          numberOfLines={7}
          maxLength={4000}
          style={styles.messageInput}
        />
        <View style={styles.inlineActions}>
          <EmojiPickerButton onEmojiSelected={handleMessageEmoji} disabled={createMutation.isPending} />
        </View>
        <Button
          mode="contained"
          onPress={() => createMutation.mutate()}
          disabled={!canSubmit}
          loading={createMutation.isPending}
          style={styles.submitButton}
          contentStyle={{ height: 50 }}
        >
          Send to support
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categories: {
    gap: 9,
  },
  category: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryText: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '900',
  },
  categoryHelper: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'transparent',
  },
  messageInput: {
    minHeight: 150,
    backgroundColor: 'transparent',
  },
  inlineActions: {
    flexDirection: 'row',
  },
  submitButton: {
    borderRadius: 12,
    marginTop: 4,
  },
});
