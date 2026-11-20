import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  ALL_MODULES,
  INITIAL_PMS_STATE,
  RECEPTION_OPERATIONAL_MODULES,
  toYMD,
} from '../data/seedData';
import {
  DEFAULT_FIREBASE_RTDB_URL,
  fetchFirebaseState,
  hydrateStateFromSnapshot,
  saveFirebaseState,
  subscribeFirebaseState,
  testFirebaseConnection,
} from '../services/firebaseRtdb';
import type {
  Agency,
  AttendanceLog,
  AuthCode,
  BankDeposit,
  CleaningLog,
  DayKey,
  Employee,
  ExpenseRecord,
  Guest,
  HotelConfig,
  MaintenanceRecord,
  ModuleId,
  PaymentMethodName,
  PersonaNoGrata,
  PMSState,
  Product,
  ProductCategory,
  Purchase,
  RateTier,
  Reservation,
  ReservationStatus,
  Room,
  RoomAmenities,
  RoomStatus,
  RoomType,
  SaleRecord,
  StaffPosition,
  Stay,
  SupportTicket,
  SystemUser,
  VoucherType,
  WarehouseArea,
} from '../types/pms';

const STORAGE_KEY = 'lachuspa_pms_state_v2';
const AUTH_SESSION_KEY = 'lachuspa_pms_auth_v2';

export interface FirebaseSyncInfo {
  status: 'connecting' | 'synced' | 'syncing' | 'error';
  lastSyncAt: string | null;
  error: string | null;
  dbUrl: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
}

export interface CheckInPayload {
  roomId: string;
  guestId: string;
  guestOverride?: Guest;
  invitados: { id: string; nombres: string; doc: string }[];
  modalidad: 'NOCHES' | 'HORAS';
  cantidad: number;
  tarifaUnitaria: number;
  esCortesia: boolean;
  agencyId?: string;
  observaciones: string;
  montoPagarAhora: number;
  metodoPago: PaymentMethodName;
  voucherType: VoucherType;
  reservationId?: string;
}

export interface DirectSalePayload {
  items: { productId: string; descripcion: string; cantidad: number; precioUnitario: number }[];
  guestName: string;
  guestDoc?: string;
  metodoPago: PaymentMethodName;
  voucherType: VoucherType;
  area: WarehouseArea;
  roomId?: string; // if charged to a room
}

export interface FactoryResetOptions {
  wipeTransactions: boolean;
  wipeClients: boolean;
  zeroProductStocks: boolean;
  wipeProducts: boolean;
  wipeStaff: boolean;
  companyOverride?: {
    ruc: string;
    razonSocial: string;
    nombreComercial: string;
    direccionFiscal: string;
    telefono: string;
    correo: string;
  };
}

interface PMSContextValue {
  state: PMSState;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  notify: (type: ToastMessage['type'], title: string, description?: string) => void;
  activeUser: SystemUser;
  activeShiftName: string;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  hasModuleAccess: (mod: ModuleId) => boolean;
  setActiveUserId: (userId: string) => void;
  setActiveShiftId: (shiftId: string) => void;
  resetDemoData: () => void;
  factoryResetForClient: (options: FactoryResetOptions) => void;
  importStateJson: (jsonText: string) => boolean;
  firebaseSync: FirebaseSyncInfo;
  syncToFirebaseNow: () => Promise<boolean>;
  pullFromFirebaseNow: () => Promise<boolean>;
  testFirebase: (customUrl?: string) => Promise<boolean>;

  // Room Rate Helper
  getRoomRateForDate: (roomId: string, tier?: RateTier, date?: Date) => number;

  // Reception & Stay Flows
  checkInGuest: (payload: CheckInPayload) => Stay | null;
  addConsumptionToStay: (
    stayId: string,
    items: { productId: string; cantidad: number; precioUnitario: number }[],
    pagarAhora: boolean,
    metodoPago?: PaymentMethodName,
    voucherType?: VoucherType,
    area?: WarehouseArea
  ) => void;
  deliverRoomOrder: (stayId: string, consumptionId: string) => void;
  renewStay: (
    stayId: string,
    cantidad: number,
    modalidad: 'NOCHES' | 'HORAS',
    monto: number,
    pagarAhora: boolean,
    metodoPago: PaymentMethodName,
    voucherType: VoucherType
  ) => void;
  payStayBalance: (
    stayId: string,
    monto: number,
    metodoPago: PaymentMethodName,
    voucherType: VoucherType,
    concepto?: string
  ) => void;
  changeRoom: (stayId: string, targetRoomId: string) => void;
  checkOutStay: (
    stayId: string,
    finalPayment?: { monto: number; metodoPago: PaymentMethodName; voucherType: VoucherType }
  ) => boolean;

  // Reservations
  createReservation: (res: Omit<Reservation, 'id' | 'localizador'>) => Reservation;
  updateReservationStatus: (id: string, status: ReservationStatus) => void;
  deleteReservation: (id: string) => void;

  // Housekeeping & Maintenance
  setRoomStatus: (roomId: string, status: RoomStatus) => void;
  startCleaning: (roomId: string, staffId: string, observacion?: string) => void;
  completeCleaning: (roomId: string, observacion?: string) => void;
  createMaintenance: (rec: Omit<MaintenanceRecord, 'id' | 'estado'>) => void;
  resolveMaintenance: (id: string) => void;

  // POS & Billing & Cash
  createDirectSale: (payload: DirectSalePayload) => SaleRecord | null;
  voidSale: (saleId: string, motivo: string, authCode?: string) => boolean;
  closeCashRegister: (efectivoContado: number, observacion: string) => void;
  registerExpense: (exp: Omit<ExpenseRecord, 'id' | 'responsable'>) => void;
  registerBankDeposit: (dep: Omit<BankDeposit, 'id' | 'numEnvio'>) => void;

  // Inventory & Supply
  saveCategory: (cat: Omit<ProductCategory, 'id'> & { id?: string }) => void;
  saveProduct: (prod: Omit<Product, 'id'> & { id?: string }) => void;
  registerPurchase: (purchase: Omit<Purchase, 'id' | 'responsable'>) => void;
  registerStockDispatch: (params: {
    tipo: 'ENTREGA_PRODUCTOS' | 'AJUSTE_INGRESO' | 'AJUSTE_SALIDA';
    origen: WarehouseArea | 'AJUSTE';
    destino: WarehouseArea | 'AJUSTE';
    items: { productId: string; cantidad: number }[];
    observaciones: string;
  }) => boolean;

  // Guests, Agencies, Blacklist
  saveGuest: (guest: Omit<Guest, 'id' | 'fechaRegistro'> & { id?: string }) => Guest;
  deleteGuest: (id: string) => void;
  saveAgency: (agency: Omit<Agency, 'id'> & { id?: string }) => void;
  deleteAgency: (id: string) => void;
  savePersonaNoGrata: (png: Omit<PersonaNoGrata, 'id'>) => void;
  deletePersonaNoGrata: (id: string) => void;

  // Room Types & Room Rates
  saveRoomType: (rt: Omit<RoomType, 'id'> & { id?: string }) => void;
  createRoom: (room: Omit<Room, 'id'>) => void;
  updateRoomAmenities: (roomId: string, amenities: RoomAmenities) => void;
  updateRoomRate: (roomId: string, tier: RateTier, day: DayKey, value: number) => void;
  assignRoomType: (roomId: string, roomTypeId: string) => void;

  // HR & Attendance
  savePosition: (nombre: string) => void;
  saveEmployee: (emp: Omit<Employee, 'id'> & { id?: string }) => void;
  clockAttendance: (docOrId: string, action: 'INGRESO' | 'SALIDA' | 'INICIO_BREAK' | 'FIN_BREAK') => Employee | null;

  // Config, Security, Support
  updateConfig: (partial: Partial<HotelConfig>) => void;
  saveUser: (user: Omit<SystemUser, 'id'> & { id?: string }) => void;
  saveAuthCode: (code: Omit<AuthCode, 'id'>) => void;
  deleteAuthCode: (id: string) => void;
  createSupportTicket: (incidencia: string, detalle: string) => void;
}

const PMSContext = createContext<PMSContextValue | null>(null);

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const dayMap: DayKey[] = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

export const PMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PMSState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = hydrateStateFromSnapshot(JSON.parse(saved), INITIAL_PMS_STATE);
        if (parsed) {
          return {
            ...parsed,
            users: parsed.users.map((u) => {
              if (u.rol === 'ADMINISTRADOR') return { ...u, accesos: ALL_MODULES };
              if (u.rol === 'RECEPCION' && u.accesos.length >= ALL_MODULES.length - 2) {
                return { ...u, accesos: RECEPTION_OPERATIONAL_MODULES };
              }
              return u;
            }),
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_PMS_STATE;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(AUTH_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [firebaseSync, setFirebaseSync] = useState<FirebaseSyncInfo>({
    status: 'connecting',
    lastSyncAt: null,
    error: null,
    dbUrl: state.config.firebaseRtdbUrl || DEFAULT_FIREBASE_RTDB_URL,
  });

  const skipNextRemoteWriteRef = useRef(true);
  const initialHydrationDoneRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((type: ToastMessage['type'], title: string, description?: string) => {
    const id = genId('toast');
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const rtdbUrl = state.config.firebaseRtdbUrl || DEFAULT_FIREBASE_RTDB_URL;

  // Initial load from Firebase RTDB + real-time EventSource stream
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    const normalizeUserRoles = (incoming: PMSState): PMSState => ({
      ...incoming,
      users: incoming.users.map((u) => {
        if (u.rol === 'ADMINISTRADOR') return { ...u, accesos: ALL_MODULES };
        if (u.rol === 'RECEPCION' && u.accesos.length >= ALL_MODULES.length - 2) {
          return { ...u, accesos: RECEPTION_OPERATIONAL_MODULES };
        }
        return u;
      }),
    });

    const bootstrapFirebase = async () => {
      setFirebaseSync((prev) => ({ ...prev, status: 'connecting', dbUrl: rtdbUrl, error: null }));
      try {
        const res = await fetchFirebaseState(rtdbUrl, INITIAL_PMS_STATE);
        if (cancelled) return;

        if (res.exists && res.state) {
          skipNextRemoteWriteRef.current = true;
          setState(normalizeUserRoles(res.state));
          setFirebaseSync({
            status: 'synced',
            lastSyncAt: res.updatedAt || new Date().toISOString(),
            error: null,
            dbUrl: rtdbUrl,
          });
        } else {
          // Seed initial luxury state to Firebase RTDB if database is currently empty
          const saved = await saveFirebaseState(rtdbUrl, stateRef.current);
          if (cancelled) return;
          setFirebaseSync({
            status: 'synced',
            lastSyncAt: saved.updatedAt,
            error: null,
            dbUrl: rtdbUrl,
          });
        }
        initialHydrationDoneRef.current = true;

        unsubscribe = subscribeFirebaseState(
          rtdbUrl,
          INITIAL_PMS_STATE,
          (remoteState, updatedAt) => {
            if (cancelled) return;
            skipNextRemoteWriteRef.current = true;
            setState(normalizeUserRoles(remoteState));
            setFirebaseSync({
              status: 'synced',
              lastSyncAt: updatedAt,
              error: null,
              dbUrl: rtdbUrl,
            });
          },
          () => {
            if (!cancelled) {
              setFirebaseSync((prev) => ({
                ...prev,
                status: prev.status === 'synced' ? 'synced' : 'error',
              }));
            }
          }
        );
      } catch (err) {
        if (cancelled) return;
        initialHydrationDoneRef.current = true;
        setFirebaseSync({
          status: 'error',
          lastSyncAt: null,
          error: err instanceof Error ? err.message : 'Error conectando con Firebase RTDB',
          dbUrl: rtdbUrl,
        });
      }
    };

    bootstrapFirebase();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [rtdbUrl]);

  // Persist locally & debounced write-through to Firebase RTDB
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }

    if (!initialHydrationDoneRef.current) {
      return;
    }

    if (skipNextRemoteWriteRef.current) {
      skipNextRemoteWriteRef.current = false;
      return;
    }

    const timer = window.setTimeout(async () => {
      const targetUrl = stateRef.current.config.firebaseRtdbUrl || DEFAULT_FIREBASE_RTDB_URL;
      setFirebaseSync((prev) => ({ ...prev, status: 'syncing', dbUrl: targetUrl }));
      try {
        const res = await saveFirebaseState(targetUrl, stateRef.current);
        setFirebaseSync({
          status: 'synced',
          lastSyncAt: res.updatedAt,
          error: null,
          dbUrl: targetUrl,
        });
      } catch (err) {
        setFirebaseSync((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Error al sincronizar con Firebase',
          dbUrl: targetUrl,
        }));
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [state]);

  const syncToFirebaseNow = async (): Promise<boolean> => {
    const targetUrl = stateRef.current.config.firebaseRtdbUrl || DEFAULT_FIREBASE_RTDB_URL;
    setFirebaseSync((prev) => ({ ...prev, status: 'syncing', dbUrl: targetUrl, error: null }));
    try {
      const res = await saveFirebaseState(targetUrl, stateRef.current);
      setFirebaseSync({ status: 'synced', lastSyncAt: res.updatedAt, error: null, dbUrl: targetUrl });
      notify('success', 'Base de datos sincronizada con Firebase RTDB');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de sincronización';
      setFirebaseSync((prev) => ({ ...prev, status: 'error', error: msg, dbUrl: targetUrl }));
      notify('error', 'No se pudo sincronizar con Firebase', msg);
      return false;
    }
  };

  const pullFromFirebaseNow = async (): Promise<boolean> => {
    const targetUrl = stateRef.current.config.firebaseRtdbUrl || DEFAULT_FIREBASE_RTDB_URL;
    setFirebaseSync((prev) => ({ ...prev, status: 'connecting', dbUrl: targetUrl, error: null }));
    try {
      const res = await fetchFirebaseState(targetUrl, INITIAL_PMS_STATE);
      if (res.exists && res.state) {
        skipNextRemoteWriteRef.current = true;
        setState(res.state);
        setFirebaseSync({
          status: 'synced',
          lastSyncAt: res.updatedAt || new Date().toISOString(),
          error: null,
          dbUrl: targetUrl,
        });
        notify('success', 'Datos descargados desde Firebase RTDB');
        return true;
      }
      notify('info', 'La base de datos Firebase está vacía', 'Se mantuvieron los datos locales.');
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al descargar de Firebase';
      setFirebaseSync((prev) => ({ ...prev, status: 'error', error: msg, dbUrl: targetUrl }));
      notify('error', 'Error descargando desde Firebase', msg);
      return false;
    }
  };

  const testFirebase = async (customUrl?: string): Promise<boolean> => {
    const targetUrl = customUrl || stateRef.current.config.firebaseRtdbUrl || DEFAULT_FIREBASE_RTDB_URL;
    try {
      const res = await testFirebaseConnection(targetUrl);
      notify('success', 'Conexión Firebase exitosa', res.message);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión';
      notify('error', 'Falló la conexión con Firebase RTDB', msg);
      return false;
    }
  };

  const activeUser =
    state.users.find((u) => u.id === state.activeUserId) || state.users[0];

  const login = (username: string, password: string): boolean => {
    const normalizedInput = username.trim().toLowerCase();
    const u = state.users.find(
      (user) =>
        user.username.toLowerCase() === normalizedInput ||
        (normalizedInput === 'administrador' && user.rol === 'ADMINISTRADOR')
    );
    if (!u) {
      notify('error', 'Usuario no encontrado', 'Verifique el nombre de usuario.');
      return false;
    }
    if (!u.activo) {
      notify('error', 'Usuario inactivo', 'Contacte al administrador del sistema.');
      return false;
    }
    if (u.passwordHash !== password) {
      notify('error', 'Contraseña incorrecta', 'Verifique su clave de acceso.');
      return false;
    }
    setState((prev) => ({ ...prev, activeUserId: u.id }));
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, '1');
    } catch {
      // ignore
    }
    notify('success', `Bienvenido, ${u.nombreCompleto}`, `Cargo: ${u.rol}`);
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } catch {
      // ignore
    }
    notify('info', 'Sesión cerrada');
  };

  const hasModuleAccess = useCallback(
    (mod: ModuleId): boolean => {
      if (activeUser.rol === 'ADMINISTRADOR') return true;
      return activeUser.accesos.includes(mod);
    },
    [activeUser]
  );

  const activeShiftName =
    state.config.shifts.find((s) => s.id === state.activeShiftId)?.nombre ||
    state.config.shifts[0]?.nombre ||
    '1° Turno Día';

  const nextVoucherNumber = (sales: SaleRecord[], voucherType: VoucherType, cfg: HotelConfig) => {
    const serie =
      voucherType === 'FACTURA'
        ? cfg.serieFactura
        : voucherType === 'BOLETA'
          ? cfg.serieBoleta
          : cfg.serieTicket;
    const count = sales.filter((s) => s.voucherType === voucherType).length + 415;
    return `${serie}-${String(count).padStart(6, '0')}`;
  };

  const getRoomRateForDate = useCallback(
    (roomId: string, tier: RateTier = '24h', date = new Date()) => {
      const room = state.rooms.find((r) => r.id === roomId);
      if (!room) return 150;
      const dayKey = dayMap[date.getDay()];
      return room.rates[tier]?.[dayKey] ?? 150;
    },
    [state.rooms]
  );

  const setActiveUserId = (userId: string) => {
    setState((prev) => ({ ...prev, activeUserId: userId }));
    const u = state.users.find((x) => x.id === userId);
    if (u) notify('info', `Sesión cambiada a ${u.username}`);
  };

  const setActiveShiftId = (shiftId: string) => {
    setState((prev) => ({ ...prev, activeShiftId: shiftId }));
    const s = state.config.shifts.find((x) => x.id === shiftId);
    if (s) notify('info', `Turno activo: ${s.nombre}`);
  };

  const resetDemoData = () => {
    setState(INITIAL_PMS_STATE);
    localStorage.removeItem(STORAGE_KEY);
    notify('success', 'Datos demo restaurados', 'El sistema volvió al estado inicial de demostración.');
  };

  const factoryResetForClient = (options: FactoryResetOptions) => {
    setState((prev) => {
      const adminUser = prev.users.find((u) => u.rol === 'ADMINISTRADOR') || prev.users[0];

      const nextRooms = options.wipeTransactions
        ? prev.rooms.map((r) => ({ ...r, status: 'DISPONIBLE' as const, currentStayId: undefined }))
        : prev.rooms;

      const nextProducts = options.wipeProducts
        ? []
        : options.zeroProductStocks
          ? prev.products.map((p) => ({
              ...p,
              stocks: { ALMACEN_PRINCIPAL: 0, RECEPCION: 0, LIMPIEZA: 0, ROOFTOP: 0 },
            }))
          : prev.products;

      const nextConfig = options.companyOverride
        ? {
            ...prev.config,
            ruc: options.companyOverride.ruc.trim() || prev.config.ruc,
            razonSocial: options.companyOverride.razonSocial.trim().toUpperCase() || prev.config.razonSocial,
            nombreComercial:
              options.companyOverride.nombreComercial.trim().toUpperCase() || prev.config.nombreComercial,
            direccionFiscal:
              options.companyOverride.direccionFiscal.trim().toUpperCase() || prev.config.direccionFiscal,
            telefono: options.companyOverride.telefono.trim() || prev.config.telefono,
            correo: options.companyOverride.correo.trim().toUpperCase() || prev.config.correo,
          }
        : prev.config;

      return {
        ...prev,
        config: nextConfig,
        rooms: nextRooms,
        guests: options.wipeClients ? [] : prev.guests,
        agencies: options.wipeClients ? [] : prev.agencies,
        personasNoGratas: options.wipeClients ? [] : prev.personasNoGratas,
        stays: options.wipeTransactions ? [] : prev.stays,
        reservations: options.wipeTransactions ? [] : prev.reservations,
        cleaningLogs: options.wipeTransactions ? [] : prev.cleaningLogs,
        maintenanceRecords: options.wipeTransactions ? [] : prev.maintenanceRecords,
        purchases: options.wipeTransactions ? [] : prev.purchases,
        stockMovements: options.wipeTransactions ? [] : prev.stockMovements,
        sales: options.wipeTransactions ? [] : prev.sales,
        cashCloses: options.wipeTransactions ? [] : prev.cashCloses,
        expenses: options.wipeTransactions ? [] : prev.expenses,
        bankDeposits: options.wipeTransactions ? [] : prev.bankDeposits,
        attendanceLogs: options.wipeTransactions ? [] : prev.attendanceLogs,
        supportTickets: options.wipeTransactions ? [] : prev.supportTickets,
        categories: options.wipeProducts ? [] : prev.categories,
        products: nextProducts,
        employees: options.wipeStaff ? [] : prev.employees,
        users: options.wipeStaff && adminUser ? [adminUser] : prev.users,
        activeUserId: adminUser?.id || prev.activeUserId,
      };
    });

    notify(
      'success',
      'Sistema preparado para producción',
      'Los datos seleccionados fueron limpiados para entrega al cliente.'
    );
  };

  const importStateJson = (jsonText: string): boolean => {
    try {
      const parsed = JSON.parse(jsonText) as PMSState;
      if (!parsed || !Array.isArray(parsed.rooms) || !parsed.config) {
        notify('error', 'Archivo inválido', 'El JSON no corresponde a un respaldo válido del PMS.');
        return false;
      }
      setState(parsed);
      notify('success', 'Respaldo restaurado', 'Base de datos importada correctamente.');
      return true;
    } catch {
      notify('error', 'Error al leer JSON', 'Verifique el formato del archivo de respaldo.');
      return false;
    }
  };

  const checkInGuest = (payload: CheckInPayload): Stay | null => {
    const room = state.rooms.find((r) => r.id === payload.roomId);
    const guest = payload.guestOverride || state.guests.find((g) => g.id === payload.guestId);
    if (!room) {
      notify('error', 'Habitación no válida', 'Seleccione una habitación disponible.');
      return null;
    }
    if (!guest) {
      notify('error', 'Huésped requerido', 'Seleccione o registre un huésped titular.');
      return null;
    }

    const totalBase = payload.esCortesia ? 0 : payload.cantidad * payload.tarifaUnitaria;
    const pago = payload.esCortesia ? 0 : Math.min(payload.montoPagarAhora, totalBase);
    const now = new Date();
    const salida = new Date(now);
    if (payload.modalidad === 'NOCHES') {
      salida.setDate(salida.getDate() + payload.cantidad);
      const [hh, mm] = state.config.horaCheckOut.split(':').map(Number);
      salida.setHours(hh || 10, mm || 0, 0, 0);
    } else {
      salida.setHours(salida.getHours() + payload.cantidad);
    }

    const rt = state.roomTypes.find((t) => t.id === room.roomTypeId);
    const ag = payload.agencyId ? state.agencies.find((a) => a.id === payload.agencyId) : undefined;
    const stayId = genId('stay');
    const comprobante = nextVoucherNumber(state.sales, payload.voucherType, state.config);

    const payments =
      pago > 0 || payload.esCortesia
        ? [
            {
              id: genId('pay'),
              fecha: now.toISOString(),
              monto: pago,
              metodoPago: payload.esCortesia ? ('PAX LIBRES' as PaymentMethodName) : payload.metodoPago,
              comprobante,
              voucherType: payload.voucherType,
              concepto: `Hospedaje ${payload.cantidad} ${payload.modalidad.toLowerCase()} Hab. ${room.numero}`,
              turno: activeShiftName,
              responsable: activeUser.username,
            },
          ]
        : [];

    const newStay: Stay = {
      id: stayId,
      roomId: room.id,
      roomNumber: room.numero,
      roomTypeName: rt?.nombre || 'HABITACION',
      guestId: guest.id,
      guestName: guest.nombres,
      guestDocType: guest.tipoDoc,
      guestDocNum: guest.numDoc,
      guestNationality: guest.nacionalidad,
      guestSex: guest.sexo,
      guestBirthDate: guest.fechaNacimiento,
      invitados: payload.invitados,
      modalidad: payload.modalidad,
      cantidadInicial: payload.cantidad,
      tarifaBase: payload.tarifaUnitaria,
      fechaEntrada: now.toISOString(),
      fechaSalidaProgramada: salida.toISOString(),
      status: 'ACTIVA',
      esCortesia: payload.esCortesia,
      agencyId: ag?.id,
      agencyName: ag?.nombre,
      observaciones: payload.observaciones,
      consumptions: [],
      renewals: [],
      payments,
      totalCargos: totalBase,
      totalPagado: pago,
      saldoPendiente: Math.max(0, totalBase - pago),
      reservationId: payload.reservationId,
    };

    const newSale: SaleRecord | null =
      pago > 0 || payload.esCortesia
        ? {
            id: genId('sale'),
            fecha: now.toISOString(),
            origenTipo: 'HABITACION',
            roomNumber: room.numero,
            guestName: guest.nombres,
            guestDoc: guest.numDoc,
            descripcion: `Check-In Hab. ${room.numero} (${payload.cantidad} ${payload.modalidad.toLowerCase()})`,
            metodoPago: payload.esCortesia ? 'PAX LIBRES' : payload.metodoPago,
            voucherType: payload.voucherType,
            comprobante,
            monto: pago,
            esCortesia: payload.esCortesia,
            turno: activeShiftName,
            responsable: activeUser.username,
            status: 'ACTIVO',
            sunatEnviado: state.config.sunafactActivo,
            stayId,
          }
        : null;

    setState((prev) => ({
      ...prev,
      stays: [newStay, ...prev.stays],
      rooms: prev.rooms.map((r) =>
        r.id === room.id ? { ...r, status: 'OCUPADO', currentStayId: stayId } : r
      ),
      sales: newSale ? [newSale, ...prev.sales] : prev.sales,
      reservations: payload.reservationId
        ? prev.reservations.map((res) =>
            res.id === payload.reservationId ? { ...res, status: 'CHECKED_IN' } : res
          )
        : prev.reservations,
    }));

    notify('success', `Check-In Hab. ${room.numero} completado`, `${guest.nombres} registrado correctamente.`);
    return newStay;
  };

  const addConsumptionToStay = (
    stayId: string,
    items: { productId: string; cantidad: number; precioUnitario: number }[],
    pagarAhora: boolean,
    metodoPago: PaymentMethodName = 'EFECTIVO',
    voucherType: VoucherType = 'TICKET',
    area: WarehouseArea = 'RECEPCION'
  ) => {
    const stay = state.stays.find((s) => s.id === stayId);
    if (!stay || items.length === 0) return;

    const now = new Date().toISOString();
    const totalAmount = items.reduce((acc, it) => acc + it.cantidad * it.precioUnitario, 0);
    const comprobante = nextVoucherNumber(state.sales, voucherType, state.config);

    const newConsumptions = items.map((it) => {
      const prod = state.products.find((p) => p.id === it.productId);
      return {
        id: genId('con'),
        productId: it.productId,
        descripcion: prod?.descripcion || 'Producto',
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        subtotal: it.cantidad * it.precioUnitario,
        fecha: now,
        pagado: pagarAhora,
        entregado: false,
        metodoPago: pagarAhora ? metodoPago : undefined,
      };
    });

    const summaryDesc = newConsumptions.map((c) => `${c.cantidad}x ${c.descripcion}`).join(', ');

    setState((prev) => {
      const updatedProducts = prev.products.map((p) => {
        const match = items.find((i) => i.productId === p.id);
        if (!match || p.tipo !== 'STOCKABLE') return p;
        return {
          ...p,
          stocks: {
            ...p.stocks,
            [area]: Math.max(0, (p.stocks[area] || 0) - match.cantidad),
          },
        };
      });

      const newMovements = items
        .map((it) => {
          const prod = updatedProducts.find((p) => p.id === it.productId);
          if (!prod || prod.tipo !== 'STOCKABLE') return null;
          return {
            id: genId('sm'),
            fecha: now.slice(0, 16).replace('T', ' '),
            tipoMovimiento: 'VENTA' as const,
            origen: area,
            destino: `HAB-${stay.roomNumber}`,
            productId: prod.id,
            descripcion: prod.descripcion,
            cantidad: it.cantidad,
            stockResultante: prod.stocks[area],
            observaciones: `Consumo Hab. ${stay.roomNumber}`,
            responsable: activeUser.username,
          };
        })
        .filter(Boolean) as PMSState['stockMovements'];

      const updatedStays = prev.stays.map((s) => {
        if (s.id !== stayId) return s;
        const nextTotalCargos = s.totalCargos + totalAmount;
        const nextTotalPagado = s.totalPagado + (pagarAhora ? totalAmount : 0);
        const nextPayments = pagarAhora
          ? [
              ...s.payments,
              {
                id: genId('pay'),
                fecha: now,
                monto: totalAmount,
                metodoPago,
                comprobante,
                voucherType,
                concepto: `Consumo Hab. ${s.roomNumber}: ${summaryDesc}`,
                turno: activeShiftName,
                responsable: activeUser.username,
              },
            ]
          : s.payments;
        return {
          ...s,
          consumptions: [...s.consumptions, ...newConsumptions],
          payments: nextPayments,
          totalCargos: nextTotalCargos,
          totalPagado: nextTotalPagado,
          saldoPendiente: Math.max(0, nextTotalCargos - nextTotalPagado),
        };
      });

      const newSales = pagarAhora
        ? [
            {
              id: genId('sale'),
              fecha: now,
              origenTipo: 'HABITACION' as const,
              roomNumber: stay.roomNumber,
              guestName: stay.guestName,
              guestDoc: stay.guestDocNum,
              descripcion: `Consumo Hab. ${stay.roomNumber}: ${summaryDesc}`,
              metodoPago,
              voucherType,
              comprobante,
              monto: totalAmount,
              esCortesia: metodoPago === 'PAX LIBRES',
              turno: activeShiftName,
              responsable: activeUser.username,
              status: 'ACTIVO' as const,
              sunatEnviado: prev.config.sunafactActivo,
              stayId,
            },
            ...prev.sales,
          ]
        : prev.sales;

      return {
        ...prev,
        products: updatedProducts,
        stockMovements: [...newMovements, ...prev.stockMovements],
        stays: updatedStays,
        sales: newSales,
      };
    });

    notify(
      'success',
      `Consumo agregado a Hab. ${stay.roomNumber}`,
      pagarAhora ? `Pagado (${metodoPago})` : 'Cargado a la cuenta de la habitación'
    );
  };

  const deliverRoomOrder = (stayId: string, consumptionId: string) => {
    setState((prev) => ({
      ...prev,
      stays: prev.stays.map((s) =>
        s.id === stayId
          ? {
              ...s,
              consumptions: s.consumptions.map((c) =>
                c.id === consumptionId ? { ...c, entregado: true } : c
              ),
            }
          : s
      ),
    }));
    notify('success', 'Pedido marcado como entregado');
  };

  const renewStay = (
    stayId: string,
    cantidad: number,
    modalidad: 'NOCHES' | 'HORAS',
    monto: number,
    pagarAhora: boolean,
    metodoPago: PaymentMethodName,
    voucherType: VoucherType
  ) => {
    const stay = state.stays.find((s) => s.id === stayId);
    if (!stay) return;

    const now = new Date().toISOString();
    const nextExit = new Date(stay.fechaSalidaProgramada);
    if (modalidad === 'NOCHES') {
      nextExit.setDate(nextExit.getDate() + cantidad);
    } else {
      nextExit.setHours(nextExit.getHours() + cantidad);
    }

    const comprobante = nextVoucherNumber(state.sales, voucherType, state.config);

    setState((prev) => ({
      ...prev,
      stays: prev.stays.map((s) => {
        if (s.id !== stayId) return s;
        const totalCargos = s.totalCargos + monto;
        const totalPagado = s.totalPagado + (pagarAhora ? monto : 0);
        return {
          ...s,
          fechaSalidaProgramada: nextExit.toISOString(),
          renewals: [
            ...s.renewals,
            { id: genId('ren'), fecha: now, cantidad, modalidad, monto, metodoPago },
          ],
          payments: pagarAhora
            ? [
                ...s.payments,
                {
                  id: genId('pay'),
                  fecha: now,
                  monto,
                  metodoPago,
                  comprobante,
                  voucherType,
                  concepto: `Renovación Hab. ${s.roomNumber} (+${cantidad} ${modalidad.toLowerCase()})`,
                  turno: activeShiftName,
                  responsable: activeUser.username,
                },
              ]
            : s.payments,
          totalCargos,
          totalPagado,
          saldoPendiente: Math.max(0, totalCargos - totalPagado),
        };
      }),
      sales: pagarAhora
        ? [
            {
              id: genId('sale'),
              fecha: now,
              origenTipo: 'HABITACION',
              roomNumber: stay.roomNumber,
              guestName: stay.guestName,
              guestDoc: stay.guestDocNum,
              descripcion: `Renovación Hab. ${stay.roomNumber} (+${cantidad} ${modalidad.toLowerCase()})`,
              metodoPago,
              voucherType,
              comprobante,
              monto,
              esCortesia: metodoPago === 'PAX LIBRES',
              turno: activeShiftName,
              responsable: activeUser.username,
              status: 'ACTIVO',
              sunatEnviado: prev.config.sunafactActivo,
              stayId,
            },
            ...prev.sales,
          ]
        : prev.sales,
    }));

    notify('success', `Estadía Hab. ${stay.roomNumber} renovada`, `+${cantidad} ${modalidad.toLowerCase()}`);
  };

  const payStayBalance = (
    stayId: string,
    monto: number,
    metodoPago: PaymentMethodName,
    voucherType: VoucherType,
    concepto?: string
  ) => {
    const stay = state.stays.find((s) => s.id === stayId);
    if (!stay || monto <= 0) return;

    const now = new Date().toISOString();
    const comprobante = nextVoucherNumber(state.sales, voucherType, state.config);
    const desc = concepto || `Cobranza saldo Hab. ${stay.roomNumber}`;

    setState((prev) => ({
      ...prev,
      stays: prev.stays.map((s) => {
        if (s.id !== stayId) return s;
        const nextPagado = s.totalPagado + monto;
        return {
          ...s,
          consumptions: s.consumptions.map((c) => ({ ...c, pagado: true })),
          payments: [
            ...s.payments,
            {
              id: genId('pay'),
              fecha: now,
              monto,
              metodoPago,
              comprobante,
              voucherType,
              concepto: desc,
              turno: activeShiftName,
              responsable: activeUser.username,
            },
          ],
          totalPagado: nextPagado,
          saldoPendiente: Math.max(0, s.totalCargos - nextPagado),
        };
      }),
      sales: [
        {
          id: genId('sale'),
          fecha: now,
          origenTipo: 'HABITACION',
          roomNumber: stay.roomNumber,
          guestName: stay.guestName,
          guestDoc: stay.guestDocNum,
          descripcion: desc,
          metodoPago,
          voucherType,
          comprobante,
          monto,
          esCortesia: metodoPago === 'PAX LIBRES',
          turno: activeShiftName,
          responsable: activeUser.username,
          status: 'ACTIVO',
          sunatEnviado: prev.config.sunafactActivo,
          stayId,
        },
        ...prev.sales,
      ],
    }));

    notify('success', 'Pago registrado', `${comprobante} por S/ ${monto.toFixed(2)}`);
  };

  const changeRoom = (stayId: string, targetRoomId: string) => {
    const stay = state.stays.find((s) => s.id === stayId);
    const targetRoom = state.rooms.find((r) => r.id === targetRoomId);
    if (!stay || !targetRoom || targetRoom.status !== 'DISPONIBLE') {
      notify('error', 'No se puede cambiar de habitación', 'La habitación destino no está disponible.');
      return;
    }

    const rt = state.roomTypes.find((t) => t.id === targetRoom.roomTypeId);

    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => {
        if (r.id === stay.roomId) return { ...r, status: 'EN_LIMPIEZA', currentStayId: undefined };
        if (r.id === targetRoom.id) return { ...r, status: 'OCUPADO', currentStayId: stay.id };
        return r;
      }),
      stays: prev.stays.map((s) =>
        s.id === stay.id
          ? {
              ...s,
              roomId: targetRoom.id,
              roomNumber: targetRoom.numero,
              roomTypeName: rt?.nombre || s.roomTypeName,
              observaciones: `${s.observaciones} [Cambio de Hab. ${stay.roomNumber} -> ${targetRoom.numero}]`.trim(),
            }
          : s
      ),
    }));

    notify('success', `Cambio de habitación realizado`, `Huésped movido a Hab. ${targetRoom.numero}`);
  };

  const checkOutStay = (
    stayId: string,
    finalPayment?: { monto: number; metodoPago: PaymentMethodName; voucherType: VoucherType }
  ): boolean => {
    const stay = state.stays.find((s) => s.id === stayId);
    if (!stay) return false;

    const now = new Date().toISOString();
    const pagoFinal = finalPayment && finalPayment.monto > 0 ? finalPayment : undefined;

    if (stay.saldoPendiente > 0 && !pagoFinal && !state.config.checkInPagoPendiente) {
      notify('error', 'Saldo pendiente', 'Debe liquidar el saldo antes de realizar el Check-Out.');
      return false;
    }

    const comprobante = pagoFinal
      ? nextVoucherNumber(state.sales, pagoFinal.voucherType, state.config)
      : '';

    setState((prev) => ({
      ...prev,
      stays: prev.stays.map((s) => {
        if (s.id !== stayId) return s;
        const nextPagado = s.totalPagado + (pagoFinal?.monto || 0);
        const nextPayments = pagoFinal
          ? [
              ...s.payments,
              {
                id: genId('pay'),
                fecha: now,
                monto: pagoFinal.monto,
                metodoPago: pagoFinal.metodoPago,
                comprobante,
                voucherType: pagoFinal.voucherType,
                concepto: `Liquidación Check-Out Hab. ${s.roomNumber}`,
                turno: activeShiftName,
                responsable: activeUser.username,
              },
            ]
          : s.payments;
        return {
          ...s,
          status: 'FINALIZADA',
          fechaSalidaReal: now,
          consumptions: s.consumptions.map((c) => ({ ...c, pagado: true })),
          payments: nextPayments,
          totalPagado: nextPagado,
          saldoPendiente: Math.max(0, s.totalCargos - nextPagado),
        };
      }),
      rooms: prev.rooms.map((r) =>
        r.id === stay.roomId ? { ...r, status: 'EN_LIMPIEZA', currentStayId: undefined } : r
      ),
      sales: pagoFinal
        ? [
            {
              id: genId('sale'),
              fecha: now,
              origenTipo: 'HABITACION',
              roomNumber: stay.roomNumber,
              guestName: stay.guestName,
              guestDoc: stay.guestDocNum,
              descripcion: `Liquidación Check-Out Hab. ${stay.roomNumber}`,
              metodoPago: pagoFinal.metodoPago,
              voucherType: pagoFinal.voucherType,
              comprobante,
              monto: pagoFinal.monto,
              esCortesia: pagoFinal.metodoPago === 'PAX LIBRES',
              turno: activeShiftName,
              responsable: activeUser.username,
              status: 'ACTIVO',
              sunatEnviado: prev.config.sunafactActivo,
              stayId,
            },
            ...prev.sales,
          ]
        : prev.sales,
    }));

    notify(
      'success',
      `Check-Out Hab. ${stay.roomNumber} completado`,
      'Habitación enviada automáticamente a Control de Limpieza.'
    );
    return true;
  };

  const createReservation = (res: Omit<Reservation, 'id' | 'localizador'>): Reservation => {
    const localizador = `PSN-${Math.floor(2600 + Math.random() * 7000)}`;
    const newRes: Reservation = { ...res, id: genId('res'), localizador };
    setState((prev) => ({
      ...prev,
      reservations: [newRes, ...prev.reservations],
    }));
    notify('success', `Reserva ${localizador} creada`, `Hab. ${res.roomNumber} para ${res.guestName}`);
    return newRes;
  };

  const updateReservationStatus = (id: string, status: ReservationStatus) => {
    setState((prev) => ({
      ...prev,
      reservations: prev.reservations.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
    notify('info', `Reserva actualizada a ${status}`);
  };

  const deleteReservation = (id: string) => {
    setState((prev) => ({
      ...prev,
      reservations: prev.reservations.filter((r) => r.id !== id),
    }));
    notify('info', 'Reserva eliminada');
  };

  const setRoomStatus = (roomId: string, status: RoomStatus) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, status } : r)),
    }));
  };

  const startCleaning = (roomId: string, staffId: string, observacion = '') => {
    const room = state.rooms.find((r) => r.id === roomId);
    const staff = state.employees.find((e) => e.id === staffId);
    if (!room || !staff) return;

    const log: CleaningLog = {
      id: genId('cl'),
      roomId,
      roomNumber: room.numero,
      staffId,
      staffName: `${staff.nombres} ${staff.apellidos}`,
      inicio: new Date().toISOString(),
      estado: 'EN_PROCESO',
      observacion: observacion || 'Limpieza programada de habitación.',
    };

    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, status: 'EN_LIMPIEZA' } : r)),
      cleaningLogs: [log, ...prev.cleaningLogs],
    }));
    notify('info', `Limpieza iniciada en Hab. ${room.numero}`, `Asignada a ${log.staffName}`);
  };

  const completeCleaning = (roomId: string, observacion?: string) => {
    const room = state.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const now = new Date().toISOString();

    setState((prev) => {
      const hasActiveLog = prev.cleaningLogs.some((c) => c.roomId === roomId && c.estado === 'EN_PROCESO');
      const nextLogs = hasActiveLog
        ? prev.cleaningLogs.map((c) =>
            c.roomId === roomId && c.estado === 'EN_PROCESO'
              ? { ...c, estado: 'COMPLETADA' as const, fin: now, observacion: observacion || c.observacion }
              : c
          )
        : [
            {
              id: genId('cl'),
              roomId,
              roomNumber: room.numero,
              staffId: prev.employees[1]?.id || 'emp-2',
              staffName: prev.employees[1]
                ? `${prev.employees[1].nombres} ${prev.employees[1].apellidos}`
                : 'PERSONAL LIMPIEZA',
              inicio: now,
              fin: now,
              estado: 'COMPLETADA' as const,
              observacion: observacion || 'Limpieza completada y verificada.',
            },
            ...prev.cleaningLogs,
          ];
      return {
        ...prev,
        rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, status: 'DISPONIBLE' } : r)),
        cleaningLogs: nextLogs,
      };
    });
    notify('success', `Hab. ${room.numero} limpia y disponible`);
  };

  const createMaintenance = (rec: Omit<MaintenanceRecord, 'id' | 'estado'>) => {
    const newRec: MaintenanceRecord = { ...rec, id: genId('mnt'), estado: 'ACTIVO' };
    setState((prev) => ({
      ...prev,
      maintenanceRecords: [newRec, ...prev.maintenanceRecords],
      rooms: prev.rooms.map((r) => (r.id === rec.roomId ? { ...r, status: 'EN_MANTENIMIENTO' } : r)),
    }));
    notify('warning', `Hab. ${rec.roomNumber} en mantenimiento`, rec.categoria);
  };

  const resolveMaintenance = (id: string) => {
    const rec = state.maintenanceRecords.find((m) => m.id === id);
    if (!rec) return;
    setState((prev) => ({
      ...prev,
      maintenanceRecords: prev.maintenanceRecords.map((m) =>
        m.id === id ? { ...m, estado: 'RESUELTO' } : m
      ),
      rooms: prev.rooms.map((r) => (r.id === rec.roomId ? { ...r, status: 'DISPONIBLE' } : r)),
    }));
    notify('success', `Mantenimiento Hab. ${rec.roomNumber} finalizado`, 'Habitación disponible nuevamente.');
  };

  const createDirectSale = (payload: DirectSalePayload): SaleRecord | null => {
    if (payload.items.length === 0) return null;

    if (payload.roomId) {
      const stay = state.stays.find((s) => s.roomId === payload.roomId && s.status === 'ACTIVA');
      if (stay) {
        addConsumptionToStay(
          stay.id,
          payload.items.map((i) => ({
            productId: i.productId,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
          })),
          payload.metodoPago !== 'X PAGAR',
          payload.metodoPago,
          payload.voucherType,
          payload.area
        );
        return null;
      }
    }

    const now = new Date().toISOString();
    const total = payload.items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
    const comprobante = nextVoucherNumber(state.sales, payload.voucherType, state.config);
    const desc = payload.items.map((i) => `${i.cantidad}x ${i.descripcion}`).join(', ');

    const newSale: SaleRecord = {
      id: genId('sale'),
      fecha: now,
      origenTipo: 'VENTA_LIBRE',
      guestName: payload.guestName || 'CLIENTE MOSTRADOR',
      guestDoc: payload.guestDoc,
      descripcion: desc,
      metodoPago: payload.metodoPago,
      voucherType: payload.voucherType,
      comprobante,
      monto: total,
      esCortesia: payload.metodoPago === 'PAX LIBRES',
      turno: activeShiftName,
      responsable: activeUser.username,
      status: 'ACTIVO',
      sunatEnviado: state.config.sunafactActivo,
    };

    setState((prev) => {
      const updatedProducts = prev.products.map((p) => {
        const match = payload.items.find((i) => i.productId === p.id);
        if (!match || p.tipo !== 'STOCKABLE') return p;
        return {
          ...p,
          stocks: {
            ...p.stocks,
            [payload.area]: Math.max(0, (p.stocks[payload.area] || 0) - match.cantidad),
          },
        };
      });

      const movements = payload.items
        .map((it) => {
          const prod = updatedProducts.find((p) => p.id === it.productId);
          if (!prod || prod.tipo !== 'STOCKABLE') return null;
          return {
            id: genId('sm'),
            fecha: now.slice(0, 16).replace('T', ' '),
            tipoMovimiento: 'VENTA' as const,
            origen: payload.area,
            destino: 'VENTA_LIBRE',
            productId: prod.id,
            descripcion: prod.descripcion,
            cantidad: it.cantidad,
            stockResultante: prod.stocks[payload.area],
            observaciones: `POS ${comprobante}`,
            responsable: activeUser.username,
          };
        })
        .filter(Boolean) as PMSState['stockMovements'];

      return {
        ...prev,
        products: updatedProducts,
        stockMovements: [...movements, ...prev.stockMovements],
        sales: [newSale, ...prev.sales],
      };
    });

    notify('success', `Venta ${comprobante} registrada`, `Total S/ ${total.toFixed(2)}`);
    return newSale;
  };

  const voidSale = (saleId: string, motivo: string, authCode?: string): boolean => {
    if (state.config.requiereCodigoAutorizacion) {
      const valid = state.authCodes.some((c) => c.codigo === authCode);
      if (!valid) {
        notify('error', 'Código de autorización inválido');
        return false;
      }
    }
    setState((prev) => ({
      ...prev,
      sales: prev.sales.map((s) =>
        s.id === saleId ? { ...s, status: 'ANULADO', motivoAnulacion: motivo } : s
      ),
    }));
    notify('warning', 'Comprobante anulado', motivo);
    return true;
  };

  const closeCashRegister = (efectivoContado: number, observacion: string) => {
    const activeSales = state.sales.filter((s) => s.status === 'ACTIVO' && s.turno === activeShiftName);
    const totalEfectivo = activeSales
      .filter((s) => s.metodoPago === 'EFECTIVO')
      .reduce((acc, s) => acc + s.monto, 0);
    const totalTarjeta = activeSales
      .filter((s) => s.metodoPago === 'TARJETA')
      .reduce((acc, s) => acc + s.monto, 0);
    const totalYapePlin = activeSales
      .filter((s) => s.metodoPago === 'YAPE' || s.metodoPago === 'PLIN')
      .reduce((acc, s) => acc + s.monto, 0);
    const totalTransferencia = activeSales
      .filter((s) => s.metodoPago === 'TRANSFERENCIA')
      .reduce((acc, s) => acc + s.monto, 0);
    const totalAgencia = activeSales
      .filter((s) => s.metodoPago === 'AGENCIA' || s.metodoPago === 'AGENCIAS X PAGAR')
      .reduce((acc, s) => acc + s.monto, 0);
    const totalGastosEfectivo = state.expenses
      .filter((e) => e.tipoPago === 'EFECTIVO')
      .reduce((acc, e) => acc + e.monto, 0);

    const esperado = Math.max(0, totalEfectivo - totalGastosEfectivo);
    const closeRec = {
      id: genId('close'),
      fechaCierre: new Date().toISOString(),
      turno: activeShiftName,
      caja: 'CAJA RECEPCION',
      responsable: activeUser.username,
      totalEfectivoEsperado: esperado,
      totalTarjeta,
      totalYapePlin,
      totalTransferencia,
      totalAgencia,
      totalGastosEfectivo,
      efectivoContado,
      diferencia: efectivoContado - esperado,
      observacion,
    };

    setState((prev) => ({
      ...prev,
      cashCloses: [closeRec, ...prev.cashCloses],
    }));
    notify('success', 'Cierre de Caja registrado', `Diferencia: S/ ${closeRec.diferencia.toFixed(2)}`);
  };

  const registerExpense = (exp: Omit<ExpenseRecord, 'id' | 'responsable'>) => {
    const newExp: ExpenseRecord = { ...exp, id: genId('exp'), responsable: activeUser.username };
    setState((prev) => ({ ...prev, expenses: [newExp, ...prev.expenses] }));
    notify('success', 'Gasto registrado', `S/ ${exp.monto.toFixed(2)}`);
  };

  const registerBankDeposit = (dep: Omit<BankDeposit, 'id' | 'numEnvio'>) => {
    const numEnvio = String(state.bankDeposits.length + 1).padStart(5, '0');
    const newDep: BankDeposit = { ...dep, id: genId('dep'), numEnvio };
    setState((prev) => ({ ...prev, bankDeposits: [newDep, ...prev.bankDeposits] }));
    notify('success', `Depósito N° ${numEnvio} confirmado`, `${dep.banco} · S/ ${dep.montoDepositado.toFixed(2)}`);
  };

  const saveCategory = (cat: Omit<ProductCategory, 'id'> & { id?: string }) => {
    setState((prev) => {
      if (cat.id) {
        return {
          ...prev,
          categories: prev.categories.map((c) => (c.id === cat.id ? { ...c, ...cat } : c)),
        };
      }
      return {
        ...prev,
        categories: [...prev.categories, { ...cat, id: genId('cat') }],
      };
    });
    notify('success', 'Categoría guardada');
  };

  const saveProduct = (prod: Omit<Product, 'id'> & { id?: string }) => {
    setState((prev) => {
      if (prod.id) {
        return {
          ...prev,
          products: prev.products.map((p) => (p.id === prod.id ? { ...p, ...prod } : p)),
        };
      }
      return {
        ...prev,
        products: [{ ...prod, id: genId('prod') }, ...prev.products],
      };
    });
    notify('success', 'Producto guardado en catálogo');
  };

  const registerPurchase = (purchase: Omit<Purchase, 'id' | 'responsable'>) => {
    const newPurchase: Purchase = {
      ...purchase,
      id: genId('pur'),
      responsable: activeUser.username,
    };

    setState((prev) => {
      const updatedProducts = prev.products.map((p) => {
        const item = purchase.items.find((i) => i.productId === p.id);
        if (!item) return p;
        return {
          ...p,
          stocks: {
            ...p.stocks,
            [purchase.area]: (p.stocks[purchase.area] || 0) + item.cantidad,
          },
        };
      });

      const movements = purchase.items.map((item) => {
        const prod = updatedProducts.find((p) => p.id === item.productId);
        return {
          id: genId('sm'),
          fecha: `${purchase.fecha} ${new Date().toTimeString().slice(0, 5)}`,
          tipoMovimiento: 'COMPRA' as const,
          origen: purchase.proveedor || 'PROVEEDOR DIRECTO',
          destino: purchase.area,
          productId: item.productId,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          stockResultante: prod?.stocks[purchase.area] ?? item.cantidad,
          observaciones: `${purchase.tipoDoc} ${purchase.numDoc}`,
          responsable: activeUser.username,
        };
      });

      return {
        ...prev,
        purchases: [newPurchase, ...prev.purchases],
        products: updatedProducts,
        stockMovements: [...movements, ...prev.stockMovements],
      };
    });

    notify('success', 'Compra registrada y stock actualizado', `${purchase.tipoDoc} ${purchase.numDoc}`);
  };

  const registerStockDispatch = (params: {
    tipo: 'ENTREGA_PRODUCTOS' | 'AJUSTE_INGRESO' | 'AJUSTE_SALIDA';
    origen: WarehouseArea | 'AJUSTE';
    destino: WarehouseArea | 'AJUSTE';
    items: { productId: string; cantidad: number }[];
    observaciones: string;
  }): boolean => {
    if (params.items.length === 0) return false;
    const nowStr = `${toYMD(new Date())} ${new Date().toTimeString().slice(0, 5)}`;

    setState((prev) => {
      const updatedProducts = prev.products.map((p) => {
        const match = params.items.find((i) => i.productId === p.id);
        if (!match) return p;
        const nextStocks = { ...p.stocks };
        if (params.tipo === 'ENTREGA_PRODUCTOS' && params.origen !== 'AJUSTE' && params.destino !== 'AJUSTE') {
          nextStocks[params.origen] = Math.max(0, (nextStocks[params.origen] || 0) - match.cantidad);
          nextStocks[params.destino] = (nextStocks[params.destino] || 0) + match.cantidad;
        } else if (params.tipo === 'AJUSTE_INGRESO' && params.destino !== 'AJUSTE') {
          nextStocks[params.destino] = (nextStocks[params.destino] || 0) + match.cantidad;
        } else if (params.tipo === 'AJUSTE_SALIDA' && params.origen !== 'AJUSTE') {
          nextStocks[params.origen] = Math.max(0, (nextStocks[params.origen] || 0) - match.cantidad);
        }
        return { ...p, stocks: nextStocks };
      });

      const movements = params.items.map((it) => {
        const prod = updatedProducts.find((p) => p.id === it.productId)!;
        const areaKey = params.destino !== 'AJUSTE' ? params.destino : (params.origen as WarehouseArea);
        return {
          id: genId('sm'),
          fecha: nowStr,
          tipoMovimiento: params.tipo,
          origen: params.origen,
          destino: params.destino,
          productId: it.productId,
          descripcion: prod.descripcion,
          cantidad: it.cantidad,
          stockResultante: prod.stocks[areaKey] || 0,
          observaciones: params.observaciones,
          responsable: activeUser.username,
        };
      });

      return {
        ...prev,
        products: updatedProducts,
        stockMovements: [...movements, ...prev.stockMovements],
      };
    });

    notify('success', 'Movimiento de inventario registrado');
    return true;
  };

  const saveGuest = (guest: Omit<Guest, 'id' | 'fechaRegistro'> & { id?: string }): Guest => {
    const cleanDoc = guest.numDoc.trim();
    const existingByDoc = !guest.id && cleanDoc
      ? state.guests.find(
          (g) => g.numDoc.trim().toLowerCase() === cleanDoc.toLowerCase() && g.tipoDoc === guest.tipoDoc
        )
      : undefined;
    const targetId = guest.id || existingByDoc?.id;

    let savedGuest: Guest;
    if (targetId) {
      savedGuest = {
        ...guest,
        numDoc: cleanDoc,
        id: targetId,
        fechaRegistro: existingByDoc?.fechaRegistro || toYMD(new Date()),
      };
      setState((prev) => ({
        ...prev,
        guests: prev.guests.map((g) => (g.id === targetId ? { ...g, ...savedGuest } : g)),
      }));
    } else {
      savedGuest = { ...guest, numDoc: cleanDoc, id: genId('g'), fechaRegistro: toYMD(new Date()) };
      setState((prev) => ({ ...prev, guests: [savedGuest, ...prev.guests] }));
    }
    notify('success', 'Huésped guardado', savedGuest.nombres);
    return savedGuest;
  };

  const deleteGuest = (id: string) => {
    setState((prev) => ({ ...prev, guests: prev.guests.filter((g) => g.id !== id) }));
    notify('info', 'Registro de huésped eliminado');
  };

  const saveAgency = (agency: Omit<Agency, 'id'> & { id?: string }) => {
    setState((prev) => ({
      ...prev,
      agencies: agency.id
        ? prev.agencies.map((a) => (a.id === agency.id ? { ...a, ...agency } : a))
        : [{ ...agency, id: genId('ag') }, ...prev.agencies],
    }));
    notify('success', 'Empresa / Agencia guardada');
  };

  const deleteAgency = (id: string) => {
    setState((prev) => ({ ...prev, agencies: prev.agencies.filter((a) => a.id !== id) }));
    notify('info', 'Empresa / Agencia eliminada');
  };

  const savePersonaNoGrata = (png: Omit<PersonaNoGrata, 'id'>) => {
    setState((prev) => ({
      ...prev,
      personasNoGratas: [{ ...png, id: genId('png') }, ...prev.personasNoGratas],
    }));
    notify('warning', 'Incidencia registrada en Personas No Gratas');
  };

  const deletePersonaNoGrata = (id: string) => {
    setState((prev) => ({
      ...prev,
      personasNoGratas: prev.personasNoGratas.filter((p) => p.id !== id),
    }));
  };

  const saveRoomType = (rt: Omit<RoomType, 'id'> & { id?: string }) => {
    setState((prev) => ({
      ...prev,
      roomTypes: rt.id
        ? prev.roomTypes.map((t) => (t.id === rt.id ? { ...t, ...rt } : t))
        : [...prev.roomTypes, { ...rt, id: genId('rt') }],
    }));
    notify('success', 'Tipo de habitación actualizado');
  };

  const createRoom = (room: Omit<Room, 'id'>) => {
    setState((prev) => ({
      ...prev,
      rooms: [...prev.rooms, { ...room, id: genId('r') }],
    }));
    notify('success', `Habitación ${room.numero} creada`);
  };

  const updateRoomAmenities = (roomId: string, amenities: RoomAmenities) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, amenities } : r)),
    }));
  };

  const updateRoomRate = (roomId: string, tier: RateTier, day: DayKey, value: number) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) =>
        r.id === roomId
          ? { ...r, rates: { ...r.rates, [tier]: { ...r.rates[tier], [day]: value } } }
          : r
      ),
    }));
  };

  const assignRoomType = (roomId: string, roomTypeId: string) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, roomTypeId } : r)),
    }));
    notify('success', 'Habitación asignada al tipo');
  };

  const savePosition = (nombre: string) => {
    if (!nombre.trim()) return;
    setState((prev) => ({
      ...prev,
      positions: [...prev.positions, { id: genId('pos'), nombre: nombre.toUpperCase() }],
    }));
    notify('success', 'Cargo registrado');
  };

  const saveEmployee = (emp: Omit<Employee, 'id'> & { id?: string }) => {
    setState((prev) => ({
      ...prev,
      employees: emp.id
        ? prev.employees.map((e) => (e.id === emp.id ? { ...e, ...emp } : e))
        : [...prev.employees, { ...emp, id: genId('emp') }],
    }));
    notify('success', 'Colaborador guardado');
  };

  const clockAttendance = (
    docOrId: string,
    action: 'INGRESO' | 'SALIDA' | 'INICIO_BREAK' | 'FIN_BREAK'
  ): Employee | null => {
    const emp = state.employees.find(
      (e) => e.numDoc === docOrId.trim() || e.idCard.toLowerCase() === docOrId.trim().toLowerCase()
    );
    if (!emp) {
      notify('error', 'Empleado no encontrado', 'Verifique el DNI o ID Card.');
      return null;
    }

    const todayStr = toYMD(new Date());
    const timeStr = new Date().toTimeString().slice(0, 8);

    setState((prev) => {
      const existing = prev.attendanceLogs.find(
        (a) => a.employeeId === emp.id && a.fecha === todayStr
      );
      if (existing) {
        return {
          ...prev,
          attendanceLogs: prev.attendanceLogs.map((a) => {
            if (a.id !== existing.id) return a;
            if (action === 'INGRESO') return { ...a, ingreso: timeStr };
            if (action === 'INICIO_BREAK') return { ...a, inicioBreak: timeStr };
            if (action === 'FIN_BREAK') return { ...a, finBreak: timeStr };
            return { ...a, salida: timeStr };
          }),
        };
      }
      const newLog: AttendanceLog = {
        id: genId('att'),
        employeeId: emp.id,
        numDoc: emp.numDoc,
        nombreCompleto: `${emp.nombres} ${emp.apellidos}`,
        cargoNombre: emp.cargoNombre,
        fecha: todayStr,
        ...(action === 'INGRESO' ? { ingreso: timeStr } : {}),
        ...(action === 'INICIO_BREAK' ? { inicioBreak: timeStr } : {}),
        ...(action === 'FIN_BREAK' ? { finBreak: timeStr } : {}),
        ...(action === 'SALIDA' ? { salida: timeStr } : {}),
      };
      return { ...prev, attendanceLogs: [newLog, ...prev.attendanceLogs] };
    });

    notify('success', `Marcación ${action.replace('_', ' ')}`, `${emp.nombres} ${emp.apellidos} · ${timeStr}`);
    return emp;
  };

  const updateConfig = (partial: Partial<HotelConfig>) => {
    setState((prev) => ({ ...prev, config: { ...prev.config, ...partial } }));
    notify('success', 'Configuración actualizada');
  };

  const saveUser = (user: Omit<SystemUser, 'id'> & { id?: string }) => {
    setState((prev) => ({
      ...prev,
      users: user.id
        ? prev.users.map((u) => (u.id === user.id ? { ...u, ...user } : u))
        : [...prev.users, { ...user, id: genId('u') }],
    }));
    notify('success', 'Usuario actualizado');
  };

  const saveAuthCode = (code: Omit<AuthCode, 'id'>) => {
    setState((prev) => ({
      ...prev,
      authCodes: [...prev.authCodes, { ...code, id: genId('ac') }],
    }));
    notify('success', 'Código de autorización registrado');
  };

  const deleteAuthCode = (id: string) => {
    setState((prev) => ({
      ...prev,
      authCodes: prev.authCodes.filter((c) => c.id !== id),
    }));
  };

  const createSupportTicket = (incidencia: string, detalle: string) => {
    const ticket: SupportTicket = {
      id: genId('sup'),
      fecha: toYMD(new Date()),
      numeroTicket: `TKT-${Math.floor(1000 + Math.random() * 8999)}`,
      usuario: activeUser.username,
      correo: state.config.correo,
      incidencia,
      detalle,
      estado: 'ABIERTO',
    };
    setState((prev) => ({ ...prev, supportTickets: [ticket, ...prev.supportTickets] }));
    notify('success', `Ticket ${ticket.numeroTicket} enviado`);
  };

  return (
    <PMSContext.Provider
      value={{
        state,
        toasts,
        dismissToast,
        notify,
        activeUser,
        activeShiftName,
        isAuthenticated,
        login,
        logout,
        hasModuleAccess,
        setActiveUserId,
        setActiveShiftId,
        resetDemoData,
        factoryResetForClient,
        importStateJson,
        firebaseSync,
        syncToFirebaseNow,
        pullFromFirebaseNow,
        testFirebase,
        getRoomRateForDate,
        checkInGuest,
        addConsumptionToStay,
        deliverRoomOrder,
        renewStay,
        payStayBalance,
        changeRoom,
        checkOutStay,
        createReservation,
        updateReservationStatus,
        deleteReservation,
        setRoomStatus,
        startCleaning,
        completeCleaning,
        createMaintenance,
        resolveMaintenance,
        createDirectSale,
        voidSale,
        closeCashRegister,
        registerExpense,
        registerBankDeposit,
        saveCategory,
        saveProduct,
        registerPurchase,
        registerStockDispatch,
        saveGuest,
        deleteGuest,
        saveAgency,
        deleteAgency,
        savePersonaNoGrata,
        deletePersonaNoGrata,
        saveRoomType,
        createRoom,
        updateRoomAmenities,
        updateRoomRate,
        assignRoomType,
        savePosition,
        saveEmployee,
        clockAttendance,
        updateConfig,
        saveUser,
        saveAuthCode,
        deleteAuthCode,
        createSupportTicket,
      }}
    >
      {children}
    </PMSContext.Provider>
  );
};

export const usePMS = () => {
  const ctx = useContext(PMSContext);
  if (!ctx) throw new Error('usePMS must be used within PMSProvider');
  return ctx;
};
