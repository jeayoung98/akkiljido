package com.a508.backend.domain.report.repository;

import static com.a508.backend.domain.category.entity.QCategory.*;
import static com.a508.backend.domain.transaction_history.entity.QTransactionHistory.*;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.querydsl.jpa.impl.JPAQueryFactory;

import lombok.RequiredArgsConstructor;

/**
 * 리포트 생성용 거래 조회 리포지토리.
 * <p>
 * 사실 추출은 개별 거래 수준 연산(시각·좌표·순서)이 대부분이라 SQL 집계 대신
 * <b>기간 거래 전체를 로드해 메모리에서 계산</b>한다 — 한 기간이 주간 수십 건 규모라 부담이 없고,
 * 참조 구현(JS)과의 수치 대조 검증도 이 방식이어야 1:1 로 된다.
 * 집계 전용 리포지토리 관례는 {@code HomeStatisticsRepository} 를 따른다(인터페이스 없이 단일 클래스).
 */
@Repository
@RequiredArgsConstructor
public class ReportStatRepository {

	private final JPAQueryFactory queryFactory;

	/**
	 * 기간 내 사용자의 전체 거래(수입 포함)를 시각 오름차순으로 조회한다.
	 * 카테고리명을 함께 사용하므로 category 를 fetch join 한다(N+1 방지).
	 * 소득 거래는 카테고리를 갖지 않으므로 left join 이어야 한다(inner join 이면 소득이 조회 결과에서 사라진다).
	 */
	public List<TransactionHistory> findTransactionsForReport(
		Long userId, OffsetDateTime startDateTime, OffsetDateTime endDateTime) {
		return queryFactory
			.selectFrom(transactionHistory)
			.leftJoin(transactionHistory.category, category).fetchJoin()
			.where(
				transactionHistory.user.id.eq(userId),
				transactionHistory.datetime.goe(startDateTime),
				transactionHistory.datetime.lt(endDateTime))
			.orderBy(transactionHistory.datetime.asc())
			.fetch();
	}
}
