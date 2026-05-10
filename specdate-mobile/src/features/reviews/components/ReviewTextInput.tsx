import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, useTheme } from 'react-native-paper';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

export default function ReviewTextInput({ label, value, onChangeText, placeholder }: Props) {
  const theme = useTheme();

  return (
    <TextInput
      mode="outlined"
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline
      numberOfLines={4}
      maxLength={2000}
      style={[styles.input, { backgroundColor: theme.colors.surface }]}
    />
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 112 },
});
