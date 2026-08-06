package com.a508.backend.global.client.fcm;

/** 단일 기기에 대한 FCM 발송 결과. */
public record FcmSendResult(
	boolean success,
	boolean invalidToken
) {

	public static FcmSendResult sent() {
		return new FcmSendResult(true, false);
	}

	public static FcmSendResult failed(boolean invalidToken) {
		return new FcmSendResult(false, invalidToken);
	}
}
