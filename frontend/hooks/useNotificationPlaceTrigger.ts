import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';

import { MOCK_NOTIFICATION_PLACES } from '@/mocks/notifications';
import { useNotificationStore } from '@/store/notificationStore';
import { ensureNotificationPermission, presentLocalNotification } from '@/utils/localNotifications';
import { findTriggeredPlaces } from '@/utils/notificationTrigger';

const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 30000,
  distanceInterval: 50,
};

/**
 * 앱이 foreground에 떠 있는 동안 위치를 주기적으로 받아, 등록된 알림 장소 중 지금(반경+시간대)
 * 조건에 맞는 곳이 있으면 로컬 알림을 띄우고 알림함에도 추가한다.
 * 앱이 백그라운드거나 꺼져 있을 때는 아직 동작하지 않는다 — expo-task-manager 기반 백그라운드
 * 위치 추적은 app.json 네이티브 설정이 필요해서 별도 작업으로 분리했다(project_notification_place_architecture 참고).
 */
export function useNotificationPlaceTrigger() {
  const addNotification = useNotificationStore((state) => state.addNotification);
  // 같은 장소에 시간대 내내 머물러도 알림이 반복되지 않도록, 오늘 이미 알린 장소를 기록해둔다.
  // 날짜가 바뀌면 다시 알릴 수 있게 초기화한다.
  const notifiedTodayRef = useRef<{ date: string; placeIds: Set<number> }>({
    date: new Date().toDateString(),
    placeIds: new Set(),
  });

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function start() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        // OS 알림 권한이 없거나(Expo Go 등 환경 제약 포함) 실패해도, 위치 감지와 알림함 목록
        // 추가는 별개로 계속되어야 하므로 여기서 막지 않는다. presentLocalNotification 쪽에서
        // 알아서 조용히 무시한다.
        await ensureNotificationPermission();
        if (cancelled) return;

        subscription = await Location.watchPositionAsync(WATCH_OPTIONS, (position) => {
          const now = new Date();
          const today = now.toDateString();
          if (notifiedTodayRef.current.date !== today) {
            notifiedTodayRef.current = { date: today, placeIds: new Set() };
          }

          const triggeredPlaces = findTriggeredPlaces(
            { latitude: position.coords.latitude, longitude: position.coords.longitude },
            MOCK_NOTIFICATION_PLACES,
            now
          );

          triggeredPlaces.forEach((place) => {
            if (notifiedTodayRef.current.placeIds.has(place.notificationPlaceId)) return;
            notifiedTodayRef.current.placeIds.add(place.notificationPlaceId);

            const title = `${place.notificationPlaceName} 근처예요`;
            const body = `${place.address} · ${place.reason}`;
            presentLocalNotification(title, body);
            addNotification({ type: 'LOCATION', title, body });
          });
        });
      } catch {
        // 권한 거부, 위치 서비스 꺼짐 등으로 실패하면 이 세션에서는 위치 알림 기능만 조용히 꺼진 채로 둔다.
      }
    }

    start();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
