"use client";

import type { DocumentFilters } from "@/lib/library/types";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Button from "@/components/Button";
import { ALLOWED_EXTENSIONS } from "@/lib/library/constants";

export interface OrgOption {
  id: string;
  nombre: string;
}

interface FiltersPanelProps {
  filters: DocumentFilters;
  onChange: (filters: DocumentFilters) => void;
  organizaciones?: OrgOption[];
  onClose: () => void;
}

export default function FiltersPanel({ filters, onChange, organizaciones, onClose }: FiltersPanelProps) {
  function set<K extends keyof DocumentFilters>(key: K, value: DocumentFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange({ repository_type: filters.repository_type, folder_id: filters.folder_id });
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 z-20 w-80 rounded-2xl border border-navy-100 bg-white shadow-soft p-4 space-y-3">
        <p className="font-display font-semibold text-navy text-sm">Filtros</p>

        <Select
          label="Extensión"
          placeholder="Todas"
          value={filters.extension ?? ""}
          onChange={(e) => set("extension", e.target.value || undefined)}
          options={ALLOWED_EXTENSIONS.map((ext) => ({ value: ext, label: ext.toUpperCase() }))}
        />

        {organizaciones && organizaciones.length > 0 && (
          <Select
            label="Organización"
            placeholder="Todas"
            value={filters.organizacion_id ?? ""}
            onChange={(e) => set("organizacion_id", e.target.value || undefined)}
            options={organizaciones.map((o) => ({ value: o.id, label: o.nombre }))}
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Desde"
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) => set("date_from", e.target.value || undefined)}
          />
          <Input
            label="Hasta"
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) => set("date_to", e.target.value || undefined)}
          />
        </div>

        <div className="flex justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Limpiar filtros
          </Button>
          <Button size="sm" onClick={onClose}>
            Listo
          </Button>
        </div>
      </div>
    </>
  );
}
