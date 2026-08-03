package com.a508.backend.domain.transaction_history.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

public interface TransactionHistoryRepository
	extends JpaRepository<TransactionHistory, Long>, TransactionHistoryRepositoryCustom {

	Optional<TransactionHistory> findByIdAndUser_Id(Long id, Long userId);

	/** 특정 기간의 사용자 거래내역을 거래 일시 오름차순으로 조회한다. */
	@Query("""
		select t
		from TransactionHistory t
		where t.user.id = :userId
			and t.datetime >= :startDateTime
			and t.datetime < :endDateTime
		order by t.datetime asc
		""")
	List<TransactionHistory> findAllByUserIdAndDatetimeRange(
		@Param("userId") Long userId,
		@Param("startDateTime") OffsetDateTime startDateTime,
		@Param("endDateTime") OffsetDateTime endDateTime);
}
