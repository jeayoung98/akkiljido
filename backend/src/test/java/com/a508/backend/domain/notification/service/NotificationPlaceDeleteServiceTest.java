package com.a508.backend.domain.notification.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import java.time.LocalTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.domain.notification.entity.NotificationPlace;
import com.a508.backend.domain.notification.repository.NotificationPlaceRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.service.UserService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

@ExtendWith(MockitoExtension.class)
class NotificationPlaceDeleteServiceTest {

    private static final Long USER_ID = 1L;
    private static final Long NOTIFICATION_PLACE_ID = 1L;

    @Mock
    private NotificationPlaceRepository notificationPlaceRepository;

    @Mock
    private UserService userService;

    private NotificationPlaceService notificationPlaceService;
    private NotificationPlace notificationPlace;

    @BeforeEach
    void setUp() {
        notificationPlaceService = new NotificationPlaceService(
                notificationPlaceRepository,
                userService
        );

        User user = User.createGoogleGuest("google-sub");
        ReflectionTestUtils.setField(user, "id", USER_ID);

        notificationPlace = NotificationPlace.create(
                user,
                "회사",
                "서울 강남구 역삼동",
                37.5007,
                127.0365,
                LocalTime.of(9, 0),
                LocalTime.of(18, 0),
                "근무 시간 소비 알림"
        );
        ReflectionTestUtils.setField(
                notificationPlace,
                "id",
                NOTIFICATION_PLACE_ID
        );
    }

    @Test
    @DisplayName("로그인한 사용자가 소유한 알림 장소를 삭제한다")
    void deleteNotificationPlace() {
        given(
                notificationPlaceRepository.findByIdAndUser_Id(
                        NOTIFICATION_PLACE_ID,
                        USER_ID
                )
        ).willReturn(Optional.of(notificationPlace));

        notificationPlaceService.deleteNotificationPlace(
                USER_ID,
                NOTIFICATION_PLACE_ID
        );

        then(notificationPlaceRepository)
                .should()
                .findByIdAndUser_Id(NOTIFICATION_PLACE_ID, USER_ID);
        then(notificationPlaceRepository).should().delete(notificationPlace);
    }

    @Test
    @DisplayName("존재하지 않는 알림 장소는 삭제할 수 없다")
    void rejectMissingNotificationPlace() {
        given(
                notificationPlaceRepository.findByIdAndUser_Id(
                        NOTIFICATION_PLACE_ID,
                        USER_ID
                )
        ).willReturn(Optional.empty());

        BusinessException exception = catchThrowableOfType(
                () -> notificationPlaceService.deleteNotificationPlace(
                        USER_ID,
                        NOTIFICATION_PLACE_ID
                ),
                BusinessException.class
        );

        assertThat(exception.getExceptionType())
                .isEqualTo(ExceptionType.NOTIFICATION_PLACE_NOT_FOUND);

        then(notificationPlaceRepository).should(never()).delete(any());
    }

    @Test
    @DisplayName("다른 사용자가 소유한 알림 장소는 삭제할 수 없다")
    void rejectAnotherUserNotificationPlace() {
        Long anotherUserId = 2L;

        given(
                notificationPlaceRepository.findByIdAndUser_Id(
                        NOTIFICATION_PLACE_ID,
                        anotherUserId
                )
        ).willReturn(Optional.empty());

        BusinessException exception = catchThrowableOfType(
                () -> notificationPlaceService.deleteNotificationPlace(
                        anotherUserId,
                        NOTIFICATION_PLACE_ID
                ),
                BusinessException.class
        );

        assertThat(exception.getExceptionType())
                .isEqualTo(ExceptionType.NOTIFICATION_PLACE_NOT_FOUND);

        then(notificationPlaceRepository)
                .should()
                .findByIdAndUser_Id(NOTIFICATION_PLACE_ID, anotherUserId);
        then(notificationPlaceRepository).should(never()).delete(any());
    }
}
