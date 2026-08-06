package com.a508.backend.domain.analysis.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.domain.analysis.dto.response.MyPlaceAnalysisResponse;
import com.a508.backend.domain.analysis.dto.response.MyPlaceExpenseResponse;
import com.a508.backend.domain.analysis.repository.AnalysisRepository;
import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.mypage.service.MyPlaceService;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;

/** 월별 내 장소 지출 분석 서비스의 반경 계산, 합계와 비율을 검증한다. */
@ExtendWith(MockitoExtension.class)
class MyPlaceAnalysisServiceTest {

    private static final Long USER_ID = 1L;

    @Mock
    private AnalysisRepository analysisRepository;

    @Mock
    private MyPlaceService myPlaceService;

    @InjectMocks
    private AnalysisService analysisService;

    @Test
    @DisplayName("등록한 내 장소별 반경 2km 내 지출과 전체 지출 대비 비율을 반환한다")
    void getMyPlaceAnalysis() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));

        MyPlace company = createMyPlace(1L, "회사", 37.5000, 127.0000);
        MyPlace home = createMyPlace(2L, "집", 35.1796, 129.0756);
        MyPlace etc = createMyPlace(3L, "기타", 36.3504, 127.3845);

        List<TransactionHistory> expenses = List.of(
                createExpense(100000L, 37.5000, 127.0000),
                createExpense(50000L, 35.1796, 129.0756),
                createExpense(30000L, 33.4996, 126.5312),
                createExpense(20000L, null, null));

        when(analysisRepository.findExpenses(USER_ID, startDateTime, endDateTime))
                .thenReturn(expenses);
        when(myPlaceService.getOwnedMyPlaces(USER_ID))
                .thenReturn(List.of(company, home, etc));

        MyPlaceAnalysisResponse response =
                analysisService.getMyPlaceAnalysis(USER_ID, 2024, 7);

        assertThat(response.totalAmount()).isEqualTo(200000L);
        assertThat(response.categories()).hasSize(3);

        MyPlaceExpenseResponse companyResponse = response.categories().get(0);
        assertThat(companyResponse.placeId()).isEqualTo(1L);
        assertThat(companyResponse.myPlaceName()).isEqualTo("회사");
        assertThat(companyResponse.amount()).isEqualTo(100000L);
        assertThat(companyResponse.percent()).isEqualTo(50);

        MyPlaceExpenseResponse homeResponse = response.categories().get(1);
        assertThat(homeResponse.placeId()).isEqualTo(2L);
        assertThat(homeResponse.myPlaceName()).isEqualTo("집");
        assertThat(homeResponse.amount()).isEqualTo(50000L);
        assertThat(homeResponse.percent()).isEqualTo(25);

        MyPlaceExpenseResponse etcResponse = response.categories().get(2);
        assertThat(etcResponse.placeId()).isEqualTo(3L);
        assertThat(etcResponse.myPlaceName()).isEqualTo("기타");
        assertThat(etcResponse.amount()).isZero();
        assertThat(etcResponse.percent()).isZero();

        verify(analysisRepository).findExpenses(USER_ID, startDateTime, endDateTime);
        verify(myPlaceService).getOwnedMyPlaces(USER_ID);
    }

    @Test
    @DisplayName("반경이 겹치는 내 장소는 동일 거래를 각각 독립적으로 집계한다")
    void countExpenseForEachOverlappingPlace() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));

        MyPlace firstPlace = createMyPlace(1L, "회사", 37.5000, 127.0000);
        MyPlace secondPlace = createMyPlace(2L, "카페", 37.5005, 127.0000);
        TransactionHistory expense = createExpense(10000L, 37.5002, 127.0000);

        when(analysisRepository.findExpenses(USER_ID, startDateTime, endDateTime))
                .thenReturn(List.of(expense));
        when(myPlaceService.getOwnedMyPlaces(USER_ID))
                .thenReturn(List.of(firstPlace, secondPlace));

        MyPlaceAnalysisResponse response =
                analysisService.getMyPlaceAnalysis(USER_ID, 2024, 7);

        assertThat(response.totalAmount()).isEqualTo(10000L);
        assertThat(response.categories())
                .extracting(MyPlaceExpenseResponse::amount)
                .containsExactly(10000L, 10000L);
        assertThat(response.categories())
                .extracting(MyPlaceExpenseResponse::percent)
                .containsExactly(100, 100);
    }

    @Test
    @DisplayName("반경 2km 밖의 거래와 좌표가 없는 거래는 장소 지출에서 제외한다")
    void excludeExpenseOutsideRadiusOrWithoutCoordinate() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));

        MyPlace company = createMyPlace(1L, "회사", 37.5000, 127.0000);

        List<TransactionHistory> expenses = List.of(
                createExpense(10000L, 37.5100, 127.0000),
                createExpense(20000L, 37.5300, 127.0000),
                createExpense(30000L, null, null));

        when(analysisRepository.findExpenses(USER_ID, startDateTime, endDateTime))
                .thenReturn(expenses);
        when(myPlaceService.getOwnedMyPlaces(USER_ID))
                .thenReturn(List.of(company));

        MyPlaceAnalysisResponse response =
                analysisService.getMyPlaceAnalysis(USER_ID, 2024, 7);

        assertThat(response.totalAmount()).isEqualTo(60000L);
        assertThat(response.categories()).singleElement()
                .satisfies(place -> {
                    assertThat(place.amount()).isEqualTo(10000L);
                    assertThat(place.percent()).isEqualTo(17);
                });
    }

    @Test
    @DisplayName("월 지출이 없어도 등록한 내 장소를 금액과 비율 0으로 반환한다")
    void returnOwnedPlacesWhenNoExpensesExist() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));
        MyPlace company = createMyPlace(1L, "회사", 37.5000, 127.0000);

        when(analysisRepository.findExpenses(USER_ID, startDateTime, endDateTime))
                .thenReturn(List.of());
        when(myPlaceService.getOwnedMyPlaces(USER_ID))
                .thenReturn(List.of(company));

        MyPlaceAnalysisResponse response =
                analysisService.getMyPlaceAnalysis(USER_ID, 2024, 7);

        assertThat(response.totalAmount()).isZero();
        assertThat(response.categories()).singleElement()
                .satisfies(place -> {
                    assertThat(place.placeId()).isEqualTo(1L);
                    assertThat(place.myPlaceName()).isEqualTo("회사");
                    assertThat(place.amount()).isZero();
                    assertThat(place.percent()).isZero();
                });
    }

    @Test
    @DisplayName("등록한 내 장소가 없으면 전체 지출과 빈 장소 목록을 반환한다")
    void returnEmptyCategoriesWhenNoMyPlacesExist() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));
        TransactionHistory expense = createExpense(10000L, 37.5000, 127.0000);

        when(analysisRepository.findExpenses(USER_ID, startDateTime, endDateTime))
                .thenReturn(List.of(expense));
        when(myPlaceService.getOwnedMyPlaces(USER_ID))
                .thenReturn(List.of());

        MyPlaceAnalysisResponse response =
                analysisService.getMyPlaceAnalysis(USER_ID, 2024, 7);

        assertThat(response.totalAmount()).isEqualTo(10000L);
        assertThat(response.categories()).isEmpty();
    }

    private MyPlace createMyPlace(
            Long id, String name, Double latitude, Double longitude) {
        MyPlace myPlace = MyPlace.create(
                null,
                name,
                "테스트 주소",
                latitude,
                longitude);

        ReflectionTestUtils.setField(myPlace, "id", id);
        return myPlace;
    }

    private TransactionHistory createExpense(
            Long amount, Double latitude, Double longitude) {
        return TransactionHistory.builder()
                .datetime(DateTimeUtils.toServiceOffset(LocalDateTime.of(2024, 7, 17, 12, 0)))
                .amount(amount)
                .type(TransactionType.EXPENSE)
                .transactionName("거래")
                .paymentMethod("카드")
                .coordinate(GeometryUtils.toPoint(latitude, longitude))
                .build();
    }
}
