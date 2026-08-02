import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';

type EmptyStateProps = {
  message: string;
  /** 보조 설명이 필요할 때만 전달합니다(예: 필터 조건 안내). */
  description?: string;
  /** Ionicons 아이콘 이름. 기본은 빈 내역에 어울리는 영수증 아이콘입니다. */
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

/** 내역이 없을 때 리스트 자리에 대신 보여주는 공통 컴포넌트입니다. */
export function EmptyState({ message, description, icon = 'receipt-outline', style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons color={Colors.light.placeholder} name={icon} size={40} />
      <Text style={styles.message}>{message}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  message: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    color: Colors.light.placeholder,
    fontSize: 13,
    textAlign: 'center',
  },
});
