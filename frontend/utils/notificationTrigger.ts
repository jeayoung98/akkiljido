import type { NotificationPlace } from '@/types/notification';

export type LatLng = {
  latitude: number;
  longitude: number;
};

// 백엔드 알림 장소 API에 반경 필드가 아직 없어서, 알림함 화면 문구("반경 500m 안이에요")와
// 맞춰 우선 고정값으로 둔다. 반경을 장소마다 다르게 설정하게 되면 NotificationPlace에
// radius 필드가 추가되고 이 상수는 기본값 용도로만 남을 것이다.
export const DEFAULT_TRIGGER_RADIUS_METERS = 500;

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

// 하버사인 공식으로 두 좌표 사이 거리를 미터 단위로 구한다.
export function getDistanceMeters(a: LatLng, b: LatLng) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

// startTime > endTime이면(예: 23:00~01:00) 자정을 넘기는 시간대로 보고 판단한다.
export function isWithinTimeWindow(now: Date, startTime: string, endTime: string) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/**
 * 현재 위치·시각 기준으로 지금 알림을 보내야 하는 알림 장소들을 찾는다.
 * active=false인 장소, 반경 밖, 설정한 시간대 밖인 장소는 제외한다.
 */
export function findTriggeredPlaces(
  currentLocation: LatLng,
  places: NotificationPlace[],
  now: Date = new Date(),
  radiusMeters: number = DEFAULT_TRIGGER_RADIUS_METERS
): NotificationPlace[] {
  return places.filter((place) => {
    if (!place.active) return false;
    if (!isWithinTimeWindow(now, place.startTime, place.endTime)) return false;
    const distance = getDistanceMeters(currentLocation, place);
    return distance <= radiusMeters;
  });
}
