import React, { useMemo, useState } from 'react';
import {
  BellOff,
  Cpu,
  DoorOpen,
  KeyRound,
  Lightbulb,
  Lock,
  Sparkles,
  Thermometer,
  UserCheck,
  UserX,
  Wrench,
  Zap,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type { RoomDeviceState } from '../../types/pms';

export const GrmsDomoticaModule: React.FC = () => {
  const {
    state,
    updateRoomDevice,
    toggleMobileKey,
    logAcsAccess,
    reportPreventiveIoTMaintenance,
    notify,
  } = usePMS();

  const [filterMode, setFilterMode] = useState<'ALL' | 'OCUPADO' | 'VACIAS_PARA_LIMPIAR'>('ALL');

  const roomsWithDevices = useMemo(() => {
    return state.rooms.map((room) => {
      const dev: RoomDeviceState = state.roomDevices.find((d) => d.roomId === room.id) || {
        roomId: room.id,
        roomNumber: room.numero,
        temperaturaObjetivo: 20,
        temperaturaActual: 20,
        aireModo: room.status === 'OCUPADO' ? 'CONFORT' : 'ECO',
        luces: room.status === 'OCUPADO' ? 'ENCENDIDAS' : 'APAGADAS',
        cortinas: 'CERRADAS',
        cartelDigital: 'NINGUNO',
        sensorPresencia: room.status === 'OCUPADO' ? 'CON_HUESPED' : 'VACIA_SIN_MOVIMIENTO',
        consumoKwh: 0.5,
        llaveMovilActiva: false,
        ultimaActualizacion: new Date().toISOString(),
      };
      const stay = state.stays.find((s) => s.roomId === room.id && s.status === 'ACTIVA');
      return { room, dev, stay };
    });
  }, [state.rooms, state.roomDevices, state.stays]);

  const emptyOccupiedForHousekeeping = useMemo(
    () =>
      roomsWithDevices.filter(
        ({ room, dev }) =>
          (room.status === 'OCUPADO' && dev.sensorPresencia === 'VACIA_SIN_MOVIMIENTO' && dev.cartelDigital !== 'NO_MOLESTAR') ||
          dev.cartelDigital === 'LIMPIAR_AHORA'
      ),
    [roomsWithDevices]
  );

  const visibleItems = roomsWithDevices.filter(({ room, dev }) => {
    if (filterMode === 'OCUPADO') return room.status === 'OCUPADO';
    if (filterMode === 'VACIAS_PARA_LIMPIAR') {
      return (
        (room.status === 'OCUPADO' && dev.sensorPresencia === 'VACIA_SIN_MOVIMIENTO') ||
        dev.cartelDigital === 'LIMPIAR_AHORA'
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
        <div>
          <h2 className="font-luxury text-lg font-bold text-[#2A2015] flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[#9A6E0E]" />
            GRMS Domótica IoT, Sensores de Presencia & Accesos ACS (Llaves Móviles)
          </h2>
          <p className="text-xs text-[#6E5D47]">
            Control de clima e iluminación conectado al Check-In/Out, cartel digital No Molestar/Limpiar, alertas CMMS y bitácora de cerraduras NFC
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'ALL', label: 'Todas las Habitaciones' },
            { id: 'OCUPADO', label: 'Solo Ocupadas' },
            { id: 'VACIAS_PARA_LIMPIAR', label: `Listas p/ Limpiar sin Molestar (${emptyOccupiedForHousekeeping.length})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterMode(f.id as typeof filterMode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                filterMode === f.id
                  ? 'bg-[#3A2B18] text-white'
                  : 'border border-[#E2D2AF] bg-white text-[#5C4A33] hover:bg-[#FBF6EA]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Housekeeping IoT Presence Sync Banner */}
      {emptyOccupiedForHousekeeping.length > 0 && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-emerald-900">
            <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Sensores IoT → Housekeeping:</strong>{' '}
              {emptyOccupiedForHousekeeping.map((x) => `Hab. ${x.room.numero}`).join(', ')}{' '}
              detectadas sin huésped en cuarto o con solicitud de limpieza activa (sin molestar).
            </span>
          </div>
        </div>
      )}

      {/* Room IoT Devices Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map(({ room, dev, stay }) => (
          <div
            key={room.id}
            className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-3.5 shadow-xs space-y-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#3A2B18] px-2.5 py-1 font-mono font-bold text-white">
                  Hab. {room.numero}
                </span>
                <span className="text-[11px] font-bold text-[#5C4A33]">{room.status}</span>
              </div>

              {/* IoT Presence Sensor Toggle */}
              <button
                type="button"
                onClick={() =>
                  updateRoomDevice(room.id, {
                    sensorPresencia:
                      dev.sensorPresencia === 'CON_HUESPED'
                        ? 'VACIA_SIN_MOVIMIENTO'
                        : 'CON_HUESPED',
                  })
                }
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${
                  dev.sensorPresencia === 'CON_HUESPED'
                    ? 'border-sky-300 bg-sky-50 text-sky-800'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                }`}
                title="Clic para simular cambio de sensor de movimiento/puerta"
              >
                {dev.sensorPresencia === 'CON_HUESPED' ? (
                  <>
                    <UserCheck className="h-3 w-3" /> Con Huésped
                  </>
                ) : (
                  <>
                    <UserX className="h-3 w-3" /> Vacía (IoT)
                  </>
                )}
              </button>
            </div>

            {stay && (
              <p className="truncate font-semibold text-[#2A2015]">{stay.guestName}</p>
            )}

            {/* Climate & Energy */}
            <div className="rounded-lg border border-[#EFE4CB] bg-[#FBF6EA] p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 font-semibold text-[#3A2B18]">
                  <Thermometer className="h-3.5 w-3.5 text-[#9A6E0E]" />
                  Clima: {dev.temperaturaObjetivo}°C ({dev.aireModo})
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#6E5D47]">
                  <Zap className="h-3 w-3 text-[#9A6E0E]" /> {dev.consumoKwh.toFixed(1)} kWh
                </span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateRoomDevice(room.id, {
                        temperaturaObjetivo: Math.max(16, dev.temperaturaObjetivo - 1),
                      })
                    }
                    className="rounded border border-[#E2D2AF] bg-white px-2 py-0.5 font-bold hover:bg-[#F3E9D2]"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateRoomDevice(room.id, {
                        temperaturaObjetivo: Math.min(28, dev.temperaturaObjetivo + 1),
                      })
                    }
                    className="rounded border border-[#E2D2AF] bg-white px-2 py-0.5 font-bold hover:bg-[#F3E9D2]"
                  >
                    +
                  </button>
                </div>
                <div className="flex gap-1">
                  {(['CONFORT', 'ECO', 'APAGADO'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateRoomDevice(room.id, { aireModo: m })}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        dev.aireModo === m
                          ? 'bg-[#9A6E0E] text-white'
                          : 'border border-[#E2D2AF] bg-white text-[#5C4A33]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lights, Curtains & Digital Signage */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  updateRoomDevice(room.id, {
                    luces:
                      dev.luces === 'ENCENDIDAS'
                        ? 'TENUE'
                        : dev.luces === 'TENUE'
                          ? 'APAGADAS'
                          : 'ENCENDIDAS',
                  })
                }
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E2D2AF] bg-white py-1.5 text-[11px] font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
              >
                <Lightbulb className="h-3.5 w-3.5 text-[#9A6E0E]" />
                Luz: {dev.luces}
              </button>

              <button
                type="button"
                onClick={() => {
                  const next =
                    dev.cartelDigital === 'NINGUNO'
                      ? 'NO_MOLESTAR'
                      : dev.cartelDigital === 'NO_MOLESTAR'
                        ? 'LIMPIAR_AHORA'
                        : 'NINGUNO';
                  updateRoomDevice(room.id, { cartelDigital: next });
                  notify('info', `Cartel digital Hab. ${room.numero}: ${next.replace(/_/g, ' ')}`);
                }}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-bold ${
                  dev.cartelDigital === 'NO_MOLESTAR'
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : dev.cartelDigital === 'LIMPIAR_AHORA'
                      ? 'border-sky-300 bg-sky-50 text-sky-800'
                      : 'border-[#E2D2AF] bg-white text-[#5C4A33]'
                }`}
              >
                <BellOff className="h-3.5 w-3.5" />
                {dev.cartelDigital === 'NINGUNO'
                  ? 'Cartel: Normal'
                  : dev.cartelDigital === 'NO_MOLESTAR'
                    ? 'No Molestar'
                    : 'Limpiar Ahora'}
              </button>
            </div>

            {/* ACS Mobile Key & Preventive CMMS */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-[#EFE4CB] pt-2.5">
              <button
                type="button"
                onClick={() => toggleMobileKey(room.id, !dev.llaveMovilActiva)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                  dev.llaveMovilActiva
                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                    : 'border border-[#E2D2AF] bg-white text-[#3A2B18] hover:bg-[#FBF6EA]'
                }`}
              >
                {dev.llaveMovilActiva ? (
                  <>
                    <KeyRound className="h-3 w-3" /> {dev.llaveMovilCodigo || 'NFC Activa'}
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" /> Emitir Llave NFC
                  </>
                )}
              </button>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    logAcsAccess({
                      roomId: room.id,
                      roomNumber: room.numero,
                      actor: stay?.guestName || 'RECEPCIÓN REMOTA',
                      rolActor: stay ? 'HUESPED_MOVIL' : 'RECEPCION',
                      metodo: stay ? 'LLAVE_MOVIL_NFC' : 'APERTURA_REMOTA',
                      autorizado: true,
                    });
                    notify('success', `Puerta Hab. ${room.numero} abierta vía ACS`);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E2D2AF] bg-white px-2 py-1.5 text-[10px] font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
                  title="Simular apertura remota / NFC"
                >
                  <DoorOpen className="h-3 w-3 text-[#9A6E0E]" />
                  Abrir
                </button>
                <button
                  type="button"
                  onClick={() =>
                    reportPreventiveIoTMaintenance(
                      room.id,
                      `Consumo anómalo HVAC (${(dev.consumoKwh + 3.4).toFixed(1)} kWh) detectado por sensor GRMS`
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-900 hover:bg-amber-100"
                  title="Crear ticket preventivo CMMS por sensor IoT"
                >
                  <Wrench className="h-3 w-3" />
                  CMMS
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ACS Access Audit Log */}
      <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-4 shadow-xs space-y-2.5">
        <h3 className="font-luxury text-sm font-bold text-[#2A2015] flex items-center gap-1.5">
          <KeyRound className="h-4 w-4 text-[#9A6E0E]" />
          Bitácora de Control de Accesos Electrónico (Cerraduras Inteligentes ACS)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2D2AF] bg-[#FBF6EA] text-[#3A2B18]">
                <th className="px-3 py-2">Fecha y Hora</th>
                <th className="px-3 py-2">Habitación</th>
                <th className="px-3 py-2">Usuario / Actor</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Método de Apertura</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4CB]">
              {state.acsAccessLogs.slice(0, 15).map((log) => (
                <tr key={log.id} className="hover:bg-[#FCF8EE]">
                  <td className="px-3 py-2 font-mono text-[11px] text-[#6E5D47]">
                    {log.fecha.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="px-3 py-2 font-mono font-bold text-[#2A2015]">
                    Hab. {log.roomNumber}
                  </td>
                  <td className="px-3 py-2 font-semibold text-[#2A2015]">{log.actor}</td>
                  <td className="px-3 py-2 text-[11px] text-[#5C4A33]">
                    {log.rolActor.replace(/_/g, ' ')}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[#9A6E0E]">
                    {log.metodo.replace(/_/g, ' ')}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {log.autorizado ? 'AUTORIZADO' : 'DENEGADO'}
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
};
