// 홈 화면 API 응답 타입입니다. category-summary·recent-expenses·calendar/day 세 API 모두
// 실제 연동 완료라(src/api/homeApi.ts, src/api/calendarApi.ts), 여기엔 타입만 남겨둡니다.

export type CategorySummaryItem = {
  categoryId: number;
  categoryName: string;
  amount: number;
  percent: number;
};

export type NearbyExpensePlace = {
  address: string;
  latitude: number;
  longitude: number;
  name: string;
  amount: number;
};
