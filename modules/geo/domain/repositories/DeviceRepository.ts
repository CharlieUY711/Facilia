import { Device } from "../entities/Device";

export interface DeviceFilters {
  personaId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface DeviceRepository {
  save(device: Device): Promise<void>;
  findById(id: string): Promise<Device | null>;
  findByIdentifier(deviceIdentifier: string): Promise<Device | null>;
  findByPersonaId(personaId: string): Promise<Device[]>;
  findMany(filters: DeviceFilters): Promise<{ items: Device[]; total: number }>;
}
