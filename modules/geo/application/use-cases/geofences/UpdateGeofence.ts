import { GeofenceRepository } from "../../../domain/repositories/GeofenceRepository";
import { Coordinates } from "../../../domain/value-objects/Coordinates";
import { GeoRadius } from "../../../domain/value-objects/GeoRadius";
import { GeofenceNotFoundError } from "../../../domain/errors/GeoErrors";
import { GeofenceMapper } from "../../../infrastructure/mappers/GeofenceMapper";
import { GeofenceDTO } from "../../dto/GeoDTO";
import { UpdateGeofenceInput, UpdateGeofenceUseCase } from "../UseCaseContracts";

export class UpdateGeofence implements UpdateGeofenceUseCase {
  constructor(private readonly geofenceRepository: GeofenceRepository) {}

  async execute(input: UpdateGeofenceInput): Promise<GeofenceDTO> {
    const geofence = await this.geofenceRepository.findById(input.geofenceId);
    if (!geofence) throw new GeofenceNotFoundError(input.geofenceId);

    if (input.name !== undefined) {
      geofence.rename(input.name, input.requestedBy);
    }
    if (input.latitude !== undefined || input.longitude !== undefined || input.radiusMeters !== undefined) {
      const center = Coordinates.create({
        latitude: input.latitude ?? geofence.center.latitude,
        longitude: input.longitude ?? geofence.center.longitude,
      });
      const radius = GeoRadius.create(input.radiusMeters ?? geofence.radius.meters);
      geofence.updateGeometry(center, radius, input.requestedBy);
    }

    await this.geofenceRepository.save(geofence);
    return GeofenceMapper.toDTO(geofence);
  }
}
