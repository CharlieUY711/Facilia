import { InvalidRadiusError } from "../errors/GeoErrors";

// Limites razonables para geocercas operativas (cliente/oficina/deposito).
// No pretenden cubrir geocercas de gran escala (eso queda fuera de alcance,
// ver GEO-00 exclusiones).
const MIN_RADIUS_METERS = 10;
const MAX_RADIUS_METERS = 5000;

export class GeoRadius {
  private constructor(public readonly meters: number) {}

  static create(meters: number): GeoRadius {
    if (!Number.isFinite(meters)) {
      throw new InvalidRadiusError("debe ser un numero");
    }
    if (meters < MIN_RADIUS_METERS) {
      throw new InvalidRadiusError(`debe ser de al menos ${MIN_RADIUS_METERS} metros`);
    }
    if (meters > MAX_RADIUS_METERS) {
      throw new InvalidRadiusError(`no puede superar los ${MAX_RADIUS_METERS} metros`);
    }
    return new GeoRadius(meters);
  }

  /** Regla de entrada/salida de GEO-05: distancia <= radio => dentro de la geocerca. */
  contains(distanceInMeters: number): boolean {
    return distanceInMeters <= this.meters;
  }
}
