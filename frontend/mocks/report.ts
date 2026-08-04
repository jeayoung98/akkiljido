import type { WeeklyReportData } from '@/components/report/WeeklyReportModal';
import type { ReportRecommendation } from '@/components/report/WeeklyReportRecommendationsModal';

// 리포트 하나(요약 데이터 + 알림 추천 목록)를 함께 묶은 형태. 과거 리포트 목록 화면에서
// 아코디언 카드 하나가 이 타입 하나에 대응한다.
export type ReportHistoryEntry = {
  data: WeeklyReportData;
  recommendations: ReportRecommendation[];
};

// TODO: 실제 주간 리포트 데이터 연동 전까지 쓰는 임시 값. 최신순으로 정렬돼 있다.
export const MOCK_WEEKLY_REPORTS: ReportHistoryEntry[] = [
  {
    data: {
      period: { start: '2026-07-22', end: '2026-07-28' },
      headline: '이번 주도 알뜰하게 보내셨네요!',
      totalAmount: 243900,
      topCategory: { name: '카페·간식', amount: 82000 },
      topPlace: { name: 'GS25 회사앞점', count: 14 },
      body: ['평소보다 카페 방문이 4회 늘었고,', '카페·간식 소비가 주간 평균보다 14% 높았어요.'],
      publishedAt: '2026-07-29T07:00:00',
      comparedToPrevious: 14,
    },
    recommendations: [
      {
        id: 'weekly-1-rec-1',
        description: '카페·간식 주간 한도를 70,000원으로 설정해 보세요.',
        placeName: 'GS25 회사앞점',
        timeRange: '14:00~17:00',
        alarm: {
          name: '카페·간식 한도 알림',
          placeName: 'GS25 회사앞점',
          time: '14:00',
          reason: '카페·간식 소비가 주간 평균보다 14% 높아서 추천해요.',
        },
      },
      {
        id: 'weekly-1-rec-2',
        description: '오후 2~5시 카페 방문이 집중돼 있어요.',
        placeName: '스타벅스 강남역점',
        timeRange: '14:00~17:00',
        alarm: {
          name: '오후 카페 알림',
          placeName: '스타벅스 강남역점',
          time: '14:00',
          reason: '오후 2~5시에 카페 방문이 몰려 있어서 추천해요.',
        },
      },
    ],
  },
  {
    data: {
      period: { start: '2026-07-15', end: '2026-07-21' },
      headline: '지난주보다 지출을 줄였어요!',
      totalAmount: 214000,
      topCategory: { name: '편의점·마트', amount: 65000 },
      topPlace: { name: 'CU 연대앞점', count: 10 },
      body: ['외식보다 편의점 이용이 늘었고,', '전반적으로 지출이 안정적이었어요.'],
      publishedAt: '2026-07-22T07:00:00',
      comparedToPrevious: -8,
    },
    recommendations: [
      {
        id: 'weekly-2-rec-1',
        description: '편의점 방문이 잦은 편이에요.',
        placeName: 'CU 연대앞점',
        timeRange: '12:00~13:00',
        alarm: {
          name: '점심 편의점 알림',
          placeName: 'CU 연대앞점',
          time: '12:00',
          reason: '점심시간에 편의점 방문이 잦아서 추천해요.',
        },
      },
    ],
  },
  {
    data: {
      period: { start: '2026-07-08', end: '2026-07-14' },
      headline: '주말 외식 지출이 늘었어요.',
      totalAmount: 232500,
      topCategory: { name: '음식점', amount: 90000 },
      topPlace: { name: '김밥천국 역삼점', count: 6 },
      body: ['주말 외식 지출이 평소보다 늘었어요.'],
      publishedAt: '2026-07-15T07:00:00',
      comparedToPrevious: 5,
    },
    recommendations: [
      {
        id: 'weekly-3-rec-1',
        description: '주말 저녁 외식이 잦은 편이에요.',
        placeName: '김밥천국 역삼점',
        timeRange: '18:00~20:00',
        alarm: {
          name: '주말 외식 알림',
          placeName: '김밥천국 역삼점',
          time: '18:00',
          reason: '주말 저녁 외식 지출이 잦아서 추천해요.',
        },
      },
    ],
  },
];

// TODO: 실제 월간 리포트 데이터 연동 전까지 쓰는 임시 값. 최신순으로 정렬돼 있다.
export const MOCK_MONTHLY_REPORTS: ReportHistoryEntry[] = [
  {
    data: {
      period: { start: '2026-07-01', end: '2026-07-31' },
      headline: '이번 달도 알뜰하게 보내셨네요!',
      totalAmount: 924300,
      topCategory: { name: '쇼핑', amount: 214000 },
      topPlace: { name: '무신사 스탠다드 강남점', count: 3 },
      body: ['이번 달 쇼핑 지출이 크게 늘었고,', '전반적으로 지난달보다 지출이 늘었어요.'],
      publishedAt: '2026-08-01T07:00:00',
      comparedToPrevious: 9,
    },
    recommendations: [
      {
        id: 'monthly-1-rec-1',
        description: '쇼핑 월간 한도를 200,000원으로 설정해 보세요.',
        placeName: '무신사 스탠다드 강남점',
        timeRange: '18:00~21:00',
        alarm: {
          name: '쇼핑 한도 알림',
          placeName: '무신사 스탠다드 강남점',
          time: '18:00',
          reason: '이번 달 쇼핑 지출이 크게 늘어서 추천해요.',
        },
      },
    ],
  },
  {
    data: {
      period: { start: '2026-06-01', end: '2026-06-30' },
      headline: '지난달보다 소폭 절약했어요.',
      totalAmount: 848000,
      topCategory: { name: '카페·간식', amount: 120000 },
      topPlace: { name: '스타벅스 강남역점', count: 8 },
      body: ['지난달보다 전체 지출이 소폭 줄었어요.'],
      publishedAt: '2026-07-01T07:00:00',
      comparedToPrevious: -2,
    },
    recommendations: [
      {
        id: 'monthly-2-rec-1',
        description: '카페 방문이 꾸준히 잦은 편이에요.',
        placeName: '스타벅스 강남역점',
        timeRange: '12:00~13:00',
        alarm: {
          name: '점심 카페 알림',
          placeName: '스타벅스 강남역점',
          time: '12:00',
          reason: '한 달 내내 카페 방문이 꾸준해서 추천해요.',
        },
      },
    ],
  },
];

// 팝업 모달 단독 테스트용으로 계속 쓰이는 단일 값들. 배열의 가장 최근(첫 번째) 항목을 그대로 쓴다.
export const MOCK_WEEKLY_REPORT: WeeklyReportData = MOCK_WEEKLY_REPORTS[0].data;
export const MOCK_MONTHLY_REPORT: WeeklyReportData = MOCK_MONTHLY_REPORTS[0].data;
