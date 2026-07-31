package com.a508.backend.mypage.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

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

import com.a508.backend.domain.mypage.service.MyPlaceService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.mypage.dto.MyPlaceCreateRequest;
import com.a508.backend.domain.mypage.dto.MyPlaceResult;
import com.a508.backend.domain.mypage.dto.MyPlaceUpdateRequest;
import com.a508.backend.domain.mypage.repository.MyPlaceRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class MyPlaceServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private MyPlaceRepository myPlaceRepository;

	@Mock
	private UserRepository userRepository;

	private MyPlaceService myPlaceService;
	private User user;

	@BeforeEach
	void setUp() {
		myPlaceService = new MyPlaceService(myPlaceRepository, userRepository);
		user = User.createGoogleGuest("google-sub");
		ReflectionTestUtils.setField(user, "id", USER_ID);
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

		given(myPlaceRepository.findAllByUser_IdOrderByIdAsc(USER_ID))
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
		given(myPlaceRepository.findAllByUser_IdOrderByIdAsc(USER_ID))
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
			myPlaceRepository.existsByUser_IdAndMyPlaceName(
				USER_ID,
				"집"
			)
		).willReturn(false);

		given(userRepository.findById(USER_ID))
			.willReturn(Optional.of(user));

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

		assertThat(savedMyPlace.getUser()).isSameAs(user);
		assertThat(savedMyPlace.getMyPlaceName())
			.isEqualTo("집");
		assertThat(savedMyPlace.getAddress())
			.isEqualTo("서울 마포구");
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
			myPlaceRepository.existsByUser_IdAndMyPlaceName(
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

		given(myPlaceRepository.findByIdAndUser_Id(1L, USER_ID))
			.willReturn(Optional.of(myPlace));

		given(
			myPlaceRepository.existsByUser_IdAndMyPlaceNameAndIdNot(
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

		given(myPlaceRepository.findByIdAndUser_Id(1L, USER_ID))
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

		given(myPlaceRepository.findByIdAndUser_Id(1L, USER_ID))
			.willReturn(Optional.of(myPlace));

		given(
			myPlaceRepository.existsByUser_IdAndMyPlaceNameAndIdNot(
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

		given(myPlaceRepository.findByIdAndUser_Id(999L, USER_ID))
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
		MyPlaceUpdateRequest request =
			new MyPlaceUpdateRequest(
				"우리 집",
				null,
				null,
				null
			);

		given(myPlaceRepository.findByIdAndUser_Id(1L, USER_ID))
			.willReturn(Optional.empty());

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
			.isEqualTo(ExceptionType.MY_PLACE_NOT_FOUND);
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

		given(myPlaceRepository.findByIdAndUser_Id(1L, USER_ID))
			.willReturn(Optional.of(myPlace));

		myPlaceService.deleteMyPlace(
			USER_ID,
			1L
		);

		verify(myPlaceRepository).delete(myPlace);
	}

	@Test
	void rejectMissingMyPlaceDelete() {
		given(myPlaceRepository.findByIdAndUser_Id(999L, USER_ID))
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
		given(myPlaceRepository.findByIdAndUser_Id(1L, USER_ID))
			.willReturn(Optional.empty());

		BusinessException exception =
			catchThrowableOfType(
				() -> myPlaceService.deleteMyPlace(
					USER_ID,
					1L
				),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.MY_PLACE_NOT_FOUND);

		verify(myPlaceRepository, never())
			.delete(any(MyPlace.class));
	}

	private MyPlace createMyPlace(
		Long placeId,
		String myPlaceName,
		String address,
		String latitude,
		String longitude
	) {

		MyPlace myPlace = MyPlace.create(
			user,
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
