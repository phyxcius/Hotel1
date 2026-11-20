import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Bot,
  CheckCircle2,
  Clock,
  Compass,
  Fingerprint,
  Globe,
  KeyRound,
  Luggage,
  MessageSquare,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import type { CrmThread, GuestLanguage, MedicalAlert } from '../../types/pms';
import { formatCurrency } from '../../utils/exportCsv';

const LANG_LABELS: Record<GuestLanguage, string> = {
  ES: 'Español',
  EN: 'English',
  DE: 'Deutsch',
  JP: '日本語',
  FR: 'Français',
  PT: 'Português',
};

const CANAL_BADGE: Record<CrmThread['canal'], string> = {
  WHATSAPP: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  INSTAGRAM: 'bg-pink-50 text-pink-800 border-pink-200',
  WEB: 'bg-sky-50 text-sky-800 border-sky-200',
  SMS: 'bg-amber-50 text-amber-800 border-amber-200',
};

export const CrmWhatsAppModule: React.FC = () => {
  const {
    state,
    ensureCrmThread,
    sendCrmMessage,
    simulateGuestCrmCommand,
    sendBiometricPreCheckIn,
    verifyBiometricAndIssueKey,
    approveLateCheckOutFromCrm,
    saveGuest,
    notify,
  } = usePMS();

  const [selectedThreadId, setSelectedThreadId] = useState<string>(
    state.crmThreads[0]?.id || ''
  );
  const [replyText, setReplyText] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [newChatGuestId, setNewChatGuestId] = useState('');
  const [newChatCanal, setNewChatCanal] = useState<CrmThread['canal']>('WHATSAPP');
  const [newChatLang, setNewChatLang] = useState<GuestLanguage>('ES');

  // Simulator controls
  const [simWakeTime, setSimWakeTime] = useState('06:30');
  const [simTourPkgId, setSimTourPkgId] = useState(state.tourPackages[1]?.id || state.tourPackages[0]?.id || '');
  const [simTourPax, setSimTourPax] = useState(2);
  const [simProductId, setSimProductId] = useState(state.products[4]?.id || state.products[0]?.id || '');
  const [simGuestCustomText, setSimGuestCustomText] = useState('');

  // Guest CRM Preferences modal
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [prefLang, setPrefLang] = useState<GuestLanguage>('ES');
  const [prefAllergies, setPrefAllergies] = useState('');
  const [prefMedical, setPrefMedical] = useState('');
  const [prefWake, setPrefWake] = useState('07:00');
  const [prefRoom, setPrefRoom] = useState('');

  const activeThread = useMemo(
    () =>
      state.crmThreads.find((t) => t.id === selectedThreadId) || state.crmThreads[0] || null,
    [state.crmThreads, selectedThreadId]
  );

  const activeGuest = useMemo(
    () => (activeThread?.guestId ? state.guests.find((g) => g.id === activeThread.guestId) : undefined),
    [activeThread, state.guests]
  );

  const activeStay = useMemo(
    () =>
      activeThread?.stayId
        ? state.stays.find((s) => s.id === activeThread.stayId && s.status === 'ACTIVA')
        : undefined,
    [activeThread, state.stays]
  );

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;
    sendCrmMessage(activeThread.id, replyText.trim(), 'STAFF');
    setReplyText('');
  };

  const handleOpenNewThread = (e: React.FormEvent) => {
    e.preventDefault();
    const g = state.guests.find((x) => x.id === newChatGuestId);
    if (!g) {
      notify('warning', 'Seleccione un huésped');
      return;
    }
    const stay = state.stays.find((s) => s.guestId === g.id && s.status === 'ACTIVA');
    const created = ensureCrmThread({
      guestId: g.id,
      guestName: g.nombres,
      telefono: g.celular || '+51 984 000 000',
      stayId: stay?.id,
      roomId: stay?.roomId,
      roomNumber: stay?.roomNumber,
      idioma: g.idiomaPreferido || newChatLang,
      canal: newChatCanal,
    });
    setSelectedThreadId(created.id);
    setShowNewThreadModal(false);
  };

  const openEditPrefs = () => {
    if (!activeGuest) return;
    setPrefLang(activeGuest.idiomaPreferido || activeThread?.idiomaHuesped || 'ES');
    setPrefAllergies(activeGuest.alergias || '');
    setPrefMedical(activeGuest.condicionesMedicas || '');
    setPrefWake(activeGuest.horaDespertadorHabitual || '07:00');
    setPrefRoom(activeGuest.preferenciasHabitacion || '');
    setEditingPrefs(true);
  };

  const saveGuestPrefs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGuest) return;
    saveGuest({
      ...activeGuest,
      idiomaPreferido: prefLang,
      alergias: prefAllergies.trim(),
      condicionesMedicas: prefMedical.trim(),
      horaDespertadorHabitual: prefWake,
      preferenciasHabitacion: prefRoom.trim(),
    });
    setEditingPrefs(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] px-4 py-3 shadow-xs">
        <div>
          <h2 className="font-luxury text-lg font-bold text-[#2A2015] flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#9A6E0E]" />
            CRM Omnicanal & Agente IA WhatsApp
          </h2>
          <p className="text-xs text-[#6E5D47]">
            Traducción simultánea, Pre-Check-In biométrico, Llave Móvil NFC, upselling automático, tours y pedidos KDS
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoTranslate((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              autoTranslate
                ? 'border-[#9A6E0E] bg-[#FBF4E2] text-[#7E590A]'
                : 'border-[#E2D2AF] bg-white text-[#5C4A33]'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Traducción Simultánea: {autoTranslate ? 'ACTIVA' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => {
              setNewChatGuestId(state.guests[0]?.id || '');
              setShowNewThreadModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7E590A]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo Chat CRM
          </button>
        </div>
      </div>

      {/* 3-Column Omnichannel Hub */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left: Threads List */}
        <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-3 shadow-xs xl:col-span-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C4A33]">
              Bandeja Omnicanal ({state.crmThreads.length})
            </span>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {state.crmThreads.map((t) => {
              const isSelected = activeThread?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedThreadId(t.id)}
                  className={`w-full rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-[#9A6E0E] bg-[#FBF4E2] shadow-xs'
                      : 'border-[#EFE4CB] bg-white hover:bg-[#FCF8EE]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${CANAL_BADGE[t.canal]}`}>
                      {t.canal}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="rounded bg-[#EFE4CB] px-1.5 py-0.5 text-[9px] font-bold text-[#3A2B18]">
                        {t.idiomaHuesped}
                      </span>
                      {t.roomNumber && (
                        <span className="rounded bg-[#3A2B18] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                          Hab. {t.roomNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 truncate text-xs font-bold text-[#2A2015]">{t.guestName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#6E5D47]">{t.ultimoMensaje}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Multilingual Chat & AI Bot */}
        <div className="flex flex-col rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xs xl:col-span-5 min-h-[560px]">
          {activeThread ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE4CB] bg-[#FBF6EA] px-4 py-3 rounded-t-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#2A2015]">{activeThread.guestName}</h3>
                    <span className="rounded bg-[#9A6E0E]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#7E590A]">
                      Idioma: {LANG_LABELS[activeThread.idiomaHuesped]}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6E5D47]">
                    {activeThread.telefono} · {activeThread.roomNumber ? `Habitación ${activeThread.roomNumber}` : 'Pre-llegada / Sin habitación'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {activeThread.preCheckInBiometrico === 'VERIFICADO' ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">
                      <Fingerprint className="h-3 w-3" /> Biometría OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">
                      <Fingerprint className="h-3 w-3" /> {activeThread.preCheckInBiometrico}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4 bg-[#FAF6EC]/60 max-h-[430px]">
                {activeThread.messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#6E5D47]">
                    No hay mensajes aún. Envía un saludo o prueba una solicitud inteligente del huésped desde el panel derecho.
                  </div>
                ) : (
                  activeThread.messages.map((m) => {
                    const isGuest = m.sender === 'GUEST';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isGuest ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                            isGuest
                              ? 'border border-[#E2D2AF] bg-white text-[#2A2015]'
                              : m.sender === 'AGENT_AI'
                                ? 'bg-[#3A2B18] text-[#FAF7F0]'
                                : 'bg-[#9A6E0E] text-white'
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold opacity-80">
                            {isGuest ? (
                              <MessageSquare className="h-3 w-3" />
                            ) : (
                              <Bot className="h-3 w-3" />
                            )}
                            <span>
                              {isGuest
                                ? activeThread.guestName.split(' ')[0]
                                : m.sender === 'AGENT_AI'
                                  ? 'Agente IA WhatsApp'
                                  : 'Recepción'}
                            </span>
                            {m.actionTag && (
                              <span className="rounded bg-black/15 px-1.5 py-0.5 text-[9px]">
                                {m.actionTag}
                              </span>
                            )}
                          </div>
                          <p className="leading-relaxed">{m.textoOriginal}</p>
                          {autoTranslate &&
                            m.textoTraducidoEs &&
                            m.textoTraducidoEs !== m.textoOriginal && (
                              <div className="mt-1.5 border-t border-current/15 pt-1 text-[11px] italic opacity-90">
                                <span className="font-semibold not-italic">Traducción ES: </span>
                                {m.textoTraducidoEs}
                              </div>
                            )}
                        </div>
                        <span className="mt-0.5 px-1 text-[10px] text-[#8A775D]">
                          {new Date(m.timestamp).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleSendReply}
                className="flex items-center gap-2 border-t border-[#EFE4CB] bg-white p-3 rounded-b-xl"
              >
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Responder en Español (se traduce a ${LANG_LABELS[activeThread.idiomaHuesped]})...`}
                  className="flex-1 rounded-lg border border-[#E2D2AF] bg-[#FFFDF9] px-3 py-2 text-xs text-[#2A2015]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#9A6E0E] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#7E590A]"
                >
                  <Send className="h-3.5 w-3.5" />
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-[#6E5D47]">
              Seleccione una conversación para comenzar.
            </div>
          )}
        </div>

        {/* Right: Guest 360° Identity, Mobile Key, Preferences & Transactional AI Actions */}
        <div className="space-y-3 xl:col-span-4">
          {activeThread && (
            <>
              {/* Biometric Pre-check-in & NFC Digital Key */}
              <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#3A2B18] flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-[#9A6E0E]" />
                    Pre-Check-In Biométrico & Llave Móvil NFC
                  </h4>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      activeThread.llaveMovilActiva
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {activeThread.llaveMovilActiva ? 'LLAVE ACTIVA' : 'INACTIVA'}
                  </span>
                </div>

                {activeThread.llaveMovilCodigo && (
                  <div className="rounded-lg border border-[#EFE4CB] bg-[#FBF6EA] px-3 py-2 text-[11px] flex items-center justify-between">
                    <span className="font-mono font-bold text-[#2A2015]">
                      {activeThread.llaveMovilCodigo}
                    </span>
                    <span className="text-[#6E5D47]">
                      Vigencia: {activeThread.llaveExpira || 'Estadía activa'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => sendBiometricPreCheckIn(activeThread.id)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E2D2AF] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
                  >
                    <Fingerprint className="h-3.5 w-3.5 text-[#9A6E0E]" />
                    Enviar Link Selfie/DNI
                  </button>
                  <button
                    type="button"
                    onClick={() => verifyBiometricAndIssueKey(activeThread.id)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#3A2B18] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#2A2015]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#E5C158]" />
                    Validar & Emitir Llave
                  </button>
                </div>
              </div>

              {/* CRM Guest Profile Preferences & Allergies */}
              {activeGuest && (
                <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-3.5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#3A2B18]">
                      Perfil CRM & Salud del Huésped
                    </h4>
                    <button
                      type="button"
                      onClick={openEditPrefs}
                      className="text-[11px] font-bold text-[#9A6E0E] hover:underline"
                    >
                      Editar perfil CRM
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="rounded bg-[#FBF6EA] p-2">
                      <span className="text-[#6E5D47] block text-[10px]">Despertador Habitual</span>
                      <span className="font-bold text-[#2A2015]">
                        {activeGuest.horaDespertadorHabitual || 'No definido'}
                      </span>
                    </div>
                    <div className="rounded bg-[#FBF6EA] p-2">
                      <span className="text-[#6E5D47] block text-[10px]">Confort Habitación</span>
                      <span className="font-bold text-[#2A2015] truncate block">
                        {activeGuest.preferenciasHabitacion || 'Estándar 21°C'}
                      </span>
                    </div>
                  </div>
                  {(activeGuest.alergias || activeGuest.condicionesMedicas) && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900 flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-700" />
                      <div>
                        {activeGuest.alergias && <p><strong>Alergias:</strong> {activeGuest.alergias}</p>}
                        {activeGuest.condicionesMedicas && <p><strong>Médico:</strong> {activeGuest.condicionesMedicas}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interactive AI Agent Transactional Workflows */}
              <div className="rounded-xl border border-[#E2D2AF] bg-[#FFFDF9] p-3.5 shadow-xs space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#3A2B18] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#9A6E0E]" />
                  Flujos Autónomos del Agente WhatsApp
                </h4>
                <p className="text-[11px] text-[#6E5D47]">
                  Prueba solicitudes directas del huésped al agente IA (ejecutan cambios reales en el PMS):
                </p>

                {/* Wake-Up Bot Action */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={simWakeTime}
                    onChange={(e) => setSimWakeTime(e.target.value)}
                    className="rounded-lg border border-[#E2D2AF] px-2 py-1 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      simulateGuestCrmCommand(activeThread.id, 'WAKEUP', { wakeTime: simWakeTime })
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-[#E2D2AF] bg-[#FBF6EA] px-2.5 py-1.5 text-[11px] font-semibold text-[#3A2B18] hover:bg-[#F3E9D2]"
                  >
                    <BellRing className="h-3.5 w-3.5 text-[#9A6E0E]" />
                    Pedir Despertador PBX+WA
                  </button>
                </div>

                {/* Tour Package Request Action */}
                <div className="rounded-lg border border-[#EFE4CB] bg-[#FCF8EE] p-2 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={simTourPkgId}
                      onChange={(e) => setSimTourPkgId(e.target.value)}
                      className="flex-1 min-w-0 rounded border border-[#E2D2AF] bg-white px-2 py-1 text-[11px]"
                    >
                      {state.tourPackages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({formatCurrency(p.precioPorPax)}/pax)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={simTourPax}
                      onChange={(e) => setSimTourPax(Math.max(1, Number(e.target.value)))}
                      className="w-12 rounded border border-[#E2D2AF] bg-white px-1.5 py-1 text-center text-[11px]"
                      title="Cantidad de personas"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      simulateGuestCrmCommand(activeThread.id, 'TOUR', {
                        tourPackageId: simTourPkgId,
                        tourPax: simTourPax,
                      })
                    }
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#9A6E0E] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#7E590A]"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    Huésped pide Paquete Turístico (Reserva + Folio)
                  </button>
                </div>

                {/* Room Service KDS & Bell Boy */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      simulateGuestCrmCommand(activeThread.id, 'ROOM_SERVICE', {
                        productId: simProductId,
                      })
                    }
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E2D2AF] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5 text-[#9A6E0E]" />
                    Pedido a Cocina KDS
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      simulateGuestCrmCommand(activeThread.id, 'BELL_BOY', { bultos: 2 })
                    }
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E2D2AF] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#3A2B18] hover:bg-[#FBF6EA]"
                  >
                    <Luggage className="h-3.5 w-3.5 text-[#9A6E0E]" />
                    Pedir Bell Boy (Maletas)
                  </button>
                </div>

                {/* Upselling Late Check-Out */}
                <div className="rounded-lg border border-[#EFE4CB] bg-[#FBF6EA] p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => simulateGuestCrmCommand(activeThread.id, 'LATE_CHECKOUT')}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-[#E2D2AF] bg-white px-2 py-1 text-[11px] font-semibold text-[#3A2B18] hover:bg-[#F3E9D2]"
                    >
                      <Clock className="h-3 w-3 text-[#9A6E0E]" />
                      Simular "¿Late Check-Out?"
                    </button>
                    {activeStay && (
                      <button
                        type="button"
                        onClick={() =>
                          approveLateCheckOutFromCrm(
                            activeThread.id,
                            3,
                            3 * state.config.penalidadHoraExtra,
                            true
                          )
                        }
                        className="rounded bg-[#3A2B18] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#2A2015]"
                      >
                        Aprobar +3h ({formatCurrency(3 * state.config.penalidadHoraExtra)})
                      </button>
                    )}
                  </div>
                </div>

                {/* Medical / Oxygen SOS */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      simulateGuestCrmCommand(activeThread.id, 'MEDICAL_SOS', {
                        medicalType: 'OXIGENO' as MedicalAlert['tipo'],
                      })
                    }
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-100"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Solicitar Oxígeno SOS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!simGuestCustomText.trim()) return;
                      simulateGuestCrmCommand(activeThread.id, 'CUSTOM', {
                        customText: simGuestCustomText,
                      });
                      setSimGuestCustomText('');
                    }}
                    disabled={!simGuestCustomText.trim()}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E2D2AF] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#3A2B18] disabled:opacity-50"
                  >
                    Enviar Texto Huésped
                  </button>
                </div>

                <input
                  value={simGuestCustomText}
                  onChange={(e) => setSimGuestCustomText(e.target.value)}
                  placeholder='Ej: "Quiero tour Machu Picchu para 2" o "Despiértame 6am"'
                  className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-1.5 text-[11px]"
                />
                <div className="hidden">
                  <select value={simProductId} onChange={(e) => setSimProductId(e.target.value)}>
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Thread Modal */}
      {showNewThreadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFE4CB] pb-3">
              <h3 className="font-luxury text-base font-bold text-[#2A2015]">
                Iniciar Conversación CRM
              </h3>
              <button
                type="button"
                onClick={() => setShowNewThreadModal(false)}
                className="rounded-lg p-1 text-[#6E5D47] hover:bg-[#FBF6EA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleOpenNewThread} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-[#3A2B18]">Huésped</label>
                <select
                  value={newChatGuestId}
                  onChange={(e) => setNewChatGuestId(e.target.value)}
                  className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
                >
                  {state.guests.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombres} ({g.numDoc})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#3A2B18]">Canal</label>
                  <select
                    value={newChatCanal}
                    onChange={(e) => setNewChatCanal(e.target.value as CrmThread['canal'])}
                    className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
                  >
                    <option value="WHATSAPP">WhatsApp API</option>
                    <option value="INSTAGRAM">Instagram DM</option>
                    <option value="WEB">Chat Web</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#3A2B18]">Idioma Huésped</label>
                  <select
                    value={newChatLang}
                    onChange={(e) => setNewChatLang(e.target.value as GuestLanguage)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-3 py-2"
                  >
                    {Object.entries(LANG_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewThreadModal(false)}
                  className="rounded-lg border border-[#E2D2AF] px-4 py-2 font-semibold text-[#5C4A33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-bold text-white hover:bg-[#7E590A]"
                >
                  Abrir Hilo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit CRM Preferences Modal */}
      {editingPrefs && activeGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFE4CB] pb-3">
              <h3 className="font-luxury text-base font-bold text-[#2A2015]">
                Preferencias CRM · {activeGuest.nombres}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPrefs(false)}
                className="rounded-lg p-1 text-[#6E5D47] hover:bg-[#FBF6EA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveGuestPrefs} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#3A2B18]">Idioma Preferido</label>
                  <select
                    value={prefLang}
                    onChange={(e) => setPrefLang(e.target.value as GuestLanguage)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                  >
                    {Object.entries(LANG_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#3A2B18]">Despertador Habitual</label>
                  <input
                    type="time"
                    value={prefWake}
                    onChange={(e) => setPrefWake(e.target.value)}
                    className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-[#3A2B18]">Alergias Alimentarias / Fármacos</label>
                <input
                  value={prefAllergies}
                  onChange={(e) => setPrefAllergies(e.target.value)}
                  placeholder="Ej: Mariscos, penicilina, maní..."
                  className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-[#3A2B18]">Condiciones Médicas / Altura</label>
                <input
                  value={prefMedical}
                  onChange={(e) => setPrefMedical(e.target.value)}
                  placeholder="Ej: Sensibilidad a altura, hipertensión..."
                  className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-[#3A2B18]">Preferencias de Habitación</label>
                <input
                  value={prefRoom}
                  onChange={(e) => setPrefRoom(e.target.value)}
                  placeholder="Ej: 21°C, almohada extra, vista tranquila"
                  className="w-full rounded-lg border border-[#E2D2AF] px-2.5 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPrefs(false)}
                  className="rounded-lg border border-[#E2D2AF] px-4 py-2 font-semibold text-[#5C4A33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#9A6E0E] px-4 py-2 font-bold text-white hover:bg-[#7E590A]"
                >
                  Guardar Perfil CRM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
