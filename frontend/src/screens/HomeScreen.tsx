import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { IconButton } from '@/components/common/button/IconButton';
import { CategorySummaryCard } from '@/components/home/CategorySummaryCard';
import { NearbyWeekSpendingCard } from '@/components/home/NearbyWeekSpendingCard';
import { TodaySpendingCard } from '@/components/home/TodaySpendingCard';
import Colors from '@/constants/Colors';
import {
  mockCategorySummaryResponse,
  mockRecentExpensesResponse,
  MOCK_TODAY_EXPENSE,
  MOCK_UNREAD_NOTIFICATION_COUNT,
} from '@/mocks/home';

const NICKNAME = 'Dust';

export default function HomeScreen() {
  const categories = mockCategorySummaryResponse().data.categories;
  const nearbyExpenses = mockRecentExpensesResponse().data;

  return (
    <AppScreen backgroundColor={Colors.light.background} scrollable>
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <Ionicons color={Colors.light.primary} name="person-circle" size={32} />
          <Text style={styles.greeting}>안녕하세요, {NICKNAME}님</Text>
        </View>

        <View>
          <IconButton name="notification" size={24} />
          {MOCK_UNREAD_NOTIFICATION_COUNT > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{MOCK_UNREAD_NOTIFICATION_COUNT}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.content}>
        <TodaySpendingCard amount={MOCK_TODAY_EXPENSE} />
        <NearbyWeekSpendingCard places={nearbyExpenses.placeList} totalAmount={nearbyExpenses.totalAmount} />
        <CategorySummaryCard categories={categories} onPressMore={() => router.push('/list?tab=analysis')} />
      </View>
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
    gap: 8,
  },
  greeting: {
    color: Colors.light.cardTitle,
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
  content: {
    padding: 16,
    gap: 24,
  },
});
