import * as Location from "expo-location";

export type LatLng = { latitude: number; longitude: number };
export type Place = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  distanceMeters?: number;
};

export async function fetchNearbyRestaurants(center: LatLng): Promise<Place[]> {
  const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
  // 1500m radius
  const RADIUS = 1500;
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="restaurant"](around:${RADIUS},${center.latitude},${center.longitude});
      way["amenity"="restaurant"](around:${RADIUS},${center.latitude},${center.longitude});
      relation["amenity"="restaurant"](around:${RADIUS},${center.latitude},${center.longitude});
    );
    out center tags;
  `;
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  const data = await res.json();
  const places: Place[] = (data.elements || [])
    .map((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const name = el.tags?.name ?? "Unknown restaurant";
      const address =
        el.tags?.["addr:full"] ||
        [el.tags?.["addr:street"], el.tags?.["addr:housenumber"]]
          .filter(Boolean)
          .join(" ");
      return lat && lon
        ? {
            id: String(el.id),
            name,
            lat,
            lon,
            address,
          }
        : null;
    })
    .filter(Boolean);
  return places as Place[];
}

export function haversineMeters(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c =
    2 *
    Math.asin(
      Math.sqrt(
        sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
      )
    );
  return R * c;
}

export async function getCurrentLocation(): Promise<LatLng> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission denied");
  }
  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  };
}
