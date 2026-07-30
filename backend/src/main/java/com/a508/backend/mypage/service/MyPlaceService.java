package com.a508.backend.mypage.service;

import java.math.BigDecimal;
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

@Service
public class MyPlaceService {

	private static final BigDecimal MIN_LATITUDE = BigDecimal.valueOf(-90);
	private static final BigDecimal MAX_LATITUDE = BigDecimal.valueOf(90);
	private static final BigDecimal MIN_LONGITUDE = BigDecimal.valueOf(-180);
	private static final BigDecimal MAX_LONGITUDE = BigDecimal.valueOf(180);

	private final MyPlaceRepository myPlaceRepository;
	private final UserRepository userRepository;

	public MyPlaceService(MyPlaceRepository myPlaceRepository, UserRepository userRepository) {
		this.myPlaceRepository = myPlaceRepository;
		this.userRepository = userRepository;
	}

	@Transactional(readOnly = true)
	public List<MyPlaceResult> getMyPlaces(Long userId) {
		return myPlaceRepository.findAllByUser_IdOrderByIdAsc(userId)
				.stream()
				.map(MyPlaceResult::from)
				.toList();
	}

	@Transactional
	public MyPlaceResult createMyPlace(
			Long userId,
			MyPlaceCreateRequest request
	) {
		String normalizedPlaceName = request.myPlaceName().trim();
		String normalizedAddress = request.address().trim();

		validateCoordinate(
				request.latitude(),
				request.longitude()
		);

		validateDuplicatePlaceName(
				userId,
				normalizedPlaceName
		);

		User user = findUser(userId);

		MyPlace myPlace = MyPlace.create(
				user,
				normalizedPlaceName,
				normalizedAddress,
				request.latitude(),
				request.longitude()
		);

		MyPlace savedMyPlace = myPlaceRepository.save(myPlace);

		return MyPlaceResult.from(savedMyPlace);
	}

	@Transactional
	public MyPlaceResult updateMyPlace(
			Long userId,
			Long placeId,
			MyPlaceUpdateRequest request
	) {
		validatePlaceId(placeId);
		validateUpdateRequest(request);

		MyPlace myPlace = findMyPlace(placeId, userId);

		if (request.myPlaceName() != null) {
			String normalizedPlaceName =
					request.myPlaceName().trim();

			validateDuplicatePlaceNameForUpdate(
					userId,
					normalizedPlaceName,
					placeId
			);

			myPlace.updateName(normalizedPlaceName);
		}

		if (hasLocationUpdate(request)) {
			String normalizedAddress =
					request.address().trim();

			validateCoordinate(
					request.latitude(),
					request.longitude()
			);

			myPlace.updateLocation(
					normalizedAddress,
					request.latitude(),
					request.longitude()
			);
		}

		return MyPlaceResult.from(myPlace);
	}

	@Transactional
	public void deleteMyPlace(
			Long userId,
			Long placeId
	) {
		validatePlaceId(placeId);

		MyPlace myPlace = findMyPlace(placeId, userId);

		myPlaceRepository.delete(myPlace);
	}

	private User findUser(Long userId) {
		return userRepository.findById(userId)
				.orElseThrow(
						() -> new BusinessException(
								ExceptionType.UNAUTHENTICATED
						)
				);
	}

	private MyPlace findMyPlace(
			Long placeId,
			Long userId
	) {
		return myPlaceRepository.findByIdAndUser_Id(placeId, userId)
				.orElseThrow(
						() -> new BusinessException(
								ExceptionType.MY_PLACE_NOT_FOUND
						)
				);
	}

	private void validatePlaceId(Long placeId) {
		if (placeId == null || placeId <= 0) {
			throw new BusinessException(
					ExceptionType.INVALID_PLACE_ID
			);
		}
	}

	private void validateUpdateRequest(
			MyPlaceUpdateRequest request
	) {
		boolean noFieldsProvided =
				request.myPlaceName() == null
						&& request.address() == null
						&& request.latitude() == null
						&& request.longitude() == null;

		if (noFieldsProvided) {
			throw new BusinessException(
					ExceptionType.EMPTY_PLACE_UPDATE
			);
		}

		validateUpdatePlaceName(request.myPlaceName());
		validateLocationFields(request);
	}

	private void validateUpdatePlaceName(
			String myPlaceName
	) {
		if (myPlaceName != null && myPlaceName.isBlank()) {
			throw new BusinessException(
					ExceptionType.INVALID_PLACE_INPUT
			);
		}
	}

	private void validateLocationFields(
			MyPlaceUpdateRequest request
	) {
		boolean hasAddress = request.address() != null;
		boolean hasLatitude = request.latitude() != null;
		boolean hasLongitude = request.longitude() != null;

		boolean hasAnyLocationField =
				hasAddress
						|| hasLatitude
						|| hasLongitude;

		boolean hasAllLocationFields =
				hasAddress
						&& hasLatitude
						&& hasLongitude;

		if (hasAnyLocationField && !hasAllLocationFields) {
			throw new BusinessException(
					ExceptionType.INCOMPLETE_PLACE_LOCATION
			);
		}

		if (hasAddress && request.address().isBlank()) {
			throw new BusinessException(
					ExceptionType.INVALID_PLACE_INPUT
			);
		}
	}

	private boolean hasLocationUpdate(
			MyPlaceUpdateRequest request
	) {
		return request.address() != null
				&& request.latitude() != null
				&& request.longitude() != null;
	}

	private void validateCoordinate(
			BigDecimal latitude,
			BigDecimal longitude
	) {
		boolean invalidLatitude =
				latitude.compareTo(MIN_LATITUDE) < 0
						|| latitude.compareTo(MAX_LATITUDE) > 0;

		boolean invalidLongitude =
				longitude.compareTo(MIN_LONGITUDE) < 0
						|| longitude.compareTo(MAX_LONGITUDE) > 0;

		if (invalidLatitude || invalidLongitude) {
			throw new BusinessException(
					ExceptionType.INVALID_PLACE_COORDINATE
			);
		}
	}

	private void validateDuplicatePlaceName(
			Long userId,
			String myPlaceName
	) {
		boolean duplicated =
				myPlaceRepository.existsByUser_IdAndMyPlaceName(
						userId,
						myPlaceName
				);

		if (duplicated) {
			throw new BusinessException(
					ExceptionType.DUPLICATE_PLACE_NAME
			);
		}
	}

	private void validateDuplicatePlaceNameForUpdate(
			Long userId,
			String myPlaceName,
			Long placeId
	) {
		boolean duplicated =
				myPlaceRepository.existsByUser_IdAndMyPlaceNameAndIdNot(
						userId,
						myPlaceName,
						placeId
				);

		if (duplicated) {
			throw new BusinessException(
					ExceptionType.DUPLICATE_PLACE_NAME
			);
		}
	}
}