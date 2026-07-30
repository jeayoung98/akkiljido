package com.a508.backend.mypage.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.mypage.domain.MyPlace;
import com.a508.backend.mypage.dto.MyPlaceCreateRequest;
import com.a508.backend.mypage.dto.MyPlaceResult;
import com.a508.backend.mypage.dto.MyPlaceUpdateRequest;
import com.a508.backend.mypage.repository.MyPlaceRepository;

@ExtendWith(MockitoExtension.class)
class MyPlaceServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private MyPlaceRepository myPlaceRepository;

	private MyPlaceService myPlaceService;

	@BeforeEach
	void setUp() {
		myPlaceService = new MyPlaceService(myPlaceRepository);
	}

	@Test
	void getMyPlaces() {
		MyPlace home = createMyPlace(
			1L,
			"집",
			"서울 마포구",
			"37.5563",
			"126.9236"
		);

		MyPlace company = createMyPlace(
			2L,
			"회사",
			"서울 강남구",
			"37.5007",
			"127.0365"
		);

		given(myPlaceRepository.findAllByUserIdOrderByIdAsc(USER_ID))
			.willReturn(List.of(home, company));

		List<MyPlaceResult> results =
			myPlaceService.getMyPlaces(USER_ID);

		assertThat(results).hasSize(2);

		assertThat(results.get(0).placeId()).isEqualTo(1L);
		assertThat(results.get(0).myPlaceName()).isEqualTo("집");
		assertThat(results.get(0).address()).isEqualTo("서울 마포구");
		assertThat(results.get(0).latitude())
			.isEqualByComparingTo("37.5563");
		assertThat(results.get(0).longitude())
			.isEqualByComparingTo("126.9236");

		assertThat(results.get(1).placeId()).isEqualTo(2L);
		assertThat(results.get(1).myPlaceName()).isEqualTo("회사");
	}

	@Test
	void getEmptyMyPlaces() {
		given(myPlaceRepository.findAllByUserIdOrderByIdAsc(USER_ID))
			.willReturn(List.of());

		List<MyPlaceResult> results =
			myPlaceService.getMyPlaces(USER_ID);

		assertThat(results).isEmpty();
	}

	@Test
	void createMyPlace() {
		MyPlaceCreateRequest request =
			new MyPlaceCreateRequest(
				" 집 ",
				" 서울 마포구 ",
				new BigDecimal("37.5563"),
				new BigDecimal("126.9236")
			);

		given(
			myPlaceRepository.existsByUserIdAndMyPlaceName(
				USER_ID,
				"집"
			)
		).willReturn(false);

		given(myPlaceRepository.save(any(MyPlace.class)))
			.willAnswer(invocation -> {
				MyPlace myPlace = invocation.getArgument(0);

				ReflectionTestUtils.setField(
					myPlace,
					"id",
					1L
				);

				return myPlace;
			});

		MyPlaceResult result =
			myPlaceService.createMyPlace(
				USER_ID,
				request
			);

		assertThat(result.placeId()).isEqualTo(1L);
		assertThat(result.myPlaceName()).isEqualTo("집");
		assertThat(result.address()).isEqualTo("서울 마포구");
		assertThat(result.latitude())
			.isEqualByComparingTo("37.5563");
		assertThat(result.longitude())
			.isEqualByComparingTo("126.9236");

		ArgumentCaptor<MyPlace> captor =
			ArgumentCaptor.forClass(MyPlace.class);

		verify(myPlaceRepository).save(captor.capture());

		MyPlace savedMyPlace = captor.getValue();

		assertThat(savedMyPlace.getUserId())
			.isEqualTo(USER_ID);
		assertThat(savedMyPlace.getMyPlaceName())
			.isEqualTo("집");
		assertThat(savedMyPlace.getAddress())
			.isEqualTo("서울 마포구");
	}

	@Test
	void rejectInvalidCoordinateWhenCreatingMyPlace() {
		MyPlaceCreateRequest request =
			new MyPlaceCreateRequest(
				"집",
				"서울 마포구",
				new BigDecimal("90.1"),
				new BigDecimal("126.9236")
			);

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.createMyPlace(
					USER_ID,
					request
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.INVALID_PLACE_COORDINATE);

		verifyNoInteractions(myPlaceRepository);
	}

	@Test
	void rejectDuplicateNameWhenCreatingMyPlace() {
		MyPlaceCreateRequest request =
			new MyPlaceCreateRequest(
				"집",
				"서울 마포구",
				new BigDecimal("37.5563"),
				new BigDecimal("126.9236")
			);

		given(
			myPlaceRepository.existsByUserIdAndMyPlaceName(
				USER_ID,
				"집"
			)
		).willReturn(true);

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.createMyPlace(
					USER_ID,
					request
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.DUPLICATE_PLACE_NAME);

		verify(myPlaceRepository, never())
			.save(any(MyPlace.class));
	}

	@Test
	void updateMyPlaceName() {
		MyPlace myPlace = createMyPlace(
			1L,
			"집",
			"서울 마포구",
			"37.5563",
			"126.9236"
		);

		MyPlaceUpdateRequest request =
			new MyPlaceUpdateRequest(
				" 우리 집 ",
				null,
				null,
				null
			);

		given(myPlaceRepository.findById(1L))
			.willReturn(Optional.of(myPlace));

		given(
			myPlaceRepository.existsByUserIdAndMyPlaceNameAndIdNot(
				USER_ID,
				"우리 집",
				1L
			)
		).willReturn(false);

		MyPlaceResult result =
			myPlaceService.updateMyPlace(
				USER_ID,
				1L,
				request
			);

		assertThat(result.myPlaceName())
			.isEqualTo("우리 집");

		assertThat(myPlace.getMyPlaceName())
			.isEqualTo("우리 집");

		assertThat(result.address())
			.isEqualTo("서울 마포구");
	}

	@Test
	void updateMyPlaceLocation() {
		MyPlace myPlace = createMyPlace(
			1L,
			"집",
			"서울 마포구",
			"37.5563",
			"126.9236"
		);

		MyPlaceUpdateRequest request =
			new MyPlaceUpdateRequest(
				null,
				" 서울 마포구 연남동 ",
				new BigDecimal("37.5638"),
				new BigDecimal("126.9217")
			);

		given(myPlaceRepository.findById(1L))
			.willReturn(Optional.of(myPlace));

		MyPlaceResult result =
			myPlaceService.updateMyPlace(
				USER_ID,
				1L,
				request
			);

		assertThat(result.myPlaceName())
			.isEqualTo("집");

		assertThat(result.address())
			.isEqualTo("서울 마포구 연남동");

		assertThat(result.latitude())
			.isEqualByComparingTo("37.5638");

		assertThat(result.longitude())
			.isEqualByComparingTo("126.9217");
	}

	@Test
	void rejectEmptyMyPlaceUpdate() {
		MyPlaceUpdateRequest request =
			new MyPlaceUpdateRequest(
				null,
				null,
				null,
				null
			);

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.updateMyPlace(
					USER_ID,
					1L,
					request
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.EMPTY_PLACE_UPDATE);

		verifyNoInteractions(myPlaceRepository);
	}

	@Test
	void rejectIncompleteLocationUpdate() {
		MyPlaceUpdateRequest request =
			new MyPlaceUpdateRequest(
				null,
				"서울 마포구 연남동",
				null,
				null
			);

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.updateMyPlace(
					USER_ID,
					1L,
					request
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(
				ExceptionType.INCOMPLETE_PLACE_LOCATION
			);

		verifyNoInteractions(myPlaceRepository);
	}

	@Test
	void rejectLatitudeOnlyUpdate() {
		MyPlaceUpdateRequest request =
			new MyPlaceUpdateRequest(
				null,
				null,
				new BigDecimal("37.5638"),
				null
			);

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.updateMyPlace(
					USER_ID,
					1L,
					request
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(
				ExceptionType.INCOMPLETE_PLACE_LOCATION
			);

		verifyNoInteractions(myPlaceRepository);
	}

	@Test
	void rejectBlankMyPlaceNameUpdate() {
		MyPlaceUpdateRequest request =
			new MyPlaceUpdateRequest(
				"   ",
				null,
				null,
				null
			);

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.updateMyPlace(
					USER_ID,
					1L,
					request
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.INVALID_PLACE_INPUT);

		verifyNoInteractions(myPlaceRepository);
	}

	@Test
	void rejectInvalidCoordinateWhenUpdatingMyPlace() {
		MyPlace myPlace = createMyPlace(
			1L,
			"집",
			"서울 마포구",
			"37.5563",
			"126.9236"
		);

		MyPlaceUpdateRequest request =
			new MyPlaceUpdateRequest(
				null,
				"서울 마포구 연남동",
				new BigDecimal("91"),
				new BigDecimal("126.9217")
			);

		given(myPlaceRepository.findById(1L))
			.willReturn(Optional.of(myPlace));

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.updateMyPlace(
					USER_ID,
					1L,
					request
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(
				ExceptionType.INVALID_PLACE_COORDINATE
			);

		assertThat(myPlace.getAddress())
			.isEqualTo("서울 마포구");
	}

	@Test
	void rejectDuplicateNameWhenUpdatingMyPlace() {
		MyPlace myPlace = createMyPlace(
			1L,
			"집",
			"서울 마포구",
			"37.5563",
			"126.9236"
		);

		MyPlaceUpdateRequest request =
			new MyPlaceUpdateRequest(
				"회사",
				null,
				null,
				null
			);

		given(myPlaceRepository.findById(1L))
			.willReturn(Optional.of(myPlace));

		given(
			myPlaceRepository.existsByUserIdAndMyPlaceNameAndIdNot(
				USER_ID,
				"회사",
				1L
			)
		).willReturn(true);

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.updateMyPlace(
					USER_ID,
					1L,
					request
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.DUPLICATE_PLACE_NAME);

		assertThat(myPlace.getMyPlaceName())
			.isEqualTo("집");
	}

	@Test
	void rejectMissingMyPlaceUpdate() {
		MyPlaceUpdateRequest request =
			new MyPlaceUpdateRequest(
				"우리 집",
				null,
				null,
				null
			);

		given(myPlaceRepository.findById(999L))
			.willReturn(Optional.empty());

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.updateMyPlace(
					USER_ID,
					999L,
					request
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.MY_PLACE_NOT_FOUND);
	}

	@Test
	void rejectOtherUsersMyPlaceUpdate() {
		MyPlace myPlace = createMyPlace(
			1L,
			"집",
			"서울 마포구",
			"37.5563",
			"126.9236"
		);

		ReflectionTestUtils.setField(
			myPlace,
			"userId",
			2L
		);

		MyPlaceUpdateRequest request =
			new MyPlaceUpdateRequest(
				"우리 집",
				null,
				null,
				null
			);

		given(myPlaceRepository.findById(1L))
			.willReturn(Optional.of(myPlace));

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.updateMyPlace(
					USER_ID,
					1L,
					request
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.AUTHORIZATION_DENIED);
	}

	@Test
	void deleteMyPlace() {
		MyPlace myPlace = createMyPlace(
			1L,
			"집",
			"서울 마포구",
			"37.5563",
			"126.9236"
		);

		given(myPlaceRepository.findById(1L))
			.willReturn(Optional.of(myPlace));

		myPlaceService.deleteMyPlace(
			USER_ID,
			1L
		);

		verify(myPlaceRepository).delete(myPlace);
	}

	@Test
	void rejectMissingMyPlaceDelete() {
		given(myPlaceRepository.findById(999L))
			.willReturn(Optional.empty());

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.deleteMyPlace(
					USER_ID,
					999L
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.MY_PLACE_NOT_FOUND);

		verify(myPlaceRepository, never())
			.delete(any(MyPlace.class));
	}

	@Test
	void rejectOtherUsersMyPlaceDelete() {
		MyPlace myPlace = createMyPlace(
			1L,
			"집",
			"서울 마포구",
			"37.5563",
			"126.9236"
		);

		ReflectionTestUtils.setField(
			myPlace,
			"userId",
			2L
		);

		given(myPlaceRepository.findById(1L))
			.willReturn(Optional.of(myPlace));

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.deleteMyPlace(
					USER_ID,
					1L
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.AUTHORIZATION_DENIED);

		verify(myPlaceRepository, never())
			.delete(any(MyPlace.class));
	}

	@Test
	void rejectZeroMyPlaceIdWhenDeleting() {
		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.deleteMyPlace(
					USER_ID,
					0L
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.INVALID_PLACE_ID);

		verifyNoInteractions(myPlaceRepository);
	}

	@Test
	void rejectNegativeMyPlaceIdWhenDeleting() {
		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.deleteMyPlace(
					USER_ID,
					-1L
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.INVALID_PLACE_ID);

		verifyNoInteractions(myPlaceRepository);
	}

	@Test
	void rejectNullMyPlaceIdWhenDeleting() {
		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.deleteMyPlace(
					USER_ID,
					null
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.INVALID_PLACE_ID);

		verifyNoInteractions(myPlaceRepository);
	}

	private MyPlace createMyPlace(
		Long placeId,
		String myPlaceName,
		String address,
		String latitude,
		String longitude
	) {

		MyPlace myPlace = MyPlace.create(
			USER_ID,
			myPlaceName,
			address,
			new BigDecimal(latitude),
			new BigDecimal(longitude)
		);

		ReflectionTestUtils.setField(
			myPlace,
			"id",
			placeId
		);

		return myPlace;
	}
}