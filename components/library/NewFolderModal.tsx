"use client";

import { useState } from "react";
import type { RepositoryType } from "@/lib/library/types";
import { createFolder } from "@/lib/library/client";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import Button from "@/components/Button";

interface NewFolderModalProps {
  open: boolean;
  onClose: () => void;
  repositoryType: RepositoryType;
  parentFolderId: string | null;
  organizacionId?: string | null;
  onCreated: () => void;
}

export default function NewFolderModal({
  open,
  onClose,
  repositoryType,
  parentFolderId,
  organizacionId,
  onCreated,
}: NewFolderModalProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setNombre("");
    setDescripcion("");
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!nombre.trim()) {
      setError("Ponele un nombre a la carpeta.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await createFolder({
      repository_type: repositoryType,
      nombre: nombre.trim(),
      parent_folder_id: parentFolderId,
      organizacion_id: organizacionId ?? null,
      descripcion: descripcion.trim() || null,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onCreated();
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nueva carpeta">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Textarea
          label="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Crear carpeta
          </Button>
        </div>
      </div>
    </Modal>
  );
}
