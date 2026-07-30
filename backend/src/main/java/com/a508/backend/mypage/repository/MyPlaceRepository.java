package com.a508.backend.mypage.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.a508.backend.mypage.domain.MyPlace;

@Repository
public interface MyPlaceRepository extends JpaRepository<MyPlace, Long> {

	List<MyPlace> findAllByUser_IdOrderByIdAsc(Long userId);

	Optional<MyPlace> findByIdAndUser_Id(Long placeId, Long userId);

	boolean existsByUser_IdAndMyPlaceName(Long userId, String myPlaceName);

	boolean existsByUser_IdAndMyPlaceNameAndIdNot(
			Long userId,
			String myPlaceName,
			Long placeId
	);
}