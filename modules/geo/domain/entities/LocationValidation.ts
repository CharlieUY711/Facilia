import { LocationValidationResult } from "../value-objects/LocationValidationResult";
import { ExternalTaskReference } from "../value-objects/ExternalTaskReference";

export interface LocationValidationProps {
  id: string;
  personaId: string;
  geofenceId: string | null;
  taskReference: ExternalTaskReference;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  actualArrival: Date | null;
  actualDeparture: Date | null;
  result: LocationValidationResult;
  timeDifferenceMinutes: number | null;
  evaluatedAt: Date | null;
  createdAt: Date;
}

/**
 * Resultado de cruzar hora planificada (si hay una tarea referenciada, ver
 * ExternalTaskReference) contra hora real de llegada/permanencia detectada
 * por el motor de geocercas (GEO-05). Se crea en PENDING y se resuelve una
 * vez evaluada.
 */
export class LocationValidation {
  private constructor(private props: LocationValidationProps) {}

  static createPending(props: {
    id: string;
    personaId: string;
    geofenceId: string | null;
    taskReference: ExternalTaskReference;
    scheduledStart?: Date | null;
    scheduledEnd?: Date | null;
  }): LocationValidation {
    return new LocationValidation({
      id: props.id,
      personaId: props.personaId,
      geofenceId: props.geofenceId,
      taskReference: props.taskReference,
      scheduledStart: props.scheduledStart ?? null,
      scheduledEnd: props.scheduledEnd ?? null,
      actualArrival: null,
      actualDeparture: null,
      result: LocationValidationResult.pending(),
      timeDifferenceMinutes: null,
      evaluatedAt: null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: LocationValidationProps): LocationValidation {
    return new LocationValidation(props);
  }

  resolve(params: {
    actualArrival: Date | null;
    actualDeparture: Date | null;
    result: LocationValidationResult;
    timeDifferenceMinutes: number | null;
  }): void {
    this.props.actualArrival = params.actualArrival;
    this.props.actualDeparture = params.actualDeparture;
    this.props.result = params.result;
    this.props.timeDifferenceMinutes = params.timeDifferenceMinutes;
    this.props.evaluatedAt = new Date();
  }

  get id(): string {
    return this.props.id;
  }
  get personaId(): string {
    return this.props.personaId;
  }
  get taskReference(): ExternalTaskReference {
    return this.props.taskReference;
  }
  get result(): LocationValidationResult {
    return this.props.result;
  }

  toProps(): LocationValidationProps {
    return { ...this.props };
  }
}
