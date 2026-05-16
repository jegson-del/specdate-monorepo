import { useMemo } from 'react';
import { cmToFeetInches, safeParseMaybeJson, toNumber } from '../specDetailsUtils';
import { isClosedSpecStatus, normalizeSpecStatus, specStatusTone } from '../specStatus';

type UseSpecDetailsStateParams = {
    spec: any;
    user: any;
};

function formatExpires(expiresAt?: string) {
    if (!expiresAt) return '-';
    const end = new Date(expiresAt);
    if (Number.isNaN(end.getTime())) return '-';
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Ending soon';
    return `Ends in ${diffDays}d`;
}

function titleCase(s: string) {
    return s
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useSpecDetailsState({ spec, user }: UseSpecDetailsStateParams) {
    const isOwner = useMemo(() => {
        if (!spec || !user) return false;
        // Loose comparison in case of string/number mismatch
        return String((spec as any).user_id) === String(user.id);
    }, [spec, user]);

    const participants = useMemo(() => {
        if (!spec?.applications) return [];
        return spec.applications.filter((a: any) => a.user_role === 'participant');
    }, [spec]);

    const acceptedParticipantCount = useMemo(
        () => participants.filter((p: any) => p.status === 'ACCEPTED').length,
        [participants]
    );

    const isFirstRound = useMemo(() => !spec?.rounds || spec.rounds.length === 0, [spec?.rounds]);

    const myApplication = useMemo(() => {
        if (!spec?.applications || !user) return null;
        return spec.applications.find((a: any) => a.user_id === user.id);
    }, [spec, user]);

    const canOpenRoundDetails = useMemo(() => {
        const status = String(myApplication?.status ?? '').toUpperCase();
        return isOwner || status === 'ACCEPTED' || status === 'ELIMINATED';
    }, [isOwner, myApplication?.status]);

    const requirements = useMemo(() => {
        if (!spec?.requirements) return [];
        const raw = (spec.requirements ?? []).map((r: any) => {
            const field = String(r.field ?? '');
            const operator = String(r.operator ?? '');
            const rawValue = safeParseMaybeJson(r.value);
            const valueParts = Array.isArray(rawValue)
                ? rawValue.map((v) => String(v)).filter((v) => v.trim().length > 0)
                : [String(rawValue ?? '')].filter((v) => v.trim().length > 0);

            const valueText = valueParts.length > 1 ? valueParts.join(', ') : (valueParts[0] || '-');

            return {
                _id: r.id ?? `${field}-${operator}-${valueText}`,
                field,
                operator,
                valueParts,
                valueText,
                isCompulsory: r.is_compulsory === true,
            };
        });

        const out: any[] = [];

        const ageReqs = raw.filter((r: any) => r.field === 'age');
        if (ageReqs.length) {
            const min = ageReqs.find((r: any) => r.operator === '>=');
            const max = ageReqs.find((r: any) => r.operator === '<=');
            const minN = toNumber(min?.valueParts?.[0]);
            const maxN = toNumber(max?.valueParts?.[0]);

            let ageText = '-';
            if (minN !== null && maxN !== null) ageText = `${minN} - ${maxN}`;
            else if (minN !== null) ageText = `${minN}+`;
            else if (maxN !== null) ageText = `Up to ${maxN}`;

            out.push({
                id: `age-range-${minN ?? 'x'}-${maxN ?? 'y'}`,
                field: 'age',
                fieldLabel: 'Age',
                kind: 'text',
                valueText: ageText,
                isLong: false,
                isCompulsory: ageReqs.some((r: any) => r.isCompulsory),
            });
        }

        const heightReq = raw.find((r: any) => r.field === 'height' && (r.operator === '>=' || r.operator === '<=' || r.operator === '='));
        if (heightReq) {
            const cm = toNumber(heightReq.valueParts?.[0]);
            let heightText = heightReq.valueText || '-';
            if (cm !== null) {
                const { feetAdjusted, inches } = cmToFeetInches(cm);
                if (heightReq.operator === '>=') heightText = `${cm} cm (${feetAdjusted}'${inches}")+`;
                else if (heightReq.operator === '<=') heightText = `Up to ${cm} cm (${feetAdjusted}'${inches}")`;
                else heightText = `${cm} cm (${feetAdjusted}'${inches}")`;
            }
            out.push({
                id: `height-${heightReq.operator}-${heightReq.valueText}`,
                field: 'height',
                fieldLabel: 'Height',
                kind: 'text',
                valueText: heightText,
                isLong: false,
                isCompulsory: heightReq.isCompulsory,
            });
        }

        raw.forEach((r: any) => {
            if (r.field === 'age') return;
            if (r.field === 'height') return;

            if (r.field === 'is_smoker' && r.operator === '=') {
                const v = String(r.valueParts?.[0] ?? r.valueText);
                const label = v === '1' ? 'Smoker' : v === '0' ? 'Non-smoker' : r.valueText;
                out.push({
                    id: r._id,
                    field: r.field,
                    fieldLabel: 'Smoker',
                    kind: 'text',
                    valueText: label,
                    isLong: false,
                    isCompulsory: r.isCompulsory,
                });
                return;
            }

            const isLong =
                r.operator === 'in' ||
                r.valueParts.length > 2 ||
                r.valueText.length > 22 ||
                r.field === 'occupation' ||
                r.field === 'qualification';

            if (r.operator === 'in' && r.valueParts.length > 1) {
                out.push({
                    id: r._id,
                    field: r.field,
                    fieldLabel: titleCase(r.field || 'Requirement'),
                    kind: 'chips',
                    valueParts: r.valueParts,
                    valueText: r.valueText,
                    isLong: true,
                    isCompulsory: r.isCompulsory,
                });
                return;
            }

            const opText =
                r.operator === '>=' ? 'At least' :
                    r.operator === '<=' ? 'Up to' :
                        r.operator === '=' ? 'Is' :
                            r.operator;

            out.push({
                id: r._id,
                field: r.field,
                fieldLabel: titleCase(r.field || 'Requirement'),
                kind: 'text',
                valueText: `${opText} ${r.valueText}`,
                isLong,
                isCompulsory: r.isCompulsory,
            });
        });

        return out;
    }, [spec?.requirements]);

    const expiresText = formatExpires(spec?.expires_at);
    const headerLine = [
        spec?.location_city ? titleCase(spec.location_city) : null,
        expiresText !== '-' ? expiresText : null,
    ]
        .filter(Boolean)
        .join(' - ');

    const ownerName = spec?.owner?.profile?.full_name || spec?.owner?.name || 'Unknown';
    const ownerAvatar =
        spec?.owner?.profile?.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&size=512&background=111827&color=ffffff`;
    const specStatus = normalizeSpecStatus(spec?.status);
    const specTone = specStatusTone(spec?.status);
    const isSpecClosed = isClosedSpecStatus(spec?.status);

    return {
        acceptedParticipantCount,
        canOpenRoundDetails,
        headerLine,
        isFirstRound,
        isOwner,
        isSpecClosed,
        myApplication,
        ownerAvatar,
        ownerName,
        participants,
        requirements,
        specStatus,
        specTone,
    };
}
