import React from 'react';
import { Printer, X } from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import { formatCurrency, formatDateTime } from '../../utils/exportCsv';

export interface PrintTicketData {
  tipo: 'INGRESO' | 'COMPROBANTE' | 'CIERRE_CAJA' | 'RESERVA';
  titulo: string;
  numero: string;
  fecha: string;
  cliente?: string;
  documento?: string;
  habitacion?: string;
  detalleLineas: { label: string; value: string }[];
  items?: { descripcion: string; cantidad: number; total: number }[];
  total?: number;
  incluirPoliticas?: boolean;
}

interface PrintTicketModalProps {
  ticket: PrintTicketData | null;
  onClose: () => void;
}

export const PrintTicketModal: React.FC<PrintTicketModalProps> = ({ ticket, onClose }) => {
  const { state } = usePMS();
  if (!ticket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xl">
        <div className="no-print flex items-center justify-between border-b border-[#EFE4CB] bg-[#FBF6EA] px-5 py-3.5 rounded-t-xl">
          <h3 className="text-sm font-semibold text-[#2A2015]">{ticket.titulo}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7E590A] whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 font-mono text-xs text-slate-800">
          <div className="border-b border-dashed border-slate-300 pb-4 text-center">
            <p className="text-sm font-bold tracking-wide text-slate-900">
              {state.config.nombreComercial}
            </p>
            <p className="text-[11px] text-slate-600">{state.config.razonSocial}</p>
            <p className="text-[11px] text-slate-600">RUC: {state.config.ruc}</p>
            <p className="text-[11px] text-slate-500">{state.config.direccionFiscal}</p>
            <p className="text-[11px] text-slate-500">Tel: {state.config.telefono}</p>
          </div>

          <div className="border-b border-dashed border-slate-300 py-3 text-center">
            <p className="text-xs font-bold uppercase text-slate-900">{ticket.titulo}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-700">{ticket.numero}</p>
            <p className="text-[11px] text-slate-500">{formatDateTime(ticket.fecha)}</p>
          </div>

          <div className="space-y-1.5 border-b border-dashed border-slate-300 py-3">
            {ticket.cliente && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Huésped/Cliente:</span>
                <span className="text-right font-semibold text-slate-900">{ticket.cliente}</span>
              </div>
            )}
            {ticket.documento && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Documento:</span>
                <span className="text-right text-slate-900">{ticket.documento}</span>
              </div>
            )}
            {ticket.habitacion && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Habitación:</span>
                <span className="text-right font-semibold text-slate-900">{ticket.habitacion}</span>
              </div>
            )}
            {ticket.detalleLineas.map((line, i) => (
              <div key={i} className="flex justify-between gap-3">
                <span className="text-slate-500">{line.label}:</span>
                <span className="text-right text-slate-900">{line.value}</span>
              </div>
            ))}
          </div>

          {ticket.items && ticket.items.length > 0 && (
            <div className="border-b border-dashed border-slate-300 py-3">
              <div className="mb-1.5 flex justify-between font-bold text-slate-700">
                <span>DESCRIPCIÓN</span>
                <span>IMPORTE</span>
              </div>
              <div className="space-y-1">
                {ticket.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="truncate">
                      {it.cantidad}x {it.descripcion}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatCurrency(it.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ticket.total !== undefined && (
            <div className="flex items-center justify-between border-b border-dashed border-slate-300 py-3 text-sm font-bold text-slate-900">
              <span>TOTAL</span>
              <span className="tabular-nums">{formatCurrency(ticket.total)}</span>
            </div>
          )}

          {ticket.incluirPoliticas && state.config.firmaPorIngreso && (
            <div className="mt-4 space-y-4">
              <pre className="whitespace-pre-wrap font-sans text-[10px] leading-relaxed text-slate-600">
                {state.config.politicaIngreso}
              </pre>
              <div className="pt-8 text-center">
                <div className="mx-auto w-48 border-t border-slate-400 pt-1 text-[11px] text-slate-700">
                  Firma del Huésped · {ticket.documento || 'Doc.'}
                </div>
              </div>
            </div>
          )}

          {state.config.activarQrTicket && (
            <div className="mt-4 flex flex-col items-center justify-center gap-1 pt-2 text-[10px] text-slate-500">
              <div className="grid grid-cols-5 gap-0.5 rounded border border-slate-300 p-1.5">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 ${(i * 7 + ticket.numero.length) % 2 === 0 ? 'bg-slate-900' : 'bg-white'}`}
                  />
                ))}
              </div>
              <span>Verificación electrónica · {ticket.numero}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
