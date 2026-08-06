import { InvalidExternalTaskReferenceError } from "../errors/GeoErrors";

/**
 * Reemplaza al "WorkOrder" del prompt original (ver GEO-00 S7): FACILIA no
 * tiene todavia un modulo Operations con ordenes de trabajo. Esta
 * referencia desacoplada permite enganchar una TrackingSession o una
 * LocationValidation contra `public.rrhh_tareas` hoy, y contra un futuro
 * "WORK_ORDER" real sin modificar el dominio de GEO. No tiene FK de base
 * de datos: la existencia de `taskId` se valida en la capa de aplicacion.
 */
export type ExternalTaskType = "NONE" | "RRHH_TAREA" | "WORK_ORDER";

export interface ExternalTaskReferenceProps {
  taskType: ExternalTaskType;
  taskId: string | null;
}

export class ExternalTaskReference {
  private constructor(
    public readonly taskType: ExternalTaskType,
    public readonly taskId: string | null
  ) {}

  static none(): ExternalTaskReference {
    return new ExternalTaskReference("NONE", null);
  }

  static create(props: ExternalTaskReferenceProps): ExternalTaskReference {
    if (props.taskType === "NONE") {
      if (props.taskId) {
        throw new InvalidExternalTaskReferenceError("el tipo NONE no debe traer taskId");
      }
      return new ExternalTaskReference("NONE", null);
    }
    if (!props.taskId?.trim()) {
      throw new InvalidExternalTaskReferenceError(`el tipo ${props.taskType} requiere un taskId`);
    }
    return new ExternalTaskReference(props.taskType, props.taskId);
  }

  get isLinked(): boolean {
    return this.taskType !== "NONE";
  }
}
