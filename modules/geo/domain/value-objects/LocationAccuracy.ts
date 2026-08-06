import { InvalidAccuracyError } from "../errors/GeoErrors";

// Techo absoluto de precision aceptable, independiente del radio de la
// geocerca contra la que se valide (control anti falso-positivo de GEO-05).
const MAX_ACCEPTABLE_ACCURACY_METERS = 100;

export class LocationAccuracy {
  private constructor(public readonly meters: number) {}

  static create(meters: number): LocationAccuracy {
    if (!Number.isFinite(meters) || meters < 0) {
      throw new InvalidAccuracyError("debe ser un numero mayor o igual a cero");
    }
    return new LocationAccuracy(meters);
  }

  /**
   * Anti falso positivo (GEO-05): el error GPS reportado no debe superar el
   * radio de la geocerca evaluada, ni el techo absoluto del sistema.
   */
  isAcceptableFor(radiusMeters: number): boolean {
    const threshold = Math.min(radiusMeters, MAX_ACCEPTABLE_ACCURACY_METERS);
    return this.meters <= threshold;
  }
}
