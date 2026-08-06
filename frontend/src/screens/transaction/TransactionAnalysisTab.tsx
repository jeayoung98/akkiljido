import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AsyncStateView } from '@/components/common/AsyncStateView';
import SegmentedControl from '@/components/common/segmented-control/SegmentedControl';
import { AnalysisCard } from '@/components/transaction/AnalysisCard';
import { AnalysisLegend, type AnalysisLegendItem } from '@/components/transaction/AnalysisLegend';
import { MonthPicker } from '@/components/transaction/MonthPicker';
import { PieChart } from '@/components/transaction/PieChart';
import { getCategoryColorByName } from '@/constants/categories';
import Colors from '@/constants/Colors';
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

const PLACE_ICON_BY_NAME: Record<string, keyof typeof Ionicons.glyphMap> = {
  회사: 'business',
  집: 'home',
  학교: 'school',
};

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
        /*
         * 색은 categoryId가 아니라 categoryName으로 찾습니다.
         * categoryId는 "내 카테고리"라 계정별로 발급돼서 프론트 상수(constants/categories.ts의 1~11)와
         * 값이 다를 수 있고, 그때 id로 찾으면 모든 조각이 기타 색 하나로 뭉쳐 보입니다.
         */
        color: getCategoryColorByName(item.name),
      }));
    }

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      percent: item.percent,
      // 장소 분석은 고정 색이 없어 비율 기반 초록색을 쓰고, 색 점 대신 장소 아이콘을 보여줍니다.
      icon: (
        <Ionicons
          color={Colors.light.textSecondary}
          name={PLACE_ICON_BY_NAME[item.name] ?? 'location'}
          size={14}
        />
      ),
    }));
  }, [activeQuery.analysis, isCategoryMode]);

  // PieChart는 id·percent·color만 쓰므로 범례 항목에서 필요한 값만 넘깁니다.
  const chartData = useMemo(
    () => legendItems.map((item) => ({ id: item.id, percent: item.percent, color: item.color })),
    [legendItems],
  );

  return (
    <View style={styles.container}>
      <MonthPicker month={month} onNext={onNextMonth} onPrev={onPreviousMonth} />
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
