import { createServiceClient } from "@/lib/supabase/server";
import type { DeliveryRecord } from "../../domain/entities";
import type { CreateDeliveryRecordData, DeliveryRepository } from "../../domain/ports/repositories";

const TABLE = "com_delivery_records";

export class SupabaseDeliveryRepository implements DeliveryRepository {
  async create(data: CreateDeliveryRecordData): Promise<DeliveryRecord> {
    const service = createServiceClient();
    const { data: row, error } = await service
      .from(TABLE)
      .insert({
        message_id: data.message_id,
        proveedor: data.proveedor,
        estado: data.estado,
        error_code: data.error_code ?? null,
        raw_payload: data.raw_payload ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(`[com] error al crear registro de entrega: ${error.message}`);
    return row as DeliveryRecord;
  }

  async findLatestByMessage(messageId: string): Promise<DeliveryRecord | null> {
    const service = createServiceClient();
    const { data, error } = await service
      .from(TABLE)
      .select("*")
      .eq("message_id", messageId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`[com] error al buscar último registro de entrega: ${error.message}`);
    return (data as DeliveryRecord | null) ?? null;
  }
}
