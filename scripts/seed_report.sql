-- =====================================================================
-- 아낄맵 시연용 AI 리포트 시드 (지라 S15P11A508-144)
-- 내용: 주간 8건(2026-06-08 ~ 08-02) + 월간 2건(6월·7월) = 10건
-- 생성 방법: 로컬 시드 DB + 실제 GMS(gpt-5.4-mini) 호출로
--            ReportGenerationManualRunner.generateDemoSeed() 실행 후 report 테이블을 덤프.
--            즉 이 파일의 headline/body 는 실제 LLM 산출물이며 손으로 쓴 문장이 아니다.
--
-- ⚠ 전제: seed.sql 을 **같은 TARGET_USER_ID 로 먼저** 적재해야 한다.
--    리포트의 총지출·최다지출 장소는 그 사용자의 거래에서 계산된 값이라, 다른 사용자에게 넣으면
--    숫자는 멀쩡한데 밑에 깔린 거래와 어긋난다 — 화면상 티가 나지 않아 더 위험하다.
--
-- 사용: psql -h localhost -U <user> -d <db> -v ON_ERROR_STOP=1 -v TARGET_USER_ID=27 -f seed_report.sql
-- ⚠ 대상 사용자의 기존 리포트·추천 로그를 삭제한다. 다른 사용자 것은 건드리지 않는다.
--
-- INSERT 순서 = 기간 종료일 순 = 배치가 실제로 돌았을 순서다.
--   report 테이블에 기간 컬럼이 없어 목록 조회가 id 역순(findAllByUser_IdOrderByIdDesc)이므로,
--   이 순서를 바꾸면 화면에서 최신 리포트가 아래로 내려간다.
--   report_id 는 명시하지 않는다 — 전역 PK 라 다른 사용자 행과 충돌한다.
-- 기간은 봉투(ai_answer)의 period 필드에만 있다.
-- =====================================================================

-- ▼▼▼ 여기만 수정 ▼▼▼  (seed.sql 과 반드시 같은 값이어야 한다)
--   0 은 존재하지 않는 값이라 이대로 실행하면 아래 검사에서 멈춘다.
--   psql -v TARGET_USER_ID=27 로 밖에서 넘겨도 된다(그 경우 아래 기본값은 무시된다).
\if :{?TARGET_USER_ID}
\else
  \set TARGET_USER_ID 0
\endif
-- ▲▲▲ 여기만 수정 ▲▲▲

BEGIN;

-- 0) 선행 조건: 대상 사용자와 그 사용자의 거래가 존재해야 한다.
--    psql 의 :VAR 는 달러 인용 블록 안에서 치환되지 않으므로 세션 설정으로 넘긴다.
SET LOCAL my.target_user_id = :'TARGET_USER_ID';
DO $seed$
DECLARE
    v_user_id BIGINT := current_setting('my.target_user_id')::BIGINT;
    v_tx      BIGINT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = v_user_id) THEN
        RAISE EXCEPTION '존재하지 않는 user_id 입니다: % — 파일 상단 TARGET_USER_ID 를 확인하세요.', v_user_id;
    END IF;

    SELECT COUNT(*) INTO v_tx FROM transaction_history WHERE user_id = v_user_id;
    IF v_tx = 0 THEN
        RAISE EXCEPTION 'user_id=% 에게 거래내역이 없습니다 — seed.sql 을 같은 TARGET_USER_ID 로 먼저 적재하세요.', v_user_id;
    END IF;
END
$seed$;

-- 1) 대상 사용자의 기존 리포트 정리.
--    로그를 먼저 지운다 — fk_recommendation_log_report 에 ON DELETE CASCADE 가 없어
--    리포트를 먼저 지우면 FK 위반이 난다.
DELETE FROM notification_place_recommendation_log WHERE user_id = :TARGET_USER_ID;
DELETE FROM report WHERE user_id = :TARGET_USER_ID;

-- 2) 리포트 10건 (기간 종료일 순 = 생성 순)
-- #1  WEEKLY  2026-06-08 ~ 2026-06-14  (추천 2건)
INSERT INTO report (user_id, type, total_cost, highest_spending_place, most_frequent_place, ai_answer) VALUES
  (:TARGET_USER_ID, 'WEEKLY', 274100, '홈플러스', '스타벅스', '{"period":{"start":"2026-06-08","end":"2026-06-14"},"headline":"월~금 지출이 고르게 이어졌어요","body":["월~금이 하루 33,700원 선으로 거의 똑같았어요.","카페·간식에 60,100원 썼고, 음식점 지출 94,700원의 63%예요.","지출의 26%를 회사 근처에서 쓰셨어요. 06-14(일)에는 하루 종일 결제가 한 건도 없었어요."],"summary":{"count":30,"placeCount":15},"recommendations":[{"placeName":"홈플러스","address":"경기 수원시 장안구 정자동","latitude":37.2998,"longitude":126.9835,"startTime":"13:00","endTime":"16:00","reasonShort":"오후 13~16시에 34,300원","reasonMessage":"홈플러스에서 34,300원을 쓰셨어요. 오후 13~16시쯤이었는데, 다음에 근처를 지날 때 알려드릴까요?"},{"placeName":"스타벅스","address":"경기 수원시 팔달구 덕영대로","latitude":37.2659,"longitude":126.9999,"startTime":"14:00","endTime":"17:00","reasonShort":"오후 14~17시에 두 번, 16,100원","reasonMessage":"스타벅스에 두 번 들르셨어요(16,100원). 두 번 다 오후였는데, 이 시간대에 알림을 받아보시겠어요?"}]}');
-- #2  WEEKLY  2026-06-15 ~ 2026-06-21  (추천 1건)
INSERT INTO report (user_id, type, total_cost, highest_spending_place, most_frequent_place, ai_answer) VALUES
  (:TARGET_USER_ID, 'WEEKLY', 307100, '성대칼국수', '스타벅스', '{"period":{"start":"2026-06-15","end":"2026-06-21"},"headline":"3만 원 넘는 결제는 없었어요","body":["이번 주엔 3만 원 넘는 결제가 한 건도 없었어요.","지출의 23%를 회사 근처에서 쓰셨어요. 퇴근길에 바로 편의점에 들른 날이 1일 있어요."],"summary":{"count":34,"placeCount":14},"recommendations":[{"placeName":"스타벅스","address":"경기 수원시 팔달구 덕영대로","latitude":37.2659,"longitude":126.9999,"startTime":"14:00","endTime":"17:00","reasonShort":"오후 14~17시에 두 번, 13,300원","reasonMessage":"스타벅스에 두 번 들르셨어요(13,300원). 두 번 다 오후였는데, 이 시간대에 알림을 받아보시겠어요?"}]}');
-- #3  WEEKLY  2026-06-22 ~ 2026-06-28  (추천 1건)
INSERT INTO report (user_id, type, total_cost, highest_spending_place, most_frequent_place, ai_answer) VALUES
  (:TARGET_USER_ID, 'WEEKLY', 383300, '홍콩반점', 'CU', '{"period":{"start":"2026-06-22","end":"2026-06-28"},"headline":"06-27에 지출이 몰렸어요","body":["06-27(토) 하루에 148,400원 — 이번 주 지출의 41%가 그날이에요.","음식점 결제 10건 중 9건이 집에서 시킨 배달이었어요.","일주일 동안 하루 흐름이 4가지밖에 없었어요."],"summary":{"count":39,"placeCount":16},"recommendations":[{"placeName":"인계동막창","address":"경기 수원시 팔달구 인계동","latitude":37.2875,"longitude":127.035,"startTime":"18:00","endTime":"21:00","reasonShort":"저녁 18~21시에 31,100원","reasonMessage":"인계동막창에서 31,100원을 쓰셨어요. 저녁 18~21시쯤이었는데, 다음에 근처를 지날 때 알려드릴까요?"}]}');
-- #4  MONTHLY  2026-06-01 ~ 2026-06-30  (추천 2건)
INSERT INTO report (user_id, type, total_cost, highest_spending_place, most_frequent_place, ai_answer) VALUES
  (:TARGET_USER_ID, 'MONTHLY', 1903600, '피자스쿨', '스타벅스', E'{"period":{"start":"2026-06-01","end":"2026-06-30"},"headline":"결제 없는 날이 하루 있었어요","body":["06-14(일) 하루 종일 결제가 한 건도 없었어요.","\\"교통 → 카페·간식 → 카페·간식 → 교통 → 음식점 → 편의점·마트\\" 순서로 보낸 날이 8일이나 돼요. 스타벅스에만 13번 가셨어요.","편의점·마트에 21번 들르셨어요."],"summary":{"count":147,"placeCount":28},"recommendations":[{"placeName":"수원역초밥","address":"경기 수원시 팔달구 덕영대로","latitude":37.2662,"longitude":127.0002,"startTime":"19:00","endTime":"22:00","reasonShort":"저녁 19~22시에 31,700원","reasonMessage":"수원역초밥에서 31,700원을 쓰셨어요. 저녁 19~22시쯤이었는데, 다음에 근처를 지날 때 알려드릴까요?"},{"placeName":"CGV","address":"경기 수원시 팔달구 덕영대로","latitude":37.2656,"longitude":127.0006,"startTime":"18:00","endTime":"21:00","reasonShort":"저녁 18~21시에 두 번, 31,600원","reasonMessage":"CGV에 두 번 들르셨어요(31,600원). 두 번 다 저녁이었는데, 이 시간대에 알림을 받아보시겠어요?"}]}');
-- #5  WEEKLY  2026-06-29 ~ 2026-07-05  (추천 1건)
INSERT INTO report (user_id, type, total_cost, highest_spending_place, most_frequent_place, ai_answer) VALUES
  (:TARGET_USER_ID, 'WEEKLY', 885500, '피자스쿨', 'GS25', '{"period":{"start":"2026-06-29","end":"2026-07-05"},"headline":"월~금 지출이 비슷했어요","body":["월~금이 하루 34,300원 선으로 거의 똑같았어요. 편차가 1.07배였어요.","쇼핑에 75,100원 쓰셨어요. 아침 커피를 산 날이 2일뿐이에요.","3만 원 넘는 결제가 3건 있었어요."],"summary":{"count":35,"placeCount":17},"recommendations":[{"placeName":"인계동막창","address":"경기 수원시 팔달구 인계동","latitude":37.2875,"longitude":127.035,"startTime":"19:00","endTime":"22:00","reasonShort":"저녁 19~22시에 31,000원","reasonMessage":"인계동막창에서 31,000원을 쓰셨어요. 저녁 19~22시쯤이었는데, 다음에 근처를 지날 때 알려드릴까요?"}]}');
-- #6  WEEKLY  2026-07-06 ~ 2026-07-12  (추천 1건)
INSERT INTO report (user_id, type, total_cost, highest_spending_place, most_frequent_place, ai_answer) VALUES
  (:TARGET_USER_ID, 'WEEKLY', 322400, '홈플러스', '메가MGC커피', '{"period":{"start":"2026-07-06","end":"2026-07-12"},"headline":"7월 11일에 지출이 몰렸어요","body":["7월 11일(토) 하루에 132,000원을 써서 이번 주 지출의 43%가 그날에 모였어요.","음식점 결제 10건 중 9건이 집에서 시킨 배달이었어요. 아침 커피를 산 날은 2일뿐이에요.","일주일 동안 하루 흐름이 4가지밖에 없었어요."],"summary":{"count":32,"placeCount":14},"recommendations":[{"placeName":"홈플러스","address":"경기 수원시 장안구 정자동","latitude":37.2998,"longitude":126.9835,"startTime":"15:00","endTime":"18:00","reasonShort":"오후 15~18시에 50,400원","reasonMessage":"홈플러스에서 50,400원을 쓰셨어요. 오후 15~18시쯤이었는데, 다음에 근처를 지날 때 알려드릴까요?"}]}');
-- #7  WEEKLY  2026-07-13 ~ 2026-07-19  (추천 1건)
INSERT INTO report (user_id, type, total_cost, highest_spending_place, most_frequent_place, ai_answer) VALUES
  (:TARGET_USER_ID, 'WEEKLY', 438100, '쿠팡', '이디야커피', '{"period":{"start":"2026-07-13","end":"2026-07-19"},"headline":"카페를 자주 찾은 주간이에요","body":["이디야커피에만 5번 가셨어요. 하루에 카페를 두 번 간 날이 6일이에요.","편의점·마트는 2번뿐이었어요."],"summary":{"count":35,"placeCount":17},"recommendations":[{"placeName":"수원역초밥","address":"경기 수원시 팔달구 덕영대로","latitude":37.2662,"longitude":127.0002,"startTime":"20:00","endTime":"23:00","reasonShort":"저녁 20~23시에 31,300원","reasonMessage":"수원역초밥에서 31,300원을 쓰셨어요. 저녁 20~23시쯤이었는데, 다음에 근처를 지날 때 알려드릴까요?"}]}');
-- #8  WEEKLY  2026-07-20 ~ 2026-07-26  (추천 1건)
INSERT INTO report (user_id, type, total_cost, highest_spending_place, most_frequent_place, ai_answer) VALUES
  (:TARGET_USER_ID, 'WEEKLY', 449100, '홈플러스', '이디야커피', '{"period":{"start":"2026-07-20","end":"2026-07-26"},"headline":"월~금 지출이 비슷했어요","body":["월~금이 하루 32,500원 선으로 거의 똑같았어요.","이디야커피에만 5번 가셨어요."],"summary":{"count":34,"placeCount":17},"recommendations":[{"placeName":"홈플러스","address":"경기 수원시 장안구 정자동","latitude":37.2998,"longitude":126.9835,"startTime":"14:00","endTime":"17:00","reasonShort":"오후 14~17시에 58,300원","reasonMessage":"홈플러스에서 58,300원을 쓰셨어요. 오후 14~17시쯤이었는데, 다음에 근처를 지날 때 알려드릴까요?"}]}');
-- #9  MONTHLY  2026-07-01 ~ 2026-07-31  (추천 1건)
INSERT INTO report (user_id, type, total_cost, highest_spending_place, most_frequent_place, ai_answer) VALUES
  (:TARGET_USER_ID, 'MONTHLY', 2194300, '홈플러스', '이디야커피', E'{"period":{"start":"2026-07-01","end":"2026-07-31"},"headline":"카페·간식과 교통이 잦았어요","body":["\\"교통 → 카페·간식 → 카페·간식 → 교통 → 음식점 → 편의점·마트\\" 순서로 보낸 날이 6일이나 돼요.","이디야커피에만 14번 가셨어요. 편의점·마트에 18번 들르셨어요.","밤 10시 이후 결제가 5건 있었어요."],"summary":{"count":154,"placeCount":26},"recommendations":[{"placeName":"정자동왕갈비","address":"경기 수원시 장안구 정자동","latitude":37.2996,"longitude":126.9822,"startTime":"11:00","endTime":"14:00","reasonShort":"오전 11~14시에 두 번, 36,900원","reasonMessage":"정자동왕갈비에 두 번 들르셨어요(36,900원). 두 번 다 오전이었는데, 이 시간대에 알림을 받아보시겠어요?"}]}');
-- #10  WEEKLY  2026-07-27 ~ 2026-08-02  (추천 1건)
INSERT INTO report (user_id, type, total_cost, highest_spending_place, most_frequent_place, ai_answer) VALUES
  (:TARGET_USER_ID, 'WEEKLY', 801000, 'BBQ', 'CU', '{"period":{"start":"2026-07-27","end":"2026-08-02"},"headline":"3만 원 넘는 결제는 없었어요","body":["이번 주엔 3만 원 넘는 결제가 한 건도 없었어요.","점심시간(11~14시) 결제가 4건이에요. 퇴근길에 바로 편의점에 들른 날이 1일 있어요."],"summary":{"count":38,"placeCount":16},"recommendations":[{"placeName":"스타벅스","address":"경기 수원시 팔달구 덕영대로","latitude":37.2659,"longitude":126.9999,"startTime":"14:00","endTime":"17:00","reasonShort":"오후 14~17시에 3번, 모두 25,000원","reasonMessage":"오후 14~17시쯤 스타벅스에 자주 들르시네요. 이번 기간에만 3번, 25,000원을 쓰셨어요. 그 시간에 근처를 지나면 미리 알려드릴까요?"}]}');

COMMIT;

-- ── 자가 검증 ────────────────────────────────────────────────────────
SELECT item, result FROM (VALUES
  ('리포트 10건', CASE WHEN (SELECT COUNT(*) FROM report WHERE user_id = :TARGET_USER_ID) = 10 THEN 'OK' ELSE 'FAIL' END),
  ('주간 8건', CASE WHEN (SELECT COUNT(*) FROM report WHERE user_id = :TARGET_USER_ID AND type = 'WEEKLY') = 8 THEN 'OK' ELSE 'FAIL' END),
  ('월간 2건', CASE WHEN (SELECT COUNT(*) FROM report WHERE user_id = :TARGET_USER_ID AND type = 'MONTHLY') = 2 THEN 'OK' ELSE 'FAIL' END),
  ('ai_answer 유효 JSON', CASE WHEN (SELECT COUNT(*) FROM report WHERE user_id = :TARGET_USER_ID AND ai_answer::json->'period'->>'start' IS NOT NULL) = 10 THEN 'OK' ELSE 'FAIL' END),
  ('headline 전부 존재', CASE WHEN (SELECT COUNT(*) FROM report WHERE user_id = :TARGET_USER_ID AND COALESCE(ai_answer::json->>'headline', '') <> '') = 10 THEN 'OK' ELSE 'FAIL' END),
  ('body 전부 1문단 이상', CASE WHEN (SELECT COUNT(*) FROM report WHERE user_id = :TARGET_USER_ID AND json_array_length(ai_answer::json->'body') >= 1) = 10 THEN 'OK' ELSE 'FAIL' END),
  ('id 순서 = 기간 종료일 순', CASE WHEN NOT EXISTS (
      SELECT 1 FROM report a JOIN report b ON a.report_id < b.report_id
      WHERE a.user_id = :TARGET_USER_ID AND b.user_id = :TARGET_USER_ID
        AND (a.ai_answer::json->'period'->>'end')::date > (b.ai_answer::json->'period'->>'end')::date
    ) THEN 'OK' ELSE 'FAIL' END),
  ('기간 범위 06-01~08-02', CASE WHEN (SELECT MIN((ai_answer::json->'period'->>'start')::date) FROM report WHERE user_id = :TARGET_USER_ID) = DATE '2026-06-01'
      AND (SELECT MAX((ai_answer::json->'period'->>'end')::date) FROM report WHERE user_id = :TARGET_USER_ID) = DATE '2026-08-02' THEN 'OK' ELSE 'FAIL' END),
  ('seed.sql 정합성(거래 1866건)', CASE WHEN (SELECT COUNT(*) FROM transaction_history WHERE user_id = :TARGET_USER_ID) = 1866 THEN 'OK' ELSE 'FAIL — seed.sql 과 TARGET_USER_ID 가 다를 수 있음' END)
) AS checks(item, result);