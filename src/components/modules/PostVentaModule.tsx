import React, { useMemo, useState } from 'react';
import { Minus, Plus, Receipt, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type { PaymentMethodName, VoucherType, WarehouseArea } from '../../types/pms';
import { formatCurrency } from '../../utils/exportCsv';
import { PrintTicketModal, type PrintTicketData } from '../common/PrintTicketModal';

interface CartItem {
  productId: string;
  descripcion: string;
  precioUnitario: number;
  cantidad: number;
}

export const PostVentaModule: React.FC = () => {
  const { state, createDirectSale, notify } = usePMS();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [area, setArea] = useState<WarehouseArea>('RECEPCION');
  const [targetType, setTargetType] = useState<'LIBRE' | 'HABITACION'>('LIBRE');
  const [targetRoomId, setTargetRoomId] = useState(
    state.rooms.find((r) => r.status === 'OCUPADO')?.id || ''
  );
  const [guestName, setGuestName] = useState('CLIENTE MOSTRADOR');
  const [guestDoc, setGuestDoc] = useState('');
  const [metodoPago, setMetodoPago] = useState<PaymentMethodName>('EFECTIVO');
  const [voucherType, setVoucherType] = useState<VoucherType>('TICKET');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [printTicket, setPrintTicket] = useState<PrintTicketData | null>(null);

  const occupiedRooms = state.rooms.filter((r) => r.status === 'OCUPADO');

  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
      if (!p.activo) return false;
      if (catFilter !== 'ALL' && p.categoryId !== catFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.descripcion.toLowerCase().includes(q) ||
          p.codigoBarra.toLowerCase().includes(q) ||
          p.categoriaNombre.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.products, catFilter, search]);

  const addToCart = (prodId: string) => {
    const prod = state.products.find((p) => p.id === prodId);
    if (!prod) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === prodId);
      if (existing) {
        return prev.map((i) =>
          i.productId === prodId ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          descripcion: prod.descripcion,
          precioUnitario: prod.precio,
          cantidad: 1,
        },
      ];
    });
  };

  const updateCartQty = (prodId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === prodId ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0)
    );
  };

  const updateCartPrice = (prodId: string, price: number) => {
    setCart((prev) =>
      prev.map((i) => (i.productId === prodId ? { ...i, precioUnitario: Math.max(0, price) } : i))
    );
  };

  const total = cart.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      notify('warning', 'Agregue al menos un producto al carrito');
      return;
    }
    if (targetType === 'HABITACION' && !targetRoomId) {
      notify('error', 'Seleccione una habitación ocupada');
      return;
    }

    const selectedRoom = state.rooms.find((r) => r.id === targetRoomId);
    const activeStay = selectedRoom?.currentStayId
      ? state.stays.find((s) => s.id === selectedRoom.currentStayId)
      : undefined;

    const sale = createDirectSale({
      items: cart,
      guestName: targetType === 'HABITACION' && activeStay ? activeStay.guestName : guestName,
      guestDoc: targetType === 'HABITACION' && activeStay ? activeStay.guestDocNum : guestDoc,
      metodoPago,
      voucherType,
      area,
      roomId: targetType === 'HABITACION' ? targetRoomId : undefined,
    });

    if (state.config.imprimirComprobantes) {
      setPrintTicket({
        tipo: 'COMPROBANTE',
        titulo: `${voucherType} DE VENTA POS`,
        numero: sale?.comprobante || `${voucherType.slice(0, 2)}-POS`,
        fecha: new Date().toISOString(),
        cliente: targetType === 'HABITACION' && activeStay ? activeStay.guestName : guestName,
        documento: targetType === 'HABITACION' && activeStay ? activeStay.guestDocNum : guestDoc,
        habitacion: selectedRoom && targetType === 'HABITACION' ? `Hab. ${selectedRoom.numero}` : 'Venta Libre',
        detalleLineas: [
          { label: 'Área Despacho', value: area },
          { label: 'Forma de Pago', value: metodoPago },
        ],
        items: cart.map((c) => ({
          descripcion: c.descripcion,
          cantidad: c.cantidad,
          total: c.cantidad * c.precioUnitario,
        })),
        total,
      });
    }
    setCart([]);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Product Catalog */}
      <div className="space-y-4 lg:col-span-8">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8B7658]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto o escanear código de barra..."
              className="w-full rounded-lg border border-[#DECFA8] pl-8 pr-3 py-1.5 text-xs focus:border-[#B8891F] focus:outline-none"
            />
          </div>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value as WarehouseArea)}
            className="rounded-lg border border-[#DECFA8] bg-white px-3 py-1.5 text-xs font-medium"
          >
            <option value="RECEPCION">Stock: Recepción</option>
            <option value="ALMACEN_PRINCIPAL">Stock: Almacén Principal</option>
            <option value="ROOFTOP">Stock: Rooftop</option>
            <option value="LIMPIEZA">Stock: Limpieza</option>
          </select>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCatFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              catFilter === 'ALL'
                ? 'bg-[#3A2B18] text-white'
                : 'border border-[#E2D2AF] bg-[#FFFDF9] text-[#5C4A33] hover:bg-[#FBF6EA]'
            }`}
          >
            Todos
          </button>
          {state.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCatFilter(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                catFilter === cat.id
                  ? 'bg-[#3A2B18] text-white'
                  : 'border border-[#E2D2AF] bg-[#FFFDF9] text-[#5C4A33] hover:bg-[#FBF6EA]'
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((p) => {
            const stockArea = p.stocks[area] ?? 0;
            return (
              <button
                key={p.id}
                onClick={() => addToCart(p.id)}
                className="flex flex-col justify-between rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 text-left transition-all hover:border-[#B8891F] hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-[#2A2015]">{p.descripcion}</span>
                    <span className="font-mono text-xs font-bold text-[#9A6E0E] shrink-0 tabular-nums">
                      {formatCurrency(p.precio)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#6E5D47]">
                    {p.categoriaNombre} · {p.codigoBarra}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[#EFE4CB] pt-2 text-[11px]">
                  <span className="text-[#6E5D47]">
                    {p.tipo === 'STOCKABLE' ? `Stock: ${stockArea}` : 'Servicio'}
                  </span>
                  <span className="font-semibold text-[#9A6E0E]">+ Agregar</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart / Checkout Panel */}
      <div className="lg:col-span-4">
        <div className="sticky top-24 flex flex-col rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#EFE4CB] pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#2A2015]">
              <ShoppingBag className="h-4 w-4 text-[#9A6E0E]" />
              Comanda / Carrito ({cart.length})
            </h3>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Target Type */}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 text-xs">
            <button
              onClick={() => setTargetType('LIBRE')}
              className={`rounded-md py-1.5 font-semibold ${
                targetType === 'LIBRE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Venta Libre
            </button>
            <button
              onClick={() => {
                setTargetType('HABITACION');
                if (!targetRoomId && occupiedRooms[0]) setTargetRoomId(occupiedRooms[0].id);
              }}
              className={`rounded-md py-1.5 font-semibold ${
                targetType === 'HABITACION' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              A Habitación
            </button>
          </div>

          {targetType === 'LIBRE' ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Nombre cliente"
                className="rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
              <input
                type="text"
                value={guestDoc}
                onChange={(e) => setGuestDoc(e.target.value)}
                placeholder="DNI / RUC"
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
              />
            </div>
          ) : (
            <select
              value={targetRoomId}
              onChange={(e) => setTargetRoomId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
            >
              {occupiedRooms.length === 0 ? (
                <option value="">No hay habitaciones ocupadas</option>
              ) : (
                occupiedRooms.map((r) => {
                  const st = state.stays.find((s) => s.id === r.currentStayId);
                  return (
                    <option key={r.id} value={r.id}>
                      Hab. {r.numero} — {st?.guestName}
                    </option>
                  );
                })
              )}
            </select>
          )}

          {/* Cart Items */}
          <div className="max-h-64 space-y-2 overflow-y-auto divide-y divide-slate-100">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Seleccione productos del catálogo.
              </p>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="pt-2 text-xs space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-800">{item.descripcion}</span>
                    <button
                      onClick={() => updateCartQty(item.productId, -item.cantidad)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center rounded-md border border-slate-200">
                      <button
                        onClick={() => updateCartQty(item.productId, -1)}
                        className="px-2 py-1 hover:bg-slate-100"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2.5 font-mono font-bold tabular-nums">{item.cantidad}</span>
                      <button
                        onClick={() => updateCartQty(item.productId, 1)}
                        className="px-2 py-1 hover:bg-slate-100"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        disabled={!state.config.modificarPreciosPos}
                        value={item.precioUnitario}
                        onChange={(e) => updateCartPrice(item.productId, Number(e.target.value))}
                        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-right font-mono"
                      />
                      <span className="w-16 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(item.cantidad * item.precioUnitario)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Pago</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as PaymentMethodName)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
              >
                {state.config.paymentMethods
                  .filter((pm) => targetType === 'HABITACION' || pm.nombre !== 'X PAGAR')
                  .map((pm) => (
                    <option key={pm.id} value={pm.nombre}>
                      {pm.nombre}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Comprobante</label>
              <select
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value as VoucherType)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
              >
                <option value="TICKET">TICKET</option>
                <option value="BOLETA">BOLETA</option>
                <option value="FACTURA">FACTURA</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-xs font-semibold text-slate-600">TOTAL</span>
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>

          <button
            onClick={handleCompleteSale}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9A6E0E] py-2.5 text-xs font-bold text-white hover:bg-[#7E590A]"
          >
            <Receipt className="h-4 w-4" />
            {targetType === 'HABITACION' && metodoPago === 'X PAGAR'
              ? 'Cargar a Habitación'
              : 'Emitir Comprobante'}
          </button>
        </div>
      </div>

      <PrintTicketModal ticket={printTicket} onClose={() => setPrintTicket(null)} />
    </div>
  );
};
