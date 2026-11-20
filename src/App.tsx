/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { PMSProvider, usePMS } from './store/PMSContext';
import { AppShell } from './components/layout/AppShell';
import { LoginScreen } from './components/auth/LoginScreen';
import { RecepcionModule } from './components/modules/RecepcionModule';
import { ReservasModule } from './components/modules/ReservasModule';
import { HabitacionesTarifasModule } from './components/modules/HabitacionesTarifasModule';
import { LimpiezaMantenimientoModule } from './components/modules/LimpiezaMantenimientoModule';
import { PostVentaModule } from './components/modules/PostVentaModule';
import { FacturacionCajaModule } from './components/modules/FacturacionCajaModule';
import { AbastecimientoModule } from './components/modules/AbastecimientoModule';
import { ClientesEmpresasModule } from './components/modules/ClientesEmpresasModule';
import { PersonalModule } from './components/modules/PersonalModule';
import { DashboardReportesModule } from './components/modules/DashboardReportesModule';
import { AdminSistemaModule } from './components/modules/AdminSistemaModule';
import { DisenoSistemaModule } from './components/modules/DisenoSistemaModule';
import { CrmWhatsAppModule } from './components/modules/CrmWhatsAppModule';
import { DespertadorPbxToursModule } from './components/modules/DespertadorPbxToursModule';
import { KdsBellBoySaludModule } from './components/modules/KdsBellBoySaludModule';
import { GrmsDomoticaModule } from './components/modules/GrmsDomoticaModule';
import type { ModuleId } from './types/pms';

function PMSWorkspace() {
  const { isAuthenticated, hasModuleAccess, activeUser } = usePMS();
  const [activeModule, setActiveModule] = useState<ModuleId>('recepcion');

  // When switching users or logging in, ensure current module is permitted
  useEffect(() => {
    if (!hasModuleAccess(activeModule)) {
      setActiveModule('recepcion');
    }
  }, [activeUser.id, activeModule, hasModuleAccess]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const safeModule: ModuleId = hasModuleAccess(activeModule) ? activeModule : 'recepcion';

  const handleNavigate = (mod: ModuleId) => {
    if (hasModuleAccess(mod)) {
      setActiveModule(mod);
    }
  };

  const renderModule = () => {
    switch (safeModule) {
      case 'recepcion':
        return <RecepcionModule onNavigate={handleNavigate} />;
      case 'reservas_libro':
      case 'reservas_llegadas':
      case 'reservas_control':
        return <ReservasModule mode={safeModule} onNavigate={handleNavigate} />;
      case 'habitaciones_tipos':
      case 'tarifa_hotelera':
        return <HabitacionesTarifasModule mode={safeModule} />;
      case 'limpieza':
      case 'mantenimientos':
        return <LimpiezaMantenimientoModule mode={safeModule} />;
      case 'post_venta':
        return <PostVentaModule />;
      case 'facturacion':
      case 'caja_gastos':
      case 'caja_bancos':
        return <FacturacionCajaModule mode={safeModule} />;
      case 'productos':
      case 'compras':
      case 'inventario':
      case 'despacho':
        return <AbastecimientoModule mode={safeModule} />;
      case 'clientes':
      case 'agencias':
      case 'personas_no_gratas':
        return <ClientesEmpresasModule mode={safeModule} />;
      case 'personal_empleados':
      case 'personal_marcador':
      case 'personal_asistencias':
        return <PersonalModule mode={safeModule} />;
      case 'dashboard':
      case 'reportes_huespedes':
      case 'reportes_rendimiento':
        return <DashboardReportesModule mode={safeModule} />;
      case 'configuracion_diseno':
        return <DisenoSistemaModule />;
      case 'configuracion_empresa':
      case 'configuracion_reservas':
      case 'configuracion_sunat':
      case 'seguridad_cuenta':
      case 'seguridad_usuarios':
      case 'seguridad_autorizacion':
      case 'contabilidad':
      case 'servicios_pagos':
      case 'soporte':
        return <AdminSistemaModule mode={safeModule} />;
      case 'crm_whatsapp':
        return <CrmWhatsAppModule />;
      case 'despertador_pbx':
      case 'paquetes_tours':
        return <DespertadorPbxToursModule mode={safeModule} />;
      case 'kds_cocina':
      case 'bell_boys':
      case 'salud_emergencias':
        return <KdsBellBoySaludModule mode={safeModule} />;
      case 'grms_iot':
        return <GrmsDomoticaModule />;
      default:
        return <RecepcionModule onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppShell activeModule={safeModule} onNavigate={handleNavigate}>
      {renderModule()}
    </AppShell>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Error inesperado de renderizado' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PMS ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FAF7F0] p-6 text-[#2A2015]">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 text-center shadow-lg">
            <h1 className="font-luxury text-2xl font-bold text-[#3A2B18]">
              La Chuspa Tech — Recuperación del Sistema
            </h1>
            <p className="mt-2 text-xs text-[#6E5D47]">{this.state.message}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-[#9A6E0E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7E590A]"
              >
                Recargar página
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('lachuspa_pms_state_v2');
                    localStorage.removeItem('lachuspa_pms_auth_v2');
                  } catch {
                    // ignore storage errors
                  }
                  window.location.reload();
                }}
                className="rounded-lg border border-[#E2D2AF] bg-[#FAF7F0] px-4 py-2 text-xs font-semibold text-[#3A2B18] hover:bg-[#F3E9D2]"
              >
                Limpiar caché y reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <PMSProvider>
        <PMSWorkspace />
      </PMSProvider>
    </AppErrorBoundary>
  );
}
