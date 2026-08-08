import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';

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
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { createMyPlace, deleteMyPlace, getMyPlaces, updateMyPlace, type MyPlace } from '@/src/api/myPlaceApi';
import { useMapPickerStore } from '@/store/mapPickerStore';

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
  const [places, setPlaces] = useState<MyPlace[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<MyPlace | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isAddVisible, setIsAddVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<MyPlace | null>(null);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceAddress, setNewPlaceAddress] = useState('');
  const [newPlaceCoords, setNewPlaceCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const keyboardHeight = useKeyboardHeight();
  const pickedLocation = useMapPickerStore((state) => state.pickedLocation);
  const clearPickedLocation = useMapPickerStore((state) => state.clearPickedLocation);
  const isReturningFromMapRef = useRef(false);
  // 지도 선택을 위해 시트를 잠시 닫을 때 수정 대상을 기억해 두었다가, 돌아오면 같은 수정 모드로 다시 연다.
  const pendingEditTargetRef = useRef<MyPlace | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyPlaces();
        console.info('[my-places] list success', data);
        setPlaces(data);
      } catch (error) {
        console.error('[my-places] list failed', error);
      }
    })();
  }, []);

  // 지도에서 위치를 고르고 돌아온 경우에만 선택값을 폼 상태로 옮기고, 시트를 다시 띄운다.
  // (pickedLocation은 다른 화면의 지도 선택 흐름과 공유하는 전역 store라, 이 화면에서 연 게 아니면 건드리지 않는다.)
  useEffect(() => {
    if (!pickedLocation || !isReturningFromMapRef.current) return;

    setNewPlaceAddress(pickedLocation.address);
    setNewPlaceCoords({ latitude: pickedLocation.lat, longitude: pickedLocation.lng });
    clearPickedLocation();
    isReturningFromMapRef.current = false;

    if (pendingEditTargetRef.current) {
      setEditTarget(pendingEditTargetRef.current);
      pendingEditTargetRef.current = null;
      return;
    }
    setIsAddVisible(true);
  }, [clearPickedLocation, pickedLocation]);

  const isAddFormValid = Boolean(newPlaceName.trim() && newPlaceAddress && newPlaceCoords);

  const handleOpenMapPicker = () => {
    isReturningFromMapRef.current = true;
    pendingEditTargetRef.current = editTarget;
    setIsAddVisible(false);
    setEditTarget(null);
    router.push('/map-picker');
  };

  const handleOpenEdit = (place: MyPlace) => {
    pendingEditTargetRef.current = null;
    setNewPlaceName(place.myPlaceName);
    setNewPlaceAddress(place.address);
    setNewPlaceCoords({ latitude: place.latitude, longitude: place.longitude });
    setEditTarget(place);
  };

  const handleCloseSheet = () => {
    setIsAddVisible(false);
    setEditTarget(null);
    setNewPlaceName('');
    setNewPlaceAddress('');
    setNewPlaceCoords(null);
  };

  const handleSavePlace = async () => {
    if (!isAddFormValid || !newPlaceCoords) {
      return;
    }

    const input = {
      myPlaceName: newPlaceName.trim(),
      address: newPlaceAddress,
      latitude: newPlaceCoords.latitude,
      longitude: newPlaceCoords.longitude,
    };

    try {
      setSaving(true);

      if (editTarget) {
        const updated = await updateMyPlace(editTarget.placeId, input);
        setPlaces((prev) => prev.map((place) => (place.placeId === editTarget.placeId ? updated : place)));
        handleCloseSheet();
        return;
      }

      const created = await createMyPlace(input);
      setPlaces((prev) => [...prev, created]);
      handleCloseSheet();
    } catch (error) {
      console.error(editTarget ? '[my-places] update failed' : '[my-places] add failed', error);
      Alert.alert(
        editTarget ? '장소 수정에 실패했어요' : '장소 추가에 실패했어요',
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setDeleting(true);
      await deleteMyPlace(deleteTarget.placeId);
      setPlaces((prev) => prev.filter((place) => place.placeId !== deleteTarget.placeId));
      setDeleteTarget(null);
    } catch (error) {
      console.error('[my-places] delete failed', error);
      Alert.alert('장소 삭제에 실패했어요', error instanceof Error ? error.message : undefined);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppScreen scrollable backgroundColor={Colors.light.background}>
      <AppHeader showBackButton title="내 장소 관리" />

      <Text style={styles.hint}>장소를 탭하면 반경 2km 내의 소비를 볼 수 있어요</Text>

      <View style={styles.list}>
        {places.map((place, index) => (
          <View key={place.placeId}>
            <InfoListItem
              accessibilityLabel={`${place.myPlaceName} 수정`}
              leading={<PlaceIcon name={place.myPlaceName} />}
              onPress={() => handleOpenEdit(place)}
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

      <Button
        style={styles.addButton}
        variant="dashed"
        onPress={() => {
          setEditTarget(null);
          setIsAddVisible(true);
        }}>
        + 장소 추가
      </Button>

      <ConfirmModal
        confirmLabel="삭제"
        confirmLoading={deleting}
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
        onClose={handleCloseSheet}
        visible={isAddVisible || editTarget !== null}>
        {/* 높이 고정 시트라 키보드가 떠도 스스로 줄어들지 않아서, 아래쪽 버튼이 가려질 수 있다.
            키보드 높이만큼 스크롤 여백을 더해서, 가려진 만큼 위로 스크롤해 버튼까지 볼 수 있게 한다
            (useKeyboardHeight 문서 참고 — ListScreen.tsx의 "내역 추가" 시트와 같은 방식). */}
        <ScrollView
          contentContainerStyle={[styles.addContent, { paddingBottom: 20 + keyboardHeight }]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.dragHandle} />
          <Text style={styles.addTitle}>{editTarget ? '장소 수정' : '새 장소 설정'}</Text>
          <Text style={styles.addDescription}>소비를 보아볼 장소를 직접 설정해주세요</Text>

          <TextInput
            label="장소 이름"
            labelInside
            onChangeText={setNewPlaceName}
            placeholder="예) 집, 회사"
            value={newPlaceName}
          />
          <MapInput label="주소" onPress={handleOpenMapPicker} value={newPlaceAddress || undefined} />

          <Button
            disabled={!isAddFormValid}
            loading={saving}
            onPress={handleSavePlace}
            style={styles.addSubmitButton}>
            {editTarget ? '저장' : '장소 추가'}
          </Button>
        </ScrollView>
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
