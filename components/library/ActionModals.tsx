"use client";

import { useEffect, useState } from "react";
import type { LibraryDocument, LibraryFolder, RepositoryType } from "@/lib/library/types";
import { linkDocument, updateDocument, updateFolder } from "@/lib/library/client";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Button from "@/components/Button";
import FolderTree from "./FolderTree";

// ── Renombrar (documento o carpeta) ────────────────────────────

interface RenameModalProps {
  target: { kind: "document"; item: LibraryDocument } | { kind: "folder"; item: LibraryFolder } | null;
  onClose: () => void;
  onDone: () => void;
}

export function RenameModal({ target, onClose, onDone }: RenameModalProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const targetId = target?.item.id ?? null;

  // Reinicia el valor cada vez que cambia el target (por identidad, no por contenido —
  // así no pisa lo que el usuario esté escribiendo, incluido si lo vacía a propósito).
  useEffect(() => {
    if (target) setValue(target.kind === "document" ? target.item.title : target.item.nombre);
  }, [targetId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (!target || !value.trim()) return;
    setSaving(true);
    setError(null);
    const res =
      target.kind === "document"
        ? await updateDocument(target.item.id, { title: value.trim() })
        : await updateFolder(target.item.id, { nombre: value.trim() });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone();
    onClose();
  }

  return (
    <Modal open={!!target} onClose={onClose} title="Renombrar">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        <Input value={value} onChange={(e) => setValue(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Mover documento ─────────────────────────────────────────────

interface MoveModalProps {
  document: LibraryDocument | null;
  repositoryType: RepositoryType;
  onClose: () => void;
  onDone: () => void;
}

export function MoveModal({ document, repositoryType, onClose, onDone }: MoveModalProps) {
  const [destination, setDestination] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const documentId = document?.id ?? null;

  // Arranca en la carpeta actual del documento, no siempre en la raíz —
  // y se resetea por identidad para no arrastrar la selección del
  // documento anterior si se abre el modal dos veces seguidas.
  useEffect(() => {
    if (document) setDestination(document.folder_id);
  }, [documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (!document) return;
    setSaving(true);
    setError(null);
    const res = await updateDocument(document.id, { folder_id: destination });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone();
    onClose();
  }

  return (
    <Modal open={!!document} onClose={onClose} title={`Mover "${document?.title ?? ""}"`}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        <div className="max-h-72 overflow-y-auto rounded-xl border border-navy-100 p-2">
          <FolderTree repositoryType={repositoryType} currentFolderId={destination} onSelect={setDestination} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Mover acá
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Vincular documento a una entidad de FACILIA ─────────────────

interface LinkModalProps {
  document: LibraryDocument | null;
  onClose: () => void;
  onDone: () => void;
}

const ENTITY_TYPE_HINTS = ["organizacion", "persona", "lead", "cotizacion", "ticket"];

export function LinkModal({ document, onClose, onDone }: LinkModalProps) {
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleClose() {
    setEntityType("");
    setEntityId("");
    setError(null);
    setSuccess(false);
    onClose();
  }

  async function handleSubmit() {
    if (!document || !entityType.trim() || !entityId.trim()) {
      setError("Completá el tipo y el ID de la entidad.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await linkDocument({ document_id: document.id, entity_type: entityType.trim(), entity_id: entityId.trim() });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSuccess(true);
    onDone();
  }

  return (
    <Modal open={!!document} onClose={handleClose} title={`Vincular "${document?.title ?? ""}"`}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2">Documento vinculado.</p>}
        <Input
          label="Tipo de entidad"
          placeholder="ej. organizacion, persona, lead..."
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          list="entity-type-hints"
        />
        <datalist id="entity-type-hints">
          {ENTITY_TYPE_HINTS.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
        <Input label="ID de la entidad" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Cerrar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Vincular
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Confirmación genérica de borrado ────────────────────────────

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
}

export function ConfirmDeleteModal({ open, title, description, onClose, onConfirm }: ConfirmDeleteModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    const res = await onConfirm();
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo eliminar.");
      return;
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        <p className="text-sm text-ink/70">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={saving}>
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
