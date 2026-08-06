import AsyncStorage from '@react-native-async-storage/async-storage';

// 같은 장소에 시간대 내내 머물러도 알림이 반복되지 않게, 오늘 이미 알린 장소 id를 기록해둔다.
// 백그라운드 위치 태스크는 앱이 완전히 종료된 뒤 OS가 헤드리스로 재실행할 수도 있어서(React 트리 밖,
// 매번 새 JS 컨텍스트), 컴포넌트 useRef 같은 인메모리 상태로는 기록이 이어지지 않는다. 그래서
// foreground 감시(useNotificationPlaceTrigger)와 background 태스크가 이 저장소를 함께 쓴다.
// 참고: hasNotifiedToday로 확인하고 markNotifiedToday로 기록하는 두 단계가 원자적이지 않아서,
// foreground·background 두 경로가 정확히 같은 순간에 같은 장소를 판정하면 아주 드물게 알림이
// 두 번 갈 수 있다. 발생 빈도가 매우 낮고(두 경로 모두 위치 콜백 주기가 초 단위) 최악의 경우도
// "알림 한 번 더 옴" 수준이라, 잠금(mutex)까지는 두지 않았다.
const STORAGE_KEY = 'notification:notifiedPlaceIdsToday';

type NotifiedToday = { date: string; placeIds: number[] };

async function readNotifiedToday(): Promise<NotifiedToday> {
  const today = new Date().toDateString();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: today, placeIds: [] };

    const parsed: NotifiedToday = JSON.parse(raw);
    return parsed.date === today ? parsed : { date: today, placeIds: [] };
  } catch {
    return { date: today, placeIds: [] };
  }
}

export async function hasNotifiedToday(placeId: number): Promise<boolean> {
  const { placeIds } = await readNotifiedToday();
  return placeIds.includes(placeId);
}

export async function markNotifiedToday(placeId: number): Promise<void> {
  const current = await readNotifiedToday();
  if (current.placeIds.includes(placeId)) return;

  current.placeIds.push(placeId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}
