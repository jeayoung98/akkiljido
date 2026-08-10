import type { LatLng } from '@/components/map/KakaoMap';

const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_KEY;

type KakaoCoord2AddressResponse = {
  documents: {
    road_address: { address_name: string } | null;
    address: { address_name: string } | null;
  }[];
};

// 좌표(위도/경도)를 주소 문자열로 변환한다. 도로명 주소가 있으면 그걸 우선 쓰고, 없으면 지번 주소를 쓴다.
export async function reverseGeocode({ lat, lng }: LatLng): Promise<string | null> {
  const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${KAKAO_REST_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`카카오 좌표-주소 변환 요청 실패: ${response.status}`);
  }

  const data: KakaoCoord2AddressResponse = await response.json();
  const document = data.documents[0];

  if (!document) {
    return null;
  }

  return document.road_address?.address_name ?? document.address?.address_name ?? null;
}
