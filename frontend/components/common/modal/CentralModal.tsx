import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';

export type CentralModalProps = {
  /** Modal의 표시 여부는 사용하는 화면에서 관리합니다. */
  visible: boolean;
  onClose: () => void;
  /** 배경(딤 처리 영역) 터치로 닫히는 동작을 막을 수 있습니다. 기본 true. */
  dismissOnBackdropPress?: boolean;
  /** 카드 자체의 스타일(최대 너비 등)을 화면마다 다르게 주고 싶을 때 씁니다. */
  cardStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * 화면 가운데 뜨는 모달 공통 틀입니다. Modal + 배경 딤 처리 + 둥근 카드 껍데기까지만 담당하고,
 * 카드 내부 레이아웃(패딩, 헤더 유무 등)은 children으로 넘겨준 화면이 알아서 구성합니다.
 * ConfirmModal, SaveAlarmModal 등 가운데 모달들이 각자 이 틀을 따로 만들던 걸 여기로 모았습니다.
 */
export function CentralModal({
  visible,
  onClose,
  dismissOnBackdropPress = true,
  cardStyle,
  children,
}: CentralModalProps) {
  const handleBackdropPress = () => {
    if (dismissOnBackdropPress) onClose();
  };

  return (
    <Modal
      animationType="fade"
      // Android 하드웨어 뒤로가기는 닫기 동작과 동일하게 처리합니다.
      onRequestClose={onClose}
      // 상태바 영역까지 딤 배경이 이어지도록 Android Modal을 투명하게 확장합니다.
      statusBarTranslucent
      transparent
      visible={visible}>
      {/* 닉네임 수정처럼 안에 TextInput이 있으면, 가운데 고정된 카드가 키보드에 가려질 수 있어서
          감싼다. 키보드가 없는 화면(리포트 모달 등)에서는 아무 효과가 없어 안전하다. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        {/* 카드 바깥 영역만 닫기 동작을 받도록 배경 터치 영역을 분리합니다. */}
        <Pressable
          accessibilityLabel="모달 닫기"
          accessibilityRole="button"
          onPress={handleBackdropPress}
          style={StyleSheet.absoluteFill}
        />

        {/* 그림자(shadowWrapper)와 모서리 클리핑(card)을 분리합니다.
            안드로이드에서 elevation과 overflow:hidden을 같은 View에 같이 주면 그림자가 같이 잘려버립니다. */}
        <View style={styles.shadowWrapper}>
          <View accessibilityViewIsModal style={[styles.card, cardStyle]}>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
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
  shadowWrapper: {
    width: '100%',
    maxWidth: 326,
    borderRadius: 24,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  card: {
    borderRadius: 24,
    backgroundColor: Colors.light.cardBackground,
    overflow: 'hidden',
  },
});
