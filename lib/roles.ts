export type Role = "super_admin" | "admin" | "colaborador" | "personal" | "usuario";

export interface DashboardItem {
  key: string;
  titulo: string;
  descripcion: string;
  href?: string; // si no tiene href, se muestra como "Próximamente"
  icon: string;
}

/**
 * Qué tarjetas ve cada rol en /dashboard. El Panel de leads es una
 * tarjeta más (solo visible para super_admin/admin/colaborador), no una
 * pantalla aparte.
 *
 * Roles:
 * - super_admin: acceso total, incluida la configuración y gestión de
 *   usuarios/roles (ej. cvaralla@gmail.com).
 * - admin / colaborador: personal de FACILIA autorizado. Ven el panel
 *   comercial de leads pero no la gestión de usuarios.
 * - personal ("Funcionario"): acceso a su área personal (tareas propias).
 * - usuario ("Cliente"): acceso a sus propios presupuestos.
 */
export function dashboardItemsForRole(role: Role): DashboardItem[] {
  const comunes: DashboardItem[] = [
    {
      key: "cotizador",
      titulo: "Nueva cotización",
      descripcion: "Generá un presupuesto para un cliente.",
      href: "/dashboard/cotizador",
      icon: "🧮",
    },
  ];

  if (role === "super_admin") {
    return [
      {
        key: "panel",
        titulo: "Panel de leads",
        descripcion: "Presupuestos generados, estado y seguimiento comercial.",
        href: "/panel",
        icon: "📋",
      },
      ...comunes,
      {
        key: "directorio",
        titulo: "Personas y Empresas",
        descripcion: "Organizaciones, personas y locaciones. Accesos y roles de todo el equipo FACILIA.",
        href: "/dashboard/usuarios",
        icon: "👥",
      },
      {
        key: "rrhh",
        titulo: "Recursos Humanos",
        descripcion: "Legajos del personal: evolución, tareas, comunicados y documentación.",
        href: "/dashboard/personal",
        icon: "🧑‍💼",
      },
      {
        key: "biblioteca",
        titulo: "Biblioteca",
        descripcion: "Documentos y carpetas de la biblioteca pública y privada.",
        href: "/dashboard/biblioteca",
        icon: "📚",
      },
      {
        key: "reportes",
        titulo: "Reportes",
        descripcion: "Indicadores de servicio y desempeño.",
        icon: "📊",
      },
      {
        key: "cotizador-config",
        titulo: "Cotizador FACILIA",
        descripcion: "Variables, opciones y reglas del motor de presupuestos.",
        href: "/panel/configuracion/cotizador",
        icon: "⚙️",
      },
    ];
  }

  if (role === "admin") {
    return [
      {
        key: "panel",
        titulo: "Panel de leads",
        descripcion: "Presupuestos generados, estado y seguimiento comercial.",
        href: "/panel",
        icon: "📋",
      },
      ...comunes,
      {
        key: "directorio",
        titulo: "Personas y Empresas",
        descripcion: "Organizaciones, personas y locaciones. Accesos y roles del equipo.",
        href: "/dashboard/usuarios",
        icon: "👥",
      },
      {
        key: "rrhh",
        titulo: "Recursos Humanos",
        descripcion: "Legajos del personal: evolución, tareas, comunicados y documentación.",
        href: "/dashboard/personal",
        icon: "🧑‍💼",
      },
      {
        key: "biblioteca",
        titulo: "Biblioteca",
        descripcion: "Documentos y carpetas de la biblioteca pública y privada.",
        href: "/dashboard/biblioteca",
        icon: "📚",
      },
      {
        key: "reportes",
        titulo: "Reportes",
        descripcion: "Indicadores de servicio y desempeño.",
        icon: "📊",
      },
    ];
  }

  if (role === "colaborador") {
    return [
      {
        key: "panel",
        titulo: "Panel de leads",
        descripcion: "Presupuestos generados, estado y seguimiento comercial.",
        href: "/panel",
        icon: "📋",
      },
      ...comunes,
      {
        key: "biblioteca",
        titulo: "Biblioteca",
        descripcion: "Documentos y carpetas de la biblioteca pública.",
        href: "/dashboard/biblioteca",
        icon: "📚",
      },
      {
        key: "reportes",
        titulo: "Reportes",
        descripcion: "Indicadores de servicio y desempeño.",
        icon: "📊",
      },
    ];
  }

  if (role === "personal") {
    return [
      {
        key: "mi-legajo",
        titulo: "Mi legajo",
        descripcion: "Tu evolución, tareas asignadas, comunicados y documentación.",
        href: "/dashboard/mi-legajo",
        icon: "🧑‍💼",
      },
    ];
  }

  // usuario (cliente final)
  return [
    ...comunes,
    {
      key: "mis-presupuestos",
      titulo: "Mis presupuestos",
      descripcion: "Historial de cotizaciones solicitadas.",
      icon: "📄",
    },
  ];
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  colaborador: "Colaborador",
  personal: "Funcionario",
  usuario: "Cliente",
};
