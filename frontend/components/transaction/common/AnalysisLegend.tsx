import type { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { getAnalysisColor } from '@/components/transaction/common/analysisColors';
import Colors from '@/constants/Colors';

export type AnalysisLegendItem = {
  /**
   * PieChart의 id와 같은 값을 넣어주면, 같은 순서에서 항상 같은 색 점이 나옵니다.
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
};

type AnalysisLegendProps = {
  items: AnalysisLegendItem[];
  style?: StyleProp<ViewStyle>;
};

/**
 * 분석 탭에서 PieChart 아래에 "37% 식비 182,000원"처럼 항목을 나열하는 범례입니다.
 * items 배열의 순서를 PieChart에 넘긴 data 순서와 똑같이 맞춰서 써야, 인덱스 기반으로 배정하는
 * 점 색(getAnalysisColor)이 차트 조각 색과 어긋나지 않습니다.
 */
export function AnalysisLegend({ items, style }: AnalysisLegendProps) {
  return (
    <View style={style}>
      {items.map((item, index) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.leading}>
            {/* icon을 따로 넘기지 않으면 PieChart와 같은 규칙으로 색 점을 그립니다. */}
            {item.icon ?? <View style={[styles.dot, { backgroundColor: getAnalysisColor(index) }]} />}
            <Text style={styles.percent}>{item.percent}%</Text>
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
    width: 34,
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
