package com.a508.backend.domain.transaction_history.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.domain.transaction_history.dto.request.TransactionHistoryCreateRequest;
import com.a508.backend.domain.transaction_history.dto.request.TransactionHistoryUpdateRequest;
import com.a508.backend.domain.transaction_history.dto.response.TransactionHistoryResponse;
import com.a508.backend.domain.transaction_history.service.TransactionHistoryService;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "거래내역", description = "거래내역 등록/조회/수정/삭제 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/transaction")
public class TransactionHistoryController {

	private final TransactionHistoryService transactionHistoryService;

	@Operation(summary = "거래내역 등록", description = "새로운 거래내역을 등록한다.")
	@PostMapping
	public ResponseBody<TransactionHistoryResponse> createTransactionHistory(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@Valid @RequestBody TransactionHistoryCreateRequest request) {
		TransactionHistoryResponse response = transactionHistoryService.createTransactionHistory(
			authenticatedUser.getUserId(), request);
		return ResponseUtil.createSuccessResponse(response);
	}

	@Operation(summary = "거래내역 상세 조회", description = "거래내역 단건을 조회한다.")
	@GetMapping("/{transactionId}")
	public ResponseBody<TransactionHistoryResponse> findOneTransactionHistory(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@PathVariable Long transactionId) {
		TransactionHistoryResponse response = transactionHistoryService.findOneTransactionHistoryResponse(
			authenticatedUser.getUserId(), transactionId);
		return ResponseUtil.createSuccessResponse(response);
	}

	@Operation(summary = "거래내역 수정", description = "거래내역 단건을 수정한다.")
	@PatchMapping("/{transactionId}")
	public ResponseBody<TransactionHistoryResponse> updateTransactionHistory(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@PathVariable Long transactionId,
		@Valid @RequestBody TransactionHistoryUpdateRequest request) {
		TransactionHistoryResponse response = transactionHistoryService.updateTransactionHistory(
			authenticatedUser.getUserId(), transactionId, request);
		return ResponseUtil.createSuccessResponse(response);
	}

	@Operation(summary = "거래내역 삭제", description = "거래내역 단건을 삭제한다.")
	@DeleteMapping("/{transactionId}")
	public ResponseBody<Void> deleteTransactionHistory(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@PathVariable Long transactionId) {
		transactionHistoryService.deleteTransactionHistory(authenticatedUser.getUserId(), transactionId);
		return ResponseUtil.createSuccessResponse();
	}
}
