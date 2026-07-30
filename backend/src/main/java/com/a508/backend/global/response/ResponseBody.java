package com.a508.backend.global.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public sealed abstract class ResponseBody<T> permits SuccessResponseBody, FailedResponseBody {
	@JsonInclude(JsonInclude.Include.NON_NULL)
	private String code;
	private boolean success;
}
