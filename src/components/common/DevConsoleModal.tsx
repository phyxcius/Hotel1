import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Database,
  Download,
  Lock,
  RotateCcw,
  ShieldAlert,
  Terminal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import { toYMD } from '../../data/seedData';

interface DevConsoleModalProps {
  open: boolean;
  onClose: () => void;
}

const DEV_PIN = 'DEV2026';

export const DevConsoleModal: React.FC<DevConsoleModalProps> = ({ open, onClose }) => {
  const {
    state,
    resetDemoData,
    factoryResetForClient,
    importStateJson,
    syncToFirebaseNow,
    firebaseSync,
    notify,
  } = usePMS();

  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Handover Wipe Checkboxes
  const [wipeTransactions, setWipeTransactions] = useState(true);
  const [wipeClients, setWipeClients] = useState(true);
  const [zeroProductStocks, setZeroProductStocks] = useState(true);
  const [wipeProducts, setWipeProducts] = useState(false);
  const [wipeStaff, setWipeStaff] = useState(false);
  const [applyCompanyOverride, setApplyCompanyOverride] = useState(false);
  const [confirmWord, setConfirmWord] = useState('');

  const [companyForm, setCompanyForm] = useState({
    ruc: state.config.ruc,
    razonSocial: state.config.razonSocial,
    nombreComercial: state.config.nombreComercial,
    direccionFiscal: state.config.direccionFiscal,
    telefono: state.config.telefono,
    correo: state.config.correo,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim().toUpperCase() === DEV_PIN) {
      setUnlocked(true);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  const handleDownloadBackup = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_pms_${toYMD(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify('success', 'Backup JSON descargado');
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const ok = importStateJson(reader.result);
        if (ok) onClose();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteFactoryReset = () => {
    if (confirmWord.trim().toUpperCase() !== 'LIMPIAR') {
      notify('error', 'Escriba LIMPIAR para confirmar el reseteo de entrega');
      return;
    }
    factoryResetForClient({
      wipeTransactions,
      wipeClients,
      zeroProductStocks,
      wipeProducts,
      wipeStaff,
      companyOverride: applyCompanyOverride ? companyForm : undefined,
    });
    setConfirmWord('');
    onClose();
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#2A2015]/55 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#DFCFA8] bg-[#FFFDF9] text-[#2A2015] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EFE4CB] bg-[#FBF6EA] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B8891F]/15 text-[#B8891F]">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-luxury text-base font-bold text-[#2A2015]">
                Consola Desarrollador · Entrega y Reseteo de Sistema
              </h2>
              <p className="text-[11px] text-[#6E5D47]">
                Atajo: Alt + Shift + D o Ctrl + Alt + D · Firebase: {firebaseSync.dbUrl}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setUnlocked(false);
              onClose();
            }}
            className="rounded-lg p-1.5 text-[#6E5D47] hover:bg-[#EFE2C4] hover:text-[#2A2015]"
            aria-label="Cerrar consola"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!unlocked ? (
          <form onSubmit={handleUnlock} className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#DFCFA8] bg-[#FBF6EA] text-[#B8891F]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-luxury text-lg font-bold text-[#2A2015]">Acceso Protegido de Desarrollador</h3>
              <p className="mt-1 text-xs text-[#6E5D47]">
                Protege los datos del negocio frente a borrados accidentales del personal.
              </p>
            </div>
            <div className="mx-auto max-w-xs space-y-2">
              <input
                type="password"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Ingrese PIN de Desarrollador"
                className="w-full rounded-xl border border-[#DECFA8] bg-white px-4 py-2.5 text-center font-mono text-sm font-bold text-[#2A2015] focus:border-[#B8891F] focus:outline-none"
              />
              {pinError && (
                <p className="text-xs font-medium text-red-600">PIN incorrecto. Intente nuevamente.</p>
              )}
              <p className="font-mono text-[10px] text-[#7A6A55]">Clave técnica por defecto: DEV2026</p>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#B8891F] px-6 py-2 text-xs font-bold text-white hover:bg-[#9A7012]"
            >
              Desbloquear Consola
            </button>
          </form>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto p-6 text-xs">
            {/* Current DB Snapshot */}
            <div className="rounded-xl border border-[#E6DBC4] bg-[#FAF7F0] p-4">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 font-bold text-[#473824]">
                <span className="inline-flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-[#B8891F]" />
                  Estado Actual en Memoria y Firebase RTDB ({firebaseSync.status})
                </span>
                <button
                  type="button"
                  onClick={() => syncToFirebaseNow()}
                  className="rounded-md bg-[#B8891F] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#9A7012]"
                >
                  Sincronizar Firebase
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 font-mono tabular-nums">
                <div className="rounded-lg border border-[#E6DBC4] bg-white p-2">
                  <span className="block text-[10px] text-[#6E5D47]">Estadías</span>
                  <strong className="text-sm text-[#2A2015]">{state.stays.length}</strong>
                </div>
                <div className="rounded-lg border border-[#E6DBC4] bg-white p-2">
                  <span className="block text-[10px] text-[#6E5D47]">Reservas</span>
                  <strong className="text-sm text-[#2A2015]">{state.reservations.length}</strong>
                </div>
                <div className="rounded-lg border border-[#E6DBC4] bg-white p-2">
                  <span className="block text-[10px] text-[#6E5D47]">Ventas</span>
                  <strong className="text-sm text-[#2A2015]">{state.sales.length}</strong>
                </div>
                <div className="rounded-lg border border-[#E6DBC4] bg-white p-2">
                  <span className="block text-[10px] text-[#6E5D47]">Huéspedes</span>
                  <strong className="text-sm text-[#2A2015]">{state.guests.length}</strong>
                </div>
                <div className="rounded-lg border border-[#E6DBC4] bg-white p-2">
                  <span className="block text-[10px] text-[#6E5D47]">Productos</span>
                  <strong className="text-sm text-[#2A2015]">{state.products.length}</strong>
                </div>
                <div className="rounded-lg border border-[#E6DBC4] bg-white p-2">
                  <span className="block text-[10px] text-[#6E5D47]">Personal</span>
                  <strong className="text-sm text-[#2A2015]">{state.employees.length}</strong>
                </div>
              </div>
            </div>

            {/* Backup & Demo Restore Tools */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DECFA8] bg-[#FAF7F0] px-3 py-2.5 font-semibold text-[#2A2015] hover:bg-[#F3E9D2]"
              >
                <Download className="h-3.5 w-3.5 text-[#B8891F]" />
                Exportar Backup JSON
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DECFA8] bg-[#FAF7F0] px-3 py-2.5 font-semibold text-[#2A2015] hover:bg-[#F3E9D2]"
              >
                <Upload className="h-3.5 w-3.5 text-[#B8891F]" />
                Importar Backup JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleUploadBackup}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  onClose();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#C89B2B] bg-[#FBF5E6] px-3 py-2.5 font-semibold text-[#7A5B14] hover:bg-[#F3E7C8]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar Datos Demo
              </button>
            </div>

            {/* Client Handover Factory Reset */}
            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div>
                  <h3 className="font-bold text-red-900">
                    Puesta a Cero para Entrega al Cliente (Producción)
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#5E4A2D]">
                    Limpia las operaciones de prueba dejando intacta la arquitectura de habitaciones, tipos, tarifas, turnos y formas de pago lista para operar.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#E6DBC4] bg-white px-3 py-2">
                  <span>
                    <strong className="block text-[#2A2015]">Limpiar operaciones, caja y bitácoras</strong>
                    <span className="text-[11px] text-[#6E5D47]">
                      Borra estadías, reservas, ventas, cierres, gastos, depósitos, compras, kardex, limpieza, mantenimientos y marca todas las suites como Disponible.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={wipeTransactions}
                    onChange={(e) => setWipeTransactions(e.target.checked)}
                    className="ml-3 h-4 w-4 shrink-0 accent-red-600"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#E6DBC4] bg-white px-3 py-2">
                  <span>
                    <strong className="block text-[#2A2015]">Limpiar clientes, agencias y personas no gratas</strong>
                    <span className="text-[11px] text-[#6E5D47]">
                      Deja el directorio de huéspedes y agencias vacío para registrar clientes reales.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={wipeClients}
                    onChange={(e) => setWipeClients(e.target.checked)}
                    className="ml-3 h-4 w-4 shrink-0 accent-red-600"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#E6DBC4] bg-white px-3 py-2">
                  <span>
                    <strong className="block text-[#2A2015]">Poner stocks de inventario en 0</strong>
                    <span className="text-[11px] text-[#6E5D47]">
                      Mantiene el catálogo base de productos/servicios con stock inicial cero.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={zeroProductStocks}
                    disabled={wipeProducts}
                    onChange={(e) => setZeroProductStocks(e.target.checked)}
                    className="ml-3 h-4 w-4 shrink-0 accent-red-600"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#E6DBC4] bg-white px-3 py-2">
                  <span>
                    <strong className="block text-[#2A2015]">Eliminar catálogo de productos demo</strong>
                    <span className="text-[11px] text-[#6E5D47]">
                      Borra todos los productos y categorías para cargar el catálogo propio del hotel.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={wipeProducts}
                    onChange={(e) => setWipeProducts(e.target.checked)}
                    className="ml-3 h-4 w-4 shrink-0 accent-red-600"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#E6DBC4] bg-white px-3 py-2">
                  <span>
                    <strong className="block text-[#2A2015]">Eliminar trabajadores y usuarios secundarios</strong>
                    <span className="text-[11px] text-[#6E5D47]">
                      Conserva únicamente la cuenta principal de Administrador.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={wipeStaff}
                    onChange={(e) => setWipeStaff(e.target.checked)}
                    className="ml-3 h-4 w-4 shrink-0 accent-red-600"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#E6DBC4] bg-white px-3 py-2">
                  <span>
                    <strong className="block text-[#9A7214]">Configurar datos fiscales del cliente en este paso</strong>
                    <span className="text-[11px] text-[#6E5D47]">
                      Sobrescribe RUC, Razón Social, Nombre Comercial, Dirección y contacto.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={applyCompanyOverride}
                    onChange={(e) => setApplyCompanyOverride(e.target.checked)}
                    className="ml-3 h-4 w-4 shrink-0 accent-[#B8891F]"
                  />
                </label>
              </div>

              {applyCompanyOverride && (
                <div className="grid grid-cols-1 gap-2.5 rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={companyForm.ruc}
                    onChange={(e) => setCompanyForm({ ...companyForm, ruc: e.target.value })}
                    placeholder="RUC del cliente"
                    className="rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 font-mono text-[#2A2015]"
                  />
                  <input
                    type="text"
                    value={companyForm.razonSocial}
                    onChange={(e) => setCompanyForm({ ...companyForm, razonSocial: e.target.value })}
                    placeholder="Razón Social"
                    className="rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-[#2A2015]"
                  />
                  <input
                    type="text"
                    value={companyForm.nombreComercial}
                    onChange={(e) => setCompanyForm({ ...companyForm, nombreComercial: e.target.value })}
                    placeholder="Nombre Comercial del Hotel"
                    className="rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-[#2A2015]"
                  />
                  <input
                    type="text"
                    value={companyForm.telefono}
                    onChange={(e) => setCompanyForm({ ...companyForm, telefono: e.target.value })}
                    placeholder="Teléfono"
                    className="rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 font-mono text-[#2A2015]"
                  />
                  <input
                    type="text"
                    value={companyForm.direccionFiscal}
                    onChange={(e) => setCompanyForm({ ...companyForm, direccionFiscal: e.target.value })}
                    placeholder="Dirección Fiscal"
                    className="rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-[#2A2015]"
                  />
                  <input
                    type="text"
                    value={companyForm.correo}
                    onChange={(e) => setCompanyForm({ ...companyForm, correo: e.target.value })}
                    placeholder="Correo electrónico"
                    className="rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-[#2A2015]"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <div className="flex min-w-[200px] flex-1 items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#B8891F]" />
                  <input
                    type="text"
                    value={confirmWord}
                    onChange={(e) => setConfirmWord(e.target.value)}
                    placeholder='Escriba "LIMPIAR" para confirmar'
                    className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2 font-mono text-[#2A2015] placeholder:text-[#8D7B63] focus:border-red-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExecuteFactoryReset}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Ejecutar Limpieza de Entrega
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
