-- 소득(INCOME) 거래는 카테고리와 결제 수단을 갖지 않는다.
-- 거래내역 등록/수정 API 가 소득일 때 두 값을 받지 않도록 바뀌었으므로 NOT NULL 제약을 해제한다.
ALTER TABLE transaction_history
    ALTER COLUMN category_id DROP NOT NULL;

ALTER TABLE transaction_history
    ALTER COLUMN payment_method DROP NOT NULL;

-- 이미 등록된 소득 거래에 남아 있는 카테고리/결제 수단을 비운다.
UPDATE transaction_history
SET category_id    = NULL,
    payment_method = NULL
WHERE type = 'INCOME';

-- 유형별 필드 조합(소득은 둘 다 없음, 지출은 둘 다 있음)을 DB 차원에서도 강제한다.
ALTER TABLE transaction_history
    DROP CONSTRAINT IF EXISTS ck_transaction_history_type_fields;

ALTER TABLE transaction_history
    ADD CONSTRAINT ck_transaction_history_type_fields CHECK (
        (type = 'INCOME' AND category_id IS NULL AND payment_method IS NULL)
            OR (type <> 'INCOME' AND category_id IS NOT NULL AND payment_method IS NOT NULL)
        );
