import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import { Button } from '@/components/common/button/Button';
import { EmptyState } from '@/components/transaction/EmptyState';
import Colors from '@/constants/Colors';

type AsyncStateViewProps = {
  isLoading: boolean;
  error: Error | null;
  /** 조회는 성공했지만 결과가 0건인 경우 */
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  /** 에러 화면의 "다시 시도" 버튼을 누르면 호출됩니다. 넘기지 않으면 버튼을 숨깁니다. */
  onRetry?: () => void;
  children: ReactNode;
};

/**
 * 서버에서 받아오는 화면이 공통으로 겪는 세 가지 상태(로딩 / 실패 / 빈 결과)를 한 곳에서 처리합니다.
 * 화면마다 로딩 스피너와 에러 문구를 따로 만들지 않도록 하려고 분리했습니다.
 *
 * 로딩 판단에 `isEmpty`를 함께 보는 이유: refetch 중에는 이미 받아둔 데이터가 있으므로
 * 스피너로 화면을 통째로 덮지 않고 기존 목록을 그대로 보여주는 편이 덜 깜빡입니다.
 */
export function AsyncStateView({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = '표시할 내용이 없습니다.',
  emptyDescription,
  onRetry,
  children,
}: AsyncStateViewProps) {
  if (isLoading && isEmpty) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={Colors.light.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorMessage}>{error.message}</Text>
        {onRetry ? (
          <Button onPress={onRetry} style={styles.retryButton} variant="white">
            다시 시도
          </Button>
        ) : null}
      </View>
    );
  }

  if (isEmpty) {
    return <EmptyState description={emptyDescription} message={emptyMessage} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  errorMessage: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 140,
  },
});
