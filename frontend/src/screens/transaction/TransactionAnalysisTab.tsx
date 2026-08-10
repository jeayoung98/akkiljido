import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import { AsyncStateView } from '@/components/common/AsyncStateView';
import SegmentedControl from '@/components/common/segmented-control/SegmentedControl';
import { AnalysisCard } from '@/components/transaction/AnalysisCard';
import { AnalysisLegend, type AnalysisLegendItem } from '@/components/transaction/AnalysisLegend';
import { MonthPicker } from '@/components/transaction/MonthPicker';
import { PieChart } from '@/components/transaction/PieChart';
import { getCategoryColorById } from '@/constants/categories';
import Colors, { categoryColors } from '@/constants/Colors';
import { useCategoryAnalysis, useMyPlaceAnalysis } from '@/hooks/useAnalysis';
import { toCalendarParams } from '@/src/api/calendarApi';

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

/**
 * 소비 데이터를 카테고리·장소 기준으로 시각화하는 분석 탭입니다.
 *
 * 모드에 따라 서로 다른 API를 씁니다(응답 모양은 같습니다).
 * - 카테고리 분석: GET /api/v1/analysis/category
 * - 장소 분석: GET /api/v1/analysis/my-place
 * 보고 있지 않은 모드는 요청하지 않고, 한 번 받아온 모드는 캐시에 남아 탭을 오갈 때 재요청하지 않습니다.
 */
export function TransactionAnalysisTab({
  month,
  mode,
  onChangeMode,
  onNextMonth,
  onPreviousMonth,
}: TransactionAnalysisTabProps) {
  const { year, month: monthNumber } = toCalendarParams(month);
  const isCategoryMode = mode === 'category';

  // 먼 미래까지 무한정 넘겨볼 수 있으면 의미가 없어서, 오늘로부터 3년 뒤 달까지만 이동을 허용한다.
  const today = new Date();
  const maxMonth = new Date(today.getFullYear() + 3, today.getMonth(), 1);
  const isAtMaxMonth = month.getFullYear() === maxMonth.getFullYear() && month.getMonth() === maxMonth.getMonth();

  const categoryQuery = useCategoryAnalysis(year, monthNumber, isCategoryMode);
  const placeQuery = useMyPlaceAnalysis(year, monthNumber, !isCategoryMode);
  const activeQuery = isCategoryMode ? categoryQuery : placeQuery;

  const legendItems = useMemo<AnalysisLegendItem[]>(() => {
    const { items } = activeQuery.analysis;

    if (isCategoryMode) {
      return items.map((item) => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        percent: item.percent,
        // categoryId는 계정별로 발급돼 프론트 상수(1~11)와 다를 수 있어서, 이름을 함께 넘겨 색을 찾습니다.
        color: getCategoryColorById(item.id, item.name),
      }));
    }

    // 장소 분석도 카테고리 분석처럼 항목마다 뚜렷이 구분되는 고정 색을 쓴다(비율 기반 초록
    // 그라데이션은 색 차이가 잘 안 보인다는 피드백이 있었다). 장소는 categoryId 같은 고정 id가
    // 없어서, 카테고리와 같은 팔레트(categoryColors)를 순서대로 돌려가며 배정한다.
    return items.map((item, index) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      percent: item.percent,
      color: categoryColors[index % categoryColors.length],
    }));
  }, [activeQuery.analysis, isCategoryMode]);

  // PieChart는 id·percent·color만 쓰므로 범례 항목에서 필요한 값만 넘깁니다.
  const chartData = useMemo(
    () => legendItems.map((item) => ({ id: item.id, percent: item.percent, color: item.color })),
    [legendItems],
  );

  return (
    <View style={styles.container}>
      <MonthPicker disableNext={isAtMaxMonth} month={month} onNext={onNextMonth} onPrev={onPreviousMonth} />
      <SegmentedControl onChange={onChangeMode} options={MODE_OPTIONS} value={mode} />

      <AnalysisCard
        amount={activeQuery.analysis.totalAmount}
        label={isCategoryMode ? '이달 총 소비' : '내 장소별 소비'}>
        <AsyncStateView
          emptyMessage={isCategoryMode ? '해당 월 소비 내역이 없습니다.' : '등록한 장소 주변 소비 내역이 없습니다.'}
          error={activeQuery.error}
          isEmpty={legendItems.length === 0}
          isLoading={activeQuery.isLoading}
          onRetry={activeQuery.refetch}>
          <View style={styles.chartRow}><PieChart data={chartData} /></View>
          <AnalysisLegend items={legendItems} style={styles.legendSpacing} />
          {/* 장소 분석 안내는 차트·범례 아래에 두어 카테고리 분석과 본문 시작 위치를 맞춥니다. */}
          {!isCategoryMode ? (
            <Text style={styles.placeDescription}>
              등록한 장소 주변 소비만 묶고, 범위 밖 소비는 기타로 분류했어요.
            </Text>
          ) : null}
        </AsyncStateView>
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
