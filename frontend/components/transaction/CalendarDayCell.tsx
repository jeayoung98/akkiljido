import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import Colors from '@/constants/Colors';

type CalendarDayCellProps = {
  day: number;
  /** 그 날짜의 수입 합계입니다. 없으면(0 포함) 표시하지 않습니다. */
  incomeAmount?: number;
  /** 그 날짜의 소비 합계입니다. 없으면(0 포함) 표시하지 않습니다. */
  expenseAmount?: number;
  /** 현재 선택된 날짜인지 여부입니다. */
  selected?: boolean;
  /** 이전/다음 달로 넘어간 날짜처럼 이번 달이 아닌 칸을 흐리게 표시합니다. */
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// 셀 폭이 좁아 "원" 없이 부호+숫자만 짧게 보여줍니다. 10만 원이 넘어가면 "250만"처럼 줄여서,
// 월급 같은 큰 금액이 들어와도 셀 밖으로 넘치지 않게 합니다.
const formatCompactAmount = (amount: number, sign: '+' | '-') => {
  const abs = Math.abs(amount);
  if (abs >= 100000) {
    const man = abs / 10000;
    const rounded = Number.isInteger(man) ? `${man}` : man.toFixed(1);
    return `${sign}${rounded}만`;
  }
  return `${sign}${abs.toLocaleString('ko-KR')}`;
};

/** 캘린더 탭에서 하루치 칸 하나를 표시합니다. 날짜 아래에 그날의 수입/소비를 각각 한 줄씩 보여줍니다. */
export function CalendarDayCell({
  day,
  incomeAmount,
  expenseAmount,
  selected = false,
  disabled = false,
  onPress,
  style,
}: CalendarDayCellProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      // onPress를 안 넘긴 칸(달력에 날짜만 채워 넣는 용도)은 disabled prop과 상관없이 항상 눌리지 않게 합니다.
      disabled={disabled || !onPress}
      hitSlop={4}
      onPress={onPress}
      style={[styles.cell, style]}>
      {/*
        key로 selected 값을 넣어 선택 상태가 바뀔 때마다 이 View를 새로 마운트합니다.
        Android는 borderRadius가 있는 View의 backgroundColor를 나중에 업데이트하면
        모서리가 다시 각지게 그려지는 고질적인 버그가 있어서, 기존 뷰를 고쳐 쓰지 않고
        매번 새로 그리게 강제하는 방식으로 우회합니다.
      */}
      <View key={selected ? 'selected' : 'unselected'} style={selected ? styles.dayBadgeSelected : styles.dayBadge}>
        <Text style={[styles.day, disabled && styles.dayDisabled, selected && styles.daySelected]}>{day}</Text>
      </View>
      {/* 수입/소비 중 있는 것만 표시하고, 둘 다 없으면 숫자 영역 자체가 안 보입니다. */}
      {incomeAmount ? (
        <Text numberOfLines={1} style={styles.income}>
          {formatCompactAmount(incomeAmount, '+')}
        </Text>
      ) : null}
      {expenseAmount ? (
        <Text numberOfLines={1} style={styles.expense}>
          {formatCompactAmount(expenseAmount, '-')}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    // 고정 px 폭 대신 flex:1로 7칸을 똑같이 나눠서, 화면 폭이 기기마다 달라도 늘 요일 라벨과
    // 정확히 같은 폭으로 정렬된다(고정폭 + space-between 조합은 화면 폭에 따라 남는 여백이
    // 칸 사이에 나뉘어 들어가는 방식이라, 금액 텍스트가 긴 칸이 있으면 그 칸만 폭이 밀려나면서
    // 뒤 칸들이 오른쪽으로 조금씩 쏠려 보이는 문제가 있었다).
    flex: 1,
    // 웹(flexbox)에서는 minWidth 기본값이 콘텐츠 크기라, 긴 금액 텍스트가 있으면 flex:1 폭을
    // 무시하고 칸이 넓어져 옆 칸을 밀어낸다. 0으로 낮춰서 flex 폭이 실제 상한이 되게 한다.
    minWidth: 0,
    // 수입·소비 금액 줄 수(0~2줄)에 따라 칸 높이가 들쭉날쭉해지지 않도록, 두 줄이 다 있는
    // 경우를 기준으로 높이를 고정한다. 금액이 없는 날은 그만큼 아래쪽이 비어 보일 뿐, 요일
    // 배지 위치와 줄 간격은 항상 같다.
    height: 64,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  dayBadge: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  // dayBadge를 펼쳐서 backgroundColor까지 한 스타일 객체에 같이 넣습니다.
  // [dayBadge, dayBadgeSelected]처럼 배열로 합쳐서 쓰면 Android에서 borderRadius가
  // 적용 안 되고 각진 사각형으로 보이는 경우가 있어서, 완성된 스타일 하나를 통째로 넘깁니다.
  dayBadgeSelected: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: Colors.light.primary,
  },
  day: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
  },
  daySelected: {
    color: Colors.onboarding.inverseText,
    fontWeight: '800',
  },
  dayDisabled: {
    color: Colors.light.disabled,
  },
  // TransactionItem·TransactionDetailCard와 같은 규칙: 수입은 초록, 소비는 검정 계열(빨간색 아님).
  income: {
    color: Colors.light.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  expense: {
    color: Colors.light.textSecondary,
    fontSize: 9,
    fontWeight: '700',
  },
});
