import AsyncStorage from '@react-native-async-storage/async-storage';

// 같은 장소에 시간대 내내 머물러도 알림이 반복되지 않게, 오늘 이미 알린 장소 id를 기록해둔다.
// 백그라운드 위치 태스크는 앱이 완전히 종료된 뒤 OS가 헤드리스로 재실행할 수도 있어서(React 트리 밖,
// 매번 새 JS 컨텍스트), 컴포넌트 useRef 같은 인메모리 상태로는 기록이 이어지지 않는다. 그래서
// foreground 감시(useNotificationPlaceTrigger)와 background 태스크가 이 저장소를 함께 쓴다.
const STORAGE_KEY = 'notification:notifiedPlaceIdsToday';

type NotifiedToday = { date: string; placeIds: number[] };

// 같은 JS 실행 환경에서 foreground 위치 콜백이 겹쳐도 읽기→기록 과정이 섞이지 않게 직렬화합니다.
// 단, foreground와 OS 헤드리스 태스크는 서로 다른 JS 컨텍스트라 이 큐를 공유할 수 없습니다.
// AsyncStorage에는 compare-and-set 같은 원자 연산이 없어 두 경로가 정확히 같은 순간에 실행되면
// 중복을 100% 차단할 수는 없으며, 서버 또는 네이티브 원자 저장소가 생기면 그때 보완합니다.
let claimQueue: Promise<void> = Promise.resolve();

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

/**
 * 오늘 처음 알림을 보내는 장소일 때만 true를 반환하고 즉시 기록합니다.
 * foreground 콜백이 연달아 실행되는 경우의 중복 발송을 막기 위해 확인과 저장을 한 흐름으로 묶습니다.
 */
export async function claimNotificationForToday(placeId: number): Promise<boolean> {
  let claimed = false;

  const task = claimQueue.then(async () => {
    const current = await readNotifiedToday();
    if (current.placeIds.includes(placeId)) return;

    current.placeIds.push(placeId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    claimed = true;
  });

  claimQueue = task.catch(() => {});
  await task;
  return claimed;
}

/**
 * OS 알림 전송이 실패한 경우에만 선점했던 오늘 기록을 되돌려 다음 위치 확인 때 재시도하게 한다.
 */
export async function releaseNotificationClaimForToday(placeId: number) {
  const task = claimQueue.then(async () => {
    const current = await readNotifiedToday();
    if (!current.placeIds.includes(placeId)) return;

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, placeIds: current.placeIds.filter((id) => id !== placeId) }),
    );
  });

  claimQueue = task.catch(() => {});
  await task;
}
