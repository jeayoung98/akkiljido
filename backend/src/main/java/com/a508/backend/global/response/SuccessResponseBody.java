package com.a508.backend.global.response;

import lombok.Getter;

@Getter
public final class SuccessResponseBody<T> extends ResponseBody<T> {
	private final T data;

	public SuccessResponseBody() {
		data = null;
		this.setSuccess(true);
	}

	public SuccessResponseBody(T result) {
		this.data = result;
		this.setSuccess(true);
	}
}
