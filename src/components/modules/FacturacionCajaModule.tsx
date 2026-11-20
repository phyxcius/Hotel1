import React, { useMemo, useState } from 'react';
import {
  Ban,
  Building,
  CheckCircle2,
  Download,
  Lock,
  Plus,
  Printer,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type {
  PaymentMethodName,
  SaleRecord,
  VoucherType,
  WarehouseArea,
} from '../../types/pms';
import { exportToCsv, formatCurrency, formatDateTime } from '../../utils/exportCsv';
import { toYMD } from '../../data/seedData';
import { PrintTicketModal, type PrintTicketData } from '../common/PrintTicketModal';

interface FacturacionCajaModuleProps {
  mode: 'facturacion' | 'caja_gastos' | 'caja_bancos';
}

type FacturacionTab =
  | 'VENTAS'
  | 'CIERRE'
  | 'CAMBIOS'
  | 'LIMPIEZA'
  | 'RESERVAS'
  | 'ANULADOS'
  | 'CORTESIAS'
  | 'COBRANZA';

export const FacturacionCajaModule: React.FC<FacturacionCajaModuleProps> = ({ mode }) => {
  const {
    state,
    activeShiftName,
    activeUser,
    voidSale,
    closeCashRegister,
    payStayBalance,
    registerExpense,
    registerBankDeposit,
    notify,
  } = usePMS();

  const [tab, setTab] = useState<FacturacionTab>('VENTAS');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethodName>('ALL');
  const [printTicket, setPrintTicket] = useState<PrintTicketData | null>(null);

  // Void Modal
  const [voidTarget, setVoidTarget] = useState<SaleRecord | null>(null);
  const [voidMotivo, setVoidMotivo] = useState('');
  const [voidAuthCode, setVoidAuthCode] = useState('');

  // Cash Register Close Form
  const [efectivoContado, setEfectivoContado] = useState(0);
  const [cierreObs, setCierreObs] = useState('');

  // Cobranza Modal
  const [cobroStayId, setCobroStayId] = useState<string | null>(null);
  const [cobroMonto, setCobroMonto] = useState(0);
  const [cobroMetodo, setCobroMetodo] = useState<PaymentMethodName>('EFECTIVO');
  const [cobroVoucher, setCobroVoucher] = useState<VoucherType>('BOLETA');

  // Expense Form State
  const [expFecha, setExpFecha] = useState(() => toYMD(new Date()));
  const [expSalidaDe, setExpSalidaDe] = useState<WarehouseArea | 'RECEPCION'>('RECEPCION');
  const [expAreaTipo, setExpAreaTipo] = useState('INSUMOS / LIMPIEZA');
  const [expPago, setExpPago] = useState<PaymentMethodName>('EFECTIVO');
  const [expMonto, setExpMonto] = useState(0);
  const [expEmpresa, setExpEmpresa] = useState('');
  const [expDetalle, setExpDetalle] = useState('');

  // Bank Deposit Form State
  const [depBanco, setDepBanco] = useState('BCP SOLES');
  const [depNumOp, setDepNumOp] = useState('');
  const [depMontoEnv, setDepMontoEnv] = useState(0);
  const [depMontoDep, setDepMontoDep] = useState(0);
  const [depEmisor, setDepEmisor] = useState(activeUser.nombreCompleto);

  const activeSales = useMemo(
    () => state.sales.filter((s) => s.status === 'ACTIVO'),
    [state.sales]
  );
  const voidedSales = useMemo(
    () => state.sales.filter((s) => s.status === 'ANULADO'),
    [state.sales]
  );

  const filteredSales = useMemo(() => {
    return activeSales.filter((s) => {
      if (methodFilter !== 'ALL' && s.metodoPago !== methodFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.comprobante.toLowerCase().includes(q) ||
          s.guestName.toLowerCase().includes(q) ||
          s.descripcion.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeSales, methodFilter, search]);

  // Shift totals for Cierre de Caja
  const shiftSales = activeSales.filter((s) => s.turno === activeShiftName);
  const sumEfectivo = shiftSales.filter((s) => s.metodoPago === 'EFECTIVO').reduce((a, b) => a + b.monto, 0);
  const sumTarjeta = shiftSales.filter((s) => s.metodoPago === 'TARJETA').reduce((a, b) => a + b.monto, 0);
  const sumYapePlin = shiftSales
    .filter((s) => s.metodoPago === 'YAPE' || s.metodoPago === 'PLIN')
    .reduce((a, b) => a + b.monto, 0);
  const sumTransf = shiftSales.filter((s) => s.metodoPago === 'TRANSFERENCIA').reduce((a, b) => a + b.monto, 0);
  const sumAgencia = shiftSales
    .filter((s) => s.metodoPago === 'AGENCIA' || s.metodoPago === 'AGENCIAS X PAGAR')
    .reduce((a, b) => a + b.monto, 0);
  const sumGastosEfectivo = state.expenses
    .filter((e) => e.tipoPago === 'EFECTIVO')
    .reduce((a, b) => a + b.monto, 0);
  const efectivoEsperado = Math.max(0, sumEfectivo - sumGastosEfectivo);

  const pendingCollectionStays = state.stays.filter((s) => s.saldoPendiente > 0);
  const roomChanges = state.stays.filter((s) => s.observaciones.includes('[Cambio de Hab.'));
  const courtesyStays = state.stays.filter((s) => s.esCortesia);

  const handleConfirmVoid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget) return;
    if (!voidMotivo.trim()) {
      notify('error', 'Ingrese el motivo de anulación');
      return;
    }
    const ok = voidSale(voidTarget.id, voidMotivo.trim(), voidAuthCode.trim());
    if (ok) {
      setVoidTarget(null);
      setVoidMotivo('');
      setVoidAuthCode('');
    }
  };

  const handleCloseCash = (e: React.FormEvent) => {
    e.preventDefault();
    closeCashRegister(efectivoContado, cierreObs);
    setPrintTicket({
      tipo: 'CIERRE_CAJA',
      titulo: 'REPORTE DE CIERRE DE CAJA',
      numero: `CC-${Date.now().toString().slice(-6)}`,
      fecha: new Date().toISOString(),
      cliente: activeUser.nombreCompleto,
      detalleLineas: [
        { label: 'Turno', value: activeShiftName },
        { label: 'Efectivo Sistema', value: formatCurrency(sumEfectivo) },
        { label: 'Gastos Efectivo', value: formatCurrency(sumGastosEfectivo) },
        { label: 'Efectivo Esperado', value: formatCurrency(efectivoEsperado) },
        { label: 'Efectivo Contado', value: formatCurrency(efectivoContado) },
        { label: 'Diferencia', value: formatCurrency(efectivoContado - efectivoEsperado) },
        { label: 'Tarjeta', value: formatCurrency(sumTarjeta) },
        { label: 'Yape / Plin', value: formatCurrency(sumYapePlin) },
        { label: 'Transferencias', value: formatCurrency(sumTransf) },
      ],
      total: efectivoContado + sumTarjeta + sumYapePlin + sumTransf,
    });
    setCierreObs('');
  };

  if (mode === 'caja_gastos') {
    const totalGastos = state.expenses.reduce((a, b) => a + b.monto, 0);
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Registro de Gastos Operativos</h2>
              <p className="text-xs text-slate-500">
                Los egresos en efectivo se descuentan automáticamente del efectivo esperado en el Cierre de Caja.
              </p>
            </div>
            <div className="text-right tabular-nums">
              <p className="text-[11px] text-slate-500">Total Gastos Acumulados</p>
              <p className="font-mono text-base font-bold text-red-600">{formatCurrency(totalGastos)}</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (expMonto <= 0 || !expDetalle.trim()) {
                notify('error', 'Complete monto y detalle del gasto');
                return;
              }
              registerExpense({
                fecha: expFecha,
                salidaDe: expSalidaDe,
                sede: 'MACHUPICCHU',
                areaTipo: expAreaTipo,
                tipoPago: expPago,
                monto: expMonto,
                empresaPersona: expEmpresa || 'PROVEEDOR VARIOS',
                detalle: expDetalle.toUpperCase(),
              });
              setExpMonto(0);
              setExpEmpresa('');
              setExpDetalle('');
            }}
            className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-6"
          >
            <div>
              <label className="mb-1 block font-medium text-slate-600">Fecha</label>
              <input
                type="date"
                value={expFecha}
                onChange={(e) => setExpFecha(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-600">Caja / Área</label>
              <select
                value={expSalidaDe}
                onChange={(e) => setExpSalidaDe(e.target.value as WarehouseArea | 'RECEPCION')}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
              >
                <option value="RECEPCION">CAJA RECEPCIÓN</option>
                <option value="ALMACEN_PRINCIPAL">ALMACÉN PRINCIPAL</option>
                <option value="LIMPIEZA">LIMPIEZA</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-600">Categoría</label>
              <select
                value={expAreaTipo}
                onChange={(e) => setExpAreaTipo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
              >
                <option value="INSUMOS / LIMPIEZA">INSUMOS / LIMPIEZA</option>
                <option value="SERVICIOS BÁSICOS">SERVICIOS BÁSICOS</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                <option value="MOVILIDAD / TRANSPORTE">MOVILIDAD / TRANSPORTE</option>
                <option value="PLANILLA / ADELANTO">PLANILLA / ADELANTO</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-600">Forma Pago</label>
              <select
                value={expPago}
                onChange={(e) => setExpPago(e.target.value as PaymentMethodName)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
              >
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                <option value="YAPE">YAPE</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-600">Empresa / Persona</label>
              <input
                type="text"
                value={expEmpresa}
                onChange={(e) => setExpEmpresa(e.target.value)}
                placeholder="Proveedor o receptor"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-600">Monto (S/)</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={expMonto}
                onChange={(e) => setExpMonto(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono font-bold"
              />
            </div>
            <div className="sm:col-span-5">
              <input
                type="text"
                value={expDetalle}
                onChange={(e) => setExpDetalle(e.target.value)}
                placeholder="Descripción detallada del gasto..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#3A2B18] py-2 font-semibold text-white hover:bg-[#2A2015]"
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar Gasto
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Origen / Área</th>
                <th className="px-4 py-3">Empresa / Persona</th>
                <th className="px-4 py-3">Detalle</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.expenses.map((ex) => (
                <tr key={ex.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-600">{ex.fecha}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{ex.salidaDe}</span>
                    <p className="text-[11px] text-slate-400">{ex.areaTipo}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{ex.empresaPersona}</td>
                  <td className="px-4 py-3 text-slate-600">{ex.detalle}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{ex.tipoPago}</td>
                  <td className="px-4 py-3 text-slate-500">{ex.responsable}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-red-600 tabular-nums">
                    {formatCurrency(ex.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (mode === 'caja_bancos') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">Bancos y Depósitos de Efectivo</h2>
          <p className="mb-4 text-xs text-slate-500">
            Registro de remesas de efectivo recaudado hacia cuentas bancarias del hotel.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (depMontoDep <= 0 || !depNumOp.trim()) {
                notify('error', 'Ingrese banco, número de operación y monto depositado');
                return;
              }
              const todayYmd = toYMD(new Date());
              registerBankDeposit({
                dniResponsable: '41205544',
                nombreResponsable: activeUser.nombreCompleto,
                nombreEmisor: depEmisor,
                montoEnviado: depMontoEnv || depMontoDep,
                fechaEmision: todayYmd,
                banco: depBanco,
                fechaDeposito: todayYmd,
                numOperacion: depNumOp.trim(),
                montoDepositado: depMontoDep,
              });
              setDepNumOp('');
              setDepMontoEnv(0);
              setDepMontoDep(0);
            }}
            className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-5"
          >
            <div>
              <label className="mb-1 block font-medium text-slate-600">Banco Destino</label>
              <select
                value={depBanco}
                onChange={(e) => setDepBanco(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
              >
                <option value="BCP SOLES">BCP SOLES</option>
                <option value="BBVA CONTINENTAL">BBVA CONTINENTAL</option>
                <option value="INTERBANK">INTERBANK</option>
                <option value="SCOTIABANK">SCOTIABANK</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-600">N° Operación / Voucher</label>
              <input
                type="text"
                value={depNumOp}
                onChange={(e) => setDepNumOp(e.target.value)}
                placeholder="Ej. 0084921"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-600">Emisor</label>
              <input
                type="text"
                value={depEmisor}
                onChange={(e) => setDepEmisor(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-600">Monto Enviado (S/)</label>
              <input
                type="number"
                min={0}
                value={depMontoEnv}
                onChange={(e) => setDepMontoEnv(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-600">Monto Depositado (S/)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={depMontoDep}
                  onChange={(e) => setDepMontoDep(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono font-bold"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-[#9A6E0E] px-4 py-2 font-semibold text-white hover:bg-[#7E590A]"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
              <tr>
                <th className="px-4 py-3">N° Envío</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Banco</th>
                <th className="px-4 py-3">N° Operación</th>
                <th className="px-4 py-3">Responsable / Emisor</th>
                <th className="px-4 py-3 text-right">Enviado</th>
                <th className="px-4 py-3 text-right">Depositado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4CB]">
              {state.bankDeposits.map((d) => (
                <tr key={d.id} className="hover:bg-[#FBF6EA]/60">
                  <td className="px-4 py-3 font-mono font-bold text-[#9A6E0E]">#{d.numEnvio}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{d.fechaDeposito}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 inline-flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    {d.banco}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{d.numOperacion}</td>
                  <td className="px-4 py-3 text-slate-700">{d.nombreEmisor}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(d.montoEnviado)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(d.montoDepositado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // FACTURACION & CIERRE DE CAJA
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'VENTAS', label: 'Resumen Ventas' },
            { id: 'CIERRE', label: 'Cierre de Caja' },
            { id: 'COBRANZA', label: `Cobranza (${pendingCollectionStays.length})` },
            { id: 'CAMBIOS', label: 'Cambios de Hab.' },
            { id: 'LIMPIEZA', label: 'Reg. Limpieza' },
            { id: 'RESERVAS', label: 'Inf. Reservas' },
            { id: 'ANULADOS', label: `Anulados (${voidedSales.length})` },
            { id: 'CORTESIAS', label: `Cortesías (${courtesyStays.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as FacturacionTab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-[#3A2B18] text-white'
                  : 'text-[#5C4A33] hover:bg-[#FBF6EA] hover:text-[#2A2015]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            exportToCsv(
              `ventas_facturacion_${toYMD(new Date())}.csv`,
              ['Fecha', 'Comprobante', 'Tipo', 'Cliente', 'Descripción', 'Pago', 'Turno', 'Monto', 'Estado'],
              filteredSales.map((s) => [
                s.fecha,
                s.comprobante,
                s.voucherType,
                s.guestName,
                s.descripcion,
                s.metodoPago,
                s.turno,
                s.monto,
                s.status,
              ])
            );
            notify('success', 'Reporte exportado a CSV');
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </button>
      </div>

      {tab === 'VENTAS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por comprobante, huésped o descripción..."
                className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as typeof methodFilter)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            >
              <option value="ALL">Todos los métodos de pago</option>
              {state.config.paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.nombre}>
                  {pm.nombre}
                </option>
              ))}
            </select>
            <div className="text-xs font-semibold text-[#5C4A33] tabular-nums">
              Total listado:{' '}
              <span className="font-mono text-sm font-bold text-[#9A6E0E]">
                {formatCurrency(filteredSales.reduce((a, b) => a + b.monto, 0))}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Comprobante</th>
                  <th className="px-4 py-3">Cliente / Hab.</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Pago / Turno</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {formatDateTime(s.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-slate-900">{s.comprobante}</span>
                      <p className="text-[10px] text-slate-400">{s.voucherType}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{s.guestName}</p>
                      {s.roomNumber && <p className="text-[11px] text-slate-400">Hab. {s.roomNumber}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.descripcion}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{s.metodoPago}</span>
                      <p className="text-[11px] text-slate-400">{s.turno}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(s.monto)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setPrintTicket({
                              tipo: 'COMPROBANTE',
                              titulo: `${s.voucherType} DE VENTA`,
                              numero: s.comprobante,
                              fecha: s.fecha,
                              cliente: s.guestName,
                              documento: s.guestDoc,
                              habitacion: s.roomNumber ? `Hab. ${s.roomNumber}` : undefined,
                              detalleLineas: [
                                { label: 'Concepto', value: s.descripcion },
                                { label: 'Método Pago', value: s.metodoPago },
                                { label: 'Turno', value: s.turno },
                              ],
                              total: s.monto,
                            })
                          }
                          className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                          title="Imprimir"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setVoidTarget(s)}
                          className="rounded border border-slate-200 p-1.5 text-red-600 hover:bg-red-50"
                          title="Anular comprobante"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'CIERRE' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 lg:col-span-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#EFE4CB] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#2A2015]">Arqueo y Cierre de Turno</h3>
                <p className="text-xs text-[#6E5D47]">
                  Turno activo: <strong>{activeShiftName}</strong> · {activeUser.username}
                </p>
              </div>
              <Wallet className="h-5 w-5 text-[#9A6E0E]" />
            </div>
            <div className="space-y-2 text-xs tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-500">Ingresos Efectivo ({activeShiftName}):</span>
                <span className="font-mono font-semibold">{formatCurrency(sumEfectivo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Egresos / Gastos en Efectivo:</span>
                <span className="font-mono font-semibold text-red-600">
                  - {formatCurrency(sumGastosEfectivo)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#EFE4CB] pt-2 font-bold">
                <span className="text-[#2A2015]">Efectivo Esperado en Caja:</span>
                <span className="font-mono text-[#9A6E0E]">{formatCurrency(efectivoEsperado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tarjeta:</span>
                <span className="font-mono">{formatCurrency(sumTarjeta)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Yape / Plin:</span>
                <span className="font-mono">{formatCurrency(sumYapePlin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transferencias:</span>
                <span className="font-mono">{formatCurrency(sumTransf)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Agencias / Crédito:</span>
                <span className="font-mono">{formatCurrency(sumAgencia)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseCash} className="space-y-3 border-t border-slate-200 pt-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Efectivo Físico Contado (S/)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Observaciones del Turno</label>
                <input
                  type="text"
                  value={cierreObs}
                  onChange={(e) => setCierreObs(e.target.value)}
                  placeholder="Novedades de caja o entregas..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#3A2B18] py-2.5 font-semibold text-white hover:bg-[#2A2015]"
              >
                <Lock className="h-4 w-4" />
                Cerrar Caja e Imprimir Ticket
              </button>
            </form>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white lg:col-span-7">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-xs font-bold uppercase text-slate-600">Historial de Cierres</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Turno</th>
                  <th className="px-4 py-2.5">Resp.</th>
                  <th className="px-4 py-2.5 text-right">Esperado</th>
                  <th className="px-4 py-2.5 text-right">Contado</th>
                  <th className="px-4 py-2.5 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.cashCloses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                      {formatDateTime(c.fechaCierre)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{c.turno}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.responsable}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {formatCurrency(c.totalEfectivoEsperado)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums">
                      {formatCurrency(c.efectivoContado)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono font-bold tabular-nums ${
                        c.diferencia < 0 ? 'text-red-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatCurrency(c.diferencia)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'COBRANZA' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Habitación</th>
                <th className="px-4 py-3">Huésped / Agencia</th>
                <th className="px-4 py-3">Estado Estadía</th>
                <th className="px-4 py-3 text-right">Total Cargos</th>
                <th className="px-4 py-3 text-right">Pagado</th>
                <th className="px-4 py-3 text-right">Saldo Pendiente</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingCollectionStays.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No existen cuentas por cobrar pendientes.
                  </td>
                </tr>
              ) : (
                pendingCollectionStays.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">Hab. {s.roomNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{s.guestName}</p>
                      {s.agencyName && <p className="text-[11px] text-[#9A6E0E]">{s.agencyName}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.status}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(s.totalCargos)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700 tabular-nums">
                      {formatCurrency(s.totalPagado)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-600 tabular-nums">
                      {formatCurrency(s.saldoPendiente)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setCobroStayId(s.id);
                          setCobroMonto(s.saldoPendiente);
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-[#9A6E0E] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#7E590A]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Liquidar Saldo
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'CAMBIOS' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Habitación Actual</th>
                <th className="px-4 py-3">Huésped</th>
                <th className="px-4 py-3">Detalle de Cambio</th>
                <th className="px-4 py-3">Fecha Ingreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roomChanges.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    No se han registrado cambios de habitación.
                  </td>
                </tr>
              ) : (
                roomChanges.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono font-bold">Hab. {s.roomNumber}</td>
                    <td className="px-4 py-3 font-semibold">{s.guestName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.observaciones}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{formatDateTime(s.fechaEntrada)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'LIMPIEZA' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Habitación</th>
                <th className="px-4 py-3">Personal</th>
                <th className="px-4 py-3">Inicio</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.cleaningLogs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-mono font-bold">Hab. {l.roomNumber}</td>
                  <td className="px-4 py-3">{l.staffName}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">{formatDateTime(l.inicio)}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">{l.fin ? formatDateTime(l.fin) : '-'}</td>
                  <td className="px-4 py-3 font-semibold">{l.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'RESERVAS' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Localizador</th>
                <th className="px-4 py-3">Hab.</th>
                <th className="px-4 py-3">Huésped</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Adelanto</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.reservations.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono font-bold text-[#9A6E0E]">{r.localizador}</td>
                  <td className="px-4 py-3 font-mono font-bold">{r.roomNumber}</td>
                  <td className="px-4 py-3 font-semibold">{r.guestName}</td>
                  <td className="px-4 py-3">{r.origen}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.total)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatCurrency(r.adelanto)}</td>
                  <td className="px-4 py-3 font-semibold">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'ANULADOS' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Motivo Anulación</th>
                <th className="px-4 py-3 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {voidedSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No existen movimientos anulados.
                  </td>
                </tr>
              ) : (
                voidedSales.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono font-bold text-red-600">{s.comprobante}</td>
                    <td className="px-4 py-3 font-semibold">{s.guestName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.descripcion}</td>
                    <td className="px-4 py-3 text-red-700">{s.motivoAnulacion || 'Sin motivo'}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(s.monto)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'CORTESIAS' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Habitación</th>
                <th className="px-4 py-3">Huésped</th>
                <th className="px-4 py-3">Entrada</th>
                <th className="px-4 py-3">Observaciones</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courtesyStays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No hay estadías registradas como cortesía.
                  </td>
                </tr>
              ) : (
                courtesyStays.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono font-bold">Hab. {s.roomNumber}</td>
                    <td className="px-4 py-3 font-semibold">{s.guestName}</td>
                    <td className="px-4 py-3 font-mono text-[11px]">{formatDateTime(s.fechaEntrada)}</td>
                    <td className="px-4 py-3 text-slate-600">{s.observaciones}</td>
                    <td className="px-4 py-3 font-semibold">{s.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VOID SALE MODAL */}
      {voidTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Anular {voidTarget.comprobante}</h3>
              <button onClick={() => setVoidTarget(null)} className="text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmVoid} className="mt-4 space-y-3">
              <p className="text-slate-600">
                Cliente: <strong>{voidTarget.guestName}</strong> · Monto:{' '}
                <strong className="font-mono">{formatCurrency(voidTarget.monto)}</strong>
              </p>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Motivo de Anulación *</label>
                <input
                  type="text"
                  value={voidMotivo}
                  onChange={(e) => setVoidMotivo(e.target.value)}
                  placeholder="Error de digitación, cambio de comprobante..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              {state.config.requiereCodigoAutorizacion && (
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Código de Autorización (Supervisor)
                  </label>
                  <input
                    type="password"
                    value={voidAuthCode}
                    onChange={(e) => setVoidAuthCode(e.target.value)}
                    placeholder="Ingrese código de autorización"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidTarget(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                >
                  Confirmar Anulación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COBRANZA SETTLE MODAL */}
      {cobroStayId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Registrar Cobranza</h3>
              <button onClick={() => setCobroStayId(null)} className="text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Monto a Cobrar (S/)</label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={cobroMonto}
                  onChange={(e) => setCobroMonto(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Forma de Pago</label>
                  <select
                    value={cobroMetodo}
                    onChange={(e) => setCobroMetodo(e.target.value as PaymentMethodName)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
                  >
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="TARJETA">TARJETA</option>
                    <option value="YAPE">YAPE</option>
                    <option value="PLIN">PLIN</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Comprobante</label>
                  <select
                    value={cobroVoucher}
                    onChange={(e) => setCobroVoucher(e.target.value as VoucherType)}
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
                  onClick={() => setCobroStayId(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    payStayBalance(cobroStayId, cobroMonto, cobroMetodo, cobroVoucher);
                    setCobroStayId(null);
                  }}
                  className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-semibold text-white hover:bg-[#7E590A]"
                >
                  Confirmar Cobro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PrintTicketModal ticket={printTicket} onClose={() => setPrintTicket(null)} />
    </div>
  );
};
