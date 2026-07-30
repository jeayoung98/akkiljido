import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';

const PLACEHOLDER = '지도에서 장소를 선택해주세요';

type MapInputProps = {
  label?: string;
  value?: string; // 선택된 주소
  onPress?: () => void; // 지도 화면으로 이동하는 이벤트
  style?: StyleProp<ViewStyle>;
};

export function MapInput({ label, value, onPress, style }: MapInputProps) {
  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.row}>
        <View style={styles.valueRow}>
          <Ionicons name="location" size={16} color={Colors.light.primary} />
          <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
            {value ?? PLACEHOLDER}
          </Text>
        </View>

        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.buttonText}>지도에서 검색</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${Colors.light.primary}1A`,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    flexShrink: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  placeholder: {
    color: Colors.light.placeholder,
  },
  button: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
