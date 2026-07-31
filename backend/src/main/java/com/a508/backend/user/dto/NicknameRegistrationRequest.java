package com.a508.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NicknameRegistrationRequest(

	@NotBlank(message = "닉네임은 필수입니다.") @Size(max = 20, message = "닉네임은 20자 이하여야 합니다.") String nickname

) {
}