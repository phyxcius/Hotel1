import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Printer,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type { ModuleId, PaymentMethodName, Reservation, VoucherType } from '../../types/pms';
import { exportToCsv, formatCurrency } from '../../utils/exportCsv';
import { addDays, toYMD } from '../../data/seedData';
import { PrintTicketModal, type PrintTicketData } from '../common/PrintTicketModal';

interface ReservasModuleProps {
  mode: 'reservas_libro' | 'reservas_llegadas' | 'reservas_control';
  onNavigate: (mod: ModuleId) => void;
}

const ORIGIN_STYLES: Record<Reservation['origen'], string> = {
  DIRECTA: 'bg-[#9A6E0E] text-white',
  BOOKING: 'bg-blue-700 text-white',
  AIRBNB: 'bg-rose-600 text-white',
  AGENCIA: 'bg-amber-600 text-white',
  WEB: 'bg-indigo-600 text-white',
};

const STATUS_BADGE: Record<Reservation['status'], string> = {
  CONFIRMADA: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  PENDIENTE: 'text-amber-700 bg-amber-50 border-amber-200',
  CHECKED_IN: 'text-sky-700 bg-sky-50 border-sky-200',
  CANCELADA: 'text-slate-500 bg-slate-100 border-slate-200',
};

export const ReservasModule: React.FC<ReservasModuleProps> = ({ mode, onNavigate }) => {
  const {
    state,
    createReservation,
    updateReservationStatus,
    deleteReservation,
    checkInGuest,
    getRoomRateForDate,
    notify,
  } = usePMS();

  const [daysSpan, setDaysSpan] = useState<10 | 15 | 25 | 40>(15);
  const [startDate, setStartDate] = useState<Date>(() => addDays(new Date(), -1));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Reservation['status']>('ALL');
  const [originFilter, setOriginFilter] = useState<'ALL' | Reservation['origen']>('ALL');

  const [printTicket, setPrintTicket] = useState<PrintTicketData | null>(null);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);

  // New Reservation Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [formRoomId, setFormRoomId] = useState(state.rooms[0]?.id || '');
  const [formGuestId, setFormGuestId] = useState(state.guests[0]?.id || '');
  const [formEntrada, setFormEntrada] = useState(() => toYMD(new Date()));
  const [formNoches, setFormNoches] = useState(1);
  const [formOrigen, setFormOrigen] = useState<Reservation['origen']>('DIRECTA');
  const [formAdelanto, setFormAdelanto] = useState(0);
  const [formMetodoAdelanto, setFormMetodoAdelanto] = useState<PaymentMethodName>('YAPE');
  const [formObs, setFormObs] = useState('');

  // Quick Check-In Modal from Reservation
  const [checkInRes, setCheckInRes] = useState<Reservation | null>(null);
  const [ciPagoAhora, setCiPagoAhora] = useState(0);
  const [ciMetodo, setCiMetodo] = useState<PaymentMethodName>('EFECTIVO');
  const [ciVoucher, setCiVoucher] = useState<VoucherType>('BOLETA');

  const timelineDays = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < daysSpan; i++) {
      arr.push(addDays(startDate, i));
    }
    return arr;
  }, [startDate, daysSpan]);

  const openNewModalAt = (roomId?: string, dateStr?: string) => {
    setFormRoomId(roomId || state.rooms[0]?.id || '');
    setFormGuestId(state.guests[0]?.id || '');
    setFormEntrada(dateStr || toYMD(new Date()));
    setFormNoches(1);
    setFormOrigen('DIRECTA');
    setFormAdelanto(0);
    setFormObs('');
    setShowNewModal(true);
  };

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    const room = state.rooms.find((r) => r.id === formRoomId);
    const guest = state.guests.find((g) => g.id === formGuestId);
    if (!room || !guest) {
      notify('error', 'Seleccione habitación y huésped');
      return;
    }
    const rt = state.roomTypes.find((t) => t.id === room.roomTypeId);
    const rate = getRoomRateForDate(room.id, '24h', new Date(`${formEntrada}T12:00:00`));
    const salidaDate = addDays(new Date(`${formEntrada}T12:00:00`), formNoches);
    const total = rate * formNoches;

    createReservation({
      roomId: room.id,
      roomNumber: room.numero,
      roomTypeName: rt?.nombre || 'HABITACION',
      guestId: guest.id,
      guestName: guest.nombres,
      guestDoc: guest.numDoc,
      fechaEntrada: `${formEntrada} ${state.config.horaCheckIn}`,
      fechaSalida: `${toYMD(salidaDate)} ${state.config.horaCheckOut}`,
      noches: formNoches,
      total,
      adelanto: Math.min(formAdelanto, total),
      metodoPagoAdelanto: formAdelanto > 0 ? formMetodoAdelanto : undefined,
      origen: formOrigen,
      status: 'CONFIRMADA',
      observaciones: formObs || 'Reserva registrada desde sistema.',
    });
    setShowNewModal(false);
  };

  const openQuickCheckIn = (res: Reservation) => {
    const room = state.rooms.find((r) => r.id === res.roomId);
    if (!room || room.status !== 'DISPONIBLE') {
      notify('warning', `Hab. ${res.roomNumber} no está disponible`, 'Libere o limpie la habitación primero.');
      return;
    }
    setCheckInRes(res);
    setCiPagoAhora(Math.max(0, res.total - res.adelanto));
    setCiMetodo('EFECTIVO');
    setCiVoucher('BOLETA');
  };

  const handleConfirmQuickCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInRes) return;
    const stay = checkInGuest({
      roomId: checkInRes.roomId,
      guestId: checkInRes.guestId,
      invitados: [],
      modalidad: 'NOCHES',
      cantidad: checkInRes.noches,
      tarifaUnitaria: Math.round(checkInRes.total / Math.max(1, checkInRes.noches)),
      esCortesia: false,
      observaciones: checkInRes.observaciones,
      montoPagarAhora: ciPagoAhora,
      metodoPago: ciMetodo,
      voucherType: ciVoucher,
      reservationId: checkInRes.id,
    });
    if (stay) {
      setCheckInRes(null);
      setSelectedRes(null);
      onNavigate('recepcion');
    }
  };

  const buildVoucherTicket = (res: Reservation): PrintTicketData => ({
    tipo: 'RESERVA',
    titulo: 'VOUCHER DE RESERVA CONFIRMADA',
    numero: res.localizador,
    fecha: res.fechaEntrada,
    cliente: res.guestName,
    documento: res.guestDoc,
    habitacion: `${res.roomNumber} (${res.roomTypeName})`,
    detalleLineas: [
      { label: 'Canal / Origen', value: res.origen },
      { label: 'Check-In', value: res.fechaEntrada },
      { label: 'Check-Out', value: res.fechaSalida },
      { label: 'Noches', value: String(res.noches) },
      { label: 'Adelanto', value: formatCurrency(res.adelanto) },
      { label: 'Saldo pendiente', value: formatCurrency(Math.max(0, res.total - res.adelanto)) },
    ],
    total: res.total,
  });

  const filteredReservations = useMemo(() => {
    return state.reservations.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (originFilter !== 'ALL' && r.origen !== originFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.localizador.toLowerCase().includes(q) ||
          r.guestName.toLowerCase().includes(q) ||
          r.roomNumber.toLowerCase().includes(q) ||
          r.guestDoc.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.reservations, statusFilter, originFilter, searchQuery]);

  const arrivalList = useMemo(() => {
    return filteredReservations.filter((r) => r.status === 'CONFIRMADA' || r.status === 'PENDIENTE');
  }, [filteredReservations]);

  const handleExport = () => {
    exportToCsv(
      `reservas_lachuspa_${toYMD(new Date())}.csv`,
      ['Localizador', 'Habitación', 'Tipo', 'Huésped', 'Documento', 'Entrada', 'Salida', 'Noches', 'Origen', 'Total', 'Adelanto', 'Estado'],
      filteredReservations.map((r) => [
        r.localizador,
        r.roomNumber,
        r.roomTypeName,
        r.guestName,
        r.guestDoc,
        r.fechaEntrada,
        r.fechaSalida,
        r.noches,
        r.origen,
        r.total,
        r.adelanto,
        r.status,
      ])
    );
    notify('success', 'Listado exportado a CSV');
  };

  return (
    <div className="space-y-4">
      {/* Navigation Sub-tabs + Primary CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'reservas_libro', label: 'Libro de Reservas (Gantt)' },
            { id: 'reservas_llegadas', label: 'Llegadas' },
            { id: 'reservas_control', label: 'Control de Reservas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id as ModuleId)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                mode === tab.id
                  ? 'bg-[#3A2B18] text-white'
                  : 'text-[#5C4A33] hover:bg-[#FBF6EA] hover:text-[#2A2015]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2D2AF] bg-[#FFFDF9] px-3 py-1.5 text-xs font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
          >
            <Download className="h-3.5 w-3.5 text-[#9A6E0E]" />
            Exportar CSV
          </button>
          <button
            onClick={() => openNewModalAt()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#7E590A]"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Nueva Reserva
          </button>
        </div>
      </div>

      {/* GANTT BOOKING CALENDAR */}
      {mode === 'reservas_libro' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStartDate((d) => addDays(d, -5))}
                className="rounded-lg border border-[#E2D2AF] p-1.5 text-[#5C4A33] hover:bg-[#FBF6EA]"
                title="Días anteriores"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setStartDate(addDays(new Date(), -1))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2D2AF] px-3 py-1.5 text-xs font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
              >
                <Calendar className="h-3.5 w-3.5 text-[#9A6E0E]" />
                Hoy ({toYMD(new Date())})
              </button>
              <button
                onClick={() => setStartDate((d) => addDays(d, 5))}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                title="Días siguientes"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Vista:</span>
              {([10, 15, 25, 40] as const).map((span) => (
                <button
                  key={span}
                  onClick={() => setDaysSpan(span)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums ${
                    daysSpan === span
                      ? 'bg-[#9A6E0E] text-white'
                      : 'border border-[#E2D2AF] text-[#5C4A33] hover:bg-[#FBF6EA]'
                  }`}
                >
                  {span} días
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2D2AF] bg-[#FBF6EA]">
                  <th className="sticky left-0 z-10 min-w-[170px] border-r border-[#E2D2AF] bg-[#FBF6EA] px-3 py-2.5 text-left font-bold text-[#3A2B18]">
                    Habitación
                  </th>
                  {timelineDays.map((d) => {
                    const ymd = toYMD(d);
                    const isToday = ymd === toYMD(new Date());
                    const dayName = d.toLocaleDateString('es-PE', { weekday: 'short' }).toUpperCase();
                    return (
                      <th
                        key={ymd}
                        className={`min-w-[68px] border-r border-[#E2D2AF] px-1.5 py-2 text-center ${
                          isToday ? 'bg-[#F5E6C4] text-[#5C3F04]' : 'text-[#5C4A33]'
                        }`}
                      >
                        <div className="text-[10px] font-semibold">{dayName}</div>
                        <div className="font-mono text-xs font-bold tabular-nums">
                          {String(d.getDate()).padStart(2, '0')}/{String(d.getMonth() + 1).padStart(2, '0')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.rooms.map((room) => {
                  const rt = state.roomTypes.find((t) => t.id === room.roomTypeId);
                  return (
                    <tr key={room.id} className="hover:bg-slate-50/70">
                      <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-slate-900">Hab. {room.numero}</span>
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: state.config.coloresEstado[room.status] }}
                            title={room.status}
                          />
                        </div>
                        <p className="truncate text-[10px] text-slate-500">{rt?.nombre}</p>
                      </td>
                      {timelineDays.map((d) => {
                        const ymd = toYMD(d);
                        const activeRes = state.reservations.find((r) => {
                          if (r.roomId !== room.id || r.status === 'CANCELADA') return false;
                          const startYmd = r.fechaEntrada.slice(0, 10);
                          const endYmd = r.fechaSalida.slice(0, 10);
                          return ymd >= startYmd && ymd < endYmd;
                        });
                        const isStart = activeRes && activeRes.fechaEntrada.slice(0, 10) === ymd;

                        const activeStay = state.stays.find((s) => {
                          if (s.roomId !== room.id || s.status !== 'ACTIVA') return false;
                          const sStart = s.fechaEntrada.slice(0, 10);
                          const sEnd = s.fechaSalidaProgramada.slice(0, 10);
                          return ymd >= sStart && ymd <= sEnd;
                        });

                        return (
                          <td
                            key={ymd}
                            onClick={() => {
                              if (activeRes) setSelectedRes(activeRes);
                              else openNewModalAt(room.id, ymd);
                            }}
                            className="h-11 cursor-pointer border-r border-[#EFE4CB] p-0.5 align-middle transition-colors hover:bg-[#FBF5E6]"
                          >
                            {activeRes ? (
                              <div
                                className={`flex h-full items-center rounded px-1.5 text-[10px] font-semibold truncate ${ORIGIN_STYLES[activeRes.origen]}`}
                                title={`${activeRes.guestName} (${activeRes.localizador})`}
                              >
                                {isStart ? activeRes.guestName.split(' ')[0] : activeRes.localizador}
                              </div>
                            ) : activeStay && ymd === toYMD(new Date()) ? (
                              <div
                                className="flex h-full items-center rounded bg-red-600 px-1.5 text-[10px] font-semibold text-white truncate"
                                title={`Ocupada: ${activeStay.guestName}`}
                              >
                                {activeStay.guestName.split(' ')[0]}
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {/* Daily Occupancy Row */}
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                    Ocupación del día
                  </td>
                  {timelineDays.map((d) => {
                    const ymd = toYMD(d);
                    const count = state.rooms.filter((room) => {
                      const hasRes = state.reservations.some(
                        (r) =>
                          r.roomId === room.id &&
                          r.status !== 'CANCELADA' &&
                          ymd >= r.fechaEntrada.slice(0, 10) &&
                          ymd < r.fechaSalida.slice(0, 10)
                      );
                      const hasStay =
                        ymd === toYMD(new Date()) && room.status === 'OCUPADO';
                      return hasRes || hasStay;
                    }).length;
                    const pct = Math.round((count / Math.max(1, state.rooms.length)) * 100);
                    return (
                      <td
                        key={ymd}
                        className="border-r border-slate-200 px-1 py-2 text-center font-mono text-[11px] text-slate-700 tabular-nums"
                      >
                        {pct}%
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LLEGADAS / CONTROL DE RESERVAS TABLE */}
      {(mode === 'reservas_llegadas' || mode === 'reservas_control') && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por localizador, huésped, documento o habitación..."
                className="w-full rounded-lg border border-[#DECFA8] pl-8 pr-3 py-1.5 text-xs focus:border-[#B8891F] focus:outline-none"
              />
            </div>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value as typeof originFilter)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            >
              <option value="ALL">Todos los orígenes</option>
              <option value="DIRECTA">Directa</option>
              <option value="BOOKING">Booking.com</option>
              <option value="AIRBNB">Airbnb</option>
              <option value="AGENCIA">Agencia</option>
              <option value="WEB">Web Hotel</option>
            </select>
            {mode === 'reservas_control' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              >
                <option value="ALL">Todos los estados</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="CHECKED_IN">Checked-In</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase tracking-wider text-[#6E5D47]">
                <tr>
                  <th className="px-4 py-3">Localizador</th>
                  <th className="px-4 py-3">Habitación</th>
                  <th className="px-4 py-3">Huésped</th>
                  <th className="px-4 py-3">Entrada / Salida</th>
                  <th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Adelanto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(mode === 'reservas_llegadas' ? arrivalList : filteredReservations).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                      No se encontraron reservas para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  (mode === 'reservas_llegadas' ? arrivalList : filteredReservations).map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-[#9A6E0E]">{res.localizador}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-900">Hab. {res.roomNumber}</span>
                        <p className="text-[11px] text-slate-500">{res.roomTypeName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{res.guestName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{res.guestDoc}</p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <p className="text-slate-800">{res.fechaEntrada}</p>
                        <p className="text-[11px] text-slate-400">
                          {res.fechaSalida} · {res.noches} noche(s)
                        </p>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{res.origen}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                        {formatCurrency(res.total)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        {formatCurrency(res.adelanto)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[res.status]}`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {(res.status === 'CONFIRMADA' || res.status === 'PENDIENTE') && (
                            <button
                              onClick={() => openQuickCheckIn(res)}
                              className="inline-flex items-center gap-1 rounded-md bg-[#9A6E0E] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#7E590A]"
                              title="Realizar Check-In"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Check-In
                            </button>
                          )}
                          <button
                            onClick={() => setPrintTicket(buildVoucherTicket(res))}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                            title="Imprimir Voucher"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedRes(res)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                            title="Ver Detalle"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {res.status !== 'CANCELADA' && res.status !== 'CHECKED_IN' && (
                            <button
                              onClick={() => updateReservationStatus(res.id, 'CANCELADA')}
                              className="rounded-md border border-slate-200 p-1.5 text-amber-600 hover:bg-amber-50"
                              title="Cancelar reserva"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteReservation(res.id)}
                            className="rounded-md border border-slate-200 p-1.5 text-red-600 hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW RESERVATION MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFE4CB] bg-[#FBF6EA] px-6 py-4 rounded-t-2xl">
              <h3 className="text-sm font-bold text-slate-900">Registrar Nueva Reserva</h3>
              <button onClick={() => setShowNewModal(false)} className="rounded p-1 text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateReservation} className="space-y-4 p-6 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Habitación</label>
                  <select
                    value={formRoomId}
                    onChange={(e) => setFormRoomId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {state.rooms.map((r) => {
                      const rt = state.roomTypes.find((t) => t.id === r.roomTypeId);
                      return (
                        <option key={r.id} value={r.id}>
                          Hab. {r.numero} — {rt?.nombre}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Huésped</label>
                  <select
                    value={formGuestId}
                    onChange={(e) => setFormGuestId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {state.guests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nombres} ({g.numDoc})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Fecha de Llegada</label>
                  <input
                    type="date"
                    value={formEntrada}
                    onChange={(e) => setFormEntrada(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Noches</label>
                  <input
                    type="number"
                    min={1}
                    value={formNoches}
                    onChange={(e) => setFormNoches(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Canal / Origen</label>
                  <select
                    value={formOrigen}
                    onChange={(e) => setFormOrigen(e.target.value as Reservation['origen'])}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="DIRECTA">Directa (Recepción / WhatsApp)</option>
                    <option value="BOOKING">Booking.com</option>
                    <option value="AIRBNB">Airbnb</option>
                    <option value="AGENCIA">Agencia</option>
                    <option value="WEB">Motor Web Hotel</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Adelanto (S/)</label>
                  <input
                    type="number"
                    min={0}
                    value={formAdelanto}
                    onChange={(e) => setFormAdelanto(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
              </div>
              {formAdelanto > 0 && (
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Método de Pago Adelanto</label>
                  <select
                    value={formMetodoAdelanto}
                    onChange={(e) => setFormMetodoAdelanto(e.target.value as PaymentMethodName)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="YAPE">YAPE</option>
                    <option value="PLIN">PLIN</option>
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                    <option value="TARJETA">TARJETA</option>
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Observaciones</label>
                <input
                  type="text"
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  placeholder="Hora estimada de llegada, cama adicional, etc."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#9A6E0E] px-5 py-2 font-semibold text-white hover:bg-[#7E590A]"
                >
                  Guardar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESERVATION DETAIL MODAL */}
      {selectedRes && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reserva {selectedRes.localizador}</h3>
                <p className="text-[11px] text-slate-500">{selectedRes.origen}</p>
              </div>
              <button onClick={() => setSelectedRes(null)} className="rounded p-1 text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Huésped:</span>
                <span className="font-semibold text-slate-900">{selectedRes.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Habitación:</span>
                <span className="font-semibold text-slate-900">Hab. {selectedRes.roomNumber} · {selectedRes.roomTypeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Entrada:</span>
                <span className="font-mono">{selectedRes.fechaEntrada}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Salida:</span>
                <span className="font-mono">{selectedRes.fechaSalida}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total / Adelanto:</span>
                <span className="font-mono font-bold">
                  {formatCurrency(selectedRes.total)} / {formatCurrency(selectedRes.adelanto)}
                </span>
              </div>
              {selectedRes.observaciones && (
                <div className="rounded-lg bg-slate-50 p-2.5 text-slate-600">{selectedRes.observaciones}</div>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setPrintTicket(buildVoucherTicket(selectedRes))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5" />
                Voucher
              </button>
              {(selectedRes.status === 'CONFIRMADA' || selectedRes.status === 'PENDIENTE') && (
                <button
                  onClick={() => openQuickCheckIn(selectedRes)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#9A6E0E] px-3.5 py-1.5 font-semibold text-white hover:bg-[#7E590A]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Hacer Check-In
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK CHECK-IN FROM RESERVATION MODAL */}
      {checkInRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Confirmar Check-In · Hab. {checkInRes.roomNumber}
              </h3>
              <button onClick={() => setCheckInRes(null)} className="rounded p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmQuickCheckIn} className="mt-4 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                <p className="font-semibold text-slate-900">{checkInRes.guestName}</p>
                <p className="text-slate-500">
                  {checkInRes.localizador} · {checkInRes.noches} noche(s) · Total {formatCurrency(checkInRes.total)}
                </p>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Monto a Cobrar en Ingreso (S/)</label>
                <input
                  type="number"
                  min={0}
                  max={checkInRes.total}
                  value={ciPagoAhora}
                  onChange={(e) => setCiPagoAhora(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Método de Pago</label>
                  <select
                    value={ciMetodo}
                    onChange={(e) => setCiMetodo(e.target.value as PaymentMethodName)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
                  >
                    {state.config.paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.nombre}>
                        {pm.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Comprobante</label>
                  <select
                    value={ciVoucher}
                    onChange={(e) => setCiVoucher(e.target.value as VoucherType)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
                  >
                    <option value="BOLETA">BOLETA</option>
                    <option value="FACTURA">FACTURA</option>
                    <option value="TICKET">TICKET</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckInRes(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-semibold text-white hover:bg-[#7E590A]"
                >
                  Completar Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PrintTicketModal ticket={printTicket} onClose={() => setPrintTicket(null)} />
    </div>
  );
};
