import { apiRequest } from '@/src/api/apiClient';
import { toNumber, toTransactionType } from '@/src/api/normalize';
import type { TransactionType } from '@/src/api/transactionsApi';

/**
 * 캘린더 탭이 쓰는 조회 API 모듈입니다. (거래 CRUD는 transactionsApi.ts에 있습니다.)
 *
 * 거래 목록 API와 달리 이 두 API는 기간을 `YYYY-MM-DD` 문자열이 아니라
 * `year`/`month`/`day` 숫자 쿼리로 받습니다. 그래서 화면이 들고 있는 Date를 그대로 넘길 수 있게
 * `Date -> {year, month, day}` 변환도 이 파일에서 함께 제공합니다.
 *
 * - 월 조회 응답의 `date`는 `YYYY-MM-DD`가 아니라 **일(day) 숫자**입니다. (예: 17)
 * - 일 조회 응답의 `amount`는 그 날의 합계(소득 - 소비)라 음수가 될 수 있고, 명세 예시는 문자열(`"-36500"`)입니다.
 * 화면 코드가 이런 차이를 몰라도 되도록, 이 파일 밖으로는 항상 아래 타입들만 나갑니다.
 */

/** 월 조회에서 하루치 요약입니다. 거래가 없는 날은 응답에 아예 들어오지 않습니다. */
export type CalendarDaySummary = {
  /** 일(day) 숫자입니다. `YYYY-MM-DD`가 아닙니다. */
  date: number;
  /** 그 날의 소비 합계(양수) */
  expense: number;
  /** 그 날의 소득 합계(양수) */
  income: number;
};

/** 일 조회 응답의 거래 한 건입니다. */
export type CalendarDayTransaction = {
  transactionId: number;
  name: string;
  /** 항상 양수. 부호는 type으로 표현합니다. */
  amount: number;
  type: TransactionType;
  /**
   * 현재 명세에는 없는 필드입니다.
   * 캘린더 하루 목록에도 카테고리 아이콘을 넣기로 해서 백엔드에 추가를 요청해뒀고,
   * 아직 안 내려오면 빈 문자열이 됩니다. (화면은 값이 있을 때만 아이콘을 그립니다.)
   */
  categoryName: string;
  /** categoryName과 같은 이유로 선택 필드입니다. 없으면 0입니다. */
  categoryId: number;
};

export type CalendarDayDetail = {
  /** `YYYY-MM-DD` */
  date: string;
  /** 그 날의 합계(소득 - 소비)라 음수가 될 수 있습니다. */
  amount: number;
  transactionList: CalendarDayTransaction[];
};

/* ------------------------------------------------------------------ */
/* 서버 응답 원본 타입 (이 파일 밖으로 나가지 않습니다)                    */
/* ------------------------------------------------------------------ */

type RawCalendarDaySummary = {
  date?: number | string;
  expense?: number | string;
  income?: number | string;
};

type RawCalendarMonthResponse = {
  dateList?: RawCalendarDaySummary[];
};

type RawCalendarDayTransaction = {
  transactionId?: number | string;
  name?: string;
  amount?: number | string;
  type?: string;
  categoryName?: string;
  categoryId?: number | string;
};

type RawCalendarDayResponse = {
  date?: string;
  amount?: number | string;
  transactionList?: RawCalendarDayTransaction[];
};

/* ------------------------------------------------------------------ */
/* 변환 헬퍼                                                            */
/* ------------------------------------------------------------------ */

/** 화면이 들고 있는 Date를 캘린더·분석 API의 연/월/일 쿼리 값으로 바꿉니다. */
export function toCalendarParams(date: Date): { year: number; month: number; day: number } {
  return {
    year: date.getFullYear(),
    // getMonth()는 0부터 시작하지만 API의 month는 1~12입니다.
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

/** `YYYY-MM-DD` 문자열을 연/월/일 숫자로 쪼갭니다. 캘린더가 선택 날짜를 이 형식으로 들고 있습니다. */
export function fromDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
}

function toDaySummary(raw: RawCalendarDaySummary): CalendarDaySummary {
  return {
    date: toNumber(raw.date),
    expense: toNumber(raw.expense),
    income: toNumber(raw.income),
  };
}

function toDayTransaction(raw: RawCalendarDayTransaction): CalendarDayTransaction {
  return {
    transactionId: toNumber(raw.transactionId),
    name: raw.name ?? '',
    amount: toNumber(raw.amount),
    type: toTransactionType(raw.type),
    categoryName: raw.categoryName ?? '',
    categoryId: toNumber(raw.categoryId),
  };
}

/* ------------------------------------------------------------------ */
/* API 호출                                                             */
/* ------------------------------------------------------------------ */

/**
 * GET /api/v1/calendar/month — 그 달에 거래가 있는 날의 소비·소득 합계를 가져옵니다.
 * year·month 모두 필수이며, 범위를 벗어나면 서버가 `V001`로 거절합니다.
 */
export async function fetchCalendarMonth(
  year: number,
  month: number,
): Promise<CalendarDaySummary[]> {
  const data = await apiRequest<RawCalendarMonthResponse>(
    `/api/v1/calendar/month?year=${year}&month=${month}`,
  );

  return (data?.dateList ?? []).map(toDaySummary);
}

/** GET /api/v1/calendar/day — 하루치 합계와 그 날의 거래 목록을 가져옵니다. */
export async function fetchCalendarDay(
  year: number,
  month: number,
  day: number,
): Promise<CalendarDayDetail> {
  const data = await apiRequest<RawCalendarDayResponse>(
    `/api/v1/calendar/day?year=${year}&month=${month}&day=${day}`,
  );

  return {
    // 거래가 없는 날에도 화면이 날짜 제목을 그릴 수 있도록, 응답이 비면 요청한 날짜로 채웁니다.
    date:
      data?.date ??
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    amount: toNumber(data?.amount),
    transactionList: (data?.transactionList ?? []).map(toDayTransaction),
  };
}

/**
 * 홈 화면의 "오늘 지출액" 카드용 헬퍼입니다. 전용 API가 없어서 일 단위 조회를 재사용합니다.
 *
 * 응답의 `amount`는 순수입 - 지출(net)이라 지출만 있어도 음수로 나오고, 수입이 섞이면 실제 지출
 * 합계와도 달라집니다. 그래서 amount 대신 transactionList에서 소비만 직접 더합니다.
 */
export async function getTodayExpenseAmount(): Promise<number> {
  const now = new Date();
  const { year, month, day } = toCalendarParams(now);
  const { transactionList } = await fetchCalendarDay(year, month, day);

  return transactionList
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}
