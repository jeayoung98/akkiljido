import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  createTransaction,
  deleteTransaction,
  fetchTransactionDetail,
  fetchTransactionList,
  searchTransactions,
  updateTransaction,
  type TransactionCreateInput,
  type TransactionDateGroup,
  type TransactionListQuery,
  type TransactionSearchItem,
  type TransactionSearchQuery,
  type TransactionUpdateInput,
} from '@/src/api/transactionsApi';

/**
 * 거래내역 조회·변경용 react-query 훅 모음입니다.
 * 화면은 여기서 나오는 `isLoading`·`error`·`refetch`만 쓰고, fetch나 쿼리 문자열은 신경 쓰지 않습니다.
 *
 * 등록·수정·삭제 훅은 성공하면 거래 관련 캐시를 전부 무효화(invalidate)합니다.
 * 그래서 상세에서 수정하고 목록으로 돌아가면 목록이 알아서 최신 값을 다시 받아옵니다.
 */

// data가 undefined일 때마다 새 배열을 만들면 하위 컴포넌트가 불필요하게 다시 렌더링되므로 상수를 재사용합니다.
const EMPTY_DATE_GROUPS: TransactionDateGroup[] = [];
const EMPTY_SEARCH_ITEMS: TransactionSearchItem[] = [];

/**
 * 캐시를 찾는 열쇠(queryKey)를 한 곳에서 만듭니다.
 * 문자열을 화면마다 직접 적으면 오타 하나로 무효화가 조용히 안 먹으므로 팩토리로 모아둡니다.
 */
export const transactionKeys = {
  /** 거래 관련 모든 캐시. 등록·수정·삭제 후 이 키로 한 번에 무효화합니다. */
  all: ['transactions'] as const,
  list: (query: TransactionListQuery) => [...transactionKeys.all, 'list', query] as const,
  search: (query: TransactionSearchQuery) => [...transactionKeys.all, 'search', query] as const,
  detail: (transactionId: string | number) =>
    [...transactionKeys.all, 'detail', String(transactionId)] as const,
};

/** GET /api/v1/transaction/list — 필터 조건이 바뀌면 queryKey가 바뀌어 자동으로 다시 조회합니다. */
export function useTransactionList(query: TransactionListQuery, enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => fetchTransactionList(query),
    enabled,
  });

  return {
    dateGroups: data ?? EMPTY_DATE_GROUPS,
    isLoading,
    error,
    refetch,
  };
}

/**
 * GET /api/v1/transaction/search — 검색어가 있을 때만 조회합니다.
 * 입력이 멈춘 뒤에만 요청하도록 검색어에는 디바운스를 겁니다.
 */
export function useTransactionSearch(query: TransactionSearchQuery) {
  const keyword = query.query?.trim() ?? '';
  const debouncedKeyword = useDebouncedValue(keyword, 300);
  const hasKeyword = debouncedKeyword.length > 0;
  const searchQuery = { ...query, query: debouncedKeyword };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: transactionKeys.search(searchQuery),
    queryFn: () => searchTransactions(searchQuery),
    enabled: hasKeyword,
  });

  return {
    results: hasKeyword ? (data ?? EMPTY_SEARCH_ITEMS) : EMPTY_SEARCH_ITEMS,
    // 글자를 치는 동안(디바운스 대기 중)에도 로딩으로 보여야 이전 결과가 잠깐 남지 않습니다.
    isLoading: keyword.length > 0 && (isLoading || debouncedKeyword !== keyword),
    error,
    refetch,
  };
}

/** GET /api/v1/transaction/{transactionId} — 거래 상세를 조회합니다. */
export function useTransactionDetail(transactionId?: string | number) {
  const hasId = transactionId !== undefined && String(transactionId).length > 0;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: transactionKeys.detail(transactionId ?? ''),
    queryFn: () => fetchTransactionDetail(transactionId as string | number),
    enabled: hasId,
  });

  return {
    transaction: data,
    isLoading,
    error,
    refetch,
  };
}

/** POST /api/v1/transaction — 성공하면 거래 목록·검색 캐시를 무효화합니다. */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TransactionCreateInput) => createTransaction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

/** PATCH /api/v1/transaction/{transactionId} — 성공하면 목록과 그 거래의 상세를 함께 갱신합니다. */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      input,
    }: {
      transactionId: string | number;
      input: TransactionUpdateInput;
    }) => updateTransaction(transactionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

/** DELETE /api/v1/transaction/{transactionId} — 성공하면 지워진 거래의 상세 캐시까지 정리합니다. */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string | number) => deleteTransaction(transactionId),
    onSuccess: (_result, transactionId) => {
      // 이미 없는 거래를 다시 조회하지 않도록 상세 캐시는 무효화가 아니라 제거합니다.
      queryClient.removeQueries({ queryKey: transactionKeys.detail(transactionId) });
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
