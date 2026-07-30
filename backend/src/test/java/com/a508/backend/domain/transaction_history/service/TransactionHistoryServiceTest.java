package com.a508.backend.domain.transaction_history.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Optional;

import org.assertj.core.data.Offset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.domain.transaction_history.dto.request.TransactionHistoryCreateRequest;
import com.a508.backend.domain.transaction_history.dto.request.TransactionHistoryUpdateRequest;
import com.a508.backend.domain.transaction_history.dto.response.TransactionHistoryResponse;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.transaction_history.repository.TransactionHistoryRepository;
import com.a508.backend.global.client.kakao.KakaoLocalApiClient;
import com.a508.backend.global.client.kakao.dto.RegionInfo;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;

@ExtendWith(MockitoExtension.class)
class TransactionHistoryServiceTest {

	@Mock
	private TransactionHistoryRepository transactionHistoryRepository;

	@Mock
	private KakaoLocalApiClient kakaoLocalApiClient;

	@InjectMocks
	private TransactionHistoryService transactionHistoryService;

	private static final Long USER_ID = 1L;
	private static final LocalDateTime DATETIME = LocalDateTime.of(2026, 7, 27, 15, 30, 0);

	private TransactionHistoryCreateRequest createRequest(Double latitude, Double longitude) {
		return new TransactionHistoryCreateRequest(
			"스타벅스",
			15000L,
			TransactionType.EXPENSE,
			"카드",
			3L,
			DATETIME,
			"서울 강남구 테헤란로",
			latitude,
			longitude,
			"아메리카노");
	}

	private TransactionHistory storedEntity(Long id) {
		TransactionHistory entity = TransactionHistory.builder()
			.userId(USER_ID)
			.categoryId(3L)
			.datetime(DateTimeUtils.toServiceOffset(DATETIME))
			.amount(15000L)
			.type(TransactionType.EXPENSE)
			.transactionName("스타벅스")
			.paymentMethod("카드")
			.memo("아메리카노")
			.address("서울 강남구 테헤란로")
			.bCode("1168010100")
			.region1DepthName("서울특별시")
			.region2DepthName("강남구")
			.region3DepthName("역삼동")
			.coordinate(GeometryUtils.toPoint(37.5006, 127.0366))
			.build();
		ReflectionTestUtils.setField(entity, "id", id);
		return entity;
	}

	@Test
	@DisplayName("createTransactionHistory 는 좌표를 법정동으로 변환해 저장하고, datetime 을 KST OffsetDateTime 으로 저장한다")
	void create() {
		when(kakaoLocalApiClient.coordToRegion(37.5006, 127.0366))
			.thenReturn(Optional.of(new RegionInfo("1168010100", "서울특별시", "강남구", "역삼동")));
		when(transactionHistoryRepository.save(any(TransactionHistory.class)))
			.thenAnswer(invocation -> {
				TransactionHistory arg = invocation.getArgument(0);
				ReflectionTestUtils.setField(arg, "id", 100L);
				return arg;
			});

		TransactionHistoryResponse response = transactionHistoryService.createTransactionHistory(
			USER_ID, createRequest(37.5006, 127.0366));

		assertThat(response.transactionId()).isEqualTo(100L);

		ArgumentCaptor<TransactionHistory> captor = ArgumentCaptor.forClass(TransactionHistory.class);
		verify(transactionHistoryRepository).save(captor.capture());
		TransactionHistory saved = captor.getValue();

		assertThat(saved.getUserId()).isEqualTo(USER_ID);
		assertThat(saved.getCategoryId()).isEqualTo(3L);
		assertThat(saved.getType()).isEqualTo(TransactionType.EXPENSE);
		assertThat(saved.getDatetime()).isEqualTo(DateTimeUtils.toServiceOffset(DATETIME));
		assertThat(saved.getTransactionName()).isEqualTo("스타벅스");
		assertThat(saved.getPaymentMethod()).isEqualTo("카드");
		// 법정동 정보가 보강되었는지
		assertThat(saved.getBCode()).isEqualTo("1168010100");
		assertThat(saved.getRegion1DepthName()).isEqualTo("서울특별시");
		assertThat(saved.getRegion2DepthName()).isEqualTo("강남구");
		assertThat(saved.getRegion3DepthName()).isEqualTo("역삼동");
		assertThat(saved.getCoordinate()).isNotNull();
		assertThat(saved.getCoordinate().getY()).isCloseTo(37.5006, Offset.offset(1e-9));
		assertThat(saved.getCoordinate().getX()).isCloseTo(127.0366, Offset.offset(1e-9));
	}

	@Test
	@DisplayName("createTransactionHistory 는 좌표가 없으면 카카오 API 를 호출하지 않고 법정동 정보는 비운다")
	void createWithoutCoordinate() {
		when(transactionHistoryRepository.save(any(TransactionHistory.class)))
			.thenAnswer(invocation -> {
				TransactionHistory arg = invocation.getArgument(0);
				ReflectionTestUtils.setField(arg, "id", 101L);
				return arg;
			});

		transactionHistoryService.createTransactionHistory(USER_ID, createRequest(null, null));

		verify(kakaoLocalApiClient, never()).coordToRegion(anyDouble(), anyDouble());

		ArgumentCaptor<TransactionHistory> captor = ArgumentCaptor.forClass(TransactionHistory.class);
		verify(transactionHistoryRepository).save(captor.capture());
		TransactionHistory saved = captor.getValue();

		assertThat(saved.getBCode()).isNull();
		assertThat(saved.getRegion1DepthName()).isNull();
		assertThat(saved.getCoordinate()).isNull();
	}

	@Test
	@DisplayName("findOneTransactionHistoryResponse 은 엔티티를 API 응답 형태로 매핑한다 (datetime 결합, 좌표 분해)")
	void findOne() {
		when(transactionHistoryRepository.findByIdAndUserId(10L, USER_ID))
			.thenReturn(Optional.of(storedEntity(10L)));

		TransactionHistoryResponse response = transactionHistoryService.findOneTransactionHistoryResponse(USER_ID, 10L);

		assertThat(response.transactionId()).isEqualTo(10L);
		assertThat(response.name()).isEqualTo("스타벅스");
		assertThat(response.amount()).isEqualTo(15000L);
		assertThat(response.type()).isEqualTo(TransactionType.EXPENSE);
		assertThat(response.paymentMethod()).isEqualTo("카드");
		assertThat(response.category()).isEqualTo(3L);
		assertThat(response.datetime()).isEqualTo(DATETIME);
		assertThat(response.latitude()).isCloseTo(37.5006, Offset.offset(1e-9));
		assertThat(response.longitude()).isCloseTo(127.0366, Offset.offset(1e-9));
		assertThat(response.memo()).isEqualTo("아메리카노");
	}

	@Test
	@DisplayName("findOneTransactionHistoryResponse 은 소유자 내역이 없으면 TRANSACTION_HISTORY_NOT_FOUND 예외를 던진다")
	void findOneNotFound() {
		when(transactionHistoryRepository.findByIdAndUserId(999L, USER_ID))
			.thenReturn(Optional.empty());

		assertThatThrownBy(() -> transactionHistoryService.findOneTransactionHistoryResponse(USER_ID, 999L))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.TRANSACTION_HISTORY_NOT_FOUND);
	}

	@Test
	@DisplayName("updateTransactionHistory 는 소유한 엔티티의 필드를 갱신하고 갱신된 응답을 반환한다")
	void update() {
		TransactionHistory entity = storedEntity(10L);
		when(transactionHistoryRepository.findByIdAndUserId(10L, USER_ID))
			.thenReturn(Optional.of(entity));

		LocalDateTime updatedDatetime = LocalDateTime.of(2026, 7, 24, 9, 0, 0);
		TransactionHistoryUpdateRequest request = new TransactionHistoryUpdateRequest(
			"김밥천국",
			20000L,
			TransactionType.EXPENSE,
			"현금",
			5L,
			updatedDatetime,
			"서울 강남구 역삼동",
			35.1796,
			129.0756,
			"제육덮밥");

		TransactionHistoryResponse response = transactionHistoryService.updateTransactionHistory(USER_ID, 10L, request);

		// 엔티티가 실제로 갱신되었는지
		assertThat(entity.getCategoryId()).isEqualTo(5L);
		assertThat(entity.getTransactionName()).isEqualTo("김밥천국");
		assertThat(entity.getPaymentMethod()).isEqualTo("현금");
		OffsetDateTime expectedOffset = DateTimeUtils.toServiceOffset(updatedDatetime);
		assertThat(entity.getDatetime()).isEqualTo(expectedOffset);
		// 법정동 정보는 등록 시점 값을 유지한다
		assertThat(entity.getBCode()).isEqualTo("1168010100");

		// 응답 매핑
		assertThat(response.name()).isEqualTo("김밥천국");
		assertThat(response.category()).isEqualTo(5L);
		assertThat(response.datetime()).isEqualTo(updatedDatetime);
		assertThat(response.latitude()).isCloseTo(35.1796, Offset.offset(1e-9));
		assertThat(response.longitude()).isCloseTo(129.0756, Offset.offset(1e-9));
	}

	@Test
	@DisplayName("deleteTransactionHistory 는 소유한 엔티티를 삭제한다")
	void delete() {
		TransactionHistory entity = storedEntity(10L);
		when(transactionHistoryRepository.findByIdAndUserId(10L, USER_ID))
			.thenReturn(Optional.of(entity));

		transactionHistoryService.deleteTransactionHistory(USER_ID, 10L);

		verify(transactionHistoryRepository).delete(entity);
	}

	@Test
	@DisplayName("deleteTransactionHistory 는 소유자 내역이 없으면 예외를 던지고 삭제를 시도하지 않는다")
	void deleteNotFound() {
		when(transactionHistoryRepository.findByIdAndUserId(999L, USER_ID))
			.thenReturn(Optional.empty());

		assertThatThrownBy(() -> transactionHistoryService.deleteTransactionHistory(USER_ID, 999L))
			.isInstanceOf(BusinessException.class);

		verify(transactionHistoryRepository, never()).delete(any());
	}
}
