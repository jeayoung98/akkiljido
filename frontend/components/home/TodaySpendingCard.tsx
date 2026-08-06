import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';

type TodaySpendingCardProps = {
  amount: number;
};

export function TodaySpendingCard({ amount }: TodaySpendingCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>오늘 지출액</Text>
      <Text style={styles.amount}>
        {amount.toLocaleString('ko-KR')} <Text style={styles.unit}>원</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    // 이 카드는 초록 헤더와 흰 배경 경계에 걸치도록 배치되므로, 배경에 따라 색이 달라 보이지
    // 않게 불투명한 흰 배경으로 둔다.
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  label: {
    color: Colors.light.cardDescription,
    fontSize: 13,
    fontWeight: '600',
  },
  amount: {
    marginTop: 6,
    color: Colors.light.cardTitle,
    fontSize: 24,
    fontWeight: '800',
  },
  unit: {
    fontSize: 15,
    fontWeight: '700',
  },
});
