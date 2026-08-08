import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { SaveAlarmModal, type AlarmFormValue } from '@/components/common/modal/SaveAlarmModal';
import { IconButton } from '@/components/common/button/IconButton';
import { CategorySummaryCard } from '@/components/home/CategorySummaryCard';
import { NearbyWeekSpendingCard } from '@/components/home/NearbyWeekSpendingCard';
import { TodaySpendingCard } from '@/components/home/TodaySpendingCard';
import type { LatLng } from '@/components/map/KakaoMap';
import { ReportModal } from '@/components/report/ReportModal';
import { ReportRecommendationsModal } from '@/components/report/RecommendModal';
import Colors from '@/constants/Colors';
import { useShowOncePerPeriod } from '@/hooks/useShowOncePerPeriod';
import type { CategorySummaryItem, NearbyExpensePlace } from '@/mocks/home';
import { MOCK_WEEKLY_REPORT, MOCK_WEEKLY_REPORT_RECOMMENDATIONS } from '@/mocks/reportModal';
import { getTodayExpenseAmount } from '@/src/api/calendarApi';
import { getCategorySummary, getRecentExpenses } from '@/src/api/homeApi';
import { useDevModeStore } from '@/store/devModeStore';
import { useNotificationStore } from '@/store/notificationStore';
import { getWeekIdentifier } from '@/utils/reportSchedule';

const LAST_SHOWN_WEEK_STORAGE_KEY = 'report:lastShownWeek';

const NICKNAME = 'Dust';

/**
 * 홈 탭 화면입니다. 상단(인사말+알림)과 오늘 지출액 카드는 초록 배경 안에, 그 아래 두 카드
 * (내 주변 7일간 지출, 카테고리별 지출)는 흰 배경 안에 둬서 두 영역을 시각적으로 구분합니다.
 * 데이터는 전부 src/api/에서 실제 API로 가져옵니다. "오늘 지출액"은 전용 API가 없어서
 * 캘린더 day API(오늘 날짜)를 재사용하고, transactionList에서 지출만 합산합니다.
 * 알림 뱃지 개수는 store/notificationStore.ts의 안 읽은 알림 수를 그대로 씁니다.
 */
export default function HomeScreen() {
  const [categories, setCategories] = useState<CategorySummaryItem[]>([]);
  const [todayExpense, setTodayExpense] = useState(0);
  const [nearbyExpenses, setNearbyExpenses] = useState<{ totalAmount: number; placeList: NearbyExpensePlace[] }>({
    totalAmount: 0,
    placeList: [],
  });
  // 위치는 여기서 한 번만 조회해서 API 호출(recent-expenses)과 NearbyWeekSpendingCard의 지도 중심에
  // 똑같이 쓴다. 카드가 따로 또 조회하면 권한 팝업이 중복되고, API가 쓴 위치랑 지도 중심이 어긋날 수 있다.
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  // 이번 주에 처음 홈 화면에 들어온 경우에만 true가 되고, 저장까지 자동으로 끝난다.
  const weekIdentifier = getWeekIdentifier();
  const shouldShowWeeklyReport = useShowOncePerPeriod(LAST_SHOWN_WEEK_STORAGE_KEY, weekIdentifier);
  const [reportVisible, setReportVisible] = useState(false);
  const [recommendVisible, setRecommendVisible] = useState(false);
  const [saveAlarmVisible, setSaveAlarmVisible] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmFormValue | null>(null);
  const isDevMode = useDevModeStore((state) => state.isDevMode);

  // ReportModal·RecommendModal·SaveAlarmModal은 각각 별도의 네이티브 Modal(안드로이드에서는 별도의
  // Dialog 창)이라, 여러 개가 동시에 진짜로 visible=true면 안드로이드가 어떤 걸 맨 위에 그릴지
  // 보장해주지 않는다 — 특히 한 번 닫혔다가 다시 열린 모달이 이미 열려있던 다른 모달보다 뒤로
  // 밀리는 경우가 있다(지도에서 돌아와 SaveAlarmModal이 다시 열릴 때 실제로 이 문제가 있었다).
  // "논리적으로 열려있는 상태"(reportVisible 등)는 그대로 두고, 실제 네이티브 Modal에 넘기는
  // visible 값만 "이 모달보다 위에 아무것도 없을 때"로 계산해서, 항상 최대 하나의 네이티브
  // Modal만 진짜로 보이게 한다. 뒤로 가면(더 위의 모달이 닫히면) 자동으로 그 아래 모달이 다시
  // "진짜로" 보이기 시작하므로, 각 모달을 닫고 여는 기존 로직은 전혀 건드리지 않아도 된다.
  const reportModalVisible = reportVisible && !recommendVisible && !saveAlarmVisible;
  const recommendModalVisible = recommendVisible && !saveAlarmVisible;

  useEffect(() => {
    if (shouldShowWeeklyReport) {
      setReportVisible(true);
    }
  }, [shouldShowWeeklyReport]);

  // 개발자 모드일 때는 AsyncStorage 기반 1회 표시 제한을 무시하고, 홈 화면에 포커스가 올 때마다
  // 리포트를 다시 띄운다. 탭은 전환해도 언마운트되지 않아서 focus 이벤트로 "재진입"을 감지한다.
  useFocusEffect(
    useCallback(() => {
      if (isDevMode) {
        setReportVisible(true);
      }
    }, [isDevMode]),
  );

  const unreadNotificationCount = useNotificationStore(
    (state) => state.notifications.filter((item) => !item.read).length
  );

  // 실패하면(네트워크 오류, 인증 만료 등) 그냥 빈 상태로 두고 콘솔에만 남긴다 — 이번 달 지출이
  // 없을 때 보여주는 빈 상태 문구를 그대로 재사용하는 셈이라 화면이 깨지진 않는다.
  // 탭은 전환해도 언마운트되지 않아서 마운트 시 한 번만 불러오면, 거래내역 화면에서 거래를
  // 추가/수정/삭제하고 돌아와도 반영이 안 된다(그 화면의 react-query 캐시 무효화가 이 값까지는
  // 안 미침). useFocusEffect로 홈 화면에 다시 포커스될 때마다 새로 불러와서 항상 최신 값이 보이게 한다.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const summary = await getCategorySummary();
          console.info('[home] category-summary success', summary);
          setCategories(summary.categories);
        } catch (error) {
          console.error('[home] category-summary failed', error);
        }
      })();
    }, []),
  );

  // 전용 API가 없어서 캘린더 day API(오늘 날짜)를 재사용한다. 자세한 이유는 calendarApi.ts 참고.
  // 위와 같은 이유로 useFocusEffect를 쓴다.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const amount = await getTodayExpenseAmount();
          console.info('[home] today-expense success', amount);
          setTodayExpense(amount);
        } catch (error) {
          console.error('[home] today-expense failed', error);
        }
      })();
    }, []),
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationUnavailable(true);
        return;
      }
      try {
        const position = await Location.getCurrentPositionAsync({});
        setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      } catch {
        setLocationUnavailable(true);
      }
    })();
  }, []);

  // recent-expenses는 latitude/longitude가 필수 파라미터라서, 위치를 확보한 뒤에만 호출한다.
  // 다른 두 조회와 같은 이유로 useFocusEffect를 쓴다 — 거래내역에서 위치 포함 거래를 추가하고
  // 돌아오면 지도 마커도 바로 반영돼야 한다.
  useFocusEffect(
    useCallback(() => {
      if (!currentLocation) return;

      (async () => {
        try {
          const recentExpenses = await getRecentExpenses(currentLocation.lat, currentLocation.lng);
          console.info('[home] recent-expenses success', recentExpenses);
          setNearbyExpenses(recentExpenses);
        } catch (error) {
          console.error('[home] recent-expenses failed', error);
        }
      })();
    }, [currentLocation]),
  );

  return (
    <AppScreen backgroundColor={Colors.light.primary}>
      {/* 인사말+알림 영역은 스크롤 밖에 고정해서, 아래 내용을 스크롤해도 항상 화면 위에 남는다. */}
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <Image source={require('@/assets/images/profile-icon.png')} style={styles.profileIcon} />
          <View>
            <Text style={styles.greeting}>안녕하세요, {NICKNAME}님</Text>
            <Text style={styles.greetingSubtitle}>오늘도 함께 알뜰하게!</Text>
          </View>
        </View>

        <View>
          <IconButton
            color="#FFFFFF"
            name="notification"
            onPress={() => router.push('/notifications')}
            size={24}
          />
          {unreadNotificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotificationCount}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topContent}>
          <TodaySpendingCard amount={todayExpense} />
        </View>

        {/* 오늘 지출액 카드까지만 초록 배경이고, 그 아래부터는 흰 배경으로 이어진다. */}
        <View style={styles.body}>
          <NearbyWeekSpendingCard
            currentLocation={currentLocation}
            locationUnavailable={locationUnavailable}
            places={nearbyExpenses.placeList}
            totalAmount={nearbyExpenses.totalAmount}
          />
          <CategorySummaryCard categories={categories} onPressMore={() => router.push('/list?tab=analysis')} />
        </View>
      </ScrollView>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportVisible(false)}
        data={MOCK_WEEKLY_REPORT}
        onViewRecommendations={() => {
          // ReportModal은 계속 visible로 두고, 그 위에 RecommendModal만 새로 연다(스택 유지, 번쩍임 방지).
          setRecommendVisible(true);
        }}
      />

      <ReportRecommendationsModal
        onClose={() => {
          // 배경 탭/닫기: 흐름을 완전히 끝내는 동작이라 이때만 둘 다 닫는다.
          setRecommendVisible(false);
          setReportVisible(false);
        }}
        onConfirm={() => {
          setRecommendVisible(false);
          setReportVisible(false);
        }}
        onPrev={() => {
          // ReportModal은 이미 visible 상태 그대로였으므로 RecommendModal만 닫으면 된다.
          setRecommendVisible(false);
        }}
        onSelectRecommendation={(rec) => {
          // RecommendModal은 계속 visible로 두고, 그 위에 SaveAlarmModal만 새로 연다.
          setSelectedAlarm(rec.alarm);
          setSaveAlarmVisible(true);
        }}
        recommendations={MOCK_WEEKLY_REPORT_RECOMMENDATIONS}
        visible={recommendModalVisible}
      />

      {selectedAlarm ? (
        <SaveAlarmModal
          initialValue={selectedAlarm}
          onClose={() => setSaveAlarmVisible(false)}
          onReopenAfterLocationPicked={() => setSaveAlarmVisible(true)}
          onSave={() => {
            // TODO: 실제 알림 저장 API 연결. 지금은 SaveAlarmModal만 닫는다.
            setSaveAlarmVisible(false);
          }}
          visible={saveAlarmVisible}
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  profileIcon: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  greeting: {
    color: Colors.onboarding.inverseText,
    fontSize: 17,
    fontWeight: '700',
  },
  greetingSubtitle: {
    marginTop: 2,
    color: Colors.onboarding.lightText,
    fontSize: 12,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.danger,
  },
  badgeText: {
    color: Colors.onboarding.inverseText,
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
  },
  topContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  body: {
    flexGrow: 1,
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    gap: 24,
  },
});
