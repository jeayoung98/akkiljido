import type { TransactionType } from '@/components/transaction/TransactionItem';

// 백엔드 API가 아직 연결 안 됐을 때 화면만 먼저 확인하기 위한 목업 데이터입니다.
// 필드 구성은 거래내역 상세보기 API 응답(GET /transactions/{id})을 기준으로 맞췄고,
// 목록/검색 화면에서는 이 중 필요한 필드만 뽑아 씁니다.
export type TransactionRecord = {
  transactionId: number;
  name: string;
  /** 항상 양수. 부호(+/-)는 type으로 표현합니다. */
  amount: number;
  type: TransactionType;
  categoryId: number;
  categoryName: string;
  paymentMethod: string;
  /** "YYYY-MM-DD HH:mm:ss+09" 형식. 화면에서 날짜별로 묶을 때는 앞 10자리(YYYY-MM-DD)만 씁니다. */
  datetime: string;
  address: string;
  latitude: number;
  longitude: number;
  memo: string;
};

export const MOCK_TRANSACTIONS: TransactionRecord[] = [
  {
    transactionId: 1,
    name: '스타벅스 강남역점',
    amount: 4500,
    type: 'expense',
    categoryId: 2,
    categoryName: '카페·간식',
    paymentMethod: '카카오페이',
    datetime: '2026-07-17 09:12:00+09',
    address: '서울 강남구 역삼동',
    latitude: 37.4996,
    longitude: 127.0357,
    memo: '-',
  },
  {
    transactionId: 2,
    name: '쿠팡 로켓배송',
    amount: 32000,
    type: 'expense',
    categoryId: 4,
    categoryName: '쇼핑',
    paymentMethod: '신한카드',
    datetime: '2026-07-17 21:40:00+09',
    address: '온라인',
    latitude: 0,
    longitude: 0,
    memo: '-',
  },
  {
    transactionId: 3,
    name: 'GS25 편의점',
    amount: 2300,
    type: 'expense',
    categoryId: 3,
    categoryName: '편의점·마트',
    paymentMethod: '신한카드',
    datetime: '2026-07-16 08:05:00+09',
    address: '서울 강남구 역삼동',
    latitude: 37.5006,
    longitude: 127.0364,
    memo: '-',
  },
  {
    transactionId: 4,
    name: '네이버페이',
    amount: 100000,
    type: 'income',
    categoryId: 11,
    categoryName: '기타',
    paymentMethod: '네이버페이',
    datetime: '2026-07-16 18:00:00+09',
    address: '-',
    latitude: 0,
    longitude: 0,
    memo: '용돈',
  },
  {
    transactionId: 5,
    name: '올리브영',
    amount: 18500,
    type: 'expense',
    categoryId: 9,
    categoryName: '미용',
    paymentMethod: '신한카드',
    datetime: '2026-07-15 14:20:00+09',
    address: '서울 강남구 역삼동',
    latitude: 37.4998,
    longitude: 127.036,
    memo: '-',
  },
  {
    transactionId: 6,
    name: 'CGV 강남',
    amount: 14000,
    type: 'expense',
    categoryId: 5,
    categoryName: '여가',
    paymentMethod: '카카오페이',
    datetime: '2026-07-15 19:30:00+09',
    address: '서울 강남구 역삼동',
    latitude: 37.4989,
    longitude: 127.0269,
    memo: '-',
  },
  {
    transactionId: 7,
    name: '배달의민족',
    amount: 18000,
    type: 'expense',
    categoryId: 1,
    categoryName: '음식점',
    paymentMethod: '신한카드',
    datetime: '2026-07-14 12:10:00+09',
    address: '서울 강남구 역삼동',
    latitude: 37.4993,
    longitude: 127.0358,
    memo: '-',
  },
];

// GET /transactions/calendar?year&month 응답의 dateList 모양입니다.
export type MonthDateSummary = {
  date: number;
  expense: number;
  income: number;
};

// 캘린더 월별 조회 API가 붙기 전까지, 같은 모양을 목업으로 흉내 냅니다.
// (나중엔 이 함수 호출을 fetch로 바꾸기만 하면 화면 쪽 코드는 그대로 씁니다.)
export function getMockMonthDateList(year: number, month: number): MonthDateSummary[] {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const byDate = new Map<number, { expense: number; income: number }>();

  for (const record of MOCK_TRANSACTIONS) {
    const dateStr = record.datetime.slice(0, 10);
    if (!dateStr.startsWith(monthKey)) continue;

    const day = Number(dateStr.slice(8, 10));
    const entry = byDate.get(day) ?? { expense: 0, income: 0 };
    if (record.type === 'expense') {
      entry.expense += record.amount;
    } else {
      entry.income += record.amount;
    }
    byDate.set(day, entry);
  }

  return Array.from(byDate.entries())
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date - b.date);
}

// GET /transactions/calendar/day?year&month&day 응답의 transactionList 모양입니다.
// TODO: 캘린더 탭 하루 목록에도 카테고리 아이콘을 넣기로 해서 categoryName을 우선 추가해뒀는데,
// 현재 API 스펙엔 이 필드가 없다. 백엔드에 필드 추가를 요청해둔 상태라, 응답이 확정되면
// 실제로 안 내려주는 경우 이 필드부터 지우고 아이콘도 다시 빼야 한다.
export type DayTransactionSummary = {
  transactionId: number;
  name: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
};

export type DayDetail = {
  date: string;
  amount: number;
  transactionList: DayTransactionSummary[];
};

export function getMockDayDetail(year: number, month: number, day: number): DayDetail {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayRecords = MOCK_TRANSACTIONS.filter((record) => record.datetime.slice(0, 10) === dateStr);
  const amount = dayRecords.reduce(
    (sum, record) => sum + (record.type === 'income' ? record.amount : -record.amount),
    0,
  );

  return {
    date: dateStr,
    amount,
    transactionList: dayRecords.map((record) => ({
      transactionId: record.transactionId,
      name: record.name,
      amount: record.amount,
      type: record.type,
      categoryName: record.categoryName,
    })),
  };
}
