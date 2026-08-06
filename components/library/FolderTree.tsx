"use client";

import { useEffect, useState } from "react";
import type { LibraryFolder, RepositoryType } from "@/lib/library/types";
import { fetchFolders } from "@/lib/library/client";
import { IconChevronRight, IconFolder, IconFolderOpen } from "./icons";

interface FolderTreeProps {
  repositoryType: RepositoryType;
  currentFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  /** Se incrementa desde el padre para forzar un refetch de la raíz (ej. tras crear/mover/borrar carpetas). */
  refreshKey?: number;
}

export default function FolderTree({ repositoryType, currentFolderId, onSelect, refreshKey }: FolderTreeProps) {
  const [rootFolders, setRootFolders] = useState<LibraryFolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFolders({ repositoryType, parentFolderId: null }).then((res) => {
      if (cancelled) return;
      if (res.ok) setRootFolders(res.folders);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [repositoryType, refreshKey]);

  return (
    <div className="text-sm">
      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
          currentFolderId === null ? "bg-navy-50 text-navy font-medium" : "text-ink/70 hover:bg-navy-50/60"
        }`}
      >
        {currentFolderId === null ? <IconFolderOpen className="w-4 h-4 shrink-0" /> : <IconFolder className="w-4 h-4 shrink-0" />}
        Raíz
      </button>

      {loading ? (
        <p className="px-2.5 py-2 text-xs text-ink/30">Cargando...</p>
      ) : (
        // key={refreshKey} fuerza un remount completo del árbol al refrescar,
        // así los nodos ya expandidos no se quedan con hijos en caché stale
        // después de renombrar/mover/borrar una subcarpeta.
        <div className="mt-0.5" key={refreshKey}>
          {rootFolders.map((f) => (
            <TreeNode
              key={f.id}
              folder={f}
              depth={0}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
              repositoryType={repositoryType}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeNode({
  folder,
  depth,
  currentFolderId,
  onSelect,
  repositoryType,
}: {
  folder: LibraryFolder;
  depth: number;
  currentFolderId: string | null;
  onSelect: (id: string | null) => void;
  repositoryType: RepositoryType;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<LibraryFolder[] | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const isActive = currentFolderId === folder.id;

  async function toggleExpand(e: React.MouseEvent) {
    e.stopPropagation();
    if (!expanded && children === null) {
      setLoadingChildren(true);
      const res = await fetchFolders({ repositoryType, parentFolderId: folder.id });
      setChildren(res.ok ? res.folders : []);
      setLoadingChildren(false);
    }
    setExpanded((v) => !v);
  }

  return (
    <div>
      <div
        onClick={() => onSelect(folder.id)}
        className={`flex items-center gap-1 px-1 py-1.5 rounded-lg cursor-pointer transition-colors ${
          isActive ? "bg-navy-50 text-navy font-medium" : "text-ink/70 hover:bg-navy-50/60"
        }`}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <button
          onClick={toggleExpand}
          className="p-0.5 shrink-0 text-ink/30 hover:text-ink/60"
          aria-label={expanded ? "Contraer" : "Expandir"}
        >
          <IconChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
        {isActive ? <IconFolderOpen className="w-4 h-4 shrink-0" /> : <IconFolder className="w-4 h-4 shrink-0" />}
        <span className="truncate">{folder.nombre}</span>
      </div>

      {expanded && (
        <div>
          {loadingChildren && <p className="text-xs text-ink/30" style={{ paddingLeft: 32 + depth * 16 }}>Cargando...</p>}
          {children?.map((c) => (
            <TreeNode
              key={c.id}
              folder={c}
              depth={depth + 1}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
              repositoryType={repositoryType}
            />
          ))}
          {children && children.length === 0 && !loadingChildren && (
            <p className="text-xs text-ink/30" style={{ paddingLeft: 32 + depth * 16 }}>
              Vacía
            </p>
          )}
        </div>
      )}
    </div>
  );
}
