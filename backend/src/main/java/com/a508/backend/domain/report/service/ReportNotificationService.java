package com.a508.backend.domain.report.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.a508.backend.domain.fcm.entity.UserPushToken;
import com.a508.backend.domain.fcm.repository.UserPushTokenRepository;
import com.a508.backend.domain.report.dto.ReportDetailResponse;
import com.a508.backend.domain.report.dto.ReportEnvelope;
import com.a508.backend.domain.report.dto.ReportNotifyResponse;
import com.a508.backend.domain.report.dto.ReportPushPayloadLevel;
import com.a508.backend.domain.report.entity.Report;
import com.a508.backend.domain.report.entity.ReportPeriod;
import com.a508.backend.domain.report.entity.ReportType;
import com.a508.backend.domain.report.repository.ReportRepository;
import com.a508.backend.global.client.fcm.FcmClient;
import com.a508.backend.global.client.fcm.FcmSendResult;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.DateTimeUtils;
import tools.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 리포트 알림 발송 배치 — 생성 배치(새벽 5시)가 만들어 둔 리포트를 아침 7시에 푸시로 알린다.
 * <p>
 * 생성과 발송을 분리한 이유: LLM 호출 시간이 사용자마다 달라 "생성이 끝나는 시각"을 못 박을 수 없고,
 * 새벽 5시에 푸시가 울리면 안 되기 때문이다. 두 시간의 여유를 두고 <b>이미 저장된 리포트만</b> 읽는다 —
 * 이 서비스는 LLM 을 호출하지 않으며, 리포트를 만들지도 않는다.
 * <p>
 * 알림 구성:
 * <ul>
 *   <li>제목 — 유형별 고정 문구("지난주/지난달 소비 리포트가 도착했어요")</li>
 *   <li>본문 — 리포트 헤드라인 한 줄</li>
 *   <li>data — {@code reportId}, 리포트 전문({@code report}), 그리고 전문이 얼마나 온전한지 알리는
 *       {@code reportPayload}({@link ReportPushPayloadLevel}). 전문은 상세 조회 API 와 <b>같은 스키마</b>
 *       ({@link ReportDetailResponse})라 앱이 파싱 모델을 재사용할 수 있고, 알림 탭 직후 네트워크 없이
 *       화면을 그릴 수 있다. FCM 페이로드 한도에 걸리면 전문을 통째로 빼되, 뺐다는 사실을
 *       {@code reportPayload} 로 반드시 알린다 — 앱이 추측하게 두지 않는다.</li>
 * </ul>
 * <p>
 * 발송 계약:
 * <ul>
 *   <li>리포트가 없는 사용자에게는 보내지 않는다 — 거래 없음(R003)·LLM 실패(R002)로 리포트가
 *       안 만들어진 사용자에게 푸시를 보내면 앱을 열었을 때 빈 화면을 보게 된다.</li>
 *   <li>한 사용자의 실패가 다른 사용자 발송을 막지 않는다(생성 배치와 같은 격리 규칙).</li>
 *   <li>FCM 이 만료·무효로 판정한 토큰은 발송 후 일괄 삭제한다.</li>
 *   <li>멱등하지 <b>않다</b> — 두 번 실행하면 푸시가 두 번 간다. 재실행 시 주의.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportNotificationService {

	private static final String WEEKLY_TITLE = "지난주 소비 리포트가 도착했어요";
	private static final String MONTHLY_TITLE = "지난달 소비 리포트가 도착했어요";
	private static final String WEEKLY_NOTIFICATION_TYPE = "REPORT_WEEKLY";
	private static final String MONTHLY_NOTIFICATION_TYPE = "REPORT_MONTHLY";
	/** 헤드라인이 비어 있을 때의 본문. 봉투 검증을 통과했다면 도달하지 않는다. */
	private static final String FALLBACK_BODY = "이번 리포트를 확인해 보세요.";

	/** 앱이 알림 탭 시 상세로 이동할 때 쓰는 data 키. 전문이 빠져도 이 키는 항상 실린다. */
	private static final String REPORT_ID_KEY = "reportId";
	/** 리포트 전문(JSON) data 키. 값의 스키마는 {@link ReportDetailResponse} 와 동일하다. */
	private static final String REPORT_KEY = "report";
	/**
	 * 전문이 얼마나 온전한지 알리는 data 키({@link ReportPushPayloadLevel}). 등급과 무관하게 항상 실린다 —
	 * 앱이 "추천이 0건인 것"과 "추천이 잘린 것"을 구분하려면 이 값이 있어야 한다.
	 */
	private static final String PAYLOAD_LEVEL_KEY = "reportPayload";
	/** FCM 메시지 페이로드 상한(문서상 4KB). 넘기면 발송 자체가 거부된다. */
	private static final int FCM_PAYLOAD_LIMIT_BYTES = 4096;
	/**
	 * 상한에서 남겨 두는 여유분. 우리가 세는 건 우리가 넣은 문자열 뿐이고 실제 전송 크기에는
	 * 토큰·JSON 구조·안드로이드 설정 같은 오버헤드가 더 붙는다. 딱 맞춰 보내면 한도에 걸린다.
	 */
	private static final int PAYLOAD_SAFETY_MARGIN_BYTES = 512;

	private final ReportRepository reportRepository;
	private final UserPushTokenRepository userPushTokenRepository;
	private final FcmClient fcmClient;
	private final ObjectMapper objectMapper;

	@Scheduled(cron = "0 0 7 * * MON", zone = "Asia/Seoul")
	public void notifyWeeklyReports() {
		runScheduled(ReportType.WEEKLY);
	}

	@Scheduled(cron = "0 0 7 1 * *", zone = "Asia/Seoul")
	public void notifyMonthlyReports() {
		runScheduled(ReportType.MONTHLY);
	}

	/**
	 * 직전 완결 기간(주간: 지난주 월~일 / 월간: 지난달)의 리포트만 발송 대상으로 삼는다. 운영 경로.
	 * 같은 사용자에게 해당 기간 리포트가 없으면 그냥 건너뛴다.
	 */
	public ReportNotifyResponse notifyForPeriod(ReportType type, LocalDate baseDate) {
		ReportPeriod period = type == ReportType.WEEKLY
			? ReportPeriod.previousWeek(baseDate)
			: ReportPeriod.previousMonth(baseDate);
		return notify(type, period);
	}

	/**
	 * 기간을 따지지 않고 사용자별 <b>가장 최근</b> 리포트를 발송한다. 시연 전용 경로.
	 * <p>
	 * 운영 경로와 달리 기간 조건을 두지 않는 이유는, 시연 시점이 배치 주기와 어긋나 있어도
	 * (예: 이번 달 중순에 시연) 지난달 리포트가 그대로 나가야 하기 때문이다.
	 */
	public ReportNotifyResponse notifyLatest(ReportType type) {
		return notify(type, null);
	}

	private void runScheduled(ReportType type) {
		try {
			ReportNotifyResponse result = notifyForPeriod(type, DateTimeUtils.today());
			log.info("{} 리포트 알림 배치 종료 — 대상 {}명, 발송 성공 {}명, 토큰없음 {}명, 토큰 {}건 성공/{}건 실패",
				type, result.targetUserCount(), result.notifiedUserCount(),
				result.skippedNoTokenCount(), result.sentTokenCount(), result.failedTokenCount());
		} catch (Exception e) {
			// 스케줄러 스레드로 예외가 새어 나가면 다음 실행 로그가 지저분해진다 — 여기서 끊는다.
			log.error("{} 리포트 알림 배치 실패", type, e);
		}
	}

	private ReportNotifyResponse notify(ReportType type, ReportPeriod period) {
		List<Target> targets = loadTargets(type, period);
		log.info("{} 리포트 알림 시작 — 대상 {}명 ({})",
			type, targets.size(), period == null ? "사용자별 최신 리포트" : period.start() + " 기간");

		if (targets.isEmpty()) {
			return ReportNotifyResponse.empty();
		}
		return send(type, targets);
	}

	/**
	 * 발송 대상 선별 — 사용자별로 조건에 맞는 리포트 <b>한 건</b>을 고른다.
	 * <p>
	 * 쿼리가 id 내림차순이므로 사용자별 첫 등장이 곧 최신이다. period 가 주어지면 기간이 일치하는
	 * 첫 리포트를, 주어지지 않으면(시연) 최신 리포트를 고른다. 기간 컬럼이 없어 봉투를 열어야 하는데,
	 * 이미 선별된 사용자의 나머지 리포트는 역직렬화조차 하지 않고 건너뛴다.
	 * <p>
	 * 엔티티는 이 메서드 밖으로 나가지 않는다 — 발송 루프가 쓰는 값(헤드라인·전문 JSON)은 여기서 다 뽑는다.
	 */
	private List<Target> loadTargets(ReportType type, ReportPeriod period) {
		Map<Long, Target> selectedByUser = new LinkedHashMap<>();

		for (Report report : reportRepository.findAllByTypeWithUserOrderByIdDesc(type)) {
			Long userId = report.getUser().getId();
			if (selectedByUser.containsKey(userId)) {
				continue;
			}
			ReportEnvelope envelope = deserialize(report);
			if (envelope == null || (period != null && !matchesPeriod(envelope, period))) {
				continue;
			}
			selectedByUser.put(userId, new Target(
				userId, report.getId(), bodyOf(envelope), ReportDetailResponse.of(report, envelope)));
		}
		return List.copyOf(selectedByUser.values());
	}

	private ReportNotifyResponse send(ReportType type, List<Target> targets) {
		String title = type == ReportType.WEEKLY ? WEEKLY_TITLE : MONTHLY_TITLE;
		String notificationType = type == ReportType.WEEKLY
			? WEEKLY_NOTIFICATION_TYPE
			: MONTHLY_NOTIFICATION_TYPE;

		Map<Long, List<UserPushToken>> tokensByUser = userPushTokenRepository
			.findAllByUserIdInWithUser(targets.stream().map(Target::userId).toList())
			.stream()
			.collect(Collectors.groupingBy(token -> token.getUser().getId()));

		List<Long> invalidTokenIds = new ArrayList<>();
		int notifiedUserCount = 0;
		int skippedNoTokenCount = 0;
		int sentTokenCount = 0;
		int failedTokenCount = 0;

		for (Target target : targets) {
			List<UserPushToken> tokens = tokensByUser.get(target.userId());
			if (tokens == null || tokens.isEmpty()) {
				skippedNoTokenCount++;
				continue;
			}

			// 페이로드는 사용자 단위로 한 번만 만든다 — 기기가 여러 대여도 내용은 같다.
			Map<String, String> data = buildDataPayload(target, title, notificationType);

			boolean sentToAnyDevice = false;
			for (UserPushToken token : tokens) {
				try {
					FcmSendResult result = fcmClient.send(
						token.getPushToken(), title, target.body(), notificationType, data);

					if (result.success()) {
						sentTokenCount++;
						sentToAnyDevice = true;
					} else {
						failedTokenCount++;
						if (result.invalidToken()) {
							invalidTokenIds.add(token.getId());
						}
					}
				} catch (BusinessException e) {
					// FCM 미설정은 모든 발송이 같은 이유로 실패한다 — 계속 돌 이유가 없으므로 중단한다.
					if (e.getExceptionType() == ExceptionType.FCM_NOT_CONFIGURED) {
						cleanUpInvalidTokens(invalidTokenIds);
						throw e;
					}
					failedTokenCount++;
					log.warn("푸시 발송 실패 (userId={}, tokenId={})", target.userId(), token.getId(), e);
				} catch (Exception e) {
					// 한 기기의 예외가 나머지 사용자 발송을 막지 않는다.
					failedTokenCount++;
					log.warn("푸시 발송 중 예외 (userId={}, tokenId={})", target.userId(), token.getId(), e);
				}
			}
			if (sentToAnyDevice) {
				notifiedUserCount++;
			}
		}

		int deletedTokenCount = cleanUpInvalidTokens(invalidTokenIds);
		return new ReportNotifyResponse(targets.size(), notifiedUserCount, skippedNoTokenCount,
			sentTokenCount, failedTokenCount, deletedTokenCount);
	}

	/**
	 * data 페이로드 구성 — 리포트 전문을 통째로 싣되, FCM 한도를 넘기면 전문을 빼고 식별자만 보낸다.
	 * 어느 쪽이든 {@code reportPayload} 로 무엇이 실렸는지 함께 알린다.
	 * <p>
	 * 중간 단계("추천만 빼고 나머지는 전송")를 두지 않는 이유: 장소알림 추천은 핵심 기능이라 빠지면
	 * 앱이 어차피 상세 조회를 해야 한다. 조회를 아껴 주지도 못하면서 "일부만 맞는 데이터"를 들려 보내면
	 * 앱 분기만 늘어난다. 전문은 <b>추천까지 온전할 때만</b> 의미가 있다.
	 * <p>
	 * 크기가 문제되는 이유: 본문 문단(최대 4개)과 추천(최대 3건, 주소·이유 멘트 포함)이 모두 들어가는데
	 * 한글은 UTF-8 로 글자당 3바이트다. 한도를 넘기면 FCM 이 메시지 자체를 거부하므로,
	 * "전문 없는 알림"이 "알림 없음"보다 낫다고 보고 전문을 버린다.
	 */
	private Map<String, String> buildDataPayload(Target target, String title, String notificationType) {
		String reportId = String.valueOf(target.reportId());
		int budget = FCM_PAYLOAD_LIMIT_BYTES - PAYLOAD_SAFETY_MARGIN_BYTES
			- utf8Bytes(title) - utf8Bytes(target.body()) - utf8Bytes(notificationType)
			- utf8Bytes(REPORT_ID_KEY) - utf8Bytes(reportId)
			- utf8Bytes(PAYLOAD_LEVEL_KEY) - ReportPushPayloadLevel.maxNameBytes()
			- utf8Bytes(REPORT_KEY);

		String full = serializeDetail(target.detail(), target.reportId());
		if (full == null) {
			return payload(reportId, ReportPushPayloadLevel.ID_ONLY, null);
		}
		if (utf8Bytes(full) > budget) {
			log.warn("리포트 전문이 FCM 한도를 넘어 data 에서 제외 — 앱은 reportId 로 조회해야 한다 "
				+ "(reportId={}, {}바이트 / 여유 {}바이트)", target.reportId(), utf8Bytes(full), budget);
			return payload(reportId, ReportPushPayloadLevel.ID_ONLY, null);
		}
		return payload(reportId, ReportPushPayloadLevel.FULL, full);
	}

	/** data 맵 조립. 등급은 어떤 경우에도 빠지지 않고, 전문은 온전할 때만 넣는다. */
	private Map<String, String> payload(String reportId, ReportPushPayloadLevel level, String detailJson) {
		if (detailJson == null) {
			return Map.of(REPORT_ID_KEY, reportId, PAYLOAD_LEVEL_KEY, level.name());
		}
		return Map.of(REPORT_ID_KEY, reportId, PAYLOAD_LEVEL_KEY, level.name(), REPORT_KEY, detailJson);
	}

	/** FCM 이 UNREGISTERED/INVALID_ARGUMENT 로 돌려준 토큰을 지운다. 다음 발송에서 헛수고를 줄인다. */
	private int cleanUpInvalidTokens(List<Long> invalidTokenIds) {
		if (invalidTokenIds.isEmpty()) {
			return 0;
		}
		int count = invalidTokenIds.size();
		userPushTokenRepository.deleteAllByIdInBatch(List.copyOf(invalidTokenIds));
		invalidTokenIds.clear();
		log.info("만료된 푸시 토큰 {}건 삭제", count);
		return count;
	}

	private boolean matchesPeriod(ReportEnvelope envelope, ReportPeriod period) {
		return envelope.period() != null && period.start().equals(envelope.period().start());
	}

	/** 푸시 본문은 리포트 헤드라인을 그대로 쓴다 — 알림만 보고도 무슨 리포트인지 알 수 있어야 한다. */
	private String bodyOf(ReportEnvelope envelope) {
		String headline = envelope.headline();
		return (headline == null || headline.isBlank()) ? FALLBACK_BODY : headline;
	}

	/** 상세 조회 API 와 같은 스키마로 직렬화한다. 실패해도 알림 자체는 나가야 하므로 null 로 강등한다. */
	private String serializeDetail(ReportDetailResponse detail, Long reportId) {
		try {
			return objectMapper.writeValueAsString(detail);
		} catch (Exception e) {
			log.error("리포트 전문 직렬화 실패 — data 없이 발송한다 (reportId={})", reportId, e);
			return null;
		}
	}

	private ReportEnvelope deserialize(Report report) {
		try {
			return objectMapper.readValue(report.getAiAnswer(), ReportEnvelope.class);
		} catch (Exception e) {
			// 저장 시 검증된 정본이라 도달하면 안 되는 경로 — 그 사용자만 조용히 건너뛴다.
			log.error("리포트 봉투 역직렬화 실패 — 알림 대상에서 제외 (reportId={})", report.getId(), e);
			return null;
		}
	}

	private int utf8Bytes(String value) {
		return value == null ? 0 : value.getBytes(StandardCharsets.UTF_8).length;
	}

	/** 발송 루프가 필요로 하는 최소 정보. 엔티티를 트랜잭션 밖으로 끌고 다니지 않기 위한 값 객체. */
	private record Target(Long userId, Long reportId, String body, ReportDetailResponse detail) {
	}
}
