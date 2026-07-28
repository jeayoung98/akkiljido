import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function MyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>마이페이지 화면</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
