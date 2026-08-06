import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import { MapInput } from '@/components/common/input/MapInput';
import { TimeInput } from '@/components/common/input/TimeInput';
import Colors from '@/constants/Colors';
import { useMapPickerStore } from '@/store/mapPickerStore';

type FieldInputProps = Pick<TextInputProps, 'inputMode' | 'maxLength'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  errorMessage?: string;
  containerStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
};

// TimeInput은 입력 중 "12:0"처럼 완성 전 상태도 허용합니다.
// 저장 시점에는 정확히 HH:mm 형식인지 별도로 검사해 잘못된 시간대가 API까지 전달되지 않게 합니다.
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTime(value: string) {
  return TIME_PATTERN.test(value);
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

// 알림 시간과 항상 같은 높이를 유지해야 해서(여러 줄로 늘어나면 둘의 높이가 어긋난다),
// 한 줄로만 입력받고 내용이 길어지면 옆으로 계속 입력되도록 합니다(스크롤은 TextInput 기본 동작).
/** 알림 장소(MapInput)와 같은 카드 형태로, 제목이 값과 같은 칸 안에 들어가는 한 줄 입력 필드입니다. */
function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  errorMessage,
  containerStyle,
  valueStyle,
  ...inputProps
}: FieldInputProps) {
  const hasError = Boolean(errorMessage);

  return (
    <View style={containerStyle}>
      <View style={[styles.fieldBox, hasError && styles.fieldBoxError]}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          {...inputProps}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.placeholder}
          style={[styles.fieldValue, valueStyle]}
          value={value}
        />
      </View>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

/** 추천 알림과 직접 추가 알림이 공통으로 사용하는 저장 폼 값입니다. */
export type AlarmFormValue = {
  name: string;
  placeId?: number;
  placeName: string;
  // 지도 검색과 실제로 이어지는 값은 이름이 아니라 이 주소·좌표다. MapInput도 이 값을 보여준다.
  address: string;
  lat: number;
  lng: number;
  startTime: string;
  endTime: string;
  reason: string;
};

export type SaveAlarmModalProps = {
  visible: boolean;
  initialValue: AlarmFormValue;
  onClose: () => void;
  /** 지도 선택 화면에서 돌아와 장소를 반영한 뒤 모달을 다시 열 때 호출합니다. */
  onReopenAfterLocationPicked?: () => void;
  onSave: (value: AlarmFormValue) => void;
  saveLoading?: boolean;
  /** AI 추천이 아니라 직접 추가하는 흐름 등에서 문구를 바꿔야 할 때 씁니다. */
  title?: string;
  description?: string;
};

/** AI 추천값을 확인하고 수정한 뒤 저장 요청값으로 전달하는 알림 추가 모달입니다. */
export function SaveAlarmModal({
  visible,
  initialValue,
  onClose,
  onReopenAfterLocationPicked,
  onSave,
  saveLoading = false,
  title = '추천 위치 알림 추가',
  description = 'AI 추천 내용을 수정한 뒤 저장할 수 있어요.',
}: SaveAlarmModalProps) {
  const router = useRouter();
  // map-picker 화면이 위치를 고르고 나면 이 store에 결과를 담아둔다. 모달과 map-picker는
  // 서로 다른 화면(스택)이라 props로 값을 주고받을 수 없어서, 전역 store를 다리로 사용한다.
  const pickedLocation = useMapPickerStore((state) => state.pickedLocation);
  const clearPickedLocation = useMapPickerStore((state) => state.clearPickedLocation);
  const setInitialLocation = useMapPickerStore((state) => state.setInitialLocation);

  // 이 모달 안에서만 쓰는 임시 입력 상태. "알림 저장"을 눌러야만 onSave로 부모에 전달된다.
  const [form, setForm] = useState(initialValue);
  const [showErrors, setShowErrors] = useState(false);
  // 장소 선택을 위해 지도 화면으로 이동했다가 돌아온 경우, 그동안 입력한 값을 초기화하지 않기 위한 플래그입니다.
  const isReturningFromMapRef = useRef(false);

  const updateField = <K extends keyof AlarmFormValue>(
    field: K,
    value: AlarmFormValue[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  // 추천 항목을 다시 열 때 이전 수정값이 아닌 새 추천값으로 입력 상태를 초기화합니다.
  useEffect(() => {
    if (visible) {
      if (isReturningFromMapRef.current) {
        isReturningFromMapRef.current = false;
        return;
      }
      setForm(initialValue);
      setShowErrors(false);
    }
  }, [initialValue, visible]);

  const isFocused = useIsFocused();

  // 지도 화면에서 장소를 선택하고 돌아오면 store에 담긴 값을 읽어 알림 장소에 반영합니다.
  // pickedLocation은 map-picker가 router.back()으로 돌아오기도 전에(아직 지도 화면일 때) 먼저 바뀌기
  // 때문에, 값 변경 자체가 아니라 "이 화면이 실제로 다시 포커스를 받은 뒤"에 반영해야 한다.
  // useFocusEffect(useCallback(...))는 effect 참조가 바뀔 때마다(=pickedLocation이 바뀔 때마다)
  // 내부적으로 즉시 한 번 더 호출되는 구현이라, 실제 focus 이벤트를 기다리지 않고 화면 전환 중
  // 애매한 시점에 먼저 실행돼버릴 수 있었다(그러면 아직 안 열린 상태로 소비되고 끝나버린다).
  // 대신 isFocused를 일반 상태값으로 구독해서, pickedLocation과 isFocused가 "둘 다" 갖춰진
  // 시점에만 정확히 한 번 반영되게 한다 — 둘 중 어느 쪽이 먼저 바뀌어도 안전하다.
  useEffect(() => {
    if (isFocused && isReturningFromMapRef.current && pickedLocation) {
      // 지도 화면으로 이동하기 위해 모달을 닫았던 경우에만 장소를 반영하고 다시 엽니다.
      // 일반적인 MapInput 사용 결과를 이 모달이 가로채지 않도록 반환 플래그를 함께 확인합니다.
      updateField('address', pickedLocation.address);
      updateField('lat', pickedLocation.lat);
      updateField('lng', pickedLocation.lng);
      clearPickedLocation();
      onReopenAfterLocationPicked?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, pickedLocation]);

  const isNameEmpty = !form.name.trim();
  const isPlaceEmpty = !form.address.trim();
  const isStartTimeEmpty = !form.startTime.trim();
  const isEndTimeEmpty = !form.endTime.trim();
  const hasValidStartTime = isValidTime(form.startTime);
  const hasValidEndTime = isValidTime(form.endTime);
  const hasSameTimeRange = hasValidStartTime && hasValidEndTime && form.startTime === form.endTime;
  // 시작 시간이 더 늦으면 오류가 아니라 자정을 넘기는 알림으로 해석합니다.
  const isOvernightAlarm = hasValidStartTime && hasValidEndTime && toMinutes(form.startTime) > toMinutes(form.endTime);
  const startTimeError = isStartTimeEmpty
    ? '시작 시간을 입력해 주세요.'
    : !hasValidStartTime
      ? 'HH:mm 형식으로 입력해 주세요.'
      : undefined;
  const endTimeError = isEndTimeEmpty
    ? '끝 시간을 입력해 주세요.'
    : !hasValidEndTime
      ? 'HH:mm 형식으로 입력해 주세요.'
      : undefined;
  // 알림 추가 이유는 AI 설명용 선택 항목이며 이름·장소·시간만 필수로 검사합니다.
  const hasError = isNameEmpty || isPlaceEmpty || Boolean(startTimeError) || Boolean(endTimeError) || hasSameTimeRange;
  // 시간 안내는 두 입력칸 아래 한 곳에만 표시해, 시작·끝 시간 박스의 높이를 항상 같게 유지합니다.
  const timeMessage = showErrors
    ? startTimeError ?? endTimeError ?? (hasSameTimeRange ? '시작 시간과 끝 시간은 다르게 설정해 주세요.' : undefined)
    : isOvernightAlarm
      ? '다음 날까지 이어지는 알림이에요.'
      : undefined;
  const isTimeMessageError = showErrors && Boolean(startTimeError || endTimeError || hasSameTimeRange);

  const handleSave = () => {
    if (hasError) {
      setShowErrors(true);
      return;
    }

    // 화면에서 수정한 값을 정리해 API 호출을 담당하는 부모 화면으로 전달합니다.
    onSave({
      ...form,
      name: form.name.trim(),
      placeName: form.placeName.trim(),
      address: form.address.trim(),
      startTime: form.startTime.trim(),
      endTime: form.endTime.trim(),
      reason: form.reason.trim(),
    });
  };

  const handleClose = () => {
    if (!saveLoading) onClose();
  };

  // MapInput의 "지도에서 검색" 버튼을 눌렀을 때 실행된다.
  // 모달을 그대로 띄운 채 map-picker로 이동하면 모달 오버레이가 지도 화면 위에 그대로 겹쳐 보이므로,
  // 먼저 닫고(onClose) 나서 화면을 전환한다. 이후 map-picker에서 선택한 값은
  // useMapPickerStore를 거쳐 위쪽의 pickedLocation effect가 받아 다시 모달을 연다.
  const handleSelectLocation = () => {
    // 지도 화면에서 돌아왔을 때 이 모달을 다시 열고, 그때까지의 입력값을 초기화하지 않도록 표시해둡니다.
    isReturningFromMapRef.current = true;
    // 지금 갖고 있는 주소(추천 장소 또는 이전에 고른 장소)를 map-picker에 미리 알려줘서,
    // 화면이 뜨자마자 그 위치에 핀이 중앙에 오도록 한다.
    if (form.address.trim()) {
      setInitialLocation({ address: form.address, lat: form.lat, lng: form.lng });
    }
    onClose();
    router.push('/map-picker');
  };

  return (
    <Modal
      animationType="fade"
      // Android 기기의 물리/제스처 뒤로가기를 눌렀을 때도 모달이 자연스럽게 닫히도록 처리한다(iOS는 해당 없음).
      onRequestClose={handleClose}
      // Android에서 상태 표시줄 영역까지 반투명 오버레이가 이어지도록 한다.
      statusBarTranslucent
      transparent
      visible={visible}>
      <KeyboardAvoidingView
        // iOS는 padding, Android는 height로 처리해야 키보드가 올라올 때 레이아웃이 깨지지 않는다.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardArea}>
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel="추천 알림 모달 닫기"
            accessibilityRole="button"
            onPress={handleClose}
            style={StyleSheet.absoluteFill}
          />

          <View accessibilityViewIsModal style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerTextArea}>
                <Text accessibilityRole="header" style={styles.title}>
                  {title}
                </Text>
                <Text style={styles.description}>{description}</Text>
              </View>
              <IconButton
                color={Colors.light.placeholder}
                disabled={saveLoading}
                name="close"
                onPress={handleClose}
              />
            </View>

            {/* 작은 화면과 키보드 환경에서도 모든 입력 항목에 접근할 수 있게 내부만 스크롤합니다. */}
            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}>
              <FieldInput
                errorMessage={showErrors && isNameEmpty ? '알림 이름을 입력해 주세요.' : undefined}
                label="알림 이름"
                onChangeText={(value) => updateField('name', value)}
                placeholder="알림 이름 입력"
                value={form.name}
              />

              {/* 알림 장소는 직접 타이핑하지 않고 지도에서 골라야 하므로 텍스트 입력 대신 MapInput을 쓴다. */}
              <View>
                <MapInput
                  label="알림 장소"
                  onPress={handleSelectLocation}
                  style={showErrors && isPlaceEmpty ? styles.mapInputError : undefined}
                  value={form.address || undefined}
                />
                {showErrors && isPlaceEmpty ? (
                  <Text style={styles.errorText}>알림 장소를 선택해 주세요.</Text>
                ) : null}
              </View>

              {/* 알림 시작·끝 시간은 항상 같은 세로 높이를 유지해야 해서 나란히 한 줄에 배치한다. */}
              <View style={styles.row}>
                <View style={[styles.fieldBox, styles.timeField, showErrors && Boolean(startTimeError) && styles.fieldBoxError]}>
                  <Text style={styles.fieldLabel}>알림 시작 시간</Text>
                  <TimeInput
                    containerStyle={styles.timeInputContainer}
                    inputStyle={styles.timeInputValue}
                    onChangeText={(value) => updateField('startTime', value)}
                    placeholder="18:30"
                    value={form.startTime}
                  />
                </View>

                <View style={[styles.fieldBox, styles.timeField, showErrors && Boolean(endTimeError) && styles.fieldBoxError]}>
                  <Text style={styles.fieldLabel}>알림 끝 시간</Text>
                  <TimeInput
                    containerStyle={styles.timeInputContainer}
                    inputStyle={styles.timeInputValue}
                    onChangeText={(value) => updateField('endTime', value)}
                    placeholder="19:30"
                    value={form.endTime}
                  />
                </View>
              </View>

              {timeMessage ? (
                <Text style={[styles.timeMessage, isTimeMessageError && styles.timeMessageError]}>
                  {timeMessage}
                </Text>
              ) : null}

              <FieldInput
                label="알림 추가 이유"
                onChangeText={(value) => updateField('reason', value)}
                placeholder="AI 추천 이유"
                value={form.reason}
              />
            </ScrollView>

            <Button loading={saveLoading} onPress={handleSave} style={styles.saveButton}>
              알림 저장
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    padding: 24,
    borderRadius: 28,
    backgroundColor: Colors.light.cardBackground,
    elevation: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTextArea: {
    flex: 1,
  },
  title: {
    color: Colors.light.cardTitle,
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 29,
  },
  description: {
    marginTop: 4,
    color: Colors.light.cardDescription,
    fontSize: 13,
    lineHeight: 19,
  },
  form: {
    gap: 14,
    paddingTop: 20,
    paddingBottom: 4,
  },
  mapInputError: {
    borderWidth: 1,
    borderColor: Colors.light.danger,
  },
  errorText: {
    minHeight: 20,
    marginTop: 4,
    color: Colors.light.danger,
    fontSize: 12,
  },
  timeMessage: {
    marginTop: -6,
    color: Colors.light.cardAccent,
    fontSize: 12,
    lineHeight: 18,
  },
  timeMessageError: {
    color: Colors.light.danger,
  },
  fieldBox: {
    backgroundColor: `${Colors.light.primary}1A`,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  fieldBoxError: {
    borderWidth: 1,
    borderColor: Colors.light.danger,
  },
  fieldLabel: {
    // MapInput의 라벨과 동일한 크기로 맞춰 모달 안 모든 항목의 위계가 같게 보이도록 합니다.
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  fieldValue: {
    width: '100%',
    padding: 0,
    color: Colors.light.text,
    fontSize: 14,
  },
  // TimeInput은 기본적으로 자기 배경(연한 초록 필드)을 갖고 있는데, 여기선 fieldBox 안에 이미
  // 같은 톤의 배경이 있어서 이중 박스로 보이지 않게 투명하게 덮어쓴다.
  timeInputContainer: {
    // 기본 TextInput의 width: '100%'를 덮어써서, 시간 입력 영역 자체를 필드 중앙에 둡니다.
    width: 100,
    alignSelf: 'center',
  },
  timeInputValue: {
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    minHeight: 0,
    color: Colors.light.text,
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timeField: {
    flex: 1,
    // 시간 필드는 라벨과 HH:mm 값을 모두 가운데에 배치해 좁은 두 칸의 균형을 맞춥니다.
    alignItems: 'center',
  },
  saveButton: {
    height: 56,
    // 폼(ScrollView) 마지막 항목과의 간격을 다른 필드 사이 간격(form.gap)만큼 확실히 띄운다.
    marginTop: 20,
    borderRadius: 16,
  },
});
