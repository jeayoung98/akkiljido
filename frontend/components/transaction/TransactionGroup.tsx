import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import BaseCard from '@/components/common/card/BaseCard';
import TransactionItem, {
  TransactionItemProps,
} from '@/components/transaction/TransactionItem';
import Colors from '@/constants/Colors';

export type TransactionGroupItem = Omit<TransactionItemProps, 'onPress'> & {
  /** API transactionId를 React 목록의 고유 key로 사용합니다. */
  id: string;
};

export type TransactionGroupProps = {
  /** 화면에 표시할 날짜 문자열입니다. */
  date: string;
  transactions: TransactionGroupItem[];
  /** API 날짜별 amount를 Number로 변환해 전달하며, 생략하면 거래 목록으로 계산합니다. */
  totalAmount?: number;
  onItemPress?: (transaction: TransactionGroupItem) => void;
  style?: StyleProp<ViewStyle>;
};

const calculateTotal = (transactions: TransactionGroupItem[]) =>
  // 수입은 더하고 소비는 빼서 API와 같은 부호 기반 일일 순합계를 만듭니다.
  transactions.reduce((total, transaction) => {
    const amount = Math.abs(transaction.amount);
    return total + (transaction.type === 'income' ? amount : -amount);
  }, 0);

const formatTotal = (amount: number) => {
  if (amount === 0) return '0원';
  const sign = amount > 0 ? '+' : '-';
  return `${sign}${Math.abs(amount).toLocaleString('ko-KR')}원`;
};

/** 같은 날짜의 거래를 일일 합계와 함께 하나의 카드 목록으로 묶어 표시합니다. */
export default function TransactionGroup({
  date,
  transactions,
  totalAmount,
  onItemPress,
  style,
}: TransactionGroupProps) {
  // 서버 집계값이 없을 때만 현재 거래 목록을 기준으로 일일 합계를 계산합니다.
  const resolvedTotal = totalAmount ?? calculateTotal(transactions);

  return (
    <View style={style}>
      <View style={styles.header}>
        <Text style={styles.date}>{date}</Text>
        <Text style={[styles.total, resolvedTotal > 0 && styles.incomeTotal]}>
          {formatTotal(resolvedTotal)}
        </Text>
      </View>

      <BaseCard style={styles.card}>
        {/* API transactionList를 거래 한 줄 단위의 TransactionItem으로 변환합니다. */}
        {transactions.map((transaction, index) => (
          <View key={transaction.id}>
            {/* 첫 번째 항목을 제외한 거래 사이에만 구분선을 표시합니다. */}
            {index > 0 ? <View style={styles.divider} /> : null}
            <TransactionItem
              {...transaction}
              onPress={onItemPress ? () => onItemPress(transaction) : undefined}
            />
          </View>
        ))}
      </BaseCard>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    flex: 1,
    color: Colors.light.placeholder,
    fontSize: 13,
    fontWeight: '700',
  },
  total: {
    marginLeft: 12,
    color: Colors.light.cardTitle,
    fontSize: 14,
    fontWeight: '800',
  },
  incomeTotal: {
    color: Colors.light.primary,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
    backgroundColor: Colors.light.border,
  },
});
