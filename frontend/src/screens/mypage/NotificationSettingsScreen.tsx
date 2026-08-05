import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import InfoListItem from '@/components/common/card/InfoListItem';
import { AppHeader } from '@/components/common/header/AppHeader';
import { ConfirmModal } from '@/components/common/modal/ConfirmModal';
import { SaveAlarmModal, type AlarmFormValue } from '@/components/common/modal/SaveAlarmModal';
import { AddCircleButton } from '@/components/my/AddCircleButton';
import { KebabMenu } from '@/components/my/KebabMenu';
import { Switch } from '@/components/my/Switch';
import Colors from '@/constants/Colors';
import { MOCK_NOTIFICATION_PLACES, type NotificationPlace } from '@/mocks/notifications';

// "+" 버튼을 누르면 이 빈 값으로 SaveAlarmModal을 연다. 지도에서 장소를 고르기 전까지는
// placeName·좌표가 비어 있어서, 모달의 필수값 검사가 저장을 막아준다.
const EMPTY_ALARM_FORM: AlarmFormValue = {
  name: '',
  placeName: '',
  startTime: '',
  endTime: '',
  reason: '',
};

function toAlarmFormValue(place: NotificationPlace): AlarmFormValue {
  return {
    name: place.notificationPlaceName,
    placeName: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    startTime: place.startTime,
    endTime: place.endTime,
    reason: place.reason,
  };
}

/**
 * 마이페이지 > 알림 설정 화면입니다. 소비 리포트(주간/월간) 알림과, 등록한 위치 알림 목록을 보여줍니다.
 * 위치 알림은 추가·수정 모두 SaveAlarmModal을 사용하며, 저장한 값은 목업 목록에 즉시 반영합니다.
 */
export default function NotificationSettingsScreen() {
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [monthlyReport, setMonthlyReport] = useState(true);
  const [places, setPlaces] = useState<NotificationPlace[]>(MOCK_NOTIFICATION_PLACES);
  const [deleteTarget, setDeleteTarget] = useState<NotificationPlace | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<NotificationPlace | null>(null);
  // 지도 선택을 위해 모달을 잠시 닫을 때 수정 대상을 기억해 두었다가, 돌아오면 같은 수정 모드로 다시 엽니다.
  const pendingEditTargetRef = useRef<NotificationPlace | null>(null);

  const handleTogglePlace = (id: number, next: boolean) => {
    setPlaces((prev) => prev.map((place) => (place.notificationPlaceId === id ? { ...place, active: next } : place)));
  };

  const handleAddPlace = () => {
    pendingEditTargetRef.current = null;
    setEditTarget(null);
    setAddModalVisible(true);
  };

  const handleSavePlace = (value: AlarmFormValue) => {
    if (editTarget) {
      // 수정 시에는 id와 토글 상태는 유지하고, 모달에서 편집한 정보만 같은 항목에 덮어씁니다.
      setPlaces((prev) =>
        prev.map((place) =>
          place.notificationPlaceId === editTarget.notificationPlaceId
            ? {
                ...place,
                notificationPlaceName: value.name,
                address: value.placeName,
                latitude: value.latitude ?? place.latitude,
                longitude: value.longitude ?? place.longitude,
                startTime: value.startTime,
                endTime: value.endTime,
                reason: value.reason,
              }
            : place,
        ),
      );
      setEditTarget(null);
      pendingEditTargetRef.current = null;
      return;
    }

    // 추가 시에는 화면에서만 사용할 다음 id를 만들어 목록 마지막에 넣습니다. API 연결 시 POST 요청으로 교체합니다.
    const nextId = places.reduce((max, place) => Math.max(max, place.notificationPlaceId), 0) + 1;
    setPlaces((prev) => [
      ...prev,
      {
        notificationPlaceId: nextId,
        notificationPlaceName: value.name,
        address: value.placeName,
        // 지도에서 장소를 골라야만 저장할 수 있어서(placeName 필수 검사) 이 시점엔 항상 값이 있다.
        latitude: value.latitude ?? 0,
        longitude: value.longitude ?? 0,
        startTime: value.startTime,
        endTime: value.endTime,
        reason: value.reason,
        active: true,
      },
    ]);
    setAddModalVisible(false);
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

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setPlaces((prev) => prev.filter((place) => place.notificationPlaceId !== deleteTarget.notificationPlaceId));
    setDeleteTarget(null);
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
              description="월-일 소비 · 매주 일요일 오전 7:00"
              title="주간 리포트"
              trailing={<Switch onValueChange={setWeeklyReport} value={weeklyReport} />}
            />
            <View style={styles.divider} />
            <InfoListItem
              description="1일-말일 소비 · 다음 달 1일 오전 7:00"
              title="월간 리포트"
              trailing={<Switch onValueChange={setMonthlyReport} value={monthlyReport} />}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>위치 알림</Text>
            <AddCircleButton accessibilityLabel="새 위치 알림 추가" onPress={handleAddPlace} style={styles.addPlaceButton} />
          </View>
          <Text style={styles.sectionDescription}>등록한 장소에 도착하면 설정한 시간에 알려드려요</Text>

          {/* 등록한 위치 알림이 하나도 없으면 + 버튼만 덩그러니 남지 않게 안내 문구를 보여준다. */}
          {places.length === 0 ? (
            <Text style={styles.emptyText}>아직 등록한 위치 알림이 없어요.</Text>
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
        description={deleteTarget ? `"${deleteTarget.notificationPlaceName}" 알림이 삭제됩니다.` : undefined}
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="알림 장소를 삭제할까요?"
        visible={deleteTarget != null}
      />

      <SaveAlarmModal
        description={editTarget ? '기존 위치 알림 정보를 수정한 뒤 저장할 수 있어요.' : '장소와 시간대를 정해서 새 위치 알림을 추가해요.'}
        initialValue={editTarget ? toAlarmFormValue(editTarget) : EMPTY_ALARM_FORM}
        onClose={handleCloseSaveModal}
        onReopenAfterLocationPicked={handleReopenAfterLocationPicked}
        onSave={handleSavePlace}
        title={editTarget ? '위치 알림 수정' : '위치 알림 추가'}
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
