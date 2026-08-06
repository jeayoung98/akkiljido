package com.a508.backend.domain.transaction_history.entity;

import java.time.OffsetDateTime;

import org.locationtech.jts.geom.Point;

import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.user.domain.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 거래내역 엔티티. ERD 의 transaction_history 테이블과 매핑된다.
 * datetime 은 TIMESTAMPTZ(OffsetDateTime)로 저장하고, coordinate 는 latitude/longitude 를 PostGIS Point 로 저장한다.
 * b_code/region_*depth_name 은 좌표를 카카오 coord2regioncode 로 변환한 법정동 정보다.
 */
@Entity
@Getter
@Table(name = "transaction_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TransactionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 소득(INCOME) 거래는 카테고리를 갖지 않으므로 null 을 허용한다(지출은 필수 - 서비스 계층에서 검증).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false)
    private OffsetDateTime datetime;

    @Column(nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransactionType type;

    @Column(name = "transaction_name", length = 10, nullable = false)
    private String transactionName;

    // 소득(INCOME) 거래는 결제 수단을 갖지 않으므로 null 을 허용한다(지출은 필수 - 서비스 계층에서 검증).
    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    // ERD 상 존재하는 컬럼이나 현재 API 스펙에는 노출되지 않는다(항상 null). 스키마 정합성을 위해 유지.
    @Column(length = 30)
    private String branch;

    @Column(length = 30)
    private String memo;

    @Column(columnDefinition = "TEXT")
    private String address;

    // 좌표 -> 법정동 변환(카카오 coord2regioncode) 결과
    @Column(name = "b_code", length = 10)
    private String bCode;

    @Column(name = "region_1depth_name", columnDefinition = "TEXT")
    private String region1DepthName;

    @Column(name = "region_2depth_name", columnDefinition = "TEXT")
    private String region2DepthName;

    @Column(name = "region_3depth_name", columnDefinition = "TEXT")
    private String region3DepthName;

    // PostGIS geometry(Point, 4326) 컬럼. SRID 를 컬럼 정의에 고정해 삽입 시 SRID 불일치를 방지한다.
    @Column(columnDefinition = "geometry(Point,4326)")
    private Point coordinate;

    @Builder
    private TransactionHistory(User user, Category category, OffsetDateTime datetime, Long amount,
                               TransactionType type, String transactionName, String paymentMethod,
                               String memo, String address, String bCode, String region1DepthName,
                               String region2DepthName, String region3DepthName, Point coordinate) {
        this.user = user;
        this.category = category;
        this.datetime = datetime;
        this.amount = amount;
        this.type = type;
        this.transactionName = transactionName;
        this.paymentMethod = paymentMethod;
        this.memo = memo;
        this.address = address;
        this.bCode = bCode;
        this.region1DepthName = region1DepthName;
        this.region2DepthName = region2DepthName;
        this.region3DepthName = region3DepthName;
        this.coordinate = coordinate;
        clearExpenseOnlyFieldsIfIncome();
    }

    /**
     * 거래내역의 기본 정보를 부분 수정(PATCH)한다.
     * 각 인자가 null 이면(요청에서 미전송) 기존 값을 그대로 유지한다.
     * 법정동 정보(b_code/region_*)는 등록 시점 값을 유지한다.
     * 수정 결과가 소득(INCOME)이면 지출 전용 필드(카테고리/결제 수단)는 비워진다.
     */
    public void update(Category category, OffsetDateTime datetime, Long amount, TransactionType type,
                       String transactionName, String paymentMethod, String memo, String address,
                       Point coordinate) {
        if (category != null) {
            this.category = category;
        }
        if (datetime != null) {
            this.datetime = datetime;
        }
        if (amount != null) {
            this.amount = amount;
        }
        if (type != null) {
            this.type = type;
        }
        if (transactionName != null) {
            this.transactionName = transactionName;
        }
        if (paymentMethod != null) {
            this.paymentMethod = paymentMethod;
        }
        if (memo != null) {
            this.memo = memo;
        }
        if (address != null) {
            this.address = address;
        }
        if (coordinate != null) {
            this.coordinate = coordinate;
        }
        clearExpenseOnlyFieldsIfIncome();
    }

    /**
     * 소득(INCOME) 거래는 카테고리와 결제 수단을 갖지 않는다는 도메인 불변식을 강제한다.
     * 지출 -> 소득으로 유형이 바뀌는 수정에서 기존 값이 남지 않도록 등록/수정 마지막에 호출한다.
     */
    private void clearExpenseOnlyFieldsIfIncome() {
        if (this.type == TransactionType.INCOME) {
            this.category = null;
            this.paymentMethod = null;
        }
    }
}
