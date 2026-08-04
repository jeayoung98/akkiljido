import type { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import BaseCard from '@/components/common/card/BaseCard';
import Colors from '@/constants/Colors';

type AnalysisCardProps = {
  /** "이달 총 소비"처럼 카드 상단에 표시할 제목입니다. API 응답엔 없는 화면 고정 문구라 prop으로 받습니다. */
  label: string;
  /** 분석 API 응답의 data.totalAmount를 그대로 넣어주면 됩니다. 콤마와 "원"을 붙여서 보여줍니다. */
  amount: number;
  /**
   * PieChart, AnalysisLegend 등 카드 안에 이어서 넣을 내용입니다. 없으면 헤더만 표시합니다.
   * 분석 API 응답의 data.categories 배열을 그 두 컴포넌트에 각각 넘겨서 이 자리에 children으로 넣는
   * 구조를 염두에 두고 만들었습니다(이 컴포넌트가 categories를 직접 알 필요는 없습니다).
   */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * 분석 탭에서 "이달 총 소비 490,000원"처럼 헤더를 보여주고, 그 아래에 PieChart·AnalysisLegend
 * 같은 내용을 이어서 담는 카드입니다. children이 없으면 헤더 줄만 있는 카드로도 쓸 수 있습니다.
 */
export function AnalysisCard({ label, amount, children, style }: AnalysisCardProps) {
  return (
    <BaseCard style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.amount}>{amount.toLocaleString('ko-KR')}원</Text>
      </View>
      {children ? <View style={styles.body}>{children}</View> : null}
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    // BaseCard 자체는 배경색만 있고 테두리/그림자가 없어서, 화면 배경이 카드와 같은 흰색이면
    // 경계가 안 보인다(TransactionDetailCard와 같은 이유). 옅은 그림자로 항상 카드처럼 보이게 한다.
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    color: Colors.light.cardTitle,
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    marginTop: 12,
  },
});
