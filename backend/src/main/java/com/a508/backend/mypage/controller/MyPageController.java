package com.a508.backend.mypage.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.mypage.dto.MyPlaceCreateRequest;
import com.a508.backend.mypage.dto.MyPlaceResponse;
import com.a508.backend.mypage.dto.MyPlaceResult;
import com.a508.backend.mypage.dto.MyPlaceUpdateRequest;
import com.a508.backend.mypage.service.MyPlaceService;
import com.a508.backend.mypage.support.CurrentUserIdProvider;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/my")
public class MyPageController {

	private final MyPlaceService myPlaceService;
	private final CurrentUserIdProvider currentUserIdProvider;

	public MyPageController(
		MyPlaceService myPlaceService,
		CurrentUserIdProvider currentUserIdProvider
	) {
		this.myPlaceService = myPlaceService;
		this.currentUserIdProvider = currentUserIdProvider;
	}

	// 내 장소 전체 조회 api
	@GetMapping("/place")
	public ResponseEntity<ResponseBody<List<MyPlaceResponse>>> getMyPlaces() {
		Long userId = currentUserIdProvider.getCurrentUserId();

		List<MyPlaceResponse> data = myPlaceService.getMyPlaces(userId)
			.stream()
			.map(MyPlaceResponse::from)
			.toList();

		return ResponseEntity.ok(ResponseUtil.createSuccessResponse(data));
	}

	// 내 장소 추가 api
	@PostMapping("/place")
	public ResponseEntity<ResponseBody<MyPlaceResponse>> createMyPlace(
		@Valid @RequestBody MyPlaceCreateRequest request
	) {
		Long userId = currentUserIdProvider.getCurrentUserId();
		MyPlaceResult result = myPlaceService.createMyPlace(userId, request);
		MyPlaceResponse data = MyPlaceResponse.from(result);

		return ResponseEntity.ok(ResponseUtil.createSuccessResponse(data));
	}

	// 내 장소 수정 api
	@PatchMapping("/place/{placeId}")
	public ResponseEntity<ResponseBody<MyPlaceResponse>> updateMyPlace(
		@PathVariable Long placeId,
		@Valid @RequestBody MyPlaceUpdateRequest request
	) {
		Long userId = currentUserIdProvider.getCurrentUserId();
		MyPlaceResult result = myPlaceService.updateMyPlace(userId, placeId, request);
		MyPlaceResponse data = MyPlaceResponse.from(result);

		return ResponseEntity.ok(ResponseUtil.createSuccessResponse(data));
	}

	// 내 장소 삭제 api
	@DeleteMapping("/place/{placeId}")
	public ResponseEntity<ResponseBody<Void>> deleteMyPlace(
		@PathVariable Long placeId
	) {
		Long userId = currentUserIdProvider.getCurrentUserId();

		myPlaceService.deleteMyPlace(userId, placeId);

		return ResponseEntity.ok(ResponseUtil.createSuccessResponse());
	}
}
