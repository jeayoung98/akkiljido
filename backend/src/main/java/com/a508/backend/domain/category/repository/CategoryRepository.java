package com.a508.backend.domain.category.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.a508.backend.domain.category.entity.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findAllByUser_IdOrderByIdAsc(Long userId);

    Optional<Category> findByIdAndUser_Id(Long id, Long userId);

    /** 주어진 ID 중 해당 회원이 소유한 카테고리 수. 다중 카테고리 소유권 검증을 단일 쿼리로 처리한다. */
    long countByIdInAndUser_Id(List<Long> ids, Long userId);

    /** 해당 회원에게 카테고리가 하나라도 있는지. 기본 카테고리 중복 생성을 막는 데 사용한다. */
    boolean existsByUser_Id(Long userId);
}
