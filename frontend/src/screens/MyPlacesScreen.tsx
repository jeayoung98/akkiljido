import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import BottomSheet from '@/components/common/BottomSheet';
import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import InfoListItem from '@/components/common/card/InfoListItem';
import { AppHeader } from '@/components/common/header/AppHeader';
import { MapInput } from '@/components/common/input/MapInput';
import { TextInput } from '@/components/common/input/TextInput';
import { ConfirmModal } from '@/components/common/modal/ConfirmModal';
import Colors from '@/constants/Colors';
import { toMyPlaceListResponse } from '@/mocks/transactions';
import { useMapPickerStore } from '@/store/mapPickerStore';

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

  const [isAddVisible, setIsAddVisible] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceAddress, setNewPlaceAddress] = useState('');
  const [newPlaceCoords, setNewPlaceCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const pickedLocation = useMapPickerStore((state) => state.pickedLocation);
  const clearPickedLocation = useMapPickerStore((state) => state.clearPickedLocation);
  const isReturningFromMapRef = useRef(false);

  // 지도에서 위치를 고르고 돌아오면 선택값을 폼 상태로 옮기고, 장소 추가 시트를 다시 띄운다.
  useEffect(() => {
    if (!pickedLocation) return;

    setNewPlaceAddress(pickedLocation.address);
    setNewPlaceCoords({ latitude: pickedLocation.lat, longitude: pickedLocation.lng });
    clearPickedLocation();
    if (isReturningFromMapRef.current) {
      setIsAddVisible(true);
      isReturningFromMapRef.current = false;
    }
  }, [clearPickedLocation, pickedLocation]);

  const isAddFormValid = Boolean(newPlaceName.trim() && newPlaceAddress && newPlaceCoords);

  const handleOpenMapPicker = () => {
    isReturningFromMapRef.current = true;
    setIsAddVisible(false);
    router.push('/map-picker');
  };

  const handleCloseAddSheet = () => {
    setIsAddVisible(false);
    setNewPlaceName('');
    setNewPlaceAddress('');
    setNewPlaceCoords(null);
  };

  const handleAddPlace = () => {
    if (!isAddFormValid || !newPlaceCoords) {
      return;
    }
    // TODO: 실제 장소 추가 API 연결. 지금은 화면 상태에만 반영한다.
    setPlaces((prev) => [
      ...prev,
      {
        placeId: Date.now(),
        myPlaceName: newPlaceName.trim(),
        address: newPlaceAddress,
        latitude: newPlaceCoords.latitude,
        longitude: newPlaceCoords.longitude,
        totalAmount: 0,
      },
    ]);
    setNewPlaceName('');
    setNewPlaceAddress('');
    setNewPlaceCoords(null);
    setIsAddVisible(false);
  };

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

      <Button style={styles.addButton} variant="dashed" onPress={() => setIsAddVisible(true)}>
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

      <BottomSheet
        draggable={false}
        initialHeight={0.48}
        maxHeight={0.48}
        minHeight={0.48}
        onClose={handleCloseAddSheet}
        visible={isAddVisible}>
        <View style={styles.addContent}>
          <View style={styles.dragHandle} />
          <Text style={styles.addTitle}>새 장소 설정</Text>
          <Text style={styles.addDescription}>소비를 보아볼 장소를 직접 설정해주세요</Text>

          <TextInput
            label="장소 이름"
            labelInside
            onChangeText={setNewPlaceName}
            placeholder="예) 집, 회사"
            value={newPlaceName}
          />
          <MapInput label="주소" onPress={handleOpenMapPicker} value={newPlaceAddress || undefined} />

          <Button disabled={!isAddFormValid} onPress={handleAddPlace} style={styles.addSubmitButton}>
            장소 추가
          </Button>
        </View>
      </BottomSheet>
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
  addContent: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.border,
  },
  addTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.cardTitle,
  },
  addDescription: {
    marginTop: -8,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  addSubmitButton: {
    marginTop: 'auto',
  },
});
