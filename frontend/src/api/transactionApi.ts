import { apiRequest } from '@/src/api/apiClient';

export type TransactionType = 'INCOME' | 'EXPENSE';

export type CreateTransactionInput = {
  name: string;
  amount: number;
  type: TransactionType;
  // 스웨거 스키마상 이 필드만 snake_case다(나머지는 camelCase).
  payment_method: string;
  categoryId: number;
  /** "yyyy-MM-dd HH:mm:ss" 형식. */
  datetime: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  memo?: string;
};

/** POST /api/v1/transaction — 거래내역 등록. */
export async function createTransaction(input: CreateTransactionInput) {
  return apiRequest('/api/v1/transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
