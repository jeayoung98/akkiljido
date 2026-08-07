import { apiRequest } from '@/src/api/apiClient';

// 응답 필드는 Swagger 문서에 data 스키마가 비어 있어서(백엔드 문서화 누락), 기존 목업(mocks/notifications.ts)의
// NotificationPlace와 동일한 모양으로 추정했다. 실제 응답이 다르면 이 타입부터 맞춘다.
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

export type NotificationPlaceInput = {
  notificationPlaceName: string;
  address: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endTime: string;
  reason: string;
};

// 목록 응답은 배열이 아니라 { notificationList: [...] }로 감싸서 온다(기기 로그로 확인).
type NotificationPlaceListResponse = {
  notificationList: NotificationPlace[];
};

export async function getNotificationPlaces(): Promise<NotificationPlace[]> {
  const response = await apiRequest<NotificationPlaceListResponse>('/api/v1/notification');
  return response.notificationList;
}

export async function getNotificationPlace(notificationPlaceId: number): Promise<NotificationPlace> {
  return apiRequest<NotificationPlace>(`/api/v1/notification/${notificationPlaceId}`);
}

export async function createNotificationPlace(
  input: NotificationPlaceInput,
): Promise<NotificationPlace> {
  return apiRequest<NotificationPlace>('/api/v1/notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export async function updateNotificationPlace(
  notificationPlaceId: number,
  input: Partial<NotificationPlaceInput> & { active?: boolean },
): Promise<NotificationPlace> {
  return apiRequest<NotificationPlace>(`/api/v1/notification/${notificationPlaceId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export async function deleteNotificationPlace(notificationPlaceId: number): Promise<void> {
  return apiRequest<void>(`/api/v1/notification/${notificationPlaceId}`, {
    method: 'DELETE',
  });
}
