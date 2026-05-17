import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, TextInput } from 'react-native-paper';
import { getDefaultCurrencyForCountry } from '../../../utils/currency';
import type { ProviderDashboardForm } from '../types';
import { SectionTitle } from './SectionTitle';
import { sectionStyles, styles } from './providerDashboardStyles';

type UpdateForm = <K extends keyof ProviderDashboardForm>(key: K, value: ProviderDashboardForm[K]) => void;

export function ProviderBusinessInfoSection({
  form,
  editMode,
  updateForm,
  onStartEditing,
  onOpenWebsite,
  theme,
}: {
  form: ProviderDashboardForm;
  editMode: boolean;
  updateForm: UpdateForm;
  onStartEditing: () => void;
  onOpenWebsite: () => void;
  theme: any;
}) {
  return (
    <>
      {editMode ? <CompanyNameEditor form={form} updateForm={updateForm} theme={theme} /> : null}
      <AboutSection form={form} editMode={editMode} updateForm={updateForm} onStartEditing={onStartEditing} theme={theme} />
      <AddressSection
        form={form}
        editMode={editMode}
        updateForm={updateForm}
        onStartEditing={onStartEditing}
        onOpenWebsite={onOpenWebsite}
        theme={theme}
      />
    </>
  );
}

function CompanyNameEditor({ form, updateForm, theme }: { form: ProviderDashboardForm; updateForm: UpdateForm; theme: any }) {
  return (
    <>
      <SectionTitle theme={theme}>Company name</SectionTitle>
      <TextInput
        mode="outlined"
        label="Company name"
        value={form.companyName}
        onChangeText={(value) => updateForm('companyName', value)}
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
        dense
      />
    </>
  );
}

function AboutSection({
  form,
  editMode,
  updateForm,
  onStartEditing,
  theme,
}: {
  form: ProviderDashboardForm;
  editMode: boolean;
  updateForm: UpdateForm;
  onStartEditing: () => void;
  theme: any;
}) {
  return (
    <>
      <View style={styles.inlineSectionHeader}>
        <Text style={[sectionStyles.title, { color: theme.colors.onSurface }]}>About</Text>
        {!editMode ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onStartEditing}
            style={[styles.inlineEditButton, { backgroundColor: theme.colors.primary }]}
            accessibilityLabel="Edit provider profile"
          >
            <MaterialCommunityIcons name="pencil" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </View>
      {editMode ? (
        <TextInput
          mode="outlined"
          label="Description"
          value={form.description}
          onChangeText={(value) => updateForm('description', value)}
          multiline
          numberOfLines={3}
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
          dense
        />
      ) : (
        <Text style={[styles.bodyText, { color: theme.colors.onSurface }]}>
          {form.description || 'Add a description in Edit mode.'}
        </Text>
      )}
    </>
  );
}

function AddressSection({
  form,
  editMode,
  updateForm,
  onStartEditing,
  onOpenWebsite,
  theme,
}: {
  form: ProviderDashboardForm;
  editMode: boolean;
  updateForm: UpdateForm;
  onStartEditing: () => void;
  onOpenWebsite: () => void;
  theme: any;
}) {
  return (
    <>
      <TouchableOpacity activeOpacity={0.8} onPress={onStartEditing} disabled={editMode}>
        <SectionTitle theme={theme}>Address</SectionTitle>
      </TouchableOpacity>
      {editMode ? (
        <AddressEditor form={form} updateForm={updateForm} theme={theme} />
      ) : (
        <AddressReadOnly form={form} onOpenWebsite={onOpenWebsite} theme={theme} />
      )}
    </>
  );
}

function AddressEditor({ form, updateForm, theme }: { form: ProviderDashboardForm; updateForm: UpdateForm; theme: any }) {
  return (
    <>
      <TextInput
        mode="outlined"
        label="Address"
        value={form.address}
        onChangeText={(value) => updateForm('address', value)}
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
        dense
      />
      <View style={styles.rowInputs}>
        <TextInput
          mode="outlined"
          label="City"
          value={form.city}
          onChangeText={(value) => updateForm('city', value)}
          style={[styles.input, styles.inputHalf, { backgroundColor: theme.colors.surface }]}
          dense
        />
        <TextInput
          mode="outlined"
          label="Country"
          value={form.country}
          onChangeText={(value) => {
            updateForm('country', value);
            if (!form.currency) {
              updateForm('currency', getDefaultCurrencyForCountry(value));
            }
          }}
          style={[styles.input, styles.inputHalf, { backgroundColor: theme.colors.surface }]}
          dense
        />
      </View>
      <TextInput
        mode="outlined"
        label="Phone"
        value={form.phone}
        onChangeText={(value) => updateForm('phone', value)}
        keyboardType="phone-pad"
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
        dense
      />
      <TextInput
        mode="outlined"
        label="Website"
        value={form.website}
        onChangeText={(value) => updateForm('website', value)}
        keyboardType="url"
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
        dense
      />
    </>
  );
}

function AddressReadOnly({
  form,
  onOpenWebsite,
  theme,
}: {
  form: ProviderDashboardForm;
  onOpenWebsite: () => void;
  theme: any;
}) {
  return (
    <>
      <View style={[styles.addressRow, { backgroundColor: theme.colors.surfaceVariant || theme.colors.surface }]}>
        <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
        <Text style={[styles.addressText, { color: theme.colors.onSurface }]}>
          {[form.address, form.city, form.country].filter(Boolean).join(', ') || 'Add address in Edit mode.'}
        </Text>
      </View>
      {form.website.trim() ? (
        <TouchableOpacity
          onPress={onOpenWebsite}
          style={[styles.addressRow, { backgroundColor: theme.colors.surfaceVariant || theme.colors.surface, marginTop: 8 }]}
        >
          <MaterialCommunityIcons name="open-in-new" size={20} color={theme.colors.primary} />
          <Text style={[styles.addressText, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {form.website.trim()}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      ) : null}
    </>
  );
}
