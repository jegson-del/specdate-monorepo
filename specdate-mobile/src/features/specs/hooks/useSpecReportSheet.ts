import { useCallback, useState } from 'react';
import { ModerationService, type ReportTargetType } from '../../../services/moderation';

export type SpecReportSheetState =
    | null
    | { mode: 'message_actions'; answerId: number; mediaId?: number }
    | { mode: 'report'; targetType: ReportTargetType; targetId: number; label: string }
    | { mode: 'success'; title: string; subtitle: string };

export function useSpecReportSheet() {
    const [reportSheet, setReportSheet] = useState<SpecReportSheetState>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const closeReportSheet = useCallback(() => {
        setReportSheet(null);
        setReportError(null);
    }, []);

    const openReportSheet = useCallback((targetType: ReportTargetType, targetId: number, label: string) => {
        setReportError(null);
        setReportSheet({ mode: 'report', targetType, targetId, label });
    }, []);

    const openAnswerReportMenu = useCallback((answer: any) => {
        const mediaId = answer.media?.id ? Number(answer.media.id) : undefined;
        setReportError(null);
        setReportSheet({ mode: 'message_actions', answerId: Number(answer.id), mediaId });
    }, []);

    const submitReport = useCallback(async (reason: string) => {
        if (reportSheet?.mode !== 'report') return;
        setReportLoading(true);
        setReportError(null);
        try {
            await ModerationService.reportContent({
                target_type: reportSheet.targetType,
                target_id: reportSheet.targetId,
                reason,
            });
            setReportSheet({
                mode: 'success',
                title: 'Report submitted',
                subtitle: 'Thanks. Our moderation team will review this and take action where needed.',
            });
        } catch (e: any) {
            setReportError(e?.response?.data?.message || e?.message || 'Could not submit report.');
        } finally {
            setReportLoading(false);
        }
    }, [reportSheet]);

    return {
        closeReportSheet,
        openAnswerReportMenu,
        openReportSheet,
        reportError,
        reportLoading,
        reportSheet,
        submitReport,
    };
}
