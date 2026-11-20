import React, { useMemo, useState } from 'react';
import { Building2, CheckCircle2, Sparkles, Users, X } from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type {
  Agency,
  AgencyGroup,
  DocType,
  PaymentMethodName,
  SaleRecord,
  Stay,
  VoucherType,
} from '../../types/pms';
import { formatCurrency } from '../../utils/exportCsv';

interface AgencyGroupModalProps {
  onClose: () => void;
  onSuccess: (result: { group: AgencyGroup; stays: Stay[]; sale: SaleRecord | null }) => void;
}

interface RoomPickState {
  selected: boolean;
  pax: number;
  rate: number;
}

export const AgencyGroupModal: React.FC<AgencyGroupModalProps> = ({ onClose, onSuccess }) => {
  const { state, getRoomRateForDate, saveAgency, checkInAgencyGroup, notify } = usePMS();

  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(state.agencies[0]?.id || '');
  const [creatingAgency, setCreatingAgency] = useState(state.agencies.length === 0);
  const [newAgencyForm, setNewAgencyForm] = useState({
    nombre: '',
    tipoDoc: 'RUC' as DocType,
    numDoc: '',
    telefono: '',
    direccionFiscal: '',
  });

  const [nombreGrupo, setNombreGrupo] = useState('GRUPO TURÍSTICO INKA TRAIL');
  const [guiaResponsable, setGuiaResponsable] = useState('');
  const [guiaDoc, setGuiaDoc] = useState('');
  const [targetPax, setTargetPax] = useState(20);
  const [modalidad, setModalidad] = useState<'NOCHES' | 'HORAS'>('NOCHES');
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState('');

  const [billingMode, setBillingMode] = useState<'UN_SOLO_PAGO_AHORA' | 'CREDITO_AGENCIA'>(
    'UN_SOLO_PAGO_AHORA'
  );
  const [metodoPago, setMetodoPago] = useState<PaymentMethodName>('TRANSFERENCIA');
  const [voucherType, setVoucherType] = useState<VoucherType>('FACTURA');

  const availableRooms = useMemo(
    () => state.rooms.filter((r) => r.status === 'DISPONIBLE'),
    [state.rooms]
  );

  const [roomPicks, setRoomPicks] = useState<Record<string, RoomPickState>>(() => {
    const initial: Record<string, RoomPickState> = {};
    state.rooms
      .filter((r) => r.status === 'DISPONIBLE')
      .forEach((r) => {
        const rt = state.roomTypes.find((t) => t.id === r.roomTypeId);
        initial[r.id] = {
          selected: false,
          pax: rt?.capacidad || 2,
          rate: getRoomRateForDate(r.id, '24h'),
        };
      });
    return initial;
  });

  const handleModalidadChange = (nextMod: 'NOCHES' | 'HORAS') => {
    setModalidad(nextMod);
    setRoomPicks((prev) => {
      const copy = { ...prev };
      availableRooms.forEach((r) => {
        if (copy[r.id]) {
          copy[r.id] = {
            ...copy[r.id],
            rate: getRoomRateForDate(r.id, nextMod === 'HORAS' ? '12h' : '24h'),
          };
        }
      });
      return copy;
    });
  };

  const distributePaxForType = (roomTypeId: string, desiredPax: number) => {
    const typeRooms = availableRooms.filter((r) => r.roomTypeId === roomTypeId);
    const rt = state.roomTypes.find((t) => t.id === roomTypeId);
    const cap = Math.max(1, rt?.capacidad || 2);
    let remaining = Math.max(0, desiredPax);

    setRoomPicks((prev) => {
      const next = { ...prev };
      typeRooms.forEach((r) => {
        const current = next[r.id] || {
          selected: false,
          pax: cap,
          rate: getRoomRateForDate(r.id, modalidad === 'HORAS' ? '12h' : '24h'),
        };
        if (remaining > 0) {
          const take = Math.min(cap, remaining);
          next[r.id] = { ...current, selected: true, pax: take };
          remaining -= take;
        } else {
          next[r.id] = { ...current, selected: false, pax: cap };
        }
      });
      return next;
    });
  };

  const handleAutoDistributeAll = () => {
    let remaining = Math.max(1, targetPax);
    setRoomPicks((prev) => {
      const next = { ...prev };
      availableRooms.forEach((r) => {
        const rt = state.roomTypes.find((t) => t.id === r.roomTypeId);
        const cap = Math.max(1, rt?.capacidad || 2);
        const base = next[r.id] || {
          selected: false,
          pax: cap,
          rate: getRoomRateForDate(r.id, modalidad === 'HORAS' ? '12h' : '24h'),
        };
        if (remaining > 0) {
          const take = Math.min(cap, remaining);
          next[r.id] = { ...base, selected: true, pax: take };
          remaining -= take;
        } else {
          next[r.id] = { ...base, selected: false, pax: cap };
        }
      });
      return next;
    });
  };

  const toggleRoom = (roomId: string) => {
    setRoomPicks((prev) => {
      const cur = prev[roomId];
      if (!cur) return prev;
      return { ...prev, [roomId]: { ...cur, selected: !cur.selected } };
    });
  };

  const selectedEntries = availableRooms
    .filter((r) => roomPicks[r.id]?.selected)
    .map((r) => ({ room: r, pick: roomPicks[r.id]! }));

  const assignedPaxTotal = selectedEntries.reduce((sum, e) => sum + e.pick.pax, 0);
  const grandTotal = selectedEntries.reduce((sum, e) => sum + e.pick.rate * cantidad, 0);
  const maxHotelCap = availableRooms.reduce((sum, r) => {
    const rt = state.roomTypes.find((t) => t.id === r.roomTypeId);
    return sum + (rt?.capacidad || 2);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let agencyToUse: Agency | undefined = state.agencies.find((a) => a.id === selectedAgencyId);
    if (creatingAgency) {
      if (!newAgencyForm.nombre.trim() || !newAgencyForm.numDoc.trim()) {
        notify('error', 'Datos de agencia incompletos', 'Ingrese el nombre y RUC/Documento de la agencia.');
        return;
      }
      agencyToUse = saveAgency({
        tipoEntidad: 'Agencia',
        tipoDoc: newAgencyForm.tipoDoc,
        numDoc: newAgencyForm.numDoc.trim(),
        nombre: newAgencyForm.nombre.trim().toUpperCase(),
        telefono: newAgencyForm.telefono.trim(),
        paginaWeb: '',
        sector: 'Turismo Receptivo',
        direccionFiscal: newAgencyForm.direccionFiscal.trim() || 'Cusco, Perú',
      });
      setSelectedAgencyId(agencyToUse.id);
    }

    if (!agencyToUse) {
      notify('error', 'Seleccione una agencia', 'Elija una agencia o registre una nueva.');
      return;
    }

    if (selectedEntries.length === 0) {
      notify(
        'error',
        'Sin habitaciones seleccionadas',
        'Asigne personas por tipo de habitación o seleccione las habitaciones disponibles.'
      );
      return;
    }

    const res = checkInAgencyGroup({
      agencyId: agencyToUse.id,
      agencyOverride: agencyToUse,
      nombreGrupo: nombreGrupo.trim() || `${agencyToUse.nombre} (${assignedPaxTotal} PAX)`,
      guiaResponsable: guiaResponsable.trim() || `LÍDER ${agencyToUse.nombre}`,
      guiaDoc: guiaDoc.trim() || agencyToUse.numDoc,
      totalPax: assignedPaxTotal || targetPax,
      modalidad,
      cantidad,
      observaciones,
      allocations: selectedEntries.map((entry) => ({
        roomId: entry.room.id,
        pax: entry.pick.pax,
        tarifaUnitaria: entry.pick.rate,
      })),
      billingMode,
      metodoPago: billingMode === 'CREDITO_AGENCIA' ? 'AGENCIAS X PAGAR' : metodoPago,
      voucherType,
    });

    if (res) {
      onSuccess(res);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-3 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#EFE4CB] bg-[#FBF6EA] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-luxury text-lg font-bold text-[#2A2015] sm:text-xl">
              Check-In Grupal · Agencia de Turismo
            </h2>
            <p className="text-xs text-[#6E5D47]">
              Asigne grupos por tipo de habitación con facturación consolidada (1 solo pago) y cambios de habitación vinculados.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6E5D47] hover:bg-[#EFE4CB] hover:text-[#2A2015]"
            aria-label="Cerrar modal grupal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {/* 1. Agency & Group */}
          <div className="space-y-3 rounded-xl border border-[#E2D2AF] bg-[#FAF7F0] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#3A2B18]">
                <Building2 className="h-3.5 w-3.5 text-[#9A6E0E]" />
                1. Agencia de Turismo y Datos del Grupo
              </h3>
              <button
                type="button"
                onClick={() => setCreatingAgency((v) => !v)}
                className="text-xs font-semibold text-[#9A6E0E] hover:text-[#7E590A]"
              >
                {creatingAgency ? 'Seleccionar agencia existente' : '+ Registrar nueva agencia rápida'}
              </button>
            </div>

            {!creatingAgency ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">
                    Agencia / Operador Turístico *
                  </label>
                  <select
                    value={selectedAgencyId}
                    onChange={(e) => setSelectedAgencyId(e.target.value)}
                    className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2 text-xs font-semibold text-[#2A2015]"
                  >
                    {state.agencies.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.nombre} ({ag.tipoDoc} {ag.numDoc})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">
                    Nombre / Código del Grupo *
                  </label>
                  <input
                    type="text"
                    value={nombreGrupo}
                    onChange={(e) => setNombreGrupo(e.target.value)}
                    placeholder="Ej: GRUPO INKA TRAIL 20 PAX"
                    className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-[#DECFA8] bg-white p-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">
                    Razón Social / Nombre Agencia *
                  </label>
                  <input
                    type="text"
                    value={newAgencyForm.nombre}
                    onChange={(e) => setNewAgencyForm({ ...newAgencyForm, nombre: e.target.value })}
                    placeholder="Ej: INKA TRAIL TOURS SAC"
                    className="w-full rounded-lg border border-[#DECFA8] px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">RUC / Doc *</label>
                  <input
                    type="text"
                    value={newAgencyForm.numDoc}
                    onChange={(e) => setNewAgencyForm({ ...newAgencyForm, numDoc: e.target.value })}
                    placeholder="20601234561"
                    className="w-full rounded-lg border border-[#DECFA8] px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">Teléfono</label>
                  <input
                    type="text"
                    value={newAgencyForm.telefono}
                    onChange={(e) => setNewAgencyForm({ ...newAgencyForm, telefono: e.target.value })}
                    placeholder="984000111"
                    className="w-full rounded-lg border border-[#DECFA8] px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              {creatingAgency && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">Nombre del Grupo</label>
                  <input
                    type="text"
                    value={nombreGrupo}
                    onChange={(e) => setNombreGrupo(e.target.value)}
                    className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-1.5 text-xs"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">Guía / Tour Leader</label>
                <input
                  type="text"
                  value={guiaResponsable}
                  onChange={(e) => setGuiaResponsable(e.target.value)}
                  placeholder="Nombre del guía responsable"
                  className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">Total Personas (PAX)</label>
                <input
                  type="number"
                  min={1}
                  value={targetPax}
                  onChange={(e) => setTargetPax(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">Modalidad</label>
                <select
                  value={modalidad}
                  onChange={(e) => handleModalidadChange(e.target.value as 'NOCHES' | 'HORAS')}
                  className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="NOCHES">Por Noches</option>
                  <option value="HORAS">Por Horas (12h)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">
                  {modalidad === 'NOCHES' ? 'Noches' : 'Bloques (12h)'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* 2. Distribution by Room Type */}
          <div className="space-y-3 rounded-xl border border-[#E2D2AF] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE4CB] pb-3">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#3A2B18]">
                  <Users className="h-3.5 w-3.5 text-[#9A6E0E]" />
                  2. Distribución por Tipo de Habitación ({availableRooms.length} disponibles · Cap. máx.{' '}
                  {maxHotelCap} pax)
                </h3>
                <p className="text-[11px] text-[#6E5D47]">
                  Ingrese la cantidad de personas por tipo de habitación o seleccione manualmente las habitaciones.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoDistributeAll}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#3A2B18] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2A2015]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#E8C56E]" />
                Auto-distribuir {targetPax} pax
              </button>
            </div>

            <div className="space-y-3">
              {state.roomTypes.map((rt) => {
                const typeRooms = availableRooms.filter((r) => r.roomTypeId === rt.id);
                if (typeRooms.length === 0) return null;

                const typeSelected = typeRooms.filter((r) => roomPicks[r.id]?.selected);
                const typePax = typeSelected.reduce((sum, r) => sum + (roomPicks[r.id]?.pax || 0), 0);
                const typeMaxCap = typeRooms.length * (rt.capacidad || 2);

                return (
                  <div key={rt.id} className="rounded-xl border border-[#E7DAC0] bg-[#FCF9F2] p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-[#2A2015]">
                          {rt.nombre}{' '}
                          <span className="font-mono text-[11px] font-medium text-[#6E5D47]">
                            ({rt.capacidad} pax/hab · {typeRooms.length} disp. · máx {typeMaxCap} pax)
                          </span>
                        </p>
                        <p className="text-[11px] text-[#6E5D47]">
                          Seleccionadas: <strong>{typeSelected.length} hab(s)</strong> ·{' '}
                          <strong>{typePax} personas</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-semibold text-[#5C4A33]">
                          Personas en {rt.codigoCorto}:
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={typeMaxCap}
                          value={typePax}
                          onChange={(e) => distributePaxForType(rt.id, Number(e.target.value))}
                          className="w-20 rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1 text-center font-mono text-xs font-bold text-[#2A2015]"
                        />
                      </div>
                    </div>

                    {/* Individual Available Room Toggles & Editable Rate/Pax */}
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {typeRooms.map((r) => {
                        const pick = roomPicks[r.id];
                        if (!pick) return null;
                        return (
                          <div
                            key={r.id}
                            className={`flex flex-col gap-2 rounded-lg border p-2.5 text-xs transition-colors ${
                              pick.selected
                                ? 'border-[#B8891F] bg-[#FFF8E6] shadow-2xs'
                                : 'border-[#E7DAC0] bg-white opacity-80'
                            }`}
                          >
                            <label className="flex cursor-pointer items-center justify-between gap-2">
                              <span className="flex items-center gap-2 font-semibold text-[#2A2015]">
                                <input
                                  type="checkbox"
                                  checked={pick.selected}
                                  onChange={() => toggleRoom(r.id)}
                                />
                                <span className="font-mono font-bold">Hab. {r.numero}</span>
                                <span className="text-[10px] text-[#7A684D]">P{r.piso}</span>
                              </span>
                              <span className="font-mono text-[11px] font-semibold text-[#9A6E0E]">
                                {formatCurrency(pick.rate)}/n
                              </span>
                            </label>
                            {pick.selected && (
                              <div className="grid grid-cols-2 gap-1.5 border-t border-[#EFE4CB] pt-2">
                                <div>
                                  <label className="block text-[10px] text-[#6E5D47]">Pax Hab.</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={pick.pax}
                                    onChange={(e) =>
                                      setRoomPicks((prev) => ({
                                        ...prev,
                                        [r.id]: {
                                          ...prev[r.id]!,
                                          pax: Math.max(1, Number(e.target.value)),
                                        },
                                      }))
                                    }
                                    className="w-full rounded border border-[#DECFA8] bg-white px-2 py-0.5 font-mono text-[11px] font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-[#6E5D47]">Tarifa S/</label>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={pick.rate}
                                    onChange={(e) =>
                                      setRoomPicks((prev) => ({
                                        ...prev,
                                        [r.id]: {
                                          ...prev[r.id]!,
                                          rate: Math.max(0, Number(e.target.value)),
                                        },
                                      }))
                                    }
                                    className="w-full rounded border border-[#DECFA8] bg-white px-2 py-0.5 font-mono text-[11px] font-bold"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Consolidated Agency Billing */}
          <div className="space-y-3 rounded-xl border border-[#E2D2AF] bg-[#FAF7F0] p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#3A2B18]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#9A6E0E]" />
              3. Facturación Consolidada a la Agencia (Un Solo Pago)
            </h3>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs ${
                  billingMode === 'UN_SOLO_PAGO_AHORA'
                    ? 'border-[#9A6E0E] bg-[#FFF8E6]'
                    : 'border-[#E2D2AF] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="billingMode"
                  checked={billingMode === 'UN_SOLO_PAGO_AHORA'}
                  onChange={() => setBillingMode('UN_SOLO_PAGO_AHORA')}
                  className="mt-0.5"
                />
                <div>
                  <p className="font-bold text-[#2A2015]">Cobrar y Facturar Ahora (1 Solo Pago)</p>
                  <p className="mt-0.5 text-[11px] text-[#6E5D47]">
                    Emite una sola Factura/Boleta consolidada a nombre de la agencia por todas las habitaciones.
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs ${
                  billingMode === 'CREDITO_AGENCIA'
                    ? 'border-[#9A6E0E] bg-[#FFF8E6]'
                    : 'border-[#E2D2AF] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="billingMode"
                  checked={billingMode === 'CREDITO_AGENCIA'}
                  onChange={() => setBillingMode('CREDITO_AGENCIA')}
                  className="mt-0.5"
                />
                <div>
                  <p className="font-bold text-[#2A2015]">Crédito Agencia (AGENCIAS X PAGAR)</p>
                  <p className="mt-0.5 text-[11px] text-[#6E5D47]">
                    Mantiene el grupo abierto para cambios de habitación o consumos y se liquida luego con 1 solo pago en Facturación.
                  </p>
                </div>
              </label>
            </div>

            {billingMode === 'UN_SOLO_PAGO_AHORA' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">Forma de Pago</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as PaymentMethodName)}
                    className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-xs font-semibold"
                  >
                    {state.config.paymentMethods
                      .filter((pm) => pm.nombre !== 'X PAGAR' && pm.nombre !== 'AGENCIAS X PAGAR')
                      .map((pm) => (
                        <option key={pm.id} value={pm.nombre}>
                          {pm.nombre}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">Comprobante Único</label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as VoucherType)}
                    className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="FACTURA">FACTURA (Agencia)</option>
                    <option value="BOLETA">BOLETA</option>
                    <option value="TICKET">TICKET</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#5C4A33]">Observaciones</label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas del grupo..."
                    className="w-full rounded-lg border border-[#DECFA8] bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EFE4CB] pt-4">
            <div className="space-y-0.5 text-xs tabular-nums">
              <p className="text-[#5C4A33]">
                Asignados:{' '}
                <strong
                  className={
                    assignedPaxTotal >= targetPax ? 'text-emerald-700' : 'text-[#9A6E0E]'
                  }
                >
                  {assignedPaxTotal} / {targetPax} personas
                </strong>{' '}
                en <strong>{selectedEntries.length} habitaciones</strong> ({cantidad}{' '}
                {modalidad === 'NOCHES' ? 'noche(s)' : 'bloque(s)'})
              </p>
              <p className="text-sm font-bold text-[#2A2015]">
                Total Consolidado Grupo:{' '}
                <span className="font-mono text-base text-[#9A6E0E]">
                  {formatCurrency(grandTotal)}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#DECFA8] px-4 py-2 text-xs font-semibold text-[#5C4A33] hover:bg-[#FBF6EA]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#9A6E0E] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#7E590A]"
              >
                Confirmar Ingreso Grupal
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
