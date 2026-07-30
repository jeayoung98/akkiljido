import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import BaseCard from '@/components/common/card/BaseCard';

export type MetricCardProps = {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  align?: 'left' | 'center';
  tone?: 'primary' | 'info';
  style?: StyleProp<ViewStyle>;
};

/** 라벨, 큰 값, 단위와 선택적 보조 문구를 표시하는 공통 수치 카드입니다. */
export default function MetricCard({
  label,
  value,
  unit,
  caption,
  align = 'left',
  tone = 'primary',
  style,
}: MetricCardProps) {
  // 정렬과 색상 유형을 props로 받아 같은 구조를 홈과 리포트 화면에서 재사용합니다.
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
    backgroundColor: 'rgba(49, 95, 61, 0.45)',
  },
  infoCard: {
    backgroundColor: '#EEF3FF',
  },
  centered: {
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  primaryLabel: {
    color: '#DCECD7',
  },
  infoLabel: {
    color: '#8198C3',
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
    color: '#FFFFFF',
  },
  infoValue: {
    color: '#647AA5',
  },
  caption: {
    marginTop: 6,
    color: '#DCECD7',
    fontSize: 11,
  },
  infoCaption: {
    color: '#91A5CA',
  },
});
