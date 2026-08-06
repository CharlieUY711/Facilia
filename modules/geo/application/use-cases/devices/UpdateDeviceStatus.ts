import { DeviceRepository } from "../../../domain/repositories/DeviceRepository";
import { DeviceStatus } from "../../../domain/value-objects/DeviceStatus";
import { DeviceNotFoundError } from "../../../domain/errors/GeoErrors";
import { DeviceMapper } from "../../../infrastructure/mappers/DeviceMapper";
import { DeviceDTO } from "../../dto/GeoDTO";
import { UpdateDeviceStatusInput, UpdateDeviceStatusUseCase } from "../UseCaseContracts";

export class UpdateDeviceStatus implements UpdateDeviceStatusUseCase {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  async execute(input: UpdateDeviceStatusInput): Promise<DeviceDTO> {
    const device = await this.deviceRepository.findById(input.deviceId);
    if (!device) throw new DeviceNotFoundError(input.deviceId);

    device.updateStatus(DeviceStatus.fromString(input.status), input.requestedBy);
    await this.deviceRepository.save(device);
    return DeviceMapper.toDTO(device);
  }
}
