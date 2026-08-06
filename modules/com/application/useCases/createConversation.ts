import { PersonaNotFoundError } from "../../domain/errors";
import type { ConversationRepository, PersonaDirectoryPort } from "../../domain/ports/repositories";
import type { Conversation } from "../../domain/entities";
import type { CreateConversationInput } from "../dto";

/**
 * Crea el contexto operativo de una conversación (Orden + Empleado +
 * WhatsApp, ver COM-00 §8). No depende de Operations: work_order_id es
 * un dato suelto que, si no se pasa, deja la conversación sin atar a
 * ninguna orden (útil para probar el módulo vía API interna mientras
 * Operations no existe — ver nota de arquitectura de COM-01).
 */
export class CreateConversationUseCase {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly personas: PersonaDirectoryPort
  ) {}

  async execute(input: CreateConversationInput): Promise<Conversation> {
    const persona = await this.personas.findById(input.personaId);
    if (!persona) throw new PersonaNotFoundError(input.personaId);

    return this.conversations.create({
      persona_id: persona.id,
      organizacion_id: input.organizacionId ?? persona.organizacion_id ?? null,
      work_order_id: input.workOrderId ?? null,
      created_by: input.createdBy,
    });
  }
}
