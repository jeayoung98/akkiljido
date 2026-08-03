package com.a508.backend.domain.home.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Point;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.home.dto.response.CategorySummaryResponse;
import com.a508.backend.domain.home.dto.response.RecentExpenseResponse;
import com.a508.backend.domain.home.repository.HomeStatisticsRepository;
import com.a508.backend.domain.home.repository.projection.CategoryAmount;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.transaction_history.repository.TransactionHistoryRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;

/**
 * 홈 화면 집계 서비스 단위 테스트. DB(PostGIS) 없이 기간 경계, Top N 절삭과 percent 계산,
 * 항목명 그룹핑, 반경 파라미터 전달과 검증을 확인한다.
 * <p>
 * 반경 경계 판정 자체는 PostGIS ST_DWithin 이 담당하므로 여기서 검증하지 않는다(통합 테스트 영역).
 */
@ExtendWith(MockitoExtension.class)
class HomeServiceTest {

	private static final Long USER_ID = 1L;

	// 강남역 근처. 내 주변 조회의 기준 좌표로 사용한다.
	private static final double CENTER_LATITUDE = 37.5006;
	private static final double CENTER_LONGITUDE = 127.0366;

	// 기준 좌표에서 북쪽으로 약 100m.
	private static final double NEAR_LATITUDE = 37.5015;

	// 그룹 대표(가장 최근 거래) 선정만 검증하므로 절대 날짜에는 의미가 없다.
	private static final LocalDateTime EARLIER = LocalDateTime.of(2026, 8, 1, 12, 0);
	private static final LocalDateTime LATER = LocalDateTime.of(2026, 8, 2, 12, 0);

	@Mock
	private HomeStatisticsRepository homeStatisticsRepository;

	@Mock
	private TransactionHistoryRepository transactionHistoryRepository;

	@InjectMocks
	private HomeService homeService;

	@Test
	@DisplayName("limit 을 주지 않으면 금액 상위 4개만 내려가고 percent 는 전체 지출 대비 반올림 값이다")
	void getCategorySummary_returnsTop4WithRoundedPercent() {
		given(homeStatisticsRepository.sumExpenseAmountsByCategory(eq(USER_ID), any(), any()))
			.willReturn(sampleCategoryAmounts());

		CategorySummaryResponse response = homeService.getCategorySummary(USER_ID, null);

		assertThat(response.categories()).hasSize(HomeService.DEFAULT_CATEGORY_LIMIT);
		assertThat(response.categories()).extracting("categoryId", "categoryName", "amount", "percent")
			.containsExactly(
				tuple(1L, "음식점", 370_000L, 37),
				tuple(2L, "쇼핑", 300_000L, 30),
				tuple(3L, "교통", 175_000L, 18),   // 17.5 -> 반올림 18
				tuple(4L, "카페", 105_000L, 11));  // 10.5 -> 반올림 11
	}

	@Test
	@DisplayName("limit 을 주면 그 개수만큼 내려가고 percent 는 전체 지출 기준이라 그대로다")
	void getCategorySummary_appliesGivenLimit() {
		given(homeStatisticsRepository.sumExpenseAmountsByCategory(eq(USER_ID), any(), any()))
			.willReturn(sampleCategoryAmounts());

		CategorySummaryResponse response = homeService.getCategorySummary(USER_ID, 2);

		assertThat(response.categories()).extracting("categoryName", "percent")
			.containsExactly(
				tuple("음식점", 37),
				tuple("쇼핑", 30));
	}

	@Test
	@DisplayName("limit 이 조회된 카테고리 수보다 크면 있는 만큼만 내려간다")
	void getCategorySummary_limitLargerThanResult() {
		given(homeStatisticsRepository.sumExpenseAmountsByCategory(eq(USER_ID), any(), any()))
			.willReturn(sampleCategoryAmounts());

		CategorySummaryResponse response = homeService.getCategorySummary(USER_ID, 20);

		assertThat(response.categories()).hasSize(5);
	}

	@Test
	@DisplayName("카테고리별 지출 조회 기간은 이번 달 1일 0시부터 내일 0시 직전까지다")
	void getCategorySummary_queriesCurrentMonthRange() {
		given(homeStatisticsRepository.sumExpenseAmountsByCategory(eq(USER_ID), any(), any()))
			.willReturn(List.of());

		homeService.getCategorySummary(USER_ID, null);

		ArgumentCaptor<OffsetDateTime> startCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);
		ArgumentCaptor<OffsetDateTime> endCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);
		verify(homeStatisticsRepository).sumExpenseAmountsByCategory(
			eq(USER_ID), startCaptor.capture(), endCaptor.capture());

		LocalDate today = DateTimeUtils.today();
		assertThat(startCaptor.getValue()).isEqualTo(DateTimeUtils.startOfDay(today.withDayOfMonth(1)));
		assertThat(endCaptor.getValue()).isEqualTo(DateTimeUtils.startOfNextDay(today));
	}

	@Test
	@DisplayName("지출이 없으면 카테고리 목록은 비어 있다")
	void getCategorySummary_returnsEmptyListWhenNoExpense() {
		given(homeStatisticsRepository.sumExpenseAmountsByCategory(eq(USER_ID), any(), any()))
			.willReturn(List.of());

		CategorySummaryResponse response = homeService.getCategorySummary(USER_ID, null);

		assertThat(response.categories()).isEmpty();
	}

	@Test
	@DisplayName("limit 이 1 미만이면 INVALID_CATEGORY_LIMIT 예외가 발생한다")
	void getCategorySummary_throwsWhenLimitBelowMin() {
		assertThatThrownBy(() -> homeService.getCategorySummary(USER_ID, 0))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_CATEGORY_LIMIT);

		assertThatThrownBy(() -> homeService.getCategorySummary(USER_ID, -1))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_CATEGORY_LIMIT);

		verifyNoInteractions(homeStatisticsRepository);
	}

	@Test
	@DisplayName("limit 에 상한은 없고 조회된 카테고리 수보다 크면 있는 만큼만 내려간다")
	void getCategorySummary_hasNoUpperLimit() {
		given(homeStatisticsRepository.sumExpenseAmountsByCategory(eq(USER_ID), any(), any()))
			.willReturn(sampleCategoryAmounts());

		CategorySummaryResponse response = homeService.getCategorySummary(USER_ID, Integer.MAX_VALUE);

		assertThat(response.categories()).hasSize(5);
	}

	@Test
	@DisplayName("같은 항목명의 지출은 합산하고 주소/좌표는 가장 최근 거래 값을 쓴다")
	void getRecentNearbyExpenses_groupsByName() {
		given(transactionHistoryRepository.findExpensesWithinRadius(
			eq(USER_ID), any(Point.class), anyDouble(), any(), any(), isNull()))
			.willReturn(List.of(
				expense("스타벅스", 5_000L, "옛 주소", NEAR_LATITUDE, CENTER_LONGITUDE, EARLIER),
				expense("스타벅스", 18_000L, "새 주소", NEAR_LATITUDE, CENTER_LONGITUDE, LATER),
				expense("김밥천국", 9_000L, "역삼로 1", NEAR_LATITUDE, CENTER_LONGITUDE, LATER)));

		RecentExpenseResponse response = homeService.getRecentNearbyExpenses(
			USER_ID, CENTER_LATITUDE, CENTER_LONGITUDE, null);

		assertThat(response.totalAmount()).isEqualTo(32_000L);
		assertThat(response.placeList()).extracting("name", "amount", "address")
			.containsExactly(
				tuple("스타벅스", 23_000L, "새 주소"),
				tuple("김밥천국", 9_000L, "역삼로 1"));
	}

	@Test
	@DisplayName("조회 기간은 오늘 포함 7일(오늘-6일 0시 ~ 내일 0시)이다")
	void getRecentNearbyExpenses_queriesLastSevenDays() {
		given(transactionHistoryRepository.findExpensesWithinRadius(
			eq(USER_ID), any(Point.class), anyDouble(), any(), any(), isNull()))
			.willReturn(List.of());

		homeService.getRecentNearbyExpenses(USER_ID, CENTER_LATITUDE, CENTER_LONGITUDE, 500);

		ArgumentCaptor<OffsetDateTime> startCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);
		ArgumentCaptor<OffsetDateTime> endCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);
		verify(transactionHistoryRepository).findExpensesWithinRadius(
			eq(USER_ID), any(Point.class), anyDouble(), startCaptor.capture(), endCaptor.capture(), isNull());

		LocalDate today = DateTimeUtils.today();
		assertThat(startCaptor.getValue()).isEqualTo(DateTimeUtils.startOfDay(today.minusDays(6)));
		assertThat(endCaptor.getValue()).isEqualTo(DateTimeUtils.startOfNextDay(today));
	}

	@Test
	@DisplayName("radius 를 주지 않으면 기준 좌표와 기본 반경 2000m 로 조회한다")
	void getRecentNearbyExpenses_usesDefaultRadius() {
		given(transactionHistoryRepository.findExpensesWithinRadius(
			eq(USER_ID), any(Point.class), anyDouble(), any(), any(), isNull()))
			.willReturn(List.of());

		homeService.getRecentNearbyExpenses(USER_ID, CENTER_LATITUDE, CENTER_LONGITUDE, null);

		ArgumentCaptor<Point> centerCaptor = ArgumentCaptor.forClass(Point.class);
		ArgumentCaptor<Double> radiusCaptor = ArgumentCaptor.forClass(Double.class);
		verify(transactionHistoryRepository).findExpensesWithinRadius(
			eq(USER_ID), centerCaptor.capture(), radiusCaptor.capture(), any(), any(), isNull());

		Point expectedCenter = GeometryUtils.toPoint(CENTER_LATITUDE, CENTER_LONGITUDE);
		assertThat(centerCaptor.getValue().equalsExact(expectedCenter)).isTrue();
		assertThat(radiusCaptor.getValue()).isEqualTo((double)HomeService.DEFAULT_RADIUS_METERS);
	}

	@Test
	@DisplayName("전달한 radius 를 그대로 반경 조회에 넘긴다")
	void getRecentNearbyExpenses_passesGivenRadius() {
		given(transactionHistoryRepository.findExpensesWithinRadius(
			eq(USER_ID), any(Point.class), anyDouble(), any(), any(), isNull()))
			.willReturn(List.of());

		homeService.getRecentNearbyExpenses(USER_ID, CENTER_LATITUDE, CENTER_LONGITUDE, 500);

		verify(transactionHistoryRepository).findExpensesWithinRadius(
			eq(USER_ID), any(Point.class), eq(500.0), any(), any(), isNull());
	}

	@Test
	@DisplayName("반경이 허용 범위를 벗어나면 INVALID_RADIUS 예외가 발생한다")
	void getRecentNearbyExpenses_throwsWhenRadiusOutOfRange() {
		assertThatThrownBy(() -> homeService.getRecentNearbyExpenses(USER_ID, CENTER_LATITUDE, CENTER_LONGITUDE, 0))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_RADIUS);

		assertThatThrownBy(
			() -> homeService.getRecentNearbyExpenses(USER_ID, CENTER_LATITUDE, CENTER_LONGITUDE, 50_001))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_RADIUS);

		verifyNoInteractions(transactionHistoryRepository);
	}

	@Test
	@DisplayName("좌표가 유효 범위를 벗어나면 좌표 예외가 발생한다")
	void getRecentNearbyExpenses_throwsWhenCoordinateOutOfRange() {
		assertThatThrownBy(() -> homeService.getRecentNearbyExpenses(USER_ID, 91.0, CENTER_LONGITUDE, null))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_LATITUDE);

		assertThatThrownBy(() -> homeService.getRecentNearbyExpenses(USER_ID, CENTER_LATITUDE, 181.0, null))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_LONGITUDE);

		verifyNoInteractions(transactionHistoryRepository);
	}

	/** 전체 합계 1,000,000 원. 상위 4개 밖 카테고리(기타 50,000)까지 percent 분모에 포함된다. */
	private List<CategoryAmount> sampleCategoryAmounts() {
		return List.of(
			new CategoryAmount(1L, "음식점", 370_000L),
			new CategoryAmount(2L, "쇼핑", 300_000L),
			new CategoryAmount(3L, "교통", 175_000L),
			new CategoryAmount(4L, "카페", 105_000L),
			new CategoryAmount(5L, "기타", 50_000L));
	}

	private User user() {
		User user = User.createGoogleGuest("sub");
		ReflectionTestUtils.setField(user, "id", USER_ID);
		return user;
	}

	private Category category() {
		Category category = Category.builder()
			.user(user())
			.name("음식점")
			.build();
		ReflectionTestUtils.setField(category, "id", 3L);
		return category;
	}

	private TransactionHistory expense(String name, long amount, String address,
		double latitude, double longitude, LocalDateTime datetime) {
		return TransactionHistory.builder()
			.user(user())
			.category(category())
			.datetime(DateTimeUtils.toServiceOffset(datetime))
			.amount(amount)
			.type(TransactionType.EXPENSE)
			.transactionName(name)
			.paymentMethod("카드")
			.address(address)
			.coordinate(GeometryUtils.toPoint(latitude, longitude))
			.build();
	}
}
