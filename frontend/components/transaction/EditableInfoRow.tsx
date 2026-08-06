import type { ReactNode } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  View,
  ViewStyle,
} from 'react-native';

import { IconButton } from '@/components/common/button/IconButton';
import Colors from '@/constants/Colors';

type EditableInfoRowProps = {
  label: string;
  value: string;
  placeholder?: string;
  /** 전달하면 값 영역 대신 행 전체가 버튼이 됩니다(일자·장소·카테고리처럼 다른 화면/팝업을 여는 항목). */
  onPress?: () => void;
  /** 일자의 달력, 장소의 핀, 카테고리의 화살표처럼 행 오른쪽 끝에 붙는 안내 아이콘입니다. */
  trailingIcon?: ReactNode;
  /** true면 값 영역이 바로 입력 가능한 텍스트창이 됩니다(결제 수단·메모). */
  editable?: boolean;
  onChangeText?: (text: string) => void;
  /** 전달하면 값 오른쪽에 지우기(×) 버튼이 붙습니다. */
  onClear?: () => void;
  /**
   * true면 이 항목을 잠급니다. 눌러도 아무 반응이 없고, 입력창은 타이핑이 막히며,
   * 지우기 버튼·안내 아이콘도 숨겨서 "지금은 건드릴 수 없는 항목"임이 보이게 합니다.
   * (소득 거래의 장소·카테고리·결제 수단처럼 해당 없는 항목에 사용합니다.)
   */
  disabled?: boolean;
  /** 잠겼을 때 값 대신 보여줄 짧은 안내 문구입니다(예: '소득은 해당 없음'). */
  disabledText?: string;
  showDivider?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * 거래 수정 화면의 정보 카드에서 쓰는 한 줄짜리 항목입니다. 기존 InfoRow(읽기 전용)와
 * 같은 라벨·값 배치를 쓰지만, 행 전체를 누르는 팝업형 항목과 바로 타이핑하는 입력형 항목을
 * 함께 지원합니다. InfoRow 자체는 다른 화면에서도 쓰이고 있어 손대지 않고 별도로 만들었습니다.
 */
export function EditableInfoRow({
  label,
  value,
  placeholder,
  onPress,
  trailingIcon,
  editable = false,
  onChangeText,
  onClear,
  disabled = false,
  disabledText,
  showDivider = true,
  style,
}: EditableInfoRowProps) {
  // 잠긴 항목은 값을 바꿀 수 없으므로 입력창 대신 안내 문구(또는 기존 값)를 흐리게만 보여줍니다.
  const isEditable = editable && !disabled;
  const displayText = disabled ? (disabledText ?? value) : value;

  const content = (
    <>
      <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>
      <View style={styles.valueArea}>
        {isEditable ? (
          <NativeTextInput
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={Colors.light.placeholder}
            style={styles.input}
            value={value}
          />
        ) : (
          <Text
            numberOfLines={1}
            style={[
              styles.value,
              !displayText && styles.placeholderText,
              disabled && styles.disabledText,
            ]}>
            {displayText || placeholder}
          </Text>
        )}
        {/* 잠긴 항목은 누를 수 없으니, 누를 수 있다는 신호인 아이콘·지우기 버튼을 함께 숨깁니다. */}
        {!disabled ? trailingIcon : null}
        {!disabled && onClear ? (
          <IconButton color={Colors.light.placeholder} name="close" onPress={onClear} size={16} />
        ) : null}
      </View>
    </>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.row, showDivider && styles.divider, style]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityState={{ disabled }}
      style={[styles.row, showDivider && styles.divider, disabled && styles.disabledRow, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // 읽기 전용 InfoRow와 동일한 안쪽 여백을 적용합니다.
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  label: {
    // 수정 화면에서도 기준명과 입력값 사이의 간격을 동일하게 유지합니다.
    width: 72,
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  valueArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  value: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  placeholderText: {
    color: Colors.light.placeholder,
    fontWeight: '400',
  },
  // 잠긴 항목은 배경을 옅게 깔고 글자를 흐리게 해서 "입력 대상이 아님"을 한눈에 보이게 합니다.
  disabledRow: {
    backgroundColor: Colors.light.cardMutedBackground,
  },
  disabledText: {
    color: Colors.light.placeholder,
    fontWeight: '400',
  },
  input: {
    flex: 1,
    padding: 0,
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
});
