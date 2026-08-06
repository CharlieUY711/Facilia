import { PresenceEventType } from "../value-objects/PresenceEventType";

export interface PresenceEventProps {
  id: string;
  personaId: string;
  deviceId: string;
  geofenceId: string;
  trackingSessionId: string;
  locationRecordId: string | null;
  type: PresenceEventType;
  occurredAt: Date;
  createdAt: Date;
}

/**
 * Evento discreto e inmutable (entrada/salida/permanencia) generado por el
 * motor de geocercas (GEO-05) a partir de una maquina de estados
 * OUTSIDE -> ENTERING -> INSIDE -> LEAVING. No se edita una vez creado.
 */
export class PresenceEvent {
  private constructor(private readonly props: PresenceEventProps) {}

  static create(props: {
    id: string;
    personaId: string;
    deviceId: string;
    geofenceId: string;
    trackingSessionId: string;
    locationRecordId?: string | null;
    type: PresenceEventType;
    occurredAt: Date;
  }): PresenceEvent {
    return new PresenceEvent({
      id: props.id,
      personaId: props.personaId,
      deviceId: props.deviceId,
      geofenceId: props.geofenceId,
      trackingSessionId: props.trackingSessionId,
      locationRecordId: props.locationRecordId ?? null,
      type: props.type,
      occurredAt: props.occurredAt,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: PresenceEventProps): PresenceEvent {
    return new PresenceEvent(props);
  }

  get id(): string {
    return this.props.id;
  }
  get personaId(): string {
    return this.props.personaId;
  }
  get geofenceId(): string {
    return this.props.geofenceId;
  }
  get trackingSessionId(): string {
    return this.props.trackingSessionId;
  }
  get type(): PresenceEventType {
    return this.props.type;
  }
  get occurredAt(): Date {
    return this.props.occurredAt;
  }

  toProps(): PresenceEventProps {
    return { ...this.props };
  }
}
