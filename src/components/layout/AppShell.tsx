import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Package,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Sparkles,
  Truck,
  UserCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type { ModuleId } from '../../types/pms';
import { DevConsoleModal } from '../common/DevConsoleModal';

interface AppShellProps {
  activeModule: ModuleId;
  onNavigate: (mod: ModuleId) => void;
  children: React.ReactNode;
}

interface SidebarGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  module?: ModuleId;
  items?: { id: ModuleId; label: string }[];
}

const CHUSPA_LOGO = '/assets/aistudio/CHUSPITA-circulo_6e5e56f2.png';

function isLightHex(hex: string | undefined): boolean {
  if (!hex || !hex.startsWith('#')) return true;
  const clean = hex.slice(1);
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return true;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55;
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: 'recepcion',
    label: 'Recepción',
    icon: <Home className="h-4 w-4" />,
    module: 'recepcion',
  },
  {
    id: 'dashboards',
    label: 'Dashboards',
    icon: <LayoutDashboard className="h-4 w-4" />,
    module: 'dashboard',
  },
  {
    id: 'habitaciones',
    label: 'Habitaciones y tarifas',
    icon: <BedDouble className="h-4 w-4" />,
    items: [
      { id: 'habitaciones_tipos', label: 'Tipo de Habitaciones' },
      { id: 'tarifa_hotelera', label: 'Tarifas por Habitación' },
      { id: 'limpieza', label: 'Control de Limpieza' },
      { id: 'mantenimientos', label: 'Registro Mantenimientos' },
    ],
  },
  {
    id: 'reservas',
    label: 'Reservas',
    icon: <CalendarDays className="h-4 w-4" />,
    items: [
      { id: 'reservas_libro', label: 'Libro de Reservas' },
      { id: 'reservas_llegadas', label: 'Llegadas' },
      { id: 'reservas_control', label: 'Control de Reservas' },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes y empresas',
    icon: <Users className="h-4 w-4" />,
    items: [
      { id: 'clientes', label: 'Gestión de clientes' },
      { id: 'agencias', label: 'Agencias y Empresas' },
      { id: 'personas_no_gratas', label: 'Personas no Gratas' },
    ],
  },
  {
    id: 'abastecimiento',
    label: 'Abastecimiento',
    icon: <Package className="h-4 w-4" />,
    items: [
      { id: 'post_venta', label: 'Post Venta (POS)' },
      { id: 'productos', label: 'Productos y Categorías' },
      { id: 'compras', label: 'Compras' },
      { id: 'inventario', label: 'Inventario y Kardex' },
      { id: 'despacho', label: 'Despacho y Movimientos' },
    ],
  },
  {
    id: 'caja',
    label: 'Caja y bancos',
    icon: <DollarSign className="h-4 w-4" />,
    items: [
      { id: 'facturacion', label: 'Facturación y Cierre' },
      { id: 'caja_gastos', label: 'Registro de Gastos' },
      { id: 'caja_bancos', label: 'Bancos y Depósitos' },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    icon: <UserCheck className="h-4 w-4" />,
    items: [
      { id: 'personal_empleados', label: 'Puestos y Trabajadores' },
      { id: 'personal_marcador', label: 'Marcador Asistencias' },
      { id: 'personal_asistencias', label: 'Informe Asistencias' },
    ],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: <BarChart3 className="h-4 w-4" />,
    items: [
      { id: 'reportes_huespedes', label: 'Libro Huéspedes' },
      { id: 'reportes_rendimiento', label: 'Rendimiento por Habitación' },
    ],
  },
  {
    id: 'servicios',
    label: 'Mis Servicios y Pagos',
    icon: <CreditCard className="h-4 w-4" />,
    module: 'servicios_pagos',
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: <Sliders className="h-4 w-4" />,
    items: [
      { id: 'configuracion_empresa', label: 'Empresa y Firebase' },
      { id: 'configuracion_diseno', label: 'Diseño y Colores' },
      { id: 'configuracion_reservas', label: 'Int. Reservas Web' },
      { id: 'configuracion_sunat', label: 'Catálogo Producto SUNAT' },
    ],
  },
  {
    id: 'seguridad',
    label: 'Seguridad',
    icon: <Shield className="h-4 w-4" />,
    items: [
      { id: 'seguridad_cuenta', label: 'Mi Cuenta' },
      { id: 'seguridad_usuarios', label: 'Acceso Usuarios' },
      { id: 'seguridad_autorizacion', label: 'Código Autorización' },
    ],
  },
  {
    id: 'contabilidad',
    label: 'Contabilidad',
    icon: <FileText className="h-4 w-4" />,
    module: 'contabilidad',
  },
  {
    id: 'soporte',
    label: 'Soporte',
    icon: <LifeBuoy className="h-4 w-4" />,
    module: 'soporte',
  },
];

const QUICK_NAV: { id: ModuleId; label: string; icon: React.ReactNode }[] = [
  { id: 'recepcion', label: 'Recepción', icon: <Home className="h-3.5 w-3.5" /> },
  { id: 'reservas_libro', label: 'Reservas', icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { id: 'facturacion', label: 'Facturación', icon: <Receipt className="h-3.5 w-3.5" /> },
  { id: 'post_venta', label: 'Post Venta', icon: <ShoppingBag className="h-3.5 w-3.5" /> },
  { id: 'limpieza', label: 'Limpieza', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'tarifa_hotelera', label: 'Tarifas', icon: <FileSpreadsheet className="h-3.5 w-3.5" /> },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { id: 'clientes', label: 'Clientes', icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'inventario', label: 'Inventario', icon: <Package className="h-3.5 w-3.5" /> },
  { id: 'compras', label: 'Compras', icon: <ShoppingCart className="h-3.5 w-3.5" /> },
  { id: 'despacho', label: 'Despacho', icon: <Truck className="h-3.5 w-3.5" /> },
  { id: 'mantenimientos', label: 'Mantenimiento', icon: <Wrench className="h-3.5 w-3.5" /> },
  { id: 'configuracion_diseno', label: 'Diseño Luxury', icon: <Palette className="h-3.5 w-3.5" /> },
];

const MODULE_LABELS: Record<ModuleId, string> = {
  recepcion: 'Recepción / Control de Suites y Habitaciones',
  dashboard: 'Dashboard y Estadísticas Generales',
  reservas_libro: 'Reservas / Libro de Reservas',
  reservas_llegadas: 'Reservas / Listado de Llegadas',
  reservas_control: 'Reservas / Control de Reservas',
  habitaciones_tipos: 'Habitaciones / Categorías Luxury',
  tarifa_hotelera: 'Habitaciones / Tarifario Oficial',
  limpieza: 'Limpieza / Gobernanza de Suites',
  mantenimientos: 'Mantenimiento de Habitaciones',
  post_venta: 'Post Venta (POS)',
  facturacion: 'Facturación, Caja y Reportes Financieros',
  caja_gastos: 'Caja y Bancos / Registro de Gastos',
  caja_bancos: 'Caja y Bancos / Depósitos Bancarios',
  clientes: 'Clientes / Huéspedes VIP y Regulares',
  agencias: 'Clientes / Agencias y Convenios Corporativos',
  personas_no_gratas: 'Clientes / Registro de Alertas',
  inventario: 'Abastecimiento / Inventario y Kardex',
  compras: 'Abastecimiento / Registro de Compras',
  productos: 'Abastecimiento / Productos y Categorías',
  despacho: 'Abastecimiento / Despacho y Movimientos',
  personal_empleados: 'Personal / Puestos y Colaboradores',
  personal_marcador: 'Personal / Marcador de Asistencias',
  personal_asistencias: 'Personal / Informe de Asistencias',
  reportes_huespedes: 'Reportes / Libro de Huéspedes',
  reportes_rendimiento: 'Reportes / Rendimiento por Habitación',
  configuracion_empresa: 'Configuración / Empresa, Parámetros y Firebase',
  configuracion_diseno: 'Configuración / Diseño Luxury y Colores',
  configuracion_reservas: 'Configuración / Integración Reservas Web',
  configuracion_sunat: 'Configuración / Catálogo Códigos SUNAT',
  seguridad_cuenta: 'Seguridad / Mi Cuenta',
  seguridad_usuarios: 'Seguridad / Acceso Usuarios',
  seguridad_autorizacion: 'Seguridad / Códigos de Autorización',
  contabilidad: 'Contabilidad / Facturación Electrónica SUNAFACT',
  servicios_pagos: 'Mis Servicios y Pagos',
  soporte: 'Soporte y Solicitudes',
};

export const AppShell: React.FC<AppShellProps> = ({ activeModule, onNavigate, children }) => {
  const {
    state,
    toasts,
    dismissToast,
    activeUser,
    hasModuleAccess,
    logout,
    setActiveShiftId,
  } = usePMS();

  const theme = state.config.theme;
  const sidebarIsLight = isLightHex(theme.sidebarBg);
  const topbarIsLight = isLightHex(theme.topbarBg);
  const accent = theme.accentColor || '#B8891F';

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [devConsoleOpen, setDevConsoleOpen] = useState(false);
  const logoClicksRef = useRef(0);
  const logoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && e.shiftKey && e.key.toLowerCase() === 'd') ||
        (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd')
      ) {
        e.preventDefault();
        setDevConsoleOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onBreakpointChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setMobileMenuOpen(false);
      }
    };
    mq.addEventListener('change', onBreakpointChange);
    return () => mq.removeEventListener('change', onBreakpointChange);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogoSecretTap = () => {
    logoClicksRef.current += 1;
    if (logoTimerRef.current) window.clearTimeout(logoTimerRef.current);
    if (logoClicksRef.current >= 5) {
      logoClicksRef.current = 0;
      setDevConsoleOpen(true);
      return;
    }
    logoTimerRef.current = window.setTimeout(() => {
      logoClicksRef.current = 0;
    }, 1500);
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    habitaciones: true,
    reservas: true,
    clientes: false,
    abastecimiento: false,
    caja: false,
    personal: false,
    reportes: false,
    configuracion: false,
    seguridad: false,
  });

  const pendingOrdersCount = state.stays
    .filter((s) => s.status === 'ACTIVA')
    .reduce((acc, s) => acc + s.consumptions.filter((c) => !c.entregado).length, 0);

  const pendingRoomsCleaning = state.rooms.filter((r) => r.status === 'EN_LIMPIEZA').length;
  const pendingArrivals = state.reservations.filter(
    (r) => r.status === 'CONFIRMADA' || r.status === 'PENDIENTE'
  ).length;

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectModule = (id: ModuleId) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  const sidebarBorderClass = sidebarIsLight ? 'border-[#E5D7BA]' : 'border-white/10';
  const sidebarHoverClass = sidebarIsLight
    ? 'hover:bg-[#EBDDBB]/60 hover:text-[#1D150C]'
    : 'hover:bg-white/10 hover:text-white';

  const topbarTextClass = topbarIsLight ? 'text-[#2A2015]' : 'text-slate-100';
  const topbarMutedClass = topbarIsLight ? 'text-[#6E5A3E]' : 'text-slate-300';
  const topbarHoverClass = topbarIsLight
    ? 'hover:bg-[#F3E9D2] hover:text-[#1D150C]'
    : 'hover:bg-white/10 hover:text-white';

  const handleToggleMenu = () => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      setSidebarOpen((v) => !v);
    } else {
      setMobileMenuOpen((v) => !v);
    }
  };

  const handleCloseMenu = () => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      setSidebarOpen(false);
    } else {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div
      className="flex min-h-screen w-full overflow-x-hidden text-[#2A2015]"
      style={{ backgroundColor: theme.canvasBg || '#FAF7F0' }}
    >
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="no-print fixed inset-0 z-30 bg-[#1F160C]/50 backdrop-blur-[1px] transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Luxury Sidebar (Mobile Slide-over Drawer + Desktop Collapsible Rail) */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r transition-transform duration-200 ease-out ${sidebarBorderClass} ${
          mobileMenuOpen
            ? 'translate-x-0 shadow-2xl'
            : '-translate-x-full pointer-events-none lg:pointer-events-auto'
        } ${
          sidebarOpen
            ? 'lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none'
            : 'lg:hidden'
        }`}
        style={{
          backgroundColor: theme.sidebarBg || '#F6EFE2',
          color: theme.sidebarText || '#2A2015',
        }}
      >
        {/* Brand Header */}
        <div className={`flex items-center gap-3 border-b px-4 py-3.5 ${sidebarBorderClass}`}>
          <div
            onClick={handleLogoSecretTap}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-[#C89B2B] bg-white shadow-xs"
          >
            <img
              src={state.config.logo || CHUSPA_LOGO}
              alt={state.config.nombreComercial}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-luxury truncate text-base font-bold tracking-wide">
              {state.config.nombreComercial}
            </p>
            <p className="truncate text-[11px] opacity-75">
              {activeUser.nombreCompleto} · {activeUser.rol}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseMenu}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent transition-colors ${sidebarHoverClass}`}
            aria-label="Cerrar menú"
            title="Ocultar menú"
          >
            <X className="h-5 w-5 lg:hidden" />
            <PanelLeftClose className="hidden h-4 w-4 lg:block" />
          </button>
        </div>

        {/* Role-Filtered Navigation Groups */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3 text-[13px]">
          {SIDEBAR_GROUPS.map((grp) => {
            if (grp.module) {
              if (!hasModuleAccess(grp.module)) return null;
              const isActive = activeModule === grp.module;
              return (
                <button
                  key={grp.id}
                  onClick={() => handleSelectModule(grp.module!)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium transition-colors whitespace-nowrap ${
                    isActive ? 'text-white shadow-xs' : sidebarHoverClass
                  }`}
                  style={isActive ? { backgroundColor: accent } : undefined}
                >
                  <span style={!isActive ? { color: accent } : undefined}>{grp.icon}</span>
                  <span className="truncate">{grp.label}</span>
                </button>
              );
            }

            const visibleItems = (grp.items || []).filter((i) => hasModuleAccess(i.id));
            if (visibleItems.length === 0) return null;

            const isGroupActive = visibleItems.some((i) => i.id === activeModule);
            const isOpen = openGroups[grp.id] || isGroupActive;

            return (
              <div key={grp.id} className="space-y-0.5">
                <button
                  onClick={() => toggleGroup(grp.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium transition-colors ${
                    isGroupActive
                      ? sidebarIsLight
                        ? 'bg-[#EADBB8]/70 font-semibold'
                        : 'bg-white/15 font-semibold'
                      : sidebarHoverClass
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span style={{ color: accent }}>{grp.icon}</span>
                    <span className="truncate">{grp.label}</span>
                  </span>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-65" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-65" />
                  )}
                </button>
                {isOpen && (
                  <div
                    className={`ml-4 space-y-0.5 border-l pl-3 py-0.5 ${
                      sidebarIsLight ? 'border-[#D9C69C]' : 'border-white/15'
                    }`}
                  >
                    {visibleItems.map((item) => {
                      const active = activeModule === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectModule(item.id)}
                          className={`block w-full truncate rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                            active ? 'font-semibold text-white' : `opacity-80 ${sidebarHoverClass}`
                          }`}
                          style={active ? { backgroundColor: accent } : undefined}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Role Info & La Chuspa Tech Attribution */}
        <div className={`border-t p-3 space-y-2.5 ${sidebarBorderClass}`}>
          <div
            className={`rounded-lg border px-3 py-2 text-[11px] ${
              sidebarIsLight
                ? 'border-[#E3D3AE] bg-[#FFFDF8]/80'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <p className="truncate font-bold">{activeUser.nombreCompleto}</p>
            <p className="truncate opacity-75">
              Cargo: <strong>{activeUser.rol}</strong>
            </p>
          </div>

          <a
            href="https://www.lachuspaanuncios.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors ${
              sidebarIsLight
                ? 'border-[#DFCFA8] bg-[#FFFDF8] hover:border-[#B8891F] hover:bg-[#FBF4E2]'
                : 'border-white/15 bg-white/5 hover:bg-white/10'
            }`}
          >
            <img
              src={CHUSPA_LOGO}
              alt="La Chuspa Tech"
              referrerPolicy="no-referrer"
              className="h-8 w-8 shrink-0 rounded-full border border-[#C89B2B] bg-white object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold">La Chuspa Tech</p>
              <p className="truncate text-[10px] opacity-75">www.lachuspaanuncios.com</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
          </a>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Luxury Top Module Bar */}
        <header className="no-print sticky top-0 z-20 border-b border-[#E5D7BA] bg-[#FFFDF8]">
          <div
            className={`flex items-center justify-between gap-2 border-b px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-1.5 ${
              topbarIsLight ? 'border-[#ECE0C6]' : 'border-white/10'
            } ${topbarTextClass}`}
            style={{ backgroundColor: theme.topbarBg || '#FFFDF8' }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleMenu}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white shadow-xs transition-opacity hover:opacity-90 sm:h-7 sm:w-7"
                style={{ backgroundColor: accent }}
                aria-label="Abrir o cerrar menú lateral"
                title="Mostrar / Ocultar menú lateral"
              >
                <span className="lg:hidden">
                  {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </span>
                <span className="hidden lg:inline-flex">
                  {sidebarOpen ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeftOpen className="h-4 w-4" />
                  )}
                </span>
              </button>

              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5">
                {QUICK_NAV.filter((item) => hasModuleAccess(item.id)).map((item) => {
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectModule(item.id)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                        isActive ? 'text-white shadow-xs' : `${topbarMutedClass} ${topbarHoverClass}`
                      }`}
                      style={isActive ? { backgroundColor: accent } : undefined}
                    >
                      <span style={!isActive ? { color: accent } : undefined}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className={`hidden xl:flex items-center gap-1.5 text-xs ${topbarMutedClass}`}>
                <Clock className="h-3.5 w-3.5" style={{ color: accent }} />
                <select
                  value={state.activeShiftId}
                  onChange={(e) => setActiveShiftId(e.target.value)}
                  className={`rounded border px-2 py-0.5 text-xs focus:outline-none ${
                    topbarIsLight
                      ? 'border-[#DFCFA8] bg-[#FAF7F0] text-[#2A2015]'
                      : 'border-white/20 bg-white/10 text-white'
                  }`}
                >
                  {state.config.shifts.map((sh) => (
                    <option key={sh.id} value={sh.id} className="text-slate-900">
                      {sh.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  className={`relative inline-flex h-7 w-7 items-center justify-center rounded ${topbarMutedClass} ${topbarHoverClass}`}
                  aria-label="Notificaciones"
                >
                  <Bell className="h-4 w-4" />
                  {pendingOrdersCount + pendingRoomsCleaning > 0 && (
                    <span
                      className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white tabular-nums"
                      style={{ backgroundColor: accent }}
                    >
                      {pendingOrdersCount + pendingRoomsCleaning}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-3 text-[#2A2015] shadow-lg">
                    <div className="mb-2 flex items-center justify-between border-b border-[#EFE4CB] pb-2">
                      <span className="text-xs font-semibold">Alertas Operativas</span>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-[#7A6A55] hover:text-[#2A2015]"
                      >
                        Cerrar
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <button
                        onClick={() => {
                          handleSelectModule('recepcion');
                          setNotifOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg bg-[#FAF7F0] px-3 py-2 text-left hover:bg-[#F3EBD8]"
                      >
                        <span>Pedidos de suite pendientes</span>
                        <span className="font-mono font-semibold text-[#9A7214] tabular-nums">
                          {pendingOrdersCount}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          handleSelectModule('limpieza');
                          setNotifOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg bg-[#FAF7F0] px-3 py-2 text-left hover:bg-[#F3EBD8]"
                      >
                        <span>Suites en limpieza</span>
                        <span className="font-mono font-semibold text-sky-700 tabular-nums">
                          {pendingRoomsCleaning}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          handleSelectModule('reservas_llegadas');
                          setNotifOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg bg-[#FAF7F0] px-3 py-2 text-left hover:bg-[#F3EBD8]"
                      >
                        <span>Reservas / llegadas activas</span>
                        <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                          {pendingArrivals}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <span className={`hidden sm:inline-block text-xs font-medium whitespace-nowrap ${topbarMutedClass}`}>
                Usuario: <strong className={topbarTextClass}>{activeUser.username}</strong>
              </span>

              <button
                onClick={logout}
                className="inline-flex items-center gap-1 rounded bg-red-700 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-red-800 whitespace-nowrap"
                title="Cerrar sesión"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Salir</span>
              </button>
            </div>
          </div>

          {/* Breadcrumb Bar */}
          <div className="flex items-center justify-between gap-3 bg-[#FAF6EC] px-3 py-2 text-xs sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[#7A684D]">
              <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
              <span className="hidden shrink-0 font-semibold text-[#473824] sm:inline">
                {state.config.nombreComercial}
              </span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="truncate font-bold text-[#2A2015]">
                {MODULE_LABELS[activeModule]}
              </span>
            </div>
            <div className="hidden md:flex shrink-0 items-center gap-4 text-[#6E5D47] tabular-nums">
              <span>
                Ocupadas:{' '}
                <strong className="text-[#2A2015]">
                  {state.rooms.filter((r) => r.status === 'OCUPADO').length}/{state.rooms.length}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Disponibles:{' '}
                <strong className="text-emerald-700">
                  {state.rooms.filter((r) => r.status === 'DISPONIBLE').length}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Limpieza:{' '}
                <strong className="text-sky-700">{pendingRoomsCleaning}</strong>
              </span>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6">{children}</main>
      </div>

      {/* Toast Stack */}
      <div className="no-print fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl border bg-[#FFFDF9] px-4 py-3 text-[#2A2015] shadow-lg transition-all ${
              t.type === 'success'
                ? 'border-emerald-200'
                : t.type === 'error'
                  ? 'border-red-200'
                  : t.type === 'warning'
                    ? 'border-amber-300'
                    : 'border-[#E2D2AF]'
            }`}
          >
            <ClipboardCheck
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                t.type === 'success'
                  ? 'text-emerald-600'
                  : t.type === 'error'
                    ? 'text-red-600'
                    : 'text-[#B8891F]'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-[#6E5D47]">{t.description}</p>}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="rounded p-0.5 text-[#8D7B63] hover:text-[#2A2015]"
              aria-label="Descartar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <DevConsoleModal open={devConsoleOpen} onClose={() => setDevConsoleOpen(false)} />
    </div>
  );
};
