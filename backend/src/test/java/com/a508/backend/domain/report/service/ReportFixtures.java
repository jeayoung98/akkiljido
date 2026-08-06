package com.a508.backend.domain.report.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.Charset;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.global.util.GeometryUtils;

/**
 * 대조 테스트 공용 픽스처 로더. test/resources/report/ 의 시드 CSV(cp949)를 엔티티로 변환한다.
 * 픽스처와 골든 파일의 출처는 참조 구현(PoC-AI 레포) — WeeklyFactComparisonTest 클래스 주석 참조.
 */
final class ReportFixtures {

	private static final Charset CP949 = Charset.forName("MS949");
	private static final DateTimeFormatter DATETIME =
		DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ssXXX");

	private ReportFixtures() {
	}

	static List<TransactionHistory> loadTransactions(User user) {
		Map<String, Category> categories = new HashMap<>();
		List<TransactionHistory> result = new ArrayList<>();
		try (BufferedReader reader = open("/report/dummy_data.csv")) {
			List<String> header = parseCsvLine(reader.readLine());
			String line;
			while ((line = reader.readLine()) != null) {
				if (line.isBlank()) {
					continue;
				}
				List<String> fields = parseCsvLine(line);
				Map<String, String> row = new HashMap<>();
				for (int i = 0; i < header.size(); i++) {
					row.put(header.get(i), i < fields.size() ? fields.get(i) : "");
				}
				Category category = categories.computeIfAbsent(row.get("category_name"),
					name -> Category.builder().user(user).name(name).build());
				result.add(TransactionHistory.builder()
					.user(user)
					.category(category)
					.datetime(OffsetDateTime.parse(row.get("datetime"), DATETIME))
					.amount(Long.parseLong(row.get("amount")))
					.type(TransactionType.valueOf(row.get("type")))
					.transactionName(row.get("transaction_name"))
					.paymentMethod(row.get("payment_method"))
					.address(row.get("address"))
					.region1DepthName(row.get("region_1depth_name"))
					.region2DepthName(row.get("region_2depth_name"))
					.region3DepthName(row.get("region_3depth_name"))
					.coordinate(GeometryUtils.toPoint(
						Double.parseDouble(row.get("latitude")),
						Double.parseDouble(row.get("longitude"))))
					.build());
			}
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
		return result;
	}

	static List<MyPlace> loadMyPlaces(User user) {
		List<MyPlace> result = new ArrayList<>();
		try (BufferedReader reader = open("/report/my_place.csv")) {
			reader.readLine(); // header: my_place_id,user_id,place_name,address,latitude,longitude
			String line;
			while ((line = reader.readLine()) != null) {
				if (line.isBlank()) {
					continue;
				}
				List<String> fields = parseCsvLine(line);
				result.add(MyPlace.create(user, fields.get(2), fields.get(3),
					Double.parseDouble(fields.get(4)), Double.parseDouble(fields.get(5))));
			}
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
		return result;
	}

	static InputStream resource(String path) {
		return ReportFixtures.class.getResourceAsStream(path);
	}

	private static BufferedReader open(String path) {
		return new BufferedReader(new InputStreamReader(resource(path), CP949));
	}

	/** 따옴표 필드를 처리하는 최소 CSV 파서(픽스처 전용). */
	private static List<String> parseCsvLine(String line) {
		List<String> fields = new ArrayList<>();
		StringBuilder current = new StringBuilder();
		boolean inQuotes = false;
		for (int i = 0; i < line.length(); i++) {
			char ch = line.charAt(i);
			if (inQuotes) {
				if (ch == '"') {
					if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
						current.append('"');
						i++;
					} else {
						inQuotes = false;
					}
				} else {
					current.append(ch);
				}
			} else if (ch == '"') {
				inQuotes = true;
			} else if (ch == ',') {
				fields.add(current.toString());
				current.setLength(0);
			} else {
				current.append(ch);
			}
		}
		fields.add(current.toString());
		return fields;
	}
}
