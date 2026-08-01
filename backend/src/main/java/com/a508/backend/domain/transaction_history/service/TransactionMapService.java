package com.a508.backend.domain.transaction_history.service;

import java.util.List;

import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.category.service.CategoryService;
import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.mypage.service.MyPlaceService;
import com.a508.backend.domain.transaction_history.dto.response.MapPlaceListResponse;
import com.a508.backend.domain.transaction_history.dto.response.MapRegionListResponse;
import com.a508.backend.domain.transaction_history.dto.response.MyPlaceMapResponse;
import com.a508.backend.domain.transaction_history.dto.response.MyPlaceTransactionListResponse;
import com.a508.backend.domain.transaction_history.entity.DateRange;
import com.a508.backend.domain.transaction_history.entity.MapBounds;
import com.a508.backend.domain.transaction_history.entity.MapDepth;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.repository.TransactionHistoryRepository;
import com.a508.backend.global.util.GeometryUtils;

import lombok.RequiredArgsConstructor;

/**
 * 거래내역 지도 조회 서비스.
 * 조회 기간의 기본값은 이번 주 월요일 ~ 오늘이며, 지도에 표시하는 금액은 모두 지출(EXPENSE) 합산이다.
 */
@Service
@RequiredArgsConstructor
public class TransactionMapService {

	/** 내 장소 기준 소비 집계 반경(m). */
	private static final double MY_PLACE_RADIUS_METERS = 2_000;

	private final TransactionHistoryRepository transactionHistoryRepository;
	private final MyPlaceService myPlaceService;
	private final CategoryService categoryService;

	/**
	 * 지도 화면 영역 안의 지출 거래내역을 좌표(가계) 단위로 묶어 조회한다.
	 */
	@Transactional(readOnly = true)
	public MapPlaceListResponse getPlaceMap(Long userId, double south, double west, double north, double east,
		String startDate, String endDate, Long categoryId) {
		MapBounds bounds = MapBounds.of(south, west, north, east);
		DateRange dateRange = DateRange.ofThisWeek(startDate, endDate);
		categoryService.validateOwnership(userId, categoryId);

		return MapPlaceListResponse.of(findExpensesInBounds(userId, bounds, dateRange, categoryId));
	}

	/**
	 * 지도 화면 영역 안의 지출 거래내역을 행정구역(시도/시군구/읍면동) 단위로 묶어 조회한다.
	 */
	@Transactional(readOnly = true)
	public MapRegionListResponse getRegionMap(Long userId, Integer depth, double south, double west, double north,
		double east, String startDate, String endDate, Long categoryId) {
		MapDepth mapDepth = MapDepth.from(depth);
		MapBounds bounds = MapBounds.of(south, west, north, east);
		DateRange dateRange = DateRange.ofThisWeek(startDate, endDate);
		categoryService.validateOwnership(userId, categoryId);

		return MapRegionListResponse.of(mapDepth, findExpensesInBounds(userId, bounds, dateRange, categoryId));
	}

	/**
	 * 등록한 내 장소 목록과, 각 장소 반경 2km 안에서 발생한 지출 합계를 조회한다.
	 */
	// TODO: 장소 수만큼 공간 쿼리가 나가므로, 장소가 많아지면 전체 영역 1회 조회 후 메모리 집계로 전환 검토
	@Transactional(readOnly = true)
	public List<MyPlaceMapResponse> getMyPlaceMap(Long userId, String startDate, String endDate) {
		DateRange dateRange = DateRange.ofThisWeek(startDate, endDate);

		return myPlaceService.getOwnedMyPlaces(userId).stream()
			.map(myPlace -> {
				long totalAmount = findExpensesNearMyPlace(userId, myPlace, dateRange).stream()
					.mapToLong(TransactionHistory::getAmount)
					.sum();
				return MyPlaceMapResponse.of(myPlace, totalAmount);
			})
			.toList();
	}

	/**
	 * 내 장소 반경 2km 안의 지출 거래내역을 항목별로 묶어 상세 조회한다.
	 */
	@Transactional(readOnly = true)
	public MyPlaceTransactionListResponse getMyPlaceDetail(Long userId, Long placeId, String startDate,
		String endDate) {
		DateRange dateRange = DateRange.ofThisWeek(startDate, endDate);

		MyPlace myPlace = myPlaceService.getOwnedMyPlace(userId, placeId);

		return MyPlaceTransactionListResponse.of(findExpensesNearMyPlace(userId, myPlace, dateRange));
	}

	private List<TransactionHistory> findExpensesInBounds(Long userId, MapBounds bounds, DateRange dateRange,
		Long categoryId) {
		return transactionHistoryRepository.findExpensesWithinArea(userId, bounds.toPolygon(),
			dateRange.startDateTime(), dateRange.endDateTime(), categoryId);
	}

	/**
	 * 내 장소 반경 2km 안의 지출 거래내역을 조회한다.
	 * SRID 4326 의 거리 단위가 도(degree)라 DB 에서는 반경을 감싸는 사각형으로 후보를 좁히고,
	 * 정확한 원형 반경 판정은 하버사인 거리로 애플리케이션에서 수행한다.
	 */
	private List<TransactionHistory> findExpensesNearMyPlace(Long userId, MyPlace myPlace, DateRange dateRange) {
		Point center = myPlace.getCoordinate();

		List<TransactionHistory> candidates = transactionHistoryRepository.findExpensesWithinArea(userId,
			GeometryUtils.toEnvelope(center, MY_PLACE_RADIUS_METERS), dateRange.startDateTime(),
			dateRange.endDateTime(), null);

		return candidates.stream()
			.filter(transaction ->
				GeometryUtils.distanceMeters(center, transaction.getCoordinate()) <= MY_PLACE_RADIUS_METERS)
			.toList();
	}

}
