export type Role = "super_admin" | "admin" | "colaborador" | "personal" | "usuario";

/**
 * Jerarquía de roles: a mayor número, más privilegios. Se usa para
 * decidir quién puede asignar qué rol a quién (ver ROLE_LEVEL abajo).
 * Super Admin queda fuera de esta comparación en los chequeos: tiene
 * permiso incondicional sobre cualquier persona/rol (ver los usos de
 * `auth.role === "super_admin"` en las API routes de /api/personas).
 */
export const ROLE_LEVEL: Record<Role, number> = {
  super_admin: 4,
  admin: 3,
  colaborador: 2,
  personal: 1,
  usuario: 0,
};

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
        titulo: "Directorio",
        descripcion: "Organizaciones, personas y locaciones. Accesos y roles de todo el equipo FACILIA.",
        href: "/dashboard/usuarios",
        icon: "👥",
      },
      {
        key: "personal",
        titulo: "Recursos Humanos",
        descripcion: "Legajos del equipo: documentos, evolución, tareas y comunicados.",
        href: "/dashboard/personal",
        icon: "🗂️",
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
        titulo: "Directorio",
        descripcion: "Organizaciones, personas y locaciones. Accesos y roles del equipo.",
        href: "/dashboard/usuarios",
        icon: "👥",
      },
      {
        key: "personal",
        titulo: "Recursos Humanos",
        descripcion: "Legajos del equipo: documentos, evolución, tareas y comunicados.",
        href: "/dashboard/personal",
        icon: "🗂️",
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
        descripcion: "Tus datos, documentos, evolución, tareas y comunicados.",
        href: "/dashboard/mi-legajo",
        icon: "🗂️",
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
