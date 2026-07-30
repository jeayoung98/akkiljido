package com.a508.backend.mypage.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.a508.backend.mypage.domain.MyPlace;

@Repository
public interface MyPlaceRepository extends JpaRepository<MyPlace, Long> {

	List<MyPlace> findAllByUserIdOrderByIdAsc(Long userId);

	Optional<MyPlace> findByIdAndUserId(Long placeId, Long userId);

	boolean existsByUserIdAndMyPlaceName(Long userId, String myPlaceName);

	boolean existsByUserIdAndMyPlaceNameAndIdNot(
		Long userId,
		String myPlaceName,
		Long placeId
	);
}
