import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY;

export type LatLng = {
  lat: number;
  lng: number;
};

// RN에서 지도를 명령형으로 조작할 때 쓰는 핸들. ref로 접근한다.
export type KakaoMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  // 특정 레벨(1~14)로 바로 이동한다. 줌 4단계처럼 정해진 레벨로 점프할 때 쓴다.
  setLevel: (level: number) => void;
};

type KakaoMapProps = {
  initialCenter: LatLng;
  // 카카오맵 줌 레벨(1~14, 작을수록 확대). 기본 3.
  initialLevel?: number;
  // 내 위치. 있으면 파란 동그라미로 표시한다(핀 아님). 없으면 아무것도 안 보인다.
  myLocation?: LatLng;
  // 검색 결과 등 여러 개 찍을 핀 목록.
  pins?: LatLng[];
  // 지도를 탭했거나 결과 하나를 선택했을 때, 그 위치에 찍을 핀 하나. pins와 모양은 같고 색만 다르다.
  selectedPin?: LatLng;
  onSelectLocation?: (coords: LatLng) => void;
  // pins 배열의 핀 하나를 눌렀을 때, 그 핀이 pins 배열에서 몇 번째인지 알려준다.
  onPinPress?: (index: number) => void;
  // 지도 확대/축소 레벨이 바뀔 때마다 알려준다(줌 버튼으로 바꾼 경우 + 사용자가 직접 핀치줌한 경우 둘 다 포함).
  onLevelChange?: (level: number) => void;
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
function buildMapHtml({
  initialCenter,
  initialLevel = 3,
  myLocation,
  pins = [],
  selectedPin,
}: Omit<KakaoMapProps, 'onSelectLocation' | 'onPinPress' | 'style'>) {
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
      level: ${initialLevel},
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

    // 줌 버튼으로 바꾼 경우, 핀치줌한 경우 둘 다 여기로 들어와서 RN에 현재 레벨을 알려준다.
    kakao.maps.event.addListener(map, 'zoom_changed', function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'level', level: map.getLevel() }));
    });
  </script>
</body>
</html>
`;
}

export const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(function KakaoMap(
  { initialCenter, initialLevel, myLocation, pins, selectedPin, onSelectLocation, onPinPress, onLevelChange, style },
  ref
) {
  const webViewRef = useRef<WebView>(null);

  // RN → WebView 방향 통신: injectJavaScript로 WebView 안의 map 객체에 직접 명령을 실행시킨다.
  // buildMapHtml의 <script>에서 선언한 top-level const map은 이후에 주입되는 스크립트에서도 그대로 보인다.
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      webViewRef.current?.injectJavaScript('map.setLevel(map.getLevel() - 1); true;');
    },
    zoomOut: () => {
      webViewRef.current?.injectJavaScript('map.setLevel(map.getLevel() + 1); true;');
    },
    setLevel: (level) => {
      webViewRef.current?.injectJavaScript(`map.setLevel(${level}); true;`);
    },
  }));

  // WebView → RN 방향 통신: 지도 안에서 일어난 일(핀 클릭, 탭, 줌 변경)을 postMessage로 받는다.
  const handleMessage = (event: WebViewMessageEvent) => {
    const message = JSON.parse(event.nativeEvent.data);
    if (message.type === 'pin') {
      onPinPress?.(message.index);
    } else if (message.type === 'tap') {
      onSelectLocation?.({ lat: message.lat, lng: message.lng });
    } else if (message.type === 'level') {
      onLevelChange?.(message.level);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: buildMapHtml({ initialCenter, initialLevel, myLocation, pins, selectedPin }) }}
        onMessage={handleMessage}
        javaScriptEnabled
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
