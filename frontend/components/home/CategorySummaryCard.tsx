import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/transaction/CategoryIcon';
import { getCategoryColorById } from '@/constants/categories';
import Colors from '@/constants/Colors';
import type { CategorySummaryItem } from '@/mocks/home';

type CategorySummaryCardProps = {
  categories: CategorySummaryItem[];
  onPressMore?: () => void;
};

// 서버 값이 이상하게 와도(음수거나 100 초과) 막대가 화면 밖으로 넘치거나 안 보이지 않게 0~100으로 잘라낸다.
function clampPercent(percent: number) {
  return Math.max(0, Math.min(percent, 100));
}

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

      {/* 이번 달에 쓴 내역이 없어서 카테고리가 하나도 없는 경우, 빈 목록 대신 안내 문구를 보여준다. */}
      {categories.length === 0 ? (
        <Text style={styles.emptyText}>이번 달 지출 내역이 아직 없어요.</Text>
      ) : (
        categories.map((category, index) => {
          const categoryColor = getCategoryColorById(category.categoryId, category.categoryName);
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
                  <View
                    style={[
                      styles.barFill,
                      { width: `${clampPercent(category.percent)}%`, backgroundColor: categoryColor },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
  emptyText: {
    paddingVertical: 12,
    color: Colors.light.cardDescription,
    fontSize: 13,
    textAlign: 'center',
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
