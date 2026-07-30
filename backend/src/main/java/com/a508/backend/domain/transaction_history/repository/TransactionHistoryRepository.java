package com.a508.backend.domain.transaction_history.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

public interface TransactionHistoryRepository extends JpaRepository<TransactionHistory, Long> {
	Optional<TransactionHistory> findByIdAndUserId(Long id, Long userId);
}
