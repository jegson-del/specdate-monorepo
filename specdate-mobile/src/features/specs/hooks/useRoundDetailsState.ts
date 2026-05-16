import { useMemo, type MutableRefObject } from 'react';
import { isClosedSpecStatus } from '../specStatus';

type UseRoundDetailsStateParams = {
    lastRoundRef: MutableRefObject<any>;
    roundId?: string | number;
    spec: any;
    user: any;
};

export function useRoundDetailsState({ lastRoundRef, roundId, spec, user }: UseRoundDetailsStateParams) {
    const roundFromSpec = useMemo(() => {
        if (!spec?.rounds || roundId == null) return null;
        const found = spec.rounds.find((round: any) => String(round.id) === String(roundId));
        if (found) lastRoundRef.current = found;
        return found;
    }, [lastRoundRef, roundId, spec]);

    const roundToShow =
        roundFromSpec ??
        (lastRoundRef.current && String(lastRoundRef.current.id) === String(roundId) ? lastRoundRef.current : null);

    const isOwner = useMemo(() => {
        if (spec?.user_id == null || user?.id == null) return false;
        return String(spec.user_id) === String(user.id);
    }, [spec, user]);

    const myApplication = useMemo(() => {
        if (!spec?.applications || !user) return null;
        return spec.applications.find((application: any) => application.user_id === user.id);
    }, [spec, user]);

    const canViewRoundDetails = useMemo(() => {
        const status = String(myApplication?.status ?? '').toUpperCase();
        return isOwner || status === 'ACCEPTED' || status === 'ELIMINATED';
    }, [isOwner, myApplication?.status]);

    const specIsClosed = isClosedSpecStatus(spec?.status);

    const activeParticipants = useMemo(() => {
        if (!spec?.applications) return [];
        const ownerId = spec.user_id != null ? String(spec.user_id) : null;
        return spec.applications.filter(
            (application: any) =>
                application.user_role === 'participant' &&
                application.status === 'ACCEPTED' &&
                (!ownerId || String(application.user_id) !== ownerId)
        );
    }, [spec]);

    const unresponsiveParticipants = useMemo(() => {
        if (!roundToShow || roundToShow.status !== 'ACTIVE') return [];
        const answeredIds = new Set((roundToShow.answers || []).map((answer: any) => answer.user_id));
        return activeParticipants.filter((application: any) => !answeredIds.has(application.user_id));
    }, [activeParticipants, roundToShow]);

    const myAnswer = roundToShow?.answers?.find((answer: any) => answer.user_id === user?.id);
    const answers = roundToShow?.answers || [];
    const roundDisplayStatus = specIsClosed ? 'COMPLETED' : String(roundToShow?.status || '');

    return {
        activeParticipants,
        answers,
        canViewRoundDetails,
        isOwner,
        myAnswer,
        myApplication,
        roundDisplayStatus,
        roundToShow,
        specIsClosed,
        unresponsiveParticipants,
    };
}
