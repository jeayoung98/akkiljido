// 알림 장소 API(GET/POST/PATCH/DELETE /api/v1/notification) 응답 형태 기준 목업 데이터입니다.
// 요일(day)은 백엔드에서 안 하기로 확정됐고, active(활성 상태)는 백엔드 확정 필드입니다.
export type NotificationPlace = {
  notificationPlaceId: number;
  notificationPlaceName: string;
  address: string;
  latitude: number;
  longitude: number;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  reason: string;
  /** 삭제 없이 껐다 켤 수 있는 활성 상태. */
  active: boolean;
};

export const MOCK_NOTIFICATION_PLACES: NotificationPlace[] = [
  {
    notificationPlaceId: 1,
    notificationPlaceName: '퇴근길 카페 알림',
    address: '서울 강남구 역삼동 823',
    latitude: 37.4985,
    longitude: 127.0281,
    startTime: '18:30',
    endTime: '19:30',
    reason: '퇴근길 불필요한 카페 소비 확인',
    active: true,
  },
  {
    notificationPlaceId: 2,
    notificationPlaceName: '저녁 쇼핑 알림',
    address: '서울 강남구 삼성동 143',
    latitude: 37.5088,
    longitude: 127.0631,
    startTime: '20:00',
    endTime: '21:00',
    reason: '저녁 쇼핑 자제 확인',
    active: true,
  },
  {
    notificationPlaceId: 3,
    notificationPlaceName: '점심 소비 알림',
    address: '서울 강남구 역삼동 754-11',
    latitude: 37.5003,
    longitude: 127.0365,
    startTime: '12:00',
    endTime: '13:00',
    reason: '점심시간 소비 확인',
    active: false,
  },
];
