import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/common/typography/Text';
import Colors from '@/constants/Colors';

type TodaySpendingCardProps = {
  amount: number;
};

/** 홈 초록 배경 위에서 오늘 지출 합계와 거래 목록 이동을 제공하는 요약 카드입니다. */
export function TodaySpendingCard({ amount }: TodaySpendingCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.label}>오늘 지출액</Text>
        <Text style={styles.amount}>
          {amount.toLocaleString('ko-KR')} <Text style={styles.unit}>원</Text>
        </Text>
      </View>

      {/* 넓은 화면에서도 카드의 목적을 명확히 보여주는 거래 목록 이동 버튼입니다. */}
      <Pressable
        accessibilityLabel="거래 내역 보기"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.push('/list')}
        style={({ pressed }) => [styles.listButton, pressed && styles.listButtonPressed]}>
        <Ionicons color={Colors.light.cardAccent} name="chevron-forward" size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    // 홈 배경보다 한 단계만 밝게 보여 기존 반투명 요약 카드 톤을 유지한다.
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  content: {
    flex: 1,
  },
  label: {
    color: Colors.onboarding.lightText,
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    marginTop: 6,
    color: Colors.onboarding.inverseText,
    fontSize: 30,
    fontWeight: '800',
  },
  unit: {
    fontSize: 18,
    fontWeight: '700',
  },
  listButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.light.inputBackground,
  },
  listButtonPressed: {
    opacity: 0.7,
  },
});
