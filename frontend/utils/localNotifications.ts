// expo-notifications는 이 프로젝트가 테스트에 쓰는 Android Expo Go에서 import하는 순간부터
// 예외를 던진다(SDK 53+ 정책으로 Expo Go에서 관련 기능이 빠짐 — 개발 빌드에서만 정상 동작).
// 최상단에서 바로 import하면 그 예외가 앱 전체 라우트 트리를 무너뜨리는 문제가 있었기 때문에
// (Expo Router가 route 모듈 하나라도 import 실패하면 전체가 죽는 구조), 실제로 쓰는 시점에만
// 동적으로 불러오고 실패하면 이 기능만 조용히 꺼둔다. 개발 빌드/EAS 빌드로 넘어가면 정상 동작할 것이다.
type NotificationsModule = typeof import('expo-notifications');

let notificationsPromise: Promise<NotificationsModule> | null = null;
let handlerConfigured = false;

async function loadNotifications(): Promise<NotificationsModule | null> {
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
    }
    return Notifications;
  } catch {
    notificationsPromise = null;
    return null;
  }
}

export async function ensureNotificationPermission() {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;

    const { status: requestedStatus } = await Notifications.requestPermissionsAsync();
    return requestedStatus === 'granted';
  } catch {
    return false;
  }
}

export async function presentLocalNotification(title: string, body: string) {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // Expo Go 등 환경 제약으로 실패해도, 알림함 목록 추가 등 나머지 트리거 로직은 계속 동작해야 한다.
  }
}
