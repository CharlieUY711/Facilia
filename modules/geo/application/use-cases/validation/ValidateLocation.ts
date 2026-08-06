import { randomUUID } from "crypto";
import { LocationValidation } from "../../../domain/entities/LocationValidation";
import { LocationValidationRepository } from "../../../domain/repositories/LocationValidationRepository";
import { PresenceEventRepository } from "../../../domain/repositories/PresenceEventRepository";
import { LocationValidationResult } from "../../../domain/value-objects/LocationValidationResult";
import { ExternalTaskReference } from "../../../domain/value-objects/ExternalTaskReference";
import { ValidateLocationInput, ValidateLocationUseCase } from "../UseCaseContracts";

// Tolerancia por defecto para considerar "a horario" (minutos). El ajuste
// fino (ON_TIME/LATE/EARLY como resultados diferenciados, tolerancias
// configurables) es responsabilidad de GEO-05 (motor de reglas).
const ON_TIME_TOLERANCE_MINUTES = 15;

export class ValidateLocation implements ValidateLocationUseCase {
  constructor(
    private readonly locationValidationRepository: LocationValidationRepository,
    private readonly presenceEventRepository: PresenceEventRepository
  ) {}

  async execute(input: ValidateLocationInput): Promise<{
    result: "VALIDATED" | "PARTIAL" | "FAILED" | "PENDING";
    timeDifferenceMinutes: number | null;
  }> {
    const taskReference = ExternalTaskReference.create({ taskType: input.taskType, taskId: input.taskId });

    const validation = LocationValidation.createPending({
      id: randomUUID(),
      personaId: input.personaId,
      geofenceId: input.geofenceId,
      taskReference,
      scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : null,
      scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : null,
    });

    const lastArrival = input.geofenceId
      ? await this.presenceEventRepository.findLastByPersonaAndGeofence(input.personaId, input.geofenceId)
      : null;
    const actualArrival = lastArrival?.type.toString() === "ENTER" || lastArrival?.type.toString() === "STAY"
      ? lastArrival.occurredAt
      : null;

    let result: LocationValidationResult;
    let timeDifferenceMinutes: number | null = null;

    if (!actualArrival) {
      result = LocationValidationResult.fromString("FAILED");
    } else if (!input.scheduledStart) {
      // Sin horario planificado: solo importa que haya habido llegada.
      result = LocationValidationResult.fromString("VALIDATED");
    } else {
      const scheduled = new Date(input.scheduledStart);
      timeDifferenceMinutes = Math.round((actualArrival.getTime() - scheduled.getTime()) / 60000);
      result = LocationValidationResult.fromString(
        Math.abs(timeDifferenceMinutes) <= ON_TIME_TOLERANCE_MINUTES ? "VALIDATED" : "PARTIAL"
      );
    }

    validation.resolve({
      actualArrival,
      actualDeparture: null,
      result,
      timeDifferenceMinutes,
    });

    await this.locationValidationRepository.save(validation);

    return { result: result.toString(), timeDifferenceMinutes };
  }
}
