import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY;

export type LatLng = {
  lat: number;
  lng: number;
};

type KakaoMapProps = {
  initialCenter: LatLng;
  // 내 위치. 있으면 파란 동그라미로 표시한다(핀 아님). 없으면 아무것도 안 보인다.
  myLocation?: LatLng;
  // 검색 결과 등 여러 개 찍을 핀 목록.
  pins?: LatLng[];
  // 지도를 탭했거나 결과 하나를 선택했을 때, 그 위치에 찍을 핀 하나. pins와 모양은 같고 색만 다르다.
  selectedPin?: LatLng;
  onSelectLocation?: (coords: LatLng) => void;
  // pins 배열의 핀 하나를 눌렀을 때, 그 핀이 pins 배열에서 몇 번째인지 알려준다.
  onPinPress?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
};

// 같은 모양(물방울 핀)에 색만 다르게 만든 SVG 마커 이미지를 data URI로 만든다.
function pinImage(color: string) {
  const svg = `<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22c0-6.6-5.4-12-12-12z" fill="${color}"/>
    <circle cx="12" cy="12" r="5" fill="#fff"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// 검색 결과 핀(파랑)과 선택된 핀(초록)은 모양은 같고 색만 다르게 구분한다.
const PIN_COLOR = '#4285F4';
const SELECTED_PIN_COLOR = '#63A061';

// 지도 탭/핀 클릭 결과를 postMessage로 RN에 전달하는 카카오맵 페이지.
// 내 위치(파란 원), 검색 결과 핀들, 선택된 핀을 각각 다르게 그린다.
function buildMapHtml({ initialCenter, myLocation, pins = [], selectedPin }: Omit<KakaoMapProps, 'onSelectLocation' | 'onPinPress' | 'style'>) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    .my-location-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #4285F4;
      border: 2px solid #fff;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}"></script>
  <script>
    const map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(${initialCenter.lat}, ${initialCenter.lng}),
      level: 3,
    });

    const pinImageSize = new kakao.maps.Size(24, 34);
    const pinImage = new kakao.maps.MarkerImage('${pinImage(PIN_COLOR)}', pinImageSize);
    const selectedPinImage = new kakao.maps.MarkerImage('${pinImage(SELECTED_PIN_COLOR)}', pinImageSize);

    ${
      myLocation
        ? `
    const myLocationOverlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(${myLocation.lat}, ${myLocation.lng}),
      content: '<div class="my-location-dot"></div>',
    });
    myLocationOverlay.setMap(map);
    `
        : ''
    }

    ${pins
      .map(
        (pin, index) => `
    (function () {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${pin.lat}, ${pin.lng}),
        image: pinImage,
        map: map,
      });
      kakao.maps.event.addListener(marker, 'click', function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pin', index: ${index} }));
      });
    })();
    `
      )
      .join('')}

    ${
      selectedPin
        ? `
    new kakao.maps.Marker({
      position: new kakao.maps.LatLng(${selectedPin.lat}, ${selectedPin.lng}),
      image: selectedPinImage,
      map: map,
    });
    `
        : ''
    }

    kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
      const latlng = mouseEvent.latLng;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'tap', lat: latlng.getLat(), lng: latlng.getLng() })
      );
    });
  </script>
</body>
</html>
`;
}

export function KakaoMap({ initialCenter, myLocation, pins, selectedPin, onSelectLocation, onPinPress, style }: KakaoMapProps) {
  const handleMessage = (event: WebViewMessageEvent) => {
    const message = JSON.parse(event.nativeEvent.data);
    if (message.type === 'pin') {
      onPinPress?.(message.index);
    } else if (message.type === 'tap') {
      onSelectLocation?.({ lat: message.lat, lng: message.lng });
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: buildMapHtml({ initialCenter, myLocation, pins, selectedPin }) }}
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
