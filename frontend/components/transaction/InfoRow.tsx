import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';

type InfoRowProps = {
  label: string;
  value: string;
  /** 마지막 행은 구분선을 숨길 수 있습니다. */
  showDivider?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * 거래 상세의 라벨·값 정보를 한 행으로 표시합니다.
 * 값이 길어도 한 줄과 말줄임표를 유지해 모든 행의 높이와 여백을 통일합니다.
 */
export function InfoRow({ label, value, showDivider = true, style }: InfoRowProps) {
  return (
    <View style={[styles.row, showDivider && styles.divider, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text ellipsizeMode="tail" numberOfLines={1} style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // 카드 테두리에 텍스트가 붙지 않도록 양쪽 여백을 통일합니다.
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  label: {
    // 기준명과 값 사이가 과도하게 벌어지지 않도록 고정 폭을 줄입니다.
    width: 72,
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  value: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
});
