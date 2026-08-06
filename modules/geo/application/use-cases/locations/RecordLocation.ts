import { randomUUID } from "crypto";
import { LocationRecord } from "../../../domain/entities/LocationRecord";
import { LocationRepository } from "../../../domain/repositories/LocationRepository";
import { TrackingSessionRepository } from "../../../domain/repositories/TrackingSessionRepository";
import { Coordinates } from "../../../domain/value-objects/Coordinates";
import { LocationAccuracy } from "../../../domain/value-objects/LocationAccuracy";
import { OwnershipMismatchError, TrackingSessionNotActiveError, TrackingSessionNotFoundError } from "../../../domain/errors/GeoErrors";
import { LocationRecordMapper } from "../../../infrastructure/mappers/LocationRecordMapper";
import { LocationRecordDTO } from "../../dto/GeoDTO";
import { RecordLocationInput, RecordLocationUseCase } from "../UseCaseContracts";

export class RecordLocation implements RecordLocationUseCase {
  constructor(
    private readonly locationRepository: LocationRepository,
    private readonly trackingSessionRepository: TrackingSessionRepository
  ) {}

  async execute(input: RecordLocationInput): Promise<LocationRecordDTO> {
    const session = await this.trackingSessionRepository.findById(input.trackingSessionId);
    if (!session) throw new TrackingSessionNotFoundError(input.trackingSessionId);
    if (!session.belongsToPersona(input.personaId) || session.deviceId !== input.deviceId) {
      throw new OwnershipMismatchError(`geo_tracking_sessions:${input.trackingSessionId}`);
    }
    if (!session.status.isActive()) {
      throw new TrackingSessionNotActiveError(input.trackingSessionId);
    }

    const record = LocationRecord.create({
      id: randomUUID(),
      trackingSessionId: input.trackingSessionId,
      deviceId: input.deviceId,
      personaId: input.personaId,
      coordinates: Coordinates.create({ latitude: input.latitude, longitude: input.longitude }),
      accuracy: LocationAccuracy.create(input.accuracy),
      altitude: input.altitude,
      speed: input.speed,
      recordedAt: new Date(input.recordedAt),
    });

    await this.locationRepository.save(record);

    // Evento de dominio LocationRecorded (GEO-01 S11). La deteccion de
    // presencia (EmployeeArrivedLocation/EmployeeLeftLocation) es un caso
    // de uso separado (DetectPresence) que la API route encadena a
    // continuacion — se mantiene RecordLocation con una sola
    // responsabilidad.
    return LocationRecordMapper.toDTO(record);
  }
}
