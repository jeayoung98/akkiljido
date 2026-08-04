// KakaoMap이 WebView에 띄우는 지도 페이지(HTML) 생성 전용 모듈.
// React나 RN 컴포넌트와는 무관하게, 순수하게 "카카오맵 SDK를 쓰는 HTML 문자열을 만드는" 역할만 한다.
//
// 지도 생성 자체(중심좌표/레벨)만 초기 HTML에 굽고, 그 이후 바뀌는 것들(마커/핀/선택핀/내 위치)은
// 전부 페이지 안에 정의해둔 setXxx 함수를 RN에서 injectJavaScript로 호출하는 방식으로 갱신한다.
// (마커처럼 자주 바뀌는 값을 매번 HTML을 새로 만들어 WebView에 넘기면, WebView가 통째로 리로드되면서
//  지도 중심/줌 레벨 같은 상태가 초기값으로 되돌아가는 문제가 있었다.)

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY;

export type LatLng = {
  lat: number;
  lng: number;
};

// 이름+누적 금액이 적힌 말풍선 마커. 개별(4단계)이면 가게 하나, 클러스터(1~3단계)면 구역 하나를 나타낸다.
export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string; // 가게 이름 또는 구역 이름
  amount: number; // 누적 금액
  color: string; // 테두리 색 (개별=카테고리 지정색, 클러스터=브랜드 그린 등 호출부에서 결정)
  selected?: boolean; // true면 다른 마커보다 테두리를 더 두껍게 그려서 강조한다.
};

export type BuildMapHtmlParams = {
  initialCenter: LatLng;
  initialLevel?: number;
};

// 검색 결과 핀(파랑)과 선택된 핀(초록)은 모양은 같고 색만 다르게 구분한다.
const PIN_COLOR = '#4285F4';
const SELECTED_PIN_COLOR = '#63A061';
// 내 위치 점은 연두색으로, 내 장소 점(파랑)·검색 핀(파랑)과 구분되게 한다.
const MY_LOCATION_COLOR = '#8BC34A';

// 지도 생성 자체(중심좌표/레벨)만 굽고, 마커/핀/선택핀/내 위치는 전부 RN에서 injectJavaScript로 채워 넣는다.
export function buildMapHtml({ initialCenter, initialLevel = 3 }: BuildMapHtmlParams) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    .my-location-dot, .my-place-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
    }
    .my-location-dot { background: ${MY_LOCATION_COLOR}; }
    .my-place-dot { background: ${PIN_COLOR}; }
    /* 로드뷰는 평소엔 숨겨져 있다가, 열리면 위쪽 2/3을 덮는다. 아래쪽 1/3은 #map이 그대로 비쳐서
       지금 어디를 보고 있는지 알 수 있고, 그 부분은 원래 지도라 그대로 줌/이동이 된다. */
    #roadview { display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 33%; z-index: 10; }
    /* 로드뷰 위치/시선 방향 마커. 흰 점(위치) 위에 화살표(시선 방향, pan 각도만큼 회전)를 겹친다. */
    .roadview-marker { position: relative; width: 1px; height: 1px; }
    .roadview-marker-dot {
      position: absolute; top: 0; left: 0; transform: translate(-50%, -50%);
      width: 14px; height: 14px; border-radius: 50%;
      background: #fff; border: 2px solid #4285F4; box-shadow: 0 0 4px rgba(0,0,0,0.4);
    }
    .roadview-marker-arrow {
      position: absolute; top: 0; left: 0;
      width: 0; height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-bottom: 16px solid rgba(66,133,244,0.55);
      transform-origin: 50% 26px;
      transform: translate(-50%, -26px) rotate(0deg);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="roadview"></div>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}"></script>
  <script>
    const map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(${initialCenter.lat}, ${initialCenter.lng}),
      level: ${initialLevel},
    });

    const pinImageSize = new kakao.maps.Size(24, 34);
    function makePinImage(color) {
      const svg = '<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22c0-6.6-5.4-12-12-12z" fill="' + color + '"/>' +
        '<circle cx="12" cy="12" r="5" fill="#fff"/></svg>';
      return new kakao.maps.MarkerImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), pinImageSize);
    }
    const pinImage = makePinImage('${PIN_COLOR}');
    const selectedPinImage = makePinImage('${SELECTED_PIN_COLOR}');


    let myLocationOverlay = null;
    function setMyLocation(loc) {
      if (myLocationOverlay) {
        myLocationOverlay.setMap(null);
        myLocationOverlay = null;
      }
      if (!loc) return;
      myLocationOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(loc.lat, loc.lng),
        content: '<div class="my-location-dot"></div>',
      });
      myLocationOverlay.setMap(map);
    }

    // ── 내 장소(파란 점 + 반경 2km 원) ────────────────────────────────
    // 점은 내 위치 점(연두)과 모양은 같고 색만 파랑(.my-place-dot)이다.
    // 원은 "이 범위 안의 소비 내역을 보고 있다"는 표시라서 목 데이터의 근처 판정(약 2km)과 맞춘다.
    let myPlaceDotOverlay = null;
    let myPlaceCircleShape = null;
    function setMyPlaceCircle(place) {
      if (myPlaceDotOverlay) {
        myPlaceDotOverlay.setMap(null);
        myPlaceDotOverlay = null;
      }
      if (myPlaceCircleShape) {
        myPlaceCircleShape.setMap(null);
        myPlaceCircleShape = null;
      }
      if (!place) return;
      const position = new kakao.maps.LatLng(place.lat, place.lng);
      myPlaceCircleShape = new kakao.maps.Circle({
        center: position,
        radius: 2000,
        strokeWeight: 2,
        strokeColor: '${PIN_COLOR}',
        strokeOpacity: 0.8,
        fillColor: '${PIN_COLOR}',
        fillOpacity: 0.06,
      });
      myPlaceCircleShape.setMap(map);
      myPlaceDotOverlay = new kakao.maps.CustomOverlay({
        position: position,
        content: '<div class="my-place-dot"></div>',
      });
      myPlaceDotOverlay.setMap(map);
    }

    // ── 검색 결과 등 단순 핀 목록 ─────────────────────────────────────
    let pinMarkers = [];
    function setMapPins(pins) {
      pinMarkers.forEach(function (m) { m.setMap(null); });
      pinMarkers = pins.map(function (pin, index) {
        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(pin.lat, pin.lng),
          image: pinImage,
          map: map,
        });
        kakao.maps.event.addListener(marker, 'click', function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pin', index: index }));
        });
        return marker;
      });
    }

    // ── 탭/선택으로 찍히는 핀 하나 ────────────────────────────────────
    let selectedPinMarker = null;
    function setSelectedPin(pin) {
      if (selectedPinMarker) {
        selectedPinMarker.setMap(null);
        selectedPinMarker = null;
      }
      if (!pin) return;
      selectedPinMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(pin.lat, pin.lng),
        image: selectedPinImage,
        map: map,
      });
    }

    // ── 이름+금액 말풍선 마커 ──────────────────────────────────────────
    // 테두리 색과 같은 색 삼각형 꼬리 위에 살짝 작은 흰 삼각형을 겹쳐서
    // "흰 배경 + 테두리 색" 말풍선처럼 보이게 하는 흔한 CSS 트릭이다.
    function markerBubbleHtml(marker) {
      const amountText = marker.amount.toLocaleString('ko-KR') + '원';
      const borderWidth = marker.selected ? 4 : 2;
      return '<div style="position: relative; display: inline-block;">' +
        '<div style="background:#fff;border:' + borderWidth + 'px solid ' + marker.color + ';border-radius:10px;padding:5px 10px;' +
          'text-align:center;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.15);">' +
          '<div style="font-size:12px;font-weight:700;color:#18251E;line-height:15px;">' + marker.label + '</div>' +
          '<div style="font-size:11px;color:#789080;line-height:14px;">' + amountText + '</div>' +
        '</div>' +
        '<div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;' +
          'border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ' + marker.color + ';"></div>' +
        '<div style="position:absolute;bottom:-4.5px;left:50%;transform:translateX(-50%);width:0;height:0;' +
          'border-left:5px solid transparent;border-right:5px solid transparent;border-top:5.5px solid #fff;"></div>' +
      '</div>';
    }

    let bubbleOverlays = [];
    function setMapMarkers(markers) {
      bubbleOverlays.forEach(function (o) { o.setMap(null); });
      bubbleOverlays = markers.map(function (marker) {
        const el = document.createElement('div');
        el.innerHTML = markerBubbleHtml(marker);
        const content = el.firstChild;
        content.style.cursor = 'pointer';
        content.addEventListener('click', function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker', id: marker.id }));
        });
        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(marker.lat, marker.lng),
          content: content,
          yAnchor: 1.3,
        });
        overlay.setMap(map);
        return overlay;
      });
    }

    // ── 로드뷰 ────────────────────────────────────────────────────────
    // 모드를 켜면 로드뷰가 있는 도로가 파란 선으로 표시되고, 그 상태에서 지도를 탭하면
    // 가까운 로드뷰 지점을 찾아 거리 사진을 지도 위에 꽉 채워 띄운다.
    let roadviewMode = false;
    let roadview = null;
    let roadviewClient = null;
    let roadviewMarker = null; // 아래쪽 지도에 로드뷰 위치/시선 방향을 보여주는 CustomOverlay
    let roadviewArrowEl = null; // 시선 방향 화살표 DOM. viewpoint_changed 때마다 회전만 갱신한다.
    const roadviewContainer = document.getElementById('roadview');

    function ensureRoadviewMarker(position) {
      if (!roadviewMarker) {
        const wrap = document.createElement('div');
        wrap.className = 'roadview-marker';
        wrap.innerHTML = '<div class="roadview-marker-arrow"></div><div class="roadview-marker-dot"></div>';
        roadviewArrowEl = wrap.querySelector('.roadview-marker-arrow');
        roadviewMarker = new kakao.maps.CustomOverlay({ content: wrap, zIndex: 5 });
      }
      roadviewMarker.setPosition(position);
      roadviewMarker.setMap(map);
    }

    function updateRoadviewHeading() {
      if (!roadview || !roadviewArrowEl) return;
      const pan = roadview.getViewpoint().pan;
      roadviewArrowEl.style.transform = 'translate(-50%, -26px) rotate(' + pan + 'deg)';
    }

    function setRoadviewMode(on) {
      roadviewMode = on;
      if (on) {
        map.addOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
      } else {
        map.removeOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
        closeRoadview();
      }
    }

    function openRoadviewAt(lat, lng) {
      const position = new kakao.maps.LatLng(lat, lng);
      if (!roadviewClient) {
        roadviewClient = new kakao.maps.RoadviewClient();
      }
      // 탭한 지점 반경 50m 안에서 가장 가까운 로드뷰 지점을 찾는다. 없으면 null이 온다.
      roadviewClient.getNearestPanoId(position, 50, function (panoId) {
        if (panoId === null) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'roadviewUnavailable' }));
          return;
        }
        roadviewContainer.style.display = 'block';
        if (!roadview) {
          roadview = new kakao.maps.Roadview(roadviewContainer);
          // 드래그로 시선을 돌릴 때마다 화살표 방향을 갱신한다.
          kakao.maps.event.addListener(roadview, 'viewpoint_changed', updateRoadviewHeading);
        }
        roadview.setPanoId(panoId, position);
        ensureRoadviewMarker(position);
        updateRoadviewHeading();
        // #map은 화면 전체 크기라서 setCenter만 하면 화면 정중앙(로드뷰에 가려진 위쪽)으로 맞춰진다.
        // 실제 보이는 건 아래쪽 1/3뿐이라, 그 영역의 가운데(화면 전체 기준 5/6 지점)로 오도록
        // 화면 세로 길이의 1/3만큼 더 내려(panBy) 보정한다.
        map.setCenter(position);
        map.panBy(0, -(window.innerHeight / 3));
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'roadview', open: true }));
      });
    }

    function closeRoadview() {
      if (roadviewContainer.style.display !== 'block') return;
      roadviewContainer.style.display = 'none';
      if (roadviewMarker) {
        roadviewMarker.setMap(null);
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'roadview', open: false }));
    }

    kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
      const latlng = mouseEvent.latLng;
      // 로드뷰 모드 중에는 지도 탭이 "위치 선택"이 아니라 "이 지점 로드뷰 열기"로 동작한다.
      if (roadviewMode) {
        openRoadviewAt(latlng.getLat(), latlng.getLng());
        return;
      }

      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'tap', lat: latlng.getLat(), lng: latlng.getLng() })
      );
    });

    // 줌 버튼으로 바꾼 경우, 핀치줌한 경우 둘 다 여기로 들어와서 RN에 현재 레벨을 알려준다.
    kakao.maps.event.addListener(map, 'zoom_changed', function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'level', level: map.getLevel() }));
    });

    // 지도(+ 위 함수들)가 준비됐다고 RN에 알린다. RN은 이 신호를 받은 뒤부터 injectJavaScript로
    // setMapMarkers/setMapPins/setSelectedPin/setMyLocation을 호출한다.
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>
`;
}
