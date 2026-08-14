import { StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/transaction/CategoryIcon';
import TransactionGroup, { type TransactionGroupItem } from '@/components/transaction/TransactionGroup';
import type { TransactionDateGroup, TransactionListItem } from '@/src/api/transactionsApi';

type TransactionListTabProps = {
  /** GET /api/v1/transaction/list의 dateList를 그대로 받습니다. */
  dateGroups: TransactionDateGroup[];
  onOpenDetail: (transactionId: string) => void;
};

const formatDateLabel = (dateKey: string) => dateKey.replaceAll('-', '.');

/** 목록 API의 거래 항목을 TransactionGroup이 쓰는 형태로 바꿉니다. */
function toGroupItems(transactions: TransactionListItem[]): TransactionGroupItem[] {
  // 같은 이름·날짜라도 결제 시각이 다르면 별도 거래이므로 API 거래 단위를 그대로 표시합니다.
  return transactions.map((transaction) => ({
    id: String(transaction.transactionId),
    title: transaction.name,
    description: transaction.categoryName,
    leading: (
      <CategoryIcon
        categoryId={transaction.categoryId}
        categoryName={transaction.categoryName}
        size={20}
        type={transaction.type}
      />
    ),
    amount: transaction.amount,
    type: transaction.type,
  }));
}

/**
 * 거래 목록 탭 본문입니다.
 * 날짜별 묶음·정렬·일일 합계는 서버가 이미 계산해서 내려주므로, 여기서는 표시만 담당합니다.
 * (로딩·에러·빈 목록 처리는 상위 ListScreen의 AsyncStateView가 맡습니다.)
 */
export function TransactionListTab({ dateGroups, onOpenDetail }: TransactionListTabProps) {
  return (
    <View style={styles.container}>
      {dateGroups.map((group) => (
        <TransactionGroup
          date={formatDateLabel(group.date)}
          key={group.date}
          onItemPress={(item) => onOpenDetail(item.id)}
          style={styles.group}
          totalAmount={group.amount}
          transactions={toGroupItems(group.transactionList)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    padding: 16,
  },
  group: {
    marginBottom: 4,
  },
});
