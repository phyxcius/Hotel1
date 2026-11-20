import React, { useState } from 'react';
import { Check, Eye, Globe, Palette, RotateCcw, Sparkles } from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type { RoomStatus } from '../../types/pms';

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  sidebarBg: string;
  sidebarText: string;
  topbarBg: string;
  accentColor: string;
  canvasBg: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'luxury-champagne-oro',
    name: 'Champagne & Oro 24K',
    description: 'Seda champagne, marfil y acento oro luxury',
    sidebarBg: '#F6EFE2',
    sidebarText: '#2A2015',
    topbarBg: '#FFFDF8',
    accentColor: '#B8891F',
    canvasBg: '#FAF7F0',
  },
  {
    id: 'marfil-imperial',
    name: 'Marfil Imperial',
    description: 'Crema satinada y bronce clásico de palacio',
    sidebarBg: '#F2ECE1',
    sidebarText: '#241B12',
    topbarBg: '#FFFFFF',
    accentColor: '#9A7214',
    canvasBg: '#F9F6EE',
  },
  {
    id: 'perla-oro-rosa',
    name: 'Perla & Oro Rosa',
    description: 'Mármol perla cálido y oro rosado boutique',
    sidebarBg: '#F7EFEA',
    sidebarText: '#2D1E19',
    topbarBg: '#FFFCFB',
    accentColor: '#B4694E',
    canvasBg: '#FBF7F5',
  },
  {
    id: 'esmeralda-palacio',
    name: 'Esmeralda & Oro',
    description: 'Verde palacio luminoso con dorado real',
    sidebarBg: '#ECF3EE',
    sidebarText: '#17281E',
    topbarBg: '#FCFDFC',
    accentColor: '#B8891F',
    canvasBg: '#F6FAF7',
  },
  {
    id: 'obsidiana-gala',
    name: 'Obsidiana Gala',
    description: 'Noche elegante con oro brillante',
    sidebarBg: '#1F1811',
    sidebarText: '#FBF6EA',
    topbarBg: '#140F0A',
    accentColor: '#D4A237',
    canvasBg: '#FAF7F0',
  },
];

export const DisenoSistemaModule: React.FC = () => {
  const { state, updateConfig, notify } = usePMS();
  const [activeTab, setActiveTab] = useState<'SISTEMA' | 'RESERVAS'>('SISTEMA');

  const theme = state.config.theme;
  const webDesign = state.config.reservaWebDesign;

  const applyPreset = (preset: ThemePreset) => {
    updateConfig({
      theme: {
        ...theme,
        presetId: preset.id,
        sidebarBg: preset.sidebarBg,
        sidebarText: preset.sidebarText,
        topbarBg: preset.topbarBg,
        accentColor: preset.accentColor,
        canvasBg: preset.canvasBg,
      },
    });
    notify('success', `Estilo Luxury "${preset.name}" aplicado al sistema`);
  };

  const resetDefaultDesign = () => {
    const base = THEME_PRESETS[0];
    updateConfig({
      reservaWebBg: '#FFFDF8',
      reservaWebText: '#2A2015',
      reservaWebAccent: '#B8891F',
      coloresEstado: {
        DISPONIBLE: '#15803D',
        OCUPADO: '#B91C1C',
        EN_LIMPIEZA: '#0369A1',
        EN_MANTENIMIENTO: '#78716C',
        RESERVADO: '#B8891F',
      },
      theme: {
        presetId: base.id,
        sidebarBg: base.sidebarBg,
        sidebarText: base.sidebarText,
        topbarBg: base.topbarBg,
        accentColor: base.accentColor,
        canvasBg: base.canvasBg,
        cardRadius: 'xl',
      },
      reservaWebDesign: {
        layoutStyle: 'moderno',
        headerBg: '#F4ECDC',
        showRoomPhotos: true,
        showAmenities: true,
        bannerTitle: `Reserva Directa en ${state.config.nombreComercial}`,
        bannerSubtitle: 'Hospitalidad de lujo · Tarifa preferencial y confirmación inmediata',
      },
    });
    notify('info', 'Diseño Luxury Champagne & Oro restablecido');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('SISTEMA')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'SISTEMA'
                ? 'bg-[#B8891F] text-white'
                : 'text-[#5E4A2D] hover:bg-[#F5EBD2] hover:text-[#2A2015]'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            Diseño y Colores del Sistema PMS
          </button>
          <button
            onClick={() => setActiveTab('RESERVAS')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'RESERVAS'
                ? 'bg-[#B8891F] text-white'
                : 'text-[#5E4A2D] hover:bg-[#F5EBD2] hover:text-[#2A2015]'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Diseño del Sistema de Reservas
          </button>
        </div>

        <button
          onClick={resetDefaultDesign}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#DECFA8] bg-[#FAF7F0] px-3 py-1.5 text-xs font-semibold text-[#5E4A2D] hover:bg-[#F3E9D2]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restablecer Luxury Oro
        </button>
      </div>

      {activeTab === 'SISTEMA' && (
        <div className="space-y-4">
          {/* Theme Presets */}
          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#B8891F]" />
              <h2 className="font-luxury text-lg font-bold text-[#2A2015]">
                Colección de Paletas Luxury
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {THEME_PRESETS.map((preset) => {
                const isSelected = theme.presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? 'border-[#B8891F] bg-[#FBF5E6] ring-1 ring-[#B8891F]'
                        : 'border-[#E6DBC4] bg-white hover:border-[#C89B2B]'
                    }`}
                  >
                    <div className="w-full space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2A2015]">{preset.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-[#B8891F]" />}
                      </div>
                      <p className="text-[11px] text-[#6E5D47]">{preset.description}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span
                        className="h-5 w-5 rounded border border-[#DECFA8]"
                        style={{ backgroundColor: preset.sidebarBg }}
                        title="Barra lateral"
                      />
                      <span
                        className="h-5 w-5 rounded border border-[#DECFA8]"
                        style={{ backgroundColor: preset.topbarBg }}
                        title="Barra superior"
                      />
                      <span
                        className="h-5 w-5 rounded border border-[#DECFA8]"
                        style={{ backgroundColor: preset.accentColor }}
                        title="Dorado / Acento"
                      />
                      <span
                        className="h-5 w-5 rounded border border-[#DECFA8]"
                        style={{ backgroundColor: preset.canvasBg }}
                        title="Fondo"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Colors */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-[#7A5B14]">
                Personalización Manual del Entorno
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-3">
                  <span className="font-semibold text-[#2A2015]">Barra Lateral (Menú)</span>
                  <input
                    type="color"
                    value={theme.sidebarBg}
                    onChange={(e) =>
                      updateConfig({ theme: { ...theme, presetId: 'custom', sidebarBg: e.target.value } })
                    }
                    className="h-7 w-10 cursor-pointer border-0 bg-transparent"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-3">
                  <span className="font-semibold text-[#2A2015]">Texto Barra Lateral</span>
                  <input
                    type="color"
                    value={theme.sidebarText}
                    onChange={(e) =>
                      updateConfig({ theme: { ...theme, presetId: 'custom', sidebarText: e.target.value } })
                    }
                    className="h-7 w-10 cursor-pointer border-0 bg-transparent"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-3">
                  <span className="font-semibold text-[#2A2015]">Barra Superior</span>
                  <input
                    type="color"
                    value={theme.topbarBg}
                    onChange={(e) =>
                      updateConfig({ theme: { ...theme, presetId: 'custom', topbarBg: e.target.value } })
                    }
                    className="h-7 w-10 cursor-pointer border-0 bg-transparent"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-3">
                  <span className="font-semibold text-[#2A2015]">Dorado / Color Activo</span>
                  <input
                    type="color"
                    value={theme.accentColor}
                    onChange={(e) =>
                      updateConfig({ theme: { ...theme, presetId: 'custom', accentColor: e.target.value } })
                    }
                    className="h-7 w-10 cursor-pointer border-0 bg-transparent"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-3 sm:col-span-2">
                  <span className="font-semibold text-[#2A2015]">Fondo General del Área de Trabajo</span>
                  <input
                    type="color"
                    value={theme.canvasBg}
                    onChange={(e) =>
                      updateConfig({ theme: { ...theme, presetId: 'custom', canvasBg: e.target.value } })
                    }
                    className="h-7 w-10 cursor-pointer border-0 bg-transparent"
                  />
                </label>
              </div>
            </div>

            {/* Room State Colors */}
            <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-[#7A5B14]">
                Colores de Estado de Suites y Habitaciones
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(Object.keys(state.config.coloresEstado) as RoomStatus[]).map((st) => (
                  <label
                    key={st}
                    className="flex items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-3"
                  >
                    <span className="font-semibold text-[#2A2015]">{st.replace('_', ' ')}</span>
                    <input
                      type="color"
                      value={state.config.coloresEstado[st]}
                      onChange={(e) =>
                        updateConfig({
                          coloresEstado: { ...state.config.coloresEstado, [st]: e.target.value },
                        })
                      }
                      className="h-7 w-10 cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'RESERVAS' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Reservation Design Controls */}
          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 lg:col-span-5 space-y-4 text-xs">
            <h3 className="font-luxury text-lg font-bold text-[#2A2015]">
              Personalizar Sistema de Reservas Web
            </h3>

            <div>
              <label className="mb-1.5 block font-semibold text-[#473824]">Estilo Visual del Motor</label>
              <div className="grid grid-cols-3 gap-2">
                {(['moderno', 'clasico', 'minimal'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => updateConfig({ reservaWebDesign: { ...webDesign, layoutStyle: st } })}
                    className={`rounded-lg border py-2 font-semibold capitalize ${
                      webDesign.layoutStyle === st
                        ? 'border-[#B8891F] bg-[#FBF5E6] text-[#7A5B14]'
                        : 'border-[#E6DBC4] text-[#5E4A2D] hover:bg-[#FAF7F0]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-2.5">
                <span className="font-semibold text-[#2A2015]">Cabecera</span>
                <input
                  type="color"
                  value={webDesign.headerBg}
                  onChange={(e) =>
                    updateConfig({ reservaWebDesign: { ...webDesign, headerBg: e.target.value } })
                  }
                  className="h-6 w-8 cursor-pointer border-0 bg-transparent"
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-2.5">
                <span className="font-semibold text-[#2A2015]">Fondo Portal</span>
                <input
                  type="color"
                  value={state.config.reservaWebBg}
                  onChange={(e) => updateConfig({ reservaWebBg: e.target.value })}
                  className="h-6 w-8 cursor-pointer border-0 bg-transparent"
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-2.5">
                <span className="font-semibold text-[#2A2015]">Texto</span>
                <input
                  type="color"
                  value={state.config.reservaWebText}
                  onChange={(e) => updateConfig({ reservaWebText: e.target.value })}
                  className="h-6 w-8 cursor-pointer border-0 bg-transparent"
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] p-2.5">
                <span className="font-semibold text-[#2A2015]">Botón Dorado</span>
                <input
                  type="color"
                  value={state.config.reservaWebAccent}
                  onChange={(e) => updateConfig({ reservaWebAccent: e.target.value })}
                  className="h-6 w-8 cursor-pointer border-0 bg-transparent"
                />
              </label>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-[#473824]">Título Banner Principal</label>
              <input
                type="text"
                value={webDesign.bannerTitle}
                onChange={(e) =>
                  updateConfig({ reservaWebDesign: { ...webDesign, bannerTitle: e.target.value } })
                }
                className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-[#473824]">Subtítulo Promocional</label>
              <input
                type="text"
                value={webDesign.bannerSubtitle}
                onChange={(e) =>
                  updateConfig({ reservaWebDesign: { ...webDesign, bannerSubtitle: e.target.value } })
                }
                className="w-full rounded-lg border border-[#DECFA8] bg-white px-3 py-2"
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] px-3 py-2">
                <span className="font-medium text-[#2A2015]">Mostrar fotografías de suites</span>
                <input
                  type="checkbox"
                  checked={webDesign.showRoomPhotos}
                  onChange={(e) =>
                    updateConfig({
                      reservaWebDesign: { ...webDesign, showRoomPhotos: e.target.checked },
                    })
                  }
                  className="h-4 w-4 accent-[#B8891F]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#E6DBC4] bg-[#FAF7F0] px-3 py-2">
                <span className="font-medium text-[#2A2015]">Mostrar lista de servicios incluidos</span>
                <input
                  type="checkbox"
                  checked={webDesign.showAmenities}
                  onChange={(e) =>
                    updateConfig({
                      reservaWebDesign: { ...webDesign, showAmenities: e.target.checked },
                    })
                  }
                  className="h-4 w-4 accent-[#B8891F]"
                />
              </label>
            </div>
          </div>

          {/* Live Preview of Booking Engine */}
          <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7A5B14]">
                <Eye className="h-3.5 w-3.5 text-[#B8891F]" />
                Vista Previa en Vivo · Motor de Reservas ({webDesign.layoutStyle})
              </span>
            </div>

            <div
              className={`overflow-hidden border border-[#E2D2AF] shadow-sm ${
                webDesign.layoutStyle === 'clasico'
                  ? 'rounded-md'
                  : webDesign.layoutStyle === 'minimal'
                    ? 'rounded-none'
                    : 'rounded-2xl'
              }`}
              style={{ backgroundColor: state.config.reservaWebBg, color: state.config.reservaWebText }}
            >
              <div
                className="flex items-center justify-between border-b border-[#E2D2AF] px-5 py-4 text-[#2A2015]"
                style={{ backgroundColor: webDesign.headerBg }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={state.config.logo}
                    alt={state.config.nombreComercial}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full border border-[#C89B2B] bg-white object-cover"
                  />
                  <div>
                    <p className="font-luxury text-base font-bold">{webDesign.bannerTitle}</p>
                    <p className="text-[11px] opacity-80">{webDesign.bannerSubtitle}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                {state.roomTypes.slice(0, 2).map((rt) => (
                  <div
                    key={rt.id}
                    className={`overflow-hidden border border-[#E6DBC4] bg-white text-[#2A2015] ${
                      webDesign.layoutStyle === 'clasico' ? 'rounded-md' : 'rounded-xl'
                    }`}
                  >
                    {webDesign.showRoomPhotos && (
                      <img
                        src={rt.foto}
                        alt={rt.nombre}
                        referrerPolicy="no-referrer"
                        className="h-28 w-full object-cover"
                      />
                    )}
                    <div className="space-y-2 p-3.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <strong className="text-[#2A2015]">{rt.nombre}</strong>
                        <span
                          className="shrink-0 font-mono font-bold"
                          style={{ color: state.config.reservaWebAccent }}
                        >
                          S/ {rt.precioDefecto}
                        </span>
                      </div>
                      {webDesign.showAmenities && (
                        <p className="text-[11px] text-[#6E5D47]">
                          {rt.serviciosIncluidos.slice(0, 3).join(' · ')}
                        </p>
                      )}
                      <button
                        type="button"
                        className="w-full rounded-lg py-2 text-xs font-bold text-white"
                        style={{ backgroundColor: state.config.reservaWebAccent }}
                      >
                        Reservar Suite
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
