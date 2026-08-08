import AsyncStorage from '@react-native-async-storage/async-storage';

import { registerPushToken, unregisterPushToken } from '@/src/api/fcmApi';
import { getAuthSession } from '@/src/auth/tokenStorage';
import { ensureNotificationPermission, loadNotifications } from '@/utils/localNotifications';

// 로그아웃 시 어떤 토큰을 해제해야 하는지 알아야 하는데, 그 시점엔 이미 알림 권한이 꺼져 있거나
// 토큰 조회가 실패할 수 있다. 등록에 성공한 토큰을 그대로 남겨두고 해제할 때 다시 꺼내 쓴다.
const REGISTERED_PUSH_TOKEN_KEY = 'fcm:registeredToken';

/**
 * 이 기기의 네이티브 푸시 토큰(Android면 FCM 토큰)을 가져온다.
 *
 * Expo Push 토큰(getExpoPushTokenAsync)이 아니라 devicePushToken을 쓰는 이유:
 * 백엔드가 Firebase Admin SDK로 기기 토큰에 직접 발송하기 때문이다.
 */
async function getDevicePushToken(): Promise<string | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;

  try {
    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token?.data === 'string' && token.data.length > 0 ? token.data : null;
  } catch (error) {
    // google-services.json이 없거나 Expo Go로 실행 중이면 여기서 실패한다.
    // 푸시만 못 받을 뿐 앱의 나머지 기능은 그대로 동작해야 하므로 로그만 남긴다.
    console.warn('[push] device push token unavailable', error);
    return null;
  }
}

/**
 * 로그인 상태라면 이 기기의 푸시 토큰을 서버에 등록한다.
 *
 * 로그인 직후와 앱 시작(세션 복구) 시점에 호출한다. 토큰은 OS가 재발급할 수 있어서
 * "한 번 등록했으면 끝"이 아니라 켤 때마다 다시 올린다(서버가 upsert 한다).
 * 리포트 푸시 엔드포인트가 ROLE_USER 전용이라 닉네임 설정 전(GUEST)에는 건너뛴다.
 */
export async function syncPushTokenRegistration(): Promise<void> {
  const session = await getAuthSession();
  if (session?.role !== 'USER') return;

  const granted = await ensureNotificationPermission();
  if (!granted) {
    console.info('[push] notification permission not granted — skip token registration');
    return;
  }

  const pushToken = await getDevicePushToken();
  if (!pushToken) return;

  try {
    await registerPushToken(pushToken);
    await AsyncStorage.setItem(REGISTERED_PUSH_TOKEN_KEY, pushToken);
    console.info('[push] token registered');
  } catch (error) {
    // 등록 실패는 리포트 푸시를 못 받는다는 뜻일 뿐, 로그인 흐름을 막을 이유는 없다.
    console.error('[push] token registration failed', error);
  }
}

/** 로그아웃 시 이 기기 토큰을 서버에서 해제한다. 실패해도 로그아웃 자체는 계속 진행돼야 한다. */
export async function clearPushTokenRegistration(): Promise<void> {
  const storedToken = await AsyncStorage.getItem(REGISTERED_PUSH_TOKEN_KEY);
  const pushToken = storedToken ?? (await getDevicePushToken());

  if (pushToken) {
    try {
      await unregisterPushToken(pushToken);
      console.info('[push] token unregistered');
    } catch (error) {
      console.error('[push] token unregistration failed', error);
    }
  }

  await AsyncStorage.removeItem(REGISTERED_PUSH_TOKEN_KEY);
}
