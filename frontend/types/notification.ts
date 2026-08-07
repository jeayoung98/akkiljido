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
};
