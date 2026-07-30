import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import BaseCard from '@/components/common/card/BaseCard';
import Colors from '@/constants/Colors';

export type MetricCardProps = {
  label: string;
  value: string;
  /** 원처럼 값 옆에 표시할 단위입니다. */
  unit?: string;
  /** 날짜나 집계 기간처럼 값 아래에 표시할 선택적 보조 정보입니다. */
  caption?: string;
  /** 홈은 왼쪽, 리포트 요약은 가운데처럼 화면에 맞춰 정렬합니다. */
  align?: 'left' | 'center';
  /** 카드 구조는 유지하면서 배경과 텍스트 색상만 변경합니다. */
  tone?: 'primary' | 'info';
  style?: StyleProp<ViewStyle>;
};

/**
 * 라벨, 강조 값, 단위와 선택적 보조 문구를 표시하는 요약 카드입니다.
 * 정렬과 색상 유형을 props로 받아 홈과 리포트 화면에서 같은 구조를 재사용합니다.
 */
export default function MetricCard({
  label,
  value,
  unit,
  caption,
  align = 'left',
  tone = 'primary',
  style,
}: MetricCardProps) {
  const isCentered = align === 'center';
  const isInfoTone = tone === 'info';

  return (
    <BaseCard
      style={[
        styles.card,
        isInfoTone ? styles.infoCard : styles.primaryCard,
        isCentered && styles.centered,
        style,
      ]}>
      <Text style={[styles.label, isInfoTone ? styles.infoLabel : styles.primaryLabel]}>{label}</Text>

      <View style={[styles.valueRow, isCentered && styles.centeredValueRow]}>
        <Text style={[styles.value, isInfoTone ? styles.infoValue : styles.primaryValue]}>{value}</Text>
        {/* 단위가 전달된 경우에만 핵심 값 옆에 표시합니다. */}
        {unit ? (
          <Text style={[styles.unit, isInfoTone ? styles.infoValue : styles.primaryValue]}>{unit}</Text>
        ) : null}
      </View>

      {/* 날짜 등 보조 정보는 필요한 카드에서만 표시합니다. */}
      {caption ? <Text style={[styles.caption, isInfoTone && styles.infoCaption]}>{caption}</Text> : null}
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 94,
    justifyContent: 'center',
  },
  primaryCard: {
    // 홈 상단 초록 배경이 비치도록 지정 색상(#315F3D)에 투명도를 적용합니다.
    backgroundColor: Colors.light.summaryPrimaryBackground,
  },
  infoCard: {
    backgroundColor: Colors.light.summaryInfoBackground,
  },
  centered: {
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  primaryLabel: {
    color: Colors.light.summaryPrimaryLabel,
  },
  infoLabel: {
    color: Colors.light.summaryInfoLabel,
  },
  valueRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  centeredValueRow: {
    justifyContent: 'center',
  },
  value: {
    fontSize: 34,
    fontWeight: '800',
  },
  unit: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryValue: {
    color: Colors.light.summaryPrimaryText,
  },
  infoValue: {
    color: Colors.light.summaryInfoText,
  },
  caption: {
    marginTop: 6,
    color: Colors.light.summaryPrimaryLabel,
    fontSize: 11,
  },
  infoCaption: {
    color: Colors.light.summaryInfoCaption,
  },
});
