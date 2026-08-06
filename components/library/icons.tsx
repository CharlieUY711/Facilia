import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 };

export function IconFolder(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        d="M3.5 6.5A1.5 1.5 0 015 5h4.2c.4 0 .77.16 1.06.44l1.1 1.06H19A1.5 1.5 0 0120.5 8v9.5A1.5 1.5 0 0119 19H5a1.5 1.5 0 01-1.5-1.5v-11z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconFolderOpen(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 8.5V6.5A1.5 1.5 0 015 5h4.2c.4 0 .77.16 1.06.44l1.1 1.06H19a1.5 1.5 0 011.45 1.87l-1.6 6.3A2 2 0 0116.9 16H5.6a2 2 0 01-1.94-1.53l-.16-.63" strokeLinejoin="round" />
      <path d="M2.2 8.5h18.3a1 1 0 01.97 1.24l-1.62 6.3A2 2 0 0117.9 17.5H5.6a2 2 0 01-1.94-1.53L1.24 9.7A1 1 0 012.2 8.5z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 19V5a1.5 1.5 0 011-1.5z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4.5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 15.5V4.5M12 4.5L7.5 9M12 4.5L16.5 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15.5V18a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5v-2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4.5v11M12 15.5L7.5 11M12 15.5L16.5 11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15.5V18a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5v-2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5h16M7 12h10M10.5 18.5h3" strokeLinecap="round" />
    </svg>
  );
}

export function IconMore(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 9l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0111 4h2a1.5 1.5 0 011.5 1.5V7M18 7l-.7 11.2a2 2 0 01-2 1.8H8.7a2 2 0 01-2-1.8L6 7"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLink(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 14.5l5-5M8 15.5l-1.6 1.6a3 3 0 01-4.24-4.24L4 11.24M16 8.5l1.6-1.6a3 3 0 00-4.24-4.24L11.76 4.24"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

/** Devuelve un emoji simple según extensión — evita mantener un set completo de íconos por tipo de archivo. */
export function fileEmoji(extension: string | null): string {
  const ext = (extension ?? "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📕";
  if (["doc", "docx"].includes(ext)) return "📘";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📗";
  if (["ppt", "pptx"].includes(ext)) return "📙";
  if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
  if (["mp4", "mov", "avi"].includes(ext)) return "🎞️";
  if (["mp3", "wav"].includes(ext)) return "🎵";
  return "📄";
}
