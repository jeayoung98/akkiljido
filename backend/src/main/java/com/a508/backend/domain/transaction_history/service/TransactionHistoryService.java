package com.a508.backend.domain.transaction_history.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.category.repository.CategoryRepository;
import com.a508.backend.domain.transaction_history.dto.request.TransactionHistoryCreateRequest;
import com.a508.backend.domain.transaction_history.dto.request.TransactionHistoryUpdateRequest;
import com.a508.backend.domain.transaction_history.dto.response.TransactionHistoryResponse;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
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

	private final TransactionHistoryRepository transactionHistoryRepository;
	private final CategoryRepository categoryRepository;
	private final KakaoLocalApiClient kakaoLocalApiClient;

	@Transactional
	public TransactionHistoryResponse createTransactionHistory(Long userId, TransactionHistoryCreateRequest request) {
		RegionInfo region = resolveRegion(request.latitude(), request.longitude());

		TransactionHistory saved = transactionHistoryRepository.save(
			TransactionHistory.builder()
				.userId(userId)
				.category(categoryRepository.getReferenceById(request.categoryId()))
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
			categoryRepository.getReferenceById(request.categoryId()),
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
