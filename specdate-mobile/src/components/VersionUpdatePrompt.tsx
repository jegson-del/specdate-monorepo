import React from 'react';
import { Linking } from 'react-native';
import { appAlert } from './AppDialogProvider';
import { AppVersionService, type AppVersionStatus } from '../services/appVersion';

function updateMessage(status: AppVersionStatus) {
  const lines = [
    status.message || 'A newer DateUsher app version is available.',
    `Latest version: ${status.latest_version}`,
  ];

  if (status.release_notes?.length) {
    lines.push('', ...status.release_notes.map((note) => `- ${note}`));
  }

  return lines.join('\n');
}

export function VersionUpdatePrompt() {
  const checkedRef = React.useRef(false);

  React.useEffect(() => {
    if (checkedRef.current || __DEV__) return;
    checkedRef.current = true;
    let mounted = true;

    AppVersionService.check()
      .then((status) => {
        if (!mounted || !status?.update_available) return;

        const openStore = () => {
          if (!status.store_url) return;
          Linking.openURL(status.store_url).catch(() => {
            appAlert('Update unavailable', 'We could not open the store link. Please update DateUsher from your app store.');
          });
        };

        appAlert(
          status.force_update ? 'Update required' : 'Update available',
          updateMessage(status),
          status.force_update
            ? [{ text: 'Update now', onPress: openStore }]
            : [
                { text: 'Continue', style: 'cancel' },
                { text: 'Update now', onPress: openStore },
              ],
          { cancelable: !status.force_update }
        );
      })
      .catch(() => {
        checkedRef.current = false;
      });

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
