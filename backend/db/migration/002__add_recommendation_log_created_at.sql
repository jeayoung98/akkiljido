ALTER TABLE notification_place_recommendation_log
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE notification_place_recommendation_log
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

ALTER TABLE notification_place_recommendation_log
    ALTER COLUMN created_at SET NOT NULL;
