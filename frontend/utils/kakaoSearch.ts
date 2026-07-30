const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_KEY;

export type PlaceResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type KakaoKeywordSearchResponse = {
  documents: {
    place_name: string;
    address_name: string;
    road_address_name: string;
    x: string; // 경도
    y: string; // 위도
  }[];
};

// 키워드로 장소를 검색한다. 도로명 주소가 있으면 그걸 우선 쓰고, 없으면 지번 주소를 쓴다.
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${KAKAO_REST_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`카카오 키워드 검색 요청 실패: ${response.status}`);
  }

  const data: KakaoKeywordSearchResponse = await response.json();

  return data.documents.map((document) => ({
    name: document.place_name,
    address: document.road_address_name || document.address_name,
    lat: Number(document.y),
    lng: Number(document.x),
  }));
}
