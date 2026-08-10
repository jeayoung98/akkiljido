type GroupableTransaction = {
  transactionId: number;
  name: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: number;
  categoryName: string;
};

export type GroupedTransaction<T extends GroupableTransaction> = T & {
  transactionIds: number[];
  transactionCount: number;
};

/**
 * 같은 화면에서 같은 날짜에 같은 상호명·카테고리·거래 구분으로 발생한 거래를 한 줄로 묶습니다.
 * 원본 거래 ID 목록은 유지하므로, API 데이터 자체를 합치거나 잃지 않습니다.
 */
export function groupTransactions<T extends GroupableTransaction>(
  transactions: T[],
  getScopeKey: (transaction: T) => string = () => '',
): GroupedTransaction<T>[] {
  const groups = new Map<string, T[]>();

  transactions.forEach((transaction) => {
    // join(':')은 name이나 getScopeKey() 결과에 ':'가 들어있으면 서로 다른 값이 같은 key로
    // 뭉쳐질 수 있어서, 값 경계가 명확한 JSON.stringify로 key를 만듭니다.
    const key = JSON.stringify([getScopeKey(transaction), transaction.type, transaction.categoryId, transaction.name.trim()]);
    const group = groups.get(key) ?? [];
    group.push(transaction);
    groups.set(key, group);
  });

  return Array.from(groups.values()).map((group) => {
    const first = group[0];

    return {
      ...first,
      amount: group.reduce((sum, transaction) => sum + transaction.amount, 0),
      transactionCount: group.length,
      transactionIds: group.map((transaction) => transaction.transactionId),
    };
  });
}
