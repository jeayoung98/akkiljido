package com.a508.backend.domain.report.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.a508.backend.domain.report.entity.Report;
import com.a508.backend.domain.report.entity.ReportType;

public interface ReportRepository extends JpaRepository<Report, Long> {

	Optional<Report> findByIdAndUser_Id(Long id, Long userId);

	/** 리포트 목록 조회. 최신 생성분부터. */
	List<Report> findAllByUser_IdOrderByIdDesc(Long userId);

	List<Report> findAllByUser_IdAndTypeOrderByIdDesc(Long userId, ReportType type);

	/**
	 * 특정 유형의 전체 사용자 리포트를 최신순으로 읽는다(알림 발송 배치 전용).
	 * <p>
	 * user 를 join fetch 하는 이유: 발송 루프가 트랜잭션 밖에서 돌기 때문에 LAZY 프록시로는
	 * userId 를 안전하게 꺼낼 수 없다. 기간 조건을 SQL 로 못 거는 것은 report 테이블에 기간
	 * 컬럼이 없어서다 — 기간 판정은 봉투 JSON 을 역직렬화해 애플리케이션에서 한다.
	 * period_start 컬럼이 생기면 이 메서드는 기간 조건이 붙은 쿼리로 대체된다.
	 */
	@Query("select r from Report r join fetch r.user where r.type = :type order by r.id desc")
	List<Report> findAllByTypeWithUserOrderByIdDesc(@Param("type") ReportType type);
}
