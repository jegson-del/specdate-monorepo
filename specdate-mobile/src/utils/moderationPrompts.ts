import { Alert } from 'react-native';
import { ModerationService, type ReportTargetType } from '../services/moderation';

const REASONS = [
  'Harassment or abuse',
  'Nudity or sexual content',
  'Hate or violence',
  'Scam or spam',
  'Other',
];

export function promptReportContent(input: {
  targetType: ReportTargetType;
  targetId: number;
  label?: string;
  onReported?: () => void;
}) {
  Alert.alert(
    input.label ? `Report ${input.label}?` : 'Report content?',
    'Choose the reason. Our moderation team will review it.',
    [
      ...REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await ModerationService.reportContent({
              target_type: input.targetType,
              target_id: input.targetId,
              reason,
            });
            input.onReported?.();
            Alert.alert('Report submitted', 'Thanks. Our moderation team will review this.');
          } catch (e: any) {
            Alert.alert('Report failed', e?.response?.data?.message || e?.message || 'Could not submit report.');
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ],
  );
}

export function promptBlockUser(input: {
  userId: number;
  name?: string;
  onBlocked?: () => void;
}) {
  Alert.alert(
    `Block ${input.name || 'user'}?`,
    'They will not be able to message you or view your profile. You will not see their profile either.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await ModerationService.blockUser(input.userId);
            input.onBlocked?.();
            Alert.alert('User blocked', 'This user has been blocked.');
          } catch (e: any) {
            Alert.alert('Block failed', e?.response?.data?.message || e?.message || 'Could not block this user.');
          }
        },
      },
    ],
  );
}
