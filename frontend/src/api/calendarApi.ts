import { apiRequest } from '@/src/api/apiClient';

export type DailyTransaction = {
  transactionId: number;
  name: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
};

export type DailyCalendarResponse = {
  date: string;
  /** 순수입 - 지출(net) 값입니다. 지출만 있으면 음수로 옵니다 — "오늘 지출액" 용도로는 그대로 쓰면 안 됩니다. */
  amount: number;
  transactionList: DailyTransaction[];
};

/** GET /api/v1/calendar/day — 선택한 날짜의 순수입·지출 합계와 거래내역 목록을 조회한다. */
export async function getDailyCalendar(year: number, month: number, day: number): Promise<DailyCalendarResponse> {
  const query = new URLSearchParams({
    year: String(year),
    month: String(month),
    day: String(day),
  });

  return apiRequest<DailyCalendarResponse>(`/api/v1/calendar/day?${query.toString()}`);
}

/**
 * "오늘 지출액" 카드용 헬퍼입니다. calendar/day의 amount는 순수입-지출(net)이라 그대로 쓰면
 * 지출만 있어도 음수로 나오고, 수입이 섞여 있으면 실제 지출 합계랑도 달라집니다. 그래서 top-level
 * amount 대신 transactionList에서 EXPENSE만 직접 더합니다.
 */
export async function getTodayExpenseAmount(): Promise<number> {
  const now = new Date();
  const { transactionList } = await getDailyCalendar(now.getFullYear(), now.getMonth() + 1, now.getDate());

  return transactionList
    .filter((transaction) => transaction.type === 'EXPENSE')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}
