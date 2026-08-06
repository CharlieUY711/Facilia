import { TrackingSessionRepository } from "../../../domain/repositories/TrackingSessionRepository";
import { OwnershipMismatchError, TrackingSessionNotFoundError } from "../../../domain/errors/GeoErrors";
import { TrackingSessionMapper } from "../../../infrastructure/mappers/TrackingSessionMapper";
import { TrackingSessionDTO } from "../../dto/GeoDTO";
import { EndTrackingSessionInput, EndTrackingSessionUseCase } from "../UseCaseContracts";

export class EndTrackingSession implements EndTrackingSessionUseCase {
  constructor(private readonly trackingSessionRepository: TrackingSessionRepository) {}

  async execute(input: EndTrackingSessionInput): Promise<TrackingSessionDTO> {
    const session = await this.trackingSessionRepository.findById(input.trackingSessionId);
    if (!session) throw new TrackingSessionNotFoundError(input.trackingSessionId);
    if (!session.belongsToPersona(input.personaId)) {
      throw new OwnershipMismatchError(`geo_tracking_sessions:${input.trackingSessionId}`);
    }

    session.end();
    await this.trackingSessionRepository.save(session);

    // Evento de dominio TrackingSessionEnded (GEO-01 S11).
    return TrackingSessionMapper.toDTO(session);
  }
}
