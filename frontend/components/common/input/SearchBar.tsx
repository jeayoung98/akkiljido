import { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';

type SearchBarProps = {
  placeholder?: string;
  onSearch: (text: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function SearchBar({ placeholder = '장소, 주소 검색', onSearch, style }: SearchBarProps) {
  const [text, setText] = useState('');

  return (
    <View style={[styles.container, style]}>
      <TextInput
        value={text}
        onChangeText={setText}  // 사용자가 입력할 때마다 state 업데이트
        onSubmitEditing={(event) => onSearch(event.nativeEvent.text)}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.placeholder}
        returnKeyType="search"
        style={styles.input}
      />

      <Pressable onPress={() => onSearch(text)} 
      hitSlop={8}// 실제 아이콘보다 넓은 터치 영역 제공 
      > 
        <Ionicons name="search" size={20} color={Colors.light.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },
});
