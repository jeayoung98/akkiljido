/**
 * 거래 화면 구현 전 목록·상세·분석 화면에서 함께 사용할 임시 데이터입니다.
 * 지도 브랜치의 목 데이터와 파일 충돌을 피하기 위해 거래 화면 전용으로 분리했습니다.
 * 실제 API 연동 시 이 파일의 import를 API 호출로 교체합니다.
 */
export type TransactionScreenMock = {
  transactionId: string;
  name: string;
  amount: number;
  type: 'expense' | 'income';
  categoryName: string;
  datetime: string;
  memo: string;
};

export const TRANSACTION_SCREEN_MOCKS: TransactionScreenMock[] = [
  {
    transactionId: '1',
    name: '스타벅스 강남역점',
    amount: 4500,
    type: 'expense',
    categoryName: '카페·간식',
    datetime: '2026-07-17 09:12:00+09',
    memo: '아이스 아메리카노',
  },
  {
    transactionId: '2',
    name: '쿠팡 로켓배송',
    amount: 32000,
    type: 'expense',
    categoryName: '쇼핑',
    datetime: '2026-07-17 21:40:00+09',
    memo: '생활용품',
  },
  {
    transactionId: '3',
    name: 'GS25 편의점',
    amount: 2300,
    type: 'expense',
    categoryName: '편의점·마트',
    datetime: '2026-07-16 08:05:00+09',
    memo: '간식',
  },
  {
    transactionId: '4',
    name: '네이버페이',
    amount: 100000,
    type: 'income',
    categoryName: '기타',
    datetime: '2026-07-16 18:00:00+09',
    memo: '용돈',
  },
];

/** 홈 화면의 오늘 지출 영역을 확인하기 위한 요약 데이터입니다. */
export const HOME_TRANSACTION_SUMMARY_MOCK = {
  date: '2026-07-17',
  todayExpense: 36500,
  recentTransactions: TRANSACTION_SCREEN_MOCKS.slice(0, 2),
};
