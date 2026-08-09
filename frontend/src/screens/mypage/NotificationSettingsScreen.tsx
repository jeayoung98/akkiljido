import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import AppScreen from '@/components/common/AppScreen';
import InfoListItem from '@/components/common/card/InfoListItem';
import { AppHeader } from '@/components/common/header/AppHeader';
import { ConfirmModal } from '@/components/common/modal/ConfirmModal';
import { SaveAlarmModal, type AlarmFormValue } from '@/components/common/modal/SaveAlarmModal';
import { AddCircleButton } from '@/components/my/AddCircleButton';
import { KebabMenu } from '@/components/my/KebabMenu';
import { Switch } from '@/components/my/Switch';
import Colors from '@/constants/Colors';
import {
  createNotificationPlace,
  deleteNotificationPlace,
  getNotificationPlaces,
  updateNotificationPlace,
  type NotificationPlace,
} from '@/src/api/notificationPlaceApi';
import { saveNotificationPlaces } from '@/utils/notificationPlaceStorage';
import { releaseNotificationClaimForToday } from '@/utils/notifiedPlacesStorage';
import { loadReportNotificationSettings, saveReportNotificationSettings } from '@/utils/reportNotificationSettingsStorage';

// "+" 버튼을 누르면 이 빈 값으로 SaveAlarmModal을 연다. 지도에서 장소를 고르기 전까지는
// address·좌표가 비어 있어서, 모달의 필수값 검사(address)가 저장을 막아준다.
const EMPTY_ALARM_FORM: AlarmFormValue = {
  name: '',
  placeName: '',
  address: '',
  lat: 0,
  lng: 0,
  startTime: '',
  endTime: '',
  reason: '',
};

function toAlarmFormValue(place: NotificationPlace): AlarmFormValue {
  return {
    name: place.notificationPlaceName,
    placeName: place.notificationPlaceName,
    address: place.address,
    lat: place.latitude,
    lng: place.longitude,
    startTime: place.startTime,
    endTime: place.endTime,
    reason: place.reason,
  };
}

/**
 * 마이페이지 > 알림 설정 화면입니다. 소비 리포트(주간/월간) 알림과, 등록한 방앗간 알림 목록을 보여줍니다.
 * 방앗간(위치 알림)은 추가·수정 모두 SaveAlarmModal을 사용하며, 저장한 값은 목업 목록에 즉시 반영합니다.
 */
export default function NotificationSettingsScreen() {
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [monthlyReport, setMonthlyReport] = useState(true);
  const [places, setPlaces] = useState<NotificationPlace[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<NotificationPlace | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<NotificationPlace | null>(null);
  const [saving, setSaving] = useState(false);
  // 지도 선택을 위해 모달을 잠시 닫을 때 수정 대상을 기억해 두었다가, 돌아오면 같은 수정 모드로 다시 엽니다.
  const pendingEditTargetRef = useRef<NotificationPlace | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getNotificationPlaces();
        console.info('[notification] list success', data);
        setPlaces(data);
        // API 목록을 로컬에도 복사해 헤드리스 위치 태스크가 같은 알림 장소를 판정하게 합니다.
        await saveNotificationPlaces(data);
      } catch (error) {
        console.error('[notification] list failed', error);
      }
    })();
  }, []);

  // 소비 리포트 알림 on/off는 서버 API가 아직 없어(필드 미정), 기기에 저장해둔 값을 불러온다.
  useEffect(() => {
    (async () => {
      const settings = await loadReportNotificationSettings();
      setWeeklyReport(settings.weeklyReport);
      setMonthlyReport(settings.monthlyReport);
    })();
  }, []);

  const handleToggleWeeklyReport = (next: boolean) => {
    setWeeklyReport(next);
    void saveReportNotificationSettings({ weeklyReport: next, monthlyReport });
  };

  const handleToggleMonthlyReport = (next: boolean) => {
    setMonthlyReport(next);
    void saveReportNotificationSettings({ weeklyReport, monthlyReport: next });
  };

  const handleTogglePlace = async (id: number, next: boolean) => {
    setPlaces((prev) => prev.map((place) => (place.notificationPlaceId === id ? { ...place, active: next } : place)));
    try {
      await updateNotificationPlace(id, { active: next });
      // API 저장이 성공한 경우에만 백그라운드 태스크가 읽는 로컬 목록도 맞춥니다.
      void saveNotificationPlaces(
        places.map((place) => (place.notificationPlaceId === id ? { ...place, active: next } : place)),
      );
    } catch (error) {
      console.error('[notification] toggle failed', error);
      // 실패하면 화면에 반영했던 토글을 원래 상태로 되돌립니다.
      setPlaces((prev) => prev.map((place) => (place.notificationPlaceId === id ? { ...place, active: !next } : place)));
      Alert.alert('알림 상태 변경에 실패했어요', error instanceof Error ? error.message : undefined);
    }
  };

  const handleAddPlace = () => {
    pendingEditTargetRef.current = null;
    setEditTarget(null);
    setAddModalVisible(true);
  };

  const handleSavePlace = async (value: AlarmFormValue) => {
    const input = {
      notificationPlaceName: value.name,
      address: value.address,
      latitude: value.lat,
      longitude: value.lng,
      startTime: value.startTime,
      endTime: value.endTime,
      reason: value.reason,
    };

    try {
      setSaving(true);

      if (editTarget) {
        const updated = await updateNotificationPlace(editTarget.notificationPlaceId, input);
        setPlaces((prev) =>
          prev.map((place) => (place.notificationPlaceId === editTarget.notificationPlaceId ? updated : place)),
        );
        void saveNotificationPlaces(
          places.map((place) => (place.notificationPlaceId === editTarget.notificationPlaceId ? updated : place)),
        );
        void releaseNotificationClaimForToday(editTarget.notificationPlaceId);
        setEditTarget(null);
        pendingEditTargetRef.current = null;
        return;
      }

      const created = await createNotificationPlace(input);
      setPlaces((prev) => [...prev, created]);
      void saveNotificationPlaces([...places, created]);
      setAddModalVisible(false);
    } catch (error) {
      console.error('[notification] save failed', error);
      Alert.alert('방앗간 저장에 실패했어요', error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleEditPlace = (place: NotificationPlace) => {
    // kebab 메뉴의 수정은 별도 화면으로 이동하지 않고, 기존 값이 채워진 저장 모달을 바로 엽니다.
    pendingEditTargetRef.current = null;
    setAddModalVisible(false);
    setEditTarget(place);
  };

  const handleCloseSaveModal = () => {
    // 지도 선택 과정에서는 SaveAlarmModal이 onClose 후 onReopenAfterLocationPicked를 호출하므로,
    // 여기서는 수정 대상을 ref에만 남기고 화면 state는 닫아 둡니다.
    pendingEditTargetRef.current = editTarget;
    setAddModalVisible(false);
    setEditTarget(null);
  };

  const handleReopenAfterLocationPicked = () => {
    if (pendingEditTargetRef.current) {
      setEditTarget(pendingEditTargetRef.current);
      return;
    }
    setAddModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteNotificationPlace(deleteTarget.notificationPlaceId);
      setPlaces((prev) => prev.filter((place) => place.notificationPlaceId !== deleteTarget.notificationPlaceId));
      void saveNotificationPlaces(places.filter((place) => place.notificationPlaceId !== deleteTarget.notificationPlaceId));
      void releaseNotificationClaimForToday(deleteTarget.notificationPlaceId);
      setDeleteTarget(null);
    } catch (error) {
      console.error('[notification] delete failed', error);
      Alert.alert('방앗간 삭제에 실패했어요', error instanceof Error ? error.message : undefined);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppScreen backgroundColor={Colors.light.background}>
      <AppHeader showBackButton title="알림 설정" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>소비 리포트 알림</Text>
          <Text style={styles.sectionDescription}>정해진 집계 기간이 끝나면 오전 7시에 알려드려요</Text>

          <View style={styles.card}>
            <InfoListItem
              description="월-일 소비 · 매주 월요일 오전 7:00"
              title="주간 리포트"
              trailing={<Switch onValueChange={handleToggleWeeklyReport} value={weeklyReport} />}
            />
            <View style={styles.divider} />
            <InfoListItem
              description="1일-말일 소비 · 다음 달 1일 오전 7:00"
              title="월간 리포트"
              trailing={<Switch onValueChange={handleToggleMonthlyReport} value={monthlyReport} />}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>방앗간 알림</Text>
            <AddCircleButton accessibilityLabel="새 방앗간 추가" onPress={handleAddPlace} style={styles.addPlaceButton} />
          </View>
          <Text style={styles.sectionDescription}>참새가 방앗간을 그냥 지나치랴 — 등록한 방앗간에 도착하면 알려드려요</Text>

          {/* 등록한 방앗간이 하나도 없으면 + 버튼만 덩그러니 남지 않게 안내 문구를 보여준다. */}
          {places.length === 0 ? (
            <Text style={styles.emptyText}>아직 등록한 방앗간이 없어요.</Text>
          ) : (
            <View style={styles.placeList}>
              {places.map((place) => (
                <View key={place.notificationPlaceId} style={styles.placeCard}>
                  <View style={styles.placeInfo}>
                    <View style={styles.timeRow}>
                      <Ionicons color={Colors.light.cardAccent} name="time-outline" size={12} />
                      <Text style={styles.timeText}>
                        {place.startTime}-{place.endTime}
                      </Text>
                      <Text style={styles.timeSeparator}>|</Text>
                      <Text numberOfLines={1} style={styles.addressText}>
                        {place.address}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.placeTitle}>
                      {place.notificationPlaceName}
                    </Text>
                    <Text numberOfLines={1} style={styles.placeDescription}>
                      {place.reason}
                    </Text>
                  </View>

                  <View style={styles.placeActions}>
                    <Switch
                      onValueChange={(next) => handleTogglePlace(place.notificationPlaceId, next)}
                      value={place.active}
                    />
                    <KebabMenu
                      accessibilityLabel={`${place.notificationPlaceName} 더보기`}
                      actions={[
                        { key: 'edit', label: '수정', onPress: () => handleEditPlace(place) },
                        {
                          destructive: true,
                          key: 'delete',
                          label: '삭제',
                          onPress: () => setDeleteTarget(place),
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        confirmLabel="삭제"
        confirmLoading={deleting}
        description={deleteTarget ? `"${deleteTarget.notificationPlaceName}" 알림이 삭제됩니다.` : undefined}
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="방앗간을 삭제할까요?"
        visible={deleteTarget != null}
      />

      <SaveAlarmModal
        description={editTarget ? '기존 방앗간 정보를 수정한 뒤 저장할 수 있어요.' : '장소와 시간대를 정해서 새 방앗간을 추가해요.'}
        initialValue={editTarget ? toAlarmFormValue(editTarget) : EMPTY_ALARM_FORM}
        onClose={handleCloseSaveModal}
        onReopenAfterLocationPicked={handleReopenAfterLocationPicked}
        onSave={handleSavePlace}
        saveLoading={saving}
        title={editTarget ? '방앗간 수정' : '방앗간 추가'}
        visible={addModalVisible || editTarget != null}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // 화면 오른쪽 끝에 딱 붙어 있으면 너무 멀어 보여서, 살짝 안쪽·아래로 옮긴다.
  addPlaceButton: {
    marginRight: 6,
    marginTop: 8,
  },
  sectionTitle: {
    color: Colors.light.cardTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionDescription: {
    marginTop: -8,
    color: Colors.light.cardDescription,
    fontSize: 12,
  },
  emptyText: {
    paddingVertical: 20,
    color: Colors.light.cardDescription,
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    backgroundColor: Colors.light.border,
  },
  placeList: {
    gap: 12,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  placeInfo: {
    flex: 1,
    minWidth: 0,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: Colors.light.cardAccent,
    fontSize: 12,
    fontWeight: '600',
  },
  timeSeparator: {
    color: Colors.light.border,
    fontSize: 12,
  },
  addressText: {
    flexShrink: 1,
    minWidth: 0,
    color: Colors.light.cardDescription,
    fontSize: 12,
  },
  placeTitle: {
    marginTop: 4,
    color: Colors.light.cardTitle,
    fontSize: 16,
    fontWeight: '700',
  },
  placeDescription: {
    marginTop: 2,
    color: Colors.light.cardDescription,
    fontSize: 13,
  },
  placeActions: {
    alignItems: 'center',
    gap: 8,
  },
});
