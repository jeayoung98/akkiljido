import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/common/button/Button';
import { CentralModal } from '@/components/common/modal/CentralModal';
import Colors from '@/constants/Colors';

const MAX_LENGTH = 20;

export type NicknameEditModalProps = {
  visible: boolean;
  nickname: string;
  onCancel: () => void;
  onSave: (nickname: string) => void;
};

/** 마이페이지에서 닉네임만 간단히 고칠 수 있는 모달입니다. */
export function NicknameEditModal({ visible, nickname, onCancel, onSave }: NicknameEditModalProps) {
  const [value, setValue] = useState(nickname);

  // 모달을 열 때마다 현재 닉네임으로 입력값을 다시 맞춘다.
  useEffect(() => {
    if (visible) setValue(nickname);
  }, [visible, nickname]);

  const isValid = value.trim().length > 0;

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <CentralModal visible={visible} onClose={onCancel}>
      <View style={styles.card}>
        <Text style={styles.title}>닉네임 수정</Text>

        <View style={styles.inputArea}>
          <TextInput
            accessibilityLabel="닉네임"
            autoFocus
            maxLength={MAX_LENGTH}
            onChangeText={setValue}
            onSubmitEditing={handleSave}
            placeholder="닉네임을 입력해주세요"
            placeholderTextColor={Colors.light.placeholder}
            returnKeyType="done"
            style={styles.input}
            value={value}
          />
          <Text style={styles.counter}>
            {value.length}/{MAX_LENGTH}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button onPress={onCancel} style={styles.actionButton} variant="white">
            취소
          </Button>
          <Button disabled={!isValid} onPress={handleSave} style={styles.actionButton} variant="green">
            저장
          </Button>
        </View>
      </View>
    </CentralModal>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 26,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    color: Colors.light.cardTitle,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
  inputArea: {
    marginTop: 20,
  },
  input: {
    borderBottomColor: Colors.light.primary,
    borderBottomWidth: 2,
    color: Colors.light.cardTitle,
    fontSize: 20,
    fontWeight: '700',
    paddingBottom: 8,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  counter: {
    marginTop: 6,
    color: Colors.light.textSecondary,
    fontSize: 12,
    textAlign: 'right',
  },
  actions: {
    marginTop: 22,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
  },
});
