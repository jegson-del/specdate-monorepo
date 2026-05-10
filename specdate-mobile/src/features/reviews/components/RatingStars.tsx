import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helper?: string;
  color?: string;
};

export default function RatingStars({ label, value, onChange, helper, color = '#F59E0B' }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onChange(star)} hitSlop={8} style={styles.star}>
            <MaterialCommunityIcons name={value >= star ? 'star' : 'star-outline'} size={30} color={color} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 5 },
  label: { fontSize: 14, fontWeight: '900' },
  helper: { fontSize: 12, lineHeight: 17, color: '#64748B' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { paddingVertical: 2 },
});
