import { appConfirm } from '../components/AppDialogProvider';

const ALERT_TITLE = 'Share this media?';

const ALERT_MESSAGE =
    'We scan every photo, video, and voice note you share using automated safety checks (including AI). ' +
    'Your content must follow our media and community rules. Do not share anything that is illegal, sexually explicit, violent, hateful, or otherwise prohibited. ' +
    'Tap Share only if your file complies with these rules.';

/**
 * Required confirmation before uploading or sending any shared media (chat, rounds, profile, provider gallery).
 * Resolves true only if the user taps **Share**; Cancel / dismiss resolves false.
 */
export function confirmMediaShareWithAiScan(): Promise<boolean> {
    return appConfirm({
        title: ALERT_TITLE,
        message: ALERT_MESSAGE,
        cancelText: 'Cancel',
        confirmText: 'Share',
        type: 'warning',
        cancelable: true,
    });
}
