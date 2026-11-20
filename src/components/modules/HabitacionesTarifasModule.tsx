import React, { useState } from 'react';
import { BedDouble, Check, Edit3, Plus, Users, X } from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type { DayKey, RateTier, RoomAmenities, RoomType } from '../../types/pms';
import { formatCurrency } from '../../utils/exportCsv';
import roomMatKingImg from '../../assets/images/room_matrimonial_king_1795108618355.jpg';

interface HabitacionesTarifasModuleProps {
  mode: 'habitaciones_tipos' | 'tarifa_hotelera';
}

const AMENITY_COLUMNS: { key: keyof RoomAmenities; label: string }[] = [
  { key: 'aguaCaliente', label: 'Agua F/C' },
  { key: 'wifi', label: 'WiFi' },
  { key: 'smartTv', label: 'Smart TV' },
  { key: 'butacasMesa', label: 'Butacas/Mesa' },
  { key: 'netflix', label: 'Netflix' },
  { key: 'cable', label: 'Cable' },
  { key: 'vistaCalle', label: 'Vista Calle' },
  { key: 'tina', label: 'Tina' },
];

const DAY_COLUMNS: { key: DayKey; label: string }[] = [
  { key: 'lun', label: 'LUN' },
  { key: 'mar', label: 'MAR' },
  { key: 'mie', label: 'MIÉ' },
  { key: 'jue', label: 'JUE' },
  { key: 'vie', label: 'VIE' },
  { key: 'sab', label: 'SÁB' },
  { key: 'dom', label: 'DOM' },
  { key: 'ferd', label: 'FERD.' },
];

export const HabitacionesTarifasModule: React.FC<HabitacionesTarifasModuleProps> = ({ mode }) => {
  const {
    state,
    saveRoomType,
    createRoom,
    updateRoomAmenities,
    updateRoomRate,
    assignRoomType,
  } = usePMS();

  const [rateTier, setRateTier] = useState<RateTier>('24h');

  // Room Type Modal
  const [rtModalOpen, setRtModalOpen] = useState(false);
  const [editingRt, setEditingRt] = useState<Partial<RoomType>>({});

  // Create Room Modal
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [newRoomNum, setNewRoomNum] = useState('');
  const [newRoomPiso, setNewRoomPiso] = useState(2);
  const [newRoomTypeId, setNewRoomTypeId] = useState(state.roomTypes[0]?.id || '');

  // Assign Room Modal
  const [assignTargetRt, setAssignTargetRt] = useState<RoomType | null>(null);

  const openEditRoomType = (rt?: RoomType) => {
    setEditingRt(
      rt
        ? { ...rt }
        : {
            nombre: '',
            codigoCorto: 'HB',
            capacidad: 2,
            camas: 1,
            precioDefecto: 170,
            descripcion: '',
            foto: roomMatKingImg,
            serviciosIncluidos: ['Agua Fría / Caliente', 'WiFi', 'Smart TV'],
          }
    );
    setRtModalOpen(true);
  };

  const handleSaveRoomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRt.nombre?.trim()) return;
    saveRoomType({
      id: editingRt.id,
      nombre: editingRt.nombre.toUpperCase(),
      codigoCorto: (editingRt.codigoCorto || 'HB').toUpperCase(),
      capacidad: Number(editingRt.capacidad || 2),
      camas: Number(editingRt.camas || 1),
      precioDefecto: Number(editingRt.precioDefecto || 150),
      descripcion: editingRt.descripcion || '',
      foto: editingRt.foto || roomMatKingImg,
      serviciosIncluidos: editingRt.serviciosIncluidos || ['WiFi', 'Smart TV'],
    });
    setRtModalOpen(false);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNum.trim()) return;
    const baseRate = state.roomTypes.find((t) => t.id === newRoomTypeId)?.precioDefecto || 170;
    const templateRates = state.rooms[0]?.rates || {
      '12h': { lun: Math.round(baseRate * 0.7), mar: Math.round(baseRate * 0.7), mie: Math.round(baseRate * 0.7), jue: Math.round(baseRate * 0.7), vie: Math.round(baseRate * 0.75), sab: Math.round(baseRate * 0.8), dom: Math.round(baseRate * 0.7), ferd: Math.round(baseRate * 0.85) },
      '24h': { lun: baseRate, mar: baseRate, mie: baseRate, jue: baseRate, vie: Math.round(baseRate * 1.1), sab: Math.round(baseRate * 1.15), dom: baseRate, ferd: Math.round(baseRate * 1.2) },
      '48h': { lun: Math.round(baseRate * 1.85), mar: Math.round(baseRate * 1.85), mie: Math.round(baseRate * 1.85), jue: Math.round(baseRate * 1.85), vie: Math.round(baseRate * 2), sab: Math.round(baseRate * 2.1), dom: Math.round(baseRate * 1.85), ferd: Math.round(baseRate * 2.2) },
    };
    createRoom({
      numero: newRoomNum.trim(),
      piso: newRoomPiso,
      roomTypeId: newRoomTypeId,
      status: 'DISPONIBLE',
      amenities: {
        aguaCaliente: true,
        wifi: true,
        smartTv: true,
        butacasMesa: true,
        netflix: true,
        cable: true,
        vistaCalle: false,
        tina: false,
      },
      rates: templateRates,
    });
    setNewRoomNum('');
    setRoomModalOpen(false);
  };

  if (mode === 'habitaciones_tipos') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
          <div>
            <h2 className="font-luxury text-lg font-bold text-[#2A2015]">Catálogo de Tipos de Habitaciones</h2>
            <p className="text-xs text-[#6E5D47]">
              {state.roomTypes.length} categorías · {state.rooms.length} habitaciones registradas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRoomModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2D2AF] bg-[#FFFDF9] px-3 py-1.5 text-xs font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
            >
              <Plus className="h-3.5 w-3.5 text-[#9A6E0E]" />
              Nueva Habitación
            </button>
            <button
              onClick={() => openEditRoomType()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#7E590A]"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo Tipo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.roomTypes.map((rt) => {
            const assignedRooms = state.rooms.filter((r) => r.roomTypeId === rt.id);
            return (
              <div
                key={rt.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs"
              >
                <div className="relative h-44 w-full bg-[#F6EFE2]">
                  <img
                    src={rt.foto}
                    alt={rt.nombre}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="absolute right-3 top-3 rounded-md bg-[#2A2015]/85 px-2.5 py-1 font-mono text-xs font-bold text-[#F5D68B] tabular-nums border border-[#B8891F]/50">
                    {formatCurrency(rt.precioDefecto)} / noche
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#2A2015]">{rt.nombre}</h3>
                      <span className="font-mono text-xs font-bold text-[#9A6E0E]">{rt.codigoCorto}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{rt.descripcion}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        Máx. {rt.capacidad} pax
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                        {rt.camas} cama(s)
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {rt.serviciosIncluidos.join(' · ')}
                    </p>
                  </div>

                  <div className="space-y-2.5 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">Habitaciones:</span>
                      {assignedRooms.length === 0 ? (
                        <span className="text-[11px] text-slate-400">Sin asignar</span>
                      ) : (
                        assignedRooms.map((r) => (
                          <span
                            key={r.id}
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800"
                          >
                            {r.numero}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditRoomType(rt)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => setAssignTargetRt(rt)}
                        className="flex-1 rounded-lg bg-[#3A2B18] py-1.5 text-xs font-semibold text-white hover:bg-[#2A2015]"
                      >
                        Asignar Hab.
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit Room Type Modal */}
        {rtModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {editingRt.id ? 'Editar Tipo de Habitación' : 'Nuevo Tipo de Habitación'}
                </h3>
                <button onClick={() => setRtModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSaveRoomType} className="mt-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block font-semibold text-slate-700">Nombre del Tipo *</label>
                    <input
                      type="text"
                      value={editingRt.nombre || ''}
                      onChange={(e) => setEditingRt({ ...editingRt, nombre: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Código</label>
                    <input
                      type="text"
                      value={editingRt.codigoCorto || ''}
                      onChange={(e) => setEditingRt({ ...editingRt, codigoCorto: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Capacidad</label>
                    <input
                      type="number"
                      min={1}
                      value={editingRt.capacidad || 2}
                      onChange={(e) => setEditingRt({ ...editingRt, capacidad: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Camas</label>
                    <input
                      type="number"
                      min={1}
                      value={editingRt.camas || 1}
                      onChange={(e) => setEditingRt({ ...editingRt, camas: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Tarifa Defecto (S/)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingRt.precioDefecto || 150}
                      onChange={(e) => setEditingRt({ ...editingRt, precioDefecto: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Descripción</label>
                  <textarea
                    rows={2}
                    value={editingRt.descripcion || ''}
                    onChange={(e) => setEditingRt({ ...editingRt, descripcion: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRtModalOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-semibold text-white hover:bg-[#7E590A]"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Room Modal */}
        {roomModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Agregar Nueva Habitación</h3>
                <button onClick={() => setRoomModalOpen(false)} className="text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreateRoom} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">N° Habitación *</label>
                    <input
                      type="text"
                      value={newRoomNum}
                      onChange={(e) => setNewRoomNum(e.target.value)}
                      placeholder="Ej. 406"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Piso</label>
                    <input
                      type="number"
                      min={1}
                      value={newRoomPiso}
                      onChange={(e) => setNewRoomPiso(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Tipo de Habitación</label>
                  <select
                    value={newRoomTypeId}
                    onChange={(e) => setNewRoomTypeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {state.roomTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} ({formatCurrency(t.precioDefecto)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRoomModalOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-semibold text-white hover:bg-[#7E590A]"
                  >
                    Crear Habitación
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Room to RoomType Modal */}
        {assignTargetRt && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
              <div className="flex items-center justify-between border-b border-[#EFE4CB] pb-3">
                <h3 className="text-sm font-bold text-[#2A2015]">
                  Asignar Habitaciones a {assignTargetRt.nombre}
                </h3>
                <button onClick={() => setAssignTargetRt(null)} className="text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
                {state.rooms.map((r) => {
                  const isAssigned = r.roomTypeId === assignTargetRt.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => assignRoomType(r.id, assignTargetRt.id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${
                        isAssigned
                          ? 'border-[#B8891F] bg-[#FBF5E6] font-semibold text-[#3A2B18]'
                          : 'border-[#E2D2AF] hover:bg-[#FBF6EA]/60'
                      }`}
                    >
                      <span>
                        Hab. <strong className="font-mono">{r.numero}</strong> (Piso {r.piso})
                      </span>
                      {isAssigned && <Check className="h-4 w-4 text-[#9A6E0E]" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setAssignTargetRt(null)}
                  className="rounded-lg bg-[#3A2B18] px-4 py-2 font-semibold text-white hover:bg-[#2A2015]"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TARIFA HOTELERA MATRIX
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
        <div>
          <h2 className="font-luxury text-lg font-bold text-[#2A2015]">Tarifa Hotelera y Comodidades</h2>
          <p className="text-xs text-[#6E5D47]">
            Edición directa por habitación, bloque horario y día de la semana (S/). Los cambios impactan el Check-In automáticamente.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-[#E2D2AF] bg-[#FBF6EA] p-1">
          {([
            { id: '12h', label: 'Por Horas (12h)' },
            { id: '24h', label: 'Diaria (24h)' },
            { id: '48h', label: 'Paquete (48h)' },
          ] as const).map((tier) => (
            <button
              key={tier.id}
              onClick={() => setRateTier(tier.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                rateTier === tier.id
                  ? 'bg-[#3A2B18] text-white'
                  : 'text-[#5C4A33] hover:text-[#2A2015]'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[10px] font-bold uppercase tracking-wider text-[#6E5D47]">
              <th className="sticky left-0 z-10 border-r border-[#E2D2AF] bg-[#FBF6EA] px-3 py-3 text-left">
                Hab. / Tipo
              </th>
              {AMENITY_COLUMNS.map((am) => (
                <th key={am.key} className="border-r border-[#EFE4CB] px-2 py-3 text-center whitespace-nowrap">
                  {am.label}
                </th>
              ))}
              {DAY_COLUMNS.map((d) => (
                <th key={d.key} className="border-r border-[#EFE4CB] bg-[#F5E6C4]/70 px-2 py-3 text-center text-[#7E590A]">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFE4CB]">
            {state.rooms.map((room) => {
              const rt = state.roomTypes.find((t) => t.id === room.roomTypeId);
              return (
                <tr key={room.id} className="hover:bg-[#FBF6EA]/50">
                  <td className="sticky left-0 z-10 border-r border-[#E2D2AF] bg-[#FFFDF9] px-3 py-2.5">
                    <span className="font-mono font-bold text-[#2A2015]">Hab. {room.numero}</span>
                    <p className="max-w-[140px] truncate text-[10px] text-[#6E5D47]">{rt?.nombre}</p>
                  </td>
                  {AMENITY_COLUMNS.map((am) => (
                    <td key={am.key} className="border-r border-[#EFE4CB] px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={room.amenities[am.key]}
                        onChange={(e) =>
                          updateRoomAmenities(room.id, {
                            ...room.amenities,
                            [am.key]: e.target.checked,
                          })
                        }
                        className="h-3.5 w-3.5 cursor-pointer accent-[#9A6E0E]"
                      />
                    </td>
                  ))}
                  {DAY_COLUMNS.map((d) => (
                    <td key={d.key} className="border-r border-[#EFE4CB] px-1.5 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        value={room.rates[rateTier][d.key]}
                        onChange={(e) =>
                          updateRoomRate(room.id, rateTier, d.key, Math.max(0, Number(e.target.value)))
                        }
                        className="w-14 rounded border border-[#DECFA8] bg-white px-1.5 py-1 text-center font-mono text-xs font-semibold text-[#2A2015] focus:border-[#B8891F] focus:outline-none tabular-nums"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
