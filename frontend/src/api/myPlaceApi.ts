import { apiRequest } from '@/src/api/apiClient';

// 응답 필드는 Swagger 문서에 data 스키마가 비어 있어서(백엔드 문서화 누락), 같은 도메인을 다루는
// transactionMapApi.ts의 MyPlaceMap과 동일한 모양으로 추정했다. 실제 응답이 다르면 이 타입부터 맞춘다.
export type MyPlace = {
  placeId: number;
  myPlaceName: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type MyPlaceInput = {
  myPlaceName: string;
  address: string;
  latitude: number;
  longitude: number;
};

export async function getMyPlaces(): Promise<MyPlace[]> {
  return apiRequest<MyPlace[]>('/api/v1/my/place');
}

export async function createMyPlace(input: MyPlaceInput): Promise<MyPlace> {
  return apiRequest<MyPlace>('/api/v1/my/place', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // 이 엔드포인트만 요청 필드가 스네이크 케이스(my_place_name)다. Swagger 스펙에 그렇게
    // 정의되어 있다 — NotificationPlaceCreateRequest(카멜 케이스)와 표기가 다르니 헷갈리지 않는다.
    body: JSON.stringify({
      my_place_name: input.myPlaceName,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
    }),
  });
}

export async function updateMyPlace(
  placeId: number,
  input: Partial<MyPlaceInput>,
): Promise<MyPlace> {
  const body: Record<string, unknown> = {};
  if (input.myPlaceName !== undefined) body.my_place_name = input.myPlaceName;
  if (input.address !== undefined) body.address = input.address;
  if (input.latitude !== undefined) body.latitude = input.latitude;
  if (input.longitude !== undefined) body.longitude = input.longitude;

  return apiRequest<MyPlace>(`/api/v1/my/place/${placeId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function deleteMyPlace(placeId: number): Promise<void> {
  return apiRequest<void>(`/api/v1/my/place/${placeId}`, {
    method: 'DELETE',
  });
}
