import type { ReportData } from '@/components/report/ReportModal';

// TODO: 실제 주간 리포트 데이터 연동 전까지 쓰는 임시 값.
export const MOCK_WEEKLY_REPORT: ReportData = {
  period: { start: '2026-07-27', end: '2026-08-02' },
  headline: '이번 주도 알뜰하게 보내셨네요!',
  totalAmount: 182400,
  topCategory: { name: '카페·간식', amount: 42000 },
  topPlace: { name: '스타벅스 강남역점', count: 5 },
  body: ['이번 주 지출은 지난주보다 12% 줄었어요.', '카페 지출 비중이 가장 높았어요.'],
};

// TODO: 실제 월간 리포트 데이터 연동 전까지 쓰는 임시 값.
export const MOCK_MONTHLY_REPORT: ReportData = {
  period: { start: '2026-07-01', end: '2026-07-31' },
  headline: '이번 달도 알뜰하게 보내셨네요!',
  totalAmount: 812600,
  topCategory: { name: '쇼핑', amount: 214000 },
  topPlace: { name: '무신사 스탠다드 강남점', count: 3 },
  body: ['이번 달 지출은 지난달보다 8% 줄었어요.', '쇼핑 지출 비중이 가장 높았어요.'],
};
