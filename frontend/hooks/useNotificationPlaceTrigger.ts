import * as Location from 'expo-location';
import { useEffect } from 'react';

import { useNotificationStore } from '@/store/notificationStore';
// 이 파일을 import하는 시점에 TaskManager.defineTask가 무조건 등록되어야, OS가 앱 종료 후
// 헤드리스로 백그라운드 태스크만 다시 실행할 때도 정의가 이미 돼 있다. startBackgroundLocationTracking은
// 그 등록된 태스크에 실제 위치 업데이트 구독을 붙이는 역할이라 훅 안에서 호출해도 된다.
import { startBackgroundLocationTracking } from '@/utils/backgroundLocationTask';
import { ensureNotificationPermission, presentLocalNotification } from '@/utils/localNotifications';
import { claimNotificationForToday, releaseNotificationClaimForToday } from '@/utils/notifiedPlacesStorage';
import { loadNotificationPlaces } from '@/utils/notificationPlaceStorage';
import { findTriggeredPlaces } from '@/utils/notificationTrigger';

const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 30000,
  distanceInterval: 0,
};

/**
 * 위치 기반 알림 트리거링을 시작한다. 두 경로로 위치를 받는다:
 * - foreground: 앱이 떠 있는 동안 watchPositionAsync로 더 자주(30초/50m) 확인한다.
 * - background: startBackgroundLocationTracking으로 등록한 OS 태스크가 앱이 백그라운드거나
 *   꺼져 있어도(화면 꺼짐 포함) 계속 위치를 받아 utils/backgroundLocationTask.ts에서 같은 로직으로 판단한다.
 * 두 경로가 같은 장소를 거의 동시에 트리거할 수 있어서, "오늘 이미 알린 장소" 기록은 컴포넌트
 * 상태가 아니라 AsyncStorage(utils/notifiedPlacesStorage.ts)에 공유해서 중복 알림을 막는다.
 */
export function useNotificationPlaceTrigger() {
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let isEvaluating = false;

    async function start() {
      const evaluateLocation = async (position: Location.LocationObject) => {
        const now = new Date();
        const places = await loadNotificationPlaces();
        const triggeredPlaces = findTriggeredPlaces(
          { latitude: position.coords.latitude, longitude: position.coords.longitude },
          places,
          now,
        );

        if (__DEV__) {
          console.info('[notification-trigger] foreground evaluation', {
            time: now.toTimeString().slice(0, 5),
            placeCount: places.length,
            triggeredPlaceIds: triggeredPlaces.map((place) => place.notificationPlaceId),
          });
        }

        for (const place of triggeredPlaces) {
          if (!(await claimNotificationForToday(place.notificationPlaceId))) continue;

          const title = `${place.notificationPlaceName} 근처예요`;
          const body = `${place.address} · ${place.reason}`;
          const didPresent = await presentLocalNotification(title, body);
          if (!didPresent) {
            await releaseNotificationClaimForToday(place.notificationPlaceId);
            continue;
          }
          addNotification({ type: 'LOCATION', title, body });
        }
      };

      const refreshCurrentLocation = async () => {
        if (cancelled || isEvaluating) return;
        isEvaluating = true;

        try {
          const lastKnownPosition = await Location.getLastKnownPositionAsync();
          if (lastKnownPosition && !cancelled) {
            await evaluateLocation(lastKnownPosition);
          }

          const currentPosition = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!cancelled) {
            await evaluateLocation(currentPosition);
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('[notification-trigger] failed to refresh current location', error);
          }
        } finally {
          isEvaluating = false;
        }
      };

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        // OS 알림 권한이 없거나(Expo Go 등 환경 제약 포함) 실패해도, 위치 감지와 알림함 목록
        // 추가는 별개로 계속되어야 하므로 여기서 막지 않는다. presentLocalNotification 쪽에서
        // 알아서 조용히 무시한다.
        await ensureNotificationPermission();
        if (cancelled) return;

        // 백그라운드 위치 권한("항상 허용")은 foreground 승인 후에만 별도 시스템 팝업으로 물어보고,
        // 안드로이드 버전에 따라 앱 팝업이 아니라 설정 화면으로 유도되기도 해서 사용자가 답하기까지
        // 시간이 걸릴 수 있다. await로 기다리지 않고 그냥 던져두는 이유는, foreground 감시(바로 아래
        // watchPositionAsync)를 이 응답을 기다리느라 늦게 시작시키지 않기 위해서다. 거부해도 foreground
        // 감시는 그대로 동작해야 하므로 실패도 무시한다.
        startBackgroundLocationTracking().catch(() => {});

        // 위치 변화가 없으면 watchPositionAsync 콜백이 바로 오지 않을 수 있으므로,
        // 감시 시작 직후 현재 위치도 한 번 검사한다.
        subscription = await Location.watchPositionAsync(WATCH_OPTIONS, (position) => {
          void evaluateLocation(position);
        });
        void refreshCurrentLocation();
        refreshTimer = setInterval(() => {
          void refreshCurrentLocation();
        }, 30000);
      } catch (error) {
        if (__DEV__) {
          console.warn('[notification-trigger] 위치 알림 감시를 시작하지 못했습니다.', error);
        }
        // 권한 거부, 위치 서비스 꺼짐 등으로 실패하면 이 세션에서는 위치 알림 기능만 조용히 꺼진 채로 둔다.
      }
    }

    start();

    return () => {
      cancelled = true;
      subscription?.remove();
      if (refreshTimer) clearInterval(refreshTimer);
      // 백그라운드 태스크는 여기서 멈추지 않는다 — 이 훅은 (tabs) 레이아웃이 언마운트되면(예: 로그아웃
      // 화면 전환) 같이 정리되는데, 그것과 무관하게 앱이 백그라운드로 가거나 꺼진 뒤에도 위치 추적은
      // 계속돼야 이 기능의 목적(화면 꺼져 있어도 알림)이 성립한다.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
