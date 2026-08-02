package com.a508.backend.domain.home.service;

import java.util.List;

import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.home.dto.response.CategorySummaryItem;
import com.a508.backend.domain.home.dto.response.CategorySummaryResponse;
import com.a508.backend.domain.home.dto.response.RecentExpenseResponse;
import com.a508.backend.domain.home.repository.HomeStatisticsRepository;
import com.a508.backend.domain.home.repository.projection.CategoryAmount;
import com.a508.backend.domain.transaction_history.entity.DateRange;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.repository.TransactionHistoryRepository;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.GeometryUtils;

import lombok.RequiredArgsConstructor;

/**
 * 홈 화면 집계 서비스. 기간 경계는 {@link DateRange} 를 통해 서비스 기준 시간대(KST)의 하루 단위로 끊는다.
 */
@Service
@RequiredArgsConstructor
public class HomeService {

	/** limit 미전달 시 홈 화면에 노출할 카테고리 개수. */
	public static final int DEFAULT_CATEGORY_LIMIT = 4;

	private static final int MIN_CATEGORY_LIMIT = 1;
	private static final int MAX_CATEGORY_LIMIT = 20;

	/** "최근 일주일" 의 정의: 오늘 포함 7일. */
	private static final int RECENT_EXPENSE_DAYS = 7;

	/** radius 미전달 시 기본 반경(m). */
	public static final int DEFAULT_RADIUS_METERS = 2_000;

	private static final int MIN_RADIUS_METERS = 1;
	private static final int MAX_RADIUS_METERS = 50_000;

	private final HomeStatisticsRepository homeStatisticsRepository;
	private final TransactionHistoryRepository transactionHistoryRepository;

	/**
	 * 이번 달 누적 지출을 카테고리별로 합산해 금액 상위 N개를 반환한다.
	 * percent 는 상위 N개에 들지 못한 카테고리까지 포함한 <b>이번 달 전체 지출</b>을 분모로 계산한다.
	 * 따라서 limit 을 바꿔도 각 카테고리의 percent 값은 달라지지 않는다.
	 *
	 * @param limit 노출할 카테고리 개수. null 이면 {@link #DEFAULT_CATEGORY_LIMIT} 를 사용한다.
	 */
	@Transactional(readOnly = true)
	public CategorySummaryResponse getCategorySummary(Long userId, Integer limit) {
		int categoryLimit = resolveCategoryLimit(limit);
		DateRange thisMonth = DateRange.ofThisMonth(null, null);

		List<CategoryAmount> categoryAmounts = homeStatisticsRepository.sumExpenseAmountsByCategory(
			userId, thisMonth.startDateTime(), thisMonth.endDateTime());

		long totalAmount = categoryAmounts.stream()
			.mapToLong(CategoryAmount::amount)
			.sum();

		List<CategorySummaryItem> categories = categoryAmounts.stream()
			.limit(categoryLimit)
			.map(categoryAmount -> CategorySummaryItem.of(
				categoryAmount.categoryId(),
				categoryAmount.categoryName(),
				categoryAmount.amount(),
				toPercent(categoryAmount.amount(), totalAmount)))
			.toList();

		return CategorySummaryResponse.from(categories);
	}

	/**
	 * 기준 좌표 반경 안에서 발생한 최근 일주일 지출을 항목명 단위로 합산해 반환한다.
	 * <p>
	 * SRID 4326 의 거리 단위가 도(degree)라 DB 에서는 반경을 감싸는 사각형으로 후보를 좁히고,
	 * 정확한 원형 반경 판정은 하버사인 거리로 애플리케이션에서 수행한다(내 장소 조회와 동일한 방식).
	 *
	 * @param radiusMeters 반경(m). null 이면 {@link #DEFAULT_RADIUS_METERS} 를 사용한다.
	 */
	@Transactional(readOnly = true)
	public RecentExpenseResponse getRecentNearbyExpenses(
		Long userId, double latitude, double longitude, Integer radiusMeters) {
		GeometryUtils.validateCoordinate(latitude, longitude);
		int radius = resolveRadius(radiusMeters);

		DateRange recentWeek = DateRange.ofRecentDays(RECENT_EXPENSE_DAYS);
		Point center = GeometryUtils.toPoint(latitude, longitude);

		List<TransactionHistory> candidates = transactionHistoryRepository.findExpensesWithinArea(
			userId,
			GeometryUtils.toEnvelope(center, radius),
			recentWeek.startDateTime(),
			recentWeek.endDateTime(),
			null);

		List<TransactionHistory> nearbyExpenses = candidates.stream()
			.filter(transaction ->
				GeometryUtils.distanceMeters(center, transaction.getCoordinate()) <= radius)
			.toList();

		return RecentExpenseResponse.of(nearbyExpenses);
	}

	/** 카테고리 개수 기본값 적용 및 범위 검증. */
	private int resolveCategoryLimit(Integer limit) {
		if (limit == null) {
			return DEFAULT_CATEGORY_LIMIT;
		}
		if (limit < MIN_CATEGORY_LIMIT || limit > MAX_CATEGORY_LIMIT) {
			throw new BusinessException(ExceptionType.INVALID_CATEGORY_LIMIT);
		}
		return limit;
	}

	/** 반경 기본값 적용 및 범위 검증. */
	private int resolveRadius(Integer radiusMeters) {
		if (radiusMeters == null) {
			return DEFAULT_RADIUS_METERS;
		}
		if (radiusMeters < MIN_RADIUS_METERS || radiusMeters > MAX_RADIUS_METERS) {
			throw new BusinessException(ExceptionType.INVALID_RADIUS);
		}
		return radiusMeters;
	}

	/** 전체 지출 대비 비율을 반올림한 정수로 계산한다. 전체 지출이 0이면 0을 반환한다. */
	private int toPercent(long amount, long totalAmount) {
		if (totalAmount == 0L) {
			return 0;
		}
		return (int)Math.round(amount * 100.0 / totalAmount);
	}
}
