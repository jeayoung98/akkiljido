// 알림 장소 API(GET/POST/PATCH/DELETE /api/v1/notification) 응답 형태 기준 목업 데이터입니다.
// day(요일)·enabled(활성 상태) 필드는 아직 백엔드 확정 전이라 프론트에서만 임시로 들고 있습니다.
// 백엔드 확인 후 실제로 필드가 추가되면 이 타입도 그에 맞춰 정리하면 됩니다.
export type NotificationPlace = {
  notificationPlaceId: number;
  notificationPlaceName: string;
  address: string;
  latitude: number;
  longitude: number;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  reason: string;
  /** 프론트 전용 임시 필드. 요일 목록(예: ['월','화']), null이면 매일. */
  day: string[] | null;
  /** 프론트 전용 임시 필드. 삭제 없이 껐다 켤 수 있는 활성 상태. */
  enabled: boolean;
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
    day: ['월', '화', '수', '목', '금'],
    enabled: true,
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
    day: ['토', '일'],
    enabled: true,
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
    day: ['월', '화', '수', '목', '금'],
    enabled: false,
  },
];
