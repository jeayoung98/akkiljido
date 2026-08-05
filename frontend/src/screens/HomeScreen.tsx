import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { SaveAlarmModal, type AlarmFormValue } from '@/components/common/modal/SaveAlarmModal';
import { IconButton } from '@/components/common/button/IconButton';
import { CategorySummaryCard } from '@/components/home/CategorySummaryCard';
import { NearbyWeekSpendingCard } from '@/components/home/NearbyWeekSpendingCard';
import { TodaySpendingCard } from '@/components/home/TodaySpendingCard';
import { ReportModal } from '@/components/report/ReportModal';
import { ReportRecommendationsModal } from '@/components/report/RecommendModal';
import Colors from '@/constants/Colors';
import { useShowOncePerPeriod } from '@/hooks/useShowOncePerPeriod';
import { mockCategorySummaryResponse, mockRecentExpensesResponse, MOCK_TODAY_EXPENSE } from '@/mocks/home';
import { MOCK_WEEKLY_REPORT, MOCK_WEEKLY_REPORT_RECOMMENDATIONS } from '@/mocks/report';
import { useDevModeStore } from '@/store/devModeStore';
import { useNotificationStore } from '@/store/notificationStore';
import { getWeekIdentifier } from '@/utils/reportSchedule';

const LAST_SHOWN_WEEK_STORAGE_KEY = 'report:lastShownWeek';

const NICKNAME = 'Dust';

/**
 * 홈 탭 화면입니다. 상단(인사말+알림)과 오늘 지출액 카드는 초록 배경 안에, 그 아래 두 카드
 * (내 주변 7일간 지출, 카테고리별 지출)는 흰 배경 안에 둬서 두 영역을 시각적으로 구분합니다.
 * 데이터는 전부 mocks/home.ts에서 가져오며, 그중 "오늘 지출액"은 API가 아직 없어 임시 값입니다.
 * 알림 뱃지 개수는 store/notificationStore.ts의 안 읽은 알림 수를 그대로 씁니다.
 */
export default function HomeScreen() {
  // 이번 주에 처음 홈 화면에 들어온 경우에만 true가 되고, 저장까지 자동으로 끝난다.
  const weekIdentifier = getWeekIdentifier();
  const shouldShowWeeklyReport = useShowOncePerPeriod(LAST_SHOWN_WEEK_STORAGE_KEY, weekIdentifier);
  const [reportVisible, setReportVisible] = useState(false);
  const [recommendVisible, setRecommendVisible] = useState(false);
  const [saveAlarmVisible, setSaveAlarmVisible] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmFormValue | null>(null);
  const isDevMode = useDevModeStore((state) => state.isDevMode);

  // TRACE: 임시 디버그 로그. 원인 확인 후 제거합니다.
  useEffect(() => {
    console.log('[TRACE] HomeScreen saveAlarmVisible changed:', saveAlarmVisible);
  }, [saveAlarmVisible]);

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

  const categories = mockCategorySummaryResponse().data.categories;
  const nearbyExpenses = mockRecentExpensesResponse().data;
  const unreadNotificationCount = useNotificationStore(
    (state) => state.notifications.filter((item) => !item.read).length
  );

  return (
    <AppScreen backgroundColor={Colors.light.primary}>
      {/* 인사말+알림 영역은 스크롤 밖에 고정해서, 아래 내용을 스크롤해도 항상 화면 위에 남는다. */}
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <Image source={require('@/assets/images/profile-icon.png')} style={styles.profileIcon} />
          <Text style={styles.greeting}>안녕하세요, {NICKNAME}님</Text>
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
          <TodaySpendingCard amount={MOCK_TODAY_EXPENSE} />
        </View>

        {/* 오늘 지출액 카드까지만 초록 배경이고, 그 아래부터는 흰 배경으로 이어진다. */}
        <View style={styles.body}>
          <NearbyWeekSpendingCard places={nearbyExpenses.placeList} totalAmount={nearbyExpenses.totalAmount} />
          <CategorySummaryCard categories={categories} onPressMore={() => router.push('/list?tab=analysis')} />
        </View>
      </ScrollView>

      <ReportModal
        visible={reportVisible}
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
        visible={recommendVisible}
      />

      {selectedAlarm ? (
        <SaveAlarmModal
          initialValue={selectedAlarm}
          onClose={() => setSaveAlarmVisible(false)}
          onReopenAfterLocationPicked={() => {
            console.log('[TRACE] HomeScreen onReopenAfterLocationPicked called');
            setSaveAlarmVisible(true);
          }}
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
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
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
    color: '#FFFFFF',
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
