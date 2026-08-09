import { useState } from 'react';
import { Alert } from 'react-native';

import type { AlarmFormValue } from '@/components/common/modal/SaveAlarmModal';
import { createNotificationPlace } from '@/src/api/notificationPlaceApi';
import { loadNotificationPlaces, saveNotificationPlaces } from '@/utils/notificationPlaceStorage';

/**
 * 추천 위치 알림을 실제로 등록한다(POST /api/v1/notification). 홈 화면 리포트 팝업과 과거 리포트
 * 화면의 방앗간 추천이 같은 저장 동작을 쓰도록 공유한다.
 *
 * 백그라운드 위치 태스크는 API가 아니라 로컬 목록(utils/notificationPlaceStorage.ts)만 읽으므로,
 * 저장에 성공하면 그 목록에도 같이 반영한다(생성 응답에 id가 없으면 로컬 반영은 건너뛴다 — 서버에는
 * 저장됐고, 알림 설정 화면에 들어가면 목록째 다시 동기화된다).
 *
 * onSaved는 저장 성공 시 호출된다(보통 SaveAlarmModal만 닫고 추천 목록으로 돌아가는 데 쓴다).
 */
export function useSaveRecommendedAlarm(onSaved: () => void) {
  const [saving, setSaving] = useState(false);

  const saveAlarm = async (value: AlarmFormValue) => {
    try {
      setSaving(true);

      const created = await createNotificationPlace({
        notificationPlaceName: value.name,
        address: value.address,
        latitude: value.lat,
        longitude: value.lng,
        startTime: value.startTime,
        endTime: value.endTime,
        reason: value.reason,
      });

      if (created?.notificationPlaceId !== undefined) {
        try {
          const storedPlaces = await loadNotificationPlaces();
          await saveNotificationPlaces([
            ...storedPlaces.filter(
              (place) => place.notificationPlaceId !== created.notificationPlaceId,
            ),
            created,
          ]);
        } catch (error) {
          console.error('[recommended-alarm] notification place local sync failed', error);
        }
      }

      onSaved();
    } catch (error) {
      console.error('[recommended-alarm] notification place save failed', error);
      Alert.alert('위치 알림 저장에 실패했어요', error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return { saveAlarm, saving };
}
