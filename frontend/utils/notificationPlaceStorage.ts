import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NotificationPlace } from '@/types/notification';

const STORAGE_KEY = 'notification:places';

/**
 * 위치 알림은 별도 API가 없으므로 AsyncStorage를 데이터 원본으로 사용합니다.
 * 백그라운드 태스크도 같은 저장소를 읽기 때문에 앱이 종료돼도 등록 목록이 유지됩니다.
 */
export async function loadNotificationPlaces(): Promise<NotificationPlace[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NotificationPlace[]) : [];
  } catch {
    return [];
  }
}

export async function saveNotificationPlaces(places: NotificationPlace[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch {
    // 저장 공간 부족 등으로 실패해도 설정 화면이 중단되지는 않게 둡니다.
  }
}

/** 로그아웃 뒤 다른 사용자의 장소 알림이 남지 않도록 기기에 동기화한 목록을 비웁니다. */
export async function clearNotificationPlaces() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // 로그아웃 자체는 로컬 저장소 정리 실패로 막지 않습니다.
  }
}
