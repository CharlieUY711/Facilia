import { LocationValidation } from "../entities/LocationValidation";
import { ExternalTaskType } from "../value-objects/ExternalTaskReference";

export interface LocationValidationFilters {
  personaId?: string;
  result?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface LocationValidationRepository {
  save(validation: LocationValidation): Promise<void>;
  findById(id: string): Promise<LocationValidation | null>;
  findByTaskReference(taskType: ExternalTaskType, taskId: string): Promise<LocationValidation[]>;
  findMany(filters: LocationValidationFilters): Promise<{ items: LocationValidation[]; total: number }>;
}
