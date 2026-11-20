import React, { useMemo, useState } from 'react';
import {
  BedDouble,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import { exportToCsv, formatCurrency, formatDateTime } from '../../utils/exportCsv';
import { addDays, toYMD } from '../../data/seedData';

interface DashboardReportesModuleProps {
  mode: 'dashboard' | 'reportes_huespedes' | 'reportes_rendimiento';
}

export const DashboardReportesModule: React.FC<DashboardReportesModuleProps> = ({ mode }) => {
  const { state, notify } = usePMS();

  // Dashboard state
  const [period, setPeriod] = useState<'DIA' | 'SEMANA' | 'MES'>('DIA');
  const [dateA, setDateA] = useState(() => toYMD(new Date()));
  const [dateB, setDateB] = useState(() => toYMD(addDays(new Date(), -1)));

  // Reportes Huespedes state
  const [showAmounts, setShowAmounts] = useState(true);
  const [staySearch, setStaySearch] = useState('');
  const [stayStatusFilter, setStayStatusFilter] = useState<'ALL' | 'ACTIVA' | 'FINALIZADA'>('ALL');

  const activeSales = useMemo(() => state.sales.filter((s) => s.status === 'ACTIVO'), [state.sales]);

  const periodSales = useMemo(() => {
    const today = new Date();
    const minDate =
      period === 'DIA'
        ? dateA
        : period === 'SEMANA'
          ? toYMD(addDays(today, -7))
          : toYMD(addDays(today, -30));
    return activeSales.filter((s) => {
      const ymd = s.fecha.slice(0, 10);
      return period === 'DIA' ? ymd === dateA : ymd >= minDate;
    });
  }, [activeSales, period, dateA]);

  const totalEfectivo = periodSales
    .filter((s) => s.metodoPago === 'EFECTIVO')
    .reduce((a, b) => a + b.monto, 0);
  const totalTarjeta = periodSales
    .filter((s) => s.metodoPago === 'TARJETA')
    .reduce((a, b) => a + b.monto, 0);
  const totalHabitaciones = periodSales
    .filter((s) => s.origenTipo === 'HABITACION')
    .reduce((a, b) => a + b.monto, 0);
  const totalProductos = periodSales
    .filter((s) => s.origenTipo === 'VENTA_LIBRE' || s.descripcion.toLowerCase().includes('consumo'))
    .reduce((a, b) => a + b.monto, 0);

  // Hourly Chart Points (0..23)
  const hourlySeries = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, amountA: 0, amountB: 0 }));
    activeSales.forEach((s) => {
      const ymd = s.fecha.slice(0, 10);
      const hr = new Date(s.fecha).getHours();
      if (Number.isNaN(hr) || hr < 0 || hr > 23) return;
      if (ymd === dateA) hours[hr].amountA += s.monto;
      if (ymd === dateB) hours[hr].amountB += s.monto;
    });
    return hours;
  }, [activeSales, dateA, dateB]);

  const maxHourly = Math.max(
    100,
    ...hourlySeries.map((h) => Math.max(h.amountA, h.amountB))
  );

  const svgWidth = 860;
  const svgHeight = 230;
  const padX = 36;
  const padY = 20;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padY * 2;

  const pointsA = hourlySeries
    .map((h, i) => {
      const x = padX + (i / 23) * plotW;
      const y = padY + plotH - (h.amountA / maxHourly) * plotH;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPathA =
    `M ${padX},${padY + plotH} ` +
    hourlySeries
      .map((h, i) => {
        const x = padX + (i / 23) * plotW;
        const y = padY + plotH - (h.amountA / maxHourly) * plotH;
        return `L ${x},${y}`;
      })
      .join(' ') +
    ` L ${padX + plotW},${padY + plotH} Z`;

  const pointsB = hourlySeries
    .map((h, i) => {
      const x = padX + (i / 23) * plotW;
      const y = padY + plotH - (h.amountB / maxHourly) * plotH;
      return `${x},${y}`;
    })
    .join(' ');

  if (mode === 'dashboard') {
    const totalDateA = hourlySeries.reduce((a, b) => a + b.amountA, 0);
    const totalDateB = hourlySeries.reduce((a, b) => a + b.amountB, 0);
    const occupiedRooms = state.rooms.filter((r) => r.status === 'OCUPADO').length;
    const occRate = Math.round((occupiedRooms / Math.max(1, state.rooms.length)) * 100);

    return (
      <div className="space-y-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6E5D47]">Ventas con efectivo</span>
              <Wallet className="h-4 w-4 text-[#9A6E0E]" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[#2A2015] tabular-nums">
              {formatCurrency(totalEfectivo)}
            </p>
            <p className="mt-1 text-[11px] text-[#8D7B63]">
              Periodo: {period === 'DIA' ? dateA : period}
            </p>
          </div>

          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6E5D47]">Ventas con tarjeta</span>
              <CreditCard className="h-4 w-4 text-[#9A6E0E]" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[#2A2015] tabular-nums">
              {formatCurrency(totalTarjeta)}
            </p>
            <p className="mt-1 text-[11px] text-[#8D7B63]">POS Tarjetas Visa / Master</p>
          </div>

          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6E5D47]">Ventas en suites y habitaciones</span>
              <BedDouble className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[#2A2015] tabular-nums">
              {formatCurrency(totalHabitaciones)}
            </p>
            <p className="mt-1 text-[11px] text-[#8D7B63]">
              Ocupación actual: {occRate}% ({occupiedRooms}/{state.rooms.length})
            </p>
          </div>

          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6E5D47]">Ventas en productos</span>
              <ShoppingBag className="h-4 w-4 text-[#9A6E0E]" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[#2A2015] tabular-nums">
              {formatCurrency(totalProductos)}
            </p>
            <p className="mt-1 text-[11px] text-[#8D7B63]">Consumos y venta libre POS</p>
          </div>
        </div>

        {/* Chart + Comparison Controls */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 lg:col-span-9 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-luxury text-lg font-bold text-[#2A2015]">
                  Evolución Horaria de Ingresos (0Hs – 23Hs)
                </h3>
                <p className="text-xs text-[#6E5D47]">
                  Comparativa entre {dateA} (oro real) y {dateB} (bronce punteado)
                </p>
              </div>
              <div className="flex rounded-lg border border-[#E2D2AF] bg-[#FAF7F0] p-0.5 text-xs">
                {(['DIA', 'SEMANA', 'MES'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`rounded-md px-3 py-1 font-semibold ${
                      period === p ? 'bg-[#9A6E0E] text-white' : 'text-[#5E4A2D] hover:text-[#2A2015]'
                    }`}
                  >
                    {p === 'DIA' ? 'Día' : p === 'SEMANA' ? 'Semana' : 'Mes'}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="h-60 w-full min-w-[600px]"
                role="img"
                aria-label="Gráfico de ventas por hora"
              >
                {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
                  const y = padY + plotH * (1 - t);
                  const val = Math.round(maxHourly * t);
                  return (
                    <g key={idx}>
                      <line x1={padX} y1={y} x2={padX + plotW} y2={y} stroke="#EFE4CB" strokeWidth="1" />
                      <text x={4} y={y + 4} fontSize="10" fill="#7A684D" fontFamily="monospace">
                        {val}
                      </text>
                    </g>
                  );
                })}
                <path d={areaPathA} fill="rgba(184, 137, 31, 0.16)" />
                <polyline
                  fill="none"
                  stroke="#A8967A"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  points={pointsB}
                />
                <polyline fill="none" stroke="#9A6E0E" strokeWidth="2.5" points={pointsA} />
                {hourlySeries.map((h, i) => {
                  const x = padX + (i / 23) * plotW;
                  const yA = padY + plotH - (h.amountA / maxHourly) * plotH;
                  return (
                    <g key={h.hour}>
                      {h.amountA > 0 && (
                        <circle cx={x} cy={yA} r="3.5" fill="#9A6E0E" stroke="#FFFDF9" strokeWidth="1.5" />
                      )}
                      {i % 2 === 0 && (
                        <text
                          x={x}
                          y={svgHeight - 4}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#7A684D"
                          fontFamily="monospace"
                        >
                          {h.hour}Hs
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 lg:col-span-3 space-y-4 text-xs">
            <h4 className="font-luxury text-base font-bold text-[#2A2015]">Comparar Fechas</h4>
            <div>
              <label className="mb-1 block font-medium text-[#5E4A2D]">Primera Fecha</label>
              <input
                type="date"
                value={dateA}
                onChange={(e) => setDateA(e.target.value)}
                className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[#5E4A2D]">Segunda Fecha</label>
              <input
                type="date"
                value={dateB}
                onChange={(e) => setDateB(e.target.value)}
                className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2 font-mono"
              />
            </div>
            <div className="space-y-2 border-t border-[#EFE4CB] pt-3 tabular-nums">
              <div>
                <p className="text-[#6E5D47]">Total {dateA}</p>
                <p className="font-mono text-lg font-bold text-[#9A6E0E]">{formatCurrency(totalDateA)}</p>
              </div>
              <div>
                <p className="text-[#6E5D47]">Total {dateB}</p>
                <p className="font-mono text-base font-semibold text-[#473824]">
                  {formatCurrency(totalDateB)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown by Payment Method */}
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#7A5B14]">
            Distribución de Ingresos por Forma de Pago
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 text-xs tabular-nums">
            {state.config.paymentMethods.slice(0, 6).map((pm) => {
              const sum = periodSales
                .filter((s) => s.metodoPago === pm.nombre)
                .reduce((a, b) => a + b.monto, 0);
              return (
                <div key={pm.id} className="rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-3">
                  <p className="text-[11px] font-semibold text-[#6E5D47]">{pm.nombre}</p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#2A2015]">{formatCurrency(sum)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'reportes_huespedes') {
    const filteredStays = state.stays.filter((s) => {
      if (stayStatusFilter !== 'ALL' && s.status !== stayStatusFilter) return false;
      if (staySearch.trim()) {
        const q = staySearch.toLowerCase();
        return (
          s.guestName.toLowerCase().includes(q) ||
          s.guestDocNum.toLowerCase().includes(q) ||
          s.roomNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const totalBilled = filteredStays.reduce((a, s) => a + s.totalCargos, 0);
    const totalPending = filteredStays.reduce((a, s) => a + s.saldoPendiente, 0);

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={staySearch}
              onChange={(e) => setStaySearch(e.target.value)}
              placeholder="Buscar huésped, documento o habitación..."
              className="w-64 rounded-lg border border-slate-300 px-3 py-1.5"
            />
            <select
              value={stayStatusFilter}
              onChange={(e) => setStayStatusFilter(e.target.value as typeof stayStatusFilter)}
              className="rounded-lg border border-slate-300 px-3 py-1.5"
            >
              <option value="ALL">Todas las estadías</option>
              <option value="ACTIVA">En curso (Activas)</option>
              <option value="FINALIZADA">Finalizadas (Check-Out)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAmounts((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showAmounts ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showAmounts ? 'Ocultar montos' : 'Ver montos'}
            </button>
            <button
              onClick={() => {
                exportToCsv(
                  `libro_huespedes_${toYMD(new Date())}.csv`,
                  ['Habitación', 'Huésped', 'Documento', 'Nacionalidad', 'Entrada', 'Salida Prog.', 'Total', 'Saldo', 'Estado'],
                  filteredStays.map((s) => [
                    s.roomNumber,
                    s.guestName,
                    `${s.guestDocType} ${s.guestDocNum}`,
                    s.guestNationality,
                    s.fechaEntrada,
                    s.fechaSalidaProgramada,
                    s.totalCargos,
                    s.saldoPendiente,
                    s.status,
                  ])
                );
                notify('success', 'Libro de huéspedes exportado');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3 py-1.5 font-semibold text-white hover:bg-[#7E590A]"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#7A5B14]">
              <tr>
                <th className="px-4 py-3">Hab.</th>
                <th className="px-4 py-3">Huésped Titular</th>
                <th className="px-4 py-3">Acomp.</th>
                <th className="px-4 py-3">Entrada / Salida</th>
                <th className="px-4 py-3 w-36">Progreso Estadía</th>
                {showAmounts && <th className="px-4 py-3 text-right">Total</th>}
                {showAmounts && <th className="px-4 py-3 text-right">Saldo</th>}
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4CB]">
              {filteredStays.map((s) => {
                const startMs = new Date(s.fechaEntrada).getTime();
                const endMs = new Date(s.fechaSalidaProgramada).getTime();
                const pct =
                  s.status === 'FINALIZADA'
                    ? 100
                    : Math.min(
                        100,
                        Math.max(8, Math.round(((Date.now() - startMs) / Math.max(1, endMs - startMs)) * 100))
                      );
                return (
                  <tr key={s.id} className="hover:bg-[#FAF7F0]">
                    <td className="px-4 py-3 font-mono font-bold text-[#2A2015]">{s.roomNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#2A2015]">{s.guestName}</p>
                      <p className="font-mono text-[11px] text-[#6E5D47]">
                        {s.guestDocType} {s.guestDocNum} · {s.guestNationality}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[#5E4A2D]">
                        <Users className="h-3.5 w-3.5" />
                        {s.invitados.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#5E4A2D]">
                      <p>{formatDateTime(s.fechaEntrada)}</p>
                      <p className="text-[#8D7B63]">{formatDateTime(s.fechaSalidaProgramada)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE4CB]">
                        <div
                          className={`h-full ${s.status === 'FINALIZADA' ? 'bg-[#A8967A]' : 'bg-[#9A6E0E]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="mt-0.5 block font-mono text-[10px] text-[#8D7B63]">{pct}%</span>
                    </td>
                    {showAmounts && (
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                        {formatCurrency(s.totalCargos)}
                      </td>
                    )}
                    {showAmounts && (
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold tabular-nums ${
                          s.saldoPendiente > 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(s.saldoPendiente)}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          s.status === 'ACTIVA'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700 tabular-nums">
            <span>Total registros: {filteredStays.length}</span>
            {showAmounts && (
              <div className="flex items-center gap-6">
                <span>
                  Facturado: <strong className="font-mono text-slate-900">{formatCurrency(totalBilled)}</strong>
                </span>
                <span>
                  Por Cobrar: <strong className="font-mono text-red-600">{formatCurrency(totalPending)}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // REPORTES RENDIMIENTO POR HABITACIÓN
  const ranking = useMemo(() => {
    return state.rooms
      .map((room) => {
        const rt = state.roomTypes.find((t) => t.id === room.roomTypeId);
        const roomStays = state.stays.filter((s) => s.roomId === room.id);
        const rotConPago = roomStays.filter((s) => !s.esCortesia).length;
        const rotSinPago = roomStays.filter((s) => s.esCortesia).length;
        const ingresos = roomStays.reduce((a, s) => a + s.totalCargos, 0);
        return {
          room,
          tipo: rt?.nombre || 'HABITACION',
          rotConPago,
          rotSinPago,
          totalRot: rotConPago + rotSinPago,
          ingresos,
        };
      })
      .sort((a, b) => b.ingresos - a.ingresos || b.totalRot - a.totalRot);
  }, [state.rooms, state.roomTypes, state.stays]);

  const maxRev = Math.max(100, ...ranking.map((r) => r.ingresos));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Ranking de Rendimiento por Habitación</h2>
          <p className="text-xs text-slate-500">
            Rotaciones con pago vs cortesías e ingresos acumulados por habitación.
          </p>
        </div>
        <button
          onClick={() => {
            exportToCsv(
              `rendimiento_habitaciones_${toYMD(new Date())}.csv`,
              ['Habitación', 'Tipo', 'Rotaciones Pago', 'Cortesías', 'Total Rotaciones', 'Ingresos S/'],
              ranking.map((r) => [
                r.room.numero,
                r.tipo,
                r.rotConPago,
                r.rotSinPago,
                r.totalRot,
                r.ingresos,
              ])
            );
            notify('success', 'Ranking exportado a CSV');
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </button>
      </div>

      {/* Horizontal Performance Bars */}
      <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A5B14]">
          Comparativa de Ingresos por Habitación
        </h3>
        <div className="space-y-2.5">
          {ranking.map((r) => {
            const pct = Math.round((r.ingresos / maxRev) * 100);
            return (
              <div key={r.room.id} className="grid grid-cols-12 items-center gap-3 text-xs">
                <div className="col-span-3 sm:col-span-2 font-mono font-bold text-[#2A2015]">
                  Hab. {r.room.numero}
                </div>
                <div className="col-span-6 sm:col-span-8">
                  <div className="h-5 w-full overflow-hidden rounded-md bg-[#EFE4CB]">
                    <div
                      className="h-full rounded-md bg-[#9A6E0E] transition-all"
                      style={{ width: `${Math.max(pct, r.ingresos > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-2 text-right font-mono font-bold text-[#2A2015] tabular-nums">
                  {formatCurrency(r.ingresos)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Habitación</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Con Pago</th>
              <th className="px-4 py-3 text-right">Cortesías</th>
              <th className="px-4 py-3 text-right">Total Rot.</th>
              <th className="px-4 py-3 text-right">Ingresos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ranking.map((r, idx) => (
              <tr key={r.room.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-slate-500">{idx + 1}</td>
                <td className="px-4 py-3 font-mono font-bold text-slate-900">Hab. {r.room.numero}</td>
                <td className="px-4 py-3 text-slate-600">{r.tipo}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                  {r.rotConPago}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-500">{r.rotSinPago}</td>
                <td className="px-4 py-3 text-right font-mono font-bold">{r.totalRot}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                  {formatCurrency(r.ingresos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
