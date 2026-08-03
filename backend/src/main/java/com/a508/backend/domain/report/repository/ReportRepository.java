package com.a508.backend.domain.report.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.a508.backend.domain.report.entity.Report;
import com.a508.backend.domain.report.entity.ReportType;

public interface ReportRepository extends JpaRepository<Report, Long> {

	Optional<Report> findByIdAndUser_Id(Long id, Long userId);

	/** 리포트 목록 조회. 최신 생성분부터. */
	List<Report> findAllByUser_IdOrderByIdDesc(Long userId);

	List<Report> findAllByUser_IdAndTypeOrderByIdDesc(Long userId, ReportType type);
}
