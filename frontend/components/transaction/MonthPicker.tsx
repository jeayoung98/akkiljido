import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { IconButton } from '@/components/common/button/IconButton';
import Colors from '@/constants/Colors';

type MonthPickerProps = {
  /** 현재 표시할 달. 연/월만 사용하고 일자는 신경 쓰지 않습니다. */
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * 내역 리스트·캘린더·분석 탭 헤더에서 공통으로 쓰는 월 이동 컴포넌트입니다.
 * month를 문자열({year, month})이 아닌 Date로 받는 이유:
 * - 12월에서 다음 달로 넘어갈 때 연도가 자동으로 올라가는 등 월 overflow를 직접 계산할 필요가 없다.
 * - 내역 조회 API가 startDate/endDate를 "YYYY-MM-DD" 문자열로 받으므로,
 *   호출 직전에 이 Date에서 바로 월의 시작일 등을 포맷하면 된다.
 */
export function MonthPicker({ month, onPrev, onNext, style }: MonthPickerProps) {
  const label = `${month.getFullYear()}년 ${month.getMonth() + 1}월`;

  return (
    <View style={[styles.container, style]}>
      {/* IconButton의 back(‹)/chevronRight(›) 별칭을 그대로 재사용합니다. */}
      <IconButton name="back" onPress={onPrev} />
      <Text style={styles.label}>{label}</Text>
      <IconButton name="chevronRight" onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.cardBackground,
  },
  label: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
