import { createServiceClient } from "@/lib/supabase/server";
import type { PersonaRef } from "../../domain/entities";
import type { PersonaDirectoryPort } from "../../domain/ports/repositories";

const TABLE = "personas";

/** Deja solo dígitos — para comparar teléfonos sin depender de cómo se hayan tipeado (+598, espacios, guiones). */
function onlyDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Lee la tabla `personas` de Directory. COM nunca escribe acá — es
 * lectura pura para resolver a quién le llegó un WhatsApp (ver COM-01
 * §3: Directory sigue siendo dueño de personas/teléfonos).
 */
export class SupabasePersonaDirectoryRepository implements PersonaDirectoryPort {
  async findById(id: string): Promise<PersonaRef | null> {
    const service = createServiceClient();
    const { data, error } = await service
      .from(TABLE)
      .select("id, organizacion_id, nombre, telefono")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`[com] error al buscar persona: ${error.message}`);
    return (data as PersonaRef | null) ?? null;
  }

  async findByTelefono(telefono: string): Promise<PersonaRef | null> {
    const service = createServiceClient();

    // 1) Intento directo — cubre el caso común de que el teléfono esté
    // guardado igual que como lo manda Twilio (E.164).
    const exact = await service
      .from(TABLE)
      .select("id, organizacion_id, nombre, telefono")
      .eq("telefono", telefono)
      .maybeSingle();
    if (exact.error) throw new Error(`[com] error al buscar persona por teléfono: ${exact.error.message}`);
    if (exact.data) return exact.data as PersonaRef;

    // 2) Fallback normalizado por dígitos — cubre variantes de formato
    // (espacios, guiones, con/sin "+"). No escala a un padrón enorme,
    // pero es razonable para el volumen esperado en esta etapa; queda
    // anotado como candidato a mejora (columna telefono_normalizado)
    // si Directory crece mucho.
    const digits = onlyDigits(telefono);
    if (!digits) return null;

    const { data, error } = await service.from(TABLE).select("id, organizacion_id, nombre, telefono").not(
      "telefono",
      "is",
      null
    );
    if (error) throw new Error(`[com] error al listar personas para matching de teléfono: ${error.message}`);

    const match = (data ?? []).find((row: { telefono: string | null }) => {
      if (!row.telefono) return false;
      const rowDigits = onlyDigits(row.telefono);
      return rowDigits === digits || rowDigits.endsWith(digits) || digits.endsWith(rowDigits);
    });

    return (match as PersonaRef | undefined) ?? null;
  }
}
