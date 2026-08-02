import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { Button } from '@/components/common/button/Button';
import { AppHeader } from '@/components/common/header/AppHeader';
import { CategoryIcon } from '@/components/transaction/common/CategoryIcon';
import { InfoRow } from '@/components/transaction/common/InfoRow';
import { TransactionDetailCard } from '@/components/transaction/common/TransactionDetailCard';
import Colors from '@/constants/Colors';
import { MOCK_TRANSACTIONS } from '@/mocks/transactions';

// "2026-07-17 09:12:00+09" → "2026.07.17"로 보여준다. 실제 API가 붙으면 여기만 바꾸면 된다.
function formatDate(datetime: string) {
  return datetime.slice(0, 10).replaceAll('-', '.');
}

// address는 등록 API 기준으로 "서울 강남구 역삼동"처럼 풀 주소가 온다. 상세 화면 "장소" 칸은
// 좁아서 풀 주소 대신 구 단위만 짧게 보여주고, "구"가 없는 값(온라인, - 등)은 그대로 보여준다.
function formatPlace(address: string) {
  return address.match(/[가-힣]+구/)?.[0] ?? address;
}

/**
 * 거래 상세 화면입니다. 지금은 백엔드 연결 전이라 GET /transactions/{id} 대신
 * 목업 배열에서 같은 모양으로 찾아서 보여줍니다. 수정/삭제도 실제 API 없이 화면 동작만 확인합니다.
 */
export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const transaction = MOCK_TRANSACTIONS.find((record) => String(record.transactionId) === id);

  if (!transaction) {
    return (
      <AppScreen backgroundColor={Colors.light.background}>
        <AppHeader showBackButton title="거래 상세" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>거래 내역을 찾을 수 없어요.</Text>
        </View>
      </AppScreen>
    );
  }

  const handleEdit = () => {
    // TODO: 수정 화면은 아직 없어서 임시 안내만 표시합니다.
    Alert.alert('수정', '수정 화면은 곧 연결될 예정이에요.');
  };

  const handleDelete = () => {
    // TODO: 삭제 확인 UI는 팀 공통 ConfirmModal(frontend/modal 브랜치, 아직 미병합)로
    // 나중에 교체 예정입니다. 지금은 화면 동작만 먼저 확인하기 위해 기본 Alert로 대체했습니다.
    Alert.alert('거래를 삭제할까요?', '삭제된 내역은 복구할 수 없어요.', [
      { style: 'cancel', text: '취소' },
      {
        style: 'destructive',
        text: '삭제',
        onPress: () => {
          // TODO: 실제 삭제 API 연결 전까지는 삭제된 것처럼 화면만 처리합니다.
          router.back();
        },
      },
    ]);
  };

  return (
    <AppScreen backgroundColor={Colors.light.background}>
      <AppHeader showBackButton title="거래 상세" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TransactionDetailCard
          amount={transaction.amount}
          leading={<CategoryIcon categoryName={transaction.categoryName} size={28} />}
          title={transaction.name}
          type={transaction.type}
        />

        <View style={styles.infoCard}>
          <InfoRow label="일자" value={formatDate(transaction.datetime)} />
          <InfoRow label="장소" value={formatPlace(transaction.address)} />
          <InfoRow label="카테고리" value={transaction.categoryName} />
          <InfoRow label="결제 수단" value={transaction.paymentMethod} />
          <InfoRow label="메모" showDivider={false} value={transaction.memo} />
        </View>

        <View style={styles.actions}>
          <Button onPress={handleEdit} style={styles.actionButton} variant="white">
            수정
          </Button>
          <Button onPress={handleDelete} style={styles.actionButton} variant="red">
            삭제
          </Button>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  infoCard: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
});
