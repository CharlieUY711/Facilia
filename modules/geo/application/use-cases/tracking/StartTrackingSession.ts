import { randomUUID } from "crypto";
import { TrackingSession } from "../../../domain/entities/TrackingSession";
import { TrackingSessionRepository } from "../../../domain/repositories/TrackingSessionRepository";
import { DeviceRepository } from "../../../domain/repositories/DeviceRepository";
import { PersonaDirectoryReader } from "../../../infrastructure/supabase/PersonaDirectoryReader";
import {
  ActiveTrackingSessionAlreadyExistsError,
  DeviceNotFoundError,
  OwnershipMismatchError,
  PersonaNotTrackableError,
} from "../../../domain/errors/GeoErrors";
import { TrackingSessionMapper } from "../../../infrastructure/mappers/TrackingSessionMapper";
import { TrackingSessionDTO } from "../../dto/GeoDTO";
import { StartTrackingSessionInput, StartTrackingSessionUseCase } from "../UseCaseContracts";

export class StartTrackingSession implements StartTrackingSessionUseCase {
  constructor(
    private readonly trackingSessionRepository: TrackingSessionRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly personaDirectoryReader: PersonaDirectoryReader
  ) {}

  async execute(input: StartTrackingSessionInput): Promise<TrackingSessionDTO> {
    const isTrackable = await this.personaDirectoryReader.isTrackablePersona(input.personaId);
    if (!isTrackable) throw new PersonaNotTrackableError(input.personaId);

    const device = await this.deviceRepository.findById(input.deviceId);
    if (!device) throw new DeviceNotFoundError(input.deviceId);
    if (!device.belongsToPersona(input.personaId)) {
      throw new OwnershipMismatchError(`geo_devices:${input.deviceId}`);
    }
    device.assertUsable();

    const existingActive = await this.trackingSessionRepository.findActiveByPersonaId(input.personaId);
    if (existingActive) throw new ActiveTrackingSessionAlreadyExistsError(input.personaId);

    const session = TrackingSession.start({
      id: randomUUID(),
      personaId: input.personaId,
      deviceId: input.deviceId,
    });

    device.registerConnection();
    await this.deviceRepository.save(device);
    await this.trackingSessionRepository.save(session);

    // Evento de dominio TrackingSessionStarted (GEO-01 S11): in-process,
    // sin bus de eventos (GEO-00 S16.6). Se deja como comentario explicito
    // del punto de extension para GEO-05/GEO-06.
    return TrackingSessionMapper.toDTO(session);
  }
}
