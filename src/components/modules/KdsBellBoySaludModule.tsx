import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ambulance,
  CheckCircle2,
  Clock,
  HeartPulse,
  Luggage,
  Plane,
  Plus,
  Printer,
  QrCode,
  ShieldAlert,
  UtensilsCrossed,
  Wind,
  X,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type {
  AirportTransfer,
  BellBoyTicket,
  MedicalAlert,
  RoomServiceOrder,
} from '../../types/pms';
import { formatCurrency } from '../../utils/exportCsv';
import { PrintTicketModal, type PrintTicketData } from '../common/PrintTicketModal';

interface KdsBellBoySaludModuleProps {
  mode: 'kds_cocina' | 'bell_boys' | 'salud_emergencias';
}

export const KdsBellBoySaludModule: React.FC<KdsBellBoySaludModuleProps> = ({ mode }) => {
  const {
    state,
    createRoomServiceOrder,
    advanceKdsOrderStatus,
    createBellBoyTicket,
    updateBellBoyStatus,
    createTransfer,
    reportFlightDelay,
    updateTransferStatus,
    triggerMedicalAlert,
    updateMedicalAlertStatus,
    notify,
  } = usePMS();

  const activeStays = useMemo(
    () => state.stays.filter((s) => s.status === 'ACTIVA'),
    [state.stays]
  );

  // KDS New Order Modal
  const [showKdsModal, setShowKdsModal] = useState(false);
  const [kdsStayId, setKdsStayId] = useState(activeStays[0]?.id || '');
  const [kdsProductId, setKdsProductId] = useState(state.products[1]?.id || state.products[0]?.id || '');
  const [kdsQty, setKdsQty] = useState(1);
  const [kdsCanal, setKdsCanal] = useState<RoomServiceOrder['canal']>('QR_HABITACION');
  const [kdsNotas, setKdsNotas] = useState('');

  // Bell Boy Ticket Form
  const [bbTipo, setBbTipo] = useState<BellBoyTicket['tipo']>('GUARDAEQUIPAJE');
  const [bbGuestName, setBbGuestName] = useState('');
  const [bbRoomId, setBbRoomId] = useState('');
  const [bbBultos, setBbBultos] = useState(2);
  const [bbRack, setBbRack] = useState('RACK-B1');
  const [bbDesc, setBbDesc] = useState('');
  const [printTicket, setPrintTicket] = useState<PrintTicketData | null>(null);

  // Airport Transfer Form
  const [trTipo, setTrTipo] = useState<AirportTransfer['tipo']>('PICK_UP');
  const [trGuest, setTrGuest] = useState('');
  const [trRoomNum, setTrRoomNum] = useState('');
  const [trVuelo, setTrVuelo] = useState('LA-2045');
  const [trAero, setTrAero] = useState('LATAM AIRLINES');
  const [trHora, setTrHora] = useState('16:30');
  const [trChofer, setTrChofer] = useState('CARLOS CONDORI');
  const [trVehiculo, setTrVehiculo] = useState('Van Mercedes VIP · X4T-910');
  const [trPax, setTrPax] = useState(2);

  // Medical SOS Form
  const [medRoomId, setMedRoomId] = useState(
    state.rooms.find((r) => r.status === 'OCUPADO')?.id || state.rooms[0]?.id || ''
  );
  const [medTipo, setMedTipo] = useState<MedicalAlert['tipo']>('OXIGENO');
  const [medOrigen, setMedOrigen] = useState<MedicalAlert['origen']>('TELEFONO_HABITACION');
  const [medSintomas, setMedSintomas] = useState('');
  const [medCargo, setMedCargo] = useState(50);

  const handleCreateKdsOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const targetStayId = kdsStayId || activeStays[0]?.id;
    if (!targetStayId || !kdsProductId) {
      notify('warning', 'Se requiere una habitación ocupada y un producto');
      return;
    }
    const created = createRoomServiceOrder({
      stayId: targetStayId,
      items: [{ productId: kdsProductId, cantidad: kdsQty }],
      canal: kdsCanal,
      notasCocina: kdsNotas,
    });
    if (created) {
      setShowKdsModal(false);
      setKdsNotas('');
    }
  };

  const handleCreateBellBoy = (e: React.FormEvent) => {
    e.preventDefault();
    const room = state.rooms.find((r) => r.id === bbRoomId);
    const stay = room ? activeStays.find((s) => s.roomId === room.id) : undefined;
    const gName = (bbGuestName.trim() || stay?.guestName || '').toUpperCase();
    if (!gName) {
      notify('warning', 'Ingrese el nombre del huésped o seleccione habitación');
      return;
    }
    createBellBoyTicket({
      tipo: bbTipo,
      roomId: room?.id,
      roomNumber: room?.numero,
      stayId: stay?.id,
      guestName: gName,
      bultos: bbBultos,
      ubicacionRack: bbTipo === 'GUARDAEQUIPAJE' ? bbRack : undefined,
      descripcionEquipaje: bbDesc || 'Equipaje estándar de viajero',
      origen: 'RECEPCION',
    });
    setBbGuestName('');
    setBbDesc('');
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trGuest.trim() || !trVuelo.trim()) return;
    createTransfer({
      tipo: trTipo,
      guestName: trGuest.trim().toUpperCase(),
      roomNumber: trRoomNum.trim() || undefined,
      vuelo: trVuelo.trim().toUpperCase(),
      aerolinea: trAero.trim().toUpperCase(),
      horaProgramada: trHora,
      chofer: trChofer.trim().toUpperCase(),
      vehiculo: trVehiculo.trim(),
      pax: trPax,
    });
    setTrGuest('');
  };

  const handleTriggerMedical = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medRoomId) return;
    triggerMedicalAlert({
      roomId: medRoomId,
      tipo: medTipo,
      origen: medOrigen,
      sintomas: medSintomas.trim() || 'Asistencia solicitada en habitación',
      cargoServicio: medCargo,
    });
    setMedSintomas('');
  };

  if (mode === 'kds_cocina') {
    const columns: { status: RoomServiceOrder['status']; label: string; color: string }[] = [
      { status: 'PENDIENTE', label: 'Pendiente Cocina', color: 'border-amber-300 bg-amber-50/70' },
      { status: 'EN_PREPARACION', label: 'En Preparación', color: 'border-sky-300 bg-sky-50/70' },
      { status: 'LISTO', label: 'Listo (WhatsApp Enviado)', color: 'border-emerald-300 bg-emerald-50/70' },
      { status: 'ENTREGADO', label: 'Entregado / Bandeja', color: 'border-[#E2D2AF] bg-[#FBF6EA]' },
    ];

    const trayPickups = state.roomServiceOrders.filter((o) => o.status === 'BANDEJA_POR_RECOGER');

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
          <div>
            <h2 className="font-luxury text-lg font-bold text-[#2A2015] flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-[#9A6E0E]" />
              Room Service & KDS (Kitchen Display System)
            </h2>
            <p className="text-xs text-[#6E5D47]">
              Pedidos desde QR en habitación, WhatsApp IA o Smart TV directos a cocina con alerta de alergias y cargo automático al folio
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setKdsStayId(activeStays[0]?.id || '');
              setShowKdsModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#7E590A]"
          >
            <Plus className="h-4 w-4" />
            Simular Pedido QR / TV / Bot
          </button>
        </div>

        {/* Tray Pickup Alert */}
        {trayPickups.length > 0 && (
          <div className="rounded-xl border border-amber-400 bg-amber-50 p-3.5 shadow-xs space-y-2">
            <p className="text-xs font-bold text-amber-900">
              Retiro de Bandeja Solicitado por Huéspedes ({trayPickups.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {trayPickups.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs"
                >
                  <span className="font-mono font-bold text-[#2A2015]">Hab. {o.roomNumber}</span>
                  <span>{o.codigo} · {o.guestName}</span>
                  <button
                    type="button"
                    onClick={() => advanceKdsOrderStatus(o.id, 'FINALIZADO')}
                    className="rounded bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-800"
                  >
                    Bandeja Recogida ✓
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KDS Kanban Columns */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const list = state.roomServiceOrders.filter((o) => o.status === col.status);
            return (
              <div key={col.status} className={`rounded-xl border p-3 space-y-2.5 ${col.color}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2A2015]">
                    {col.label}
                  </h3>
                  <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-[#3A2B18] border border-[#E2D2AF]">
                    {list.length}
                  </span>
                </div>

                {list.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#D6C6A5] bg-white/60 p-4 text-center text-[11px] text-[#6E5D47]">
                    Sin comandas en esta etapa
                  </div>
                ) : (
                  list.map((o) => (
                    <div
                      key={o.id}
                      className="rounded-xl border border-[#E2D2AF] bg-white p-3 shadow-xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-[#3A2B18] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                          Hab. {o.roomNumber}
                        </span>
                        <span className="font-mono font-bold text-[#9A6E0E]">{o.codigo}</span>
                      </div>
                      <p className="font-bold text-[#2A2015] truncate">{o.guestName}</p>
                      <p className="text-[10px] font-semibold text-[#6E5D47]">
                        Canal: {o.canal.replace(/_/g, ' ')} · {formatCurrency(o.total)}
                      </p>

                      {o.alergiasAlert && (
                        <div className="rounded-lg border border-red-300 bg-red-50 px-2 py-1.5 text-[10px] font-bold text-red-800 flex items-start gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                          <span>CRM ALERGIA: {o.alergiasAlert}</span>
                        </div>
                      )}

                      <ul className="space-y-1 border-t border-b border-[#EFE4CB] py-1.5 text-[11px]">
                        {o.items.map((it, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span className="font-medium text-[#2A2015]">
                              {it.cantidad}x {it.descripcion}
                            </span>
                            <span className="font-mono text-[#6E5D47]">
                              {formatCurrency(it.subtotal)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {o.notasCocina && (
                        <p className="text-[10px] italic text-[#5C4A33]">Nota: {o.notasCocina}</p>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {o.status === 'PENDIENTE' && (
                          <button
                            type="button"
                            onClick={() => advanceKdsOrderStatus(o.id, 'EN_PREPARACION')}
                            className="w-full rounded-lg bg-sky-700 py-1.5 text-[11px] font-bold text-white hover:bg-sky-800"
                          >
                            Iniciar Preparación
                          </button>
                        )}
                        {o.status === 'EN_PREPARACION' && (
                          <button
                            type="button"
                            onClick={() => advanceKdsOrderStatus(o.id, 'LISTO')}
                            className="w-full rounded-lg bg-emerald-700 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-800"
                          >
                            Marcar LISTO + Avisar WhatsApp
                          </button>
                        )}
                        {o.status === 'LISTO' && (
                          <button
                            type="button"
                            onClick={() => advanceKdsOrderStatus(o.id, 'ENTREGADO')}
                            className="w-full rounded-lg bg-[#9A6E0E] py-1.5 text-[11px] font-bold text-white hover:bg-[#7E590A]"
                          >
                            Confirmar Entrega en Habitación
                          </button>
                        )}
                        {o.status === 'ENTREGADO' && (
                          <button
                            type="button"
                            onClick={() => advanceKdsOrderStatus(o.id, 'BANDEJA_POR_RECOGER')}
                            className="w-full rounded-lg border border-amber-400 bg-amber-50 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                          >
                            Simular: Huésped pide retirar bandeja
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>

        {/* New KDS Order Modal */}
        {showKdsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#EFE4CB] pb-3">
                <h3 className="font-luxury text-base font-bold text-[#2A2015]">
                  Nuevo Pedido Room Service → Cocina KDS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowKdsModal(false)}
                  className="rounded-lg p-1 text-[#6E5D47] hover:bg-[#FBF6EA]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreateKdsOrder} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="mb-1 block font-semibold">Habitación Ocupada</label>
                  <select
                    value={kdsStayId}
                    onChange={(e) => setKdsStayId(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
                  >
                    {activeStays.map((s) => (
                      <option key={s.id} value={s.id}>
                        Hab. {s.roomNumber} — {s.guestName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="mb-1 block font-semibold">Producto / Plato</label>
                    <select
                      value={kdsProductId}
                      onChange={(e) => setKdsProductId(e.target.value)}
                      className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                    >
                      {state.products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.descripcion} ({formatCurrency(p.precio)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={kdsQty}
                      onChange={(e) => setKdsQty(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2 font-mono font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Canal del Pedido</label>
                  <select
                    value={kdsCanal}
                    onChange={(e) => setKdsCanal(e.target.value as RoomServiceOrder['canal'])}
                    className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
                  >
                    <option value="QR_HABITACION">QR Mesa de Noche</option>
                    <option value="WHATSAPP_BOT">Agente WhatsApp IA</option>
                    <option value="SMART_TV">Smart TV Habitación</option>
                    <option value="RECEPCION">Recepción / Teléfono</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Notas para Cocina</label>
                  <input
                    value={kdsNotas}
                    onChange={(e) => setKdsNotas(e.target.value)}
                    placeholder="Ej: Sin azúcar, entregar en 15 min..."
                    className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowKdsModal(false)}
                    className="rounded-lg border border-[#E2D2AF] px-4 py-2 font-semibold text-[#5C4A33]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-bold text-white hover:bg-[#7E590A]"
                  >
                    Enviar a KDS & Cargar Folio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'bell_boys') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
          <div>
            <h2 className="font-luxury text-lg font-bold text-[#2A2015] flex items-center gap-2">
              <Luggage className="h-5 w-5 text-[#9A6E0E]" />
              Bell Boys, Guardaequipaje Digital QR & Traslados Conectados a Vuelos
            </h2>
            <p className="text-xs text-[#6E5D47]">
              Tickets de maletas por WhatsApp/QR al smartwatch del botones, etiquetas digitales y reprogramación automática de traslados por retrasos de vuelo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* Left: Luggage Tickets & Guardaequipaje QR */}
          <div className="space-y-3 xl:col-span-6">
            <form
              onSubmit={handleCreateBellBoy}
              className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs space-y-3 text-xs"
            >
              <h3 className="font-luxury text-sm font-bold text-[#2A2015] flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-[#9A6E0E]" />
                Nuevo Ticket de Equipaje / Guardaequipaje Digital QR
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block font-semibold">Servicio</label>
                  <select
                    value={bbTipo}
                    onChange={(e) => setBbTipo(e.target.value as BellBoyTicket['tipo'])}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                  >
                    <option value="GUARDAEQUIPAJE">Guardaequipaje (Custodia QR)</option>
                    <option value="BAJADA_MALETAS">Bajada de Maletas (Check-Out)</option>
                    <option value="SUBIDA_CHECKIN">Subida de Equipaje (Check-In)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Habitación (Opcional)</label>
                  <select
                    value={bbRoomId}
                    onChange={(e) => setBbRoomId(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                  >
                    <option value="">-- Lobby / Sin hab. --</option>
                    {state.rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Hab. {r.numero}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="mb-1 block font-semibold">Huésped</label>
                  <input
                    value={bbGuestName}
                    onChange={(e) => setBbGuestName(e.target.value)}
                    placeholder="Nombre completo del huésped"
                    className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Bultos</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={bbBultos}
                    onChange={(e) => setBbBultos(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2 font-mono font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="mb-1 block font-semibold">Descripción de Bultos</label>
                  <input
                    value={bbDesc}
                    onChange={(e) => setBbDesc(e.target.value)}
                    placeholder="Ej: 2 maletas negras + 1 mochila"
                    className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Rack / Zona</label>
                  <input
                    value={bbRack}
                    onChange={(e) => setBbRack(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2 font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#9A6E0E] py-2 font-bold text-white hover:bg-[#7E590A]"
              >
                Generar Ticket QR & Notificar Bell Boy
              </button>
            </form>

            <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs space-y-2.5">
              <h3 className="font-luxury text-sm font-bold text-[#2A2015]">
                Cola de Equipaje & Resguardo ({state.bellBoyTickets.length})
              </h3>
              {state.bellBoyTickets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-[#EFE4CB] bg-white p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#9A6E0E]">{t.codigoQr}</span>
                    <span className="rounded bg-[#FBF4E2] px-2 py-0.5 text-[10px] font-bold text-[#5C3F04]">
                      {t.tipo.replace(/_/g, ' ')} · {t.status}
                    </span>
                  </div>
                  <p className="font-bold text-[#2A2015]">
                    {t.guestName} {t.roomNumber ? `· Hab. ${t.roomNumber}` : ''}
                  </p>
                  <p className="text-[11px] text-[#6E5D47]">
                    {t.bultos} bultos ({t.descripcionEquipaje}) {t.ubicacionRack ? `· ${t.ubicacionRack}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {t.status === 'PENDIENTE' && (
                      <button
                        type="button"
                        onClick={() => updateBellBoyStatus(t.id, 'EN_CAMINO', 'MARIO APAZA')}
                        className="rounded bg-sky-700 px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        Bell Boy En Camino
                      </button>
                    )}
                    {t.status !== 'ENTREGADO' && (
                      <button
                        type="button"
                        onClick={() => updateBellBoyStatus(t.id, 'ENTREGADO')}
                        className="rounded bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        Marcar Entregado ✓
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setPrintTicket({
                          tipo: 'RESERVA',
                          titulo: 'COMPROBANTE DIGITAL GUARDAEQUIPAJE QR',
                          numero: t.codigoQr,
                          fecha: t.createdAt.slice(0, 16).replace('T', ' '),
                          cliente: t.guestName,
                          habitacion: t.roomNumber ? `Hab. ${t.roomNumber}` : 'Custodia Lobby',
                          detalleLineas: [
                            { label: 'Tipo Servicio', value: t.tipo.replace(/_/g, ' ') },
                            { label: 'Bultos', value: String(t.bultos) },
                            { label: 'Detalle', value: t.descripcionEquipaje },
                            { label: 'Ubicación Rack', value: t.ubicacionRack || 'En tránsito' },
                          ],
                          total: 0,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded border border-[#E2D2AF] px-2 py-1 text-[11px] font-semibold text-[#3A2B18]"
                    >
                      <Printer className="h-3 w-3 text-[#9A6E0E]" />
                      Ticket QR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Flight-Synced Airport Transfers */}
          <div className="space-y-3 xl:col-span-6">
            <form
              onSubmit={handleCreateTransfer}
              className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs space-y-3 text-xs"
            >
              <h3 className="font-luxury text-sm font-bold text-[#2A2015] flex items-center gap-1.5">
                <Plane className="h-4 w-4 text-[#9A6E0E]" />
                Programar Traslado (Pick-Up / Drop-Off) Conectado a Vuelo
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block font-semibold">Tipo</label>
                  <select
                    value={trTipo}
                    onChange={(e) => setTrTipo(e.target.value as AirportTransfer['tipo'])}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2 py-2"
                  >
                    <option value="PICK_UP">PICK-UP (Aeropuerto → Hotel)</option>
                    <option value="DROP_OFF">DROP-OFF (Hotel → Aeropuerto)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold">N° Vuelo</label>
                  <input
                    value={trVuelo}
                    onChange={(e) => setTrVuelo(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2 py-2 font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Hora Vuelo</label>
                  <input
                    type="time"
                    value={trHora}
                    onChange={(e) => setTrHora(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2 py-2 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="mb-1 block font-semibold">Huésped / Grupo</label>
                  <input
                    value={trGuest}
                    onChange={(e) => setTrGuest(e.target.value)}
                    placeholder="Nombre del pasajero"
                    className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Hab. / Pax</label>
                  <div className="flex gap-1">
                    <input
                      value={trRoomNum}
                      onChange={(e) => setTrRoomNum(e.target.value)}
                      placeholder="Hab"
                      className="w-1/2 rounded-lg border border-[#E2D2AF] px-1.5 py-2"
                    />
                    <input
                      type="number"
                      min={1}
                      value={trPax}
                      onChange={(e) => setTrPax(Math.max(1, Number(e.target.value)))}
                      className="w-1/2 rounded-lg border border-[#E2D2AF] px-1.5 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block font-semibold">Aerolínea</label>
                  <input
                    value={trAero}
                    onChange={(e) => setTrAero(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Chofer</label>
                  <input
                    value={trChofer}
                    onChange={(e) => setTrChofer(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Vehículo</label>
                  <input
                    value={trVehiculo}
                    onChange={(e) => setTrVehiculo(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2 py-2"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#3A2B18] py-2 font-bold text-white hover:bg-[#2A2015]"
              >
                Programar Traslado & Sincronizar Vuelo
              </button>
            </form>

            <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs space-y-2.5">
              <h3 className="font-luxury text-sm font-bold text-[#2A2015]">
                Monitoreo de Vuelos y Traslados ({state.transfers.length})
              </h3>
              {state.transfers.map((tr) => (
                <div
                  key={tr.id}
                  className="rounded-xl border border-[#EFE4CB] bg-white p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#9A6E0E]">
                      {tr.codigo} · Vuelo {tr.vuelo} ({tr.aerolinea})
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        tr.status === 'VUELO_RETRASADO'
                          ? 'bg-amber-100 text-amber-900'
                          : tr.status === 'COMPLETADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {tr.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="font-bold text-[#2A2015]">
                    {tr.guestName} ({tr.pax} pax) {tr.roomNumber ? `· Hab. ${tr.roomNumber}` : ''}
                  </p>
                  <p className="text-[11px] text-[#6E5D47] flex flex-wrap items-center gap-2">
                    <Clock className="h-3 w-3 text-[#9A6E0E]" />
                    <span>Prog: {tr.horaProgramada}</span>
                    {tr.retrasoMin > 0 && (
                      <span className="font-bold text-amber-800">
                        → Reprogramada: {tr.horaActualizada} (+{tr.retrasoMin}m)
                      </span>
                    )}
                    <span>· Chofer: {tr.chofer} ({tr.vehiculo})</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tr.status !== 'COMPLETADO' && (
                      <>
                        <button
                          type="button"
                          onClick={() => reportFlightDelay(tr.id, 45)}
                          className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                        >
                          Simular Retraso Vuelo +45m
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTransferStatus(tr.id, 'EN_RUTA')}
                          className="rounded bg-sky-700 px-2.5 py-1 text-[11px] font-bold text-white"
                        >
                          Chofer En Ruta
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTransferStatus(tr.id, 'COMPLETADO')}
                          className="rounded bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white"
                        >
                          Completado ✓
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {printTicket && (
          <PrintTicketModal ticket={printTicket} onClose={() => setPrintTicket(null)} />
        )}
      </div>
    );
  }

  // SALUD, OXIGENO & EMERGENCIAS SILENCIOSAS
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-gradient-to-r from-[#FFFDF9] to-red-50/60 px-4 py-3 shadow-xs">
        <div>
          <h2 className="font-luxury text-lg font-bold text-[#2A2015] flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-red-600" />
            Salud, Oxigenoterapia & Emergencias Silenciosas (Altura / Cusco)
          </h2>
          <p className="text-xs text-[#6E5D47]">
            Botón prioritario de oxígeno, médico en habitación y telemedicina con visualización inmediata de alergias e historial CRM
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <form
          onSubmit={handleTriggerMedical}
          className="rounded-xl border border-red-200 bg-[#FFFDF9] p-4 shadow-xs lg:col-span-4 space-y-3 text-xs"
        >
          <h3 className="font-luxury text-sm font-bold text-red-900 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            Activar Protocolo Médico / Oxígeno
          </h3>
          <div>
            <label className="mb-1 block font-semibold">Habitación</label>
            <select
              value={medRoomId}
              onChange={(e) => setMedRoomId(e.target.value)}
              className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
            >
              {state.rooms.map((r) => {
                const s = activeStays.find((x) => x.roomId === r.id);
                return (
                  <option key={r.id} value={r.id}>
                    Hab. {r.numero} {s ? `— ${s.guestName}` : `(${r.status})`}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-semibold">Tipo de Asistencia</label>
            <select
              value={medTipo}
              onChange={(e) => setMedTipo(e.target.value as MedicalAlert['tipo'])}
              className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
            >
              <option value="OXIGENO">Suministro de Oxígeno Medicinal (Soroche)</option>
              <option value="MEDICO_HABITACION">Médico Presencial en Habitación</option>
              <option value="TELEMEDICINA">Telemedicina (Videollamada Seguro Viaje)</option>
              <option value="EMERGENCIA_CRITICA">Emergencia Crítica / Ambulancia</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-semibold">Canal de Alerta</label>
              <select
                value={medOrigen}
                onChange={(e) => setMedOrigen(e.target.value as MedicalAlert['origen'])}
                className="w-full rounded-lg border border-[#E2D2AF] px-2 py-2"
              >
                <option value="TELEFONO_HABITACION">Teléfono Hab.</option>
                <option value="WHATSAPP_SOS">Botón SOS WhatsApp</option>
                <option value="TV_SMART">Smart TV Hab.</option>
                <option value="RECEPCION">Recepción</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold">Cargo Folio (S/)</label>
              <input
                type="number"
                min={0}
                value={medCargo}
                onChange={(e) => setMedCargo(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-semibold">Síntomas / Solicitud</label>
            <textarea
              rows={2}
              value={medSintomas}
              onChange={(e) => setMedSintomas(e.target.value)}
              placeholder="Ej: Dolor de cabeza y fatiga por altura, solicita concentrador de oxígeno..."
              className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2.5 font-bold text-white hover:bg-red-700"
          >
            <Ambulance className="h-4 w-4" />
            Disparar Alerta Prioritaria
          </button>
        </form>

        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs lg:col-span-8 space-y-3">
          <h3 className="font-luxury text-sm font-bold text-[#2A2015]">
            Bitácora & Atención Médica en Tiempo Real ({state.medicalAlerts.length})
          </h3>
          <div className="space-y-2.5">
            {state.medicalAlerts.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-3.5 text-xs space-y-2 ${
                  a.status === 'ACTIVA'
                    ? 'border-red-400 bg-red-50'
                    : a.status === 'EN_ATENCION'
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-[#EFE4CB] bg-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#3A2B18] px-2 py-0.5 font-mono font-bold text-white">
                      Hab. {a.roomNumber}
                    </span>
                    <span className="font-mono font-bold text-red-700">{a.codigo}</span>
                    <span className="inline-flex items-center gap-1 font-bold text-[#2A2015]">
                      {a.tipo === 'OXIGENO' && <Wind className="h-3.5 w-3.5 text-sky-700" />}
                      {a.tipo.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      a.status === 'ACTIVA'
                        ? 'bg-red-600 text-white'
                        : a.status === 'EN_ATENCION'
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {a.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="font-bold text-[#2A2015]">{a.guestName}</p>
                <p className="text-[#5C4A33]">{a.sintomas}</p>

                <div className="rounded-lg border border-amber-200 bg-white/80 px-2.5 py-1.5 text-[11px] text-[#3A2B18]">
                  <strong>Historial & Alergias CRM:</strong> {a.alergiasHistorial}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-[#6E5D47]">
                    Origen: {a.origen.replace(/_/g, ' ')} · Cargo: {formatCurrency(a.cargoServicio)}
                    {a.asignadoA ? ` · Atiende: ${a.asignadoA}` : ''}
                  </span>
                  <div className="flex gap-1.5">
                    {a.status === 'ACTIVA' && (
                      <button
                        type="button"
                        onClick={() => updateMedicalAlertStatus(a.id, 'EN_ATENCION', 'TÓPICO + SEGURIDAD')}
                        className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700"
                      >
                        Despachar Equipo Médico
                      </button>
                    )}
                    {a.status !== 'RESUELTA' && (
                      <button
                        type="button"
                        onClick={() => updateMedicalAlertStatus(a.id, 'RESUELTA', a.asignadoA || 'TÓPICO')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white hover:bg-emerald-800"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Marcar Resuelta {a.cargoServicio > 0 ? '(+Cargar Folio)' : ''}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
