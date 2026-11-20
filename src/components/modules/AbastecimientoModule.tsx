import React, { useMemo, useState } from 'react';
import { Download, Edit3, Plus, Search, Truck, X } from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type { Product, PurchaseItem, WarehouseArea } from '../../types/pms';
import { exportToCsv, formatCurrency } from '../../utils/exportCsv';
import { toYMD } from '../../data/seedData';

interface AbastecimientoModuleProps {
  mode: 'productos' | 'compras' | 'inventario' | 'despacho';
}

type InventarioTab = 'KARDEX' | 'COMPRAS' | 'AJUSTES' | 'STOCK_AREA' | 'VENDIDOS' | 'CIERRE';

export const AbastecimientoModule: React.FC<AbastecimientoModuleProps> = ({ mode }) => {
  const {
    state,
    saveCategory,
    saveProduct,
    registerPurchase,
    registerStockDispatch,
    notify,
  } = usePMS();

  // Productos & Categorias
  const [prodSearch, setProdSearch] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [showProdModal, setShowProdModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Partial<Product>>({});

  // Compras
  const [purDocType, setPurDocType] = useState<'FACTURA' | 'BOLETA' | 'GUIA'>('FACTURA');
  const [purNumDoc, setPurNumDoc] = useState('');
  const [purFecha, setPurFecha] = useState(() => toYMD(new Date()));
  const [purProveedor, setPurProveedor] = useState('');
  const [purArea, setPurArea] = useState<WarehouseArea>('ALMACEN_PRINCIPAL');
  const [purItems, setPurItems] = useState<PurchaseItem[]>([]);
  const [purAddProdId, setPurAddProdId] = useState(state.products[0]?.id || '');
  const [purAddQty, setPurAddQty] = useState(1);
  const [purAddCost, setPurAddCost] = useState(10);

  // Inventario
  const [invTab, setInvTab] = useState<InventarioTab>('KARDEX');
  const [kardexFilter, setKardexFilter] = useState('');

  // Despacho / Ajuste
  const [dispTipo, setDispTipo] = useState<'ENTREGA_PRODUCTOS' | 'AJUSTE_INGRESO' | 'AJUSTE_SALIDA'>(
    'ENTREGA_PRODUCTOS'
  );
  const [dispOrigen, setDispOrigen] = useState<WarehouseArea>('ALMACEN_PRINCIPAL');
  const [dispDestino, setDispDestino] = useState<WarehouseArea>('RECEPCION');
  const [dispProdId, setDispProdId] = useState(
    state.products.find((p) => p.tipo === 'STOCKABLE')?.id || state.products[0]?.id || ''
  );
  const [dispQty, setDispQty] = useState(1);
  const [dispObs, setDispObs] = useState('');

  const filteredProducts = useMemo(() => {
    if (!prodSearch.trim()) return state.products;
    const q = prodSearch.toLowerCase();
    return state.products.filter(
      (p) =>
        p.descripcion.toLowerCase().includes(q) ||
        p.codigoBarra.toLowerCase().includes(q) ||
        p.categoriaNombre.toLowerCase().includes(q)
    );
  }, [state.products, prodSearch]);

  const openProductModal = (prod?: Product) => {
    if (prod) {
      setEditingProd({ ...prod });
    } else {
      const cat = state.categories[0];
      setEditingProd({
        descripcion: '',
        codigoBarra: `775${Math.floor(100000 + Math.random() * 899999)}`,
        moneda: 'PEN',
        precio: 10,
        precioMin: 5,
        tipo: 'STOCKABLE',
        categoryId: cat?.id || '',
        categoriaNombre: cat?.nombre || 'GENERAL',
        familia: 'PRODUCTO',
        activo: true,
        stocks: { ALMACEN_PRINCIPAL: 0, RECEPCION: 0, LIMPIEZA: 0, ROOFTOP: 0 },
      });
    }
    setShowProdModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProd.descripcion?.trim()) {
      notify('error', 'Ingrese descripción del producto');
      return;
    }
    const cat = state.categories.find((c) => c.id === editingProd.categoryId);
    saveProduct({
      id: editingProd.id,
      descripcion: editingProd.descripcion.toUpperCase(),
      codigoBarra: editingProd.codigoBarra || '000000',
      moneda: editingProd.moneda || 'PEN',
      precio: Number(editingProd.precio || 0),
      precioMin: Number(editingProd.precioMin || 0),
      tipo: editingProd.tipo || 'STOCKABLE',
      categoryId: editingProd.categoryId || state.categories[0]?.id || '',
      categoriaNombre: cat?.nombre || editingProd.categoriaNombre || 'GENERAL',
      familia: editingProd.familia || 'PRODUCTO',
      codigoSunat: editingProd.codigoSunat,
      activo: editingProd.activo ?? true,
      stocks: editingProd.stocks || { ALMACEN_PRINCIPAL: 0, RECEPCION: 0, LIMPIEZA: 0, ROOFTOP: 0 },
    });
    setShowProdModal(false);
  };

  if (mode === 'productos') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Categories Box */}
          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 lg:col-span-4 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E5D47]">
              Categorías ({state.categories.length})
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCatName.trim()) return;
                saveCategory({ nombre: newCatName.trim().toUpperCase(), activo: true });
                setNewCatName('');
              }}
              className="flex gap-2 text-xs"
            >
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nueva categoría..."
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
              {state.categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2">
                  <span className="font-medium text-[#2A2015]">{c.nombre}</span>
                  <span className="font-mono text-[11px] text-[#8B7658]">
                    {state.products.filter((p) => p.categoryId === c.id).length} items
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Products List */}
          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] lg:col-span-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2D2AF] p-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8B7658]" />
                <input
                  type="text"
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  placeholder="Buscar producto o código..."
                  className="w-full rounded-lg border border-[#DECFA8] pl-8 pr-3 py-1.5 text-xs"
                />
              </div>
              <button
                onClick={() => openProductModal()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#7E590A]"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo Producto
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
                  <tr>
                    <th className="px-4 py-2.5">Código</th>
                    <th className="px-4 py-2.5">Descripción</th>
                    <th className="px-4 py-2.5">Categoría / Tipo</th>
                    <th className="px-4 py-2.5 text-right">Precio</th>
                    <th className="px-4 py-2.5 text-right">Stock Total</th>
                    <th className="px-4 py-2.5 text-right">Editar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const totalStock =
                      p.stocks.ALMACEN_PRINCIPAL + p.stocks.RECEPCION + p.stocks.LIMPIEZA + p.stocks.ROOFTOP;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{p.codigoBarra}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{p.descripcion}</td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {p.categoriaNombre} · {p.tipo}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums">
                          {formatCurrency(p.precio)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          {p.tipo === 'STOCKABLE' ? totalStock : 'N/A'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => openProductModal(p)}
                            className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-100"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showProdModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {editingProd.id ? 'Editar Producto' : 'Nuevo Producto / Servicio'}
                </h3>
                <button onClick={() => setShowProdModal(false)} className="text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSaveProduct} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Descripción *</label>
                  <input
                    type="text"
                    value={editingProd.descripcion || ''}
                    onChange={(e) => setEditingProd({ ...editingProd, descripcion: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Código Barra</label>
                    <input
                      type="text"
                      value={editingProd.codigoBarra || ''}
                      onChange={(e) => setEditingProd({ ...editingProd, codigoBarra: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Categoría</label>
                    <select
                      value={editingProd.categoryId || ''}
                      onChange={(e) => setEditingProd({ ...editingProd, categoryId: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
                    >
                      {state.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Tipo</label>
                    <select
                      value={editingProd.tipo || 'STOCKABLE'}
                      onChange={(e) =>
                        setEditingProd({ ...editingProd, tipo: e.target.value as 'STOCKABLE' | 'SERVICIO' })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
                    >
                      <option value="STOCKABLE">Con Inventario (Stockable)</option>
                      <option value="SERVICIO">Servicio / Cargo</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Precio Venta (S/)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={editingProd.precio ?? 0}
                      onChange={(e) => setEditingProd({ ...editingProd, precio: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProdModal(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-semibold text-white hover:bg-[#7E590A]"
                  >
                    Guardar Producto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'compras') {
    const purchaseTotal = purItems.reduce((a, b) => a + b.importe, 0);
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Registro de Compras y Abastecimiento</h2>
          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-5">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Documento</label>
              <select
                value={purDocType}
                onChange={(e) => setPurDocType(e.target.value as 'FACTURA' | 'BOLETA' | 'GUIA')}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
              >
                <option value="FACTURA">FACTURA</option>
                <option value="BOLETA">BOLETA</option>
                <option value="GUIA">GUÍA REMISIÓN</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">N° Comprobante *</label>
              <input
                type="text"
                value={purNumDoc}
                onChange={(e) => setPurNumDoc(e.target.value)}
                placeholder="F001-00412"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Fecha</label>
              <input
                type="date"
                value={purFecha}
                onChange={(e) => setPurFecha(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Proveedor *</label>
              <input
                type="text"
                value={purProveedor}
                onChange={(e) => setPurProveedor(e.target.value)}
                placeholder="Distribuidora Cusco SAC"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Almacén Ingreso</label>
              <select
                value={purArea}
                onChange={(e) => setPurArea(e.target.value as WarehouseArea)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
              >
                <option value="ALMACEN_PRINCIPAL">ALMACÉN PRINCIPAL</option>
                <option value="RECEPCION">RECEPCIÓN</option>
                <option value="LIMPIEZA">LIMPIEZA</option>
                <option value="ROOFTOP">ROOFTOP</option>
              </select>
            </div>
          </div>

          {/* Add Item Bar */}
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block font-medium text-slate-600">Producto</label>
              <select
                value={purAddProdId}
                onChange={(e) => setPurAddProdId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
              >
                {state.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descripcion}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="mb-1 block font-medium text-slate-600">Cantidad</label>
              <input
                type="number"
                min={1}
                value={purAddQty}
                onChange={(e) => setPurAddQty(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block font-medium text-slate-600">Importe Total (S/)</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={purAddCost}
                onChange={(e) => setPurAddCost(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const prod = state.products.find((p) => p.id === purAddProdId);
                if (!prod) return;
                setPurItems([
                  ...purItems,
                  {
                    productId: prod.id,
                    descripcion: prod.descripcion,
                    cantidad: purAddQty,
                    importe: purAddCost,
                  },
                ]);
              }}
              className="rounded-lg bg-[#3A2B18] px-3.5 py-1.5 font-semibold text-white hover:bg-[#2A2015]"
            >
              + Agregar Línea
            </button>
          </div>

          {purItems.length > 0 && (
            <div className="space-y-3">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2 text-right">Importe</th>
                    <th className="px-3 py-2 text-right">Quitar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purItems.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-medium">{it.descripcion}</td>
                      <td className="px-3 py-2 text-right font-mono">{it.cantidad}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">
                        {formatCurrency(it.importe)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => setPurItems(purItems.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:underline"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-xs font-semibold text-slate-600">
                  Total Compra:{' '}
                  <strong className="font-mono text-base text-slate-900">
                    {formatCurrency(purchaseTotal)}
                  </strong>
                </span>
                <button
                  onClick={() => {
                    if (!purNumDoc.trim() || !purProveedor.trim()) {
                      notify('error', 'Ingrese número de documento y proveedor');
                      return;
                    }
                    registerPurchase({
                      tipoDoc: purDocType,
                      numDoc: purNumDoc.trim(),
                      fecha: purFecha,
                      proveedor: purProveedor.toUpperCase(),
                      area: purArea,
                      items: purItems,
                      total: purchaseTotal,
                    });
                    setPurItems([]);
                    setPurNumDoc('');
                  }}
                  className="rounded-lg bg-[#9A6E0E] px-5 py-2 text-xs font-semibold text-white hover:bg-[#7E590A]"
                >
                  Registrar Compra e Ingresar Stock
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-xs font-bold uppercase text-slate-600">Historial de Compras</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Comprobante</th>
                <th className="px-4 py-2.5">Proveedor</th>
                <th className="px-4 py-2.5">Área</th>
                <th className="px-4 py-2.5 text-right">Items</th>
                <th className="px-4 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.purchases.map((pu) => (
                <tr key={pu.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-slate-600">{pu.fecha}</td>
                  <td className="px-4 py-2.5 font-mono font-bold">
                    {pu.tipoDoc} {pu.numDoc}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{pu.proveedor}</td>
                  <td className="px-4 py-2.5 text-slate-600">{pu.area}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{pu.items.length}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(pu.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (mode === 'despacho') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#9A6E0E]" />
            <h2 className="font-luxury text-lg font-bold text-[#2A2015]">Despacho Interno y Ajustes de Stock</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (dispQty <= 0) return;
              registerStockDispatch({
                tipo: dispTipo,
                origen: dispTipo === 'AJUSTE_INGRESO' ? 'AJUSTE' : dispOrigen,
                destino: dispTipo === 'AJUSTE_SALIDA' ? 'AJUSTE' : dispDestino,
                items: [{ productId: dispProdId, cantidad: dispQty }],
                observaciones: dispObs || 'Movimiento interno de inventario',
              });
              setDispObs('');
              setDispQty(1);
            }}
            className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-6"
          >
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Tipo Movimiento</label>
              <select
                value={dispTipo}
                onChange={(e) => setDispTipo(e.target.value as typeof dispTipo)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
              >
                <option value="ENTREGA_PRODUCTOS">Entrega entre Áreas</option>
                <option value="AJUSTE_INGRESO">Ajuste Positivo (+)</option>
                <option value="AJUSTE_SALIDA">Ajuste Negativo (-)</option>
              </select>
            </div>
            {dispTipo !== 'AJUSTE_INGRESO' && (
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Origen</label>
                <select
                  value={dispOrigen}
                  onChange={(e) => setDispOrigen(e.target.value as WarehouseArea)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
                >
                  <option value="ALMACEN_PRINCIPAL">ALMACÉN PRINCIPAL</option>
                  <option value="RECEPCION">RECEPCIÓN</option>
                  <option value="LIMPIEZA">LIMPIEZA</option>
                  <option value="ROOFTOP">ROOFTOP</option>
                </select>
              </div>
            )}
            {dispTipo !== 'AJUSTE_SALIDA' && (
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Destino</label>
                <select
                  value={dispDestino}
                  onChange={(e) => setDispDestino(e.target.value as WarehouseArea)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
                >
                  <option value="RECEPCION">RECEPCIÓN</option>
                  <option value="LIMPIEZA">LIMPIEZA</option>
                  <option value="ROOFTOP">ROOFTOP</option>
                  <option value="ALMACEN_PRINCIPAL">ALMACÉN PRINCIPAL</option>
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block font-semibold text-slate-700">Producto</label>
              <select
                value={dispProdId}
                onChange={(e) => setDispProdId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
              >
                {state.products
                  .filter((p) => p.tipo === 'STOCKABLE')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.descripcion} (Alm: {p.stocks.ALMACEN_PRINCIPAL} / Rec: {p.stocks.RECEPCION})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Cantidad</label>
              <input
                type="number"
                min={1}
                value={dispQty}
                onChange={(e) => setDispQty(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono font-bold"
              />
            </div>
            <div className="sm:col-span-5">
              <input
                type="text"
                value={dispObs}
                onChange={(e) => setDispObs(e.target.value)}
                placeholder="Observaciones o motivo del despacho / ajuste..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#9A6E0E] py-2 font-semibold text-white hover:bg-[#7E590A]"
              >
                Ejecutar Movimiento
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Movimiento</th>
                <th className="px-4 py-2.5">Producto</th>
                <th className="px-4 py-2.5">Origen → Destino</th>
                <th className="px-4 py-2.5 text-right">Cant.</th>
                <th className="px-4 py-2.5 text-right">Stock Res.</th>
                <th className="px-4 py-2.5">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.stockMovements.slice(0, 20).map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{m.fecha}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{m.tipoMovimiento}</td>
                  <td className="px-4 py-2.5 font-medium">{m.descripcion}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {m.origen} → {m.destino}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold">{m.cantidad}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.stockResultante}</td>
                  <td className="px-4 py-2.5 text-slate-500">{m.observaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // INVENTARIO (6 tabs)
  const filteredMovements = state.stockMovements.filter(
    (m) =>
      !kardexFilter.trim() ||
      m.descripcion.toLowerCase().includes(kardexFilter.toLowerCase()) ||
      m.tipoMovimiento.toLowerCase().includes(kardexFilter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'KARDEX', label: 'Movimiento Productos (Kardex)' },
            { id: 'STOCK_AREA', label: 'Stocks por Área' },
            { id: 'COMPRAS', label: 'Informe de Compras' },
            { id: 'AJUSTES', label: 'Ajuste de Productos' },
            { id: 'VENDIDOS', label: 'Productos Vendidos' },
            { id: 'CIERRE', label: 'Inventario Cierre' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setInvTab(t.id as InventarioTab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                invTab === t.id
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
              `inventario_lachuspa_${toYMD(new Date())}.csv`,
              ['Producto', 'Almacén Principal', 'Recepción', 'Limpieza', 'Rooftop', 'Precio'],
              state.products.map((p) => [
                p.descripcion,
                p.stocks.ALMACEN_PRINCIPAL,
                p.stocks.RECEPCION,
                p.stocks.LIMPIEZA,
                p.stocks.ROOFTOP,
                p.precio,
              ])
            );
            notify('success', 'Inventario exportado');
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </button>
      </div>

      {invTab === 'KARDEX' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <input
              type="text"
              value={kardexFilter}
              onChange={(e) => setKardexFilter(e.target.value)}
              placeholder="Filtrar movimientos por producto o tipo..."
              className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Tipo</th>
                  <th className="px-4 py-2.5">Producto</th>
                  <th className="px-4 py-2.5">Origen → Destino</th>
                  <th className="px-4 py-2.5 text-right">Cantidad</th>
                  <th className="px-4 py-2.5 text-right">Saldo</th>
                  <th className="px-4 py-2.5">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{m.fecha}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{m.tipoMovimiento}</td>
                    <td className="px-4 py-2.5 font-medium">{m.descripcion}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {m.origen} → {m.destino}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold">{m.cantidad}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{m.stockResultante}</td>
                    <td className="px-4 py-2.5 text-slate-500">{m.responsable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(invTab === 'STOCK_AREA' || invTab === 'CIERRE') && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Almacén Prin.</th>
                <th className="px-4 py-3 text-right">Recepción</th>
                <th className="px-4 py-3 text-right">Limpieza</th>
                <th className="px-4 py-3 text-right">Rooftop</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Valorizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.products
                .filter((p) => p.tipo === 'STOCKABLE')
                .map((p) => {
                  const total =
                    p.stocks.ALMACEN_PRINCIPAL + p.stocks.RECEPCION + p.stocks.LIMPIEZA + p.stocks.ROOFTOP;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.descripcion}</td>
                      <td className="px-4 py-3 text-slate-500">{p.categoriaNombre}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.stocks.ALMACEN_PRINCIPAL}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.stocks.RECEPCION}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.stocks.LIMPIEZA}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.stocks.ROOFTOP}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#9A6E0E]">{total}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatCurrency(total * p.precio)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {invTab === 'COMPRAS' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Área</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.purchases.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono">{p.fecha}</td>
                  <td className="px-4 py-3 font-mono font-bold">
                    {p.tipoDoc} {p.numDoc}
                  </td>
                  <td className="px-4 py-3">{p.proveedor}</td>
                  <td className="px-4 py-3">{p.area}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invTab === 'AJUSTES' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.stockMovements
                .filter((m) => m.tipoMovimiento === 'AJUSTE_INGRESO' || m.tipoMovimiento === 'AJUSTE_SALIDA')
                .map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-mono text-[11px]">{m.fecha}</td>
                    <td className="px-4 py-3 font-semibold">{m.tipoMovimiento}</td>
                    <td className="px-4 py-3">{m.descripcion}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{m.cantidad}</td>
                    <td className="px-4 py-3 text-slate-600">{m.observaciones}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {invTab === 'VENDIDOS' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.stockMovements
                .filter((m) => m.tipoMovimiento === 'VENTA')
                .map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-mono text-[11px]">{m.fecha}</td>
                    <td className="px-4 py-3 font-semibold">{m.descripcion}</td>
                    <td className="px-4 py-3">{m.destino}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{m.cantidad}</td>
                    <td className="px-4 py-3">{m.responsable}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
