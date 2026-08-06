package com.a508.backend.domain.transaction_history.entity;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 거래 유형. ERD 에는 없던 필드이나 API 스펙(수입/지출)에 필요하여 추가한 컬럼.
 */
@Schema(description = "거래 유형(수입/지출)", example = "EXPENSE")
public enum TransactionType {
    INCOME,
    EXPENSE
}
