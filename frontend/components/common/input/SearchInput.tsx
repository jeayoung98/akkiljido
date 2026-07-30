import { Ionicons } from '@expo/vector-icons';
import {
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
  /** 검색창 바깥 영역의 크기와 배치를 화면에서 조정할 때 사용합니다. */
  containerStyle?: StyleProp<ViewStyle>;
  /** 입력 글자의 정렬이나 크기만 추가로 조정할 때 사용합니다. */
  inputStyle?: StyleProp<TextStyle>;
};

/**
 * 장소·가게·카테고리 등의 검색어를 입력하는 공통 검색창입니다.
 * 검색어 상태, API 호출 및 검색 결과 처리는 사용하는 화면에서 담당합니다.
 * 필터 버튼은 SearchInput에 포함하지 않고 필요한 화면에서 별도로 배치합니다.
 */
export function SearchInput({
  containerStyle,
  inputStyle,
  editable = true,
  placeholder = '검색어를 입력해 주세요',
  ...props
}: SearchInputProps) {
  return (
    <View style={[styles.container, !editable && styles.disabled, containerStyle]}>
      {/* 검색 아이콘은 입력창 공통 형태에 포함하며 별도의 버튼으로 동작하지 않습니다. */}
      <Ionicons name="search" color={Colors.light.placeholder} size={22} />

      <NativeTextInput
        // value, onChangeText, onSubmitEditing 등 React Native 기본 입력 props를 그대로 전달합니다.
        {...props}
        clearButtonMode="while-editing"
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.placeholder}
        returnKeyType="search"
        style={[styles.input, inputStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: Colors.light.inputBackground,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    color: Colors.light.text,
    fontSize: 16,
  },
  disabled: {
    backgroundColor: Colors.light.disabled,
    opacity: 0.7,
  },
});
