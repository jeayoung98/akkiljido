package com.a508.backend.domain.transaction_history.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;

public interface TransactionHistoryRepository
	extends JpaRepository<TransactionHistory, Long>, TransactionHistoryRepositoryCustom {

	Optional<TransactionHistory> findByIdAndUserId(Long id, Long userId);

	// TODO: 페이지네이션 도입 시 Pageable 을 받아 Page<TransactionHistory> 를 반환하는 오버로드 추가
	// category 를 함께 fetch 하여 목록/검색 응답의 카테고리명을 단일 쿼리로 조회한다(N+1 방지).
	@Query("select t from TransactionHistory t "
		+ "join fetch t.category c "
		+ "where t.userId = :userId "
		+ "and t.datetime >= :startDateTime and t.datetime < :endDateTime "
		+ "and (:type is null or t.type = :type) "
		+ "and (:categoryId is null or c.id = :categoryId) "
		+ "and (:query is null or lower(t.transactionName) like lower(concat('%', :query, '%')))")
	List<TransactionHistory> searchTransactions(
		@Param("userId") Long userId,
		@Param("startDateTime") OffsetDateTime startDateTime,
		@Param("endDateTime") OffsetDateTime endDateTime,
		@Param("type") TransactionType type,
		@Param("categoryId") Long categoryId,
		@Param("query") String query,
		Sort sort);
}
