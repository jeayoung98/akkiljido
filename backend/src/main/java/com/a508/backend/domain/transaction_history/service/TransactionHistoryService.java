package com.a508.backend.domain.transaction_history.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.category.service.CategoryService;
import com.a508.backend.domain.transaction_history.dto.request.TransactionHistoryCreateRequest;
import com.a508.backend.domain.transaction_history.dto.request.TransactionHistoryUpdateRequest;
import com.a508.backend.domain.transaction_history.dto.response.TransactionHistoryResponse;
import com.a508.backend.domain.transaction_history.dto.response.TransactionListResponse;
import com.a508.backend.domain.transaction_history.dto.response.TransactionSearchResponse;
import com.a508.backend.domain.transaction_history.entity.DateRange;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionSort;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.transaction_history.repository.TransactionHistoryRepository;
import com.a508.backend.global.client.kakao.KakaoLocalApiClient;
import com.a508.backend.global.client.kakao.dto.RegionInfo;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TransactionHistoryService {

	private static final String TYPE_ALL = "all";

	private final TransactionHistoryRepository transactionHistoryRepository;
	private final CategoryService categoryService;
	private final KakaoLocalApiClient kakaoLocalApiClient;

	@Transactional
	public TransactionHistoryResponse createTransactionHistory(Long userId, TransactionHistoryCreateRequest request) {
		RegionInfo region = resolveRegion(request.latitude(), request.longitude());

		TransactionHistory saved = transactionHistoryRepository.save(
			TransactionHistory.builder()
				.userId(userId)
				.category(categoryService.getOwnedCategory(userId, request.categoryId()))
				.datetime(DateTimeUtils.toServiceOffset(request.datetime()))
				.amount(request.amount())
				.type(request.type())
				.transactionName(request.name())
				.paymentMethod(request.paymentMethod())
				.memo(request.memo())
				.address(request.address())
				.bCode(region.bCode())
				.region1DepthName(region.region1DepthName())
				.region2DepthName(region.region2DepthName())
				.region3DepthName(region.region3DepthName())
				.coordinate(GeometryUtils.toPoint(request.latitude(), request.longitude()))
				.build()
		);
		return TransactionHistoryResponse.from(saved);
	}

	@Transactional(readOnly = true)
	public TransactionHistoryResponse findOneTransactionHistoryResponse(Long userId, Long transactionId) {
		return TransactionHistoryResponse.from(getOwnedTransaction(userId, transactionId));
	}

	@Transactional
	public TransactionHistoryResponse updateTransactionHistory(Long userId, Long transactionId,
		TransactionHistoryUpdateRequest request) {
		TransactionHistory transaction = getOwnedTransaction(userId, transactionId);
		transaction.update(
			request.categoryId() != null ? categoryService.getOwnedCategory(userId, request.categoryId()) : null,
			DateTimeUtils.toServiceOffset(request.datetime()),
			request.amount(),
			request.type(),
			request.name(),
			request.paymentMethod(),
			request.memo(),
			request.address(),
			GeometryUtils.toPoint(request.latitude(), request.longitude())
		);
		return TransactionHistoryResponse.from(transaction);
	}

	@Transactional
	public void deleteTransactionHistory(Long userId, Long transactionId) {
		TransactionHistory transaction = getOwnedTransaction(userId, transactionId);
		transactionHistoryRepository.delete(transaction);
	}

	@Transactional(readOnly = true)
	public TransactionListResponse getTransactionList(
		Long userId, String sort, String type, String startDate, String endDate, Long categoryId) {
		TransactionSort transactionSort = TransactionSort.from(sort);
		TransactionType typeFilter = parseTypeFilter(type);
		DateRange dateRange = DateRange.ofThisMonth(startDate, endDate);
		categoryService.validateOwnership(userId, categoryId);

		List<TransactionHistory> transactions = transactionHistoryRepository.searchTransactions(
			userId, dateRange.startDateTime(), dateRange.endDateTime(), typeFilter, categoryId, null,
			transactionSort.toSort());

		return TransactionListResponse.of(transactions);
	}

	@Transactional(readOnly = true)
	public TransactionSearchResponse searchTransactions(
		Long userId, String query, String sort, String type, String startDate, String endDate, Long categoryId) {
		TransactionSort transactionSort = TransactionSort.from(sort);
		TransactionType typeFilter = parseTypeFilter(type);
		DateRange dateRange = DateRange.ofThisMonth(startDate, endDate);
		categoryService.validateOwnership(userId, categoryId);

		List<TransactionHistory> transactions = transactionHistoryRepository.searchTransactions(
			userId, dateRange.startDateTime(), dateRange.endDateTime(), typeFilter, categoryId,
			normalizeQuery(query), transactionSort.toSort());

		return TransactionSearchResponse.of(transactions);
	}

	/**
	 * 거래 유형 필터를 파싱한다. 값이 없거나 all 이면 전체(필터 없음), 지원하지 않는 값이면 예외를 던진다.
	 */
	private TransactionType parseTypeFilter(String type) {
		if (type == null || type.isBlank() || type.equalsIgnoreCase(TYPE_ALL)) {
			return null;
		}
		try {
			return TransactionType.valueOf(type.toUpperCase());
		} catch (IllegalArgumentException e) {
			throw new BusinessException(ExceptionType.INVALID_TRANSACTION_TYPE);
		}
	}

	private String normalizeQuery(String query) {
		if (query == null || query.isBlank()) {
			return null;
		}
		return query.trim();
	}

	/**
	 * 좌표를 법정동 정보로 변환한다. 좌표가 없거나 변환에 실패하면 빈 결과를 반환한다(등록을 막지 않음).
	 */
	private RegionInfo resolveRegion(Double latitude, Double longitude) {
		if (latitude == null || longitude == null) {
			return RegionInfo.empty();
		}
		return kakaoLocalApiClient.coordToRegion(latitude, longitude)
			.orElseGet(RegionInfo::empty);
	}

	private TransactionHistory getOwnedTransaction(Long userId, Long transactionId) {
		return transactionHistoryRepository.findByIdAndUserId(transactionId, userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.TRANSACTION_HISTORY_NOT_FOUND));
	}
}
