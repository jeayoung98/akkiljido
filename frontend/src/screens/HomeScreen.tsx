import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { IconButton } from '@/components/common/button/IconButton';
import { CategorySummaryCard } from '@/components/home/CategorySummaryCard';
import { NearbyWeekSpendingCard } from '@/components/home/NearbyWeekSpendingCard';
import { TodaySpendingCard } from '@/components/home/TodaySpendingCard';
import type { LatLng } from '@/components/map/KakaoMap';
import Colors from '@/constants/Colors';
import { getTodayExpenseAmount } from '@/src/api/calendarApi';
import { getCategorySummary, getRecentExpenses } from '@/src/api/homeApi';
import type { CategorySummaryItem, NearbyExpensePlace } from '@/mocks/home';
import { useNotificationStore } from '@/store/notificationStore';

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
  const unreadNotificationCount = useNotificationStore(
    (state) => state.notifications.filter((item) => !item.read).length
  );

  // 실패하면(네트워크 오류, 인증 만료 등) 그냥 빈 상태로 두고 콘솔에만 남긴다 — 이번 달 지출이
  // 없을 때 보여주는 빈 상태 문구를 그대로 재사용하는 셈이라 화면이 깨지진 않는다.
  useEffect(() => {
    (async () => {
      try {
        const summary = await getCategorySummary();
        console.info('[home] category-summary success', summary);
        setCategories(summary.categories);
      } catch (error) {
        console.error('[home] category-summary failed', error);
      }
    })();
  }, []);

  // 전용 API가 없어서 캘린더 day API(오늘 날짜)를 재사용한다. 자세한 이유는 calendarApi.ts 참고.
  useEffect(() => {
    (async () => {
      try {
        const amount = await getTodayExpenseAmount();
        console.info('[home] today-expense success', amount);
        setTodayExpense(amount);
      } catch (error) {
        console.error('[home] today-expense failed', error);
      }
    })();
  }, []);

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
  useEffect(() => {
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
  }, [currentLocation]);

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
