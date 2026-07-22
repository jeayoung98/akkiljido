package com.a508.backend.auth.dto;


// recevied는 백엔드가 문자열을 받았다는 뜻이며,
// 인증, 회원가입, jwt 발급에 성공했다는 것이 아니다.
public record GoogleLoginReceiptResponse (
        boolean received,
        String message
){
}
