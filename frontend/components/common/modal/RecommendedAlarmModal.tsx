import { useRouter } from 'expo-router';
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

export type AlarmRecommendation = {
  name: string;
  placeId?: number;
  placeName: string;
  time: string;
  reason: string;
};

export type RecommendedAlarmModalProps = {
  visible: boolean;
  initialValue: AlarmRecommendation;
  onClose: () => void;
  onSave: (value: AlarmRecommendation) => void;
  saveLoading?: boolean;
};

/** AI 추천값을 확인하고 수정한 뒤 저장 요청값으로 전달하는 알림 추가 모달입니다. */
export function RecommendedAlarmModal({
  visible,
  initialValue,
  onClose,
  onSave,
  saveLoading = false,
}: RecommendedAlarmModalProps) {
  const router = useRouter();
  // map-picker 화면이 위치를 고르고 나면 이 store에 결과를 담아둔다. 모달과 map-picker는
  // 서로 다른 화면(스택)이라 props로 값을 주고받을 수 없어서, 전역 store를 다리로 사용한다.
  const pickedLocation = useMapPickerStore((state) => state.pickedLocation);
  const clearPickedLocation = useMapPickerStore((state) => state.clearPickedLocation);

  // 이 모달 안에서만 쓰는 임시 입력 상태. "알림 저장"을 눌러야만 onSave로 부모에 전달된다.
  const [form, setForm] = useState(initialValue);
  const [showErrors, setShowErrors] = useState(false);
  // 장소 선택을 위해 지도 화면으로 이동했다가 돌아온 경우, 그동안 입력한 값을 초기화하지 않기 위한 플래그입니다.
  const isReturningFromMapRef = useRef(false);

  const updateField = <K extends keyof AlarmRecommendation>(
    field: K,
    value: AlarmRecommendation[K],
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

  // 지도 화면에서 장소를 선택하고 돌아오면 store에 담긴 값을 읽어 알림 장소에 반영합니다.
  useEffect(() => {
    if (visible && pickedLocation) {
      updateField('placeName', pickedLocation.address);
      clearPickedLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, pickedLocation]);

  const isNameEmpty = !form.name.trim();
  const isPlaceEmpty = !form.placeName.trim();
  const isTimeEmpty = !form.time.trim();
  // 알림 추가 이유는 AI 설명용 선택 항목이며 이름·장소·시간만 필수로 검사합니다.
  const hasError = isNameEmpty || isPlaceEmpty || isTimeEmpty;

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
      time: form.time.trim(),
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
    onClose();
    router.push('/map-picker');
  };

  const handleTimeChange = (value: string) => {
    // 숫자만 유지하고 세 번째 숫자부터 HH:mm 형태로 구분자를 자동 적용합니다.
    const digits = value.replace(/\D/g, '').slice(0, 4);
    const formattedTime =
      digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;

    updateField('time', formattedTime);
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
                  추천 위치 알림 추가
                </Text>
                <Text style={styles.description}>AI 추천 내용을 수정한 뒤 저장할 수 있어요.</Text>
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
                  value={form.placeName || undefined}
                />
                {showErrors && isPlaceEmpty ? (
                  <Text style={styles.errorText}>알림 장소를 선택해 주세요.</Text>
                ) : null}
              </View>

              {/* 알림 시간·이유는 항상 같은 세로 높이를 유지해야 해서 나란히 한 줄에 배치한다. */}
              <View style={styles.row}>
                <FieldInput
                  containerStyle={styles.timeField}
                  errorMessage={showErrors && isTimeEmpty ? '시간을 입력해 주세요.' : undefined}
                  inputMode="numeric"
                  label="알림 시간"
                  maxLength={5}
                  onChangeText={handleTimeChange}
                  placeholder="18:30"
                  value={form.time}
                  valueStyle={styles.timeValue}
                />

                <FieldInput
                  containerStyle={styles.reasonField}
                  label="알림 추가 이유"
                  onChangeText={(value) => updateField('reason', value)}
                  placeholder="AI 추천 이유"
                  value={form.reason}
                />
              </View>
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
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  fieldValue: {
    width: '100%',
    padding: 0,
    color: Colors.light.text,
    fontSize: 14,
  },
  timeValue: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  reasonField: {
    flex: 1.6,
  },
  saveButton: {
    height: 56,
    marginTop: 18,
    borderRadius: 16,
  },
});
