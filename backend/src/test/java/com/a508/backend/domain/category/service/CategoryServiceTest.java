package com.a508.backend.domain.category.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

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
	@DisplayName("내 카테고리면 예외 없이 통과한다")
	void passesWhenCategoryBelongsToUser() {
		when(categoryRepository.findByIdAndUser_Id(3L, USER_ID)).thenReturn(Optional.of(category()));

		assertThatNoException().isThrownBy(() -> categoryService.validateOwnership(USER_ID, 3L));
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
		when(categoryRepository.findByIdAndUser_Id(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> categoryService.validateOwnership(USER_ID, 99L))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.CATEGORY_NOT_FOUND);
	}
}
