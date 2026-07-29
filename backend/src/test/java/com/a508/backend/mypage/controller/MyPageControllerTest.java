package com.a508.backend.mypage.controller;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.mypage.dto.MyPlaceCreateRequest;
import com.a508.backend.mypage.dto.MyPlaceResult;
import com.a508.backend.mypage.dto.MyPlaceUpdateRequest;
import com.a508.backend.mypage.service.MyPlaceService;
import com.a508.backend.mypage.support.CurrentUserIdProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

@ExtendWith(MockitoExtension.class)
class MyPageControllerTest {

    private static final Long USER_ID = 1L;

    @Mock
    private MyPlaceService myPlaceService;

    @Mock
    private CurrentUserIdProvider currentUserIdProvider;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MyPageController controller =
                new MyPageController(myPlaceService, currentUserIdProvider);

        mockMvc = standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getMyPlaces() throws Exception {
        given(currentUserIdProvider.getCurrentUserId()).willReturn(USER_ID);
        given(myPlaceService.getMyPlaces(USER_ID))
                .willReturn(
                        List.of(
                                result(1L, "집", "서울 마포구", "37.5563", "126.9236"),
                                result(2L, "회사", "서울 강남구", "37.5007", "127.0365")
                        )
                );

        mockMvc.perform(get("/api/v1/my/place"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].placeId").value(1))
                .andExpect(jsonPath("$.data[0].myPlaceName").value("집"))
                .andExpect(jsonPath("$.data[0].address").value("서울 마포구"))
                .andExpect(jsonPath("$.data[0].latitude").value(37.5563))
                .andExpect(jsonPath("$.data[0].longitude").value(126.9236))
                .andExpect(jsonPath("$.data[1].placeId").value(2))
                .andExpect(jsonPath("$.data[1].myPlaceName").value("회사"));

        verify(myPlaceService).getMyPlaces(USER_ID);
    }

    @Test
    void getEmptyMyPlaces() throws Exception {
        given(currentUserIdProvider.getCurrentUserId()).willReturn(USER_ID);
        given(myPlaceService.getMyPlaces(USER_ID)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/my/place"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void createMyPlace() throws Exception {
        given(currentUserIdProvider.getCurrentUserId()).willReturn(USER_ID);
        given(
                myPlaceService.createMyPlace(
                        eq(USER_ID),
                        any(MyPlaceCreateRequest.class)
                )
        ).willReturn(
                result(1L, "집", "서울 마포구", "37.5563", "126.9236")
        );

        String requestBody = """
                {
                  "my_place_name": "집",
                  "address": "서울 마포구",
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
                .andExpect(jsonPath("$.data.myPlaceName").value("집"))
                .andExpect(jsonPath("$.data.address").value("서울 마포구"))
                .andExpect(jsonPath("$.data.latitude").value(37.5563))
                .andExpect(jsonPath("$.data.longitude").value(126.9236));

        ArgumentCaptor<MyPlaceCreateRequest> captor =
                ArgumentCaptor.forClass(MyPlaceCreateRequest.class);

        verify(myPlaceService).createMyPlace(eq(USER_ID), captor.capture());

        MyPlaceCreateRequest request = captor.getValue();

        assertThat(request.myPlaceName()).isEqualTo("집");
        assertThat(request.address()).isEqualTo("서울 마포구");
        assertThat(request.latitude()).isEqualByComparingTo("37.5563");
        assertThat(request.longitude()).isEqualByComparingTo("126.9236");
    }

    @Test
    void rejectMissingFieldWhenCreatingMyPlace() throws Exception {
        String requestBody = """
                {
                  "my_place_name": "집",
                  "address": "서울 마포구",
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
                .andExpect(jsonPath("$.code").value("C002"))
                .andExpect(jsonPath("$.msg").value("필수 입력값을 확인해 주세요."));

        verify(myPlaceService, never())
                .createMyPlace(any(), any(MyPlaceCreateRequest.class));
    }

    @Test
    void rejectInvalidJsonWhenCreatingMyPlace() throws Exception {
        String requestBody = """
                {
                  "my_place_name": "집",
                  "address": "서울 마포구",
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
                .andExpect(jsonPath("$.code").value("C004"))
                .andExpect(jsonPath("$.msg").value("잘못된 JSON 데이터 형식"));

        verify(myPlaceService, never())
                .createMyPlace(any(), any(MyPlaceCreateRequest.class));
    }

    @Test
    void rejectDuplicateNameWhenCreatingMyPlace() throws Exception {
        given(currentUserIdProvider.getCurrentUserId()).willReturn(USER_ID);
        given(
                myPlaceService.createMyPlace(
                        eq(USER_ID),
                        any(MyPlaceCreateRequest.class)
                )
        ).willThrow(
                new BusinessException(ExceptionType.DUPLICATE_PLACE_NAME)
        );

        String requestBody = """
                {
                  "my_place_name": "집",
                  "address": "서울 마포구",
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
                .andExpect(jsonPath("$.code").value("P002"))
                .andExpect(jsonPath("$.msg").value("이미 등록된 장소 이름입니다."));
    }

    @Test
    void updateMyPlace() throws Exception {
        given(currentUserIdProvider.getCurrentUserId()).willReturn(USER_ID);
        given(
                myPlaceService.updateMyPlace(
                        eq(USER_ID),
                        eq(1L),
                        any(MyPlaceUpdateRequest.class)
                )
        ).willReturn(
                result(1L, "우리 집", "서울 마포구", "37.5563", "126.9236")
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
                .andExpect(jsonPath("$.data.myPlaceName").value("우리 집"))
                .andExpect(jsonPath("$.data.address").value("서울 마포구"));

        ArgumentCaptor<MyPlaceUpdateRequest> captor =
                ArgumentCaptor.forClass(MyPlaceUpdateRequest.class);

        verify(myPlaceService).updateMyPlace(eq(USER_ID), eq(1L), captor.capture());

        MyPlaceUpdateRequest request = captor.getValue();

        assertThat(request.myPlaceName()).isEqualTo("우리 집");
        assertThat(request.address()).isNull();
        assertThat(request.latitude()).isNull();
        assertThat(request.longitude()).isNull();
    }

    @Test
    void rejectInvalidPlaceIdWhenUpdatingMyPlace() throws Exception {
        String requestBody = """
                {
                  "my_place_name": "우리 집"
                }
                """;

        mockMvc.perform(
                        patch("/api/v1/my/place/{placeId}", "abc")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C002"))
                .andExpect(jsonPath("$.msg").value("장소 ID가 올바르지 않습니다."));

        verify(myPlaceService, never())
                .updateMyPlace(any(), any(), any(MyPlaceUpdateRequest.class));
    }

    @Test
    void deleteMyPlace() throws Exception {
        given(currentUserIdProvider.getCurrentUserId()).willReturn(USER_ID);

        mockMvc.perform(delete("/api/v1/my/place/{placeId}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(myPlaceService).deleteMyPlace(USER_ID, 1L);
    }

    @Test
    void rejectMissingMyPlaceDelete() throws Exception {
        given(currentUserIdProvider.getCurrentUserId()).willReturn(USER_ID);

        willThrow(new BusinessException(ExceptionType.MY_PLACE_NOT_FOUND))
                .given(myPlaceService)
                .deleteMyPlace(USER_ID, 999L);

        mockMvc.perform(delete("/api/v1/my/place/{placeId}", 999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("P003"))
                .andExpect(jsonPath("$.msg").value("등록된 장소를 찾을 수 없습니다."));
    }

    @Test
    void rejectOtherUsersMyPlaceDelete() throws Exception {
        given(currentUserIdProvider.getCurrentUserId()).willReturn(USER_ID);

        willThrow(new BusinessException(ExceptionType.AUTHORIZATION_DENIED))
                .given(myPlaceService)
                .deleteMyPlace(USER_ID, 1L);

        mockMvc.perform(delete("/api/v1/my/place/{placeId}", 1L))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("A002"))
                .andExpect(jsonPath("$.msg").value("권한이 없음"));
    }

    private MyPlaceResult result(
            Long placeId,
            String myPlaceName,
            String address,
            String latitude,
            String longitude
    ) {
        return new MyPlaceResult(
                placeId,
                myPlaceName,
                address,
                new BigDecimal(latitude),
                new BigDecimal(longitude)
        );
    }
}
