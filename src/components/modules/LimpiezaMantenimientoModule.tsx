import React, { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Sparkles, Wrench, X } from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import { formatDateTime } from '../../utils/exportCsv';
import { toYMD } from '../../data/seedData';

interface LimpiezaMantenimientoModuleProps {
  mode: 'limpieza' | 'mantenimientos';
}

export const LimpiezaMantenimientoModule: React.FC<LimpiezaMantenimientoModuleProps> = ({ mode }) => {
  const {
    state,
    startCleaning,
    completeCleaning,
    createMaintenance,
    resolveMaintenance,
    activeUser,
  } = usePMS();

  const [floorFilter, setFloorFilter] = useState<'ALL' | number>('ALL');
  const [selectedStaffId, setSelectedStaffId] = useState(
    state.employees.find((e) => e.cargoNombre.includes('LIMPIEZA'))?.id || state.employees[0]?.id || ''
  );
  const [cleaningObs, setCleaningObs] = useState('');

  // Maintenance Modal
  const [showMntModal, setShowMntModal] = useState(false);
  const [mntRoomId, setMntRoomId] = useState(state.rooms[0]?.id || '');
  const [mntCat, setMntCat] = useState('GASFITERÍA / BAÑO');
  const [mntResp, setMntResp] = useState(activeUser.nombreCompleto);
  const [mntVigencia, setMntVigencia] = useState(() => toYMD(new Date()));
  const [mntObs, setMntObs] = useState('');

  const floors = useMemo(
    () => Array.from(new Set(state.rooms.map((r) => r.piso))).sort((a, b) => a - b),
    [state.rooms]
  );

  const filteredRooms = state.rooms.filter((r) => floorFilter === 'ALL' || r.piso === floorFilter);

  const handleCreateMnt = (e: React.FormEvent) => {
    e.preventDefault();
    const room = state.rooms.find((r) => r.id === mntRoomId);
    if (!room) return;
    createMaintenance({
      roomId: room.id,
      roomNumber: room.numero,
      categoria: mntCat,
      responsable: mntResp,
      observacion: mntObs || 'Revisión técnica programada.',
      inicio: new Date().toISOString().slice(0, 16).replace('T', ' '),
      vigencia: mntVigencia,
    });
    setMntObs('');
    setShowMntModal(false);
  };

  if (mode === 'limpieza') {
    const enLimpiezaCount = state.rooms.filter((r) => r.status === 'EN_LIMPIEZA').length;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
          <div>
            <h2 className="font-luxury text-lg font-bold text-[#2A2015]">Control de Limpieza de Habitaciones</h2>
            <p className="text-xs text-[#6E5D47]">
              {enLimpiezaCount} habitación(es) pendiente(s) de limpieza · Asigne camarero y marque finalización.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-[#5C4A33]">Personal asignado:</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="rounded-lg border border-[#DECFA8] bg-white px-3 py-1.5 text-xs"
            >
              {state.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombres} {e.apellidos} ({e.cargoNombre})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFloorFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
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
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                floorFilter === piso
                  ? 'bg-[#3A2B18] text-white'
                  : 'border border-[#E2D2AF] bg-[#FFFDF9] text-[#5C4A33] hover:bg-[#FBF6EA]'
              }`}
            >
              Piso {piso}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filteredRooms.map((room) => {
            const rt = state.roomTypes.find((t) => t.id === room.roomTypeId);
            const activeLog = state.cleaningLogs.find(
              (c) => c.roomId === room.id && c.estado === 'EN_PROCESO'
            );
            const isCleaning = room.status === 'EN_LIMPIEZA';
            return (
              <div
                key={room.id}
                className="flex flex-col justify-between rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 space-y-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-bold text-slate-900">Hab. {room.numero}</span>
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: state.config.coloresEstado[room.status] }}
                    >
                      {room.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{rt?.nombre}</p>
                  {activeLog && (
                    <div className="mt-2 rounded-lg bg-sky-50 p-2 text-[11px] text-sky-900">
                      <p className="font-semibold">{activeLog.staffName}</p>
                      <p className="text-sky-700">Inicio: {formatDateTime(activeLog.inicio)}</p>
                    </div>
                  )}
                </div>

                {isCleaning ? (
                  <button
                    onClick={() => completeCleaning(room.id, cleaningObs || undefined)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Terminar Limpieza
                  </button>
                ) : room.status === 'DISPONIBLE' ? (
                  <button
                    onClick={() => startCleaning(room.id, selectedStaffId, cleaningObs)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                    Enviar a Limpieza
                  </button>
                ) : (
                  <div className="rounded-lg bg-slate-50 py-2 text-center text-[11px] font-medium text-slate-400">
                    {room.status === 'OCUPADO' ? 'Habitación ocupada' : 'En mantenimiento'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Cleaning History Table */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Historial Reciente de Limpieza
            </h3>
            <input
              type="text"
              value={cleaningObs}
              onChange={(e) => setCleaningObs(e.target.value)}
              placeholder="Nota opcional para próxima limpieza..."
              className="w-64 rounded-lg border border-slate-300 px-3 py-1 text-xs"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Habitación</th>
                  <th className="px-4 py-2.5">Responsable</th>
                  <th className="px-4 py-2.5">Inicio</th>
                  <th className="px-4 py-2.5">Fin</th>
                  <th className="px-4 py-2.5">Observación</th>
                  <th className="px-4 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.cleaningLogs.slice(0, 12).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-900">Hab. {log.roomNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{log.staffName}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{formatDateTime(log.inicio)}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                      {log.fin ? formatDateTime(log.fin) : 'En curso'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{log.observacion}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          log.estado === 'COMPLETADA'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-sky-50 text-sky-700'
                        }`}
                      >
                        {log.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // MANTENIMIENTOS
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
        <div>
          <h2 className="font-luxury text-lg font-bold text-[#2A2015]">Registro de Mantenimientos</h2>
          <p className="text-xs text-[#6E5D47]">
            Al registrar un mantenimiento activo, la habitación pasa automáticamente a estado Mantenimiento y se bloquea en recepción.
          </p>
        </div>
        <button
          onClick={() => setShowMntModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#7E590A]"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo Mantenimiento
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
            <tr>
              <th className="px-4 py-3">Habitación</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Responsable</th>
              <th className="px-4 py-3">Inicio / Vigencia</th>
              <th className="px-4 py-3">Detalle / Observación</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.maintenanceRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Sin registros de mantenimiento.
                </td>
              </tr>
            ) : (
              state.maintenanceRecords.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">Hab. {m.roomNumber}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{m.categoria}</td>
                  <td className="px-4 py-3 text-slate-700">{m.responsable}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                    {m.inicio} · Vig: {m.vigencia}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.observacion}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        m.estado === 'ACTIVO'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {m.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.estado === 'ACTIVO' ? (
                      <button
                        onClick={() => resolveMaintenance(m.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-[#9A6E0E] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#7E590A]"
                      >
                        <Wrench className="h-3 w-3" />
                        Finalizar y Habilitar
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">Resuelto</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showMntModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Registrar Mantenimiento</h3>
              <button onClick={() => setShowMntModal(false)} className="text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMnt} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Habitación</label>
                <select
                  value={mntRoomId}
                  onChange={(e) => setMntRoomId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {state.rooms
                    .filter((r) => r.status !== 'OCUPADO')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Hab. {r.numero} ({r.status})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Categoría</label>
                <select
                  value={mntCat}
                  onChange={(e) => setMntCat(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="GASFITERÍA / BAÑO">GASFITERÍA / BAÑO</option>
                  <option value="ELECTRICIDAD / TV">ELECTRICIDAD / TV</option>
                  <option value="PINTURA / ACABADOS">PINTURA / ACABADOS</option>
                  <option value="CARPINTERÍA / CERRADURA">CARPINTERÍA / CERRADURA</option>
                  <option value="LIMPIEZA PROFUNDA">LIMPIEZA PROFUNDA</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Responsable</label>
                  <input
                    type="text"
                    value={mntResp}
                    onChange={(e) => setMntResp(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Vigencia Est.</label>
                  <input
                    type="date"
                    value={mntVigencia}
                    onChange={(e) => setMntVigencia(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Observación</label>
                <textarea
                  rows={2}
                  value={mntObs}
                  onChange={(e) => setMntObs(e.target.value)}
                  placeholder="Describir falla o trabajo técnico..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMntModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-semibold text-white hover:bg-[#7E590A]"
                >
                  Guardar Mantenimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
