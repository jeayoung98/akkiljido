package com.a508.backend.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 배치 스케줄링 활성화. 현재 사용처는 리포트 생성 배치(ReportBatchService — 주간/월간 새벽)뿐이다.
 * BackendApplication 에 직접 붙이지 않고 별도 설정으로 둔 것은 애플리케이션 클래스 수정 충돌을 피하기 위함.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
