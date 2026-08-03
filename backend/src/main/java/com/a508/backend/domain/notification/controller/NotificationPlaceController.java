package com.a508.backend.domain.notification.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.domain.notification.dto.NotificationPlaceResult;
import com.a508.backend.domain.notification.dto.request.NotificationPlaceCreateRequest;
import com.a508.backend.domain.notification.dto.response.NotificationPlaceListResponse;
import com.a508.backend.domain.notification.dto.response.NotificationPlaceResponse;
import com.a508.backend.domain.notification.service.NotificationPlaceService;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** 알림 장소 조회 및 관리 API를 제공하는 컨트롤러. */
@RestController
@RequestMapping("/api/v1/notification")
@RequiredArgsConstructor
public class NotificationPlaceController {

	private final NotificationPlaceService notificationPlaceService;

	/** 로그인 사용자가 등록한 알림 장소 목록을 조회한다. */
	@GetMapping
	public ResponseEntity<ResponseBody<NotificationPlaceListResponse>> getNotificationPlaces(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser
	) {
		List<NotificationPlaceResult> results = notificationPlaceService.getNotificationPlaces(
			authenticatedUser.getUserId()
		);
		NotificationPlaceListResponse response = NotificationPlaceListResponse.from(results);

		return ResponseEntity.ok(ResponseUtil.createSuccessResponse(response));
	}

	/** 로그인 사용자의 알림 장소를 등록한다. */
	@PostMapping
	public ResponseEntity<ResponseBody<NotificationPlaceResponse>> createNotificationPlace(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@Valid @RequestBody NotificationPlaceCreateRequest request
	) {
		request.validate();

		NotificationPlaceResult result = notificationPlaceService.createNotificationPlace(
			authenticatedUser.getUserId(),
			request
		);
		NotificationPlaceResponse response = NotificationPlaceResponse.from(result);

		return ResponseEntity.ok(ResponseUtil.createSuccessResponse(response));
	}
}
