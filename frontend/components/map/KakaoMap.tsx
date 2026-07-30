import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY;

export type LatLng = {
  lat: number;
  lng: number;
};

type KakaoMapProps = {
  initialCenter: LatLng;
  onSelectLocation?: (coords: LatLng) => void;
  style?: StyleProp<ViewStyle>;
};

// 지도 탭 시 마커를 이동시키고 좌표를 postMessage로 RN에 전달하는 카카오맵 페이지
function buildMapHtml(center: LatLng) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}"></script>
  <script>
    const map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(${center.lat}, ${center.lng}),
      level: 3,
    });

    const marker = new kakao.maps.Marker({
      position: map.getCenter(),
    });
    marker.setMap(map);

    kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
      const latlng = mouseEvent.latLng;
      marker.setPosition(latlng);

      window.ReactNativeWebView.postMessage(
        JSON.stringify({ lat: latlng.getLat(), lng: latlng.getLng() })
      );
    });
  </script>
</body>
</html>
`;
}

export function KakaoMap({ initialCenter, onSelectLocation, style }: KakaoMapProps) {
  const handleMessage = (event: WebViewMessageEvent) => {
    const coords = JSON.parse(event.nativeEvent.data) as LatLng;
    onSelectLocation?.(coords);
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: buildMapHtml(initialCenter) }}
        onMessage={handleMessage}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
