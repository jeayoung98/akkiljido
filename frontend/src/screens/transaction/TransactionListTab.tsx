import { StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/transaction/CategoryIcon';
import { EmptyState } from '@/components/transaction/EmptyState';
import TransactionGroup, { type TransactionGroupItem } from '@/components/transaction/TransactionGroup';
import type { TransactionScreenMock } from '@/mocks/transactionScreen';

type SortOrder = 'latest' | 'oldest';

type TransactionListTabProps = {
  records: TransactionScreenMock[];
  sortOrder: SortOrder;
  onOpenDetail: (transactionId: string) => void;
};

const formatDateLabel = (dateKey: string) => dateKey.replaceAll('-', '.');

/** 목록 API 응답을 날짜별 TransactionGroup이 사용할 형태로 변환합니다. */
function groupTransactions(records: TransactionScreenMock[], sortOrder: SortOrder) {
  const groups = new Map<string, TransactionScreenMock[]>();

  for (const record of records) {
    const date = record.datetime.slice(0, 10);
    const transactions = groups.get(date) ?? [];
    transactions.push(record);
    groups.set(date, transactions);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => (sortOrder === 'latest' ? right.localeCompare(left) : left.localeCompare(right)))
    .map(([date, transactions]) => ({
      date,
      transactions,
      totalAmount: transactions.reduce(
        (sum, transaction) => sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount),
        0,
      ),
    }));
}

function toGroupItems(records: TransactionScreenMock[]): TransactionGroupItem[] {
  return records.map((record) => ({
    id: record.transactionId,
    title: record.name,
    description: record.categoryName,
    leading: <CategoryIcon categoryName={record.categoryName} size={20} />,
    amount: record.amount,
    type: record.type,
  }));
}

/** 거래 목록 탭 본문입니다. 필터링된 데이터와 상세 이동만 상위 화면에서 받습니다. */
export function TransactionListTab({ records, sortOrder, onOpenDetail }: TransactionListTabProps) {
  const dateGroups = groupTransactions(records, sortOrder);

  if (dateGroups.length === 0) {
    return <EmptyState message="거래 내역이 없습니다." />;
  }

  return (
    <View style={styles.container}>
      {dateGroups.map((group) => (
        <TransactionGroup
          date={formatDateLabel(group.date)}
          key={group.date}
          onItemPress={(item) => onOpenDetail(item.id)}
          style={styles.group}
          totalAmount={group.totalAmount}
          transactions={toGroupItems(group.transactions)}
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
