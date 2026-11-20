import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, Lock, ShieldCheck, User, UserCheck } from 'lucide-react';
import { usePMS } from '../../store/PMSContext';
import { DevConsoleModal } from '../common/DevConsoleModal';

const CHUSPA_LOGO = '/assets/aistudio/CHUSPITA-circulo_6e5e56f2.png';

export const LoginScreen: React.FC = () => {
  const { state, login, setActiveShiftId } = usePMS();

  const [username, setUsername] = useState('LA CHUSPA TECH');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');
  const [devConsoleOpen, setDevConsoleOpen] = useState(false);
  const logoClicksRef = useRef(0);
  const logoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && e.shiftKey && e.key.toLowerCase() === 'd') ||
        (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd')
      ) {
        e.preventDefault();
        setDevConsoleOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogoTap = () => {
    logoClicksRef.current += 1;
    if (logoTimerRef.current) window.clearTimeout(logoTimerRef.current);
    if (logoClicksRef.current >= 5) {
      logoClicksRef.current = 0;
      setDevConsoleOpen(true);
      return;
    }
    logoTimerRef.current = window.setTimeout(() => {
      logoClicksRef.current = 0;
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const ok = login(username, password);
    if (!ok) {
      setErrorMsg('Credenciales inválidas o usuario inactivo.');
    }
  };

  const handleQuickFill = (role: 'ADMIN' | 'RECEPCION') => {
    setErrorMsg('');
    if (role === 'ADMIN') {
      setUsername('LA CHUSPA TECH');
      setPassword('admin123');
    } else {
      setUsername('RECEPCION1');
      setPassword('recep123');
    }
  };

  const accent = state.config.theme.accentColor || '#B8891F';

  return (
    <div
      className="flex min-h-screen flex-col justify-between px-4 py-8"
      style={{
        background: `radial-gradient(circle at top, #FFFDF8 0%, ${state.config.theme.canvasBg || '#FAF7F0'} 60%, #EFE6D5 100%)`,
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="overflow-hidden rounded-2xl border border-[#E2D2AF] bg-[#FFFDF9] shadow-xl">
          {/* Luxury Champagne & Gold Brand Header */}
          <div
            className="border-b border-[#E4D5B3] px-6 py-7 text-center"
            style={{
              background: 'linear-gradient(145deg, #FBF6EA 0%, #EFE2C4 100%)',
            }}
          >
            <div
              onClick={handleLogoTap}
              className="mx-auto flex h-22 w-22 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-[#C89B2B] bg-white p-0.5 shadow-md"
            >
              <img
                src={state.config.logo || CHUSPA_LOGO}
                alt={state.config.nombreComercial}
                referrerPolicy="no-referrer"
                className="h-full w-full rounded-full object-cover"
              />
            </div>
            <h1 className="font-luxury mt-3 text-2xl font-bold tracking-wide text-[#2A2015]">
              {state.config.nombreComercial}
            </h1>
            <p className="mt-0.5 text-xs font-medium tracking-wider text-[#7A5B14]">
              {state.config.nombreAdicional}
            </p>
            <p className="mt-1 font-mono text-[11px] font-semibold text-[#5E4A2D]">
              RUC {state.config.ruc} · {state.config.razonSocial}
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-5 p-6">
            <div className="text-center">
              <h2 className="font-luxury text-lg font-bold text-[#2A2015]">
                Acceso Exclusivo de Personal
              </h2>
              <p className="mt-0.5 text-xs text-[#6E5D47]">
                Permisos configurados según el cargo asignado
              </p>
            </div>

            {/* Quick Role Selector Buttons */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('ADMIN')}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                  username.toUpperCase() === 'LA CHUSPA TECH' ||
                  username.toUpperCase() === 'ADMINISTRADOR'
                    ? 'border-[#B8891F] bg-[#FBF5E6]'
                    : 'border-[#E6DBC4] bg-[#FAF7F0] hover:bg-[#F4EDE0]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 font-bold text-[#2A2015]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#B8891F]" />
                  Administrador
                </span>
                <span className="mt-0.5 text-[11px] text-[#6E5D47]">Todos los módulos</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('RECEPCION')}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                  username.toUpperCase().startsWith('RECEPCION')
                    ? 'border-[#B8891F] bg-[#FBF5E6]'
                    : 'border-[#E6DBC4] bg-[#FAF7F0] hover:bg-[#F4EDE0]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 font-bold text-[#2A2015]">
                  <UserCheck className="h-3.5 w-3.5 text-[#9A7214]" />
                  Recepcionista
                </span>
                <span className="mt-0.5 text-[11px] text-[#6E5D47]">Solo parte operativa</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-[#473824]">Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-[#9A7214]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="LA CHUSPA TECH o RECEPCION1"
                    className="w-full rounded-xl border border-[#DECFA8] bg-white pl-9 pr-3 py-2 font-mono text-xs font-semibold text-[#2A2015] focus:border-[#B8891F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#473824]">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#9A7214]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#DECFA8] bg-white pl-9 pr-3 py-2 font-mono text-xs text-[#2A2015] focus:border-[#B8891F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#473824]">Turno de Trabajo</label>
                <select
                  value={state.activeShiftId}
                  onChange={(e) => setActiveShiftId(e.target.value)}
                  className="w-full rounded-xl border border-[#DECFA8] bg-white px-3 py-2 text-xs font-medium text-[#2A2015] focus:border-[#B8891F] focus:outline-none"
                >
                  {state.config.shifts.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {sh.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              {errorMsg && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95"
                style={{
                  background: `linear-gradient(135deg, ${accent} 0%, #8E6710 100%)`,
                }}
              >
                Ingresar al Sistema Luxury
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* La Chuspa Tech Attribution Link */}
            <div className="border-t border-[#ECE1CA] pt-4">
              <a
                href="https://www.lachuspaanuncios.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E4D5B3] bg-[#FBF6EA] px-3.5 py-2.5 transition-colors hover:border-[#B8891F] hover:bg-[#F5EBD2]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={CHUSPA_LOGO}
                    alt="La Chuspa Tech"
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 shrink-0 rounded-full border border-[#C89B2B] bg-white object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-wider text-[#7A5B14]">
                      Plataforma Desarrollada por
                    </p>
                    <p className="truncate text-xs font-bold text-[#2A2015]">La Chuspa Tech</p>
                    <p className="truncate text-[11px] font-semibold text-[#9A7214]">
                      www.lachuspaanuncios.com
                    </p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-[#9A7214]" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <DevConsoleModal open={devConsoleOpen} onClose={() => setDevConsoleOpen(false)} />
    </div>
  );
};
