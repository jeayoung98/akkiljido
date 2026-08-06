import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { MOCK_NOTIFICATION_PLACES } from '@/mocks/notifications';
import { useNotificationStore } from '@/store/notificationStore';
import { presentLocalNotification } from '@/utils/localNotifications';
import { findTriggeredPlaces } from '@/utils/notificationTrigger';
import { hasNotifiedToday, markNotifiedToday } from '@/utils/notifiedPlacesStorage';

export const BACKGROUND_LOCATION_TASK = 'notification-place-background-location';

const BACKGROUND_LOCATION_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 60000,
  distanceInterval: 100,
  // Android 8+ 는 백그라운드에서 위치를 계속 추적하려면 항상 보이는 알림(포그라운드 서비스)이 필요하다.
  foregroundService: {
    notificationTitle: '아낄지도가 위치를 확인하고 있어요',
    notificationBody: '등록한 장소 근처에 도착하면 알림을 보내드릴게요.',
  },
};

// TaskManager 태스크는 앱이 완전히 종료된 뒤 OS가 헤드리스로(React 트리 없이) 다시 실행할 수도
// 있어서, 훅이나 컴포넌트 안이 아니라 모듈이 로드되는 즉시(앱 진입점에서 이 파일이 import되는
// 시점에) 무조건 등록해야 한다. 조건부로 등록하면 헤드리스 실행 시 등록이 안 돼 있을 수 있다.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  const position = locations?.[locations.length - 1];
  if (!position) return;

  const now = new Date();
  const triggeredPlaces = findTriggeredPlaces(
    { latitude: position.coords.latitude, longitude: position.coords.longitude },
    MOCK_NOTIFICATION_PLACES,
    now
  );

  for (const place of triggeredPlaces) {
    if (await hasNotifiedToday(place.notificationPlaceId)) continue;
    await markNotifiedToday(place.notificationPlaceId);

    const title = `${place.notificationPlaceName} 근처예요`;
    const body = `${place.address} · ${place.reason}`;
    await presentLocalNotification(title, body);
    // 헤드리스 실행은 React 트리 밖이라 훅(useNotificationStore())을 못 쓰지만, zustand는
    // getState()/setState()로 훅 없이도 스토어에 접근할 수 있어 알림함 목록에도 그대로 추가한다.
    useNotificationStore.getState().addNotification({ type: 'LOCATION', title, body });
  }
});

/**
 * 백그라운드 위치 권한을 요청하고(이미 foreground 권한이 승인된 상태여야 함), 백그라운드 위치
 * 추적을 시작한다. 이미 시작돼 있으면 조용히 아무것도 하지 않는다.
 */
export async function startBackgroundLocationTracking() {
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
    () => false
  );
  if (alreadyStarted) return;

  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, BACKGROUND_LOCATION_OPTIONS);
}

// 아직 호출하는 곳이 없다 — 로그아웃 처리(src/screens/MyScreen.tsx의 TODO)가 실제로 붙으면 그
// 흐름에서 이걸 불러서, 로그아웃한 사용자 위치를 계속 추적하지 않게 해야 한다.
export async function stopBackgroundLocationTracking() {
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
    () => false
  );
  if (!alreadyStarted) return;

  await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
