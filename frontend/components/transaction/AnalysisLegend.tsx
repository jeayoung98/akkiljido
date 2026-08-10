import type { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import { getAnalysisColor } from '@/components/transaction/analysisColors';
import Colors from '@/constants/Colors';

export type AnalysisLegendItem = {
  /**
   * PieChart의 id와 같은 값을 넣어주면, 같은 항목을 안정적으로 식별할 수 있습니다.
   * 카테고리 분석은 categoryId, 장소 분석은 placeId로 API 필드명이 서로 달라서 id로 통일했습니다.
   */
  id: string | number;
  /** 카테고리 분석은 categoryName, 장소 분석은 myPlaceName을 여기에 매핑해서 넣어주세요. */
  name: string;
  percent: number;
  /** 없으면 금액 없이 퍼센트·이름만 표시합니다. */
  amount?: number;
  /** 장소 분석처럼 색 점 대신 이모지 등 다른 아이콘을 쓰고 싶을 때 전달합니다. */
  icon?: ReactNode;
  /** 카테고리 분석에서는 PieChart와 동일한 공통 카테고리 색을 전달합니다. */
  color?: string;
};

type AnalysisLegendProps = {
  items: AnalysisLegendItem[];
  style?: StyleProp<ViewStyle>;
};

/**
 * 분석 탭에서 PieChart 아래에 "37% 식비 182,000원"처럼 항목을 나열하는 범례입니다.
 * 카테고리 분석은 PieChart와 동일한 color를 받아 점 색을 맞추고,
 * 장소 분석처럼 color가 없으면 비율 기반 초록색을 사용합니다.
 */
export function AnalysisLegend({ items, style }: AnalysisLegendProps) {
  const maxPercent = Math.max(0, ...items.map((item) => item.percent));

  return (
    <View style={style}>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.leading}>
            {/* icon을 따로 넘기지 않으면 PieChart와 같은 규칙으로 색 점을 그립니다. */}
            {item.icon ?? <View style={[styles.dot, { backgroundColor: item.color ?? getAnalysisColor(item.percent, maxPercent) }]} />}
            <Text numberOfLines={1} style={styles.percent}>{item.percent}%</Text>
            <Text numberOfLines={1} style={styles.name}>
              {item.name}
            </Text>
          </View>
          {item.amount !== undefined ? (
            <Text style={styles.amount}>{item.amount.toLocaleString('ko-KR')}원</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  leading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  percent: {
    // "100%"(4자)까지도 줄바꿈 없이 들어가도록 여유를 둔다. 폭이 좁으면(예: 34) "100%"에서만
    // 퍼센트 기호가 다음 줄로 밀려 내려가 보이는 문제가 있었다.
    width: 40,
    color: Colors.light.cardTitle,
    fontSize: 13,
    fontWeight: '700',
  },
  name: {
    flexShrink: 1,
    color: Colors.light.cardBodyText,
    fontSize: 13,
  },
  amount: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
