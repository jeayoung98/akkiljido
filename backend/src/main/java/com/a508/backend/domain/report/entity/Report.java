package com.a508.backend.domain.report.entity;

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
 * AI 소비 리포트 엔티티. ERD 의 report 테이블과 매핑된다.
 * <p>
 * ai_answer 에는 생성 시점에 구조 검증을 마친 봉투 JSON({@code ReportEnvelope})의 정본이 저장된다.
 * 구조화 컬럼 3종(total_cost/highest_spending_place/most_frequent_place)은 목록 화면이
 * JSON 파싱 없이 쓰기 위한 값이고, 상세 화면은 봉투를 역직렬화해 객체로 내려받는다.
 * <p>
 * 생성 실패(LLM 구조 검증 실패가 재시도 후에도 지속) 시에는 row 를 만들지 않는다 —
 * "리포트 없음"이 곧 실패 상태의 표현이다.
 */
@Entity
@Getter
@Table(name = "report")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "report_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private ReportType type;

	/** 리포트 기간의 총지출(EXPENSE 합계). 목록 화면용. */
	@Column(name = "total_cost", nullable = false)
	private Long totalCost;

	/** 기간 내 지출 합계가 가장 큰 장소명. 장소 식별은 거래명+좌표 기준(설계 문서 §3.1). */
	@Column(name = "highest_spending_place", columnDefinition = "TEXT", nullable = false)
	private String highestSpendingPlace;

	/** 기간 내 결제 횟수가 가장 많은 장소명. */
	@Column(name = "most_frequent_place", columnDefinition = "TEXT", nullable = false)
	private String mostFrequentPlace;

	/** 검증 완료된 봉투 JSON 정본. 기간·본문·요약·추천이 모두 이 안에 있다. */
	@Column(name = "ai_answer", columnDefinition = "TEXT", nullable = false)
	private String aiAnswer;

	@Builder
	private Report(User user, ReportType type, Long totalCost, String highestSpendingPlace,
		String mostFrequentPlace, String aiAnswer) {
		this.user = user;
		this.type = type;
		this.totalCost = totalCost;
		this.highestSpendingPlace = highestSpendingPlace;
		this.mostFrequentPlace = mostFrequentPlace;
		this.aiAnswer = aiAnswer;
	}
}
