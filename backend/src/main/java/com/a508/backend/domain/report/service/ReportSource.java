package com.a508.backend.domain.report.service;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.report.entity.ReportPeriod;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;

/**
 * 리포트 한 건을 계산하는 데 필요한 입력 전부 — 기간, 기간 내 거래(수입 포함), 내 장소 목록.
 * 사실 추출기·추천 추출기·통계 계산이 모두 이 객체 하나를 입력으로 받는다.
 * <p>
 * 콜드 스타트 원칙(설계 문서 §2): 이 기간 밖의 거래는 어디에도 없다 — 과거 비교는 구조적으로 불가능하다.
 */
public record ReportSource(
	Long userId,
	ReportPeriod period,
	List<TransactionHistory> transactions,
	List<MyPlace> myPlaces
) {

	/** 재량지출에서 제외하는 결제 수단 — 고정비(자동이체)와 송금(계좌이체). */
	public static final Set<String> NON_DISCRETIONARY_PAYMENT = Set.of("자동이체", "계좌이체");

	/** 집 앵커로 인정하는 내 장소 이름. 정확 일치만 — "본가"는 다른 집이다(설계 문서 §3.1). */
	public static final String HOME_PLACE_NAME = "집";

	/** 지출 거래(수입 제외). */
	public List<TransactionHistory> expenses() {
		return transactions.stream()
			.filter(transaction -> transaction.getType() == TransactionType.EXPENSE)
			.toList();
	}

	/**
	 * 재량지출 — 지출에서 고정비(자동이체)·송금(계좌이체)을 뺀 것. 리포트가 다루는 주 대상.
	 * 결제 수단은 소득 거래에서 null 이 될 수 있는 컬럼이라, Set.of 의 contains(null) NPE 를 피하려 null 을 먼저 걸러 통과시킨다.
	 */
	public List<TransactionHistory> discretionary() {
		return expenses().stream()
			.filter(transaction -> transaction.getPaymentMethod() == null
				|| !NON_DISCRETIONARY_PAYMENT.contains(transaction.getPaymentMethod()))
			.toList();
	}

	/**
	 * '집' 앵커. 이름이 정확히 "집"인 내 장소(사용자별 유니크 제약으로 최대 1개).
	 * 없으면 집 의존 사실(원거리·배달 판별 등)이 조용히 비활성화될 뿐 파이프라인은 계속 돈다.
	 */
	public Optional<MyPlace> home() {
		return myPlaces.stream()
			.filter(place -> HOME_PLACE_NAME.equals(place.getMyPlaceName()))
			.findFirst();
	}
}
