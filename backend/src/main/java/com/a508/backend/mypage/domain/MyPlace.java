package com.a508.backend.mypage.domain;

import java.math.BigDecimal;

import org.locationtech.jts.geom.CoordinateXY;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

import com.a508.backend.user.domain.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

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
		User user,
		String myPlaceName,
		String address,
		Point coordinate
	) {
		this.user = user;
		this.myPlaceName = myPlaceName;
		this.address = address;
		this.coordinate = coordinate;
	}

	public static MyPlace create(
		User user,
		String myPlaceName,
		String address,
		BigDecimal latitude,
		BigDecimal longitude
	) {
		return new MyPlace(
			user,
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
			new CoordinateXY(
				longitude.doubleValue(),
				latitude.doubleValue()
			);

		Point point = GEOMETRY_FACTORY.createPoint(coordinate);
		point.setSRID(WGS84_SRID);

		return point;
	}
}