package com.a508.backend.mypage.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
import com.a508.backend.global.security.AuthenticatedUser;
import com.a508.backend.mypage.dto.MyPlaceCreateRequest;
import com.a508.backend.mypage.dto.MyPlaceResponse;
import com.a508.backend.mypage.dto.MyPlaceResult;
import com.a508.backend.mypage.dto.MyPlaceUpdateRequest;
import com.a508.backend.mypage.service.MyPlaceService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/my")
public class MyPageController {

	private final MyPlaceService myPlaceService;

	public MyPageController(MyPlaceService myPlaceService) {
		this.myPlaceService = myPlaceService;
	}

	@GetMapping("/place")
	public ResponseEntity<ResponseBody<List<MyPlaceResponse>>> getMyPlaces(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser
	) {
		List<MyPlaceResponse> data =
			myPlaceService.getMyPlaces(authenticatedUser.getUserId())
				.stream()
				.map(MyPlaceResponse::from)
				.toList();

		return ResponseEntity.ok(
			ResponseUtil.createSuccessResponse(data)
		);
	}

	@PostMapping("/place")
	public ResponseEntity<ResponseBody<MyPlaceResponse>> createMyPlace(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@Valid @RequestBody MyPlaceCreateRequest request
	) {
		MyPlaceResult result = myPlaceService.createMyPlace(
			authenticatedUser.getUserId(),
			request
		);

		return ResponseEntity.ok(
			ResponseUtil.createSuccessResponse(
				MyPlaceResponse.from(result)
			)
		);
	}

	@PatchMapping("/place/{placeId}")
	public ResponseEntity<ResponseBody<MyPlaceResponse>> updateMyPlace(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@PathVariable Long placeId,
		@Valid @RequestBody MyPlaceUpdateRequest request
	) {
		MyPlaceResult result = myPlaceService.updateMyPlace(
			authenticatedUser.getUserId(),
			placeId,
			request
		);

		return ResponseEntity.ok(
			ResponseUtil.createSuccessResponse(
				MyPlaceResponse.from(result)
			)
		);
	}

	@DeleteMapping("/place/{placeId}")
	public ResponseEntity<ResponseBody<Void>> deleteMyPlace(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@PathVariable Long placeId
	) {
		myPlaceService.deleteMyPlace(
			authenticatedUser.getUserId(),
			placeId
		);

		return ResponseEntity.ok(
			ResponseUtil.createSuccessResponse()
		);
	}
}