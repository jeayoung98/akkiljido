import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { IconButton } from '@/components/common/button/IconButton';
import { CategorySummaryCard } from '@/components/home/CategorySummaryCard';
import { NearbyWeekSpendingCard } from '@/components/home/NearbyWeekSpendingCard';
import { TodaySpendingCard } from '@/components/home/TodaySpendingCard';
import Colors from '@/constants/Colors';
import { mockCategorySummaryResponse, mockRecentExpensesResponse, MOCK_TODAY_EXPENSE } from '@/mocks/home';
import { useNotificationStore } from '@/store/notificationStore';

const NICKNAME = 'Dust';

/**
 * 홈 탭 화면입니다. 상단(인사말+알림)과 오늘 지출액 카드는 초록 배경 안에, 그 아래 두 카드
 * (내 주변 7일간 지출, 카테고리별 지출)는 흰 배경 안에 둬서 두 영역을 시각적으로 구분합니다.
 * 데이터는 전부 mocks/home.ts에서 가져오며, 그중 "오늘 지출액"은 API가 아직 없어 임시 값입니다.
 * 알림 뱃지 개수는 store/notificationStore.ts의 안 읽은 알림 수를 그대로 씁니다.
 */
export default function HomeScreen() {
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
