import { Platform } from 'react-native';

import { apiRequest } from '@/src/api/apiClient';

/**
 * 백엔드 DeviceType enum(ANDROID/IOS/WEB)과 1:1로 맞춘 값.
 * 서버는 이 값을 그대로 user_push_tokens.device_type에 저장한다.
 */
export type DeviceType = 'ANDROID' | 'IOS' | 'WEB';

export function getCurrentDeviceType(): DeviceType {
  if (Platform.OS === 'android') {
    return 'ANDROID';
  }

  if (Platform.OS === 'ios') {
    return 'IOS';
  }

  return 'WEB';
}

/**
 * POST /api/v1/fcm — 이 기기의 FCM 푸시 토큰을 로그인한 사용자에게 등록한다.
 *
 * 서버가 (사용자, 기기) 조합으로 upsert 하므로 같은 토큰을 다시 보내도 안전하다.
 * 앱을 켤 때마다 호출해서, 토큰이 재발급되거나 계정이 바뀐 경우에도 항상 최신 상태가 되게 한다.
 * ROLE_USER 전용 엔드포인트라 닉네임 설정 전(GUEST)에는 호출하면 안 된다.
 */
export async function registerPushToken(
  pushToken: string,
  deviceType: DeviceType = getCurrentDeviceType(),
): Promise<void> {
  await apiRequest<void>('/api/v1/fcm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceType, pushToken }),
  });
}

/**
 * DELETE /api/v1/fcm — 로그아웃한 기기로 더는 리포트 푸시가 가지 않게 토큰을 해제한다.
 *
 * 이걸 빼먹으면 로그아웃한 기기에도 이전 계정의 리포트 알림이 계속 도착한다.
 */
export async function unregisterPushToken(pushToken: string): Promise<void> {
  await apiRequest<void>('/api/v1/fcm', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pushToken }),
  });
}
