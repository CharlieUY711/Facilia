import { randomUUID } from "crypto";
import { PresenceEvent } from "../../../domain/entities/PresenceEvent";
import { PresenceEventType } from "../../../domain/value-objects/PresenceEventType";
import { LocationRepository } from "../../../domain/repositories/LocationRepository";
import { GeofenceRepository } from "../../../domain/repositories/GeofenceRepository";
import { PresenceEventRepository } from "../../../domain/repositories/PresenceEventRepository";
import { calculateDistanceMeters } from "../../services/HaversineDistanceCalculator";
import { PresenceEventMapper } from "../../../infrastructure/mappers/PresenceEventMapper";
import { PresenceEventDTO } from "../../dto/GeoDTO";
import { DetectPresenceInput, DetectPresenceUseCase } from "../UseCaseContracts";

/**
 * Version BASICA (GEO-02): entrada/salida por comparacion directa
 * distancia <= radio, sin la maquina de estados OUTSIDE->ENTERING->
 * INSIDE->LEAVING ni los controles de persistencia minima/continuidad
 * anti falso-positivo — eso se agrega en GEO-05. Sirve como motor
 * funcional minimo para GEO-02/GEO-03.
 */
export class DetectPresence implements DetectPresenceUseCase {
  constructor(
    private readonly locationRepository: LocationRepository,
    private readonly geofenceRepository: GeofenceRepository,
    private readonly presenceEventRepository: PresenceEventRepository
  ) {}

  async execute(input: DetectPresenceInput): Promise<PresenceEventDTO[]> {
    const record = await this.locationRepository.findById(input.locationRecordId);
    if (!record) return [];

    const activeGeofences = await this.geofenceRepository.findAllActive();
    const createdEvents: PresenceEvent[] = [];

    for (const geofence of activeGeofences) {
      const distance = calculateDistanceMeters(record.coordinates, geofence.center);
      const accurateEnough = record.accuracy.isAcceptableFor(geofence.radius.meters);
      const isWithin = accurateEnough && geofence.isWithinRadius(distance);

      const lastEvent = await this.presenceEventRepository.findLastByPersonaAndGeofence(
        record.personaId,
        geofence.id
      );
      const wasInside = lastEvent?.type.toString() === "ENTER" || lastEvent?.type.toString() === "STAY";

      if (isWithin && !wasInside) {
        const event = PresenceEvent.create({
          id: randomUUID(),
          personaId: record.personaId,
          deviceId: record.deviceId,
          geofenceId: geofence.id,
          trackingSessionId: record.trackingSessionId,
          locationRecordId: record.id,
          type: PresenceEventType.enter(),
          occurredAt: record.recordedAt,
        });
        await this.presenceEventRepository.save(event);
        createdEvents.push(event);
      } else if (!isWithin && wasInside) {
        const event = PresenceEvent.create({
          id: randomUUID(),
          personaId: record.personaId,
          deviceId: record.deviceId,
          geofenceId: geofence.id,
          trackingSessionId: record.trackingSessionId,
          locationRecordId: record.id,
          type: PresenceEventType.exit(),
          occurredAt: record.recordedAt,
        });
        await this.presenceEventRepository.save(event);
        createdEvents.push(event);
      }
      // isWithin && wasInside -> ya esta dentro, no se duplica el evento
      // (la permanencia/STAY periodica se agrega en GEO-05).
    }

    // Eventos de dominio EmployeeArrivedLocation / EmployeeLeftLocation
    // (GEO-01 S11): emitidos aqui in-process junto con el guardado.
    return createdEvents.map((e) => PresenceEventMapper.toDTO(e));
  }
}
