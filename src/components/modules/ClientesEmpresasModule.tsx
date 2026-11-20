import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Download,
  Edit3,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type { Agency, DocType, Guest, PaymentMethodName, PersonaNoGrata } from '../../types/pms';
import { exportToCsv, formatCurrency } from '../../utils/exportCsv';
import { toYMD } from '../../data/seedData';

interface ClientesEmpresasModuleProps {
  mode: 'clientes' | 'agencias' | 'personas_no_gratas';
}

type ClientesTab = 'HUESPEDES' | 'FRECUENTES' | 'CONSUMO' | 'CUMPLEANOS';

const MONTHS_ES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

export const ClientesEmpresasModule: React.FC<ClientesEmpresasModuleProps> = ({ mode }) => {
  const {
    state,
    saveGuest,
    deleteGuest,
    saveAgency,
    deleteAgency,
    savePersonaNoGrata,
    deletePersonaNoGrata,
    notify,
  } = usePMS();

  const [tab, setTab] = useState<ClientesTab>('HUESPEDES');
  const [search, setSearch] = useState('');
  const [vipOnly, setVipOnly] = useState(false);

  // Guest Modal
  const [guestModal, setGuestModal] = useState(false);
  const [editGuest, setEditGuest] = useState<Partial<Guest>>({});

  // Frequent / Consumption / Birthday Filters
  const [consumoStart, setConsumoStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toYMD(d);
  });
  const [consumoEnd, setConsumoEnd] = useState(() => toYMD(new Date()));
  const [consumoPayMethod, setConsumoPayMethod] = useState<'ALL' | PaymentMethodName>('ALL');
  const [bdayMonth, setBdayMonth] = useState<number>(new Date().getMonth() + 1);
  const [bdayDay, setBdayDay] = useState<string>('ALL');

  // Agency Modal
  const [agencyModal, setAgencyModal] = useState(false);
  const [editAgency, setEditAgency] = useState<Partial<Agency>>({});

  // Blacklist Form
  const [pngDoc, setPngDoc] = useState('');
  const [pngNombres, setPngNombres] = useState('');
  const [pngApellidos, setPngApellidos] = useState('');
  const [pngTipo, setPngTipo] = useState<PersonaNoGrata['tipo']>('ALERTA');
  const [pngComentario, setPngComentario] = useState('');

  const filteredGuests = useMemo(() => {
    return state.guests.filter((g) => {
      if (vipOnly && !g.esVip) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          g.nombres.toLowerCase().includes(q) ||
          g.numDoc.toLowerCase().includes(q) ||
          g.nacionalidad.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.guests, vipOnly, search]);

  const frequentGuests = useMemo(() => {
    return state.guests
      .map((g) => {
        const guestStays = state.stays.filter((s) => s.guestId === g.id);
        const total = guestStays.reduce((a, s) => a + s.totalCargos, 0);
        const lastVisit = guestStays[0]?.fechaEntrada?.slice(0, 10) || g.fechaRegistro;
        return {
          guest: g,
          visitas: guestStays.length,
          ultimaVisita: lastVisit,
          totalConsumo: total,
        };
      })
      .filter((x) => x.visitas > 0)
      .sort((a, b) => b.visitas - a.visitas || b.totalConsumo - a.totalConsumo);
  }, [state.guests, state.stays]);

  const consumptionByGuest = useMemo(() => {
    const map = new Map<string, { numDoc: string; nombre: string; total: number }>();
    state.sales
      .filter((s) => s.status === 'ACTIVO')
      .filter((s) => {
        const ymd = s.fecha.slice(0, 10);
        if (ymd < consumoStart || ymd > consumoEnd) return false;
        if (consumoPayMethod !== 'ALL' && s.metodoPago !== consumoPayMethod) return false;
        return true;
      })
      .forEach((s) => {
        const key = s.guestName;
        const curr = map.get(key) || {
          numDoc: s.guestDoc || 'S/D',
          nombre: s.guestName,
          total: 0,
        };
        curr.total += s.monto;
        map.set(key, curr);
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [state.sales, consumoStart, consumoEnd, consumoPayMethod]);

  const birthdayGuests = useMemo(() => {
    return state.guests.filter((g) => {
      if (!g.fechaNacimiento) return false;
      const parts = g.fechaNacimiento.split('-');
      if (parts.length < 3) return false;
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if (m !== bdayMonth) return false;
      if (bdayDay !== 'ALL' && d !== Number(bdayDay)) return false;
      return true;
    });
  }, [state.guests, bdayMonth, bdayDay]);

  if (mode === 'agencias') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
          <div>
            <h2 className="font-luxury text-lg font-bold text-[#2A2015]">Agencias y Empresas Corporativas</h2>
            <p className="text-xs text-[#6E5D47]">
              Entidades vinculables a reservas, estadías y facturación con RUC.
            </p>
          </div>
          <button
            onClick={() => {
              setEditAgency({
                tipoEntidad: 'Agencia',
                tipoDoc: 'RUC',
                numDoc: '',
                nombre: '',
                telefono: '',
                paginaWeb: '',
                sector: 'Turismo / Viajes',
                direccionFiscal: '',
              });
              setAgencyModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#7E590A]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva Agencia / Empresa
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">RUC / Doc</th>
                <th className="px-4 py-3">Razón Social / Nombre</th>
                <th className="px-4 py-3">Sector</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4CB]">
              {state.agencies.map((a) => (
                <tr key={a.id} className="hover:bg-[#FBF6EA]/60">
                  <td className="px-4 py-3 font-semibold text-[#9A6E0E]">{a.tipoEntidad}</td>
                  <td className="px-4 py-3 font-mono">{a.numDoc}</td>
                  <td className="px-4 py-3 font-bold text-slate-900 inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {a.nombre}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.sector}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{a.telefono}</td>
                  <td className="px-4 py-3 text-slate-500">{a.direccionFiscal}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditAgency({ ...a });
                          setAgencyModal(true);
                        }}
                        className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-100"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteAgency(a.id)}
                        className="rounded border border-slate-200 p-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {agencyModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {editAgency.id ? 'Editar Entidad' : 'Nueva Agencia / Empresa'}
                </h3>
                <button onClick={() => setAgencyModal(false)} className="text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editAgency.nombre?.trim() || !editAgency.numDoc?.trim()) {
                    notify('error', 'Complete RUC y Nombre');
                    return;
                  }
                  saveAgency({
                    id: editAgency.id,
                    tipoEntidad: editAgency.tipoEntidad || 'Agencia',
                    tipoDoc: editAgency.tipoDoc || 'RUC',
                    numDoc: editAgency.numDoc.trim(),
                    nombre: editAgency.nombre.toUpperCase(),
                    telefono: editAgency.telefono || '',
                    paginaWeb: editAgency.paginaWeb || '',
                    sector: editAgency.sector || 'Turismo',
                    direccionFiscal: editAgency.direccionFiscal || '',
                  });
                  setAgencyModal(false);
                }}
                className="mt-4 space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Tipo</label>
                    <select
                      value={editAgency.tipoEntidad || 'Agencia'}
                      onChange={(e) =>
                        setEditAgency({ ...editAgency, tipoEntidad: e.target.value as 'Agencia' | 'Empresa' })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
                    >
                      <option value="Agencia">Agencia</option>
                      <option value="Empresa">Empresa</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">RUC / Documento *</label>
                    <input
                      type="text"
                      value={editAgency.numDoc || ''}
                      onChange={(e) => setEditAgency({ ...editAgency, numDoc: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Razón Social / Nombre *</label>
                  <input
                    type="text"
                    value={editAgency.nombre || ''}
                    onChange={(e) => setEditAgency({ ...editAgency, nombre: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Teléfono</label>
                    <input
                      type="text"
                      value={editAgency.telefono || ''}
                      onChange={(e) => setEditAgency({ ...editAgency, telefono: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Sector</label>
                    <input
                      type="text"
                      value={editAgency.sector || ''}
                      onChange={(e) => setEditAgency({ ...editAgency, sector: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Dirección Fiscal</label>
                  <input
                    type="text"
                    value={editAgency.direccionFiscal || ''}
                    onChange={(e) => setEditAgency({ ...editAgency, direccionFiscal: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAgencyModal(false)}
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
      </div>
    );
  }

  if (mode === 'personas_no_gratas') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Control de Personas No Gratas</h2>
              <p className="text-xs text-slate-500">
                Cualquier intento de Check-In con un documento registrado aquí mostrará una alerta inmediata en Recepción.
              </p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!pngDoc.trim() || !pngNombres.trim()) {
                notify('error', 'Complete documento y nombres');
                return;
              }
              savePersonaNoGrata({
                numDoc: pngDoc.trim(),
                nombres: pngNombres.toUpperCase(),
                apellidos: pngApellidos.toUpperCase(),
                fecha: toYMD(new Date()),
                tipo: pngTipo,
                comentario: pngComentario || 'Incidencia reportada por administración.',
              });
              setPngDoc('');
              setPngNombres('');
              setPngApellidos('');
              setPngComentario('');
            }}
            className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-5"
          >
            <div>
              <label className="mb-1 block font-semibold text-slate-700">N° Documento *</label>
              <input
                type="text"
                value={pngDoc}
                onChange={(e) => setPngDoc(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Nombres *</label>
              <input
                type="text"
                value={pngNombres}
                onChange={(e) => setPngNombres(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Apellidos</label>
              <input
                type="text"
                value={pngApellidos}
                onChange={(e) => setPngApellidos(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Nivel</label>
              <select
                value={pngTipo}
                onChange={(e) => setPngTipo(e.target.value as PersonaNoGrata['tipo'])}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
              >
                <option value="ALERTA">ALERTA</option>
                <option value="BLOQUEO">BLOQUEO</option>
                <option value="OBSERVACION">OBSERVACIÓN</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-red-600 py-2 font-semibold text-white hover:bg-red-700"
              >
                Registrar Incidencia
              </button>
            </div>
            <div className="sm:col-span-5">
              <input
                type="text"
                value={pngComentario}
                onChange={(e) => setPngComentario(e.target.value)}
                placeholder="Motivo o comentario de la incidencia..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Nombre Completo</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Comentario</th>
                <th className="px-4 py-3 text-right">Quitar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.personasNoGratas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-red-700">{p.numDoc}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {p.nombres} {p.apellidos}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500">{p.fecha}</td>
                  <td className="px-4 py-3 font-bold text-red-600">{p.tipo}</td>
                  <td className="px-4 py-3 text-slate-600">{p.comentario}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deletePersonaNoGrata(p.id)}
                      className="rounded border border-slate-200 p-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // CLIENTES (4 TABS)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'HUESPEDES', label: 'Huéspedes' },
            { id: 'FRECUENTES', label: 'Huéspedes Frecuentes' },
            { id: 'CONSUMO', label: 'Huésped Consumo' },
            { id: 'CUMPLEANOS', label: 'Huésped Cumpleaños' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as ClientesTab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                tab === t.id
                  ? 'bg-[#3A2B18] text-white'
                  : 'text-[#5C4A33] hover:bg-[#FBF6EA] hover:text-[#2A2015]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              exportToCsv(
                `clientes_lachuspa_${toYMD(new Date())}.csv`,
                ['Tipo Doc', 'N° Doc', 'Nombres', 'Nacionalidad', 'Nacimiento', 'Celular', 'Correo', 'VIP'],
                state.guests.map((g) => [
                  g.tipoDoc,
                  g.numDoc,
                  g.nombres,
                  g.nacionalidad,
                  g.fechaNacimiento,
                  g.celular,
                  g.correo,
                  g.esVip ? 'SI' : 'NO',
                ])
              );
              notify('success', 'Directorio exportado a CSV');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2D2AF] bg-[#FFFDF9] px-3 py-1.5 text-xs font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
          >
            <Download className="h-3.5 w-3.5 text-[#9A6E0E]" />
            Exportar Excel (CSV)
          </button>
          <button
            onClick={() => {
              setEditGuest({
                tipoDoc: 'DNI',
                numDoc: '',
                nombres: '',
                fechaNacimiento: '1990-01-01',
                nacionalidad: 'PERUANO(A)',
                sexo: 'M',
                correo: '',
                celular: '',
                direccion: '',
                esVip: false,
              });
              setGuestModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#7E590A]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo Huésped
          </button>
        </div>
      </div>

      {tab === 'HUESPEDES' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar huésped por nombre, DNI/Pasaporte o nacionalidad..."
                className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={vipOnly} onChange={(e) => setVipOnly(e.target.checked)} />
              Solo Socios VIP
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Nombres Completos</th>
                  <th className="px-4 py-3">Nacionalidad</th>
                  <th className="px-4 py-3">Nacimiento</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {g.tipoDoc} {g.numDoc}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 inline-flex items-center gap-1.5">
                        {g.nombres}
                        {g.esVip && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{g.nacionalidad}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{g.fechaNacimiento}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {g.celular || '-'} · {g.correo || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => {
                            setEditGuest({ ...g });
                            setGuestModal(true);
                          }}
                          className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteGuest(g.id)}
                          className="rounded border border-slate-200 p-1 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {tab === 'FRECUENTES' && (
        <div className="overflow-x-auto rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[11px] font-bold uppercase text-[#6E5D47]">
              <tr>
                <th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">Nombres</th>
                <th className="px-4 py-3 text-right">Cantidad Visitas</th>
                <th className="px-4 py-3">Última Visita</th>
                <th className="px-4 py-3 text-right">Total Consumos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4CB]">
              {frequentGuests.map((item, idx) => (
                <tr key={item.guest.id} className="hover:bg-[#FBF6EA]/60">
                  <td className="px-4 py-3 font-mono text-[#6E5D47]">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-[#2A2015]">{item.guest.nombres}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#9A6E0E]">{item.visitas}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{item.ultimaVisita}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {formatCurrency(item.totalConsumo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'CONSUMO' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs">
            <input
              type="date"
              value={consumoStart}
              onChange={(e) => setConsumoStart(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-mono"
            />
            <input
              type="date"
              value={consumoEnd}
              onChange={(e) => setConsumoEnd(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-mono"
            />
            <select
              value={consumoPayMethod}
              onChange={(e) => setConsumoPayMethod(e.target.value as typeof consumoPayMethod)}
              className="rounded-lg border border-slate-300 px-3 py-1.5"
            >
              <option value="ALL">TODAS LAS FORMAS DE PAGO</option>
              {state.config.paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.nombre}>
                  {pm.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Número Documento</th>
                  <th className="px-4 py-3">Nombre Completo</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consumptionByGuest.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-600">{row.numDoc}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.nombre}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#9A6E0E]">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'CUMPLEANOS' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs">
            <select
              value={bdayMonth}
              onChange={(e) => setBdayMonth(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold"
            >
              {MONTHS_ES.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={bdayDay}
              onChange={(e) => setBdayDay(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5"
            >
              <option value="ALL">TODOS LOS DÍAS</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>
                  Día {d}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Huésped</th>
                  <th className="px-4 py-3">Fecha Nacimiento</th>
                  <th className="px-4 py-3">Celular</th>
                  <th className="px-4 py-3">Correo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {birthdayGuests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                      Sin cumpleaños registrados en el mes seleccionado.
                    </td>
                  </tr>
                ) : (
                  birthdayGuests.map((g) => (
                    <tr key={g.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{g.nombres}</td>
                      <td className="px-4 py-3 font-mono">{g.fechaNacimiento}</td>
                      <td className="px-4 py-3 font-mono">{g.celular || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{g.correo || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GUEST MODAL */}
      {guestModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A2015]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-6 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editGuest.id ? 'Editar Huésped' : 'Registrar Huésped'}
              </h3>
              <button onClick={() => setGuestModal(false)} className="text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editGuest.numDoc?.trim() || !editGuest.nombres?.trim()) {
                  notify('error', 'Complete documento y nombres');
                  return;
                }
                saveGuest({
                  id: editGuest.id,
                  tipoDoc: editGuest.tipoDoc || 'DNI',
                  numDoc: editGuest.numDoc.trim(),
                  nombres: editGuest.nombres.toUpperCase(),
                  fechaNacimiento: editGuest.fechaNacimiento || '1990-01-01',
                  nacionalidad: (editGuest.nacionalidad || 'PERUANO(A)').toUpperCase(),
                  sexo: editGuest.sexo || 'M',
                  correo: editGuest.correo || '',
                  celular: editGuest.celular || '',
                  direccion: editGuest.direccion || '',
                  esVip: Boolean(editGuest.esVip),
                });
                setGuestModal(false);
              }}
              className="mt-4 space-y-3"
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Tipo Doc</label>
                  <select
                    value={editGuest.tipoDoc || 'DNI'}
                    onChange={(e) => setEditGuest({ ...editGuest, tipoDoc: e.target.value as DocType })}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
                  >
                    <option value="DNI">DNI</option>
                    <option value="PAS">PASAPORTE</option>
                    <option value="CE">CARNET EXT.</option>
                    <option value="RUC">RUC</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">N° Documento *</label>
                  <input
                    type="text"
                    value={editGuest.numDoc || ''}
                    onChange={(e) => setEditGuest({ ...editGuest, numDoc: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Nacimiento</label>
                  <input
                    type="date"
                    value={editGuest.fechaNacimiento || '1990-01-01'}
                    onChange={(e) => setEditGuest({ ...editGuest, fechaNacimiento: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Nombres y Apellidos *</label>
                <input
                  type="text"
                  value={editGuest.nombres || ''}
                  onChange={(e) => setEditGuest({ ...editGuest, nombres: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Nacionalidad</label>
                  <input
                    type="text"
                    value={editGuest.nacionalidad || ''}
                    onChange={(e) => setEditGuest({ ...editGuest, nacionalidad: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Celular</label>
                  <input
                    type="text"
                    value={editGuest.celular || ''}
                    onChange={(e) => setEditGuest({ ...editGuest, celular: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Correo</label>
                  <input
                    type="email"
                    value={editGuest.correo || ''}
                    onChange={(e) => setEditGuest({ ...editGuest, correo: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editGuest.esVip)}
                  onChange={(e) => setEditGuest({ ...editGuest, esVip: e.target.checked })}
                />
                Socio VIP del Hotel
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGuestModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-semibold text-white hover:bg-[#7E590A]"
                >
                  Guardar Huésped
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
