package com.a508.backend.domain.category.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.domain.category.dto.response.CategoryListResponse;
import com.a508.backend.domain.category.service.CategoryService;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "카테고리", description = "카테고리 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/category")
public class CategoryController {

	private final CategoryService categoryService;

	@Operation(summary = "카테고리 조회", description = "로그인한 회원의 카테고리 목록을 조회한다.")
	@GetMapping
	public ResponseBody<CategoryListResponse> getCategories(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
		CategoryListResponse response = categoryService.getCategories(authenticatedUser.getUserId());
		return ResponseUtil.createSuccessResponse(response);
	}
}
