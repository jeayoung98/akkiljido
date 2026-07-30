package com.a508.backend.global.security;

import java.util.List;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class UserRoleJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

	@Override
	public AbstractAuthenticationToken convert(Jwt jwt) {
		String role = jwt.getClaimAsString("role");

		SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + role);
		AuthenticatedUser principal = createPrincipal(jwt.getSubject());

		return UsernamePasswordAuthenticationToken.authenticated(principal, jwt, List.of(authority));
	}

	private AuthenticatedUser createPrincipal(String subject) {
		try {
			Long userId = Long.valueOf(subject);

			if (userId <= 0) {
				throw new NumberFormatException();
			}

			return new AuthenticatedUser(userId);
		} catch (NumberFormatException | NullPointerException exception) {
			throw new OAuth2AuthenticationException(new OAuth2Error("invalid_token"));
		}
	}
}
