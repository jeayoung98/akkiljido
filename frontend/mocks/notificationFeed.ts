// 알림함(GET /api/v1/notifications 예상) 응답 형태 기준 목업 데이터입니다.
// 위치 알림은 등록된 알림 장소(mocks/notifications.ts)의 트리거 결과로, 리포트 알림은 주간/월간 리포트가
// 발행되는 시점에 생성됩니다. 정확한 필드명은 알림함 API 확정 시 다시 맞춰야 합니다.
export type NotificationType = 'LOCATION' | 'WEEKLY_REPORT' | 'MONTHLY_REPORT';

export type NotificationFeedItem = {
  notificationId: number;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string; // ISO 8601
  read: boolean;
};

export const MOCK_NOTIFICATIONS: NotificationFeedItem[] = [
  {
    notificationId: 1,
    type: 'LOCATION',
    title: '설정한 소비 장소 근처예요',
    body: '서울 강남구 테헤란로 145 · 퇴근길 불필요한 카페 소비 확인',
    createdAt: '2026-08-05T18:30:00+09:00',
    read: false,
  },
  {
    notificationId: 2,
    type: 'LOCATION',
    title: '설정한 장소 반경 500m 안이에요',
    body: '서울 마포구 양화로 160 · 저녁 쇼핑 지출 확인',
    createdAt: '2026-08-04T20:00:00+09:00',
    read: false,
  },
  {
    notificationId: 3,
    type: 'WEEKLY_REPORT',
    title: '주간 리포트가 도착했어요',
    body: '최다 소비 카테고리와 AI 분석을 확인해 보세요',
    createdAt: '2026-07-20T07:00:00+09:00',
    read: true,
  },
  {
    notificationId: 4,
    type: 'WEEKLY_REPORT',
    title: '주간 리포트가 도착했어요',
    body: '최다 소비 카테고리와 AI 분석을 확인해 보세요',
    createdAt: '2026-07-13T07:00:00+09:00',
    read: true,
  },
  {
    notificationId: 5,
    type: 'MONTHLY_REPORT',
    title: '6월 월간 리포트가 도착했어요',
    body: '한 달간의 주요 소비 변화와 AI 분석을 확인해 보세요',
    createdAt: '2026-07-01T07:00:00+09:00',
    read: false,
  },
];
