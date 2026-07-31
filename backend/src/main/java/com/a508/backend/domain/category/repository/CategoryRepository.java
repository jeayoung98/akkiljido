package com.a508.backend.domain.category.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.a508.backend.domain.category.entity.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findAllByUser_IdOrderByIdAsc(Long userId);

    Optional<Category> findByIdAndUser_Id(Long id, Long userId);
}
