import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    flatBlock: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    flatTextArea: {
        minHeight: 120,
        textAlignVertical: 'top',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 16,
    },
    primaryButton: {
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    answerSubmitted: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    answerSubmittedText: { fontSize: 16, lineHeight: 24, fontStyle: 'italic' },
    answerSubmittedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    answerSubmittedBadgeText: { color: '#16a34a', fontWeight: '700', fontSize: 14 },
    mediaPreviewBox: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
        gap: 6,
    },
    questionMediaImage: {
        width: 120,
        height: 120,
        borderRadius: 8,
    },
});
