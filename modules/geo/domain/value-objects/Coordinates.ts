import { InvalidCoordinatesError } from "../errors/GeoErrors";

export interface CoordinatesProps {
  latitude: number;
  longitude: number;
}

/**
 * Par de coordenadas geograficas. Inmutable y validado en construccion.
 * No conoce Haversine ni ningun calculo de distancia: eso vive en la
 * capa de aplicacion/motor (GEO-02/GEO-05), segun la decision de GEO-00
 * de no adoptar PostGIS en el MVP.
 */
export class Coordinates {
  private constructor(
    public readonly latitude: number,
    public readonly longitude: number
  ) {}

  static create(props: CoordinatesProps): Coordinates {
    if (!Number.isFinite(props.latitude) || props.latitude < -90 || props.latitude > 90) {
      throw new InvalidCoordinatesError("la latitud debe ser un numero entre -90 y 90");
    }
    if (!Number.isFinite(props.longitude) || props.longitude < -180 || props.longitude > 180) {
      throw new InvalidCoordinatesError("la longitud debe ser un numero entre -180 y 180");
    }
    return new Coordinates(props.latitude, props.longitude);
  }

  equals(other: Coordinates): boolean {
    return this.latitude === other.latitude && this.longitude === other.longitude;
  }
}
