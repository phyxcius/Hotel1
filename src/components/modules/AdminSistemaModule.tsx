import React, { useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  CloudDownload,
  CloudUpload,
  Copy,
  CreditCard,
  FileText,
  Globe,
  KeyRound,
  LifeBuoy,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type { RoomStatus, SystemUser } from '../../types/pms';
import { formatCurrency, formatDateTime } from '../../utils/exportCsv';
import { addDays, ALL_MODULES, RECEPTION_OPERATIONAL_MODULES, toYMD } from '../../data/seedData';
import { DEFAULT_FIREBASE_RTDB_URL } from '../../services/firebaseRtdb';

interface AdminSistemaModuleProps {
  mode:
    | 'configuracion_empresa'
    | 'configuracion_reservas'
    | 'configuracion_sunat'
    | 'seguridad_cuenta'
    | 'seguridad_usuarios'
    | 'seguridad_autorizacion'
    | 'contabilidad'
    | 'servicios_pagos'
    | 'soporte';
}

const SUNAT_CATALOG = [
  { codigo: '90111501', descripcion: 'Servicios de hoteles o moteles', clase: '901115' },
  { codigo: '90101501', descripcion: 'Restaurantes y servicios de alimentación', clase: '901015' },
  { codigo: '50202301', descripcion: 'Agua embotellada y bebidas', clase: '502023' },
  { codigo: '91111502', descripcion: 'Servicios de lavandería para huéspedes', clase: '911115' },
  { codigo: '90121502', descripcion: 'Agencias de viajes y tours Machupicchu', clase: '901215' },
  { codigo: '50202201', descripcion: 'Bebidas alcohólicas / Bar', clase: '502022' },
];

export const AdminSistemaModule: React.FC<AdminSistemaModuleProps> = ({ mode }) => {
  const {
    state,
    activeUser,
    updateConfig,
    saveUser,
    saveAuthCode,
    deleteAuthCode,
    createSupportTicket,
    createReservation,
    saveGuest,
    notify,
    firebaseSync,
    syncToFirebaseNow,
    pullFromFirebaseNow,
    testFirebase,
  } = usePMS();

  // Public Web Reservation Simulator
  const [webGuestName, setWebGuestName] = useState('');
  const [webGuestDoc, setWebGuestDoc] = useState('');
  const [webRoomId, setWebRoomId] = useState(state.rooms[0]?.id || '');
  const [webEntrada, setWebEntrada] = useState(() => toYMD(new Date()));
  const [webNoches, setWebNoches] = useState(1);

  // User Form
  const [uUsername, setUUsername] = useState('');
  const [uNombre, setUNombre] = useState('');
  const [uPassword, setUPassword] = useState('123456');
  const [uRol, setURol] = useState<SystemUser['rol']>('RECEPCION');

  // Auth Code Form
  const [acNombre, setAcNombre] = useState('');
  const [acCodigo, setAcCodigo] = useState('');
  const [acTipo, setAcTipo] = useState<'ANULACION' | 'DESCUENTO' | 'GENERAL'>('ANULACION');

  // Support Ticket Form
  const [supIncidencia, setSupIncidencia] = useState('CONSULTA FACTURACIÓN / SUNAT');
  const [supDetalle, setSupDetalle] = useState('');

  if (mode === 'configuracion_empresa') {
    const cfg = state.config;
    const toggleField = (
      key: keyof typeof cfg,
      label: string
    ) => (
      <label key={String(key)} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50">
        <span className="font-medium text-slate-700">{label}</span>
        <input
          type="checkbox"
          checked={Boolean(cfg[key])}
          onChange={(e) => updateConfig({ [key]: e.target.checked })}
          className="h-4 w-4 accent-[#9A6E0E]"
        />
      </label>
    );

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#EFE4CB] pb-3">
            <div>
              <h2 className="font-luxury text-lg font-bold text-[#2A2015]">
                Datos de la Empresa y Reglas del Negocio
              </h2>
              <p className="text-xs text-[#6E5D47]">
                Los cambios se guardan en tiempo real en Firebase RTDB y aplican a tickets, comprobantes y recepción.
              </p>
            </div>
            <Save className="h-4 w-4 text-[#B8891F]" />
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">RUC</label>
              <input
                type="text"
                value={cfg.ruc}
                onChange={(e) => updateConfig({ ruc: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Razón Social</label>
              <input
                type="text"
                value={cfg.razonSocial}
                onChange={(e) => updateConfig({ razonSocial: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Nombre Comercial</label>
              <input
                type="text"
                value={cfg.nombreComercial}
                onChange={(e) => updateConfig({ nombreComercial: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block font-semibold text-slate-700">Dirección Fiscal</label>
              <input
                type="text"
                value={cfg.direccionFiscal}
                onChange={(e) => updateConfig({ direccionFiscal: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Teléfono / Correo</label>
              <input
                type="text"
                value={cfg.telefono}
                onChange={(e) => updateConfig({ telefono: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-6">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Check-In</label>
              <input
                type="time"
                value={cfg.horaCheckIn}
                onChange={(e) => updateConfig({ horaCheckIn: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Check-Out</label>
              <input
                type="time"
                value={cfg.horaCheckOut}
                onChange={(e) => updateConfig({ horaCheckOut: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Penalidad Hr (S/)</label>
              <input
                type="number"
                value={cfg.penalidadHoraExtra}
                onChange={(e) => updateConfig({ penalidadHoraExtra: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Serie Boleta</label>
              <input
                type="text"
                value={cfg.serieBoleta}
                onChange={(e) => updateConfig({ serieBoleta: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Serie Factura</label>
              <input
                type="text"
                value={cfg.serieFactura}
                onChange={(e) => updateConfig({ serieFactura: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Serie Ticket</label>
              <input
                type="text"
                value={cfg.serieTicket}
                onChange={(e) => updateConfig({ serieTicket: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Parámetros Operativos
            </h3>
            {toggleField('firmaPorIngreso', 'Solicitar firma y políticas en Ficha de Ingreso')}
            {toggleField('activarQrTicket', 'Imprimir código QR en comprobantes')}
            {toggleField('imprimirComprobantes', 'Abrir vista de impresión automática al vender')}
            {toggleField('modificarPreciosPos', 'Permitir modificar precios unitarios en POS')}
            {toggleField('checkInPagoPendiente', 'Permitir Check-Out / Check-In con pago pendiente')}
            {toggleField('requiereCodigoAutorizacion', 'Exigir código de supervisor al anular comprobantes')}
            {toggleField('sunafactActivo', 'Activar Facturación Electrónica SUNAFACT')}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                Colores de Estado en Recepción
              </h3>
              <div className="grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-3">
                {(Object.keys(cfg.coloresEstado) as RoomStatus[]).map((st) => (
                  <label key={st} className="flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-1.5">
                    <span className="text-[11px] font-medium text-slate-700">{st.replace('_', ' ')}</span>
                    <input
                      type="color"
                      value={cfg.coloresEstado[st]}
                      onChange={(e) =>
                        updateConfig({
                          coloresEstado: { ...cfg.coloresEstado, [st]: e.target.value },
                        })
                      }
                      className="h-5 w-7 cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Texto Políticas de Ingreso (Ticket)
              </label>
              <textarea
                rows={4}
                value={cfg.politicaIngreso}
                onChange={(e) => updateConfig({ politicaIngreso: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs"
              />
            </div>
          </div>
        </div>
        {/* Firebase Realtime Database Panel */}
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE4CB] pb-3">
            <div className="flex items-center gap-2.5">
              <Cloud className="h-4 w-4 text-[#B8891F]" />
              <div>
                <h3 className="font-luxury text-base font-bold text-[#2A2015]">
                  Integración Firebase Realtime Database
                </h3>
                <p className="text-[11px] text-[#6E5D47]">
                  Sincronización automática en tiempo real de habitaciones, reservas, ventas, huéspedes y configuración.
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-[#7A5B14]">
              {firebaseSync.status === 'synced'
                ? 'Sincronizado en la nube'
                : firebaseSync.status === 'syncing'
                  ? 'Guardando cambios...'
                  : firebaseSync.status === 'connecting'
                    ? 'Conectando...'
                    : 'Error de sincronización'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs lg:grid-cols-12">
            <div className="lg:col-span-6">
              <label className="mb-1 block font-semibold text-[#473824]">URL Firebase RTDB</label>
              <input
                type="url"
                value={cfg.firebaseRtdbUrl || DEFAULT_FIREBASE_RTDB_URL}
                onChange={(e) => updateConfig({ firebaseRtdbUrl: e.target.value })}
                className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2 font-mono text-xs text-[#2A2015]"
              />
            </div>
            <div className="flex flex-wrap items-end gap-2 lg:col-span-6">
              <button
                type="button"
                onClick={() => testFirebase(cfg.firebaseRtdbUrl || DEFAULT_FIREBASE_RTDB_URL)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DECFA8] bg-[#FAF7F0] px-3 py-2 text-xs font-semibold text-[#5E4A2D] hover:bg-[#F3E9D2]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Probar Conexión
              </button>
              <button
                type="button"
                onClick={() => syncToFirebaseNow()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#B8891F] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#9A7012]"
              >
                <CloudUpload className="h-3.5 w-3.5" />
                Subir a Firebase
              </button>
              <button
                type="button"
                onClick={() => pullFromFirebaseNow()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#B8891F] bg-[#FBF5E6] px-3.5 py-2 text-xs font-semibold text-[#7A5B14] hover:bg-[#F3E7C8]"
              >
                <CloudDownload className="h-3.5 w-3.5" />
                Descargar de Firebase
              </button>
            </div>
          </div>

          {firebaseSync.lastSyncAt && (
            <p className="font-mono text-[11px] text-[#6E5D47]">
              Última sincronización: {formatDateTime(firebaseSync.lastSyncAt)}
            </p>
          )}
          {firebaseSync.error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {firebaseSync.error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'configuracion_reservas') {
    const publicUrl = `https://www.lachuspaanuncios.com/reservas/${state.config.ruc}`;
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 lg:col-span-6 space-y-4 text-xs">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#B8891F]" />
            <h2 className="font-luxury text-lg font-bold text-[#2A2015]">Motor de Reservas Web Directas</h2>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-2.5">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="flex-1 bg-transparent font-mono text-[#2A2015] focus:outline-none"
            />
            <button
              onClick={() => {
                navigator.clipboard?.writeText(publicUrl);
                notify('success', 'Enlace copiado al portapapeles');
              }}
              className="inline-flex items-center gap-1 rounded-md bg-[#B8891F] px-3 py-1.5 font-semibold text-white hover:bg-[#9A7012]"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="mb-1 block font-semibold text-slate-700">Color Fondo</span>
              <input
                type="color"
                value={state.config.reservaWebBg}
                onChange={(e) => updateConfig({ reservaWebBg: e.target.value })}
                className="h-9 w-full rounded border border-slate-300"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-slate-700">Color Texto</span>
              <input
                type="color"
                value={state.config.reservaWebText}
                onChange={(e) => updateConfig({ reservaWebText: e.target.value })}
                className="h-9 w-full rounded border border-slate-300"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-slate-700">Color Botón</span>
              <input
                type="color"
                value={state.config.reservaWebAccent}
                onChange={(e) => updateConfig({ reservaWebAccent: e.target.value })}
                className="h-9 w-full rounded border border-slate-300"
              />
            </label>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">Guía de Pagos y Depósitos</label>
            <textarea
              rows={2}
              value={state.config.guiaPagos}
              onChange={(e) => updateConfig({ guiaPagos: e.target.value })}
              className="w-full rounded-lg border border-slate-300 p-2.5"
            />
          </div>
        </div>

        {/* Live Web Booking Simulator */}
        <div
          className="rounded-xl border border-slate-200 p-5 lg:col-span-6 space-y-4 text-xs"
          style={{ backgroundColor: state.config.reservaWebBg, color: state.config.reservaWebText }}
        >
          <div className="border-b border-slate-200 pb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
              Vista Previa en Vivo · Motor Web
            </p>
            <h3 className="text-base font-bold">{state.config.nombreComercial} — Reserva Online</h3>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!webGuestName.trim() || !webGuestDoc.trim()) {
                notify('error', 'Ingrese nombre y documento para simular reserva web');
                return;
              }
              const guest = saveGuest({
                tipoDoc: 'DNI',
                numDoc: webGuestDoc.trim(),
                nombres: webGuestName.toUpperCase(),
                fechaNacimiento: '1992-01-01',
                nacionalidad: 'PERUANO(A)',
                sexo: 'M',
                correo: '',
                celular: '',
                direccion: '',
                esVip: false,
              });
              const room = state.rooms.find((r) => r.id === webRoomId) || state.rooms[0];
              const rt = state.roomTypes.find((t) => t.id === room.roomTypeId);
              const total = (rt?.precioDefecto || 170) * webNoches;
              createReservation({
                roomId: room.id,
                roomNumber: room.numero,
                roomTypeName: rt?.nombre || 'HABITACION',
                guestId: guest.id,
                guestName: guest.nombres,
                guestDoc: guest.numDoc,
                fechaEntrada: `${webEntrada} ${state.config.horaCheckIn}`,
                fechaSalida: `${toYMD(addDays(new Date(`${webEntrada}T12:00:00`), webNoches))} ${state.config.horaCheckOut}`,
                noches: webNoches,
                total,
                adelanto: 0,
                origen: 'WEB',
                status: 'PENDIENTE',
                observaciones: 'Reserva ingresada desde Portal Web.',
              });
              setWebGuestName('');
              setWebGuestDoc('');
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={webGuestName}
                onChange={(e) => setWebGuestName(e.target.value)}
                placeholder="Nombre completo del huésped"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
              <input
                type="text"
                value={webGuestDoc}
                onChange={(e) => setWebGuestDoc(e.target.value)}
                placeholder="DNI o Pasaporte"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900"
              />
              <select
                value={webRoomId}
                onChange={(e) => setWebRoomId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-900"
              >
                {state.rooms.map((r) => {
                  const rt = state.roomTypes.find((t) => t.id === r.roomTypeId);
                  return (
                    <option key={r.id} value={r.id}>
                      Hab. {r.numero} ({rt?.nombre})
                    </option>
                  );
                })}
              </select>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={webEntrada}
                  onChange={(e) => setWebEntrada(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-slate-900"
                />
                <input
                  type="number"
                  min={1}
                  value={webNoches}
                  onChange={(e) => setWebNoches(Math.max(1, Number(e.target.value)))}
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-slate-900"
                />
              </div>
            </div>
            <p className="rounded-lg bg-slate-100 p-2.5 text-[11px] text-slate-600">{state.config.guiaPagos}</p>
            <button
              type="submit"
              className="w-full rounded-xl py-2.5 font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: state.config.reservaWebAccent }}
            >
              Simular Reserva Web Real (Se guarda en Reservas)
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'configuracion_sunat') {
    const selectedCodes = state.config.sunatCodesSeleccionados;
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 shadow-xs">
          <h2 className="font-luxury text-lg font-bold text-[#2A2015]">Catálogo de Códigos de Producto SUNAT</h2>
          <p className="mb-4 text-xs text-[#6E5D47]">
            Active los códigos UNSPSC / SUNAT permitidos para facturación electrónica de servicios y productos.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
                <tr>
                  <th className="px-4 py-2.5">Código SUNAT</th>
                  <th className="px-4 py-2.5">Clase</th>
                  <th className="px-4 py-2.5">Descripción</th>
                  <th className="px-4 py-2.5 text-right">Activo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE4CB]">
                {SUNAT_CATALOG.map((item) => {
                  const isActive = selectedCodes.some((c) => c.codigo === item.codigo);
                  return (
                    <tr key={item.codigo} className="hover:bg-[#FBF6EA]/60">
                      <td className="px-4 py-3 font-mono font-bold text-[#9A6E0E]">{item.codigo}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{item.clase}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.descripcion}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...selectedCodes, item]
                              : selectedCodes.filter((c) => c.codigo !== item.codigo);
                            updateConfig({ sunatCodesSeleccionados: next });
                          }}
                          className="h-4 w-4 accent-[#9A6E0E] cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'seguridad_cuenta') {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-3 border-b border-[#EFE4CB] pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3A2B18] border border-[#B8891F] font-mono text-base font-bold text-[#F5D68B]">
            {activeUser.username.slice(0, 2)}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{activeUser.nombreCompleto}</h2>
            <p className="text-xs text-slate-500">
              Usuario: <strong className="font-mono">{activeUser.username}</strong> · Rol: {activeUser.rol}
            </p>
          </div>
        </div>
        <div className="space-y-2 text-xs">
          <p className="font-semibold text-slate-700">Módulos habilitados ({activeUser.accesos.length}):</p>
          <div className="flex flex-wrap gap-1.5">
            {activeUser.accesos.map((m) => (
              <span key={m} className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'seguridad_usuarios') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-900">Gestión de Acceso de Usuarios</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!uUsername.trim() || !uNombre.trim() || !uPassword.trim()) {
                notify('error', 'Complete usuario, nombre y contraseña');
                return;
              }
              const accesosPorRol =
                uRol === 'ADMINISTRADOR' || uRol === 'SUPERVISOR'
                  ? ALL_MODULES
                  : RECEPTION_OPERATIONAL_MODULES;
              saveUser({
                username: uUsername.trim().toUpperCase(),
                nombreCompleto: uNombre.trim().toUpperCase(),
                rol: uRol,
                passwordHash: uPassword.trim(),
                activo: true,
                accesos: accesosPorRol,
              });
              setUUsername('');
              setUNombre('');
              setUPassword('123456');
            }}
            className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-5"
          >
            <input
              type="text"
              value={uUsername}
              onChange={(e) => setUUsername(e.target.value)}
              placeholder="Usuario (ej. RECEPCION_NOCHE)"
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono"
            />
            <input
              type="text"
              value={uNombre}
              onChange={(e) => setUNombre(e.target.value)}
              placeholder="Nombre completo"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <input
              type="text"
              value={uPassword}
              onChange={(e) => setUPassword(e.target.value)}
              placeholder="Contraseña acceso"
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono"
            />
            <select
              value={uRol}
              onChange={(e) => setURol(e.target.value as SystemUser['rol'])}
              className="rounded-lg border border-slate-300 px-2.5 py-2"
            >
              <option value="ADMINISTRADOR">ADMINISTRADOR (Todo)</option>
              <option value="RECEPCION">RECEPCION (Operativo)</option>
              <option value="SUPERVISOR">SUPERVISOR (Todo)</option>
              <option value="LIMPIEZA">LIMPIEZA (Operativo)</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#B8891F] py-2 font-semibold text-white hover:bg-[#9A7012]"
            >
              <Plus className="h-3.5 w-3.5" />
              Crear Usuario
            </button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Nombre Completo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 inline-flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-[#9A6E0E]" />
                    {u.username}
                  </td>
                  <td className="px-4 py-3">{u.nombreCompleto}</td>
                  <td className="px-4 py-3 font-semibold">{u.rol}</td>
                  <td className="px-4 py-3">
                    <span className={u.activo ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                      {u.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => saveUser({ ...u, activo: !u.activo })}
                      className="rounded border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (mode === 'seguridad_autorizacion') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#9A6E0E]" />
            <h2 className="font-luxury text-lg font-bold text-[#2A2015]">Códigos de Autorización de Supervisor</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!acNombre.trim() || !acCodigo.trim()) {
                notify('error', 'Complete nombre y código');
                return;
              }
              saveAuthCode({
                nombre: acNombre.toUpperCase(),
                codigo: acCodigo.trim(),
                tipo: acTipo,
              });
              setAcNombre('');
              setAcCodigo('');
            }}
            className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-4"
          >
            <input
              type="text"
              value={acNombre}
              onChange={(e) => setAcNombre(e.target.value)}
              placeholder="Descripción (ej. Gerencia)"
              className="rounded-lg border border-[#DECFA8] px-3 py-2"
            />
            <input
              type="text"
              value={acCodigo}
              onChange={(e) => setAcCodigo(e.target.value)}
              placeholder="PIN / Código (ej. 2026)"
              className="rounded-lg border border-[#DECFA8] px-3 py-2 font-mono"
            />
            <select
              value={acTipo}
              onChange={(e) => setAcTipo(e.target.value as typeof acTipo)}
              className="rounded-lg border border-[#DECFA8] px-2.5 py-2"
            >
              <option value="ANULACION">ANULACIÓN</option>
              <option value="DESCUENTO">DESCUENTO</option>
              <option value="GENERAL">GENERAL</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-[#9A6E0E] py-2 font-semibold text-white hover:bg-[#7E590A]"
            >
              + Agregar Código
            </button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
              <tr>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3 text-right">Eliminar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4CB]">
              {state.authCodes.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-semibold text-[#2A2015]">{c.nombre}</td>
                  <td className="px-4 py-3 text-[#6E5D47]">{c.tipo}</td>
                  <td className="px-4 py-3 font-mono font-bold text-[#9A6E0E]">{c.codigo}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteAuthCode(c.id)}
                      className="rounded border border-slate-200 p-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (mode === 'contabilidad') {
    const elecVouchers = state.sales.filter(
      (s) => s.voucherType === 'BOLETA' || s.voucherType === 'FACTURA'
    );
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 text-[#9A6E0E]" />
            <div>
              <h2 className="font-luxury text-lg font-bold text-[#2A2015]">
                Contabilidad y Portal SUNAFACT Electrónico
              </h2>
              <p className="text-xs text-[#6E5D47]">
                RUC Emisor: {state.config.ruc} · {state.config.razonSocial} · IGV {state.config.impuestoIgv}%
              </p>
            </div>
          </div>
          <button
            onClick={() => updateConfig({ sunafactActivo: !state.config.sunafactActivo })}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white ${
              state.config.sunafactActivo
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-[#3A2B18] hover:bg-[#2A2015]'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {state.config.sunafactActivo ? 'SUNAFACT Conectado (Activo)' : 'Activar Conexión SUNAFACT'}
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha Emisión</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Serie-Número</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">Gravado</th>
                <th className="px-4 py-3 text-right">IGV ({state.config.impuestoIgv}%)</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Estado SUNAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {elecVouchers.map((v) => {
                const base = v.monto / (1 + state.config.impuestoIgv / 100);
                const igv = v.monto - base;
                return (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {formatDateTime(v.fecha)}
                    </td>
                    <td className="px-4 py-3 font-semibold">{v.voucherType}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{v.comprobante}</td>
                    <td className="px-4 py-3">{v.guestName}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(base)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(igv)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                      {formatCurrency(v.monto)}
                    </td>
                    <td className="px-4 py-3">
                      {v.status === 'ANULADO' ? (
                        <span className="font-bold text-red-600">COMUNICADO BAJA</span>
                      ) : v.sunatEnviado || state.config.sunafactActivo ? (
                        <span className="font-bold text-emerald-700">ACEPTADO CDR</span>
                      ) : (
                        <span className="font-semibold text-amber-700">PENDIENTE ENVÍO</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (mode === 'servicios_pagos') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-[#9A6E0E]" />
            <div>
              <h2 className="font-luxury text-lg font-bold text-[#2A2015]">
                Suscripción PMS Hotelero — Plan Luxury Anual
              </h2>
              <p className="text-xs text-[#6E5D47]">
                Titular: {state.config.razonSocial} · Estado: ACTIVO · Próximo vencimiento: 30/11/2026
              </p>
            </div>
          </div>
          <span className="font-mono text-sm font-bold text-emerald-700">Al día</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
              <tr>
                <th className="px-4 py-3">Periodo</th>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Fecha Pago</th>
                <th className="px-4 py-3 text-right">Importe</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4CB]">
              <tr>
                <td className="px-4 py-3 font-mono">Noviembre 2026</td>
                <td className="px-4 py-3 font-medium">Licencia La Chuspa Tech Luxury PMS + SUNAFACT</td>
                <td className="px-4 py-3 font-mono">02/11/2026</td>
                <td className="px-4 py-3 text-right font-mono font-bold">S/ 180.00</td>
                <td className="px-4 py-3 font-bold text-emerald-700">PAGADO</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono">Octubre 2026</td>
                <td className="px-4 py-3 font-medium">Licencia La Chuspa Tech Luxury PMS + SUNAFACT</td>
                <td className="px-4 py-3 font-mono">02/10/2026</td>
                <td className="px-4 py-3 text-right font-mono font-bold">S/ 180.00</td>
                <td className="px-4 py-3 font-bold text-emerald-700">PAGADO</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // SOPORTE
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 lg:col-span-5 space-y-4 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-[#9A6E0E]" />
          <h2 className="font-luxury text-lg font-bold text-[#2A2015]">Mesa de Ayuda y Soporte Técnico</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!supDetalle.trim()) {
              notify('error', 'Describa su consulta o incidencia');
              return;
            }
            createSupportTicket(supIncidencia, supDetalle.trim());
            setSupDetalle('');
          }}
          className="space-y-3"
        >
          <div>
            <label className="mb-1 block font-semibold text-[#5C4A33]">Tipo de Incidencia</label>
            <select
              value={supIncidencia}
              onChange={(e) => setSupIncidencia(e.target.value)}
              className="w-full rounded-lg border border-[#DECFA8] px-3 py-2"
            >
              <option value="CONSULTA FACTURACIÓN / SUNAT">CONSULTA FACTURACIÓN / SUNAT</option>
              <option value="CONFIGURACIÓN IMPRESORA TICKETS">CONFIGURACIÓN IMPRESORA TICKETS</option>
              <option value="INTEGRACIÓN BOOKING / AIRBNB">INTEGRACIÓN BOOKING / AIRBNB</option>
              <option value="CAPACITACIÓN PERSONAL">CAPACITACIÓN PERSONAL</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#5C4A33]">Detalle de la Solicitud</label>
            <textarea
              rows={4}
              value={supDetalle}
              onChange={(e) => setSupDetalle(e.target.value)}
              placeholder="Describa el inconveniente o solicitud..."
              className="w-full rounded-lg border border-[#DECFA8] p-3"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-[#9A6E0E] py-2.5 font-semibold text-white hover:bg-[#7E590A]"
          >
            Enviar Ticket de Soporte
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] lg:col-span-7 shadow-xs">
        <div className="border-b border-[#E2D2AF] bg-[#FBF6EA] px-4 py-3">
          <h3 className="text-xs font-bold uppercase text-[#6E5D47]">Mis Solicitudes de Soporte</h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
            <tr>
              <th className="px-4 py-2.5">Ticket</th>
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Incidencia</th>
              <th className="px-4 py-2.5">Detalle</th>
              <th className="px-4 py-2.5">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFE4CB]">
            {state.supportTickets.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2.5 font-mono font-bold text-[#9A6E0E]">{t.numeroTicket}</td>
                <td className="px-4 py-2.5 font-mono text-slate-500">{t.fecha}</td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{t.incidencia}</td>
                <td className="px-4 py-2.5 text-slate-600">{t.detalle}</td>
                <td className="px-4 py-2.5 font-bold text-amber-700">{t.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
