import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  BedDouble,
  CalendarPlus,
  CheckCircle2,
  CreditCard,
  Gift,
  Plus,
  Printer,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type {
  DocType,
  Guest,
  ModuleId,
  PaymentMethodName,
  Reservation,
  Room,
  RoomStatus,
  VoucherType,
} from '../../types/pms';
import { formatCurrency, formatDateTime } from '../../utils/exportCsv';
import { PrintTicketModal, type PrintTicketData } from '../common/PrintTicketModal';
import { toYMD } from '../../data/seedData';

interface RecepcionModuleProps {
  onNavigate: (mod: ModuleId) => void;
}

const STATUS_LABELS: Record<RoomStatus, string> = {
  DISPONIBLE: 'Disponible',
  OCUPADO: 'Ocupado',
  EN_LIMPIEZA: 'En Limpieza',
  EN_MANTENIMIENTO: 'Mantenimiento',
  RESERVADO: 'Reservado',
};

export const RecepcionModule: React.FC<RecepcionModuleProps> = ({ onNavigate }) => {
  const {
    state,
    getRoomRateForDate,
    checkInGuest,
    addConsumptionToStay,
    deliverRoomOrder,
    renewStay,
    payStayBalance,
    changeRoom,
    checkOutStay,
    saveGuest,
    completeCleaning,
    resolveMaintenance,
    notify,
  } = usePMS();

  const [floorFilter, setFloorFilter] = useState<'ALL' | number>('ALL');
  const [rightTab, setRightTab] = useState<'PEDIDOS' | 'RESERVAS'>('PEDIDOS');
  const [printTicket, setPrintTicket] = useState<PrintTicketData | null>(null);

  // Check-In Modal State
  const [checkInRoom, setCheckInRoom] = useState<Room | null>(null);
  const [linkedReservation, setLinkedReservation] = useState<Reservation | null>(null);
  const [guestSearch, setGuestSearch] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [showNewGuestForm, setShowNewGuestForm] = useState(false);
  const [newGuestForm, setNewGuestForm] = useState({
    tipoDoc: 'DNI' as DocType,
    numDoc: '',
    nombres: '',
    nacionalidad: 'PERUANO(A)',
    sexo: 'M' as 'M' | 'F',
    fechaNacimiento: '1990-01-01',
    celular: '',
    correo: '',
  });
  const [invitados, setInvitados] = useState<{ id: string; nombres: string; doc: string }[]>([]);
  const [invNombre, setInvNombre] = useState('');
  const [invDoc, setInvDoc] = useState('');
  const [modalidad, setModalidad] = useState<'NOCHES' | 'HORAS'>('NOCHES');
  const [cantidad, setCantidad] = useState(1);
  const [tarifa, setTarifa] = useState(170);
  const [esCortesia, setEsCortesia] = useState(false);
  const [agencyId, setAgencyId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [montoPagar, setMontoPagar] = useState(170);
  const [metodoPago, setMetodoPago] = useState<PaymentMethodName>('EFECTIVO');
  const [voucherType, setVoucherType] = useState<VoucherType>('BOLETA');

  // Active Stay Modal State
  const [activeStayId, setActiveStayId] = useState<string | null>(null);
  const [stayModalTab, setStayModalTab] = useState<'RESUMEN' | 'CONSUMO' | 'RENOVAR' | 'CAMBIAR'>('RESUMEN');
  const [posProductId, setPosProductId] = useState(state.products[0]?.id || '');
  const [posQty, setPosQty] = useState(1);
  const [posPrice, setPosPrice] = useState(state.products[0]?.precio || 20);
  const [posPayNow, setPosPayNow] = useState(false);
  const [posPayMethod, setPosPayMethod] = useState<PaymentMethodName>('EFECTIVO');
  const [renewQty, setRenewQty] = useState(1);
  const [renewMod, setRenewMod] = useState<'NOCHES' | 'HORAS'>('NOCHES');
  const [renewPrice, setRenewPrice] = useState(170);
  const [renewPayNow, setRenewPayNow] = useState(true);
  const [renewMethod, setRenewMethod] = useState<PaymentMethodName>('EFECTIVO');
  const [payBalanceAmount, setPayBalanceAmount] = useState(0);
  const [payBalanceMethod, setPayBalanceMethod] = useState<PaymentMethodName>('EFECTIVO');
  const [targetChangeRoomId, setTargetChangeRoomId] = useState('');

  // Quick Room Action Modal (Cleaning / Maintenance)
  const [statusRoom, setStatusRoom] = useState<Room | null>(null);

  const floors = useMemo(
    () => Array.from(new Set(state.rooms.map((r) => r.piso))).sort((a, b) => a - b),
    [state.rooms]
  );

  const visibleRooms = useMemo(
    () => state.rooms.filter((r) => floorFilter === 'ALL' || r.piso === floorFilter),
    [state.rooms, floorFilter]
  );

  // Shift / Today Totals
  const todayStr = toYMD(new Date());
  const todaySales = state.sales.filter((s) => s.status === 'ACTIVO' && s.fecha.startsWith(todayStr));
  const totalHoy = todaySales.reduce((acc, s) => acc + s.monto, 0);
  const tarjetaHoy = todaySales.filter((s) => s.metodoPago === 'TARJETA').reduce((a, b) => a + b.monto, 0);
  const efectivoHoy = todaySales.filter((s) => s.metodoPago === 'EFECTIVO').reduce((a, b) => a + b.monto, 0);

  const availableCount = state.rooms.filter((r) => r.status === 'DISPONIBLE').length;
  const occupiedCount = state.rooms.filter((r) => r.status === 'OCUPADO').length;
  const cleaningCount = state.rooms.filter((r) => r.status === 'EN_LIMPIEZA').length;

  const pendingOrders = state.stays
    .filter((s) => s.status === 'ACTIVA')
    .flatMap((s) =>
      s.consumptions
        .filter((c) => !c.entregado)
        .map((c) => ({ stayId: s.id, roomNumber: s.roomNumber, guestName: s.guestName, consumption: c }))
    );

  const upcomingReservations = state.reservations.filter(
    (r) => r.status === 'CONFIRMADA' || r.status === 'PENDIENTE'
  );

  const openCheckInForRoom = (room: Room, res?: Reservation) => {
    const rate = getRoomRateForDate(room.id, '24h');
    setCheckInRoom(room);
    setLinkedReservation(res || null);
    setSelectedGuestId(res?.guestId || '');
    setGuestSearch(res?.guestName || '');
    setShowNewGuestForm(false);
    setInvitados([]);
    setModalidad('NOCHES');
    const nights = res?.noches || 1;
    setCantidad(nights);
    setTarifa(rate);
    setEsCortesia(false);
    setAgencyId('');
    setObservaciones(res?.observaciones || '');
    setMontoPagar(Math.max(0, nights * rate - (res?.adelanto || 0)));
    setMetodoPago('EFECTIVO');
    setVoucherType('BOLETA');
  };

  const handleRoomClick = (room: Room) => {
    if (room.status === 'DISPONIBLE') {
      openCheckInForRoom(room);
    } else if (room.status === 'OCUPADO' && room.currentStayId) {
      const stay = state.stays.find((s) => s.id === room.currentStayId);
      setActiveStayId(room.currentStayId);
      setStayModalTab('RESUMEN');
      setPayBalanceAmount(stay?.saldoPendiente || 0);
      setRenewPrice(stay?.tarifaBase || 170);
      setTargetChangeRoomId(state.rooms.find((r) => r.status === 'DISPONIBLE')?.id || '');
    } else {
      setStatusRoom(room);
    }
  };

  const selectedGuestObj = state.guests.find((g) => g.id === selectedGuestId);
  const blacklistedMatch = useMemo(() => {
    const doc = showNewGuestForm ? newGuestForm.numDoc.trim() : selectedGuestObj?.numDoc;
    if (!doc) return undefined;
    return state.personasNoGratas.find((p) => p.numDoc === doc);
  }, [showNewGuestForm, newGuestForm.numDoc, selectedGuestObj, state.personasNoGratas]);

  const handleSubmitCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInRoom) return;

    let guestIdToUse = selectedGuestId;
    let guestOverride: Guest | undefined;
    if (showNewGuestForm) {
      if (!newGuestForm.numDoc.trim() || !newGuestForm.nombres.trim()) {
        notify('error', 'Complete documento y nombres del huésped');
        return;
      }
      const created = saveGuest({
        ...newGuestForm,
        nombres: newGuestForm.nombres.toUpperCase(),
        direccion: '',
        esVip: false,
      });
      guestIdToUse = created.id;
      guestOverride = created;
      setSelectedGuestId(created.id);
    }

    if (!guestIdToUse) {
      notify('error', 'Seleccione o registre un huésped');
      return;
    }

    const stay = checkInGuest({
      roomId: checkInRoom.id,
      guestId: guestIdToUse,
      guestOverride,
      invitados,
      modalidad,
      cantidad,
      tarifaUnitaria: tarifa,
      esCortesia,
      agencyId: agencyId || undefined,
      observaciones,
      montoPagarAhora: metodoPago === 'X PAGAR' || metodoPago === 'AGENCIAS X PAGAR' ? 0 : montoPagar,
      metodoPago,
      voucherType,
      reservationId: linkedReservation?.id,
    });

    if (stay) {
      setCheckInRoom(null);
      if (state.config.firmaPorIngreso) {
        setPrintTicket({
          tipo: 'INGRESO',
          titulo: 'FICHA DE INGRESO / CHECK-IN',
          numero: stay.payments[0]?.comprobante || `ING-${stay.roomNumber}`,
          fecha: stay.fechaEntrada,
          cliente: stay.guestName,
          documento: `${stay.guestDocType}: ${stay.guestDocNum}`,
          habitacion: `${stay.roomNumber} (${stay.roomTypeName})`,
          detalleLineas: [
            { label: 'Modalidad', value: `${stay.cantidadInicial} ${stay.modalidad}` },
            { label: 'Salida programada', value: formatDateTime(stay.fechaSalidaProgramada) },
            { label: 'Tarifa Total', value: formatCurrency(stay.totalCargos) },
            { label: 'Pagado', value: formatCurrency(stay.totalPagado) },
            { label: 'Saldo', value: formatCurrency(stay.saldoPendiente) },
          ],
          total: stay.totalCargos,
          incluirPoliticas: true,
        });
      }
    }
  };

  const activeStay = state.stays.find((s) => s.id === activeStayId);

  const filteredGuests = state.guests
    .filter(
      (g) =>
        g.nombres.toLowerCase().includes(guestSearch.toLowerCase()) ||
        g.numDoc.toLowerCase().includes(guestSearch.toLowerCase())
    )
    .slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Top Action & Cash Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 tabular-nums">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
              {availableCount}
            </span>
            <span>Disponibles</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 tabular-nums">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
              {occupiedCount}
            </span>
            <span>Ocupadas</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 tabular-nums">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-600 px-1.5 text-[11px] font-bold text-white">
              {cleaningCount}
            </span>
            <span>Limpieza</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums">
          <div>
            <span className="text-slate-500">Total Hoy: </span>
            <strong className="font-mono text-sm font-bold text-red-600">
              {formatCurrency(totalHoy)}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Tarjeta: </span>
            <strong className="font-mono font-semibold text-slate-900">
              {formatCurrency(tarjetaHoy)}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Efectivo: </span>
            <strong className="font-mono font-semibold text-slate-900">
              {formatCurrency(efectivoHoy)}
            </strong>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const firstAvail = state.rooms.find((r) => r.status === 'DISPONIBLE');
              if (!firstAvail) {
                notify('warning', 'No hay habitaciones disponibles');
                return;
              }
              openCheckInForRoom(firstAvail);
              setEsCortesia(true);
              setMontoPagar(0);
              setMetodoPago('PAX LIBRES');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 whitespace-nowrap"
          >
            <Gift className="h-3.5 w-3.5" />
            Cortesías
          </button>
          <button
            onClick={() => onNavigate('post_venta')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7E590A] whitespace-nowrap"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Venta Libre
          </button>
          <button
            onClick={() => onNavigate('reservas_libro')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3A2B18] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2A2015] whitespace-nowrap"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Reserva
          </button>
          <button
            onClick={() => onNavigate('facturacion')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2D2AF] bg-[#FFFDF9] px-3 py-1.5 text-xs font-medium text-[#3A2B18] hover:bg-[#FBF6EA] whitespace-nowrap"
          >
            <CreditCard className="h-3.5 w-3.5 text-[#9A6E0E]" />
            Cierre Caja
          </button>
        </div>
      </div>

      {/* Main Split: Room Grid + Right Dock */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Room Matrix */}
        <div className="space-y-4 xl:col-span-9">
          {/* Floor Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFloorFilter('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                floorFilter === 'ALL'
                  ? 'bg-[#3A2B18] text-white'
                  : 'border border-[#E2D2AF] bg-[#FFFDF9] text-[#5C4A33] hover:bg-[#FBF6EA]'
              }`}
            >
              Todos los Pisos
            </button>
            {floors.map((piso) => (
              <button
                key={piso}
                onClick={() => setFloorFilter(piso)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  floorFilter === piso
                    ? 'bg-[#3A2B18] text-white'
                    : 'border border-[#E2D2AF] bg-[#FFFDF9] text-[#5C4A33] hover:bg-[#FBF6EA]'
                }`}
              >
                Piso {piso}
              </button>
            ))}
          </div>

          {/* Floor Sections */}
          {floors
            .filter((p) => floorFilter === 'ALL' || p === floorFilter)
            .map((piso) => {
              const pisoRooms = visibleRooms.filter((r) => r.piso === piso);
              return (
                <div
                  key={piso}
                  className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs"
                >
                  <div className="mb-3 flex items-center justify-between border-b border-[#EFE4CB] pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      PISO {piso}
                    </h3>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {pisoRooms.length} habitaciones
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {pisoRooms.map((room) => {
                      const rt = state.roomTypes.find((t) => t.id === room.roomTypeId);
                      const stay = room.currentStayId
                        ? state.stays.find((s) => s.id === room.currentStayId)
                        : undefined;
                      const todayRate = getRoomRateForDate(room.id, '24h');
                      const statusColor = state.config.coloresEstado[room.status];

                      return (
                        <button
                          key={room.id}
                          onClick={() => handleRoomClick(room)}
                          className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] text-left transition-all hover:border-[#B8891F] hover:shadow-md"
                        >
                          <div className="p-3.5 w-full">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-mono text-2xl font-bold tracking-tight text-[#2A2015] tabular-nums">
                                {room.numero}
                              </span>
                              <span className="font-mono text-xs font-semibold text-slate-400">
                                {rt?.codigoCorto || 'HAB'}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                              {rt?.nombre}
                            </p>

                            {stay ? (
                              <div className="mt-2.5 space-y-1 border-t border-slate-100 pt-2">
                                <p className="truncate text-xs font-semibold text-slate-900">
                                  {stay.guestName}
                                </p>
                                <div className="flex items-center justify-between text-[11px] tabular-nums">
                                  <span className="text-slate-500">
                                    Sal: {stay.fechaSalidaProgramada.slice(5, 16).replace('T', ' ')}
                                  </span>
                                  {stay.saldoPendiente > 0 && (
                                    <span className="font-mono font-bold text-red-600">
                                      Debe {formatCurrency(stay.saldoPendiente)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 tabular-nums">
                                <span>Tarifa hoy</span>
                                <span className="font-mono font-semibold text-slate-800">
                                  {formatCurrency(todayRate)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div
                            className="flex w-full items-center justify-between px-3.5 py-1.5 text-[11px] font-semibold text-white"
                            style={{ backgroundColor: statusColor }}
                          >
                            <span className="flex items-center gap-1.5">
                              <BedDouble className="h-3.5 w-3.5" />
                              {STATUS_LABELS[room.status]}
                            </span>
                            {stay?.esCortesia && <span>Cortesía</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Right Operations Panel (Pedidos & Reservas del Día) */}
        <div className="xl:col-span-3">
          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
            <div className="flex border-b border-[#E2D2AF]">
              <button
                onClick={() => setRightTab('PEDIDOS')}
                className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-colors ${
                  rightTab === 'PEDIDOS'
                    ? 'border-b-2 border-[#9A6E0E] text-[#9A6E0E]'
                    : 'text-[#6E5D47] hover:text-[#2A2015]'
                }`}
              >
                Pedidos ({pendingOrders.length})
              </button>
              <button
                onClick={() => setRightTab('RESERVAS')}
                className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-colors ${
                  rightTab === 'RESERVAS'
                    ? 'border-b-2 border-[#9A6E0E] text-[#9A6E0E]'
                    : 'text-[#6E5D47] hover:text-[#2A2015]'
                }`}
              >
                Mis Reservas ({upcomingReservations.length})
              </button>
            </div>

            <div className="max-h-[600px] overflow-y-auto p-3 space-y-2.5">
              {rightTab === 'PEDIDOS' ? (
                pendingOrders.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-400">
                    No hay pedidos pendientes por entregar.
                  </p>
                ) : (
                  pendingOrders.map((ord) => (
                    <div
                      key={ord.consumption.id}
                      className="rounded-lg border border-[#EFE4CB] bg-[#FBF6EA] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-[#2A2015]">
                        <span>Hab. {ord.roomNumber}</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrency(ord.consumption.subtotal)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[#6E5D47]">{ord.guestName}</p>
                      <p className="mt-1.5 font-medium text-[#3A2B18]">
                        {ord.consumption.cantidad}x {ord.consumption.descripcion}
                      </p>
                      <button
                        onClick={() => deliverRoomOrder(ord.stayId, ord.consumption.id)}
                        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-[#9A6E0E] py-1.5 text-[11px] font-semibold text-white hover:bg-[#7E590A]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirmar Entrega
                      </button>
                    </div>
                  ))
                )
              ) : upcomingReservations.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">
                  Sin reservas pendientes.
                </p>
              ) : (
                upcomingReservations.map((res) => {
                  const roomObj = state.rooms.find((r) => r.id === res.roomId);
                  const canCheckIn = roomObj?.status === 'DISPONIBLE';
                  return (
                    <div
                      key={res.id}
                      className="rounded-lg border border-[#EFE4CB] bg-[#FBF6EA] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#2A2015]">
                          Hab. {res.roomNumber}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[#9A6E0E]">
                          {res.localizador}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-semibold text-[#3A2B18]">{res.guestName}</p>
                      <p className="mt-0.5 text-[11px] text-[#6E5D47]">
                        Entrada: {res.fechaEntrada} · {res.noches} noche(s)
                      </p>
                      <div className="mt-1 flex justify-between text-[11px] tabular-nums">
                        <span className="text-[#6E5D47]">Total: {formatCurrency(res.total)}</span>
                        <span className="font-semibold text-emerald-700">
                          Adelanto: {formatCurrency(res.adelanto)}
                        </span>
                      </div>
                      {roomObj && (
                        <button
                          disabled={!canCheckIn}
                          onClick={() => openCheckInForRoom(roomObj, res)}
                          className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-semibold ${
                            canCheckIn
                              ? 'bg-[#3A2B18] text-white hover:bg-[#2A2015]'
                              : 'cursor-not-allowed bg-slate-200 text-slate-500'
                          }`}
                        >
                          {canCheckIn ? 'Realizar Check-In' : `Hab. ${STATUS_LABELS[roomObj.status]}`}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CHECK-IN MODAL */}
      {checkInRoom && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE4CB] bg-[#FBF6EA] px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-bold text-[#2A2015]">
                  Check-In · Habitación {checkInRoom.numero}
                </h2>
                <p className="text-xs text-[#6E5D47]">
                  {state.roomTypes.find((t) => t.id === checkInRoom.roomTypeId)?.nombre}
                  {linkedReservation ? ` · Reserva ${linkedReservation.localizador}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="checkin-room-switcher"
                    className="hidden text-[11px] font-semibold text-[#6E5D47] sm:inline"
                  >
                    Habitación:
                  </label>
                  <select
                    id="checkin-room-switcher"
                    value={checkInRoom.id}
                    onChange={(e) => {
                      const nextRoom = state.rooms.find((r) => r.id === e.target.value);
                      if (!nextRoom) return;
                      const nextRate = getRoomRateForDate(
                        nextRoom.id,
                        modalidad === 'HORAS' ? '12h' : '24h'
                      );
                      setCheckInRoom(nextRoom);
                      setTarifa(nextRate);
                      if (!esCortesia && metodoPago !== 'X PAGAR' && metodoPago !== 'AGENCIAS X PAGAR') {
                        const resAdvance = linkedReservation?.adelanto || 0;
                        setMontoPagar(Math.max(0, cantidad * nextRate - resAdvance));
                      }
                    }}
                    className="rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2A2015] focus:border-[#B8891F] focus:outline-none"
                    title="Cambiar a otra habitación disponible sin cerrar"
                  >
                    {state.rooms
                      .filter((r) => r.status === 'DISPONIBLE' || r.id === checkInRoom.id)
                      .map((r) => {
                        const rType = state.roomTypes.find((t) => t.id === r.roomTypeId);
                        return (
                          <option key={r.id} value={r.id}>
                            Hab. {r.numero} · {rType?.codigoCorto || rType?.nombre} (Piso {r.piso})
                          </option>
                        );
                      })}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckInRoom(null)}
                  className="rounded-lg p-1.5 text-[#6E5D47] hover:bg-[#EFE4CB] hover:text-[#2A2015]"
                  aria-label="Cerrar Check-In"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitCheckIn} className="flex-1 space-y-5 overflow-y-auto p-6">
              {blacklistedMatch && (
                <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      ALERTA: Persona registrada en Control de Personas No Gratas ({blacklistedMatch.tipo})
                    </p>
                    <p className="mt-0.5 text-red-700">{blacklistedMatch.comentario}</p>
                  </div>
                </div>
              )}

              {/* Guest Selector or New Guest */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    1. Huésped Titular
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewGuestForm((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A6E0E] hover:text-[#7E590A]"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {showNewGuestForm ? 'Buscar existente' : 'Registrar nuevo huésped'}
                  </button>
                </div>

                {!showNewGuestForm ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={guestSearch}
                      onChange={(e) => setGuestSearch(e.target.value)}
                      placeholder="Buscar por DNI, Pasaporte o Nombre completo..."
                      className="w-full rounded-lg border border-[#DECFA8] px-3 py-2 text-xs focus:border-[#B8891F] focus:outline-none"
                    />
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-[#E2D2AF] divide-y divide-[#EFE4CB]">
                      {filteredGuests.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedGuestId(g.id)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                            selectedGuestId === g.id
                              ? 'bg-[#FBF5E6] font-semibold text-[#3A2B18]'
                              : 'hover:bg-[#FBF6EA]/60'
                          }`}
                        >
                          <span>
                            {g.nombres}{' '}
                            <span className="font-mono text-slate-500">
                              ({g.tipoDoc} {g.numDoc})
                            </span>
                          </span>
                          <span className="text-[11px] text-slate-400">{g.nacionalidad}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Tipo Doc</label>
                      <select
                        value={newGuestForm.tipoDoc}
                        onChange={(e) =>
                          setNewGuestForm({ ...newGuestForm, tipoDoc: e.target.value as DocType })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <option value="DNI">DNI</option>
                        <option value="PAS">PASAPORTE</option>
                        <option value="CE">CARNET EXT.</option>
                        <option value="RUC">RUC</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">N° Documento *</label>
                      <input
                        type="text"
                        value={newGuestForm.numDoc}
                        onChange={(e) => setNewGuestForm({ ...newGuestForm, numDoc: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Nacionalidad</label>
                      <input
                        type="text"
                        value={newGuestForm.nacionalidad}
                        onChange={(e) =>
                          setNewGuestForm({ ...newGuestForm, nacionalidad: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Nombres y Apellidos *</label>
                      <input
                        type="text"
                        value={newGuestForm.nombres}
                        onChange={(e) => setNewGuestForm({ ...newGuestForm, nombres: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Sexo</label>
                      <select
                        value={newGuestForm.sexo}
                        onChange={(e) =>
                          setNewGuestForm({ ...newGuestForm, sexo: e.target.value as 'M' | 'F' })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Companions */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  Acompañantes / Invitados ({invitados.length})
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invNombre}
                    onChange={(e) => setInvNombre(e.target.value)}
                    placeholder="Nombre del acompañante"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={invDoc}
                    onChange={(e) => setInvDoc(e.target.value)}
                    placeholder="DNI / Pasaporte"
                    className="w-36 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!invNombre.trim()) return;
                      setInvitados([
                        ...invitados,
                        { id: String(Date.now()), nombres: invNombre.toUpperCase(), doc: invDoc },
                      ]);
                      setInvNombre('');
                      setInvDoc('');
                    }}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    + Agregar
                  </button>
                </div>
                {invitados.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {invitados.map((inv) => (
                      <span
                        key={inv.id}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs"
                      >
                        {inv.nombres} ({inv.doc || 'S/D'})
                        <button
                          type="button"
                          onClick={() => setInvitados(invitados.filter((x) => x.id !== inv.id))}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stay Details & Rates */}
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Modalidad</label>
                  <select
                    value={modalidad}
                    onChange={(e) => {
                      const nextMod = e.target.value as 'NOCHES' | 'HORAS';
                      setModalidad(nextMod);
                      const nextRate = getRoomRateForDate(
                        checkInRoom.id,
                        nextMod === 'HORAS' ? '12h' : '24h'
                      );
                      setTarifa(nextRate);
                      setMontoPagar(esCortesia ? 0 : cantidad * nextRate);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  >
                    <option value="NOCHES">Por Noches</option>
                    <option value="HORAS">Por Horas (12h)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Cantidad ({modalidad === 'NOCHES' ? 'Noches' : 'Bloques'})
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={cantidad}
                    onChange={(e) => {
                      const q = Math.max(1, Number(e.target.value));
                      setCantidad(q);
                      setMontoPagar(esCortesia ? 0 : q * tarifa);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Tarifa Unit. (S/)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    disabled={esCortesia}
                    value={esCortesia ? 0 : tarifa}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTarifa(val);
                      setMontoPagar(cantidad * val);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Agencia (Opcional)</label>
                  <select
                    value={agencyId}
                    onChange={(e) => setAgencyId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  >
                    <option value="">Particular / Directo</option>
                    {state.agencies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment & Voucher */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Forma de Pago</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => {
                      const m = e.target.value as PaymentMethodName;
                      setMetodoPago(m);
                      if (m === 'PAX LIBRES') {
                        setEsCortesia(true);
                        setMontoPagar(0);
                      } else if (m === 'X PAGAR' || m === 'AGENCIAS X PAGAR') {
                        setEsCortesia(false);
                        setMontoPagar(0);
                      } else {
                        setEsCortesia(false);
                        setMontoPagar(cantidad * tarifa);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  >
                    {state.config.paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.nombre}>
                        {pm.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Comprobante</label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as VoucherType)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  >
                    <option value="BOLETA">BOLETA</option>
                    <option value="FACTURA">FACTURA</option>
                    <option value="TICKET">TICKET</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Monto a Cobrar (S/)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    disabled={esCortesia || metodoPago === 'X PAGAR'}
                    value={montoPagar}
                    onChange={(e) => setMontoPagar(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={esCortesia}
                      onChange={(e) => {
                        setEsCortesia(e.target.checked);
                        if (e.target.checked) {
                          setMontoPagar(0);
                          setMetodoPago('PAX LIBRES');
                        } else {
                          setMontoPagar(cantidad * tarifa);
                          setMetodoPago('EFECTIVO');
                        }
                      }}
                    />
                    Cortesía (Sin cobro)
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Observaciones</label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Comentarios del ingreso, solicitudes especiales..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <div className="text-xs tabular-nums">
                  <span className="text-slate-500">Total estadía: </span>
                  <strong className="font-mono text-base font-bold text-slate-900">
                    {formatCurrency(esCortesia ? 0 : cantidad * tarifa)}
                  </strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckInRoom(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#9A6E0E] px-5 py-2 text-xs font-semibold text-white hover:bg-[#7E590A]"
                  >
                    Confirmar Check-In
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVE STAY MANAGEMENT MODAL */}
      {activeStay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE4CB] bg-[#FBF6EA] px-6 py-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-900">
                    Habitación {activeStay.roomNumber} · {activeStay.guestName}
                  </h2>
                  <span className="font-mono text-xs font-semibold text-slate-500">
                    {activeStay.guestDocType} {activeStay.guestDocNum}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {activeStay.roomTypeName} · Ingreso: {formatDateTime(activeStay.fechaEntrada)} · Salida:{' '}
                  {formatDateTime(activeStay.fechaSalidaProgramada)}
                </p>
              </div>
              <button
                onClick={() => setActiveStayId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stay Subtabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-6 py-2">
              {[
                { id: 'RESUMEN', label: 'Cuenta y Check-Out', icon: <CreditCard className="h-3.5 w-3.5" /> },
                { id: 'CONSUMO', label: 'Agregar Consumo POS', icon: <Plus className="h-3.5 w-3.5" /> },
                { id: 'RENOVAR', label: 'Renovar Estadía', icon: <RefreshCw className="h-3.5 w-3.5" /> },
                { id: 'CAMBIAR', label: 'Cambiar Habitación', icon: <ArrowRightLeft className="h-3.5 w-3.5" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStayModalTab(tab.id as typeof stayModalTab)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    stayModalTab === tab.id
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Summary Strip */}
              <div className="grid grid-cols-3 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 tabular-nums">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Total Cargos</p>
                  <p className="font-mono text-lg font-bold text-slate-900">
                    {formatCurrency(activeStay.totalCargos)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Total Pagado</p>
                  <p className="font-mono text-lg font-bold text-emerald-700">
                    {formatCurrency(activeStay.totalPagado)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Saldo Pendiente</p>
                  <p
                    className={`font-mono text-lg font-bold ${
                      activeStay.saldoPendiente > 0 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(activeStay.saldoPendiente)}
                  </p>
                </div>
              </div>

              {stayModalTab === 'RESUMEN' && (
                <div className="space-y-4">
                  {/* Consumptions & Payments Lists */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Detalle de Consumos y Renovaciones
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span>
                            Hospedaje inicial ({activeStay.cantidadInicial}{' '}
                            {activeStay.modalidad.toLowerCase()})
                          </span>
                          <span className="font-mono font-semibold tabular-nums">
                            {formatCurrency(
                              activeStay.esCortesia
                                ? 0
                                : activeStay.cantidadInicial * activeStay.tarifaBase
                            )}
                          </span>
                        </div>
                        {activeStay.renewals.map((r) => (
                          <div key={r.id} className="flex justify-between border-b border-slate-100 pb-1.5">
                            <span>
                              Renovación +{r.cantidad} {r.modalidad.toLowerCase()}
                            </span>
                            <span className="font-mono font-semibold tabular-nums">
                              {formatCurrency(r.monto)}
                            </span>
                          </div>
                        ))}
                        {activeStay.consumptions.map((c) => (
                          <div key={c.id} className="flex justify-between border-b border-slate-100 pb-1.5">
                            <span>
                              {c.cantidad}x {c.descripcion}
                            </span>
                            <span className="font-mono font-semibold tabular-nums">
                              {formatCurrency(c.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Pagos Registrados
                      </h4>
                      {activeStay.payments.length === 0 ? (
                        <p className="text-xs text-slate-400">Aún no se registran pagos.</p>
                      ) : (
                        <div className="space-y-2 text-xs">
                          {activeStay.payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <div>
                                <p className="font-medium text-slate-800">{p.concepto}</p>
                                <p className="text-[11px] text-slate-400">
                                  {p.metodoPago} · {p.comprobante}
                                </p>
                              </div>
                              <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                                {formatCurrency(p.monto)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Pay Balance */}
                  {activeStay.saldoPendiente > 0 && (
                    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex-1 min-w-[160px]">
                        <label className="mb-1 block text-[11px] font-semibold text-amber-900">
                          Monto a Abonar (S/)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={activeStay.saldoPendiente}
                          step="0.5"
                          value={payBalanceAmount}
                          onChange={(e) => setPayBalanceAmount(Number(e.target.value))}
                          className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="w-44">
                        <label className="mb-1 block text-[11px] font-semibold text-amber-900">
                          Método de Pago
                        </label>
                        <select
                          value={payBalanceMethod}
                          onChange={(e) => setPayBalanceMethod(e.target.value as PaymentMethodName)}
                          className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs"
                        >
                          {state.config.paymentMethods
                            .filter((pm) => pm.nombre !== 'X PAGAR')
                            .map((pm) => (
                              <option key={pm.id} value={pm.nombre}>
                                {pm.nombre}
                              </option>
                            ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          payStayBalance(
                            activeStay.id,
                            payBalanceAmount,
                            payBalanceMethod,
                            'BOLETA'
                          );
                          setPayBalanceAmount(Math.max(0, activeStay.saldoPendiente - payBalanceAmount));
                        }}
                        className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                      >
                        Registrar Abono
                      </button>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setPrintTicket({
                          tipo: 'INGRESO',
                          titulo: 'ESTADO DE CUENTA / FICHA DE HOSPEDAJE',
                          numero: activeStay.payments[0]?.comprobante || `EST-${activeStay.roomNumber}`,
                          fecha: activeStay.fechaEntrada,
                          cliente: activeStay.guestName,
                          documento: `${activeStay.guestDocType}: ${activeStay.guestDocNum}`,
                          habitacion: `${activeStay.roomNumber} (${activeStay.roomTypeName})`,
                          detalleLineas: [
                            { label: 'Entrada', value: formatDateTime(activeStay.fechaEntrada) },
                            { label: 'Salida Prog.', value: formatDateTime(activeStay.fechaSalidaProgramada) },
                            { label: 'Pagado', value: formatCurrency(activeStay.totalPagado) },
                            { label: 'Saldo', value: formatCurrency(activeStay.saldoPendiente) },
                          ],
                          total: activeStay.totalCargos,
                          incluirPoliticas: true,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Imprimir Ficha
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const ok = checkOutStay(
                          activeStay.id,
                          activeStay.saldoPendiente > 0
                            ? {
                                monto: activeStay.saldoPendiente,
                                metodoPago: payBalanceMethod,
                                voucherType: 'BOLETA',
                              }
                            : undefined
                        );
                        if (ok) setActiveStayId(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {activeStay.saldoPendiente > 0
                        ? `Cobrar ${formatCurrency(activeStay.saldoPendiente)} y Hacer Check-Out`
                        : 'Finalizar Check-Out'}
                    </button>
                  </div>
                </div>
              )}

              {stayModalTab === 'CONSUMO' && (
                <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold uppercase text-slate-600">
                    Cargar Producto o Servicio a Hab. {activeStay.roomNumber}
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Producto / Servicio</label>
                      <select
                        value={posProductId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setPosProductId(id);
                          const p = state.products.find((x) => x.id === id);
                          if (p) setPosPrice(p.precio);
                        }}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                      >
                        {state.products
                          .filter((p) => p.activo)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.descripcion} ({formatCurrency(p.precio)})
                              {p.tipo === 'STOCKABLE' ? ` · Stock: ${p.stocks.RECEPCION}` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        value={posQty}
                        onChange={(e) => setPosQty(Math.max(1, Number(e.target.value)))}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Precio Unit. (S/)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        disabled={!state.config.modificarPreciosPos}
                        value={posPrice}
                        onChange={(e) => setPosPrice(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={posPayNow}
                          onChange={(e) => setPosPayNow(e.target.checked)}
                        />
                        Cobrar inmediatamente
                      </label>
                      {posPayNow && (
                        <select
                          value={posPayMethod}
                          onChange={(e) => setPosPayMethod(e.target.value as PaymentMethodName)}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs"
                        >
                          <option value="EFECTIVO">EFECTIVO</option>
                          <option value="TARJETA">TARJETA</option>
                          <option value="YAPE">YAPE</option>
                          <option value="PLIN">PLIN</option>
                        </select>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addConsumptionToStay(
                          activeStay.id,
                          [{ productId: posProductId, cantidad: posQty, precioUnitario: posPrice }],
                          posPayNow,
                          posPayMethod
                        );
                        setStayModalTab('RESUMEN');
                      }}
                      className="rounded-lg bg-[#9A6E0E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7E590A]"
                    >
                      Agregar {formatCurrency(posQty * posPrice)}
                    </button>
                  </div>
                </div>
              )}

              {stayModalTab === 'RENOVAR' && (
                <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold uppercase text-slate-600">
                    Extender / Renovar Estadía
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Modalidad</label>
                      <select
                        value={renewMod}
                        onChange={(e) => setRenewMod(e.target.value as 'NOCHES' | 'HORAS')}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                      >
                        <option value="NOCHES">Noches adicionales</option>
                        <option value="HORAS">Horas adicionales</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        value={renewQty}
                        onChange={(e) => setRenewQty(Math.max(1, Number(e.target.value)))}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Monto Total Renovación (S/)</label>
                      <input
                        type="number"
                        min={0}
                        value={renewPrice}
                        onChange={(e) => setRenewPrice(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={renewPayNow}
                          onChange={(e) => setRenewPayNow(e.target.checked)}
                        />
                        Pagar renovación ahora
                      </label>
                      {renewPayNow && (
                        <select
                          value={renewMethod}
                          onChange={(e) => setRenewMethod(e.target.value as PaymentMethodName)}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs"
                        >
                          <option value="EFECTIVO">EFECTIVO</option>
                          <option value="TARJETA">TARJETA</option>
                          <option value="YAPE">YAPE</option>
                          <option value="PLIN">PLIN</option>
                        </select>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        renewStay(
                          activeStay.id,
                          renewQty,
                          renewMod,
                          renewPrice,
                          renewPayNow,
                          renewMethod,
                          'BOLETA'
                        );
                        setStayModalTab('RESUMEN');
                      }}
                      className="rounded-lg bg-[#3A2B18] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2015]"
                    >
                      Confirmar Renovación
                    </button>
                  </div>
                </div>
              )}

              {stayModalTab === 'CAMBIAR' && (
                <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold uppercase text-slate-600">
                    Trasladar Huésped a Otra Habitación Disponible
                  </h4>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Habitación Destino
                      </label>
                      <select
                        value={targetChangeRoomId}
                        onChange={(e) => setTargetChangeRoomId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      >
                        {state.rooms
                          .filter((r) => r.status === 'DISPONIBLE')
                          .map((r) => {
                            const rt = state.roomTypes.find((t) => t.id === r.roomTypeId);
                            return (
                              <option key={r.id} value={r.id}>
                                Hab. {r.numero} — {rt?.nombre}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={!targetChangeRoomId}
                      onClick={() => {
                        if (!targetChangeRoomId) return;
                        changeRoom(activeStay.id, targetChangeRoomId);
                        setActiveStayId(null);
                      }}
                      className="rounded-lg bg-[#9A6E0E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7E590A] disabled:bg-slate-300"
                    >
                      Realizar Cambio
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    La habitación actual ({activeStay.roomNumber}) pasará automáticamente a estado En Limpieza.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CLEANING / MAINTENANCE ROOM QUICK MODAL */}
      {statusRoom && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Habitación {statusRoom.numero} · {STATUS_LABELS[statusRoom.status]}
              </h3>
              <button
                onClick={() => setStatusRoom(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-xs text-slate-600">
              {statusRoom.status === 'EN_LIMPIEZA' && (
                <>
                  <p>Esta habitación se encuentra en proceso de limpieza.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        completeCleaning(statusRoom.id);
                        setStatusRoom(null);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-700"
                    >
                      <Sparkles className="h-4 w-4" />
                      Marcar Limpia / Disponible
                    </button>
                    <button
                      onClick={() => {
                        setStatusRoom(null);
                        onNavigate('limpieza');
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Ir a Limpieza
                    </button>
                  </div>
                </>
              )}
              {statusRoom.status === 'EN_MANTENIMIENTO' && (
                <>
                  <p>Esta habitación tiene una incidencia de mantenimiento activa.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const activeMnt = state.maintenanceRecords.find(
                          (m) => m.roomId === statusRoom.id && m.estado === 'ACTIVO'
                        );
                        if (activeMnt) resolveMaintenance(activeMnt.id);
                        setStatusRoom(null);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#9A6E0E] py-2 font-semibold text-white hover:bg-[#7E590A]"
                    >
                      <Wrench className="h-4 w-4" />
                      Finalizar Mantenimiento
                    </button>
                    <button
                      onClick={() => {
                        setStatusRoom(null);
                        onNavigate('mantenimientos');
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Ver Mantenimiento
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <PrintTicketModal ticket={printTicket} onClose={() => setPrintTicket(null)} />
    </div>
  );
};
