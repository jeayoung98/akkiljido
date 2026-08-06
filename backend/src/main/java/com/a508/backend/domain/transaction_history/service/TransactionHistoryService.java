package com.a508.backend.domain.transaction_history.service;

import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.category.entity.Category;
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
import com.a508.backend.domain.user.service.UserService;
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
	private final UserService userService;
	private final CategoryService categoryService;
	private final KakaoLocalApiClient kakaoLocalApiClient;

	@Transactional
	public TransactionHistoryResponse createTransactionHistory(Long userId, TransactionHistoryCreateRequest request) {
		validateTypeFields(request.type(), request.categoryId() != null, request.paymentMethod() != null);

		RegionInfo region = resolveRegion(request.latitude(), request.longitude());

		TransactionHistory saved = transactionHistoryRepository.save(
			TransactionHistory.builder()
				.user(userService.getUser(userId))
				.category(resolveCategory(userId, request.categoryId()))
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

		// 미전송 필드는 기존 값을 유지하므로, 요청과 기존 값을 합친 "수정 후 상태"로 검증한다.
		TransactionType targetType = request.type() != null ? request.type() : transaction.getType();
		boolean toIncome = targetType == TransactionType.INCOME;
		validateTypeFields(
			targetType,
			request.categoryId() != null || (!toIncome && transaction.getCategory() != null),
			request.paymentMethod() != null || (!toIncome && transaction.getPaymentMethod() != null));

		transaction.update(
			resolveCategory(userId, request.categoryId()),
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
		Long userId, String sort, String type, String startDate, String endDate, List<Long> categoryIds) {
		return TransactionListResponse.of(
			findTransactions(userId, null, sort, type, startDate, endDate, categoryIds));
	}

	@Transactional(readOnly = true)
	public TransactionSearchResponse searchTransactions(
		Long userId, String query, String sort, String type, String startDate, String endDate,
		List<Long> categoryIds) {
		return TransactionSearchResponse.of(
			findTransactions(userId, query, sort, type, startDate, endDate, categoryIds));
	}

	/**
	 * 목록 조회와 검색이 공유하는 조회 로직. 검색어(query)만 다르고 나머지 필터·정렬·검증은 동일하다.
	 *
	 * @param query       정규화된 검색어. null 이면 검색어 필터 없이 전체 조회
	 * @param categoryIds 카테고리 다중 필터. null 이거나 비어 있으면 카테고리 필터 없이 전체 조회
	 */
	private List<TransactionHistory> findTransactions(
		Long userId, String query, String sort, String type, String startDate, String endDate,
		List<Long> categoryIds) {
		TransactionSort transactionSort = TransactionSort.from(sort);
		TransactionType typeFilter = parseTypeFilter(type);
		DateRange dateRange = DateRange.ofThisMonth(startDate, endDate);
		categoryService.validateOwnership(userId, categoryIds);

		return transactionHistoryRepository.searchTransactions(
			userId, dateRange.startDateTime(), dateRange.endDateTime(), typeFilter, categoryIds,
			normalizeQuery(query), transactionSort);
	}

	/**
	 * 거래 유형 필터를 파싱한다. 값이 없거나 all 이면 전체(필터 없음), 지원하지 않는 값이면 예외를 던진다.
	 * 대소문자 변환은 서버 기본 로케일과 무관하도록 Locale.ROOT 를 사용한다(터키어 로케일의 i/I 문제 회피).
	 */
	private TransactionType parseTypeFilter(String type) {
		if (type == null || type.isBlank() || type.equalsIgnoreCase(TYPE_ALL)) {
			return null;
		}
		try {
			return TransactionType.valueOf(type.toUpperCase(Locale.ROOT));
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
	 * 거래 유형과 카테고리·결제 수단의 조합을 검증한다.
	 * <p>
	 * 소득(INCOME)은 카테고리와 결제 수단을 갖지 않는 거래이므로 두 값을 받지 않는다.
	 * 지출(EXPENSE)은 두 값이 모두 있어야 한다. 유형별로 필수 여부가 달라져
	 * Bean Validation 의 필드 단위 검증으로는 표현할 수 없어 여기서 검증한다.
	 */
	private void validateTypeFields(TransactionType type, boolean hasCategory, boolean hasPaymentMethod) {
		if (type == TransactionType.INCOME) {
			if (hasCategory || hasPaymentMethod) {
				throw new BusinessException(ExceptionType.INCOME_FIELD_NOT_ALLOWED);
			}
			return;
		}
		if (!hasCategory || !hasPaymentMethod) {
			throw new BusinessException(ExceptionType.EXPENSE_FIELD_REQUIRED);
		}
	}

	/**
	 * 카테고리 ID 가 있으면 소유권을 검증해 조회하고, 없으면(소득 거래이거나 PATCH 미전송) null 을 반환한다.
	 */
	private Category resolveCategory(Long userId, Long categoryId) {
		return categoryId == null ? null : categoryService.getOwnedCategory(userId, categoryId);
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
		return transactionHistoryRepository.findByIdAndUser_Id(transactionId, userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.TRANSACTION_HISTORY_NOT_FOUND));
	}
}
