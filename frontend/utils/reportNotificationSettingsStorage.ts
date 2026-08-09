import AsyncStorage from '@react-native-async-storage/async-storage';

// 주간·월간 소비 리포트 알림 on/off는 서버 API가 아직 없어서(필드 미정), 위치 알림 목록
// (notificationPlaceStorage.ts)과 같은 방식으로 AsyncStorage를 데이터 원본으로 삼는다.
// 서버 필드가 정해지면 이 저장소는 API 호출로 교체하면 된다.
const STORAGE_KEY = 'notification:reportSettings';

export type ReportNotificationSettings = {
  weeklyReport: boolean;
  monthlyReport: boolean;
};

const DEFAULT_SETTINGS: ReportNotificationSettings = {
  weeklyReport: true,
  monthlyReport: true,
};

export async function loadReportNotificationSettings(): Promise<ReportNotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<ReportNotificationSettings>;
    return {
      weeklyReport: parsed.weeklyReport ?? DEFAULT_SETTINGS.weeklyReport,
      monthlyReport: parsed.monthlyReport ?? DEFAULT_SETTINGS.monthlyReport,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveReportNotificationSettings(settings: ReportNotificationSettings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    // 저장 공간 부족 등으로 실패해도 설정 화면이 중단되지는 않게 두되, 원인 파악을 위해 로그는 남깁니다.
    console.error('[notification] report settings save failed', error);
  }
}
