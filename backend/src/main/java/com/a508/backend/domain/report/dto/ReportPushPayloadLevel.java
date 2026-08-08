package com.a508.backend.domain.report.dto;

/**
 * 리포트 푸시 알림의 data 페이로드에 <b>리포트 전문이 실렸는지</b>를 나타내는 등급.
 * 알림 data 의 {@code reportPayload} 키로 항상 실린다.
 * <p>
 * FCM 페이로드 상한(4KB) 때문에 리포트 전문이 못 들어갈 수 있어서, 앱이 "받은 것으로 화면을 그려도
 * 되는지"를 <b>추측하지 않도록</b> 서버가 명시한다.
 * <p>
 * 등급을 둘로만 나눈 이유: 장소알림 추천은 핵심 기능이라 빠지면 앱이 어차피 상세 조회를 해야 한다.
 * "추천만 빠진 전문"은 조회를 아껴 주지 못하므로 중간 단계를 두지 않는다 — 전문은 <b>추천까지 온전할 때만</b>
 * 보내고, 아니면 아예 보내지 않는다.
 * <p>
 * 앱 처리 규칙:
 * <ul>
 *   <li>{@link #FULL} — data 의 {@code report} 만으로 상세 화면을 그려도 된다. 추가 조회 불필요.
 *       {@code recommendations} 가 빈 배열이면 <b>정말 추천이 0건</b>인 것이므로 빈 상태 UI 를 띄운다.</li>
 *   <li>{@link #ID_ONLY} — {@code report} 키 자체가 없다. {@code reportId} 로 상세를 조회해야 한다.</li>
 * </ul>
 * 값은 이름 그대로(문자열) 전송된다 — FCM data 는 String 만 담을 수 있다.
 */
public enum ReportPushPayloadLevel {

	/** 리포트 전문이 추천까지 온전하게 실렸다. */
	FULL,

	/** 전문을 싣지 못했다(크기 초과 또는 직렬화 실패). reportId 만 있다. */
	ID_ONLY;

	/**
	 * 이름 중 가장 긴 것의 바이트 수. 페이로드 예산을 계산할 때 이 키가 차지할 최댓값으로 쓴다.
	 * 이름이 모두 ASCII 라 글자 수가 곧 바이트 수다.
	 */
	public static int maxNameBytes() {
		int max = 0;
		for (ReportPushPayloadLevel level : values()) {
			max = Math.max(max, level.name().length());
		}
		return max;
	}
}
