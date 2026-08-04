import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/transaction/CategoryIcon';
import { getCategoryColorById } from '@/constants/categories';
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

      {categories.map((category, index) => {
        const categoryColor = getCategoryColorById(category.categoryId);
        return (
          <View key={category.categoryId} style={[styles.row, index > 0 && styles.rowSpacing]}>
            <View style={[styles.iconBadge, { backgroundColor: `${categoryColor}26` }]}>
              <CategoryIcon categoryId={category.categoryId} categoryName={category.categoryName} size={18} />
            </View>
            <View style={styles.rowInfo}>
              <View style={styles.rowHeader}>
                <Text style={styles.categoryName}>{category.categoryName}</Text>
                <Text style={styles.categoryAmount}>{category.amount.toLocaleString('ko-KR')}원</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(category.percent, 100)}%`, backgroundColor: categoryColor }]} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Colors.light.cardBackground,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowSpacing: {
    marginTop: 16,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
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
