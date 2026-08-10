export type NotificationPlace = {
  notificationPlaceId: number;
  notificationPlaceName: string;
  address: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endTime: string;
  reason: string;
  active: boolean;
};

export type NotificationType = 'LOCATION' | 'WEEKLY_REPORT' | 'MONTHLY_REPORT';

export type NotificationFeedItem = {
  notificationId: number;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  // 아래 두 값은 리포트 알림일 때만 채워진다. 알림함에서 그 항목을 누르면 해당 리포트를 다시 띄운다.
  // (백엔드 ReportType과 같은 값. types/는 API 모듈에 의존하지 않도록 리터럴로 둔다.)
  reportId?: number;
  reportType?: 'WEEKLY' | 'MONTHLY';
};
