import type { ReportData } from '@/components/report/ReportModal';
import type { ReportRecommendation } from '@/components/report/RecommendModal';

// TODO: 실제 주간 리포트 데이터 연동 전까지 쓰는 임시 값. 홈 화면의 ReportModal(팝업)에서 쓴다.
export const MOCK_WEEKLY_REPORT: ReportData = {
  period: { start: '2026-07-27', end: '2026-08-02' },
  headline: '이번 주도 알뜰하게 보내셨네요!',
  totalAmount: 182400,
  topCategory: { name: '카페·간식', amount: 42000 },
  topPlace: { name: '스타벅스 강남역점', count: 5 },
  body: ['이번 주 지출은 지난주보다 12% 줄었어요.', '카페 지출 비중이 가장 높았어요.'],
  publishedAt: '2026-08-03T07:00:00',
  comparedToPrevious: -12,
};

// TODO: 실제 추천 데이터 연동 전까지 쓰는 임시 값. MOCK_WEEKLY_REPORT의 "알뜰 추천 보기"에서 쓴다.
export const MOCK_WEEKLY_REPORT_RECOMMENDATIONS: ReportRecommendation[] = [
  {
    id: 'weekly-rec-1',
    description: '카페·간식 소비가 평소보다 늘었어요.',
    placeName: '스타벅스 강남역점',
    timeRange: '14:00~17:00',
    alarm: {
      name: '카페 지출 알림',
      placeName: '스타벅스 강남역점',
      address: '서울 강남구 강남대로 396',
      lat: 37.498,
      lng: 127.0281,
      startTime: '14:00',
      endTime: '17:00',
      reason: '카페·간식 소비가 평소보다 늘어서 추천해요.',
    },
  },
];

// TODO: 실제 월간 리포트 데이터 연동 전까지 쓰는 임시 값.
export const MOCK_MONTHLY_REPORT: ReportData = {
  period: { start: '2026-07-01', end: '2026-07-31' },
  headline: '이번 달도 알뜰하게 보내셨네요!',
  totalAmount: 812600,
  topCategory: { name: '쇼핑', amount: 214000 },
  topPlace: { name: '무신사 스탠다드 강남점', count: 3 },
  body: ['이번 달 지출은 지난달보다 8% 줄었어요.', '쇼핑 지출 비중이 가장 높았어요.'],
  publishedAt: '2026-08-01T07:00:00',
  comparedToPrevious: -8,
};
