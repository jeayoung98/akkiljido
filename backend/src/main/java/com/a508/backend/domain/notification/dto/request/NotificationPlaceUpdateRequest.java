package com.a508.backend.domain.notification.dto.request;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.Locale;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.GeometryUtils;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "알림 장소 수정 요청")
public record NotificationPlaceUpdateRequest(

        @Schema(description = "알림 장소 이름", example = "회사")
        String notificationPlaceName,

        @Schema(description = "알림 장소 주소", example = "서울 강남구 역삼동")
        String address,

        @Schema(description = "알림 장소 위도", example = "37.5007")
        Double latitude,

        @Schema(description = "알림 장소 경도", example = "127.0365")
        Double longitude,

        @Schema(description = "알림 시작 시간", example = "09:00")
        String startTime,

        @Schema(description = "알림 종료 시간", example = "18:00")
        String endTime,

        @Schema(description = "알림 설정 이유", example = "근무 시간 소비 알림")
        String reason
) {

    private static final int MAX_NAME_LENGTH = 20;
    private static final int MAX_ADDRESS_LENGTH = 50;
    private static final int MAX_REASON_LENGTH = 100;

    private static final DateTimeFormatter TIME_FORMATTER =
            DateTimeFormatter.ofPattern("HH:mm", Locale.ROOT)
                    .withResolverStyle(ResolverStyle.STRICT);

    /** DB 조회 없이 확인할 수 있는 알림 장소 수정 요청값을 검증한다. */
    public void validate() {
        validateAnyFieldProvided();
        validateInput();
        validateCoordinate();
        validateTime();
    }

    public LocalTime parsedStartTime() {
        return parseTime(startTime);
    }

    public LocalTime parsedEndTime() {
        return parseTime(endTime);
    }

    public boolean hasLocation() {
        return address != null || latitude != null || longitude != null;
    }

    public boolean hasTimeRange() {
        return startTime != null || endTime != null;
    }

    private void validateAnyFieldProvided() {
        if (notificationPlaceName == null
                && address == null
                && latitude == null
                && longitude == null
                && startTime == null
                && endTime == null
                && reason == null) {
            throw new BusinessException(ExceptionType.INVALID_NOTIFICATION_PLACE_INPUT);
        }
    }

    private void validateInput() {
        boolean invalidName =
                notificationPlaceName != null && isInvalidText(notificationPlaceName, MAX_NAME_LENGTH);
        boolean invalidAddress =
                address != null && isInvalidText(address, MAX_ADDRESS_LENGTH);
        boolean invalidReason =
                reason != null && isInvalidText(reason, MAX_REASON_LENGTH);

        if (invalidName || invalidAddress || invalidReason) {
            throw new BusinessException(ExceptionType.INVALID_NOTIFICATION_PLACE_INPUT);
        }
    }

    private void validateCoordinate() {
        if (!hasLocation()) {
            return;
        }

        if (address == null
                || latitude == null
                || longitude == null
                || !GeometryUtils.isValidLatitude(latitude)
                || !GeometryUtils.isValidLongitude(longitude)) {
            throw new BusinessException(ExceptionType.INVALID_NOTIFICATION_PLACE_COORDINATE);
        }
    }

    private void validateTime() {
        if (!hasTimeRange()) {
            return;
        }

        if (startTime == null || endTime == null) {
            throw new BusinessException(ExceptionType.INVALID_NOTIFICATION_PLACE_TIME);
        }

        LocalTime parsedStartTime = parseTime(startTime);
        LocalTime parsedEndTime = parseTime(endTime);

        if (parsedStartTime.equals(parsedEndTime)) {
            throw new BusinessException(ExceptionType.INVALID_NOTIFICATION_PLACE_TIME);
        }
    }

    private LocalTime parseTime(String value) {
        if (value == null) {
            throw new BusinessException(ExceptionType.INVALID_NOTIFICATION_PLACE_TIME);
        }

        try {
            return LocalTime.parse(value, TIME_FORMATTER);
        } catch (DateTimeParseException e) {
            throw new BusinessException(ExceptionType.INVALID_NOTIFICATION_PLACE_TIME);
        }
    }

    private boolean isInvalidText(String value, int maxLength) {
        return value.isBlank() || value.trim().length() > maxLength;
    }
}
