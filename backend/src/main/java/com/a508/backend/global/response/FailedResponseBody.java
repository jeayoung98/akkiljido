package com.a508.backend.global.response;

import lombok.Getter;

@Getter
public final class FailedResponseBody extends ResponseBody<Void> {
	private final String msg;

	public FailedResponseBody(String code, String msg) {
		this.setCode(code);
		this.msg = msg;
		this.setSuccess(false);
	}
}
