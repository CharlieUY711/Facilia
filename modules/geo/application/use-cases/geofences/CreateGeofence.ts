import { randomUUID } from "crypto";
import { Geofence } from "../../../domain/entities/Geofence";
import { GeofenceRepository } from "../../../domain/repositories/GeofenceRepository";
import { Coordinates } from "../../../domain/value-objects/Coordinates";
import { GeoRadius } from "../../../domain/value-objects/GeoRadius";
import { GeofenceType } from "../../../domain/value-objects/GeofenceType";
import { GeofenceMapper } from "../../../infrastructure/mappers/GeofenceMapper";
import { GeofenceDTO } from "../../dto/GeoDTO";
import { CreateGeofenceInput, CreateGeofenceUseCase } from "../UseCaseContracts";

export class CreateGeofence implements CreateGeofenceUseCase {
  constructor(private readonly geofenceRepository: GeofenceRepository) {}

  async execute(input: CreateGeofenceInput): Promise<GeofenceDTO> {
    const name = input.name?.trim();
    if (!name) throw new Error("El nombre de la geocerca es requerido");

    const geofence = Geofence.create({
      id: randomUUID(),
      name,
      type: GeofenceType.fromString(input.type),
      externalLocationId: input.externalLocationId,
      center: Coordinates.create({ latitude: input.latitude, longitude: input.longitude }),
      radius: GeoRadius.create(input.radiusMeters),
      createdBy: input.requestedBy,
    });

    await this.geofenceRepository.save(geofence);
    return GeofenceMapper.toDTO(geofence);
  }
}
