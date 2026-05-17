import React from 'react';
import { View } from 'react-native';
import { Button } from 'react-native-paper';
import { styles } from './providerDashboardStyles';

export function ProviderSaveBar({
  bottomInset,
  loading,
  onCancel,
  onSave,
  theme,
}: {
  bottomInset: number;
  loading: boolean;
  onCancel: () => void;
  onSave: () => void;
  theme: any;
}) {
  return (
    <View style={[styles.saveBar, { paddingBottom: bottomInset + 12, backgroundColor: theme.colors.surface }]}>
      <Button mode="outlined" onPress={onCancel} style={styles.saveBarButton}>
        Cancel
      </Button>
      <Button mode="contained" onPress={onSave} loading={loading} style={styles.saveBarButton}>
        Save changes
      </Button>
    </View>
  );
}
