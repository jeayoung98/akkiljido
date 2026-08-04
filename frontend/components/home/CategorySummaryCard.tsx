import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import type { CategorySummaryItem } from '@/mocks/home';

type CategorySummaryCardProps = {
  categories: CategorySummaryItem[];
  onPressMore?: () => void;
};

/** 홈 화면의 "카테고리별 지출" 섹션. 이번 달 누적 기준 상위 4개(서버가 이미 top4로 잘라서 줌)를 막대그래프로 보여준다. */
export function CategorySummaryCard({ categories, onPressMore }: CategorySummaryCardProps) {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>카테고리별 지출</Text>
          <Text style={styles.subtitle}>이번 달 누적 기준</Text>
        </View>
        <Pressable hitSlop={8} onPress={onPressMore}>
          <Text style={styles.moreText}>더보기</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        {categories.map((category, index) => (
          <View key={category.categoryId} style={[styles.row, index > 0 && styles.rowSpacing]}>
            <View style={styles.rowHeader}>
              <Text style={styles.categoryName}>{category.categoryName}</Text>
              <Text style={styles.categoryAmount}>{category.amount.toLocaleString('ko-KR')}원</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(category.percent, 100)}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    color: Colors.light.cardTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: Colors.light.cardDescription,
    fontSize: 12,
  },
  moreText: {
    color: Colors.light.cardDescription,
    fontSize: 13,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  row: {},
  rowSpacing: {
    marginTop: 16,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryName: {
    color: Colors.light.cardBodyText,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryAmount: {
    color: Colors.light.cardTitle,
    fontSize: 14,
    fontWeight: '700',
  },
  barTrack: {
    marginTop: 8,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.cardMutedBackground,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.light.primary,
  },
});
