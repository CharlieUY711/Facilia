import { Device } from "../../domain/entities/Device";
import { DeviceStatus } from "../../domain/value-objects/DeviceStatus";
import { DeviceDTO } from "../../application/dto/GeoDTO";

export interface GeoDeviceRow {
  id: string;
  persona_id: string;
  device_identifier: string;
  label: string | null;
  modelo: string | null;
  sistema_operativo: string | null;
  navegador: string | null;
  app_version: string | null;
  status: string;
  last_connection_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export class DeviceMapper {
  static toDomain(row: GeoDeviceRow): Device {
    return Device.reconstitute({
      id: row.id,
      personaId: row.persona_id,
      deviceIdentifier: row.device_identifier,
      label: row.label,
      modelo: row.modelo,
      sistemaOperativo: row.sistema_operativo,
      navegador: row.navegador,
      appVersion: row.app_version,
      status: DeviceStatus.fromString(row.status),
      lastConnectionAt: row.last_connection_at ? new Date(row.last_connection_at) : null,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  static toRow(device: Device): Omit<GeoDeviceRow, "created_at" | "updated_at"> {
    const props = device.toProps();
    return {
      id: props.id,
      persona_id: props.personaId,
      device_identifier: props.deviceIdentifier,
      label: props.label,
      modelo: props.modelo,
      sistema_operativo: props.sistemaOperativo,
      navegador: props.navegador,
      app_version: props.appVersion,
      status: props.status.toString(),
      last_connection_at: props.lastConnectionAt ? props.lastConnectionAt.toISOString() : null,
      created_by: props.createdBy,
      updated_by: props.updatedBy,
    };
  }

  static toDTO(device: Device): DeviceDTO {
    const props = device.toProps();
    return {
      id: props.id,
      personaId: props.personaId,
      deviceIdentifier: props.deviceIdentifier,
      label: props.label,
      modelo: props.modelo,
      sistemaOperativo: props.sistemaOperativo,
      status: props.status.toString(),
      lastConnectionAt: props.lastConnectionAt ? props.lastConnectionAt.toISOString() : null,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  }
}
