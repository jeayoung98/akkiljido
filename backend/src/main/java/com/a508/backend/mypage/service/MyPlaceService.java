package com.a508.backend.mypage.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.mypage.domain.MyPlace;
import com.a508.backend.mypage.dto.MyPlaceCreateRequest;
import com.a508.backend.mypage.dto.MyPlaceResult;
import com.a508.backend.mypage.dto.MyPlaceUpdateRequest;
import com.a508.backend.mypage.repository.MyPlaceRepository;
import com.a508.backend.user.domain.User;
import com.a508.backend.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MyPlaceService {

	private final MyPlaceRepository myPlaceRepository;
	private final UserRepository userRepository;

	@Transactional(readOnly = true)
	public List<MyPlaceResult> getMyPlaces(Long userId) {
		return myPlaceRepository.findAllByUser_IdOrderByIdAsc(userId)
			.stream()
			.map(MyPlaceResult::from)
			.toList();
	}

	@Transactional
	public MyPlaceResult createMyPlace(Long userId, MyPlaceCreateRequest request) {
		String normalizedPlaceName = request.myPlaceName().trim();
		String normalizedAddress = request.address().trim();

		validateDuplicatePlaceName(userId, normalizedPlaceName);

		User user = findUser(userId);
		MyPlace myPlace = MyPlace.create(
			user,
			normalizedPlaceName,
			normalizedAddress,
			request.latitude(),
			request.longitude()
		);

		return MyPlaceResult.from(myPlaceRepository.save(myPlace));
	}

	@Transactional
	public MyPlaceResult updateMyPlace(Long userId, Long placeId, MyPlaceUpdateRequest request) {
		MyPlace myPlace = findMyPlace(placeId, userId);

		if (request.myPlaceName() != null) {
			String normalizedPlaceName = request.myPlaceName().trim();
			validateDuplicatePlaceNameForUpdate(userId, normalizedPlaceName, placeId);
			myPlace.updateName(normalizedPlaceName);
		}

		if (request.address() != null) {
			myPlace.updateLocation(
				request.address().trim(),
				request.latitude(),
				request.longitude()
			);
		}

		return MyPlaceResult.from(myPlace);
	}

	@Transactional
	public void deleteMyPlace(Long userId, Long placeId) {
		MyPlace myPlace = findMyPlace(placeId, userId);
		myPlaceRepository.delete(myPlace);
	}

	private User findUser(Long userId) {
		return userRepository.findById(userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.UNAUTHENTICATED));
	}

	private MyPlace findMyPlace(Long placeId, Long userId) {
		return myPlaceRepository.findByIdAndUser_Id(placeId, userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.MY_PLACE_NOT_FOUND));
	}

	private void validateDuplicatePlaceName(Long userId, String myPlaceName) {
		boolean duplicated = myPlaceRepository.existsByUser_IdAndMyPlaceName(userId, myPlaceName);

		if (duplicated) {
			throw new BusinessException(ExceptionType.DUPLICATE_PLACE_NAME);
		}
	}

	private void validateDuplicatePlaceNameForUpdate(Long userId, String myPlaceName, Long placeId) {
		boolean duplicated = myPlaceRepository.existsByUser_IdAndMyPlaceNameAndIdNot(
			userId,
			myPlaceName,
			placeId
		);

		if (duplicated) {
			throw new BusinessException(ExceptionType.DUPLICATE_PLACE_NAME);
		}
	}
}
