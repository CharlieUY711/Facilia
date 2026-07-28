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
      href: "/cotizador",
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
        key: "comercial",
        titulo: "Configuración Comercial",
        descripcion: "Catálogos, tarifas, costos internos y planes del motor comercial.",
        href: "/dashboard/comercial",
        icon: "🧭",
      },
      {
        key: "usuarios",
        titulo: "Usuarios y roles",
        descripcion: "Gestión de accesos y roles de todo el equipo FACILIA.",
        href: "/dashboard/usuarios",
        icon: "👥",
      },
      {
        key: "reportes",
        titulo: "Reportes",
        descripcion: "Indicadores de servicio y desempeño.",
        icon: "📊",
      },
    ];
  }

  if (role === "admin" || role === "colaborador") {
    return [
      {
        key: "panel",
        titulo: "Panel de leads",
        descripcion: "Presupuestos generados, estado y seguimiento comercial.",
        href: "/panel",
        icon: "📋",
      },
      ...comunes,
      // "Configuración Comercial" solo para admin — colaborador no gestiona
      // catálogos/tarifas/planes (ver COMMERCIAL_ENGINE_DESIGN.md, sección 6).
      ...(role === "admin"
        ? [
            {
              key: "comercial",
              titulo: "Configuración Comercial",
              descripcion: "Catálogos, tarifas y planes del motor comercial.",
              href: "/dashboard/comercial",
              icon: "🧭",
            } as DashboardItem,
          ]
        : []),
      {
        key: "usuarios",
        titulo: "Usuarios y roles",
        descripcion: "Gestión de accesos del equipo FACILIA.",
        icon: "👥",
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
        key: "tareas",
        titulo: "Mis tareas",
        descripcion: "Servicios y visitas asignadas.",
        icon: "🧹",
      },
      {
        key: "reportes-personal",
        titulo: "Mis reportes",
        descripcion: "Registro de tareas completadas.",
        icon: "📝",
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
