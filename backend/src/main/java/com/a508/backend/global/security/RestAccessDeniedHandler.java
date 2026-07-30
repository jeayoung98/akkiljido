package com.a508.backend.global.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import com.a508.backend.global.exception.ExceptionType;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RestAccessDeniedHandler
	implements AccessDeniedHandler {

	@Override
	public void handle(
		HttpServletRequest request,
		HttpServletResponse response,
		AccessDeniedException exception
	) throws IOException {

		ExceptionType exceptionType =
			ExceptionType.AUTHORIZATION_DENIED;

		response.setStatus(
			exceptionType
				.getStatus()
				.value()
		);

		response.setCharacterEncoding(
			StandardCharsets.UTF_8.name()
		);

		response.setContentType(
			MediaType.APPLICATION_JSON_VALUE
		);

		response.getWriter().write(
			createFailureBody(exceptionType)
		);
	}

	private String createFailureBody(
		ExceptionType exceptionType
	) {
		return """
			{
			  "code": "%s",
			  "success": false,
			  "msg": "%s"
			}
			""".formatted(
			exceptionType.getCode(),
			exceptionType.getMessage()
		);
	}
}