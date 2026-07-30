package com.a508.backend.mypage.domain;

import java.math.BigDecimal;

import org.locationtech.jts.geom.CoordinateXY;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
	name = "my_place",
	uniqueConstraints = {
		@UniqueConstraint(
			name = "uk_my_place_user_place_name",
			columnNames = {
				"user_id",
				"place_name"
			}
		)
	}
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MyPlace {

	private static final int WGS84_SRID = 4326;

	private static final GeometryFactory GEOMETRY_FACTORY =
		new GeometryFactory(new PrecisionModel(), WGS84_SRID);

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "my_place_id")
	private Long id;

	/*
	 * OAuth2의 User 엔티티가 병합되기 전까지
	 * 사용자 ID만 임시로 저장한다.
	 */
	@Column(
		name = "user_id",
		nullable = false
	)
	private Long userId;

	@Column(
		name = "place_name",
		nullable = false,
		length = 20
	)
	private String myPlaceName;

	@Column(
		name = "address",
		nullable = false,
		length = 50
	)
	private String address;

	@Column(
		name = "coordinate",
		nullable = false,
		columnDefinition = "geometry(Point, 4326)"
	)
	private Point coordinate;

	private MyPlace(
		Long userId,
		String myPlaceName,
		String address,
		Point coordinate
	) {
		this.userId = userId;
		this.myPlaceName = myPlaceName;
		this.address = address;
		this.coordinate = coordinate;
	}

	public static MyPlace create(
		Long userId,
		String myPlaceName,
		String address,
		BigDecimal latitude,
		BigDecimal longitude
	) {
		return new MyPlace(
			userId,
			myPlaceName,
			address,
			createPoint(latitude, longitude)
		);
	}

	public void updateName(String myPlaceName) {
		this.myPlaceName = myPlaceName;
	}

	public void updateLocation(
		String address,
		BigDecimal latitude,
		BigDecimal longitude
	) {
		this.address = address;
		this.coordinate = createPoint(latitude, longitude);
	}

	public boolean isOwnedBy(Long userId) {
		return this.userId.equals(userId);
	}

	public BigDecimal getLatitude() {
		return BigDecimal.valueOf(coordinate.getY());
	}

	public BigDecimal getLongitude() {
		return BigDecimal.valueOf(coordinate.getX());
	}

	private static Point createPoint(
		BigDecimal latitude,
		BigDecimal longitude
	) {
		CoordinateXY coordinate =
			new CoordinateXY(longitude.doubleValue(), latitude.doubleValue());

		return GEOMETRY_FACTORY.createPoint(coordinate);
	}
}
