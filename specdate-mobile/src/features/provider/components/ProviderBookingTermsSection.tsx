import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { Dropdown } from 'react-native-paper-dropdown';
import { currencyOptions, currencySymbol, normalizeCurrency } from '../../../utils/currency';
import type { ProviderDashboardForm } from '../types';
import { SectionTitle } from './SectionTitle';
import { styles } from './providerDashboardStyles';

type UpdateForm = <K extends keyof ProviderDashboardForm>(key: K, value: ProviderDashboardForm[K]) => void;

export function ProviderBookingTermsSection({
  form,
  editMode,
  minimumSpendDisplay,
  updateForm,
  onStartEditing,
  theme,
}: {
  form: ProviderDashboardForm;
  editMode: boolean;
  minimumSpendDisplay: string;
  updateForm: UpdateForm;
  onStartEditing: () => void;
  theme: any;
}) {
  return (
    <>
      <TouchableOpacity activeOpacity={0.8} onPress={onStartEditing} disabled={editMode}>
        <SectionTitle theme={theme}>Booking terms</SectionTitle>
      </TouchableOpacity>
      <View style={[styles.bookingTermsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        {editMode ? (
          <EditableBookingTerms form={form} updateForm={updateForm} theme={theme} />
        ) : (
          <ReadonlyBookingTerms form={form} minimumSpendDisplay={minimumSpendDisplay} theme={theme} />
        )}
      </View>
    </>
  );
}

function EditableBookingTerms({
  form,
  updateForm,
  theme,
}: {
  form: ProviderDashboardForm;
  updateForm: UpdateForm;
  theme: any;
}) {
  return (
    <>
      <Dropdown
        label="Pricing currency"
        mode="outlined"
        value={form.currency}
        onSelect={(value) => updateForm('currency', normalizeCurrency(value, form.country))}
        options={currencyOptions}
      />
      {form.minimumSpendEnabled ? (
        <TextInput
          mode="outlined"
          label="Minimum spend"
          value={form.minimumSpend}
          onChangeText={(value) => updateForm('minimumSpend', value.replace(/[^0-9.]/g, ''))}
          keyboardType="numeric"
          left={<TextInput.Affix text={currencySymbol(form.currency, form.country)} />}
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
          dense
        />
      ) : null}
      <EditableToggleRow
        title="Minimum spend"
        text="Show whether this venue requires a minimum bill."
        value={form.minimumSpendEnabled}
        onChange={(value) => updateForm('minimumSpendEnabled', value)}
        theme={theme}
      />
      <EditableToggleRow
        title="Booking required"
        text="Daters will see if they must book before attending."
        value={form.bookingRequired}
        onChange={(value) => updateForm('bookingRequired', value)}
        theme={theme}
      />
      <EditableToggleRow
        title="ID required"
        text="Daters will see if they need valid ID for verification."
        value={form.idRequired}
        onChange={(value) => updateForm('idRequired', value)}
        theme={theme}
      />
    </>
  );
}

function ReadonlyBookingTerms({
  form,
  minimumSpendDisplay,
  theme,
}: {
  form: ProviderDashboardForm;
  minimumSpendDisplay: string;
  theme: any;
}) {
  return (
    <>
      <ReadonlyToggleRow
        title="Minimum spend"
        text={minimumSpendDisplay}
        value={form.minimumSpendEnabled}
        first
        theme={theme}
      />
      <ReadonlyToggleRow
        title="Booking required"
        text={form.bookingRequired ? 'Daters must book before arrival.' : 'Walk-ins are allowed.'}
        value={form.bookingRequired}
        theme={theme}
      />
      <ReadonlyToggleRow
        title="ID required"
        text={form.idRequired ? 'Daters must bring valid ID.' : 'No ID check is required.'}
        value={form.idRequired}
        theme={theme}
      />
    </>
  );
}

function EditableToggleRow({
  title,
  text,
  value,
  onChange,
  theme,
}: {
  title: string;
  text: string;
  value: boolean;
  onChange: (value: boolean) => void;
  theme: any;
}) {
  return (
    <View style={styles.switchRow}>
      <SwitchCopy title={title} text={text} theme={theme} />
      <YesNoToggle value={value} onChange={onChange} theme={theme} />
    </View>
  );
}

function ReadonlyToggleRow({
  title,
  text,
  value,
  first,
  theme,
}: {
  title: string;
  text: string;
  value: boolean;
  first?: boolean;
  theme: any;
}) {
  return (
    <View style={first ? styles.termsRow : styles.switchRow}>
      <SwitchCopy title={title} text={text} theme={theme} />
      <YesNoToggle value={value} theme={theme} />
    </View>
  );
}

function SwitchCopy({ title, text, theme }: { title: string; text: string; theme: any }) {
  return (
    <View style={styles.switchCopy}>
      <Text style={[styles.switchTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      <Text style={[styles.switchText, { color: theme.colors.onSurfaceVariant }]}>{text}</Text>
    </View>
  );
}

function YesNoToggle({
  value,
  onChange,
  theme,
}: {
  value: boolean;
  onChange?: (value: boolean) => void;
  theme: any;
}) {
  const OptionComponent = onChange ? TouchableOpacity : View;

  return (
    <View style={styles.yesNoToggle}>
      <OptionComponent
        style={[styles.yesNoOption, value && { backgroundColor: theme.colors.primary }]}
        onPress={onChange ? () => onChange(true) : undefined}
      >
        <Text style={[styles.yesNoText, { color: value ? '#fff' : theme.colors.onSurfaceVariant }]}>Yes</Text>
      </OptionComponent>
      <OptionComponent
        style={[styles.yesNoOption, !value && { backgroundColor: theme.colors.primary }]}
        onPress={onChange ? () => onChange(false) : undefined}
      >
        <Text style={[styles.yesNoText, { color: !value ? '#fff' : theme.colors.onSurfaceVariant }]}>No</Text>
      </OptionComponent>
    </View>
  );
}
