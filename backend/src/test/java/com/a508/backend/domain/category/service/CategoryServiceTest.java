package com.a508.backend.domain.category.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.category.repository.CategoryRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private CategoryRepository categoryRepository;

	@InjectMocks
	private CategoryService categoryService;

	private Category category() {
		return Category.builder()
			.user(User.createGoogleGuest("sub"))
			.name("음식점")
			.build();
	}

	@Test
	@DisplayName("categoryId 가 null 이면 전체 조회이므로 검증하지 않는다")
	void skipsValidationWhenCategoryIdIsNull() {
		categoryService.validateOwnership(USER_ID, null);

		verifyNoInteractions(categoryRepository);
	}

	@Test
	@DisplayName("categoryId 목록이 비어 있으면 전체 조회이므로 검증하지 않는다")
	void skipsValidationWhenCategoryIdsAreEmpty() {
		categoryService.validateOwnership(USER_ID, List.of());

		verifyNoInteractions(categoryRepository);
	}

	@Test
	@DisplayName("내 카테고리면 예외 없이 통과한다")
	void passesWhenCategoryBelongsToUser() {
		when(categoryRepository.countByIdInAndUser_Id(List.of(3L), USER_ID)).thenReturn(1L);

		assertThatNoException().isThrownBy(() -> categoryService.validateOwnership(USER_ID, List.of(3L)));
	}

	@Test
	@DisplayName("여러 카테고리를 넘겨도 모두 내 소유면 단일 쿼리로 검증하고 통과한다")
	void passesWhenAllCategoriesBelongToUser() {
		when(categoryRepository.countByIdInAndUser_Id(List.of(1L, 3L), USER_ID)).thenReturn(2L);

		assertThatNoException().isThrownBy(() -> categoryService.validateOwnership(USER_ID, List.of(1L, 3L)));
	}

	@Test
	@DisplayName("중복 ID 는 하나로 취급하여 개수 비교가 어긋나지 않는다")
	void deduplicatesCategoryIds() {
		when(categoryRepository.countByIdInAndUser_Id(List.of(3L), USER_ID)).thenReturn(1L);

		assertThatNoException().isThrownBy(() -> categoryService.validateOwnership(USER_ID, List.of(3L, 3L)));
	}

	@Test
	@DisplayName("categoryId=1, 처럼 빈 구간이 섞여 null 원소가 들어와도 무시하고 검증한다")
	void ignoresNullCategoryIds() {
		when(categoryRepository.countByIdInAndUser_Id(List.of(3L), USER_ID)).thenReturn(1L);

		assertThatNoException()
			.isThrownBy(() -> categoryService.validateOwnership(USER_ID, Arrays.asList(3L, null)));
	}

	@Test
	@DisplayName("null 원소만 들어오면 전체 조회로 보고 검증하지 않는다")
	void skipsValidationWhenOnlyNullCategoryIds() {
		categoryService.validateOwnership(USER_ID, Collections.singletonList(null));

		verifyNoInteractions(categoryRepository);
	}

	@Test
	@DisplayName("여러 카테고리 중 하나라도 내 소유가 아니면 CATEGORY_NOT_FOUND 예외를 던진다")
	void throwsWhenAnyCategoryNotOwned() {
		when(categoryRepository.countByIdInAndUser_Id(List.of(3L, 99L), USER_ID)).thenReturn(1L);

		assertThatThrownBy(() -> categoryService.validateOwnership(USER_ID, List.of(3L, 99L)))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.CATEGORY_NOT_FOUND);
	}

	@Test
	@DisplayName("getOwnedCategory 는 내 카테고리를 반환한다")
	void returnsOwnedCategory() {
		Category category = category();
		when(categoryRepository.findByIdAndUser_Id(3L, USER_ID)).thenReturn(Optional.of(category));

		assertThat(categoryService.getOwnedCategory(USER_ID, 3L)).isSameAs(category);
	}

	@Test
	@DisplayName("getOwnedCategory 는 다른 회원의 카테고리면 CATEGORY_NOT_FOUND 예외를 던진다")
	void getOwnedCategoryThrowsWhenNotOwned() {
		when(categoryRepository.findByIdAndUser_Id(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> categoryService.getOwnedCategory(USER_ID, 99L))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.CATEGORY_NOT_FOUND);
	}

	@Test
	@DisplayName("없거나 다른 회원의 카테고리면 CATEGORY_NOT_FOUND 예외를 던진다")
	void throwsWhenCategoryNotOwned() {
		when(categoryRepository.countByIdInAndUser_Id(List.of(99L), USER_ID)).thenReturn(0L);

		assertThatThrownBy(() -> categoryService.validateOwnership(USER_ID, List.of(99L)))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.CATEGORY_NOT_FOUND);
	}
}
