import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import { TextInput } from '@/components/common/input/TextInput';
import Colors from '@/constants/Colors';

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
  const [form, setForm] = useState(initialValue);
  const [showErrors, setShowErrors] = useState(false);

  // 추천 항목을 다시 열 때 이전 수정값이 아닌 새 추천값으로 입력 상태를 초기화합니다.
  useEffect(() => {
    if (visible) {
      setForm(initialValue);
      setShowErrors(false);
    }
  }, [initialValue, visible]);

  const updateField = <K extends keyof AlarmRecommendation>(
    field: K,
    value: AlarmRecommendation[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

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
      onRequestClose={handleClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <KeyboardAvoidingView
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
              <TextInput
                errorMessage={showErrors && isNameEmpty ? '알림 이름을 입력해 주세요.' : undefined}
                label="알림 이름"
                onChangeText={(value) => updateField('name', value)}
                placeholder="알림 이름 입력"
                value={form.name}
              />

              <TextInput
                errorMessage={showErrors && isPlaceEmpty ? '알림 장소를 입력해 주세요.' : undefined}
                label="알림 장소"
                onChangeText={(value) => updateField('placeName', value)}
                placeholder="알림 장소 입력"
                value={form.placeName}
              />

              <View style={styles.row}>
                <TextInput
                  containerStyle={styles.timeField}
                  errorMessage={showErrors && isTimeEmpty ? '시간을 입력해 주세요.' : undefined}
                  inputStyle={styles.timeInput}
                  inputMode="numeric"
                  label="알림 시간"
                  maxLength={5}
                  onChangeText={handleTimeChange}
                  placeholder="18:30"
                  value={form.time}
                />
                <TextInput
                  containerStyle={styles.reasonField}
                  label="알림 추가 이유"
                  multiline
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timeField: {
    width: 82,
  },
  timeInput: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  reasonField: {
    flex: 1,
  },
  saveButton: {
    height: 56,
    marginTop: 18,
    borderRadius: 16,
  },
});
