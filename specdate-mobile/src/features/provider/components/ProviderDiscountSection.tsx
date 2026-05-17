import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { Dropdown } from 'react-native-paper-dropdown';
import type { ProviderDashboardForm } from '../types';
import { SectionTitle } from './SectionTitle';
import { styles } from './providerDashboardStyles';

const discountOptions = [
  { label: '10%', value: '10' },
  { label: '20%', value: '20' },
  { label: '30%', value: '30' },
  { label: '40%', value: '40' },
  { label: '50%', value: '50' },
];

export function ProviderDiscountSection({
  form,
  editMode,
  updateForm,
  onStartEditing,
  theme,
}: {
  form: ProviderDashboardForm;
  editMode: boolean;
  updateForm: <K extends keyof ProviderDashboardForm>(key: K, value: ProviderDashboardForm[K]) => void;
  onStartEditing: () => void;
  theme: any;
}) {
  return (
    <>
      <TouchableOpacity activeOpacity={0.8} onPress={onStartEditing} disabled={editMode}>
        <SectionTitle theme={theme}>Agreed discount</SectionTitle>
      </TouchableOpacity>
      <View style={[styles.voucherCard, { backgroundColor: theme.colors.primaryContainer || theme.colors.primary + '18', borderColor: theme.colors.primary + '40' }]}>
        <MaterialCommunityIcons name="ticket-percent" size={28} color={theme.colors.primary} />
        <View style={styles.voucherBody}>
          {editMode ? (
            <Dropdown
              label="Percentage"
              mode="outlined"
              value={form.discountPercentage}
              onSelect={(value) => updateForm('discountPercentage', value || '10')}
              options={discountOptions}
            />
          ) : (
            <>
              <Text style={[styles.voucherTitle, { color: theme.colors.onSurface }]}>
                {form.discountPercentage}% off for DateUsher users
              </Text>
              <Text style={[styles.voucherDesc, { color: theme.colors.onSurfaceVariant }]}>
                Applied to date vouchers created for your venue.
              </Text>
            </>
          )}
        </View>
      </View>
    </>
  );
}
