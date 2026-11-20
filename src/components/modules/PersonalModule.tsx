import React, { useEffect, useState } from 'react';
import { Clock, Coffee, Download, LogIn, LogOut, Plus, UserCheck } from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type { DocType } from '../../types/pms';
import { exportToCsv } from '../../utils/exportCsv';
import { toYMD } from '../../data/seedData';

interface PersonalModuleProps {
  mode: 'personal_empleados' | 'personal_marcador' | 'personal_asistencias';
}

export const PersonalModule: React.FC<PersonalModuleProps> = ({ mode }) => {
  const { state, savePosition, saveEmployee, clockAttendance, notify } = usePMS();

  // Position & Employee form
  const [newPos, setNewPos] = useState('');
  const [empDocType, setEmpDocType] = useState<DocType>('DNI');
  const [empNumDoc, setEmpNumDoc] = useState('');
  const [empIdCard, setEmpIdCard] = useState('');
  const [empNombres, setEmpNombres] = useState('');
  const [empApellidos, setEmpApellidos] = useState('');
  const [empCargoId, setEmpCargoId] = useState(state.positions[0]?.id || '');
  const [empTel, setEmpTel] = useState('');

  // Marcador live clock
  const [nowTime, setNowTime] = useState(() => new Date());
  const [marcadorInput, setMarcadorInput] = useState('');

  // Attendance Filter
  const [attFilterDate, setAttFilterDate] = useState('');
  const [attSearch, setAttSearch] = useState('');

  useEffect(() => {
    if (mode !== 'personal_marcador') return;
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [mode]);

  if (mode === 'personal_marcador') {
    const matchedEmp = state.employees.find(
      (e) =>
        marcadorInput.trim() &&
        (e.numDoc === marcadorInput.trim() ||
          e.idCard.toLowerCase() === marcadorInput.trim().toLowerCase())
    );

    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-8 text-center space-y-4 shadow-xs">
          <div className="inline-flex items-center gap-2 rounded-lg border border-[#E2D2AF] bg-[#FBF5E6] px-3 py-1 text-xs font-semibold text-[#5C4A33]">
            <Clock className="h-3.5 w-3.5 text-[#9A6E0E]" />
            RELOJ MARCADOR DE ASISTENCIAS
          </div>
          <div className="font-mono text-5xl font-bold tracking-tight text-[#2A2015] tabular-nums">
            {nowTime.toTimeString().slice(0, 8)}
          </div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#6E5D47]">
            {nowTime.toLocaleDateString('es-PE', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <div className="mx-auto max-w-md space-y-3 pt-2">
            <input
              type="text"
              value={marcadorInput}
              onChange={(e) => setMarcadorInput(e.target.value)}
              placeholder="Ingrese DNI o ID Card (ej. 41205544 o CARD-001)"
              className="w-full rounded-xl border border-[#DECFA8] bg-white px-4 py-3 text-center font-mono text-sm font-bold focus:border-[#B8891F] focus:outline-none"
            />

            {matchedEmp && (
              <div className="rounded-xl border border-[#DECFA8] bg-[#FBF5E6] px-4 py-2.5 text-xs text-[#3A2B18]">
                <strong>
                  {matchedEmp.nombres} {matchedEmp.apellidos}
                </strong>{' '}
                · {matchedEmp.cargoNombre}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <button
                onClick={() => clockAttendance(marcadorInput, 'INGRESO')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700"
              >
                <LogIn className="h-4 w-4" />
                Ingreso
              </button>
              <button
                onClick={() => clockAttendance(marcadorInput, 'SALIDA')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700"
              >
                <LogOut className="h-4 w-4" />
                Salida
              </button>
              <button
                onClick={() => clockAttendance(marcadorInput, 'INICIO_BREAK')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2D2AF] bg-white py-2.5 font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
              >
                <Coffee className="h-4 w-4 text-amber-600" />
                Inicio Break
              </button>
              <button
                onClick={() => clockAttendance(marcadorInput, 'FIN_BREAK')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2D2AF] bg-white py-2.5 font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
              >
                <UserCheck className="h-4 w-4 text-[#9A6E0E]" />
                Fin Break
              </button>
            </div>
          </div>

          {/* Quick staff chips */}
          <div className="border-t border-slate-100 pt-4 text-xs">
            <p className="mb-2 text-[11px] font-medium text-slate-400">
              Selección rápida de colaborador:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {state.employees.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setMarcadorInput(e.numDoc)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  {e.nombres.split(' ')[0]} ({e.numDoc})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'personal_asistencias') {
    const logs = state.attendanceLogs.filter((l) => {
      if (attFilterDate && l.fecha !== attFilterDate) return false;
      if (
        attSearch.trim() &&
        !l.nombreCompleto.toLowerCase().includes(attSearch.toLowerCase()) &&
        !l.numDoc.includes(attSearch)
      ) {
        return false;
      }
      return true;
    });

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={attSearch}
              onChange={(e) => setAttSearch(e.target.value)}
              placeholder="Buscar colaborador o DNI..."
              className="rounded-lg border border-slate-300 px-3 py-1.5"
            />
            <input
              type="date"
              value={attFilterDate}
              onChange={(e) => setAttFilterDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-mono"
            />
            {attFilterDate && (
              <button
                onClick={() => setAttFilterDate('')}
                className="text-slate-500 underline"
              >
                Limpiar fecha
              </button>
            )}
          </div>
          <button
            onClick={() => {
              exportToCsv(
                `asistencias_lachuspa_${toYMD(new Date())}.csv`,
                ['Fecha', 'DNI', 'Colaborador', 'Cargo', 'Ingreso', 'Inicio Break', 'Fin Break', 'Salida'],
                logs.map((l) => [
                  l.fecha,
                  l.numDoc,
                  l.nombreCompleto,
                  l.cargoNombre,
                  l.ingreso || '-',
                  l.inicioBreak || '-',
                  l.finBreak || '-',
                  l.salida || '-',
                ])
              );
              notify('success', 'Reporte de asistencias exportado');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Ingreso</th>
                <th className="px-4 py-3">Inicio Break</th>
                <th className="px-4 py-3">Fin Break</th>
                <th className="px-4 py-3">Salida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-600">{l.fecha}</td>
                  <td className="px-4 py-3 font-mono">{l.numDoc}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{l.nombreCompleto}</td>
                  <td className="px-4 py-3 text-slate-600">{l.cargoNombre}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-emerald-700">{l.ingreso || '-'}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{l.inicioBreak || '-'}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{l.finBreak || '-'}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-red-600">{l.salida || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // PERSONAL EMPLEADOS & PUESTOS
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 lg:col-span-4 space-y-3 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E5D47]">
          Puestos / Cargos ({state.positions.length})
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newPos.trim()) return;
            savePosition(newPos.trim());
            setNewPos('');
          }}
          className="flex gap-2 text-xs"
        >
          <input
            type="text"
            value={newPos}
            onChange={(e) => setNewPos(e.target.value)}
            placeholder="Nuevo cargo..."
            className="flex-1 rounded-lg border border-[#DECFA8] px-3 py-1.5"
          />
          <button
            type="submit"
            className="rounded-lg bg-[#3A2B18] px-3 py-1.5 font-semibold text-white hover:bg-[#2A2015]"
          >
            +
          </button>
        </form>
        <div className="divide-y divide-[#EFE4CB] text-xs">
          {state.positions.map((pos) => (
            <div key={pos.id} className="flex justify-between py-2">
              <span className="font-medium text-[#2A2015]">{pos.nombre}</span>
              <span className="font-mono text-[#8B7658]">
                {state.employees.filter((e) => e.cargoId === pos.id).length}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 lg:col-span-8">
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#6E5D47]">
            Registrar Nuevo Colaborador
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!empNumDoc.trim() || !empNombres.trim()) {
                notify('error', 'Complete DNI y Nombres');
                return;
              }
              const pos = state.positions.find((p) => p.id === empCargoId);
              saveEmployee({
                tipoDoc: empDocType,
                numDoc: empNumDoc.trim(),
                idCard: empIdCard.trim() || `CARD-${Math.floor(100 + Math.random() * 899)}`,
                nombres: empNombres.toUpperCase(),
                apellidos: empApellidos.toUpperCase(),
                cargoId: empCargoId,
                cargoNombre: pos?.nombre || 'COLABORADOR',
                cumpleanos: '1995-01-01',
                telefono: empTel,
                activo: true,
              });
              setEmpNumDoc('');
              setEmpIdCard('');
              setEmpNombres('');
              setEmpApellidos('');
              setEmpTel('');
            }}
            className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3"
          >
            <select
              value={empDocType}
              onChange={(e) => setEmpDocType(e.target.value as DocType)}
              className="rounded-lg border border-slate-300 px-2.5 py-2"
            >
              <option value="DNI">DNI</option>
              <option value="CE">CARNET EXT.</option>
              <option value="PAS">PASAPORTE</option>
            </select>
            <input
              type="text"
              value={empNumDoc}
              onChange={(e) => setEmpNumDoc(e.target.value)}
              placeholder="N° Documento *"
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono"
            />
            <input
              type="text"
              value={empIdCard}
              onChange={(e) => setEmpIdCard(e.target.value)}
              placeholder="ID Card (ej. CARD-005)"
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono"
            />
            <input
              type="text"
              value={empNombres}
              onChange={(e) => setEmpNombres(e.target.value)}
              placeholder="Nombres *"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <input
              type="text"
              value={empApellidos}
              onChange={(e) => setEmpApellidos(e.target.value)}
              placeholder="Apellidos"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <select
              value={empCargoId}
              onChange={(e) => setEmpCargoId(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-2"
            >
              {state.positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={empTel}
              onChange={(e) => setEmpTel(e.target.value)}
              placeholder="Teléfono"
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono"
            />
            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#9A6E0E] py-2 font-semibold text-white hover:bg-[#7E590A]"
            >
              <Plus className="h-3.5 w-3.5" />
              Guardar Colaborador
            </button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
              <tr>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">ID Card</th>
                <th className="px-4 py-3">Nombres y Apellidos</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Teléfono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4CB]">
              {state.employees.map((e) => (
                <tr key={e.id} className="hover:bg-[#FBF6EA]/60">
                  <td className="px-4 py-3 font-mono">{e.numDoc}</td>
                  <td className="px-4 py-3 font-mono text-[#9A6E0E] font-semibold">{e.idCard}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {e.nombres} {e.apellidos}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{e.cargoNombre}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{e.telefono}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
