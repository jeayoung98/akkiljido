import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { Button } from '@/components/common/button/Button';
import { AppHeader } from '@/components/common/header/AppHeader';
import { ConfirmModal } from '@/components/common/modal/ConfirmModal';
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
  // 삭제 버튼을 누른 뒤 사용자 확인을 받을 때만 공통 모달을 표시합니다.
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // 수정 화면에서 저장 후 router.back()으로 돌아오면, 이 화면은 계속 마운트돼 있던 상태라
  // 다시 렌더링될 이유가 없어서 방금 바꿔치기한 값이 안 보일 수 있다. 포커스를 받을 때마다
  // 더미 state를 갱신해서 강제로 다시 렌더링하고, 그 김에 MOCK_TRANSACTIONS도 새로 읽는다.
  const [, forceRefresh] = useState(0);
  useFocusEffect(
    useCallback(() => {
      forceRefresh((tick) => tick + 1);
    }, []),
  );

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
    router.push({ pathname: '/transaction/[id]/edit', params: { id } });
  };

  const handleDelete = () => {
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleteModalVisible(false);
    // TODO: DELETE 거래 API 연동 후 성공한 경우에만 목록 화면으로 돌아갑니다.
    router.back();
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

      <ConfirmModal
        cancelLabel="취소"
        confirmLabel="삭제"
        description="삭제된 내역은 복구할 수 없어요."
        destructive
        onCancel={() => setIsDeleteModalVisible(false)}
        onConfirm={handleConfirmDelete}
        title="거래를 삭제할까요?"
        visible={isDeleteModalVisible}
      />
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
