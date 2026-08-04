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
    padding: 20,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
  },
  label: {
    color: Colors.onboarding.lightText,
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  unit: {
    fontSize: 18,
    fontWeight: '700',
  },
});
