import { Tabs } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';

const icons = {
  home: {
    on: require('@/assets/images/navbar-item/home-on.png'),
    off: require('@/assets/images/navbar-item/home-off.png'),
  },
  list: {
    on: require('@/assets/images/navbar-item/list-on.png'),
    off: require('@/assets/images/navbar-item/list-off.png'),
  },
  map: {
    on: require('@/assets/images/navbar-item/map-on.png'),
    off: require('@/assets/images/navbar-item/map-off.png'),
  },
  report: {
    on: require('@/assets/images/navbar-item/report-on.png'),
    off: require('@/assets/images/navbar-item/report-off.png'),
  },
  my: {
    on: require('@/assets/images/navbar-item/my-on.png'),
    off: require('@/assets/images/navbar-item/my-off.png'),
  },
};

function TabIcon({ name, focused }: { name: keyof typeof icons; focused: boolean }) {
  if (!focused) {
    return <Image source={icons[name].off} style={styles.icon} resizeMode="contain" />;
  }
  return (
    <View style={styles.activeCircle}>
      <Image source={icons[name].on} style={styles.icon} resizeMode="contain" />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          paddingTop: 10,
          height: 60,
        },
      }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
      <Tabs.Screen name="list" options={{ tabBarIcon: ({ focused }) => <TabIcon name="list" focused={focused} /> }} />
      <Tabs.Screen name="map" options={{ tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} /> }} />
      <Tabs.Screen name="report" options={{ tabBarIcon: ({ focused }) => <TabIcon name="report" focused={focused} /> }} />
      <Tabs.Screen name="my" options={{ tabBarIcon: ({ focused }) => <TabIcon name="my" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 22,
    height: 22,
  },
  activeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4B8062',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
