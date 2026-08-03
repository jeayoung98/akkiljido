package com.a508.backend.domain.notification.controller;

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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;

import com.a508.backend.domain.notification.service.NotificationPlaceService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;

@ExtendWith(MockitoExtension.class)
class NotificationPlaceDeleteControllerTest {

    private static final Long USER_ID = 1L;
    private static final Long NOTIFICATION_PLACE_ID = 1L;

    @Mock
    private NotificationPlaceService notificationPlaceService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        NotificationPlaceController controller =
                new NotificationPlaceController(notificationPlaceService);

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
    @DisplayName("DELETE /api/v1/notification/{id}는 알림 장소를 삭제한다")
    void deleteNotificationPlace() throws Exception {
        willDoNothing()
                .given(notificationPlaceService)
                .deleteNotificationPlace(USER_ID, NOTIFICATION_PLACE_ID);

        mockMvc.perform(
                        delete(
                                "/api/v1/notification/{notificationPlaceId}",
                                NOTIFICATION_PLACE_ID
                        )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.code").doesNotExist());

        then(notificationPlaceService)
                .should()
                .deleteNotificationPlace(USER_ID, NOTIFICATION_PLACE_ID);
    }

    @Test
    @DisplayName("존재하지 않는 알림 장소를 삭제하면 N005를 반환한다")
    void rejectMissingNotificationPlace() throws Exception {
        willThrow(
                new BusinessException(
                        ExceptionType.NOTIFICATION_PLACE_NOT_FOUND
                )
        )
                .given(notificationPlaceService)
                .deleteNotificationPlace(USER_ID, NOTIFICATION_PLACE_ID);

        mockMvc.perform(
                        delete(
                                "/api/v1/notification/{notificationPlaceId}",
                                NOTIFICATION_PLACE_ID
                        )
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("N005"))
                .andExpect(jsonPath("$.msg").value("알림 장소를 찾을 수 없습니다."));

        then(notificationPlaceService)
                .should()
                .deleteNotificationPlace(USER_ID, NOTIFICATION_PLACE_ID);
    }

    @Test
    @DisplayName("JWT principal의 사용자 ID를 삭제 조건으로 전달한다")
    void useAuthenticatedUserId() throws Exception {
        Long anotherUserId = 99L;
        setAuthentication(anotherUserId);

        willDoNothing()
                .given(notificationPlaceService)
                .deleteNotificationPlace(
                        anotherUserId,
                        NOTIFICATION_PLACE_ID
                );

        mockMvc.perform(
                        delete(
                                "/api/v1/notification/{notificationPlaceId}",
                                NOTIFICATION_PLACE_ID
                        )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        then(notificationPlaceService)
                .should()
                .deleteNotificationPlace(
                        anotherUserId,
                        NOTIFICATION_PLACE_ID
                );
        then(notificationPlaceService)
                .should(never())
                .deleteNotificationPlace(USER_ID, NOTIFICATION_PLACE_ID);
    }

    private void setAuthentication(Long userId) {
        AuthenticatedUser principal = new AuthenticatedUser(userId);

        UsernamePasswordAuthenticationToken authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        principal,
                        null,
                        List.of()
                );

        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
