import type { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseDeviceRepository } from "../../infrastructure/supabase/SupabaseDeviceRepository";
import { SupabaseTrackingSessionRepository } from "../../infrastructure/supabase/SupabaseTrackingSessionRepository";
import { SupabaseLocationRepository } from "../../infrastructure/supabase/SupabaseLocationRepository";
import { SupabaseGeofenceRepository } from "../../infrastructure/supabase/SupabaseGeofenceRepository";
import { SupabasePresenceEventRepository } from "../../infrastructure/supabase/SupabasePresenceEventRepository";
import { SupabaseLocationValidationRepository } from "../../infrastructure/supabase/SupabaseLocationValidationRepository";
import { SupabasePersonaDirectoryReader } from "../../infrastructure/supabase/PersonaDirectoryReader";

import { RegisterDevice } from "../../application/use-cases/devices/RegisterDevice";
import { UpdateDeviceStatus } from "../../application/use-cases/devices/UpdateDeviceStatus";
import { StartTrackingSession } from "../../application/use-cases/tracking/StartTrackingSession";
import { EndTrackingSession } from "../../application/use-cases/tracking/EndTrackingSession";
import { RecordLocation } from "../../application/use-cases/locations/RecordLocation";
import { CreateGeofence } from "../../application/use-cases/geofences/CreateGeofence";
import { UpdateGeofence } from "../../application/use-cases/geofences/UpdateGeofence";
import { SetGeofenceStatus } from "../../application/use-cases/geofences/SetGeofenceStatus";
import { DetectPresence } from "../../application/use-cases/presence/DetectPresence";
import { ValidateLocation } from "../../application/use-cases/validation/ValidateLocation";

/**
 * Container liviano de casos de uso del modulo GEO. Los endpoints (bajo
 * app/api/geo/**) NUNCA acceden a los repositorios Supabase directamente:
 * siempre obtienen un caso de uso desde aqui, igual criterio que
 * modules/library/presentation/api/_container.ts.
 *
 * A diferencia de Library, este container SI se importa desde archivos
 * route.ts reales bajo app/api/geo/** (ver GEO-02 "Contexto"): la capa
 * Clean Architecture de GEO queda efectivamente conectada al router de
 * Next.js.
 */
export function buildGeoContainer(supabase: SupabaseClient) {
  const deviceRepository = new SupabaseDeviceRepository(supabase);
  const trackingSessionRepository = new SupabaseTrackingSessionRepository(supabase);
  const locationRepository = new SupabaseLocationRepository(supabase);
  const geofenceRepository = new SupabaseGeofenceRepository(supabase);
  const presenceEventRepository = new SupabasePresenceEventRepository(supabase);
  const locationValidationRepository = new SupabaseLocationValidationRepository(supabase);
  const personaDirectoryReader = new SupabasePersonaDirectoryReader(supabase);

  return {
    repositories: {
      deviceRepository,
      trackingSessionRepository,
      locationRepository,
      geofenceRepository,
      presenceEventRepository,
      locationValidationRepository,
    },
    devices: {
      registerDevice: new RegisterDevice(deviceRepository, personaDirectoryReader),
      updateDeviceStatus: new UpdateDeviceStatus(deviceRepository),
    },
    tracking: {
      startTrackingSession: new StartTrackingSession(trackingSessionRepository, deviceRepository, personaDirectoryReader),
      endTrackingSession: new EndTrackingSession(trackingSessionRepository),
    },
    locations: {
      recordLocation: new RecordLocation(locationRepository, trackingSessionRepository),
    },
    geofences: {
      createGeofence: new CreateGeofence(geofenceRepository),
      updateGeofence: new UpdateGeofence(geofenceRepository),
      setGeofenceStatus: new SetGeofenceStatus(geofenceRepository),
    },
    presence: {
      detectPresence: new DetectPresence(locationRepository, geofenceRepository, presenceEventRepository),
    },
    validation: {
      validateLocation: new ValidateLocation(locationValidationRepository, presenceEventRepository),
    },
  };
}

export type GeoContainer = ReturnType<typeof buildGeoContainer>;
