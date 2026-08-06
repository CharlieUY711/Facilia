import { randomUUID } from "crypto";
import { Device } from "../../../domain/entities/Device";
import { DeviceRepository } from "../../../domain/repositories/DeviceRepository";
import { PersonaDirectoryReader } from "../../../infrastructure/supabase/PersonaDirectoryReader";
import { PersonaNotTrackableError } from "../../../domain/errors/GeoErrors";
import { DeviceMapper } from "../../../infrastructure/mappers/DeviceMapper";
import { DeviceDTO } from "../../dto/GeoDTO";
import { RegisterDeviceInput, RegisterDeviceUseCase } from "../UseCaseContracts";

export class RegisterDevice implements RegisterDeviceUseCase {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly personaDirectoryReader: PersonaDirectoryReader
  ) {}

  async execute(input: RegisterDeviceInput): Promise<DeviceDTO> {
    const isTrackable = await this.personaDirectoryReader.isTrackablePersona(input.personaId);
    if (!isTrackable) throw new PersonaNotTrackableError(input.personaId);

    const existing = await this.deviceRepository.findByIdentifier(input.deviceIdentifier);
    if (existing) {
      // Re-registro del mismo dispositivo (ej. reinstalacion de la PWA):
      // se reasigna a la persona indicada en vez de duplicar la fila.
      existing.reassignTo(input.personaId, input.requestedBy);
      existing.registerConnection();
      await this.deviceRepository.save(existing);
      return DeviceMapper.toDTO(existing);
    }

    const device = Device.create({
      id: randomUUID(),
      personaId: input.personaId,
      deviceIdentifier: input.deviceIdentifier,
      label: input.label,
      modelo: input.modelo,
      sistemaOperativo: input.sistemaOperativo,
      navegador: input.navegador,
      appVersion: input.appVersion,
      createdBy: input.requestedBy,
    });

    await this.deviceRepository.save(device);
    return DeviceMapper.toDTO(device);
  }
}
