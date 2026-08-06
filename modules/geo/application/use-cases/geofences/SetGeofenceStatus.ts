import { GeofenceRepository } from "../../../domain/repositories/GeofenceRepository";
import { GeofenceNotFoundError } from "../../../domain/errors/GeoErrors";
import { GeofenceMapper } from "../../../infrastructure/mappers/GeofenceMapper";
import { GeofenceDTO } from "../../dto/GeoDTO";
import { SetGeofenceStatusInput, SetGeofenceStatusUseCase } from "../UseCaseContracts";

export class SetGeofenceStatus implements SetGeofenceStatusUseCase {
  constructor(private readonly geofenceRepository: GeofenceRepository) {}

  async execute(input: SetGeofenceStatusInput): Promise<GeofenceDTO> {
    const geofence = await this.geofenceRepository.findById(input.geofenceId);
    if (!geofence) throw new GeofenceNotFoundError(input.geofenceId);

    if (input.status === "ACTIVE") {
      geofence.enable(input.requestedBy);
    } else {
      geofence.disable(input.requestedBy);
    }

    await this.geofenceRepository.save(geofence);
    return GeofenceMapper.toDTO(geofence);
  }
}
