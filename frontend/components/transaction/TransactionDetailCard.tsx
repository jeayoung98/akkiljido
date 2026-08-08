import type { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import BaseCard from '@/components/common/card/BaseCard';
import type { TransactionType } from '@/components/transaction/TransactionItem';
import Colors from '@/constants/Colors';

type TransactionDetailCardProps = {
  /** 거래처명 또는 사용자가 입력한 항목명입니다. */
  title: string;
  /** TransactionItem과 동일하게 부호 없는 값을 받고, type에 따라 부호/색을 붙입니다. */
  amount: number;
  type: TransactionType;
  /** 카테고리 아이콘 등 원형 배지 안에 넣을 요소입니다. */
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// TransactionItem과 같은 부호/포맷 규칙(소비는 -, 수입은 +, 천 단위 콤마)을 이 컴포넌트 안에 따로 둡니다.
// TransactionItem.tsx는 건드리지 않기로 해서 그쪽 함수를 가져다 쓰지 않고 로직만 그대로 복사했습니다.
const formatAmount = (amount: number, type: TransactionType) => {
  const sign = type === 'income' ? '+' : '-';
  return `${sign}${Math.abs(amount).toLocaleString('ko-KR')}원`;
};

/**
 * 거래 상세·수정·삭제 화면 맨 위에서 거래 하나를 큼직하게 요약해서 보여주는 카드입니다.
 * 금액 부호/색 규칙(소비는 검정, 수입은 초록)은 TransactionItem과 동일하게 맞춰서,
 * 리스트와 상세 화면에서 같은 거래가 다르게 표시되는 일이 없게 합니다.
 */
export function TransactionDetailCard({ title, amount, type, leading, style }: TransactionDetailCardProps) {
  return (
    <BaseCard style={[styles.card, style]}>
      {/* leading은 선택 항목이라, 아이콘 없이 제목부터 보여주는 화면에서도 그대로 쓸 수 있다. */}
      {leading ? <View style={styles.iconContainer}>{leading}</View> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.amount, type === 'income' && styles.incomeAmount]}>
        {formatAmount(amount, type)}
      </Text>
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
    // BaseCard 자체는 배경색만 있고 테두리/그림자가 없어서, 배경이 카드와 같은 흰색이면 경계가 아예 안 보인다.
    // 어떤 배경 위에서도 카드처럼 보이도록 옅은 그림자를 얹는다.
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  iconContainer: {
    width: 64,
    height: 64,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    // TransactionItem의 아이콘 배경과 같은 값입니다.
    backgroundColor: Colors.light.inputBackground,
  },
  title: {
    color: Colors.light.cardTitle,
    fontSize: 17,
    fontWeight: '700',
  },
  amount: {
    color: Colors.light.cardTitle,
    fontSize: 26,
    fontWeight: '800',
  },
  incomeAmount: {
    color: Colors.light.primary,
  },
});
