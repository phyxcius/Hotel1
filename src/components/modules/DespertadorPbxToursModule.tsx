import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlarmClock,
  CheckCircle2,
  Compass,
  Mic,
  PhoneCall,
  Plus,
  Printer,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import { toYMD } from '../../data/seedData';
import type { GuestLanguage, PaymentMethodName, TourPackage, VoucherType, WakeUpCall } from '../../types/pms';
import { formatCurrency } from '../../utils/exportCsv';
import { PrintTicketModal, type PrintTicketData } from '../common/PrintTicketModal';

interface DespertadorPbxToursModuleProps {
  mode: 'despertador_pbx' | 'paquetes_tours';
}

const CANAL_LABEL: Record<WakeUpCall['canal'], string> = {
  PBX_TELEFONO: 'Teléfono PBX Hab.',
  WHATSAPP_BOT: 'WhatsApp Bot Interactivo',
  DUAL_PBX_WHATSAPP: 'Dual: PBX + WhatsApp',
  ALEXA_NEST: 'Voz IoT (Alexa / Google Nest)',
};

const STATUS_STYLE: Record<WakeUpCall['status'], string> = {
  PROGRAMADO: 'bg-sky-50 text-sky-800 border-sky-200',
  SONANDO: 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse',
  ATENDIDO: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  POSPUESTO: 'bg-purple-50 text-purple-800 border-purple-200',
  FALLO_SIN_RESPUESTA: 'bg-red-100 text-red-800 border-red-300',
};

export const DespertadorPbxToursModule: React.FC<DespertadorPbxToursModuleProps> = ({ mode }) => {
  const {
    state,
    scheduleWakeUp,
    triggerWakeUpCall,
    respondWakeUpCall,
    deleteWakeUpCall,
    saveTourPackage,
    bookTourPackage,
    updateTourBookingStatus,
    notify,
  } = usePMS();

  // Wake-up form state
  const occupiedRooms = useMemo(
    () => state.rooms.filter((r) => r.status === 'OCUPADO'),
    [state.rooms]
  );
  const [wuRoomId, setWuRoomId] = useState<string>(occupiedRooms[0]?.id || state.rooms[0]?.id || '');
  const [wuHora, setWuHora] = useState('06:30');
  const [wuFecha, setWuFecha] = useState(toYMD(new Date(Date.now() + 86400000)));
  const [wuCanal, setWuCanal] = useState<WakeUpCall['canal']>('DUAL_PBX_WHATSAPP');
  const [wuProvider, setWuProvider] = useState<WakeUpCall['pbxProvider']>('Yeastar');
  const [wuIdioma, setWuIdioma] = useState<GuestLanguage>('ES');

  // Tour Package booking & creation state
  const [bookModalPkg, setBookModalPkg] = useState<TourPackage | null>(null);
  const [bookStayId, setBookStayId] = useState<string>(
    state.stays.find((s) => s.status === 'ACTIVA')?.id || ''
  );
  const [bookGuestName, setBookGuestName] = useState('');
  const [bookFecha, setBookFecha] = useState(toYMD(new Date(Date.now() + 86400000)));
  const [bookPax, setBookPax] = useState(2);
  const [bookChargeToRoom, setBookChargeToRoom] = useState(true);
  const [bookPayMethod, setBookPayMethod] = useState<PaymentMethodName>('EFECTIVO');
  const [bookVoucherType, setBookVoucherType] = useState<VoucherType>('BOLETA');
  const [bookObs, setBookObs] = useState('');
  const [printTicket, setPrintTicket] = useState<PrintTicketData | null>(null);

  // Create new tour package modal
  const [showNewPkgModal, setShowNewPkgModal] = useState(false);
  const [pkgCodigo, setPkgCodigo] = useState('');
  const [pkgNombre, setPkgNombre] = useState('');
  const [pkgCat, setPkgCat] = useState<TourPackage['categoria']>('TOUR_CUSCO');
  const [pkgDuracion, setPkgDuracion] = useState('8 horas');
  const [pkgPrecio, setPkgPrecio] = useState(180);
  const [pkgOperador, setPkgOperador] = useState('INKA TRAIL EXPEDITIONS SAC');
  const [pkgSalida, setPkgSalida] = useState('07:30');
  const [pkgDesc, setPkgDesc] = useState('');

  // CRM Repeat-guest suggestions for wake-up calls
  const crmWakeSuggestions = useMemo(() => {
    const activeStays = state.stays.filter((s) => s.status === 'ACTIVA');
    return activeStays
      .map((s) => {
        const guest = state.guests.find((g) => g.id === s.guestId);
        const alreadyScheduled = state.wakeUpCalls.some(
          (w) => w.roomId === s.roomId && (w.status === 'PROGRAMADO' || w.status === 'SONANDO')
        );
        if (!guest?.horaDespertadorHabitual || alreadyScheduled) return null;
        return { stay: s, guest, suggestedHour: guest.horaDespertadorHabitual };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [state.stays, state.guests, state.wakeUpCalls]);

  const failedWakeUps = state.wakeUpCalls.filter((w) => w.status === 'FALLO_SIN_RESPUESTA');

  const handleScheduleWakeUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wuRoomId) {
      notify('warning', 'Seleccione una habitación');
      return;
    }
    scheduleWakeUp({
      roomId: wuRoomId,
      horaProgramada: wuHora,
      fechaProgramada: wuFecha,
      canal: wuCanal,
      idioma: wuIdioma,
      pbxProvider: wuProvider,
      creadoPor: 'RECEPCION',
    });
  };

  const openBookPackage = (pkg: TourPackage) => {
    const firstActiveStay = state.stays.find((s) => s.status === 'ACTIVA');
    setBookModalPkg(pkg);
    setBookStayId(firstActiveStay?.id || '');
    setBookGuestName(firstActiveStay?.guestName || state.guests[0]?.nombres || '');
    setBookChargeToRoom(Boolean(firstActiveStay));
    setBookPax(2);
    setBookObs('');
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookModalPkg) return;
    const stay = state.stays.find((s) => s.id === bookStayId && s.status === 'ACTIVA');
    const guestName = stay ? stay.guestName : bookGuestName.trim().toUpperCase();
    if (!guestName) {
      notify('error', 'Ingrese el nombre del huésped o seleccione una habitación');
      return;
    }
    const created = bookTourPackage({
      packageId: bookModalPkg.id,
      stayId: stay?.id,
      guestId: stay?.guestId,
      guestName,
      guestDoc: stay?.guestDocNum,
      roomId: stay?.roomId,
      roomNumber: stay?.roomNumber,
      fechaTour: bookFecha,
      horaRecojo: bookModalPkg.horarioSalida,
      pax: bookPax,
      chargeToRoom: Boolean(stay && bookChargeToRoom),
      metodoPago: bookChargeToRoom ? undefined : bookPayMethod,
      voucherType: bookVoucherType,
      solicitadoVia: 'RECEPCION',
      observaciones: bookObs,
    });
    if (created) {
      setBookModalPkg(null);
    }
  };

  const handleSaveNewPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgNombre.trim()) return;
    saveTourPackage({
      codigo: pkgCodigo.trim().toUpperCase() || `TOUR-${Math.floor(100 + Math.random() * 899)}`,
      nombre: pkgNombre.trim().toUpperCase(),
      categoria: pkgCat,
      duracion: pkgDuracion,
      precioPorPax: Number(pkgPrecio) || 100,
      cuposDia: 16,
      operadorAliado: pkgOperador,
      horarioSalida: pkgSalida,
      incluye: ['Transporte turístico', 'Guía certificado', 'Asistencia Concierge'],
      activo: true,
      descripcion: pkgDesc || 'Experiencia turística boutique operada desde La Chuspa Tech.',
    });
    setShowNewPkgModal(false);
    setPkgCodigo('');
    setPkgNombre('');
    setPkgDesc('');
  };

  if (mode === 'despertador_pbx') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
          <div>
            <h2 className="font-luxury text-lg font-bold text-[#2A2015] flex items-center gap-2">
              <AlarmClock className="h-5 w-5 text-[#9A6E0E]" />
              Despertador Inteligente (PMS + Central PBX + WhatsApp + IoT Voz)
            </h2>
            <p className="text-xs text-[#6E5D47]">
              Sincronización con central telefónica IP (Yeastar/Grandstream/Mitel), botones interactivos WhatsApp y alertas por no respuesta
            </p>
          </div>
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            Central PBX IP: En Línea
          </span>
        </div>

        {/* Red Alert if Wake-Up Call Unanswered */}
        {failedWakeUps.length > 0 && (
          <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
              <AlertOctagon className="h-5 w-5 text-red-600 animate-bounce" />
              ALERTA ROJA EN RECEPCIÓN — DESPERTADOR SIN RESPUESTA ({failedWakeUps.length})
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {failedWakeUps.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-red-900">
                      Hab. {f.roomNumber} · {f.guestName}
                    </p>
                    <p className="text-[11px] text-red-700">
                      Hora: {f.horaProgramada} · {f.respuestaHuesped}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => respondWakeUpCall(f.id, 'ATENDIDO')}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-800"
                  >
                    Agente tocó puerta ✓
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CRM Suggestions for Returning Guests */}
        {crmWakeSuggestions.length > 0 && (
          <div className="rounded-xl border border-[#D4AF37] bg-[#FBF4E2] p-3.5 shadow-xs space-y-2">
            <p className="text-xs font-bold text-[#5C3F04] flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#9A6E0E]" />
              Sugerencias Automáticas del Perfil CRM (Preferencias Previas):
            </p>
            <div className="flex flex-wrap gap-2">
              {crmWakeSuggestions.map(({ stay, guest, suggestedHour }) => (
                <div
                  key={stay.id}
                  className="flex items-center gap-3 rounded-lg border border-[#E2D2AF] bg-white px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-[#2A2015]">
                      Hab. {stay.roomNumber} · {guest.nombres}
                    </p>
                    <p className="text-[11px] text-[#6E5D47]">
                      Última visita pidió despertador a las <strong>{suggestedHour}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      scheduleWakeUp({
                        roomId: stay.roomId,
                        horaProgramada: suggestedHour,
                        fechaProgramada: toYMD(new Date(Date.now() + 86400000)),
                        canal: 'DUAL_PBX_WHATSAPP',
                        idioma: guest.idiomaPreferido || 'ES',
                        creadoPor: 'CRM_SUGERENCIA',
                      })
                    }
                    className="rounded-lg bg-[#9A6E0E] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#7E590A]"
                  >
                    Programar igual
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left: Schedule Form */}
          <form
            onSubmit={handleScheduleWakeUp}
            className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs lg:col-span-4 space-y-3 text-xs"
          >
            <h3 className="font-luxury text-sm font-bold text-[#2A2015]">
              Programar Nuevo Despertador
            </h3>
            <div>
              <label className="mb-1 block font-semibold text-[#3A2B18]">Habitación / Extensión PBX</label>
              <select
                value={wuRoomId}
                onChange={(e) => setWuRoomId(e.target.value)}
                className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
              >
                {state.rooms.map((r) => {
                  const stay = state.stays.find((s) => s.roomId === r.id && s.status === 'ACTIVA');
                  return (
                    <option key={r.id} value={r.id}>
                      Hab. {r.numero} ({r.status}) {stay ? `— ${stay.guestName}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block font-semibold text-[#3A2B18]">Fecha</label>
                <input
                  type="date"
                  value={wuFecha}
                  onChange={(e) => setWuFecha(e.target.value)}
                  className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-[#3A2B18]">Hora Exacta</label>
                <input
                  type="time"
                  value={wuHora}
                  onChange={(e) => setWuHora(e.target.value)}
                  className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2 font-mono font-bold"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-[#3A2B18]">Canal de Despertador</label>
              <select
                value={wuCanal}
                onChange={(e) => setWuCanal(e.target.value as WakeUpCall['canal'])}
                className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
              >
                <option value="DUAL_PBX_WHATSAPP">Dual: Teléfono PBX + WhatsApp Bot</option>
                <option value="PBX_TELEFONO">Solo Teléfono de Habitación (PBX)</option>
                <option value="WHATSAPP_BOT">Solo WhatsApp Interactivo</option>
                <option value="ALEXA_NEST">Asistente de Voz (Alexa / Google Nest)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block font-semibold text-[#3A2B18]">Central PBX</label>
                <select
                  value={wuProvider}
                  onChange={(e) => setWuProvider(e.target.value as WakeUpCall['pbxProvider'])}
                  className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                >
                  <option value="Yeastar">Yeastar IP PBX</option>
                  <option value="Grandstream">Grandstream UCM</option>
                  <option value="Mitel">Mitel MiVoice</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-[#3A2B18]">Idioma Locución IA</label>
                <select
                  value={wuIdioma}
                  onChange={(e) => setWuIdioma(e.target.value as GuestLanguage)}
                  className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                >
                  <option value="ES">Español</option>
                  <option value="EN">English</option>
                  <option value="DE">Deutsch</option>
                  <option value="JP">日本語</option>
                  <option value="FR">Français</option>
                  <option value="PT">Português</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#9A6E0E] py-2.5 font-bold text-white hover:bg-[#7E590A]"
            >
              <PhoneCall className="h-4 w-4" />
              Sincronizar con PBX & WhatsApp
            </button>
          </form>

          {/* Right: Wake-up Queue & Simulator */}
          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-luxury text-sm font-bold text-[#2A2015]">
                Cola de Despertadores Programados ({state.wakeUpCalls.length})
              </h3>
              <span className="text-[11px] text-[#6E5D47]">
                Prueba el timbrado PBX y las respuestas del huésped en tiempo real
              </span>
            </div>

            <div className="space-y-2.5">
              {state.wakeUpCalls.map((w) => (
                <div
                  key={w.id}
                  className="rounded-xl border border-[#EFE4CB] bg-white p-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[#3A2B18] px-2 py-0.5 font-mono text-xs font-bold text-white">
                        Hab. {w.roomNumber} · Ext {w.pbxExtension}
                      </span>
                      <span className="font-mono text-sm font-bold text-[#9A6E0E]">
                        {w.horaProgramada}
                      </span>
                      <span className="text-[11px] text-[#6E5D47]">{w.fechaProgramada}</span>
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[w.status]}`}>
                        {w.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#2A2015]">{w.guestName}</p>
                    <p className="text-[11px] text-[#6E5D47] flex flex-wrap items-center gap-2">
                      <span>{CANAL_LABEL[w.canal]}</span>
                      <span>· PBX {w.pbxProvider}</span>
                      <span>· Idioma: {w.idioma}</span>
                      {w.canal === 'ALEXA_NEST' && (
                        <span className="inline-flex items-center gap-0.5 text-sky-700 font-semibold">
                          <Mic className="h-3 w-3" /> IoT Voz
                        </span>
                      )}
                    </p>
                    {w.respuestaHuesped && (
                      <p className="text-[11px] font-semibold text-[#5C4A33]">
                        Resultado: {w.respuestaHuesped}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(w.status === 'PROGRAMADO' || w.status === 'POSPUESTO') && (
                      <button
                        type="button"
                        onClick={() => triggerWakeUpCall(w.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#3A2B18] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#2A2015]"
                      >
                        <PhoneCall className="h-3 w-3 text-[#E5C158]" />
                        Ejecutar / Timbrar Ahora
                      </button>
                    )}
                    {w.status === 'SONANDO' && (
                      <>
                        <button
                          type="button"
                          onClick={() => respondWakeUpCall(w.id, 'ATENDIDO')}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-800"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          "Sí, gracias" (Atendido)
                        </button>
                        <button
                          type="button"
                          onClick={() => respondWakeUpCall(w.id, 'POSPUESTO', 10)}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-1.5 text-[11px] font-bold text-purple-800 hover:bg-purple-100"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Posponer +10 min
                        </button>
                        <button
                          type="button"
                          onClick={() => respondWakeUpCall(w.id, 'FALLO_SIN_RESPUESTA')}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-red-700"
                        >
                          Sin Respuesta (Alerta)
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteWakeUpCall(w.id)}
                      className="rounded-lg border border-[#E2D2AF] p-1.5 text-[#6E5D47] hover:bg-red-50 hover:text-red-700"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PAQUETES TURISTICOS & SPA BOOKING ENGINE
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
        <div>
          <h2 className="font-luxury text-lg font-bold text-[#2A2015] flex items-center gap-2">
            <Compass className="h-5 w-5 text-[#9A6E0E]" />
            Paquetes Turísticos, Expediciones & Spa Andino (Concierge Engine)
          </h2>
          <p className="text-xs text-[#6E5D47]">
            Reserva tours solicitados por el huésped en recepción o vía Agente WhatsApp con cargo directo a cuenta de habitación o cobro inmediato
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewPkgModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#7E590A]"
        >
          <Plus className="h-4 w-4" />
          Nuevo Paquete Turístico
        </button>
      </div>

      {/* Packages Catalog Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {state.tourPackages.map((pkg) => (
          <div
            key={pkg.id}
            className="flex flex-col justify-between rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-[#FBF4E2] border border-[#E2D2AF] px-2 py-0.5 font-mono text-[10px] font-bold text-[#7E590A]">
                  {pkg.codigo}
                </span>
                <span className="text-[10px] font-bold uppercase text-[#6E5D47]">
                  {pkg.categoria.replace(/_/g, ' ')}
                </span>
              </div>
              <h3 className="font-luxury text-sm font-bold text-[#2A2015]">{pkg.nombre}</h3>
              <p className="text-xs text-[#5C4A33] leading-relaxed">{pkg.descripcion}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {pkg.incluye.map((inc, idx) => (
                  <span
                    key={idx}
                    className="rounded border border-[#EFE4CB] bg-white px-2 py-0.5 text-[10px] text-[#5C4A33]"
                  >
                    ✓ {inc}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#EFE4CB] pt-3">
              <div>
                <p className="text-[10px] text-[#6E5D47]">
                  Salida: {pkg.horarioSalida} · {pkg.duracion}
                </p>
                <p className="font-mono text-base font-bold text-[#9A6E0E]">
                  {formatCurrency(pkg.precioPorPax)}{' '}
                  <span className="text-[10px] font-normal text-[#6E5D47]">/ pax</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => openBookPackage(pkg)}
                className="rounded-lg bg-[#3A2B18] px-3 py-2 text-xs font-bold text-white hover:bg-[#2A2015]"
              >
                Reservar Tour
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tour Bookings History Table */}
      <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs space-y-3">
        <h3 className="font-luxury text-sm font-bold text-[#2A2015]">
          Reservas de Paquetes Turísticos & Spa ({state.tourBookings.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[#3A2B18]">
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Paquete / Experiencia</th>
                <th className="px-3 py-2">Huésped / Hab.</th>
                <th className="px-3 py-2">Fecha & Recojo</th>
                <th className="px-3 py-2">Pax</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Facturación / Canal</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4CB]">
              {state.tourBookings.map((b) => (
                <tr key={b.id} className="hover:bg-[#FCF8EE]">
                  <td className="px-3 py-2 font-mono font-bold text-[#9A6E0E]">{b.codigo}</td>
                  <td className="px-3 py-2 font-semibold text-[#2A2015]">{b.packageName}</td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-[#2A2015]">{b.guestName}</p>
                    {b.roomNumber && (
                      <span className="text-[10px] font-mono text-[#6E5D47]">Hab. {b.roomNumber}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {b.fechaTour} · {b.horaRecojo}
                  </td>
                  <td className="px-3 py-2 font-bold">{b.pax}</td>
                  <td className="px-3 py-2 font-mono font-bold text-[#2A2015]">
                    {formatCurrency(b.total)}
                  </td>
                  <td className="px-3 py-2 text-[11px]">
                    <span className="block font-semibold">
                      {b.cargadoAHabitacion
                        ? 'Cargado a Folio Hab.'
                        : b.pagado
                          ? `Pagado (${b.metodoPago})`
                          : 'Por cobrar'}
                    </span>
                    <span className="text-[10px] text-[#6E5D47]">
                      Vía {b.solicitadoVia.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={b.status}
                      onChange={(e) =>
                        updateTourBookingStatus(b.id, e.target.value as typeof b.status)
                      }
                      className="rounded border border-[#E2D2AF] bg-white px-2 py-1 text-[11px] font-semibold"
                    >
                      <option value="CONFIRMADA">CONFIRMADA</option>
                      <option value="EN_CURSO">EN CURSO</option>
                      <option value="COMPLETADA">COMPLETADA</option>
                      <option value="CANCELADA">CANCELADA</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setPrintTicket({
                          tipo: 'RESERVA',
                          titulo: 'VOUCHER DE PAQUETE TURÍSTICO',
                          numero: b.codigo,
                          fecha: `${b.fechaTour} ${b.horaRecojo}`,
                          cliente: b.guestName,
                          documento: b.guestDoc,
                          habitacion: b.roomNumber ? `Hab. ${b.roomNumber}` : 'Externo',
                          detalleLineas: [
                            { label: 'Experiencia', value: b.packageName },
                            { label: 'Pasajeros (PAX)', value: String(b.pax) },
                            { label: 'Hora de Recojo', value: b.horaRecojo },
                            {
                              label: 'Forma de Cargo',
                              value: b.cargadoAHabitacion ? 'A cuenta de Habitación' : 'Pagado Directo',
                            },
                          ],
                          total: b.total,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded border border-[#E2D2AF] px-2 py-1 text-[11px] font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
                    >
                      <Printer className="h-3 w-3 text-[#9A6E0E]" />
                      Voucher
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Tour Modal */}
      {bookModalPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFE4CB] pb-3">
              <div>
                <h3 className="font-luxury text-base font-bold text-[#2A2015]">
                  Reservar Paquete · {bookModalPkg.codigo}
                </h3>
                <p className="text-xs text-[#6E5D47]">{bookModalPkg.nombre}</p>
              </div>
              <button
                type="button"
                onClick={() => setBookModalPkg(null)}
                className="rounded-lg p-1 text-[#6E5D47] hover:bg-[#FBF6EA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-[#3A2B18]">
                  Vincular a Habitación Ocupada (Opcional)
                </label>
                <select
                  value={bookStayId}
                  onChange={(e) => {
                    setBookStayId(e.target.value);
                    const s = state.stays.find((x) => x.id === e.target.value);
                    if (s) {
                      setBookGuestName(s.guestName);
                      setBookChargeToRoom(true);
                    } else {
                      setBookChargeToRoom(false);
                    }
                  }}
                  className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
                >
                  <option value="">-- Cliente Externo / Venta Libre --</option>
                  {state.stays
                    .filter((s) => s.status === 'ACTIVA')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        Hab. {s.roomNumber} — {s.guestName}
                      </option>
                    ))}
                </select>
              </div>

              {!bookStayId && (
                <div>
                  <label className="mb-1 block font-semibold text-[#3A2B18]">Nombre del Pasajero</label>
                  <input
                    value={bookGuestName}
                    onChange={(e) => setBookGuestName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#3A2B18]">Fecha del Tour</label>
                  <input
                    type="date"
                    value={bookFecha}
                    onChange={(e) => setBookFecha(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#3A2B18]">Cantidad de Pax</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={bookPax}
                    onChange={(e) => setBookPax(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              {bookStayId && (
                <label className="flex items-center gap-2 rounded-lg border border-[#E2D2AF] bg-[#FBF6EA] p-2.5 font-semibold text-[#3A2B18]">
                  <input
                    type="checkbox"
                    checked={bookChargeToRoom}
                    onChange={(e) => setBookChargeToRoom(e.target.checked)}
                    className="accent-[#9A6E0E]"
                  />
                  Cargar automáticamente a la cuenta (Folio) de la Habitación
                </label>
              )}

              {!bookChargeToRoom && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-[#3A2B18]">Método de Pago</label>
                    <select
                      value={bookPayMethod}
                      onChange={(e) => setBookPayMethod(e.target.value as PaymentMethodName)}
                      className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                    >
                      <option value="EFECTIVO">EFECTIVO</option>
                      <option value="TARJETA">TARJETA</option>
                      <option value="YAPE">YAPE</option>
                      <option value="PLIN">PLIN</option>
                      <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#3A2B18]">Comprobante</label>
                    <select
                      value={bookVoucherType}
                      onChange={(e) => setBookVoucherType(e.target.value as VoucherType)}
                      className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                    >
                      <option value="BOLETA">BOLETA</option>
                      <option value="FACTURA">FACTURA</option>
                      <option value="TICKET">TICKET</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block font-semibold text-[#3A2B18]">Observaciones / Alergias</label>
                <input
                  value={bookObs}
                  onChange={(e) => setBookObs(e.target.value)}
                  placeholder="Ej: Box lunch vegetariano, bastones incluidos..."
                  className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#D4AF37] bg-[#FBF4E2] px-4 py-3">
                <span className="font-semibold text-[#3A2B18]">
                  Total ({bookPax} pax × {formatCurrency(bookModalPkg.precioPorPax)})
                </span>
                <span className="font-mono text-lg font-bold text-[#9A6E0E]">
                  {formatCurrency(bookPax * bookModalPkg.precioPorPax)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setBookModalPkg(null)}
                  className="rounded-lg border border-[#E2D2AF] px-4 py-2 font-semibold text-[#5C4A33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#9A6E0E] px-5 py-2 font-bold text-white hover:bg-[#7E590A]"
                >
                  Confirmar Reserva Tour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Package Modal */}
      {showNewPkgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFE4CB] pb-3">
              <h3 className="font-luxury text-base font-bold text-[#2A2015]">
                Registrar Nuevo Paquete Turístico
              </h3>
              <button
                type="button"
                onClick={() => setShowNewPkgModal(false)}
                className="rounded-lg p-1 text-[#6E5D47] hover:bg-[#FBF6EA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveNewPackage} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold">Código</label>
                  <input
                    value={pkgCodigo}
                    onChange={(e) => setPkgCodigo(e.target.value)}
                    placeholder="TOUR-CT07"
                    className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Categoría</label>
                  <select
                    value={pkgCat}
                    onChange={(e) => setPkgCat(e.target.value as TourPackage['categoria'])}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                  >
                    <option value="TOUR_CUSCO">TOUR CUSCO</option>
                    <option value="AVENTURA">AVENTURA</option>
                    <option value="SPA_BIENESTAR">SPA Y BIENESTAR</option>
                    <option value="TRASLADO_VIP">TRASLADO VIP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Nombre del Paquete</label>
                <input
                  value={pkgNombre}
                  onChange={(e) => setPkgNombre(e.target.value)}
                  placeholder="Ej: CITY TOUR ARQUEOLÓGICO SACSAYHUAMÁN"
                  className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block font-semibold">Precio/Pax</label>
                  <input
                    type="number"
                    min={1}
                    value={pkgPrecio}
                    onChange={(e) => setPkgPrecio(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Salida</label>
                  <input
                    value={pkgSalida}
                    onChange={(e) => setPkgSalida(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Duración</label>
                  <input
                    value={pkgDuracion}
                    onChange={(e) => setPkgDuracion(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Operador Aliado</label>
                <input
                  value={pkgOperador}
                  onChange={(e) => setPkgOperador(e.target.value)}
                  className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Descripción</label>
                <textarea
                  rows={2}
                  value={pkgDesc}
                  onChange={(e) => setPkgDesc(e.target.value)}
                  className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPkgModal(false)}
                  className="rounded-lg border border-[#E2D2AF] px-4 py-2 font-semibold text-[#5C4A33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-bold text-white hover:bg-[#7E590A]"
                >
                  Guardar Paquete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printTicket && (
        <PrintTicketModal ticket={printTicket} onClose={() => setPrintTicket(null)} />
      )}
    </div>
  );
};
