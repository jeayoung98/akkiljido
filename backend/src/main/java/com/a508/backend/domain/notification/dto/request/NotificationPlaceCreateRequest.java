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
import jakarta.validation.constraints.NotNull;

@Schema(description = "알림 장소 등록 요청")
public record NotificationPlaceCreateRequest(

	@Schema(description = "알림 장소 이름", example = "회사")
	@NotNull(message = "알림 장소 이름은 필수입니다.")
	String notificationPlaceName,

	@Schema(description = "알림 장소 주소", example = "서울 강남구 역삼동")
	@NotNull(message = "알림 장소 주소는 필수입니다.")
	String address,

	@Schema(description = "알림 장소 위도", example = "37.5007")
	@NotNull(message = "위도는 필수입니다.")
	Double latitude,

	@Schema(description = "알림 장소 경도", example = "127.0365")
	@NotNull(message = "경도는 필수입니다.")
	Double longitude,

	@Schema(description = "알림 시작 시간", example = "09:00")
	@NotNull(message = "알림 시작 시간은 필수입니다.")
	String startTime,

	@Schema(description = "알림 종료 시간", example = "18:00")
	@NotNull(message = "알림 종료 시간은 필수입니다.")
	String endTime,

	@Schema(description = "알림 설정 이유", example = "근무 시간 소비 알림")
	@NotNull(message = "알림 설정 이유는 필수입니다.")
	String reason
) {

	private static final int MAX_NAME_LENGTH = 20;
	private static final int MAX_ADDRESS_LENGTH = 50;
	private static final int MAX_REASON_LENGTH = 100;

	private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern(
		"HH:mm",
		Locale.ROOT
	).withResolverStyle(ResolverStyle.STRICT);

	/** DB 조회 없이 확인할 수 있는 알림 장소 등록 요청값을 검증한다. */
	public void validate() {
		validateInput();
		validateCoordinate();

		LocalTime parsedStartTime = parseTime(startTime);
		LocalTime parsedEndTime = parseTime(endTime);

		if (parsedStartTime.equals(parsedEndTime)) {
			throw new BusinessException(ExceptionType.INVALID_NOTIFICATION_PLACE_TIME);
		}
	}

	public LocalTime parsedStartTime() {
		return parseTime(startTime);
	}

	public LocalTime parsedEndTime() {
		return parseTime(endTime);
	}

	private void validateInput() {
		if (isInvalidText(notificationPlaceName, MAX_NAME_LENGTH)
			|| isInvalidText(address, MAX_ADDRESS_LENGTH)
			|| isInvalidText(reason, MAX_REASON_LENGTH)) {
			throw new BusinessException(ExceptionType.INVALID_NOTIFICATION_PLACE_INPUT);
		}
	}

	private void validateCoordinate() {
		if (latitude == null
			|| longitude == null
			|| !GeometryUtils.isValidLatitude(latitude)
			|| !GeometryUtils.isValidLongitude(longitude)) {
			throw new BusinessException(ExceptionType.INVALID_NOTIFICATION_PLACE_COORDINATE);
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
		return value == null || value.isBlank() || value.trim().length() > maxLength;
	}
}
