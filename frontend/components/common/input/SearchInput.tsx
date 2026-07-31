import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput as NativeTextInput,
  TextInputProps as NativeTextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import Colors from '@/constants/Colors';

export type SearchInputProps = Omit<NativeTextInputProps, 'style'> & {
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  // 전달하면 검색 아이콘도 눌러서 검색을 실행할 수 있다. 안 전달하면 기존처럼 장식용 아이콘으로 남는다.
  onSearchPress?: () => void;
};

/** iOS와 Android에서 동일한 삭제 버튼을 제공하는 공통 검색 입력창입니다. */
export function SearchInput({
  containerStyle,
  inputStyle,
  editable = true,
  placeholder = '검색어를 입력해 주세요',
  value,
  onChangeText,
  onSearchPress,
  ...props
}: SearchInputProps) {
  const hasValue = typeof value === 'string' && value.length > 0;

  const handleClear = () => onChangeText?.('');

  const searchIcon = <Ionicons name="search" color={Colors.light.placeholder} size={22} />;

  return (
    <View style={[styles.container, !editable && styles.disabled, containerStyle]}>
      {onSearchPress ? (
        <Pressable accessibilityLabel="검색" accessibilityRole="button" hitSlop={8} onPress={onSearchPress}>
          {searchIcon}
        </Pressable>
      ) : (
        searchIcon
      )}

      <NativeTextInput
        {...props}
        clearButtonMode="never"
        editable={editable}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.placeholder}
        returnKeyType="search"
        style={[styles.input, inputStyle]}
        value={value}
      />

      {/* iOS 전용 clearButtonMode 대신 직접 렌더링해 Android에서도 동일하게 동작합니다. */}
      {editable && hasValue ? (
        <Pressable
          accessibilityLabel="검색어 지우기"
          accessibilityRole="button"
          hitSlop={10}
          onPress={handleClear}
          style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
          <Ionicons name="close-circle" color={Colors.light.placeholder} size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%', minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, borderRadius: 999, backgroundColor: Colors.light.inputBackground,
  },
  input: { flex: 1, paddingVertical: 0, color: Colors.light.text, fontSize: 16 },
  clearButton: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  disabled: { backgroundColor: Colors.light.disabled, opacity: 0.7 },
});
