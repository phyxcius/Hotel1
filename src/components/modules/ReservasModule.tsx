import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  GripVertical,
  Printer,
  Save,
  Search,
  Trash2,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type {
  DocType,
  ModuleId,
  PaymentMethodName,
  Reservation,
  VoucherType,
} from '../../types/pms';
import { exportToCsv, formatCurrency } from '../../utils/exportCsv';
import { addDays, toYMD } from '../../data/seedData';
import { PrintTicketModal, type PrintTicketData } from '../common/PrintTicketModal';
import {
  addDaysYmd,
  DateRangeCalendar,
  diffDaysYmd,
} from '../common/DateRangeCalendar';

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

type GanttDragState =
  | {
      kind: 'CREATE';
      roomId: string;
      anchorYmd: string;
      hoverYmd: string;
    }
  | {
      kind: 'RESIZE_END';
      res: Reservation;
      roomId: string;
      hoverYmd: string;
      moved: boolean;
    }
  | {
      kind: 'RESIZE_START';
      res: Reservation;
      roomId: string;
      hoverYmd: string;
      moved: boolean;
    }
  | {
      kind: 'MOVE_RES';
      res: Reservation;
      originYmd: string;
      hoverRoomId: string;
      hoverYmd: string;
      moved: boolean;
    }
  | {
      kind: 'EXTEND_STAY';
      stayId: string;
      roomId: string;
      roomNumber: string;
      guestName: string;
      baseEndYmd: string;
      tarifaBase: number;
      hoverYmd: string;
      moved: boolean;
    };

export const ReservasModule: React.FC<ReservasModuleProps> = ({ mode, onNavigate }) => {
  const {
    state,
    createReservation,
    updateReservation,
    updateReservationStatus,
    deleteReservation,
    saveGuest,
    checkInGuest,
    renewStay,
    getRoomRateForDate,
    notify,
  } = usePMS();

  const [daysSpan, setDaysSpan] = useState<10 | 15 | 25 | 40>(15);
  const [startDate, setStartDate] = useState<Date>(() => addDays(new Date(), -1));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Reservation['status']>('ALL');
  const [originFilter, setOriginFilter] = useState<'ALL' | Reservation['origen']>('ALL');

  const [printTicket, setPrintTicket] = useState<PrintTicketData | null>(null);
  const [dragState, setDragState] = useState<GanttDragState | null>(null);

  // Stay Extension Confirmation Modal (triggered when dragging right edge of an active occupied stay)
  const [extendStayPrompt, setExtendStayPrompt] = useState<{
    stayId: string;
    roomNumber: string;
    guestName: string;
    extraNights: number;
    monto: number;
    pagarAhora: boolean;
    metodoPago: PaymentMethodName;
  } | null>(null);

  // New Reservation Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [formRoomId, setFormRoomId] = useState(state.rooms[0]?.id || '');
  const [formGuestId, setFormGuestId] = useState(state.guests[0]?.id || '');
  const [formEntrada, setFormEntrada] = useState(() => toYMD(new Date()));
  const [formNoches, setFormNoches] = useState(1);
  const [formTarifaNoche, setFormTarifaNoche] = useState(170);
  const [formOrigen, setFormOrigen] = useState<Reservation['origen']>('DIRECTA');
  const [formAdelanto, setFormAdelanto] = useState(0);
  const [formMetodoAdelanto, setFormMetodoAdelanto] = useState<PaymentMethodName>('YAPE');
  const [formObs, setFormObs] = useState('');

  // Full Dynamic Reservation Editor Modal (selectedRes)
  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [editRoomId, setEditRoomId] = useState('');
  const [editGuestId, setEditGuestId] = useState('');
  const [editEntrada, setEditEntrada] = useState('');
  const [editSalida, setEditSalida] = useState('');
  const [editNoches, setEditNoches] = useState(1);
  const [editTarifaNoche, setEditTarifaNoche] = useState(170);
  const [editTotal, setEditTotal] = useState(170);
  const [editAdelanto, setEditAdelanto] = useState(0);
  const [editOrigen, setEditOrigen] = useState<Reservation['origen']>('DIRECTA');
  const [editStatus, setEditStatus] = useState<Reservation['status']>('CONFIRMADA');
  const [editObs, setEditObs] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Inline quick new-guest creator inside Edit Modal
  const [editShowNewGuest, setEditShowNewGuest] = useState(false);
  const [quickGuestName, setQuickGuestName] = useState('');
  const [quickGuestDoc, setQuickGuestDoc] = useState('');
  const [quickGuestDocType, setQuickGuestDocType] = useState<DocType>('DNI');

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

  const openNewModalAt = (roomId?: string, dateStr?: string, nights = 1) => {
    const targetRoomId = roomId || state.rooms[0]?.id || '';
    const targetDate = dateStr || toYMD(new Date());
    const rate = getRoomRateForDate(targetRoomId, '24h', new Date(`${targetDate}T12:00:00`));
    setFormRoomId(targetRoomId);
    setFormGuestId(state.guests[0]?.id || '');
    setFormEntrada(targetDate);
    setFormNoches(Math.max(1, nights));
    setFormTarifaNoche(rate);
    setFormOrigen('DIRECTA');
    setFormAdelanto(0);
    setFormObs('');
    setShowNewModal(true);
  };

  const openEditModal = (res: Reservation) => {
    const start = res.fechaEntrada.slice(0, 10);
    const end = res.fechaSalida.slice(0, 10);
    const nights = Math.max(1, diffDaysYmd(start, end) || res.noches);
    const nightly = Math.round((res.total / nights) * 100) / 100;

    setEditingRes(res);
    setEditRoomId(res.roomId);
    setEditGuestId(res.guestId);
    setEditEntrada(start);
    setEditSalida(end);
    setEditNoches(nights);
    setEditTarifaNoche(nightly);
    setEditTotal(res.total);
    setEditAdelanto(res.adelanto);
    setEditOrigen(res.origen);
    setEditStatus(res.status);
    setEditObs(res.observaciones || '');
    setConfirmDeleteId(null);
    setEditShowNewGuest(false);
    setQuickGuestName('');
    setQuickGuestDoc('');
  };

  // Global pointerup handler for smooth Gantt calendar drag gestures
  useEffect(() => {
    if (!dragState) return;

    const handlePointerUp = () => {
      if (dragState.kind === 'CREATE') {
        const minYmd =
          dragState.anchorYmd <= dragState.hoverYmd ? dragState.anchorYmd : dragState.hoverYmd;
        const maxYmd =
          dragState.anchorYmd <= dragState.hoverYmd ? dragState.hoverYmd : dragState.anchorYmd;
        const nights = Math.max(1, diffDaysYmd(minYmd, maxYmd) + 1);
        openNewModalAt(dragState.roomId, minYmd, nights);
      } else if (dragState.kind === 'RESIZE_END') {
        if (!dragState.moved) {
          openEditModal(dragState.res);
        } else {
          const startYmd = dragState.res.fechaEntrada.slice(0, 10);
          // Dragging right edge onto hoverYmd means hoverYmd is the last night stayed -> checkout is hoverYmd + 1 day
          const proposedCheckout = addDaysYmd(dragState.hoverYmd, 1);
          const finalEnd = proposedCheckout > startYmd ? proposedCheckout : addDaysYmd(startYmd, 1);
          const newNights = Math.max(1, diffDaysYmd(startYmd, finalEnd));
          const nightly = dragState.res.total / Math.max(1, dragState.res.noches);
          const newTotal = Math.round(nightly * newNights * 100) / 100;
          updateReservation(dragState.res.id, {
            fechaSalida: `${finalEnd} ${state.config.horaCheckOut}`,
            noches: newNights,
            total: newTotal,
          });
        }
      } else if (dragState.kind === 'RESIZE_START') {
        if (!dragState.moved) {
          openEditModal(dragState.res);
        } else {
          const endYmd = dragState.res.fechaSalida.slice(0, 10);
          const finalStart =
            dragState.hoverYmd < endYmd ? dragState.hoverYmd : addDaysYmd(endYmd, -1);
          const newNights = Math.max(1, diffDaysYmd(finalStart, endYmd));
          const nightly = dragState.res.total / Math.max(1, dragState.res.noches);
          const newTotal = Math.round(nightly * newNights * 100) / 100;
          updateReservation(dragState.res.id, {
            fechaEntrada: `${finalStart} ${state.config.horaCheckIn}`,
            noches: newNights,
            total: newTotal,
          });
        }
      } else if (dragState.kind === 'MOVE_RES') {
        if (!dragState.moved) {
          openEditModal(dragState.res);
        } else {
          const dayShift = diffDaysYmd(dragState.originYmd, dragState.hoverYmd);
          const oldStart = dragState.res.fechaEntrada.slice(0, 10);
          const newStart = addDaysYmd(oldStart, dayShift);
          const newEnd = addDaysYmd(newStart, dragState.res.noches);
          const targetRoom = state.rooms.find((r) => r.id === dragState.hoverRoomId);
          const targetRt = targetRoom
            ? state.roomTypes.find((t) => t.id === targetRoom.roomTypeId)
            : undefined;
          updateReservation(dragState.res.id, {
            roomId: targetRoom?.id || dragState.res.roomId,
            roomNumber: targetRoom?.numero || dragState.res.roomNumber,
            roomTypeName: targetRt?.nombre || dragState.res.roomTypeName,
            fechaEntrada: `${newStart} ${state.config.horaCheckIn}`,
            fechaSalida: `${newEnd} ${state.config.horaCheckOut}`,
          });
        }
      } else if (dragState.kind === 'EXTEND_STAY') {
        if (dragState.moved) {
          const extra = diffDaysYmd(dragState.baseEndYmd, dragState.hoverYmd);
          if (extra >= 1) {
            setExtendStayPrompt({
              stayId: dragState.stayId,
              roomNumber: dragState.roomNumber,
              guestName: dragState.guestName,
              extraNights: extra,
              monto: extra * dragState.tarifaBase,
              pagarAhora: true,
              metodoPago: 'EFECTIVO',
            });
          }
        }
      }

      setDragState(null);
    };

    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  });

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    const room = state.rooms.find((r) => r.id === formRoomId);
    const guest = state.guests.find((g) => g.id === formGuestId);
    if (!room || !guest) {
      notify('error', 'Seleccione habitación y huésped');
      return;
    }
    const rt = state.roomTypes.find((t) => t.id === room.roomTypeId);
    const salidaDate = addDays(new Date(`${formEntrada}T12:00:00`), formNoches);
    const total = Math.max(0, formTarifaNoche * formNoches);

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

  const handleSaveEditReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRes) return;

    const targetRoom = state.rooms.find((r) => r.id === editRoomId);
    const targetRt = targetRoom
      ? state.roomTypes.find((t) => t.id === targetRoom.roomTypeId)
      : undefined;

    let finalGuest = state.guests.find((g) => g.id === editGuestId);
    if (editShowNewGuest) {
      if (!quickGuestName.trim() || !quickGuestDoc.trim()) {
        notify('error', 'Complete nombre y documento del nuevo huésped');
        return;
      }
      finalGuest = saveGuest({
        tipoDoc: quickGuestDocType,
        numDoc: quickGuestDoc.trim(),
        nombres: quickGuestName.trim().toUpperCase(),
        fechaNacimiento: '1990-01-01',
        nacionalidad: 'PERUANO(A)',
        sexo: 'M',
        correo: '',
        celular: '',
        direccion: '',
        esVip: false,
      });
    }

    if (!targetRoom || !finalGuest) {
      notify('error', 'Seleccione una habitación y un huésped válidos');
      return;
    }

    const ok = updateReservation(editingRes.id, {
      roomId: targetRoom.id,
      roomNumber: targetRoom.numero,
      roomTypeName: targetRt?.nombre || editingRes.roomTypeName,
      guestId: finalGuest.id,
      guestName: finalGuest.nombres,
      guestDoc: finalGuest.numDoc,
      fechaEntrada: `${editEntrada} ${state.config.horaCheckIn}`,
      fechaSalida: `${editSalida} ${state.config.horaCheckOut}`,
      noches: Math.max(1, editNoches),
      total: Math.max(0, editTotal),
      adelanto: Math.max(0, Math.min(editAdelanto, editTotal)),
      origen: editOrigen,
      status: editStatus,
      observaciones: editObs,
    });

    if (ok) {
      setEditingRes(null);
    }
  };

  const openQuickCheckIn = (res: Reservation) => {
    const room = state.rooms.find((r) => r.id === res.roomId);
    if (!room || room.status !== 'DISPONIBLE') {
      notify(
        'warning',
        `Hab. ${res.roomNumber} no está disponible`,
        'Libere o limpie la habitación primero.'
      );
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
      setEditingRes(null);
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
    return filteredReservations.filter(
      (r) => r.status === 'CONFIRMADA' || r.status === 'PENDIENTE'
    );
  }, [filteredReservations]);

  const handleExport = () => {
    exportToCsv(
      `reservas_lachuspa_${toYMD(new Date())}.csv`,
      [
        'Localizador',
        'Habitación',
        'Tipo',
        'Huésped',
        'Documento',
        'Entrada',
        'Salida',
        'Noches',
        'Origen',
        'Total',
        'Adelanto',
        'Estado',
      ],
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

  // Compute drag preview info for Gantt highlight
  const getCellDragHighlight = (roomId: string, ymd: string): { active: boolean; label?: string } => {
    if (!dragState) return { active: false };
    if (dragState.kind === 'CREATE' && dragState.roomId === roomId) {
      const minYmd =
        dragState.anchorYmd <= dragState.hoverYmd ? dragState.anchorYmd : dragState.hoverYmd;
      const maxYmd =
        dragState.anchorYmd <= dragState.hoverYmd ? dragState.hoverYmd : dragState.anchorYmd;
      if (ymd >= minYmd && ymd <= maxYmd) {
        const n = diffDaysYmd(minYmd, maxYmd) + 1;
        return { active: true, label: ymd === maxYmd ? `${n}n` : undefined };
      }
    } else if (dragState.kind === 'RESIZE_END' && dragState.roomId === roomId && dragState.moved) {
      const start = dragState.res.fechaEntrada.slice(0, 10);
      const endCell = dragState.hoverYmd >= start ? dragState.hoverYmd : start;
      if (ymd >= start && ymd <= endCell) {
        const n = diffDaysYmd(start, endCell) + 1;
        return { active: true, label: ymd === endCell ? `${n}n` : undefined };
      }
    } else if (dragState.kind === 'RESIZE_START' && dragState.roomId === roomId && dragState.moved) {
      const lastNight = addDaysYmd(dragState.res.fechaSalida.slice(0, 10), -1);
      const startCell = dragState.hoverYmd <= lastNight ? dragState.hoverYmd : lastNight;
      if (ymd >= startCell && ymd <= lastNight) {
        const n = diffDaysYmd(startCell, lastNight) + 1;
        return { active: true, label: ymd === startCell ? `${n}n` : undefined };
      }
    } else if (
      dragState.kind === 'MOVE_RES' &&
      dragState.hoverRoomId === roomId &&
      dragState.moved
    ) {
      const shift = diffDaysYmd(dragState.originYmd, dragState.hoverYmd);
      const newStart = addDaysYmd(dragState.res.fechaEntrada.slice(0, 10), shift);
      const newLastNight = addDaysYmd(newStart, dragState.res.noches - 1);
      if (ymd >= newStart && ymd <= newLastNight) {
        return { active: true, label: ymd === newStart ? 'Mover' : undefined };
      }
    } else if (
      dragState.kind === 'EXTEND_STAY' &&
      dragState.roomId === roomId &&
      dragState.moved
    ) {
      if (ymd > dragState.baseEndYmd && ymd <= dragState.hoverYmd) {
        const extra = diffDaysYmd(dragState.baseEndYmd, dragState.hoverYmd);
        return { active: true, label: ymd === dragState.hoverYmd ? `+${extra}n` : undefined };
      }
    }
    return { active: false };
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
        <div className="space-y-3">
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
                className="rounded-lg border border-[#E2D2AF] p-1.5 text-[#5C4A33] hover:bg-[#FBF6EA]"
                title="Días siguientes"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <p className="hidden text-[11px] text-[#6E5D47] xl:block">
              Tip: <strong>Arrastra celdas vacías</strong> para crear · <strong>Arrastra los bordes ‹ ›</strong> de una reserva para extender o acortar noches · <strong>Clic</strong> para editar o eliminar
            </p>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#6E5D47]">Vista:</span>
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

          <div className="overflow-x-auto select-none rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
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
                          {String(d.getDate()).padStart(2, '0')}/
                          {String(d.getMonth() + 1).padStart(2, '0')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE4CB]">
                {state.rooms.map((room) => {
                  const rt = state.roomTypes.find((t) => t.id === room.roomTypeId);
                  return (
                    <tr key={room.id} className="hover:bg-[#FCF8EE]">
                      <td className="sticky left-0 z-10 border-r border-[#E2D2AF] bg-[#FFFDF9] px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-[#2A2015]">
                            Hab. {room.numero}
                          </span>
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: state.config.coloresEstado[room.status] }}
                            title={room.status}
                          />
                        </div>
                        <p className="truncate text-[10px] text-[#6E5D47]">{rt?.nombre}</p>
                      </td>
                      {timelineDays.map((d) => {
                        const ymd = toYMD(d);
                        const activeRes = state.reservations.find((r) => {
                          if (r.roomId !== room.id || r.status === 'CANCELADA') return false;
                          const startYmd = r.fechaEntrada.slice(0, 10);
                          const endYmd = r.fechaSalida.slice(0, 10);
                          return ymd >= startYmd && ymd < endYmd;
                        });
                        const isStart = Boolean(
                          activeRes && activeRes.fechaEntrada.slice(0, 10) === ymd
                        );
                        const isLastNight = Boolean(
                          activeRes && addDaysYmd(activeRes.fechaSalida.slice(0, 10), -1) === ymd
                        );

                        const activeStay = state.stays.find((s) => {
                          if (s.roomId !== room.id || s.status !== 'ACTIVA') return false;
                          const sStart = s.fechaEntrada.slice(0, 10);
                          const sEnd = s.fechaSalidaProgramada.slice(0, 10);
                          if (sEnd > sStart) {
                            return ymd >= sStart && ymd < sEnd;
                          }
                          return ymd === sStart;
                        });
                        const stayStartYmd = activeStay ? activeStay.fechaEntrada.slice(0, 10) : '';
                        const stayEndYmd = activeStay
                          ? activeStay.fechaSalidaProgramada.slice(0, 10)
                          : '';
                        const stayLastNight = activeStay
                          ? stayEndYmd > stayStartYmd
                            ? addDaysYmd(stayEndYmd, -1)
                            : stayStartYmd
                          : '';
                        const isStayBarCell = Boolean(activeStay && !activeRes);
                        const isStayStart = Boolean(
                          isStayBarCell && (ymd === stayStartYmd || d.getTime() === timelineDays[0].getTime())
                        );
                        const isStayLastNight = Boolean(isStayBarCell && ymd === stayLastNight);

                        const dragPreview = getCellDragHighlight(room.id, ymd);

                        return (
                          <td
                            key={ymd}
                            onPointerDown={(e) => {
                              if (e.button !== 0) return;
                              if (!activeRes && !isStayBarCell) {
                                e.preventDefault();
                                setDragState({
                                  kind: 'CREATE',
                                  roomId: room.id,
                                  anchorYmd: ymd,
                                  hoverYmd: ymd,
                                });
                              }
                            }}
                            onPointerEnter={() => {
                              if (!dragState) return;
                              if (
                                (dragState.kind === 'CREATE' ||
                                  dragState.kind === 'RESIZE_END' ||
                                  dragState.kind === 'RESIZE_START' ||
                                  dragState.kind === 'EXTEND_STAY') &&
                                dragState.roomId === room.id
                              ) {
                                setDragState({
                                  ...dragState,
                                  hoverYmd: ymd,
                                  ...(dragState.kind !== 'CREATE'
                                    ? {
                                        moved:
                                          dragState.kind === 'EXTEND_STAY'
                                            ? ymd > dragState.baseEndYmd
                                            : true,
                                      }
                                    : {}),
                                });
                              } else if (dragState.kind === 'MOVE_RES') {
                                setDragState({
                                  ...dragState,
                                  hoverRoomId: room.id,
                                  hoverYmd: ymd,
                                  moved:
                                    dragState.hoverRoomId !== room.id ||
                                    dragState.originYmd !== ymd ||
                                    dragState.moved,
                                });
                              }
                            }}
                            className={`relative h-11 border-r border-[#EFE4CB] p-0.5 align-middle transition-colors ${
                              dragPreview.active
                                ? 'bg-[#F5E6C4] ring-2 ring-inset ring-[#9A6E0E]'
                                : 'cursor-pointer hover:bg-[#FBF5E6]'
                            }`}
                          >
                            {activeRes ? (
                              <div
                                onPointerDown={(e) => {
                                  if (e.button !== 0) return;
                                  e.stopPropagation();
                                  setDragState({
                                    kind: 'MOVE_RES',
                                    res: activeRes,
                                    originYmd: ymd,
                                    hoverRoomId: room.id,
                                    hoverYmd: ymd,
                                    moved: false,
                                  });
                                }}
                                className={`group relative flex h-full items-center justify-between rounded px-1.5 text-[10px] font-semibold ${ORIGIN_STYLES[activeRes.origen]} cursor-grab active:cursor-grabbing`}
                                title={`${activeRes.guestName} (${activeRes.localizador}) · Arrastra los bordes ‹ › para cambiar noches o haz clic para editar`}
                              >
                                {isStart && (
                                  <span
                                    onPointerDown={(e) => {
                                      if (e.button !== 0) return;
                                      e.stopPropagation();
                                      setDragState({
                                        kind: 'RESIZE_START',
                                        res: activeRes,
                                        roomId: room.id,
                                        hoverYmd: ymd,
                                        moved: false,
                                      });
                                    }}
                                    className="mr-0.5 flex h-full w-2.5 shrink-0 cursor-ew-resize items-center justify-center rounded-l bg-black/20 text-[9px] opacity-80 hover:opacity-100"
                                    title="Arrastrar para cambiar fecha de entrada"
                                  >
                                    ‹
                                  </span>
                                )}
                                <span className="truncate flex-1">
                                  {isStart ? activeRes.guestName.split(' ')[0] : activeRes.localizador}
                                </span>
                                {isLastNight && (
                                  <span
                                    onPointerDown={(e) => {
                                      if (e.button !== 0) return;
                                      e.stopPropagation();
                                      setDragState({
                                        kind: 'RESIZE_END',
                                        res: activeRes,
                                        roomId: room.id,
                                        hoverYmd: ymd,
                                        moved: false,
                                      });
                                    }}
                                    className="ml-0.5 flex h-full w-3 shrink-0 cursor-ew-resize items-center justify-center rounded-r bg-black/25 text-[10px] font-bold opacity-85 hover:opacity-100"
                                    title="Arrastrar hacia la derecha o izquierda para extender/acortar noches"
                                  >
                                    ›
                                  </span>
                                )}
                              </div>
                            ) : isStayBarCell && activeStay ? (
                              <div
                                className="group relative flex h-full items-center justify-between rounded bg-red-600 px-1.5 text-[10px] font-semibold text-white"
                                title={`Ocupada: ${activeStay.guestName} (Salida prog.: ${stayEndYmd}) · Arrastra + hacia la derecha para extender noches`}
                              >
                                <span className="truncate">
                                  {isStayStart ? activeStay.guestName.split(' ')[0] : 'OCUP.'}
                                </span>
                                {isStayLastNight && (
                                  <span
                                    onPointerDown={(e) => {
                                      if (e.button !== 0) return;
                                      e.stopPropagation();
                                      setDragState({
                                        kind: 'EXTEND_STAY',
                                        stayId: activeStay.id,
                                        roomId: room.id,
                                        roomNumber: room.numero,
                                        guestName: activeStay.guestName,
                                        baseEndYmd: stayLastNight,
                                        tarifaBase: activeStay.tarifaBase,
                                        hoverYmd: stayLastNight,
                                        moved: false,
                                      });
                                    }}
                                    className="ml-0.5 flex h-full w-3.5 shrink-0 cursor-ew-resize items-center justify-center rounded-r bg-black/25 text-[10px] font-bold hover:bg-black/40"
                                    title="Arrastrar a la derecha para extender noches al huésped"
                                  >
                                    +
                                  </span>
                                )}
                              </div>
                            ) : null}

                            {dragPreview.active && dragPreview.label && (
                              <span className="pointer-events-none absolute -top-2 right-0.5 z-20 rounded bg-[#3A2B18] px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                                {dragPreview.label}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {/* Daily Occupancy Row */}
                <tr className="border-t-2 border-[#E2D2AF] bg-[#FBF6EA] font-semibold">
                  <td className="sticky left-0 z-10 border-r border-[#E2D2AF] bg-[#FBF6EA] px-3 py-2 text-[11px] text-[#3A2B18]">
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
                        (ymd === toYMD(new Date()) && room.status === 'OCUPADO') ||
                        state.stays.some((s) => {
                          if (s.roomId !== room.id || s.status !== 'ACTIVA') return false;
                          const sStart = s.fechaEntrada.slice(0, 10);
                          const sEnd = s.fechaSalidaProgramada.slice(0, 10);
                          return sEnd > sStart ? ymd >= sStart && ymd < sEnd : ymd === sStart;
                        });
                      return hasRes || hasStay;
                    }).length;
                    const pct = Math.round((count / Math.max(1, state.rooms.length)) * 100);
                    return (
                      <td
                        key={ymd}
                        className="border-r border-[#E2D2AF] px-1 py-2 text-center font-mono text-[11px] text-[#3A2B18] tabular-nums"
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
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8D7B63]" />
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
              className="rounded-lg border border-[#DECFA8] bg-white px-3 py-1.5 text-xs"
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
                className="rounded-lg border border-[#DECFA8] bg-white px-3 py-1.5 text-xs"
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
              <tbody className="divide-y divide-[#EFE4CB]">
                {(mode === 'reservas_llegadas' ? arrivalList : filteredReservations).length ===
                0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-[#8D7B63]">
                      No se encontraron reservas para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  (mode === 'reservas_llegadas' ? arrivalList : filteredReservations).map((res) => (
                    <tr key={res.id} className="hover:bg-[#FCF8EE]">
                      <td className="px-4 py-3 font-mono font-bold text-[#9A6E0E]">
                        {res.localizador}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-[#2A2015]">
                          Hab. {res.roomNumber}
                        </span>
                        <p className="text-[11px] text-[#6E5D47]">{res.roomTypeName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#2A2015]">{res.guestName}</p>
                        <p className="font-mono text-[11px] text-[#6E5D47]">{res.guestDoc}</p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <p className="text-[#2A2015]">{res.fechaEntrada}</p>
                        <p className="text-[11px] text-[#6E5D47]">
                          {res.fechaSalida} · {res.noches} noche(s)
                        </p>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#5C4A33]">{res.origen}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                        {formatCurrency(res.total)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        {formatCurrency(res.adelanto)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[res.status]}`}
                        >
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
                            onClick={() => openEditModal(res)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#DECFA8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3A2B18] hover:bg-[#FBF5E6]"
                            title="Editar fechas, habitación, huésped o tarifa"
                          >
                            <Edit3 className="h-3 w-3 text-[#9A6E0E]" />
                            Editar
                          </button>
                          <button
                            onClick={() => setPrintTicket(buildVoucherTicket(res))}
                            className="rounded-md border border-[#DECFA8] p-1.5 text-[#5C4A33] hover:bg-[#FBF5E6]"
                            title="Imprimir Voucher"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          {res.status !== 'CANCELADA' && res.status !== 'CHECKED_IN' && (
                            <button
                              onClick={() => updateReservationStatus(res.id, 'CANCELADA')}
                              className="rounded-md border border-[#DECFA8] p-1.5 text-amber-600 hover:bg-amber-50"
                              title="Cancelar reserva"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteReservation(res.id)}
                            className="rounded-md border border-[#DECFA8] p-1.5 text-red-600 hover:bg-red-50"
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

      {/* NEW RESERVATION MODAL WITH VISUAL DRAG-RANGE CALENDAR */}
      {showNewModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-3 sm:p-4 backdrop-blur-xs">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFE4CB] bg-[#FBF6EA] px-6 py-4">
              <h3 className="font-luxury text-lg font-bold text-[#2A2015]">
                Registrar Nueva Reserva
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded p-1 text-[#6E5D47] hover:text-[#2A2015]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={handleCreateReservation}
              className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 text-xs md:grid-cols-12"
            >
              {/* Left: Interactive Calendar Range Selector */}
              <div className="space-y-3 md:col-span-5">
                <DateRangeCalendar
                  startYmd={formEntrada}
                  endYmd={addDaysYmd(formEntrada, formNoches)}
                  onChangeRange={(nextStart, _nextEnd, nights) => {
                    setFormEntrada(nextStart);
                    setFormNoches(nights);
                  }}
                  blockedRanges={state.reservations
                    .filter((r) => r.roomId === formRoomId && r.status !== 'CANCELADA')
                    .map((r) => ({
                      start: r.fechaEntrada.slice(0, 10),
                      end: r.fechaSalida.slice(0, 10),
                      label: `${r.guestName} (${r.localizador})`,
                    }))}
                />
                <div className="rounded-xl border border-[#E2D2AF] bg-[#FAF7F0] p-3 tabular-nums">
                  <p className="text-[11px] text-[#6E5D47]">
                    Resumen: <strong>{formNoches} noche(s)</strong> ×{' '}
                    <strong>{formatCurrency(formTarifaNoche)}</strong>
                  </p>
                  <p className="mt-1 font-mono text-base font-bold text-[#9A6E0E]">
                    Total Reserva: {formatCurrency(formTarifaNoche * formNoches)}
                  </p>
                </div>
              </div>

              {/* Right: Room, Guest & Rate Details */}
              <div className="space-y-3 md:col-span-7">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">Habitación</label>
                    <select
                      value={formRoomId}
                      onChange={(e) => {
                        const rId = e.target.value;
                        setFormRoomId(rId);
                        setFormTarifaNoche(
                          getRoomRateForDate(rId, '24h', new Date(`${formEntrada}T12:00:00`))
                        );
                      }}
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2"
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
                    <label className="mb-1 block font-semibold text-[#5C4A33]">Huésped</label>
                    <select
                      value={formGuestId}
                      onChange={(e) => setFormGuestId(e.target.value)}
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2"
                    >
                      {state.guests.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nombres} ({g.numDoc})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">
                      Fecha de Llegada
                    </label>
                    <input
                      type="date"
                      value={formEntrada}
                      onChange={(e) => setFormEntrada(e.target.value)}
                      className="w-full rounded-lg border border-[#DECFA8] px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">Noches</label>
                    <input
                      type="number"
                      min={1}
                      value={formNoches}
                      onChange={(e) => setFormNoches(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-lg border border-[#DECFA8] px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">
                      Tarifa / Noche (S/)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={formTarifaNoche}
                      onChange={(e) => setFormTarifaNoche(Math.max(0, Number(e.target.value)))}
                      className="w-full rounded-lg border border-[#DECFA8] px-3 py-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">Canal / Origen</label>
                    <select
                      value={formOrigen}
                      onChange={(e) => setFormOrigen(e.target.value as Reservation['origen'])}
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2"
                    >
                      <option value="DIRECTA">Directa (Recepción / WhatsApp)</option>
                      <option value="BOOKING">Booking.com</option>
                      <option value="AIRBNB">Airbnb</option>
                      <option value="AGENCIA">Agencia</option>
                      <option value="WEB">Motor Web Hotel</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">Adelanto (S/)</label>
                    <input
                      type="number"
                      min={0}
                      value={formAdelanto}
                      onChange={(e) => setFormAdelanto(Math.max(0, Number(e.target.value)))}
                      className="w-full rounded-lg border border-[#DECFA8] px-3 py-2 font-mono"
                    />
                  </div>
                  {formAdelanto > 0 && (
                    <div>
                      <label className="mb-1 block font-semibold text-[#5C4A33]">
                        Método Adelanto
                      </label>
                      <select
                        value={formMetodoAdelanto}
                        onChange={(e) => setFormMetodoAdelanto(e.target.value as PaymentMethodName)}
                        className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2"
                      >
                        <option value="YAPE">YAPE</option>
                        <option value="PLIN">PLIN</option>
                        <option value="EFECTIVO">EFECTIVO</option>
                        <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                        <option value="TARJETA">TARJETA</option>
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#5C4A33]">Observaciones</label>
                  <input
                    type="text"
                    value={formObs}
                    onChange={(e) => setFormObs(e.target.value)}
                    placeholder="Hora estimada de llegada, cama adicional, etc."
                    className="w-full rounded-lg border border-[#DECFA8] px-3 py-2"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-[#EFE4CB] pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="rounded-lg border border-[#DECFA8] px-4 py-2 font-semibold text-[#5C4A33]"
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL INTERACTIVE RESERVATION EDITOR MODAL (DATES, ROOM, GUEST, RATE, DELETE, CHECK-IN) */}
      {editingRes && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-3 sm:p-4 backdrop-blur-xs">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-2xl text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE4CB] bg-[#FBF6EA] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2.5">
                <GripVertical className="h-4 w-4 text-[#9A6E0E]" />
                <div>
                  <h3 className="font-luxury text-lg font-bold text-[#2A2015]">
                    Gestionar Reserva {editingRes.localizador}
                  </h3>
                  <p className="text-[11px] text-[#6E5D47]">
                    Modifica fechas en el calendario, cambia habitación, huésped, tarifa o elimina la reserva.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRes(null)}
                className="rounded-lg p-1.5 text-[#6E5D47] hover:bg-[#EFE4CB] hover:text-[#2A2015]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveEditReservation}
              className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-12"
            >
              {/* Left Column: Visual Interactive Calendar Range Picker */}
              <div className="space-y-3 lg:col-span-5">
                <DateRangeCalendar
                  startYmd={editEntrada}
                  endYmd={editSalida}
                  onChangeRange={(nextStart, nextEnd, nights) => {
                    setEditEntrada(nextStart);
                    setEditSalida(nextEnd);
                    setEditNoches(nights);
                    setEditTotal(Math.round(editTarifaNoche * nights * 100) / 100);
                  }}
                  blockedRanges={state.reservations
                    .filter(
                      (r) =>
                        r.id !== editingRes.id &&
                        r.roomId === editRoomId &&
                        r.status !== 'CANCELADA'
                    )
                    .map((r) => ({
                      start: r.fechaEntrada.slice(0, 10),
                      end: r.fechaSalida.slice(0, 10),
                      label: `${r.guestName} (${r.localizador})`,
                    }))}
                />

                {/* Quick +/- Night Adjustment Controls */}
                <div className="flex items-center justify-between rounded-xl border border-[#E2D2AF] bg-[#FAF7F0] px-3 py-2.5">
                  <span className="font-semibold text-[#3A2B18]">Ajuste rápido de noches:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        const nextN = Math.max(1, editNoches - 1);
                        const nextEnd = addDaysYmd(editEntrada, nextN);
                        setEditNoches(nextN);
                        setEditSalida(nextEnd);
                        setEditTotal(Math.round(editTarifaNoche * nextN * 100) / 100);
                      }}
                      className="rounded border border-[#DECFA8] bg-white px-2.5 py-1 font-bold hover:bg-[#FBF5E6]"
                    >
                      -1 noche
                    </button>
                    <span className="px-2 font-bold text-[#9A6E0E]">{editNoches}n</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextN = editNoches + 1;
                        const nextEnd = addDaysYmd(editEntrada, nextN);
                        setEditNoches(nextN);
                        setEditSalida(nextEnd);
                        setEditTotal(Math.round(editTarifaNoche * nextN * 100) / 100);
                      }}
                      className="rounded border border-[#DECFA8] bg-white px-2.5 py-1 font-bold hover:bg-[#FBF5E6]"
                    >
                      +1 noche
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Room, Guest, Dates, Rate, Actions */}
              <div className="space-y-4 lg:col-span-7">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">
                      Fecha de Entrada (Check-In)
                    </label>
                    <input
                      type="date"
                      value={editEntrada}
                      onChange={(e) => {
                        const nextStart = e.target.value;
                        if (!nextStart) return;
                        const nextEnd =
                          editSalida > nextStart ? editSalida : addDaysYmd(nextStart, editNoches);
                        const nextN = Math.max(1, diffDaysYmd(nextStart, nextEnd));
                        setEditEntrada(nextStart);
                        setEditSalida(nextEnd);
                        setEditNoches(nextN);
                        setEditTotal(Math.round(editTarifaNoche * nextN * 100) / 100);
                      }}
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">
                      Fecha de Salida (Check-Out)
                    </label>
                    <input
                      type="date"
                      value={editSalida}
                      min={addDaysYmd(editEntrada, 1)}
                      onChange={(e) => {
                        const nextEnd = e.target.value;
                        if (!nextEnd || nextEnd <= editEntrada) return;
                        const nextN = Math.max(1, diffDaysYmd(editEntrada, nextEnd));
                        setEditSalida(nextEnd);
                        setEditNoches(nextN);
                        setEditTotal(Math.round(editTarifaNoche * nextN * 100) / 100);
                      }}
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2 font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Change Room & Guest */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">
                      Cambiar Habitación
                    </label>
                    <select
                      value={editRoomId}
                      onChange={(e) => {
                        const nextRId = e.target.value;
                        setEditRoomId(nextRId);
                        const suggested = getRoomRateForDate(
                          nextRId,
                          '24h',
                          new Date(`${editEntrada}T12:00:00`)
                        );
                        setEditTarifaNoche(suggested);
                        setEditTotal(Math.round(suggested * editNoches * 100) / 100);
                      }}
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2 font-semibold text-[#2A2015]"
                    >
                      {state.rooms.map((r) => {
                        const rt = state.roomTypes.find((t) => t.id === r.roomTypeId);
                        return (
                          <option key={r.id} value={r.id}>
                            Hab. {r.numero} — {rt?.nombre} ({r.status})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="font-semibold text-[#5C4A33]">Cambiar Huésped</label>
                      <button
                        type="button"
                        onClick={() => setEditShowNewGuest((v) => !v)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9A6E0E] hover:text-[#7E590A]"
                      >
                        <UserPlus className="h-3 w-3" />
                        {editShowNewGuest ? 'Usar existente' : '+ Nuevo huésped'}
                      </button>
                    </div>
                    {!editShowNewGuest ? (
                      <select
                        value={editGuestId}
                        onChange={(e) => setEditGuestId(e.target.value)}
                        className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2 font-semibold text-[#2A2015]"
                      >
                        {state.guests.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nombres} ({g.tipoDoc} {g.numDoc})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        <select
                          value={quickGuestDocType}
                          onChange={(e) => setQuickGuestDocType(e.target.value as DocType)}
                          className="rounded-lg border border-[#DECFA8] bg-white px-2 py-1.5"
                        >
                          <option value="DNI">DNI</option>
                          <option value="PAS">PAS</option>
                          <option value="CE">CE</option>
                        </select>
                        <input
                          type="text"
                          value={quickGuestDoc}
                          onChange={(e) => setQuickGuestDoc(e.target.value)}
                          placeholder="N° Doc *"
                          className="col-span-2 rounded-lg border border-[#DECFA8] bg-white px-2 py-1.5"
                        />
                        <input
                          type="text"
                          value={quickGuestName}
                          onChange={(e) => setQuickGuestName(e.target.value)}
                          placeholder="Nombres y apellidos *"
                          className="col-span-3 rounded-lg border border-[#DECFA8] bg-white px-2 py-1.5"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Rate, Total, Advance, Channel, Status */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">
                      Tarifa/Noche (S/)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={editTarifaNoche}
                      onChange={(e) => {
                        const rate = Math.max(0, Number(e.target.value));
                        setEditTarifaNoche(rate);
                        setEditTotal(Math.round(rate * editNoches * 100) / 100);
                      }}
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">Total (S/)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={editTotal}
                      onChange={(e) => {
                        const tot = Math.max(0, Number(e.target.value));
                        setEditTotal(tot);
                        setEditTarifaNoche(Math.round((tot / Math.max(1, editNoches)) * 100) / 100);
                      }}
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 font-mono font-bold text-[#9A6E0E]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">Adelanto (S/)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={editAdelanto}
                      onChange={(e) => setEditAdelanto(Math.max(0, Number(e.target.value)))}
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 font-mono font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">Estado</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as Reservation['status'])}
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-2 py-1.5 font-semibold"
                    >
                      <option value="CONFIRMADA">CONFIRMADA</option>
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="CHECKED_IN">CHECKED_IN</option>
                      <option value="CANCELADA">CANCELADA</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block font-semibold text-[#5C4A33]">Canal / Origen</label>
                    <select
                      value={editOrigen}
                      onChange={(e) => setEditOrigen(e.target.value as Reservation['origen'])}
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5"
                    >
                      <option value="DIRECTA">Directa</option>
                      <option value="BOOKING">Booking.com</option>
                      <option value="AIRBNB">Airbnb</option>
                      <option value="AGENCIA">Agencia</option>
                      <option value="WEB">Web Hotel</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-semibold text-[#5C4A33]">Observaciones</label>
                    <input
                      type="text"
                      value={editObs}
                      onChange={(e) => setEditObs(e.target.value)}
                      placeholder="Notas de llegada, requerimientos especiales..."
                      className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-1.5"
                    />
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EFE4CB] pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {confirmDeleteId === editingRes.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          deleteReservation(editingRes.id);
                          setEditingRes(null);
                          setConfirmDeleteId(null);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 font-bold text-white hover:bg-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Confirmar Eliminar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(editingRes.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar Reserva
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setPrintTicket(buildVoucherTicket(editingRes))}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#DECFA8] bg-white px-3 py-2 font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
                    >
                      <Printer className="h-3.5 w-3.5 text-[#9A6E0E]" />
                      Voucher
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(editingRes.status === 'CONFIRMADA' || editingRes.status === 'PENDIENTE') && (
                      <button
                        type="button"
                        onClick={() => openQuickCheckIn(editingRes)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#3A2B18] px-3.5 py-2 font-semibold text-white hover:bg-[#2A2015]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#E8C56E]" />
                        Hacer Check-In
                      </button>
                    )}
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-4 py-2 font-semibold text-white hover:bg-[#7E590A]"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTEND ACTIVE STAY MODAL (FROM DRAGGING OCCUPIED BAR ON GANTT) */}
      {extendStayPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-[#EFE4CB] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#2A2015]">
                  Extender Estadía · Hab. {extendStayPrompt.roomNumber}
                </h3>
                <p className="text-[11px] text-[#6E5D47]">{extendStayPrompt.guestName}</p>
              </div>
              <button
                onClick={() => setExtendStayPrompt(null)}
                className="rounded p-1 text-[#6E5D47]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-[#E2D2AF] bg-[#FAF7F0] p-3">
                <p className="font-semibold text-[#2A2015]">
                  Extensión arrastrada: <strong>+{extendStayPrompt.extraNights} noche(s)</strong>
                </p>
                <p className="mt-1 font-mono text-base font-bold text-[#9A6E0E]">
                  Importe Adicional: {formatCurrency(extendStayPrompt.monto)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#5C4A33]">
                    Noches Adicionales
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={extendStayPrompt.extraNights}
                    onChange={(e) => {
                      const n = Math.max(1, Number(e.target.value));
                      const unit = extendStayPrompt.monto / Math.max(1, extendStayPrompt.extraNights);
                      setExtendStayPrompt({
                        ...extendStayPrompt,
                        extraNights: n,
                        monto: Math.round(unit * n * 100) / 100,
                      });
                    }}
                    className="w-full rounded-lg border border-[#DECFA8] px-3 py-1.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#5C4A33]">Monto (S/)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={extendStayPrompt.monto}
                    onChange={(e) =>
                      setExtendStayPrompt({
                        ...extendStayPrompt,
                        monto: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-full rounded-lg border border-[#DECFA8] px-3 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 font-medium text-[#3A2B18] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={extendStayPrompt.pagarAhora}
                    onChange={(e) =>
                      setExtendStayPrompt({
                        ...extendStayPrompt,
                        pagarAhora: e.target.checked,
                      })
                    }
                  />
                  Cobrar ahora
                </label>
                {extendStayPrompt.pagarAhora && (
                  <select
                    value={extendStayPrompt.metodoPago}
                    onChange={(e) =>
                      setExtendStayPrompt({
                        ...extendStayPrompt,
                        metodoPago: e.target.value as PaymentMethodName,
                      })
                    }
                    className="rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5"
                  >
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="TARJETA">TARJETA</option>
                    <option value="YAPE">YAPE</option>
                    <option value="PLIN">PLIN</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  </select>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-[#EFE4CB] pt-3">
                <button
                  type="button"
                  onClick={() => setExtendStayPrompt(null)}
                  className="rounded-lg border border-[#DECFA8] px-4 py-2 font-semibold text-[#5C4A33]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    renewStay(
                      extendStayPrompt.stayId,
                      extendStayPrompt.extraNights,
                      'NOCHES',
                      extendStayPrompt.monto,
                      extendStayPrompt.pagarAhora,
                      extendStayPrompt.metodoPago,
                      'BOLETA'
                    );
                    setExtendStayPrompt(null);
                  }}
                  className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-semibold text-white hover:bg-[#7E590A]"
                >
                  Confirmar Extensión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CHECK-IN FROM RESERVATION MODAL */}
      {checkInRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-[#EFE4CB] pb-3">
              <h3 className="text-sm font-bold text-[#2A2015]">
                Confirmar Check-In · Hab. {checkInRes.roomNumber}
              </h3>
              <button
                onClick={() => setCheckInRes(null)}
                className="rounded p-1 text-[#6E5D47]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmQuickCheckIn} className="mt-4 space-y-3">
              <div className="rounded-lg bg-[#FAF7F0] p-3 space-y-1">
                <p className="font-semibold text-[#2A2015]">{checkInRes.guestName}</p>
                <p className="text-[#6E5D47]">
                  {checkInRes.localizador} · {checkInRes.noches} noche(s) · Total{' '}
                  {formatCurrency(checkInRes.total)}
                </p>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-[#5C4A33]">
                  Monto a Cobrar en Ingreso (S/)
                </label>
                <input
                  type="number"
                  min={0}
                  max={checkInRes.total}
                  value={ciPagoAhora}
                  onChange={(e) => setCiPagoAhora(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#DECFA8] px-3 py-2 font-mono font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#5C4A33]">Método de Pago</label>
                  <select
                    value={ciMetodo}
                    onChange={(e) => setCiMetodo(e.target.value as PaymentMethodName)}
                    className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-2"
                  >
                    {state.config.paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.nombre}>
                        {pm.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#5C4A33]">Comprobante</label>
                  <select
                    value={ciVoucher}
                    onChange={(e) => setCiVoucher(e.target.value as VoucherType)}
                    className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-2"
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
                  className="rounded-lg border border-[#DECFA8] px-4 py-2 font-semibold text-[#5C4A33]"
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
