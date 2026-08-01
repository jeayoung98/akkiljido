package com.a508.backend.domain.mypage.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.mypage.dto.MyPlaceUpdateRequest;
import com.a508.backend.domain.mypage.repository.MyPlaceRepository;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.domain.mypage.dto.MyPlaceCreateRequest;
import com.a508.backend.domain.mypage.dto.MyPlaceResult;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.service.UserService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MyPlaceService {

	private final MyPlaceRepository myPlaceRepository;
	private final UserService userService;

	@Transactional(readOnly = true)
	public List<MyPlaceResult> getMyPlaces(Long userId) {
		return getOwnedMyPlaces(userId)
			.stream()
			.map(MyPlaceResult::from)
			.toList();
	}

	/**
	 * 요청 회원이 등록한 장소 목록을 엔티티로 조회한다.
	 * 좌표 등 엔티티 자체가 필요한 다른 도메인(예: 거래내역 지도 조회)에서 사용한다.
	 */
	@Transactional(readOnly = true)
	public List<MyPlace> getOwnedMyPlaces(Long userId) {
		return myPlaceRepository.findAllByUser_IdOrderByIdAsc(userId);
	}

	/**
	 * 요청 회원이 소유한 장소를 조회한다. 없거나 다른 회원 소유면 MY_PLACE_NOT_FOUND 예외를 던진다.
	 */
	@Transactional(readOnly = true)
	public MyPlace getOwnedMyPlace(Long userId, Long placeId) {
		return myPlaceRepository.findByIdAndUser_Id(placeId, userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.MY_PLACE_NOT_FOUND));
	}

	@Transactional
	public MyPlaceResult createMyPlace(Long userId, MyPlaceCreateRequest request) {
		String normalizedPlaceName = request.myPlaceName().trim();
		String normalizedAddress = request.address().trim();

		validateDuplicatePlaceName(userId, normalizedPlaceName);

		User user = userService.getUser(userId);
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
		MyPlace myPlace = getOwnedMyPlace(userId, placeId);

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
		MyPlace myPlace = getOwnedMyPlace(userId, placeId);
		myPlaceRepository.delete(myPlace);
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
