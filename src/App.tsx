/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
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

export default function App() {
  return (
    <PMSProvider>
      <PMSWorkspace />
    </PMSProvider>
  );
}
