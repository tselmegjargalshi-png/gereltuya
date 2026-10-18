export type District = { name: string; lat: number; lng: number };

/** Улаанбаатарын дүүргүүдийн төвийн ойролцоо координат. Хамгийн ойр эрэмбэлэхэд ашиглана. */
export const DISTRICTS: District[] = [
  { name: "Сүхбаатар дүүрэг", lat: 47.9185, lng: 106.9175 },
  { name: "Чингэлтэй дүүрэг", lat: 47.9285, lng: 106.9015 },
  { name: "Баянгол дүүрэг", lat: 47.9175, lng: 106.8715 },
  { name: "Хан-Уул дүүрэг", lat: 47.8915, lng: 106.9005 },
  { name: "Баянзүрх дүүрэг", lat: 47.9205, lng: 106.9535 },
  { name: "Сонгинохайрхан дүүрэг", lat: 47.9205, lng: 106.8135 },
];

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function findDistrict(name?: string | null): District | undefined {
  return DISTRICTS.find((d) => d.name === name);
}
