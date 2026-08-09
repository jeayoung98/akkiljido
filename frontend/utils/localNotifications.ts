// expo-notifications는 이 프로젝트가 테스트에 쓰는 Android Expo Go에서 import하는 순간부터
// 예외를 던진다(SDK 53+ 정책으로 Expo Go에서 관련 기능이 빠짐 — 개발 빌드에서만 정상 동작).
// 최상단에서 바로 import하면 그 예외가 앱 전체 라우트 트리를 무너뜨리는 문제가 있었기 때문에
// (Expo Router가 route 모듈 하나라도 import 실패하면 전체가 죽는 구조), 실제로 쓰는 시점에만
// 동적으로 불러오고 실패하면 이 기능만 조용히 꺼둔다. 개발 빌드/EAS 빌드로 넘어가면 정상 동작할 것이다.
import Constants from 'expo-constants';

type NotificationsModule = typeof import('expo-notifications');

let notificationsPromise: Promise<NotificationsModule> | null = null;
let handlerConfigured = false;
const BACKGROUND_LOCATION_TASK = 'notification-place-background-location';

/**
 * 리포트 푸시가 쓰는 Android 채널 ID.
 * 백엔드 FcmClient가 AndroidNotification.setChannelId("report")로 보내기 때문에,
 * 앱이 같은 ID로 채널을 만들어두지 않으면 Android 8+ 에서 알림이 조용히 사라진다.
 */
export const REPORT_NOTIFICATION_CHANNEL_ID = 'report';

/**
 * expo-notifications 모듈을 지연 로드한다. 최초 1회에 알림 핸들러와 채널까지 함께 준비한다.
 * Expo Go처럼 모듈을 못 쓰는 환경에서는 null을 돌려주고, 호출부는 그 기능만 조용히 건너뛴다.
 */
export async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications');
  }

  try {
    const Notifications = await notificationsPromise;
    if (!handlerConfigured) {
      handlerConfigured = true;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      await Notifications.setNotificationChannelAsync('location-alerts', {
        name: '위치 알림',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 200, 250],
      });
      // 주간·월간 리포트 푸시용 채널. 백엔드가 지정하는 channelId와 반드시 같아야 한다.
      await Notifications.setNotificationChannelAsync(REPORT_NOTIFICATION_CHANNEL_ID, {
        name: '리포트 알림',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }
    return Notifications;
  } catch {
    notificationsPromise = null;
    return null;
  }
}

export type NotificationPermissionState = {
  /** OS 알림 권한이 허용된 상태인지. 모듈을 못 쓰는 환경(Expo Go 등)에서도 false. */
  granted: boolean;
  /** 앱 안에서 권한 요청 팝업을 다시 띄울 수 있는지. false면 설정 앱으로 안내해야 한다. */
  canAskAgain: boolean;
};

const UNAVAILABLE_PERMISSION: NotificationPermissionState = { granted: false, canAskAgain: false };

/**
 * 권한 요청 팝업을 띄우지 않고 현재 OS 알림 권한 상태만 읽는다.
 *
 * 앱 포그라운드 복귀처럼 "사용자가 요청하지 않은" 시점에는 팝업을 띄우면 안 되므로,
 * 조회와 요청을 분리해둔다.
 */
export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  const Notifications = await loadNotifications();
  if (!Notifications) return UNAVAILABLE_PERMISSION;

  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return { granted: status === 'granted', canAskAgain };
  } catch {
    return UNAVAILABLE_PERMISSION;
  }
}

/** 이미 허용돼 있으면 그대로 두고, 아니면 OS 권한 요청 팝업을 띄운다. */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const Notifications = await loadNotifications();
  if (!Notifications) return UNAVAILABLE_PERMISSION;

  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') {
      return { granted: true, canAskAgain: current.canAskAgain };
    }

    const requested = await Notifications.requestPermissionsAsync();
    return { granted: requested.status === 'granted', canAskAgain: requested.canAskAgain };
  } catch {
    return UNAVAILABLE_PERMISSION;
  }
}

/** 권한이 없으면 요청까지 하고, 최종적으로 허용됐는지만 알려준다. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const { granted } = await requestNotificationPermission();
  return granted;
}

export async function presentLocalNotification(title: string, body: string): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        priority: Notifications.AndroidNotificationPriority.MAX,
        sound: 'default',
      },
      trigger: { channelId: 'location-alerts' },
    });
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[notification-trigger] failed to present local notification', error);
    }
    return false;
    // Expo Go 등 환경 제약으로 실패해도, 알림함 목록 추가 등 나머지 트리거 로직은 계속 동작해야 한다.
  }
}

/** 알림함을 확인했을 때 앱이 표시한 시스템 알림과 홈 화면 배지를 함께 정리한다. */
export async function clearPresentedNotifications() {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    if (__DEV__) {
      console.warn('[notification-trigger] failed to clear presented notifications', error);
    }
  }
}

/** Android 상시 위치 감시 알림은 유지하되, 홈 화면 아이콘 배지에는 포함하지 않는다. */
export async function configureBackgroundLocationNotificationChannel() {
  const Notifications = await loadNotifications();
  // 개발 빌드에서는 expoConfig가 없는 경우도 있어 현재 Android 패키지명을 fallback으로 둡니다.
  const packageName = Constants.expoConfig?.android?.package ?? 'com.a508.googlelogintest';
  if (!Notifications || !packageName) return;

  try {
    await Notifications.setNotificationChannelAsync(`${packageName}:${BACKGROUND_LOCATION_TASK}`, {
      name: '위치 확인 중',
      importance: Notifications.AndroidImportance.LOW,
      showBadge: false,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[notification-trigger] failed to configure background location channel', error);
    }
  }
}
