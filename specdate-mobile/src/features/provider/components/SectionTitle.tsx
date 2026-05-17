import React from 'react';
import { Text } from 'react-native-paper';
import { sectionStyles } from './providerDashboardStyles';

export function SectionTitle({ children, theme }: { children: string; theme: any }) {
  return <Text style={[sectionStyles.title, { color: theme.colors.onSurface }]}>{children}</Text>;
}
