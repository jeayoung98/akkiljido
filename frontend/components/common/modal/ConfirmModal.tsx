import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common/button/Button';
import Colors from '@/constants/Colors';

export type ConfirmModalProps = {
  /** Modal의 표시 여부는 사용하는 화면에서 관리합니다. */
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 삭제처럼 주의가 필요한 작업이면 확인 버튼을 위험 색상으로 표시합니다. */
  destructive?: boolean;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  /** 중요한 작업에서 배경 터치로 닫히는 동작을 막을 수 있습니다. */
  dismissOnBackdropPress?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** 삭제·로그아웃처럼 사용자의 확인이 필요한 작업에 사용하는 공통 모달입니다. */
export function ConfirmModal({
  visible,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  destructive = false,
  confirmDisabled = false,
  confirmLoading = false,
  dismissOnBackdropPress = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // 처리 중에는 취소 버튼과 Android 뒤로가기로 Modal이 닫히지 않도록 방지합니다.
  const handleCancel = () => {
    if (!confirmLoading) onCancel();
  };

  // 배경 터치 허용 여부와 처리 상태를 함께 확인합니다.
  const handleBackdropPress = () => {
    if (dismissOnBackdropPress) handleCancel();
  };

  return (
    <Modal
      animationType="fade"
      // Android 하드웨어 뒤로가기는 취소 동작과 동일하게 처리합니다.
      onRequestClose={handleCancel}
      // 상태바 영역까지 딤 배경이 이어지도록 Android Modal을 투명하게 확장합니다.
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.overlay}>
        {/* 카드 바깥 영역만 닫기 동작을 받도록 배경 터치 영역을 분리합니다. */}
        <Pressable
          accessibilityLabel="모달 닫기"
          accessibilityRole="button"
          onPress={handleBackdropPress}
          style={StyleSheet.absoluteFill}
        />

        <View accessibilityViewIsModal style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}

          <View style={styles.actions}>
            {/* 확인 처리 중에는 취소 버튼도 잠가 요청 상태가 중간에 바뀌지 않게 합니다. */}
            <Button
              disabled={confirmLoading}
              onPress={handleCancel}
              style={styles.actionButton}
              variant="white">
              {cancelLabel}
            </Button>
            {/* 위험 작업과 일반 작업은 기존 공통 Button의 variant로 구분합니다. */}
            <Button
              disabled={confirmDisabled}
              loading={confirmLoading}
              onPress={onConfirm}
              style={styles.actionButton}
              variant={destructive ? 'red' : 'green'}>
              {confirmLabel}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
  },
  card: {
    width: '100%',
    maxWidth: 326,
    paddingTop: 26,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderRadius: 24,
    backgroundColor: Colors.light.cardBackground,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  title: {
    color: Colors.light.cardTitle,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    color: Colors.light.cardDescription,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
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
