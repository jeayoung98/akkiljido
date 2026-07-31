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
import com.a508.backend.user.domain.User;

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
