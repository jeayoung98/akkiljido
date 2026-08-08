import type { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '@/components/common/typography/Text';
import { NativeTextInput } from '@/components/common/typography/TextInput';

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
  showDivider = true,
  style,
}: EditableInfoRowProps) {
  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueArea}>
        {editable ? (
          <NativeTextInput
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={Colors.light.placeholder}
            style={styles.input}
            value={value}
          />
        ) : (
          <Text numberOfLines={1} style={[styles.value, !value && styles.placeholderText]}>
            {value || placeholder}
          </Text>
        )}
        {trailingIcon}
        {onClear ? (
          <IconButton color={Colors.light.placeholder} name="close" onPress={onClear} size={16} />
        ) : null}
      </View>
    </>
  );

  if (onPress) {
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

  return <View style={[styles.row, showDivider && styles.divider, style]}>{content}</View>;
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
  input: {
    flex: 1,
    padding: 0,
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
});
