import { useQuery } from '@tanstack/react-query';

import {
  fetchCalendarDay,
  fetchCalendarMonth,
  type CalendarDaySummary,
} from '@/src/api/calendarApi';

/**
 * 캘린더 탭용 react-query 훅입니다.
 * 화면은 여기서 나오는 `isLoading`·`error`·`refetch`만 쓰고, 쿼리 문자열은 신경 쓰지 않습니다.
 *
 * 거래를 등록·수정·삭제하면 캘린더 숫자도 같이 바뀌어야 하므로,
 * queryKey를 useTransactions의 `transactionKeys.all`(= `['transactions']`) 아래에 두어
 * 기존 mutation 훅들의 invalidate가 캘린더까지 자동으로 갱신하게 합니다.
 */

const EMPTY_DAY_SUMMARIES: CalendarDaySummary[] = [];

export const calendarKeys = {
  all: ['transactions', 'calendar'] as const,
  month: (year: number, month: number) => [...calendarKeys.all, 'month', year, month] as const,
  day: (year: number, month: number, day: number) =>
    [...calendarKeys.all, 'day', year, month, day] as const,
};

/** GET /api/v1/calendar/month — 달을 넘기면 queryKey가 바뀌어 자동으로 다시 조회합니다. */
export function useCalendarMonth(year: number, month: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: calendarKeys.month(year, month),
    queryFn: () => fetchCalendarMonth(year, month),
  });

  return {
    daySummaries: data ?? EMPTY_DAY_SUMMARIES,
    isLoading,
    error,
    refetch,
  };
}

/** GET /api/v1/calendar/day — 선택한 날짜의 합계와 거래 목록을 조회합니다. */
export function useCalendarDay(year: number, month: number, day: number) {
  // 날짜가 깨진 상태(예: 아직 초기화되지 않은 dateKey)로 요청하면 서버가 V001로 거절하므로 막습니다.
  const hasValidDate =
    Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: calendarKeys.day(year, month, day),
    queryFn: () => fetchCalendarDay(year, month, day),
    enabled: hasValidDate,
  });

  return {
    dayDetail: data,
    isLoading,
    error,
    refetch,
  };
}
