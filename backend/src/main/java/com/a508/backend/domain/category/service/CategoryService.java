package com.a508.backend.domain.category.service;

import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.category.dto.response.CategoryListResponse;
import com.a508.backend.domain.category.dto.response.CategoryResponse;
import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.category.entity.DefaultCategory;
import com.a508.backend.domain.category.repository.CategoryRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoryService {

	private final CategoryRepository categoryRepository;

	@Transactional(readOnly = true)
	public CategoryListResponse getCategories(Long userId) {
		List<CategoryResponse> categories = categoryRepository.findAllByUser_IdOrderByIdAsc(userId).stream()
			.map(CategoryResponse::from)
			.toList();
		return CategoryListResponse.from(categories);
	}

	/**
	 * 카테고리 필터가 지정된 경우, 해당 카테고리가 요청 회원 소유인지 검증한다.
	 * categoryId 가 null 이면 전체 조회이므로 검증하지 않는다.
	 */
	@Transactional(readOnly = true)
	public void validateOwnership(Long userId, Long categoryId) {
		if (categoryId == null) {
			return;
		}
		categoryRepository.findByIdAndUser_Id(categoryId, userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.CATEGORY_NOT_FOUND));
	}

	/**
	 * 회원가입 시 해당 회원에게 기본 카테고리 목록을 생성한다.
	 */
	@Transactional
	public void createDefaultCategories(User user) {
		List<Category> defaults = Arrays.stream(DefaultCategory.values())
			.map(defaultCategory -> Category.builder()
				.user(user)
				.name(defaultCategory.getCategoryName())
				.build())
			.toList();
		categoryRepository.saveAll(defaults);
	}
}
