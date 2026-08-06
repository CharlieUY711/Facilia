"use client";

import type { LibraryFolder } from "@/lib/library/types";
import { IconChevronRight } from "./icons";

interface BreadcrumbProps {
  repositoryLabel: string;
  ancestors: LibraryFolder[];
  onNavigate: (folderId: string | null) => void;
}

// Migas de pan: "Biblioteca pública" (raíz) > carpeta > subcarpeta > ...
export default function Breadcrumb({ repositoryLabel, ancestors, onNavigate }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-1.5 text-sm flex-wrap">
      <button
        onClick={() => onNavigate(null)}
        className={`px-2 py-1 rounded-lg hover:bg-navy-50 transition-colors ${
          ancestors.length === 0 ? "font-semibold text-navy" : "text-ink/60"
        }`}
      >
        {repositoryLabel}
      </button>
      {ancestors.map((folder, i) => (
        <span key={folder.id} className="flex items-center gap-1.5">
          <IconChevronRight className="w-3.5 h-3.5 text-ink/30 shrink-0" />
          <button
            onClick={() => onNavigate(folder.id)}
            className={`px-2 py-1 rounded-lg hover:bg-navy-50 transition-colors max-w-[220px] truncate ${
              i === ancestors.length - 1 ? "font-semibold text-navy" : "text-ink/60"
            }`}
            title={folder.nombre}
          >
            {folder.nombre}
          </button>
        </span>
      ))}
    </div>
  );
}
