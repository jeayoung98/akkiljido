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
    // 화면 배경(SafeArea)이 이제 이 카드랑 같은 초록색이라, 반투명 흰색을 덮어서
    // 배경보다 살짝 밝게 떠 보이게 하는 걸로 카드 경계를 구분한다.
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  label: {
    color: Colors.onboarding.lightText,
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    marginTop: 8,
    color: Colors.onboarding.inverseText,
    fontSize: 30,
    fontWeight: '800',
  },
  unit: {
    fontSize: 18,
    fontWeight: '700',
  },
});
