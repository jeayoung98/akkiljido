import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import InfoListItem from '@/components/common/card/InfoListItem';
import { AppHeader } from '@/components/common/header/AppHeader';
import { ConfirmModal } from '@/components/common/modal/ConfirmModal';
import Colors from '@/constants/Colors';
import { toMyPlaceListResponse } from '@/mocks/transactions';

type MyPlace = ReturnType<typeof toMyPlaceListResponse>['data'][number];

// 이름에 "집"이 들어가면 집 아이콘, 그 외(직장/클라이언트사 등)는 건물 아이콘을 쓴다.
// 장소 종류가 늘어나면(예: 학교) 이 규칙을 더 다듬어야 할 수 있다.
function PlaceIcon({ name }: { name: string }) {
  const isHome = name.includes('집');
  return (
    <View style={styles.placeIcon}>
      <Ionicons name={isHome ? 'home' : 'business'} size={18} color={Colors.light.primary} />
    </View>
  );
}

export default function MyPlacesScreen() {
  const [places, setPlaces] = useState<MyPlace[]>(() => toMyPlaceListResponse().data);
  const [deleteTarget, setDeleteTarget] = useState<MyPlace | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) {
      return;
    }
    setPlaces((prev) => prev.filter((place) => place.placeId !== deleteTarget.placeId));
    setDeleteTarget(null);
  };

  return (
    <AppScreen scrollable backgroundColor={Colors.light.background}>
      <AppHeader showBackButton title="내 장소 관리" />

      <Text style={styles.hint}>장소를 탭하면 반경 2km 내의 소비를 볼 수 있어요</Text>

      <View style={styles.list}>
        {places.map((place, index) => (
          <View key={place.placeId}>
            <InfoListItem
              leading={<PlaceIcon name={place.myPlaceName} />}
              title={place.myPlaceName}
              description={place.address}
              trailing={
                <IconButton color={Colors.light.danger} name="delete" onPress={() => setDeleteTarget(place)} />
              }
            />
            {index < places.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>

      {/* 새 장소 설정 폼(바텀시트)은 아직 안 만듦 — 버튼만 우선 자리 잡아둠 */}
      <Button style={styles.addButton} variant="dashed" onPress={() => {}}>
        + 장소 추가
      </Button>

      <ConfirmModal
        confirmLabel="삭제"
        description="등록한 장소 정보가 삭제돼요."
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`'${deleteTarget?.myPlaceName}' 삭제할까요?`}
        visible={deleteTarget !== null}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginTop: 12,
    marginHorizontal: 20,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  list: {
    marginTop: 16,
    marginHorizontal: 16,
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
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.cardMutedBackground,
  },
  addButton: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
});
