import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import InfoListItem from '@/components/common/card/InfoListItem';
import { AppHeader } from '@/components/common/header/AppHeader';
import { ConfirmModal } from '@/components/common/modal/ConfirmModal';
import { AddCircleButton } from '@/components/my/AddCircleButton';
import { KebabMenu } from '@/components/my/KebabMenu';
import { Switch } from '@/components/my/Switch';
import Colors from '@/constants/Colors';
import { MOCK_NOTIFICATION_PLACES, type NotificationPlace } from '@/mocks/notifications';

/**
 * 마이페이지 > 알림 설정 화면입니다. 소비 리포트(주간/월간) 알림과, 등록한 위치 알림 목록을 보여줍니다.
 * 위치 알림 추가/수정 화면은 아직 없어서 각 버튼은 자리만 잡아뒀습니다.
 */
export default function NotificationSettingsScreen() {
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [monthlyReport, setMonthlyReport] = useState(true);
  const [places, setPlaces] = useState<NotificationPlace[]>(MOCK_NOTIFICATION_PLACES);
  const [deleteTarget, setDeleteTarget] = useState<NotificationPlace | null>(null);

  const handleTogglePlace = (id: number, next: boolean) => {
    setPlaces((prev) => prev.map((place) => (place.notificationPlaceId === id ? { ...place, active: next } : place)));
  };

  const handleAddPlace = () => {
    // TODO: 새 위치 알림 등록 화면 나오면 그쪽으로 이동
  };

  const handleEditPlace = (place: NotificationPlace) => {
    // TODO: 위치 알림 수정 화면 나오면 그쪽으로 이동
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
            <AddCircleButton accessibilityLabel="새 위치 알림 추가" onPress={handleAddPlace} />
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
