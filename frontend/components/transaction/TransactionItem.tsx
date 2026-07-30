import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import InfoListItem from '@/components/common/card/InfoListItem';
import Colors from '@/constants/Colors';

export type TransactionType = 'expense' | 'income';

export type TransactionItemProps = {
  /** 거래 상호명 또는 사용자가 입력한 항목명입니다. */
  title: string;
  /** 내역 화면에서는 카테고리, 지도 화면에서는 날짜·시간 등으로 사용할 수 있습니다. */
  description?: string;
  /** 카테고리 아이콘처럼 행 왼쪽에 표시할 요소입니다. */
  leading?: ReactNode;
  /** 부호를 제외한 거래 금액입니다. */
  amount: number;
  type: TransactionType;
  onPress?: () => void;
  disabled?: boolean;
};

const formatAmount = (amount: number, type: TransactionType) => {
  const sign = type === 'income' ? '+' : '-';
  return `${sign}${Math.abs(amount).toLocaleString('ko-KR')}원`;
};

/** 거래 한 건을 공통 목록 행에 맞춰 표시하고 수입·소비 표현 규칙을 적용합니다. */
export default function TransactionItem({
  title,
  description,
  leading,
  amount,
  type,
  onPress,
  disabled = false,
}: TransactionItemProps) {
  const formattedAmount = formatAmount(amount, type);
  const typeLabel = type === 'income' ? '수입' : '소비';

  return (
    <InfoListItem
      accessibilityLabel={[title, description, typeLabel, formattedAmount].filter(Boolean).join(', ')}
      description={description}
      disabled={disabled}
      leading={leading ? <View style={styles.iconContainer}>{leading}</View> : undefined}
      onPress={onPress}
      title={title}
      trailing={
        <Text style={[styles.amount, type === 'income' && styles.incomeAmount]}>
          {formattedAmount}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#EEF7F0',
  },
  amount: {
    color: Colors.light.cardTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  incomeAmount: {
    color: Colors.light.primary,
  },
});
