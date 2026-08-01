package com.a508.backend.domain.transaction_history.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Polygon;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.category.service.CategoryService;
import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.mypage.service.MyPlaceService;
import com.a508.backend.domain.transaction_history.dto.response.MapPlaceListResponse;
import com.a508.backend.domain.transaction_history.dto.response.MapRegionListResponse;
import com.a508.backend.domain.transaction_history.dto.response.MyPlaceMapResponse;
import com.a508.backend.domain.transaction_history.dto.response.MyPlaceTransactionListResponse;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.transaction_history.repository.TransactionHistoryRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;

/**
 * 지도 조회 서비스 단위 테스트. DB(PostGIS) 없이 기간 기본값, 좌표/행정구역 그룹핑,
 * 내 장소 반경 2km 필터, 검증 로직을 확인한다.
 */
@ExtendWith(MockitoExtension.class)
class TransactionMapServiceTest {

	private static final Long USER_ID = 1L;

	// 서울시청 근처. 내 장소 기준 좌표로 사용한다.
	private static final double CENTER_LATITUDE = 37.5665;
	private static final double CENTER_LONGITUDE = 126.9780;

	@Mock
	private TransactionHistoryRepository transactionHistoryRepository;

	@Mock
	private MyPlaceService myPlaceService;

	@Mock
	private CategoryService categoryService;

	@InjectMocks
	private TransactionMapService transactionMapService;

	private Category category(Long id, String name) {
		Category category = Category.builder()
			.user(User.createGoogleGuest("sub"))
			.name(name)
			.build();
		ReflectionTestUtils.setField(category, "id", id);
		return category;
	}

	private TransactionHistory transaction(Long id, String name, long amount, LocalDateTime datetime,
		double latitude, double longitude, String region1, String region2, String region3) {
		TransactionHistory entity = TransactionHistory.builder()
			.userId(USER_ID)
			.category(category(3L, "음식점"))
			.datetime(DateTimeUtils.toServiceOffset(datetime))
			.amount(amount)
			.type(TransactionType.EXPENSE)
			.transactionName(name)
			.paymentMethod("카드")
			.address("서울 마포구 서교동 123-4")
			.region1DepthName(region1)
			.region2DepthName(region2)
			.region3DepthName(region3)
			.coordinate(GeometryUtils.toPoint(latitude, longitude))
			.build();
		ReflectionTestUtils.setField(entity, "id", id);
		return entity;
	}

	private MyPlace myPlace(Long id, String name) {
		MyPlace myPlace = MyPlace.create(User.createGoogleGuest("sub"), name, "서울 중구 태평로1가 31",
			CENTER_LATITUDE, CENTER_LONGITUDE);
		ReflectionTestUtils.setField(myPlace, "id", id);
		return myPlace;
	}

	@Test
	@DisplayName("가계별 조회는 같은 좌표의 거래를 하나로 묶고 금액을 합산한다")
	void getPlaceMapGroupsByCoordinate() {
		LocalDateTime datetime = LocalDateTime.of(2026, 7, 27, 12, 0, 0);
		when(transactionHistoryRepository.findExpensesWithinArea(eq(USER_ID), any(), any(), any(), isNull()))
			.thenReturn(List.of(
				transaction(1L, "스타벅스", 2460L, datetime, 37.5563, 126.9236, "서울특별시", "마포구", "서교동"),
				transaction(2L, "김밥천국", 1640L, datetime, 37.5563, 126.9236, "서울특별시", "마포구", "서교동"),
				transaction(3L, "올리브영", 9000L, datetime, 37.5007, 127.0365, "서울특별시", "강남구", "역삼동")));

		MapPlaceListResponse response = transactionMapService.getPlaceMap(
			USER_ID, 37.49, 126.91, 37.58, 127.05, "2026-07-27", "2026-08-01", null);

		assertThat(response.placeList()).hasSize(2);
		assertThat(response.placeList().get(0).name()).isEqualTo("스타벅스, 김밥천국");
		assertThat(response.placeList().get(0).amount()).isEqualTo(4100L);
		assertThat(response.placeList().get(0).transactionCount()).isEqualTo(2);
		assertThat(response.placeList().get(1).amount()).isEqualTo(9000L);
	}

	@Test
	@DisplayName("남/북, 서/동 좌표가 뒤집혀 있으면 INVALID_MAP_BOUNDS 예외를 던진다")
	void getPlaceMapWithInvertedBounds() {
		assertThatThrownBy(() -> transactionMapService.getPlaceMap(
			USER_ID, 37.58, 126.91, 37.49, 127.05, null, null, null))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_MAP_BOUNDS);

		verifyNoInteractions(transactionHistoryRepository);
	}

	@Test
	@DisplayName("위/경도 유효 범위를 벗어나면 INVALID_MAP_BOUNDS 예외를 던진다")
	void getPlaceMapWithOutOfRangeBounds() {
		assertThatThrownBy(() -> transactionMapService.getPlaceMap(
			USER_ID, -91.0, 126.91, 37.58, 127.05, null, null, null))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_MAP_BOUNDS);
	}

	@Test
	@DisplayName("조회 기간을 넘기지 않으면 이번 주 월요일 00:00 부터 내일 00:00 까지로 조회한다")
	void getPlaceMapUsesThisWeekAsDefaultRange() {
		when(transactionHistoryRepository.findExpensesWithinArea(eq(USER_ID), any(), any(), any(), isNull()))
			.thenReturn(List.of());

		transactionMapService.getPlaceMap(USER_ID, 37.49, 126.91, 37.58, 127.05, null, null, null);

		ArgumentCaptor<OffsetDateTime> startCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);
		ArgumentCaptor<OffsetDateTime> endCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);
		verify(transactionHistoryRepository).findExpensesWithinArea(eq(USER_ID), any(Polygon.class),
			startCaptor.capture(), endCaptor.capture(), isNull());

		assertThat(startCaptor.getValue())
			.isEqualTo(DateTimeUtils.startOfDay(DateTimeUtils.mondayOfThisWeek()));
		assertThat(endCaptor.getValue())
			.isEqualTo(DateTimeUtils.startOfNextDay(DateTimeUtils.today()));
	}

	@Test
	@DisplayName("조회 시작일이 종료일보다 뒤면 INVALID_DATE_RANGE 예외를 던진다")
	void getPlaceMapWithInvalidDateRange() {
		assertThatThrownBy(() -> transactionMapService.getPlaceMap(
			USER_ID, 37.49, 126.91, 37.58, 127.05, "2026-08-02", "2026-08-01", null))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_DATE_RANGE);
	}

	@Test
	@DisplayName("카테고리 필터가 내 카테고리가 아니면 CATEGORY_NOT_FOUND 예외를 던진다")
	void getPlaceMapWithOtherUsersCategory() {
		doThrow(new BusinessException(ExceptionType.CATEGORY_NOT_FOUND))
			.when(categoryService).validateOwnership(USER_ID, 99L);

		assertThatThrownBy(() -> transactionMapService.getPlaceMap(
			USER_ID, 37.49, 126.91, 37.58, 127.05, null, null, 99L))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.CATEGORY_NOT_FOUND);
	}

	@Test
	@DisplayName("depth 2 조회는 시군구 단위로 묶고, 법정동 정보가 없는 거래는 제외한다")
	void getRegionMapGroupsBySigungu() {
		LocalDateTime datetime = LocalDateTime.of(2026, 7, 27, 12, 0, 0);
		when(transactionHistoryRepository.findExpensesWithinArea(eq(USER_ID), any(), any(), any(), isNull()))
			.thenReturn(List.of(
				transaction(1L, "스타벅스", 2460L, datetime, 37.5563, 126.9236, "서울특별시", "마포구", "서교동"),
				transaction(2L, "김밥천국", 1640L, datetime, 37.5573, 126.9246, "서울특별시", "마포구", "합정동"),
				transaction(3L, "올리브영", 9000L, datetime, 37.5007, 127.0365, "서울특별시", "강남구", "역삼동"),
				transaction(4L, "좌표만있음", 5000L, datetime, 37.5100, 127.0000, null, null, null)));

		MapRegionListResponse response = transactionMapService.getRegionMap(
			USER_ID, 2, 37.49, 126.91, 37.58, 127.05, null, null, null);

		assertThat(response.transactionList()).hasSize(2);
		assertThat(response.transactionList().get(0).depthName()).isEqualTo("마포구");
		assertThat(response.transactionList().get(0).amount()).isEqualTo(4100L);
		assertThat(response.transactionList().get(0).transactionCount()).isEqualTo(2);
		assertThat(response.transactionList().get(1).depthName()).isEqualTo("강남구");
	}

	@Test
	@DisplayName("이름이 같아도 상위 행정구역이 다르면 별도 그룹으로 나뉜다")
	void getRegionMapSeparatesSameNameInDifferentSido() {
		LocalDateTime datetime = LocalDateTime.of(2026, 7, 27, 12, 0, 0);
		when(transactionHistoryRepository.findExpensesWithinArea(eq(USER_ID), any(), any(), any(), isNull()))
			.thenReturn(List.of(
				transaction(1L, "서울가게", 1000L, datetime, 37.5636, 126.9976, "서울특별시", "중구", "명동"),
				transaction(2L, "부산가게", 2000L, datetime, 35.1064, 129.0323, "부산광역시", "중구", "남포동")));

		MapRegionListResponse response = transactionMapService.getRegionMap(
			USER_ID, 2, 34.0, 126.0, 38.0, 130.0, null, null, null);

		assertThat(response.transactionList()).hasSize(2);
		assertThat(response.transactionList()).allSatisfy(
			region -> assertThat(region.depthName()).isEqualTo("중구"));
		assertThat(response.transactionList().get(0).amount()).isEqualTo(1000L);
		assertThat(response.transactionList().get(1).amount()).isEqualTo(2000L);
	}

	@Test
	@DisplayName("지원하지 않는 depth 면 INVALID_MAP_DEPTH 예외를 던진다")
	void getRegionMapWithInvalidDepth() {
		assertThatThrownBy(() -> transactionMapService.getRegionMap(
			USER_ID, 4, 37.49, 126.91, 37.58, 127.05, null, null, null))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_MAP_DEPTH);
	}

	@Test
	@DisplayName("내 장소 목록 조회는 반경 2km 밖의 거래를 합계에서 제외한다")
	void getMyPlaceMapFiltersByRadius() {
		LocalDateTime datetime = LocalDateTime.of(2026, 7, 27, 12, 0, 0);
		// 위도 +0.009 도는 약 1km, +0.045 도는 약 5km 떨어진 지점이다.
		when(myPlaceService.getOwnedMyPlaces(USER_ID)).thenReturn(List.of(myPlace(1L, "집")));
		when(transactionHistoryRepository.findExpensesWithinArea(eq(USER_ID), any(), any(), any(), isNull()))
			.thenReturn(List.of(
				transaction(1L, "가까운가게", 3000L, datetime, CENTER_LATITUDE + 0.009, CENTER_LONGITUDE,
					"서울특별시", "중구", "태평로1가"),
				transaction(2L, "먼가게", 7000L, datetime, CENTER_LATITUDE + 0.045, CENTER_LONGITUDE,
					"서울특별시", "종로구", "청운동")));

		List<MyPlaceMapResponse> response = transactionMapService.getMyPlaceMap(USER_ID, null, null);

		assertThat(response).hasSize(1);
		assertThat(response.get(0).placeId()).isEqualTo(1L);
		assertThat(response.get(0).myPlaceName()).isEqualTo("집");
		assertThat(response.get(0).totalAmount()).isEqualTo(3000L);
	}

	@Test
	@DisplayName("내 장소 상세조회는 같은 좌표/항목/카테고리 결제를 묶어 dateList 로 내려준다")
	void getMyPlaceDetailGroupsByItem() {
		when(myPlaceService.getOwnedMyPlace(USER_ID, 1L)).thenReturn(myPlace(1L, "집"));
		when(transactionHistoryRepository.findExpensesWithinArea(eq(USER_ID), any(), any(), any(), isNull()))
			.thenReturn(List.of(
				transaction(1L, "스타벅스", 2460L, LocalDateTime.of(2024, 7, 17, 9, 20, 10),
					CENTER_LATITUDE, CENTER_LONGITUDE, "서울특별시", "중구", "태평로1가"),
				transaction(2L, "스타벅스", 1640L, LocalDateTime.of(2024, 7, 18, 11, 20, 10),
					CENTER_LATITUDE, CENTER_LONGITUDE, "서울특별시", "중구", "태평로1가")));

		MyPlaceTransactionListResponse response = transactionMapService.getMyPlaceDetail(
			USER_ID, 1L, "2024-07-15", "2024-07-21");

		assertThat(response.transactionList()).hasSize(1);
		assertThat(response.transactionList().get(0).name()).isEqualTo("스타벅스");
		assertThat(response.transactionList().get(0).amount()).isEqualTo(4100L);
		assertThat(response.transactionList().get(0).dateList()).hasSize(2);
		assertThat(response.transactionList().get(0).dateList().get(0).transactionId()).isEqualTo(1L);
		assertThat(response.transactionList().get(0).dateList().get(0).datetime())
			.isEqualTo(LocalDateTime.of(2024, 7, 17, 9, 20, 10));
	}

	@Test
	@DisplayName("내 장소 상세조회에서 없는 장소면 MY_PLACE_NOT_FOUND 예외를 던진다")
	void getMyPlaceDetailNotFound() {
		when(myPlaceService.getOwnedMyPlace(USER_ID, 999L))
			.thenThrow(new BusinessException(ExceptionType.MY_PLACE_NOT_FOUND));

		assertThatThrownBy(() -> transactionMapService.getMyPlaceDetail(USER_ID, 999L, null, null))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.MY_PLACE_NOT_FOUND);
	}

	@Test
	@DisplayName("날짜 형식이 잘못되면 INVALID_DATE_FORMAT 예외를 던진다")
	void getMyPlaceMapWithInvalidDateFormat() {
		assertThatThrownBy(() -> transactionMapService.getMyPlaceMap(USER_ID, "2026/07/27", null))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_DATE_FORMAT);
	}

	@Test
	@DisplayName("2km 경계 근처의 거래도 후보 조회 범위에 포함되도록 사각형을 넉넉히 잡는다")
	void myPlaceCandidateEnvelopeCoversFullRadius() {
		LocalDate date = LocalDate.of(2026, 7, 27);
		when(myPlaceService.getOwnedMyPlaces(USER_ID)).thenReturn(List.of(myPlace(1L, "집")));
		when(transactionHistoryRepository.findExpensesWithinArea(eq(USER_ID), any(), any(), any(), isNull()))
			.thenReturn(List.of());

		transactionMapService.getMyPlaceMap(USER_ID, date.toString(), date.toString());

		ArgumentCaptor<Polygon> areaCaptor = ArgumentCaptor.forClass(Polygon.class);
		verify(transactionHistoryRepository).findExpensesWithinArea(eq(USER_ID), areaCaptor.capture(),
			any(), any(), isNull());

		Polygon area = areaCaptor.getValue();
		assertThat(GeometryUtils.distanceMeters(
			GeometryUtils.toPoint(CENTER_LATITUDE, CENTER_LONGITUDE),
			GeometryUtils.toPoint(area.getEnvelopeInternal().getMaxY(), CENTER_LONGITUDE)))
			.isGreaterThan(1_999.0);
	}
}
