package com.a508.backend.global.security;

import java.util.List;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class UserRoleJwtAuthenticationConverter
	implements Converter<
	Jwt,
	AbstractAuthenticationToken
	> {

	@Override
	public AbstractAuthenticationToken convert(
		Jwt jwt
	) {
		String role =
			jwt.getClaimAsString("role");

		SimpleGrantedAuthority authority =
			new SimpleGrantedAuthority(
				"ROLE_" + role
			);

		return new JwtAuthenticationToken(
			jwt,
			List.of(authority),
			jwt.getSubject()
		);
	}
}