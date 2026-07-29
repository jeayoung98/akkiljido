import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Text } from '@/components/common/Themed';

export default function DevScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.section}>Button</Text>

      <Text>green</Text>
      <Button variant="green" onPress={() => {}}>저장</Button>

      <Text>red</Text>
      <Button variant="red" onPress={() => {}}>삭제</Button>

      <Text>white</Text>
      <Button variant="white" onPress={() => {}}>취소</Button>

      <Text>dashed</Text>
      <Button variant="dashed" onPress={() => {}}>건너뛰기</Button>

      <Text>disabled</Text>
      <Button variant="green" disabled onPress={() => {}}>저장</Button>

      <Text>loading</Text>
      <Button variant="green" loading onPress={() => {}}>저장</Button>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="white" style={{ flex: 1 }} onPress={() => {}}>취소</Button>
        <Button variant="green" style={{ flex: 1 }} onPress={() => {}}>확인</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 8,
  },
  section: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
