package com.a508.backend.global.config;

import org.hibernate.boot.model.FunctionContributions;
import org.hibernate.boot.model.FunctionContributor;
import org.hibernate.type.StandardBasicTypes;

/**
 * PostGIS 반경 조회용 HQL 함수를 등록한다.
 * <p>
 * geometry(4326) 의 거리 단위는 도(degree)라 {@code ST_DWithin} 에 미터를 그대로 넘길 수 없어 geography 로
 * 캐스팅해야 한다. 그런데 {@code cast(x as geography)} 는 Hibernate 가 아는 타입이 아니라 HQL 파서를 통과하지 못한다.
 * 그래서 패턴 함수로 등록해 캐스팅을 SQL 렌더링 단계에서만 나타나게 한다(HQL 파서는 함수명만 본다).
 * <p>
 * {@code META-INF/services/org.hibernate.boot.model.FunctionContributor} 를 통해 자동 등록된다.
 */
public class SpatialFunctionContributor implements FunctionContributor {

	/** 반경 조회에 사용할 HQL 함수명. QueryDSL booleanTemplate 에서 이 이름으로 호출한다. */
	public static final String ST_DWITHIN_GEOGRAPHY = "st_dwithin_geography";

	@Override
	public void contributeFunctions(FunctionContributions functionContributions) {
		functionContributions.getFunctionRegistry().registerPattern(
			ST_DWITHIN_GEOGRAPHY,
			"st_dwithin(cast(?1 as geography), cast(?2 as geography), ?3)",
			functionContributions.getTypeConfiguration()
				.getBasicTypeRegistry()
				.resolve(StandardBasicTypes.BOOLEAN));
	}
}
