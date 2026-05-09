import React from 'react';
import { Animated, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const REPORT_REASONS = [
  'Harassment or abuse',
  'Nudity or sexual content',
  'Hate or violence',
  'Scam or spam',
  'Other',
];

type SafetyMode = 'actions' | 'message_actions' | 'report' | 'block' | 'success';

type Props = {
  visible: boolean;
  mode: SafetyMode;
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  onDismiss: () => void;
  onOpenReport?: () => void;
  onOpenBlock?: () => void;
  userReportLabel?: string;
  userReportHelper?: string;
  userBlockLabel?: string;
  userBlockHelper?: string;
  blockConfirmLabel?: string;
  onReportMessage?: () => void;
  onReportMedia?: () => void;
  hasMedia?: boolean;
  primaryReportLabel?: string;
  primaryReportHelper?: string;
  mediaReportLabel?: string;
  mediaReportHelper?: string;
  onSubmitReport?: (reason: string) => void;
  onConfirmBlock?: () => void;
};

export default function ChatSafetySheet({
  visible,
  mode,
  title,
  subtitle,
  loading,
  error,
  onDismiss,
  onOpenReport,
  onOpenBlock,
  userReportLabel,
  userReportHelper,
  userBlockLabel,
  userBlockHelper,
  blockConfirmLabel,
  onReportMessage,
  onReportMedia,
  hasMedia,
  primaryReportLabel,
  primaryReportHelper,
  mediaReportLabel,
  mediaReportHelper,
  onSubmitReport,
  onConfirmBlock,
}: Props) {
  const theme = useTheme();
  const translateY = React.useRef(new Animated.Value(360)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 180 : 130,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: visible ? 0 : 360,
        damping: 24,
        stiffness: 250,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible]);

  const option = (
    icon: keyof typeof MaterialCommunityIcons.glyphMap,
    label: string,
    helper: string,
    onPress?: () => void,
    destructive = false,
  ) => (
    <TouchableOpacity
      key={label}
      activeOpacity={0.78}
      disabled={loading}
      style={[styles.option, { backgroundColor: theme.colors.surfaceVariant }]}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: destructive ? theme.colors.errorContainer : theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={destructive ? theme.colors.error : theme.colors.primary}
        />
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, { color: destructive ? theme.colors.error : theme.colors.onSurface }]}>{label}</Text>
        <Text style={[styles.optionHelper, { color: theme.colors.onSurfaceVariant }]}>{helper}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.outlineVariant }]} />

          {mode === 'success' ? (
            <View style={styles.successWrap}>
              <View style={[styles.successIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="check" size={28} color={theme.colors.primary} />
              </View>
              <Text style={[styles.title, styles.centerText, { color: theme.colors.onSurface }]}>{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, styles.centerText, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text> : null}
              <Button mode="contained" onPress={onDismiss} style={styles.doneButton}>
                Done
              </Button>
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text> : null}
              {error ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}

              {mode === 'actions' ? (
                <View style={styles.options}>
                  {option(
                    'flag-outline',
                    userReportLabel ?? 'Report user',
                    userReportHelper ?? 'Send this profile to moderation for review',
                    onOpenReport
                  )}
                  {option(
                    'block-helper',
                    userBlockLabel ?? 'Block user',
                    userBlockHelper ?? 'Stop messages and hide each other from discovery',
                    onOpenBlock,
                    true
                  )}
                </View>
              ) : mode === 'message_actions' ? (
                <View style={styles.options}>
                  {option(
                    'message-alert-outline',
                    primaryReportLabel ?? 'Report message',
                    primaryReportHelper ?? 'Send the message text and context for review',
                    onReportMessage
                  )}
                  {hasMedia ? option(
                    'file-image-outline',
                    mediaReportLabel ?? 'Report media',
                    mediaReportHelper ?? 'Send the shared image, video, or voice note for review',
                    onReportMedia
                  ) : null}
                </View>
              ) : mode === 'report' ? (
                <View style={styles.options}>
                  {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      activeOpacity={0.78}
                      disabled={loading}
                      style={[styles.reason, { backgroundColor: theme.colors.surfaceVariant }]}
                      onPress={() => onSubmitReport?.(reason)}
                    >
                      <Text style={[styles.reasonText, { color: theme.colors.onSurface }]}>{reason}</Text>
                      <MaterialCommunityIcons name="flag-outline" size={18} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.blockActions}>
                  <Button mode="outlined" onPress={onDismiss} disabled={loading} style={styles.actionButton}>
                    Cancel
                  </Button>
                  <Button mode="contained" onPress={onConfirmBlock} loading={loading} disabled={loading} style={styles.actionButton} buttonColor={theme.colors.error}>
                    {blockConfirmLabel ?? 'Block'}
                  </Button>
                </View>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(15,23,42,0.42)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 5,
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  error: {
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  options: {
    gap: 10,
  },
  option: {
    minHeight: 66,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
  optionHelper: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  reason: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  blockActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  successWrap: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  successIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  centerText: {
    textAlign: 'center',
  },
  doneButton: {
    marginTop: 16,
    minWidth: 150,
    borderRadius: 12,
  },
});
