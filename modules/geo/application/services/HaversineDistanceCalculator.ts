import { Coordinates } from "../../domain/value-objects/Coordinates";

const EARTH_RADIUS_METERS = 6371000;

/**
 * Distancia entre dos coordenadas (metros), formula Haversine. Vive en la
 * capa de aplicacion, no en el dominio: es un detalle de calculo, no una
 * regla de negocio (decision GEO-00 S16.5 / GEO-01 S7: sin PostGIS).
 */
export function calculateDistanceMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_METERS * c;
}
