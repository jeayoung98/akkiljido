package com.a508.backend.mypage.controller;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.*;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;

import com.a508.backend.domain.mypage.controller.MyPageController;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;
import com.a508.backend.domain.mypage.dto.MyPlaceCreateRequest;
import com.a508.backend.domain.mypage.dto.MyPlaceResult;
import com.a508.backend.domain.mypage.dto.MyPlaceUpdateRequest;
import com.a508.backend.domain.mypage.service.MyPlaceService;

@ExtendWith(MockitoExtension.class)
class MyPageControllerTest {

	private static final Long USER_ID = 1L;

	@Mock
	private MyPlaceService myPlaceService;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		MyPageController controller =
			new MyPageController(myPlaceService);

		mockMvc = standaloneSetup(controller)
			.setControllerAdvice(new GlobalExceptionHandler())
			.setCustomArgumentResolvers(
				new AuthenticationPrincipalArgumentResolver()
			)
			.build();

		setAuthentication(USER_ID);
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("인증된 사용자의 내 장소 목록을 조회한다")
	void getMyPlaces() throws Exception {
		given(myPlaceService.getMyPlaces(USER_ID))
			.willReturn(
				List.of(
					result(
						1L,
						"집",
						"서울 마포구 서교동",
						37.5563,
						126.9236
					),
					result(
						2L,
						"회사",
						"서울 강남구 역삼동",
						37.5007,
						127.0365
					)
				)
			);

		mockMvc.perform(get("/api/v1/my/place"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.length()").value(2))
			.andExpect(jsonPath("$.data[0].placeId").value(1))
			.andExpect(jsonPath("$.data[0].myPlaceName").value("집"))
			.andExpect(
				jsonPath("$.data[0].address")
					.value("서울 마포구 서교동")
			)
			.andExpect(
				jsonPath("$.data[0].latitude")
					.value(37.5563)
			)
			.andExpect(
				jsonPath("$.data[0].longitude")
					.value(126.9236)
			)
			.andExpect(jsonPath("$.data[1].placeId").value(2))
			.andExpect(
				jsonPath("$.data[1].myPlaceName")
					.value("회사")
			);

		verify(myPlaceService).getMyPlaces(USER_ID);
	}

	@Test
	@DisplayName("등록한 장소가 없으면 빈 배열을 반환한다")
	void getEmptyMyPlaces() throws Exception {
		given(myPlaceService.getMyPlaces(USER_ID))
			.willReturn(List.of());

		mockMvc.perform(get("/api/v1/my/place"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data").isArray())
			.andExpect(jsonPath("$.data").isEmpty());

		verify(myPlaceService).getMyPlaces(USER_ID);
	}

	@Test
	@DisplayName("인증된 사용자의 내 장소를 생성한다")
	void createMyPlace() throws Exception {
		given(
			myPlaceService.createMyPlace(
				eq(USER_ID),
				any(MyPlaceCreateRequest.class)
			)
		).willReturn(
			result(
				1L,
				"집",
				"서울 마포구 서교동",
				37.5563,
				126.9236
			)
		);

		String requestBody = """
			{
			  "my_place_name": "집",
			  "address": "서울 마포구 서교동",
			  "latitude": 37.5563,
			  "longitude": 126.9236
			}
			""";

		mockMvc.perform(
				post("/api/v1/my/place")
					.contentType(MediaType.APPLICATION_JSON)
					.content(requestBody)
			)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.placeId").value(1))
			.andExpect(
				jsonPath("$.data.myPlaceName")
					.value("집")
			)
			.andExpect(
				jsonPath("$.data.address")
					.value("서울 마포구 서교동")
			)
			.andExpect(
				jsonPath("$.data.latitude")
					.value(37.5563)
			)
			.andExpect(
				jsonPath("$.data.longitude")
					.value(126.9236)
			);

		ArgumentCaptor<MyPlaceCreateRequest> captor =
			ArgumentCaptor.forClass(
				MyPlaceCreateRequest.class
			);

		verify(myPlaceService).createMyPlace(
			eq(USER_ID),
			captor.capture()
		);

		MyPlaceCreateRequest request =
			captor.getValue();

		assertThat(request.myPlaceName())
			.isEqualTo("집");

		assertThat(request.address())
			.isEqualTo("서울 마포구 서교동");

		assertThat(request.latitude())
			.isEqualTo(37.5563);

		assertThat(request.longitude())
			.isEqualTo(126.9236);
	}

	@Test
	@DisplayName("장소 생성 시 필수 필드가 없으면 400을 반환한다")
	void rejectMissingFieldWhenCreatingMyPlace()
		throws Exception {

		String requestBody = """
			{
			  "my_place_name": "집",
			  "address": "서울 마포구 서교동",
			  "latitude": 37.5563
			}
			""";

		mockMvc.perform(
				post("/api/v1/my/place")
					.contentType(MediaType.APPLICATION_JSON)
					.content(requestBody)
			)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"));

		verify(myPlaceService, never())
			.createMyPlace(
				any(),
				any(MyPlaceCreateRequest.class)
			);
	}

	@Test
	@DisplayName("잘못된 JSON 타입이 들어오면 400을 반환한다")
	void rejectInvalidJsonWhenCreatingMyPlace()
		throws Exception {

		String requestBody = """
			{
			  "my_place_name": "집",
			  "address": "서울 마포구 서교동",
			  "latitude": "잘못된 위도",
			  "longitude": 126.9236
			}
			""";

		mockMvc.perform(
				post("/api/v1/my/place")
					.contentType(MediaType.APPLICATION_JSON)
					.content(requestBody)
			)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C004"));

		verify(myPlaceService, never())
			.createMyPlace(
				any(),
				any(MyPlaceCreateRequest.class)
			);
	}

	@Test
	@DisplayName("중복된 장소 이름을 등록하면 409를 반환한다")
	void rejectDuplicateNameWhenCreatingMyPlace()
		throws Exception {

		given(
			myPlaceService.createMyPlace(
				eq(USER_ID),
				any(MyPlaceCreateRequest.class)
			)
		).willThrow(
			new BusinessException(
				ExceptionType.DUPLICATE_PLACE_NAME
			)
		);

		String requestBody = """
			{
			  "my_place_name": "집",
			  "address": "서울 마포구 서교동",
			  "latitude": 37.5563,
			  "longitude": 126.9236
			}
			""";

		mockMvc.perform(
				post("/api/v1/my/place")
					.contentType(MediaType.APPLICATION_JSON)
					.content(requestBody)
			)
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("P001"));
	}

	@Test
	@DisplayName("인증된 사용자의 장소 이름을 수정한다")
	void updateMyPlace() throws Exception {
		given(
			myPlaceService.updateMyPlace(
				eq(USER_ID),
				eq(1L),
				any(MyPlaceUpdateRequest.class)
			)
		).willReturn(
			result(
				1L,
				"우리 집",
				"서울 마포구 서교동",
				37.5563,
				126.9236
			)
		);

		String requestBody = """
			{
			  "my_place_name": "우리 집"
			}
			""";

		mockMvc.perform(
				patch("/api/v1/my/place/{placeId}", 1L)
					.contentType(MediaType.APPLICATION_JSON)
					.content(requestBody)
			)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.placeId").value(1))
			.andExpect(
				jsonPath("$.data.myPlaceName")
					.value("우리 집")
			)
			.andExpect(
				jsonPath("$.data.address")
					.value("서울 마포구 서교동")
			);

		ArgumentCaptor<MyPlaceUpdateRequest> captor =
			ArgumentCaptor.forClass(
				MyPlaceUpdateRequest.class
			);

		verify(myPlaceService).updateMyPlace(
			eq(USER_ID),
			eq(1L),
			captor.capture()
		);

		MyPlaceUpdateRequest request =
			captor.getValue();

		assertThat(request.myPlaceName())
			.isEqualTo("우리 집");

		assertThat(request.address()).isNull();
		assertThat(request.latitude()).isNull();
		assertThat(request.longitude()).isNull();
	}

	@Test
	@DisplayName("장소 ID 타입이 잘못되면 400을 반환한다")
	void rejectInvalidPlaceIdWhenUpdatingMyPlace()
		throws Exception {

		String requestBody = """
			{
			  "my_place_name": "우리 집"
			}
			""";

		mockMvc.perform(
				patch(
					"/api/v1/my/place/{placeId}",
					"abc"
				)
					.contentType(MediaType.APPLICATION_JSON)
					.content(requestBody)
			)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"));

		verify(myPlaceService, never())
			.updateMyPlace(
				any(),
				any(),
				any(MyPlaceUpdateRequest.class)
			);
	}

	@Test
	@DisplayName("인증된 사용자의 장소를 삭제한다")
	void deleteMyPlace() throws Exception {
		mockMvc.perform(
				delete(
					"/api/v1/my/place/{placeId}",
					1L
				)
			)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		verify(myPlaceService)
			.deleteMyPlace(USER_ID, 1L);
	}

	@Test
	@DisplayName("존재하지 않는 장소를 삭제하면 404를 반환한다")
	void rejectMissingMyPlaceDelete() throws Exception {
		willThrow(
			new BusinessException(
				ExceptionType.MY_PLACE_NOT_FOUND
			)
		)
			.given(myPlaceService)
			.deleteMyPlace(USER_ID, 999L);

		mockMvc.perform(
				delete(
					"/api/v1/my/place/{placeId}",
					999L
				)
			)
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("P002"));
	}

	@Test
	@DisplayName("다른 사용자의 장소를 삭제하면 403을 반환한다")
	void rejectOtherUsersMyPlaceDelete()
		throws Exception {

		willThrow(
			new BusinessException(
				ExceptionType.AUTHORIZATION_DENIED
			)
		)
			.given(myPlaceService)
			.deleteMyPlace(USER_ID, 1L);

		mockMvc.perform(
				delete(
					"/api/v1/my/place/{placeId}",
					1L
				)
			)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("A002"));
	}

	@Test
	@DisplayName("JWT principal의 사용자 ID가 서비스에 전달된다")
	void useAuthenticatedUserId() throws Exception {
		Long anotherUserId = 99L;

		setAuthentication(anotherUserId);

		given(myPlaceService.getMyPlaces(anotherUserId))
			.willReturn(List.of());

		mockMvc.perform(get("/api/v1/my/place"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		verify(myPlaceService)
			.getMyPlaces(anotherUserId);

		verify(myPlaceService, never())
			.getMyPlaces(USER_ID);
	}

	@Test
	@DisplayName("장소 생성 시 위도가 범위를 벗어나면 400을 반환한다")
	void rejectOutOfRangeLatitudeWhenCreatingMyPlace() throws Exception {
		String requestBody = """
			{
			  "my_place_name": "집",
			  "address": "서울 마포구 서교동",
			  "latitude": 90.1,
			  "longitude": 126.9236
			}
			""";

		mockMvc.perform(
				post("/api/v1/my/place")
					.contentType(MediaType.APPLICATION_JSON)
					.content(requestBody)
			)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"))
			.andExpect(jsonPath("$.msg").value("위도는 90 이하여야 합니다."));

		verify(myPlaceService, never()).createMyPlace(any(), any());
	}

	@Test
	@DisplayName("수정할 정보가 없으면 400을 반환한다")
	void rejectEmptyMyPlaceUpdate() throws Exception {
		mockMvc.perform(
				patch("/api/v1/my/place/{placeId}", 1L)
					.contentType(MediaType.APPLICATION_JSON)
					.content("{}")
			)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"))
			.andExpect(jsonPath("$.msg").value("수정할 정보를 하나 이상 입력해 주세요."));

		verify(myPlaceService, never()).updateMyPlace(any(), any(), any());
	}

	@Test
	@DisplayName("주소, 위도, 경도 중 일부만 전달하면 400을 반환한다")
	void rejectIncompleteLocationUpdate() throws Exception {
		String requestBody = """
			{
			  "address": "서울 마포구 연남동"
			}
			""";

		mockMvc.perform(
				patch("/api/v1/my/place/{placeId}", 1L)
					.contentType(MediaType.APPLICATION_JSON)
					.content(requestBody)
			)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"))
			.andExpect(jsonPath("$.msg").value("주소, 위도, 경도는 함께 입력해야 합니다."));

		verify(myPlaceService, never()).updateMyPlace(any(), any(), any());
	}

	@Test
	@DisplayName("수정할 장소 이름이 공백이면 400을 반환한다")
	void rejectBlankMyPlaceNameUpdate() throws Exception {
		String requestBody = """
			{
			  "my_place_name": "   "
			}
			""";

		mockMvc.perform(
				patch("/api/v1/my/place/{placeId}", 1L)
					.contentType(MediaType.APPLICATION_JSON)
					.content(requestBody)
			)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"))
			.andExpect(jsonPath("$.msg").value("장소 이름은 공백일 수 없습니다."));

		verify(myPlaceService, never()).updateMyPlace(any(), any(), any());
	}

	@Test
	@DisplayName("장소 ID가 0 이하이면 400을 반환한다")
	void rejectNonPositivePlaceId() throws Exception {
		String requestBody = """
			{
			  "my_place_name": "우리 집"
			}
			""";

		mockMvc.perform(
				patch("/api/v1/my/place/{placeId}", 0L)
					.contentType(MediaType.APPLICATION_JSON)
					.content(requestBody)
			)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"))
			.andExpect(jsonPath("$.msg").value("placeId는 양수여야 합니다."));

		verify(myPlaceService, never()).updateMyPlace(any(), any(), any());
	}

	private void setAuthentication(Long userId) {
		AuthenticatedUser principal =
			new AuthenticatedUser(userId);

		UsernamePasswordAuthenticationToken authentication =
			UsernamePasswordAuthenticationToken.authenticated(
				principal,
				null,
				List.of()
			);

		SecurityContextHolder.getContext()
			.setAuthentication(authentication);
	}

	private MyPlaceResult result(
		Long placeId,
		String myPlaceName,
		String address,
		double latitude,
		double longitude
	) {
		return new MyPlaceResult(
			placeId,
			myPlaceName,
			address,
			latitude,
			longitude
		);
	}
}
