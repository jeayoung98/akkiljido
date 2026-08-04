package com.a508.backend.domain.category.service;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

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
	 * 요청 회원이 소유한 카테고리를 조회한다. 없거나 다른 회원 소유면 예외를 던진다.
	 * 거래내역 등록/수정처럼 카테고리를 실제로 참조해야 하는 곳에서 사용한다.
	 * getReferenceById 와 달리 소유권을 검증하므로, 남의 카테고리 ID 를 넘기는 요청을 막는다.
	 */
	@Transactional(readOnly = true)
	public Category getOwnedCategory(Long userId, Long categoryId) {
		return categoryRepository.findByIdAndUser_Id(categoryId, userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.CATEGORY_NOT_FOUND));
	}

	/**
	 * 카테고리 필터가 지정된 경우, 해당 카테고리들이 모두 요청 회원 소유인지 검증한다.
	 * null 이거나 비어 있으면 전체 조회이므로 검증하지 않는다.
	 * 중복 ID 나 null 원소(예: {@code categoryId=1,})가 섞여 들어와도 개수 비교가 어긋나지 않도록 정리한 뒤 비교한다.
	 * 하나라도 없거나 다른 회원 소유면 예외를 던진다(부분 무시하지 않음).
	 */
	@Transactional(readOnly = true)
	public void validateOwnership(Long userId, List<Long> categoryIds) {
		if (categoryIds == null || categoryIds.isEmpty()) {
			return;
		}
		List<Long> distinctIds = categoryIds.stream().filter(Objects::nonNull).distinct().toList();
		if (distinctIds.isEmpty()) {
			return;
		}
		if (categoryRepository.countByIdInAndUser_Id(distinctIds, userId) != distinctIds.size()) {
			throw new BusinessException(ExceptionType.CATEGORY_NOT_FOUND);
		}
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
