package com.a508.backend.domain.notification.dto.request;

import static org.assertj.core.api.Assertions.*;

import java.time.LocalTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

class NotificationPlaceUpdateRequestTest {

    @Test
    @DisplayName("일부 필드만 입력한 수정 요청을 허용한다")
    void validatePartialUpdateRequest() {
        NotificationPlaceUpdateRequest request = request(
                "회사",
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertThatCode(request::validate).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("활성 상태만 입력한 수정 요청을 허용한다")
    void validateActiveOnlyUpdateRequest() {
        NotificationPlaceUpdateRequest request =
                new NotificationPlaceUpdateRequest(
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        false
                );

        assertThatCode(request::validate).doesNotThrowAnyException();
        assertThat(request.active()).isFalse();
    }

    @Test
    @DisplayName("주소와 좌표를 함께 입력한 수정 요청을 허용한다")
    void validateLocationUpdateRequest() {
        NotificationPlaceUpdateRequest request = request(
                null,
                "서울 강남구 역삼동",
                37.5007,
                127.0365,
                null,
                null,
                null
        );

        assertThatCode(request::validate).doesNotThrowAnyException();
        assertThat(request.hasLocation()).isTrue();
    }

    @Test
    @DisplayName("자정을 넘기는 시간 수정 요청을 허용한다")
    void validateTimeRangeAcrossMidnight() {
        NotificationPlaceUpdateRequest request = request(
                null,
                null,
                null,
                null,
                "23:00",
                "01:00",
                null
        );

        assertThatCode(request::validate).doesNotThrowAnyException();
        assertThat(request.parsedStartTime()).isEqualTo(LocalTime.of(23, 0));
        assertThat(request.parsedEndTime()).isEqualTo(LocalTime.of(1, 0));
    }

    @Test
    @DisplayName("수정할 필드가 없으면 요청을 거부한다")
    void rejectEmptyUpdateRequest() {
        NotificationPlaceUpdateRequest request = request(
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertExceptionType(
                request,
                ExceptionType.INVALID_NOTIFICATION_PLACE_INPUT
        );
    }

    @Test
    @DisplayName("공백으로만 구성된 장소 이름을 거부한다")
    void rejectBlankNotificationPlaceName() {
        NotificationPlaceUpdateRequest request = request(
                "   ",
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertExceptionType(
                request,
                ExceptionType.INVALID_NOTIFICATION_PLACE_INPUT
        );
    }

    @Test
    @DisplayName("최대 길이를 초과한 장소 이름을 거부한다")
    void rejectTooLongNotificationPlaceName() {
        NotificationPlaceUpdateRequest request = request(
                "가".repeat(21),
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertExceptionType(
                request,
                ExceptionType.INVALID_NOTIFICATION_PLACE_INPUT
        );
    }

    @Test
    @DisplayName("주소와 좌표 중 일부만 입력하면 요청을 거부한다")
    void rejectIncompleteLocation() {
        NotificationPlaceUpdateRequest request = request(
                null,
                "서울 강남구 역삼동",
                null,
                null,
                null,
                null,
                null
        );

        assertExceptionType(
                request,
                ExceptionType.INVALID_NOTIFICATION_PLACE_COORDINATE
        );
    }

    @Test
    @DisplayName("유효하지 않은 위도를 거부한다")
    void rejectInvalidLatitude() {
        NotificationPlaceUpdateRequest request = request(
                null,
                "서울 강남구 역삼동",
                91.0,
                127.0365,
                null,
                null,
                null
        );

        assertExceptionType(
                request,
                ExceptionType.INVALID_NOTIFICATION_PLACE_COORDINATE
        );
    }

    @Test
    @DisplayName("유효하지 않은 경도를 거부한다")
    void rejectInvalidLongitude() {
        NotificationPlaceUpdateRequest request = request(
                null,
                "서울 강남구 역삼동",
                37.5007,
                181.0,
                null,
                null,
                null
        );

        assertExceptionType(
                request,
                ExceptionType.INVALID_NOTIFICATION_PLACE_COORDINATE
        );
    }

    @Test
    @DisplayName("시작 시간만 입력하면 요청을 거부한다")
    void rejectIncompleteTimeRange() {
        NotificationPlaceUpdateRequest request = request(
                null,
                null,
                null,
                null,
                "09:00",
                null,
                null
        );

        assertExceptionType(
                request,
                ExceptionType.INVALID_NOTIFICATION_PLACE_TIME
        );
    }

    @Test
    @DisplayName("잘못된 시간 형식을 거부한다")
    void rejectInvalidTimeFormat() {
        NotificationPlaceUpdateRequest request = request(
                null,
                null,
                null,
                null,
                "9:00",
                "18:00",
                null
        );

        assertExceptionType(
                request,
                ExceptionType.INVALID_NOTIFICATION_PLACE_TIME
        );
    }

    @Test
    @DisplayName("시작 시간과 종료 시간이 같으면 요청을 거부한다")
    void rejectSameStartTimeAndEndTime() {
        NotificationPlaceUpdateRequest request = request(
                null,
                null,
                null,
                null,
                "09:00",
                "09:00",
                null
        );

        assertExceptionType(
                request,
                ExceptionType.INVALID_NOTIFICATION_PLACE_TIME
        );
    }

    private void assertExceptionType(
            NotificationPlaceUpdateRequest request,
            ExceptionType expectedExceptionType
    ) {
        BusinessException exception = catchThrowableOfType(
                request::validate,
                BusinessException.class
        );

        assertThat(exception.getExceptionType()).isEqualTo(expectedExceptionType);
    }

    private NotificationPlaceUpdateRequest request(
            String notificationPlaceName,
            String address,
            Double latitude,
            Double longitude,
            String startTime,
            String endTime,
            String reason
    ) {
        return new NotificationPlaceUpdateRequest(
                notificationPlaceName,
                address,
                latitude,
                longitude,
                startTime,
                endTime,
                reason,
                null
        );
    }
}
