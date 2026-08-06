export class GeoDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeoDomainError";
  }
}

export class InvalidCoordinatesError extends GeoDomainError {
  constructor(reason: string) {
    super(`Coordenadas invalidas: ${reason}`);
    this.name = "InvalidCoordinatesError";
  }
}

export class InvalidRadiusError extends GeoDomainError {
  constructor(reason: string) {
    super(`Radio de geocerca invalido: ${reason}`);
    this.name = "InvalidRadiusError";
  }
}

export class InvalidAccuracyError extends GeoDomainError {
  constructor(reason: string) {
    super(`Precision GPS invalida: ${reason}`);
    this.name = "InvalidAccuracyError";
  }
}

export class InvalidTrackingPeriodError extends GeoDomainError {
  constructor(reason: string) {
    super(`Periodo de tracking invalido: ${reason}`);
    this.name = "InvalidTrackingPeriodError";
  }
}

export class InvalidDeviceStatusError extends GeoDomainError {
  constructor(value: string) {
    super(`Estado de dispositivo invalido: ${value}`);
    this.name = "InvalidDeviceStatusError";
  }
}

export class InvalidTrackingSessionStatusError extends GeoDomainError {
  constructor(value: string) {
    super(`Estado de sesion de tracking invalido: ${value}`);
    this.name = "InvalidTrackingSessionStatusError";
  }
}

export class InvalidGeofenceTypeError extends GeoDomainError {
  constructor(value: string) {
    super(`Tipo de geocerca invalido: ${value}`);
    this.name = "InvalidGeofenceTypeError";
  }
}

export class InvalidGeofenceStatusError extends GeoDomainError {
  constructor(value: string) {
    super(`Estado de geocerca invalido: ${value}`);
    this.name = "InvalidGeofenceStatusError";
  }
}

export class InvalidPresenceEventTypeError extends GeoDomainError {
  constructor(value: string) {
    super(`Tipo de evento de presencia invalido: ${value}`);
    this.name = "InvalidPresenceEventTypeError";
  }
}

export class InvalidLocationValidationResultError extends GeoDomainError {
  constructor(value: string) {
    super(`Resultado de validacion invalido: ${value}`);
    this.name = "InvalidLocationValidationResultError";
  }
}

export class InvalidExternalTaskReferenceError extends GeoDomainError {
  constructor(reason: string) {
    super(`Referencia externa de tarea invalida: ${reason}`);
    this.name = "InvalidExternalTaskReferenceError";
  }
}

export class DeviceNotFoundError extends GeoDomainError {
  constructor(id: string) {
    super(`Dispositivo no encontrado: ${id}`);
    this.name = "DeviceNotFoundError";
  }
}

export class DeviceNotUsableError extends GeoDomainError {
  constructor(id: string, status: string) {
    super(`El dispositivo ${id} no esta en condiciones de operar (estado: ${status})`);
    this.name = "DeviceNotUsableError";
  }
}

export class TrackingSessionNotFoundError extends GeoDomainError {
  constructor(id: string) {
    super(`Sesion de tracking no encontrada: ${id}`);
    this.name = "TrackingSessionNotFoundError";
  }
}

export class TrackingSessionNotActiveError extends GeoDomainError {
  constructor(id: string) {
    super(`La sesion de tracking ${id} no esta activa`);
    this.name = "TrackingSessionNotActiveError";
  }
}

export class ActiveTrackingSessionAlreadyExistsError extends GeoDomainError {
  constructor(personaId: string) {
    super(`La persona ${personaId} ya tiene una sesion de tracking activa`);
    this.name = "ActiveTrackingSessionAlreadyExistsError";
  }
}

export class GeofenceNotFoundError extends GeoDomainError {
  constructor(id: string) {
    super(`Geocerca no encontrada: ${id}`);
    this.name = "GeofenceNotFoundError";
  }
}

export class PresenceEventNotFoundError extends GeoDomainError {
  constructor(id: string) {
    super(`Evento de presencia no encontrado: ${id}`);
    this.name = "PresenceEventNotFoundError";
  }
}

export class LocationValidationNotFoundError extends GeoDomainError {
  constructor(id: string) {
    super(`Validacion de ubicacion no encontrada: ${id}`);
    this.name = "LocationValidationNotFoundError";
  }
}

export class PersonaNotTrackableError extends GeoDomainError {
  constructor(personaId: string) {
    super(
      `La persona ${personaId} no es trackeable (debe ser personal_facilia, activa y con acceso al sistema)`
    );
    this.name = "PersonaNotTrackableError";
  }
}

export class LocationNotAccurateEnoughError extends GeoDomainError {
  constructor() {
    super("La precision GPS reportada es insuficiente para esta geocerca");
    this.name = "LocationNotAccurateEnoughError";
  }
}

export class OwnershipMismatchError extends GeoDomainError {
  constructor(resource: string) {
    super(`El recurso (${resource}) no pertenece a la persona solicitante`);
    this.name = "OwnershipMismatchError";
  }
}
