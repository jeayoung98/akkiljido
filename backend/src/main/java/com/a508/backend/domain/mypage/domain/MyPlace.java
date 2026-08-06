package com.a508.backend.domain.mypage.domain;

import org.locationtech.jts.geom.Point;

import com.a508.backend.domain.user.domain.User;
import com.a508.backend.global.util.GeometryUtils;

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
		Double latitude,
		Double longitude
	) {
		return new MyPlace(
			user,
			myPlaceName,
			address,
			GeometryUtils.toPoint(latitude, longitude)
		);
	}

	public void updateName(String myPlaceName) {
		this.myPlaceName = myPlaceName;
	}

	public void updateLocation(
		String address,
		Double latitude,
		Double longitude
	) {
		this.address = address;
		this.coordinate = GeometryUtils.toPoint(latitude, longitude);
	}

	public Double getLatitude() {
		return GeometryUtils.latitudeOf(coordinate);
	}

	public Double getLongitude() {
		return GeometryUtils.longitudeOf(coordinate);
	}
}