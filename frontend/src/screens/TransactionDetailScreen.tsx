import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { AsyncStateView } from '@/components/common/AsyncStateView';
import { Button } from '@/components/common/button/Button';
import { AppHeader } from '@/components/common/header/AppHeader';
import { ConfirmModal } from '@/components/common/modal/ConfirmModal';
import { CategoryIcon } from '@/components/transaction/CategoryIcon';
import { InfoRow } from '@/components/transaction/InfoRow';
import { TransactionDetailCard } from '@/components/transaction/TransactionDetailCard';
import Colors from '@/constants/Colors';
import { useDeleteTransaction, useTransactionDetail } from '@/hooks/useTransactions';

// "2026-07-17 09:12:00" 또는 "2026-07-17 09:12:00+09" → "2026.07.17"
function formatDate(datetime: string) {
  return datetime.slice(0, 10).replaceAll('-', '.');
}

// address는 등록 API 기준으로 "서울 강남구 역삼동"처럼 풀 주소가 온다. 상세 화면 "장소" 칸은
// 좁아서 풀 주소 대신 구 단위만 짧게 보여주고, "구"가 없는 값(온라인, - 등)은 그대로 보여준다.
function formatPlace(address: string) {
  return address.match(/[가-힣]+구/)?.[0] ?? address;
}

/** 값이 비어 있는 항목은 빈칸 대신 하이픈으로 표시합니다. */
function orDash(value: string) {
  return value.trim() ? value : '-';
}

/**
 * 거래 상세 화면입니다.
 * GET /api/v1/transaction/{transactionId}로 상세를 조회하고, 삭제는 DELETE로 처리합니다.
 */
export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transaction, isLoading, error, refetch } = useTransactionDetail(id);

  // 삭제 버튼을 누른 뒤 사용자 확인을 받을 때만 공통 모달을 표시합니다.
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // 수정 화면에서 저장하면 그 훅이 이 거래의 캐시를 무효화하므로, 돌아오면 최신 값을 자동으로 다시 받아옵니다.
  const deleteMutation = useDeleteTransaction();
  const isDeleting = deleteMutation.isPending;

  const handleEdit = () => {
    router.push({ pathname: '/transaction/[id]/edit', params: { id } });
  };

  /** DELETE /api/v1/transaction/{transactionId} 성공한 경우에만 목록으로 돌아갑니다. */
  const handleConfirmDelete = async () => {
    if (isDeleting) return;

    try {
      await deleteMutation.mutateAsync(id);
      setIsDeleteModalVisible(false);
      router.back();
    } catch (caught) {
      setIsDeleteModalVisible(false);
      Alert.alert('삭제 실패', caught instanceof Error ? caught.message : '거래를 삭제하지 못했어요.');
    }
  };

  return (
    <AppScreen backgroundColor={Colors.light.background}>
      <AppHeader showBackButton title="거래 상세" />

      <AsyncStateView
        emptyMessage="거래 내역을 찾을 수 없어요."
        error={error}
        isEmpty={!transaction}
        isLoading={isLoading}
        onRetry={refetch}>
        {transaction ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TransactionDetailCard
              amount={transaction.amount}
              leading={
                <CategoryIcon
                  categoryId={transaction.categoryId}
                  categoryName={transaction.categoryName}
                  size={28}
                  type={transaction.type}
                />
              }
              title={transaction.name}
              type={transaction.type}
            />

            <View style={styles.infoCard}>
              <InfoRow label="일자" value={formatDate(transaction.datetime)} />
              <InfoRow label="장소" value={orDash(formatPlace(transaction.address))} />
              <InfoRow label="카테고리" value={orDash(transaction.categoryName)} />
              <InfoRow label="결제 수단" value={orDash(transaction.paymentMethod)} />
              <InfoRow label="메모" showDivider={false} value={orDash(transaction.memo)} />
            </View>

            <View style={styles.actions}>
              <Button onPress={handleEdit} style={styles.actionButton} variant="white">
                수정
              </Button>
              <Button
                loading={isDeleting}
                onPress={() => setIsDeleteModalVisible(true)}
                style={styles.actionButton}
                variant="red">
                삭제
              </Button>
            </View>
          </ScrollView>
        ) : null}
      </AsyncStateView>

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
});
