import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import SegmentedControl from '@/components/common/segmented-control/SegmentedControl';
import { AnalysisCard } from '@/components/transaction/AnalysisCard';
import { AnalysisLegend } from '@/components/transaction/AnalysisLegend';
import { EmptyState } from '@/components/transaction/EmptyState';
import { MonthPicker } from '@/components/transaction/MonthPicker';
import { PieChart } from '@/components/transaction/PieChart';
import { getCategoryColorById } from '@/constants/categories';
import Colors from '@/constants/Colors';
import { getMockPlaceAnalysis, MOCK_TRANSACTIONS } from '@/mocks/transactionViewData';

export type AnalysisMode = 'category' | 'place';

type TransactionAnalysisTabProps = {
  month: Date;
  mode: AnalysisMode;
  onChangeMode: (mode: AnalysisMode) => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
};

const MODE_OPTIONS = [
  { label: '카테고리 분석', value: 'category' },
  { label: '장소 분석', value: 'place' },
] as const;

const PLACE_ICON_BY_NAME: Record<string, keyof typeof Ionicons.glyphMap> = {
  회사: 'business',
  집: 'home',
  학교: 'school',
};

/** 소비 데이터를 카테고리·장소 기준으로 시각화하는 분석 탭입니다. */
export function TransactionAnalysisTab({
  month,
  mode,
  onChangeMode,
  onNextMonth,
  onPreviousMonth,
}: TransactionAnalysisTabProps) {
  const analysisData = useMemo(() => {
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    const expenses = MOCK_TRANSACTIONS.filter(
      (record) => record.type === 'expense' && record.datetime.slice(0, 7) === monthKey,
    );
    const totalAmount = expenses.reduce((sum, record) => sum + record.amount, 0);
    const categoryTotals = new Map<string, { categoryId: number; amount: number }>();

    for (const record of expenses) {
      const current = categoryTotals.get(record.categoryName) ?? { categoryId: record.categoryId, amount: 0 };
      current.amount += record.amount;
      categoryTotals.set(record.categoryName, current);
    }

    const categories = Array.from(categoryTotals.entries())
      .map(([name, { categoryId, amount }]) => ({
        id: categoryId,
        name,
        amount,
        percent: totalAmount === 0 ? 0 : Math.round((amount / totalAmount) * 100),
        // 카테고리 분석은 지도·아이콘과 같은 categoryId 팔레트 색을 씁니다.
        color: getCategoryColorById(categoryId, name),
      }))
      .sort((left, right) => right.amount - left.amount);

    return { totalAmount, categories };
  }, [month]);

  const placeItems = useMemo(() => {
    if (analysisData.totalAmount === 0) return [];

    return getMockPlaceAnalysis().map((item) => ({
      id: item.placeId,
      name: item.myPlaceName,
      amount: item.amount,
      percent: item.percent,
      icon: (
        <Ionicons
          color={Colors.light.textSecondary}
          name={PLACE_ICON_BY_NAME[item.myPlaceName] ?? 'location'}
          size={14}
        />
      ),
    }));
  }, [analysisData.totalAmount]);

  const activeItems = mode === 'category' ? analysisData.categories : placeItems;
  const emptyMessage = mode === 'category' ? '해당 월 소비 내역이 없습니다.' : '등록한 장소 주변 소비 내역이 없습니다.';

  return (
    <View style={styles.container}>
      <MonthPicker month={month} onNext={onNextMonth} onPrev={onPreviousMonth} />
      <SegmentedControl onChange={onChangeMode} options={MODE_OPTIONS} value={mode} />

      <AnalysisCard amount={analysisData.totalAmount} label={mode === 'category' ? '이달 총 소비' : '내 장소별 소비'}>
        {activeItems.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <>
            <View style={styles.chartRow}><PieChart data={activeItems} /></View>
            <AnalysisLegend items={activeItems} style={styles.legendSpacing} />
            {/* 장소 분석 안내는 차트·범례 아래에 두어 카테고리 분석과 본문 시작 위치를 맞춥니다. */}
            {mode === 'place' ? (
              <Text style={styles.placeDescription}>
                등록한 장소 주변 소비만 묶고, 범위 밖 소비는 기타로 분류했어요.
              </Text>
            ) : null}
          </>
        )}
      </AnalysisCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14, padding: 16 },
  chartRow: { alignItems: 'center' },
  legendSpacing: { marginTop: 16 },
  placeDescription: { marginTop: 20, color: Colors.light.textSecondary, fontSize: 12, lineHeight: 18 },
});
