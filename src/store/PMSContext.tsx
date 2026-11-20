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
  AcsAccessLog,
  Agency,
  AgencyGroup,
  AirportTransfer,
  AttendanceLog,
  AuthCode,
  BankDeposit,
  BellBoyTicket,
  CleaningLog,
  CrmActionTag,
  CrmMessage,
  CrmThread,
  DayKey,
  Employee,
  ExpenseRecord,
  Guest,
  GuestLanguage,
  HotelConfig,
  MaintenanceRecord,
  MedicalAlert,
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
  RoomDeviceState,
  RoomServiceOrder,
  RoomStatus,
  RoomType,
  SaleRecord,
  StaffPosition,
  Stay,
  StayConsumption,
  StayPayment,
  SupportTicket,
  SystemUser,
  TourBooking,
  TourPackage,
  VoucherType,
  WakeUpCall,
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

export interface AgencyGroupRoomAllocation {
  roomId: string;
  pax: number;
  tarifaUnitaria: number;
  titularNombre?: string;
  titularDoc?: string;
}

export interface AgencyGroupCheckInPayload {
  agencyId: string;
  agencyOverride?: Agency;
  nombreGrupo: string;
  guiaResponsable: string;
  guiaDoc?: string;
  totalPax: number;
  modalidad: 'NOCHES' | 'HORAS';
  cantidad: number;
  observaciones: string;
  allocations: AgencyGroupRoomAllocation[];
  billingMode: 'UN_SOLO_PAGO_AHORA' | 'CREDITO_AGENCIA';
  metodoPago: PaymentMethodName;
  voucherType: VoucherType;
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
  checkInAgencyGroup: (
    payload: AgencyGroupCheckInPayload
  ) => { group: AgencyGroup; stays: Stay[]; sale: SaleRecord | null } | null;
  payAgencyGroupConsolidated: (
    groupId: string,
    metodoPago: PaymentMethodName,
    voucherType: VoucherType
  ) => SaleRecord | null;
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
  updateReservation: (id: string, updates: Partial<Reservation>) => boolean;
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
  saveAgency: (agency: Omit<Agency, 'id'> & { id?: string }) => Agency;
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

  // Smart Wake-Up (PBX + WhatsApp + Voice IoT)
  scheduleWakeUp: (payload: {
    roomId: string;
    horaProgramada: string;
    fechaProgramada: string;
    canal: WakeUpCall['canal'];
    idioma?: GuestLanguage;
    pbxProvider?: WakeUpCall['pbxProvider'];
    creadoPor?: string;
  }) => WakeUpCall | null;
  triggerWakeUpCall: (id: string) => void;
  respondWakeUpCall: (
    id: string,
    outcome: 'ATENDIDO' | 'POSPUESTO' | 'FALLO_SIN_RESPUESTA',
    extraMin?: number
  ) => void;
  deleteWakeUpCall: (id: string) => void;

  // Tour Packages & Spa Bookings
  saveTourPackage: (pkg: Omit<TourPackage, 'id'> & { id?: string }) => TourPackage;
  bookTourPackage: (payload: {
    packageId: string;
    stayId?: string;
    guestId?: string;
    guestName: string;
    guestDoc?: string;
    roomId?: string;
    roomNumber?: string;
    fechaTour: string;
    horaRecojo?: string;
    pax: number;
    chargeToRoom: boolean;
    metodoPago?: PaymentMethodName;
    voucherType?: VoucherType;
    solicitadoVia?: TourBooking['solicitadoVia'];
    observaciones?: string;
  }) => TourBooking | null;
  updateTourBookingStatus: (id: string, status: TourBooking['status']) => void;

  // CRM Omnichannel & WhatsApp AI Agent
  ensureCrmThread: (params: {
    guestId?: string;
    guestName: string;
    telefono?: string;
    stayId?: string;
    roomId?: string;
    roomNumber?: string;
    idioma?: GuestLanguage;
    canal?: CrmThread['canal'];
  }) => CrmThread;
  sendCrmMessage: (
    threadId: string,
    texto: string,
    sender?: CrmMessage['sender'],
    actionTag?: CrmActionTag
  ) => void;
  simulateGuestCrmCommand: (
    threadId: string,
    commandType:
      | 'WAKEUP'
      | 'LATE_CHECKOUT'
      | 'TOUR'
      | 'ROOM_SERVICE'
      | 'BELL_BOY'
      | 'MEDICAL_SOS'
      | 'CUSTOM',
    params?: {
      customText?: string;
      wakeTime?: string;
      tourPackageId?: string;
      tourPax?: number;
      productId?: string;
      bultos?: number;
      medicalType?: MedicalAlert['tipo'];
    }
  ) => void;
  sendBiometricPreCheckIn: (threadId: string) => void;
  verifyBiometricAndIssueKey: (threadId: string) => void;
  approveLateCheckOutFromCrm: (
    threadId: string,
    extraHours: number,
    extraFee: number,
    chargeToFolio: boolean
  ) => void;

  // Room Service & KDS Cocina
  createRoomServiceOrder: (payload: {
    stayId: string;
    items: { productId: string; cantidad: number }[];
    canal: RoomServiceOrder['canal'];
    notasCocina?: string;
    pagarAhora?: boolean;
    metodoPago?: PaymentMethodName;
    voucherType?: VoucherType;
  }) => RoomServiceOrder | null;
  advanceKdsOrderStatus: (orderId: string, nextStatus: RoomServiceOrder['status']) => void;

  // Bell Boys & Transfers
  createBellBoyTicket: (
    payload: Omit<BellBoyTicket, 'id' | 'codigoQr' | 'createdAt' | 'status'> & {
      status?: BellBoyTicket['status'];
    }
  ) => BellBoyTicket;
  updateBellBoyStatus: (id: string, status: BellBoyTicket['status'], asignadoA?: string) => void;
  createTransfer: (
    payload: Omit<AirportTransfer, 'id' | 'codigo' | 'horaActualizada' | 'retrasoMin' | 'status'>
  ) => AirportTransfer;
  reportFlightDelay: (id: string, delayMinutes: number) => void;
  updateTransferStatus: (id: string, status: AirportTransfer['status']) => void;

  // Medical, Oxygen & Emergency
  triggerMedicalAlert: (payload: {
    roomId: string;
    tipo: MedicalAlert['tipo'];
    origen: MedicalAlert['origen'];
    sintomas: string;
    cargoServicio?: number;
  }) => MedicalAlert | null;
  updateMedicalAlertStatus: (
    id: string,
    status: MedicalAlert['status'],
    asignadoA?: string,
    cargoServicio?: number
  ) => void;

  // GRMS Domotics & ACS Access Control
  updateRoomDevice: (roomId: string, partial: Partial<RoomDeviceState>) => void;
  toggleMobileKey: (roomId: string, active: boolean, actorName?: string) => void;
  logAcsAccess: (payload: Omit<AcsAccessLog, 'id' | 'fecha'>) => void;
  reportPreventiveIoTMaintenance: (roomId: string, detalle: string) => void;
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
              if (u.rol === 'RECEPCION' && (!u.accesos.includes('crm_whatsapp') || u.accesos.length >= ALL_MODULES.length - 2)) {
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
        if (u.rol === 'RECEPCION' && (!u.accesos.includes('crm_whatsapp') || u.accesos.length >= ALL_MODULES.length - 2)) {
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
        agencyGroups: options.wipeTransactions ? [] : prev.agencyGroups,
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
        wakeUpCalls: options.wipeTransactions ? [] : prev.wakeUpCalls,
        tourBookings: options.wipeTransactions ? [] : prev.tourBookings,
        crmThreads: options.wipeTransactions ? [] : prev.crmThreads,
        roomServiceOrders: options.wipeTransactions ? [] : prev.roomServiceOrders,
        bellBoyTickets: options.wipeTransactions ? [] : prev.bellBoyTickets,
        transfers: options.wipeTransactions ? [] : prev.transfers,
        medicalAlerts: options.wipeTransactions ? [] : prev.medicalAlerts,
        acsAccessLogs: options.wipeTransactions ? [] : prev.acsAccessLogs,
        roomDevices: options.wipeTransactions
          ? prev.roomDevices.map((d) => ({
              ...d,
              aireModo: 'ECO' as const,
              luces: 'APAGADAS' as const,
              cortinas: 'CERRADAS' as const,
              cartelDigital: 'NINGUNO' as const,
              sensorPresencia: 'VACIA_SIN_MOVIMIENTO' as const,
              llaveMovilActiva: false,
              llaveMovilCodigo: undefined,
              llaveVigenciaHasta: undefined,
            }))
          : prev.roomDevices,
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

    const newKeyCode = `NFC-${room.numero}-${Math.floor(1000 + Math.random() * 8999)}`;
    const vigenciaStr = `${toYMD(salida)} ${state.config.horaCheckOut}`;

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
      roomDevices: prev.roomDevices.map((d) =>
        d.roomId === room.id
          ? {
              ...d,
              aireModo: 'CONFORT',
              temperaturaObjetivo: 21,
              temperaturaActual: 21,
              luces: 'ENCENDIDAS',
              cortinas: 'ABIERTAS',
              cartelDigital: 'NINGUNO',
              sensorPresencia: 'CON_HUESPED',
              llaveMovilActiva: true,
              llaveMovilCodigo: newKeyCode,
              llaveVigenciaHasta: vigenciaStr,
              ultimaActualizacion: now.toISOString(),
            }
          : d
      ),
      acsAccessLogs: [
        {
          id: genId('acs'),
          roomId: room.id,
          roomNumber: room.numero,
          actor: guest.nombres,
          rolActor: 'HUESPED_MOVIL',
          metodo: 'LLAVE_MOVIL_NFC',
          autorizado: true,
          fecha: now.toISOString(),
        },
        ...prev.acsAccessLogs,
      ],
    }));

    notify(
      'success',
      `Check-In Hab. ${room.numero} completado`,
      `${guest.nombres} · GRMS Confort + Llave Móvil ${newKeyCode} activada.`
    );
    return newStay;
  };

  const checkInAgencyGroup = (
    payload: AgencyGroupCheckInPayload
  ): { group: AgencyGroup; stays: Stay[]; sale: SaleRecord | null } | null => {
    const agency = payload.agencyOverride || state.agencies.find((a) => a.id === payload.agencyId);
    if (!agency) {
      notify('error', 'Agencia requerida', 'Seleccione o registre una agencia de turismo.');
      return null;
    }
    if (payload.allocations.length === 0) {
      notify('error', 'Sin habitaciones asignadas', 'Seleccione al menos una habitación disponible para el grupo.');
      return null;
    }

    const validAllocations = payload.allocations
      .map((al) => ({
        ...al,
        room: state.rooms.find((r) => r.id === al.roomId && r.status === 'DISPONIBLE'),
      }))
      .filter((x): x is typeof x & { room: Room } => Boolean(x.room));

    if (validAllocations.length === 0) {
      notify('error', 'Habitaciones no disponibles', 'Las habitaciones seleccionadas ya no están disponibles.');
      return null;
    }

    const now = new Date();
    const salida = new Date(now);
    if (payload.modalidad === 'NOCHES') {
      salida.setDate(salida.getDate() + payload.cantidad);
      const [hh, mm] = state.config.horaCheckOut.split(':').map(Number);
      salida.setHours(hh || 10, mm || 0, 0, 0);
    } else {
      salida.setHours(salida.getHours() + payload.cantidad);
    }

    const groupId = genId('grp');
    const groupCode = `GRP-${String(state.agencyGroups.length + 101)}`;
    const groupName = payload.nombreGrupo.trim().toUpperCase() || `${agency.nombre} (${payload.totalPax} PAX)`;
    const guiaNombre = payload.guiaResponsable.trim().toUpperCase() || `GUÍA ${agency.nombre}`;
    const guiaDoc = (payload.guiaDoc || agency.numDoc || 'S/D').trim();

    // Ensure lead / guide guest record exists cleanly
    const existingLead = state.guests.find(
      (g) => g.numDoc.trim().toLowerCase() === guiaDoc.toLowerCase() && g.nombres.toUpperCase() === guiaNombre
    );
    const leadGuestId = existingLead?.id || genId('g');
    const leadGuestToCreate: Guest | null = existingLead
      ? null
      : {
          id: leadGuestId,
          tipoDoc: agency.tipoDoc === 'RUC' ? 'DNI' : agency.tipoDoc,
          numDoc: guiaDoc,
          nombres: guiaNombre,
          fechaNacimiento: '1990-01-01',
          fechaRegistro: toYMD(now),
          nacionalidad: 'EXTRANJERO / TURISMO',
          sexo: 'M',
          correo: '',
          celular: agency.telefono || '',
          direccion: agency.direccionFiscal || '',
          esVip: false,
        };

    const payAllNow =
      payload.billingMode === 'UN_SOLO_PAGO_AHORA' &&
      payload.metodoPago !== 'X PAGAR' &&
      payload.metodoPago !== 'AGENCIAS X PAGAR';

    const grandTotal = validAllocations.reduce(
      (sum, item) => sum + item.tarifaUnitaria * payload.cantidad,
      0
    );

    const singleComprobante = payAllNow
      ? nextVoucherNumber(state.sales, payload.voucherType, state.config)
      : undefined;

    const createdStays: Stay[] = validAllocations.map((al) => {
      const rt = state.roomTypes.find((t) => t.id === al.room.roomTypeId);
      const stayId = genId('stay');
      const stayTotal = al.tarifaUnitaria * payload.cantidad;
      const titularLabel = (al.titularNombre?.trim() || `${guiaNombre} (${groupName})`).toUpperCase();
      const stayPayments: StayPayment[] = payAllNow && singleComprobante
        ? [
            {
              id: genId('pay'),
              fecha: now.toISOString(),
              monto: stayTotal,
              metodoPago: payload.metodoPago,
              comprobante: singleComprobante,
              voucherType: payload.voucherType,
              concepto: `Pago único grupo ${groupCode} · Hab. ${al.room.numero}`,
              turno: activeShiftName,
              responsable: activeUser.username,
            },
          ]
        : [];

      return {
        id: stayId,
        roomId: al.room.id,
        roomNumber: al.room.numero,
        roomTypeName: rt?.nombre || 'HABITACIÓN',
        guestId: leadGuestId,
        guestName: titularLabel,
        guestDocType: agency.tipoDoc,
        guestDocNum: al.titularDoc?.trim() || agency.numDoc || guiaDoc,
        guestNationality: 'GRUPO TURISMO',
        guestSex: 'M',
        guestBirthDate: '1990-01-01',
        invitados: [],
        modalidad: payload.modalidad,
        cantidadInicial: payload.cantidad,
        tarifaBase: al.tarifaUnitaria,
        fechaEntrada: now.toISOString(),
        fechaSalidaProgramada: salida.toISOString(),
        status: 'ACTIVA',
        esCortesia: false,
        agencyId: agency.id,
        agencyName: agency.nombre,
        groupId,
        groupName,
        paxCount: al.pax,
        observaciones: `[${groupCode}] ${groupName} · ${al.pax} pax. ${payload.observaciones}`.trim(),
        consumptions: [],
        renewals: [],
        payments: stayPayments,
        totalCargos: stayTotal,
        totalPagado: payAllNow ? stayTotal : 0,
        saldoPendiente: payAllNow ? 0 : stayTotal,
      };
    });

    const stayByRoomId = new Map(createdStays.map((s) => [s.roomId, s.id]));

    const singleSale: SaleRecord | null =
      payAllNow && singleComprobante
        ? {
            id: genId('sale'),
            fecha: now.toISOString(),
            origenTipo: 'HABITACION',
            roomNumber: createdStays.map((s) => s.roomNumber).join(', '),
            guestName: agency.nombre,
            guestDoc: agency.numDoc,
            descripcion: `Facturación Grupal ${groupCode}: ${groupName} (${payload.totalPax} pax · ${createdStays.length} habs · ${payload.cantidad} ${payload.modalidad.toLowerCase()})`,
            metodoPago: payload.metodoPago,
            voucherType: payload.voucherType,
            comprobante: singleComprobante,
            monto: grandTotal,
            esCortesia: false,
            turno: activeShiftName,
            responsable: activeUser.username,
            status: 'ACTIVO',
            sunatEnviado: state.config.sunafactActivo,
            groupId,
          }
        : null;

    const newGroup: AgencyGroup = {
      id: groupId,
      codigo: groupCode,
      nombreGrupo: groupName,
      agencyId: agency.id,
      agencyName: agency.nombre,
      agencyDoc: agency.numDoc,
      guiaResponsable: guiaNombre,
      totalPax: payload.totalPax,
      fechaEntrada: now.toISOString(),
      fechaSalidaProgramada: salida.toISOString(),
      noches: payload.cantidad,
      observaciones: payload.observaciones,
      status: 'ACTIVO',
      facturadoConsolidado: Boolean(singleSale),
      comprobanteConsolidado: singleComprobante,
      montoTotalConsolidado: singleSale ? grandTotal : undefined,
    };

    setState((prev) => ({
      ...prev,
      guests: leadGuestToCreate ? [leadGuestToCreate, ...prev.guests] : prev.guests,
      agencyGroups: [newGroup, ...prev.agencyGroups],
      stays: [...createdStays, ...prev.stays],
      rooms: prev.rooms.map((r) => {
        const assignedStayId = stayByRoomId.get(r.id);
        return assignedStayId ? { ...r, status: 'OCUPADO', currentStayId: assignedStayId } : r;
      }),
      sales: singleSale ? [singleSale, ...prev.sales] : prev.sales,
    }));

    notify(
      'success',
      `Grupo ${groupCode} ingresado (${createdStays.length} habs · ${payload.totalPax} pax)`,
      singleSale
        ? `Pago único ${singleComprobante} por S/ ${grandTotal.toFixed(2)} a ${agency.nombre}`
        : `Cuenta consolidada por cobrar a ${agency.nombre}`
    );

    return { group: newGroup, stays: createdStays, sale: singleSale };
  };

  const payAgencyGroupConsolidated = (
    groupId: string,
    metodoPago: PaymentMethodName,
    voucherType: VoucherType
  ): SaleRecord | null => {
    const group = state.agencyGroups.find((g) => g.id === groupId);
    if (!group) return null;

    const groupStaysWithBalance = state.stays.filter(
      (s) => s.groupId === groupId && s.saldoPendiente > 0
    );
    if (groupStaysWithBalance.length === 0) {
      notify('info', 'Grupo sin saldo pendiente', 'Todas las habitaciones del grupo ya están pagadas.');
      return null;
    }

    const totalBalance = groupStaysWithBalance.reduce((sum, s) => sum + s.saldoPendiente, 0);
    const now = new Date().toISOString();
    const comprobante = nextVoucherNumber(state.sales, voucherType, state.config);
    const roomNumbers = groupStaysWithBalance.map((s) => s.roomNumber).join(', ');

    const consolidatedSale: SaleRecord = {
      id: genId('sale'),
      fecha: now,
      origenTipo: 'HABITACION',
      roomNumber: roomNumbers,
      guestName: group.agencyName,
      guestDoc: group.agencyDoc,
      descripcion: `Liquidación Consolidada ${group.codigo}: ${group.nombreGrupo} (${groupStaysWithBalance.length} habs · ${group.totalPax} pax)`,
      metodoPago,
      voucherType,
      comprobante,
      monto: totalBalance,
      esCortesia: false,
      turno: activeShiftName,
      responsable: activeUser.username,
      status: 'ACTIVO',
      sunatEnviado: state.config.sunafactActivo,
      groupId: group.id,
    };

    setState((prev) => ({
      ...prev,
      stays: prev.stays.map((s) => {
        if (s.groupId !== groupId || s.saldoPendiente <= 0) return s;
        const paidAmount = s.saldoPendiente;
        const newPayment: StayPayment = {
          id: genId('pay'),
          fecha: now,
          monto: paidAmount,
          metodoPago,
          comprobante,
          voucherType,
          concepto: `Liquidación única grupo ${group.codigo} (${group.agencyName})`,
          turno: activeShiftName,
          responsable: activeUser.username,
        };
        return {
          ...s,
          consumptions: s.consumptions.map((c) => ({ ...c, pagado: true })),
          payments: [...s.payments, newPayment],
          totalPagado: s.totalPagado + paidAmount,
          saldoPendiente: 0,
        };
      }),
      agencyGroups: prev.agencyGroups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              facturadoConsolidado: true,
              comprobanteConsolidado: comprobante,
              montoTotalConsolidado: (g.montoTotalConsolidado || 0) + totalBalance,
            }
          : g
      ),
      sales: [consolidatedSale, ...prev.sales],
    }));

    notify(
      'success',
      `Pago único consolidado ${comprobante}`,
      `${group.agencyName}: S/ ${totalBalance.toFixed(2)} liquidado en 1 comprobante.`
    );
    return consolidatedSale;
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

    const nextVigencia = `${toYMD(nextExit)} ${state.config.horaCheckOut}`;

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
      roomDevices: prev.roomDevices.map((d) =>
        d.roomId === stay.roomId
          ? { ...d, llaveVigenciaHasta: nextVigencia, ultimaActualizacion: now }
          : d
      ),
      crmThreads: prev.crmThreads.map((t) =>
        t.stayId === stayId ? { ...t, llaveExpira: nextVigencia } : t
      ),
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

    notify(
      'success',
      `Estadía Hab. ${stay.roomNumber} renovada`,
      `+${cantidad} ${modalidad.toLowerCase()} · Llave digital extendida automáticamente`
    );
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

    const rtFound = state.roomTypes.find((t) => t.id === targetRoom.roomTypeId);
    const now = new Date().toISOString();
    const oldDevice = state.roomDevices.find((d) => d.roomId === stay.roomId);
    const newKeyCode = `NFC-${targetRoom.numero}-${Math.floor(1000 + Math.random() * 8999)}`;
    const vigenciaStr =
      oldDevice?.llaveVigenciaHasta ||
      `${stay.fechaSalidaProgramada.slice(0, 10)} ${state.config.horaCheckOut}`;

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
              roomTypeName: rtFound?.nombre || s.roomTypeName,
              observaciones: `${s.observaciones} [Cambio de Hab. ${stay.roomNumber} -> ${targetRoom.numero}${s.groupName ? ` · Mantiene Grupo ${s.groupName}` : ''}]`.trim(),
            }
          : s
      ),
      roomDevices: prev.roomDevices.map((d) => {
        if (d.roomId === stay.roomId) {
          return {
            ...d,
            aireModo: 'ECO',
            luces: 'APAGADAS',
            cortinas: 'CERRADAS',
            cartelDigital: 'LIMPIAR_AHORA',
            sensorPresencia: 'VACIA_SIN_MOVIMIENTO',
            llaveMovilActiva: false,
            llaveMovilCodigo: undefined,
            llaveVigenciaHasta: undefined,
            ultimaActualizacion: now,
          };
        }
        if (d.roomId === targetRoom.id) {
          return {
            ...d,
            aireModo: 'CONFORT',
            temperaturaObjetivo: 21,
            temperaturaActual: 21,
            luces: 'ENCENDIDAS',
            cortinas: 'ABIERTAS',
            cartelDigital: 'NINGUNO',
            sensorPresencia: 'CON_HUESPED',
            llaveMovilActiva: true,
            llaveMovilCodigo: newKeyCode,
            llaveVigenciaHasta: vigenciaStr,
            ultimaActualizacion: now,
          };
        }
        return d;
      }),
      crmThreads: prev.crmThreads.map((t) =>
        t.stayId === stay.id
          ? {
              ...t,
              roomId: targetRoom.id,
              roomNumber: targetRoom.numero,
              llaveMovilActiva: true,
            }
          : t
      ),
      acsAccessLogs: [
        {
          id: genId('acs'),
          roomId: targetRoom.id,
          roomNumber: targetRoom.numero,
          actor: stay.guestName,
          rolActor: 'HUESPED_MOVIL',
          metodo: 'LLAVE_MOVIL_NFC',
          autorizado: true,
          fecha: now,
        },
        ...prev.acsAccessLogs,
      ],
    }));

    notify(
      'success',
      `Cambio de habitación realizado`,
      stay.groupName
        ? `Hab. ${targetRoom.numero} asignada manteniendo grupo ${stay.groupName} (${stay.agencyName || 'Agencia'}) · Llave ${newKeyCode}`
        : `Huésped movido a Hab. ${targetRoom.numero} · Llave NFC ${newKeyCode} transferida`
    );
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
      roomDevices: prev.roomDevices.map((d) =>
        d.roomId === stay.roomId
          ? {
              ...d,
              aireModo: 'ECO',
              luces: 'APAGADAS',
              cortinas: 'CERRADAS',
              cartelDigital: 'LIMPIAR_AHORA',
              sensorPresencia: 'VACIA_SIN_MOVIMIENTO',
              llaveMovilActiva: false,
              llaveMovilCodigo: undefined,
              llaveVigenciaHasta: undefined,
              ultimaActualizacion: now,
            }
          : d
      ),
      crmThreads: prev.crmThreads.map((t) =>
        t.stayId === stayId ? { ...t, llaveMovilActiva: false } : t
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
      'Habitación enviada a Limpieza, GRMS en modo ahorro ECO y llave móvil revocada.'
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

  const updateReservation = (id: string, updates: Partial<Reservation>): boolean => {
    const current = state.reservations.find((r) => r.id === id);
    if (!current) return false;

    const merged: Reservation = { ...current, ...updates };
    const startYmd = merged.fechaEntrada.slice(0, 10);
    const endYmd = merged.fechaSalida.slice(0, 10);

    if (endYmd <= startYmd) {
      notify('error', 'Fechas inválidas', 'La fecha de salida debe ser posterior a la fecha de entrada.');
      return false;
    }

    if (merged.status !== 'CANCELADA') {
      const conflict = state.reservations.find((r) => {
        if (r.id === id || r.roomId !== merged.roomId || r.status === 'CANCELADA') return false;
        const rStart = r.fechaEntrada.slice(0, 10);
        const rEnd = r.fechaSalida.slice(0, 10);
        return startYmd < rEnd && endYmd > rStart;
      });
      if (conflict) {
        notify(
          'warning',
          `Cruce en Hab. ${merged.roomNumber}`,
          `Se superpone con ${conflict.localizador} (${conflict.guestName}: ${conflict.fechaEntrada.slice(0, 10)} al ${conflict.fechaSalida.slice(0, 10)}).`
        );
        return false;
      }
    }

    setState((prev) => ({
      ...prev,
      reservations: prev.reservations.map((r) => (r.id === id ? merged : r)),
    }));
    notify(
      'success',
      `Reserva ${merged.localizador} actualizada`,
      `Hab. ${merged.roomNumber} · ${startYmd} al ${endYmd} (${merged.noches} noches)`
    );
    return true;
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

  const saveAgency = (agency: Omit<Agency, 'id'> & { id?: string }): Agency => {
    const cleanName = agency.nombre.trim().toUpperCase();
    const cleanDoc = agency.numDoc.trim();
    const existing = !agency.id && cleanDoc
      ? state.agencies.find((a) => a.numDoc.trim() === cleanDoc || a.nombre.trim().toUpperCase() === cleanName)
      : undefined;
    const targetId = agency.id || existing?.id;

    const saved: Agency = targetId
      ? { ...agency, id: targetId, nombre: cleanName, numDoc: cleanDoc }
      : { ...agency, id: genId('ag'), nombre: cleanName, numDoc: cleanDoc };

    setState((prev) => ({
      ...prev,
      agencies: targetId
        ? prev.agencies.map((a) => (a.id === targetId ? saved : a))
        : [saved, ...prev.agencies],
    }));
    notify('success', 'Empresa / Agencia guardada', saved.nombre);
    return saved;
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

  // ============================================================
  // MODERN SMART HOSPITALITY ECOSYSTEM METHODS
  // ============================================================

  const translateTextPreview = (textEs: string, lang: GuestLanguage): string => {
    if (lang === 'ES') return textEs;
    const prefix: Record<GuestLanguage, string> = {
      ES: '',
      EN: '[EN Auto-Translated] ',
      DE: '[DE Auto-Übersetzt] ',
      JP: '[JP 自動翻訳] ',
      FR: '[FR Traduit] ',
      PT: '[PT Traduzido] ',
    };
    return `${prefix[lang]}${textEs}`;
  };

  // 1. Smart Wake-Up (PBX + WhatsApp + Voice IoT)
  const scheduleWakeUp: PMSContextValue['scheduleWakeUp'] = (payload) => {
    const room = state.rooms.find((r) => r.id === payload.roomId);
    if (!room) return null;
    const stay = state.stays.find((s) => s.roomId === room.id && s.status === 'ACTIVA');
    const guest = stay ? state.guests.find((g) => g.id === stay.guestId) : undefined;
    const item: WakeUpCall = {
      id: genId('wu'),
      roomId: room.id,
      roomNumber: room.numero,
      stayId: stay?.id,
      guestId: guest?.id,
      guestName: stay?.guestName || `HUÉSPED HAB. ${room.numero}`,
      horaProgramada: payload.horaProgramada,
      fechaProgramada: payload.fechaProgramada,
      canal: payload.canal,
      idioma: payload.idioma || guest?.idiomaPreferido || 'ES',
      pbxExtension: room.numero,
      pbxProvider: payload.pbxProvider || 'Yeastar',
      status: 'PROGRAMADO',
      intentos: 0,
      pospuestoMin: 0,
      creadoPor: payload.creadoPor || activeUser.username,
    };

    setState((prev) => ({
      ...prev,
      wakeUpCalls: [item, ...prev.wakeUpCalls],
      guests: guest
        ? prev.guests.map((g) =>
            g.id === guest.id ? { ...g, horaDespertadorHabitual: payload.horaProgramada } : g
          )
        : prev.guests,
    }));
    notify(
      'success',
      `Despertador Hab. ${room.numero} programado`,
      `${payload.horaProgramada} · Canal: ${payload.canal.replace(/_/g, ' ')}`
    );
    return item;
  };

  const triggerWakeUpCall = (id: string) => {
    const now = new Date().toISOString();
    const target = state.wakeUpCalls.find((w) => w.id === id);
    if (!target) return;
    setState((prev) => ({
      ...prev,
      wakeUpCalls: prev.wakeUpCalls.map((w) =>
        w.id === id
          ? { ...w, status: 'SONANDO', intentos: w.intentos + 1, ultimaEjecucion: now }
          : w
      ),
    }));
    notify(
      'info',
      `Ejecutando despertador Hab. ${target.roomNumber}`,
      `Timbrando extensión PBX ${target.pbxExtension} (${target.pbxProvider}) y WhatsApp Bot`
    );
  };

  const respondWakeUpCall = (
    id: string,
    outcome: 'ATENDIDO' | 'POSPUESTO' | 'FALLO_SIN_RESPUESTA',
    extraMin = 10
  ) => {
    const target = state.wakeUpCalls.find((w) => w.id === id);
    if (!target) return;

    const shiftHHMM = (hhmm: string, mins: number) => {
      const [h, m] = hhmm.split(':').map(Number);
      const tot = ((h || 0) * 60 + (m || 0) + mins) % (24 * 60);
      return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
    };

    setState((prev) => ({
      ...prev,
      wakeUpCalls: prev.wakeUpCalls.map((w) => {
        if (w.id !== id) return w;
        if (outcome === 'POSPUESTO') {
          return {
            ...w,
            status: 'POSPUESTO',
            pospuestoMin: w.pospuestoMin + extraMin,
            horaProgramada: shiftHHMM(w.horaProgramada, extraMin),
            respuestaHuesped: `Pospuesto +${extraMin} min por huésped`,
          };
        }
        return {
          ...w,
          status: outcome,
          respuestaHuesped:
            outcome === 'ATENDIDO'
              ? 'Confirmado ("Sí, gracias")'
              : 'Sin respuesta tras 5 timbres PBX - Requiere verificación en puerta',
        };
      }),
    }));

    if (outcome === 'FALLO_SIN_RESPUESTA') {
      notify(
        'error',
        `ALERTA ROJA DESPERTADOR · Hab. ${target.roomNumber}`,
        'Huésped no contestó el teléfono PBX ni WhatsApp. Enviar agente a tocar la puerta.'
      );
    } else if (outcome === 'POSPUESTO') {
      notify('warning', `Despertador Hab. ${target.roomNumber} pospuesto +${extraMin} min`);
    } else {
      notify('success', `Despertador Hab. ${target.roomNumber} atendido por el huésped`);
    }
  };

  const deleteWakeUpCall = (id: string) => {
    setState((prev) => ({
      ...prev,
      wakeUpCalls: prev.wakeUpCalls.filter((w) => w.id !== id),
    }));
  };

  // 2. Tour Packages & Spa Bookings
  const saveTourPackage: PMSContextValue['saveTourPackage'] = (pkg) => {
    const saved: TourPackage = pkg.id
      ? { ...pkg, id: pkg.id }
      : { ...pkg, id: genId('pkg') };
    setState((prev) => ({
      ...prev,
      tourPackages: pkg.id
        ? prev.tourPackages.map((p) => (p.id === pkg.id ? saved : p))
        : [saved, ...prev.tourPackages],
    }));
    notify('success', 'Paquete turístico guardado', saved.nombre);
    return saved;
  };

  const bookTourPackage: PMSContextValue['bookTourPackage'] = (payload) => {
    const pkg = state.tourPackages.find((p) => p.id === payload.packageId);
    if (!pkg) return null;

    const now = new Date().toISOString();
    const total = Math.max(0, pkg.precioPorPax * Math.max(1, payload.pax));
    const bookingId = genId('tb');
    const codigo = `EXP-${Math.floor(1000 + Math.random() * 8999)}`;
    const stay = payload.stayId
      ? state.stays.find((s) => s.id === payload.stayId && s.status === 'ACTIVA')
      : undefined;

    const paidDirect = !payload.chargeToRoom && payload.metodoPago && payload.metodoPago !== 'X PAGAR';
    const vType: VoucherType = payload.voucherType || 'BOLETA';
    const comprobante = paidDirect ? nextVoucherNumber(state.sales, vType, state.config) : '';

    const newBooking: TourBooking = {
      id: bookingId,
      codigo,
      packageId: pkg.id,
      packageName: pkg.nombre,
      stayId: stay?.id,
      roomId: stay?.roomId || payload.roomId,
      roomNumber: stay?.roomNumber || payload.roomNumber,
      guestId: stay?.guestId || payload.guestId,
      guestName: payload.guestName || stay?.guestName || 'HUÉSPED',
      guestDoc: payload.guestDoc || stay?.guestDocNum,
      fechaTour: payload.fechaTour,
      horaRecojo: payload.horaRecojo || pkg.horarioSalida,
      pax: Math.max(1, payload.pax),
      precioUnitario: pkg.precioPorPax,
      total,
      cargadoAHabitacion: Boolean(stay && payload.chargeToRoom),
      pagado: Boolean(paidDirect),
      metodoPago: paidDirect ? payload.metodoPago : payload.chargeToRoom ? 'X PAGAR' : undefined,
      status: 'CONFIRMADA',
      solicitadoVia: payload.solicitadoVia || 'RECEPCION',
      observaciones: payload.observaciones || '',
    };

    const consumptionForStay: StayConsumption | null =
      stay && payload.chargeToRoom
        ? {
            id: genId('con'),
            productId: pkg.id,
            descripcion: `TOUR/SPA: ${pkg.nombre} (${newBooking.pax} pax · ${payload.fechaTour})`,
            cantidad: newBooking.pax,
            precioUnitario: pkg.precioPorPax,
            subtotal: total,
            fecha: now,
            pagado: false,
            entregado: true,
          }
        : null;

    const newSale: SaleRecord | null = paidDirect
      ? {
          id: genId('sale'),
          fecha: now,
          origenTipo: stay ? 'HABITACION' : 'VENTA_LIBRE',
          roomNumber: stay?.roomNumber || payload.roomNumber,
          guestName: newBooking.guestName,
          guestDoc: newBooking.guestDoc,
          descripcion: `Paquete Turístico ${codigo}: ${pkg.nombre} (${newBooking.pax} pax)`,
          metodoPago: payload.metodoPago!,
          voucherType: vType,
          comprobante,
          monto: total,
          esCortesia: payload.metodoPago === 'PAX LIBRES',
          turno: activeShiftName,
          responsable: activeUser.username,
          status: 'ACTIVO',
          sunatEnviado: state.config.sunafactActivo,
          stayId: stay?.id,
        }
      : null;

    setState((prev) => ({
      ...prev,
      tourBookings: [newBooking, ...prev.tourBookings],
      stays:
        stay && consumptionForStay
          ? prev.stays.map((s) => {
              if (s.id !== stay.id) return s;
              const nextTotalCargos = s.totalCargos + total;
              return {
                ...s,
                consumptions: [...s.consumptions, consumptionForStay],
                totalCargos: nextTotalCargos,
                saldoPendiente: Math.max(0, nextTotalCargos - s.totalPagado),
              };
            })
          : prev.stays,
      sales: newSale ? [newSale, ...prev.sales] : prev.sales,
    }));

    notify(
      'success',
      `Reserva Tour ${codigo} confirmada`,
      stay && payload.chargeToRoom
        ? `Cargado a cuenta Hab. ${stay.roomNumber} (S/ ${total.toFixed(2)})`
        : paidDirect
          ? `Cobrado con ${comprobante}`
          : `${pkg.nombre} (${newBooking.pax} pax)`
    );
    return newBooking;
  };

  const updateTourBookingStatus = (id: string, status: TourBooking['status']) => {
    setState((prev) => ({
      ...prev,
      tourBookings: prev.tourBookings.map((b) => (b.id === id ? { ...b, status } : b)),
    }));
    notify('info', `Reserva turística actualizada a ${status}`);
  };

  // 3. CRM Omnichannel & WhatsApp AI Agent
  const ensureCrmThread: PMSContextValue['ensureCrmThread'] = (params) => {
    const existing = state.crmThreads.find(
      (t) =>
        (params.stayId && t.stayId === params.stayId) ||
        (params.guestId && t.guestId === params.guestId)
    );
    if (existing) return existing;

    const guest = params.guestId ? state.guests.find((g) => g.id === params.guestId) : undefined;
    const now = new Date().toISOString();
    const newThread: CrmThread = {
      id: genId('crm'),
      guestId: params.guestId,
      guestName: params.guestName,
      telefono: params.telefono || guest?.celular || '+51 984 000 100',
      canal: params.canal || 'WHATSAPP',
      idiomaHuesped: params.idioma || guest?.idiomaPreferido || 'ES',
      roomId: params.roomId,
      roomNumber: params.roomNumber,
      stayId: params.stayId,
      preCheckInBiometrico: guest?.biometriaVerificada ? 'VERIFICADO' : 'NO_ENVIADO',
      llaveMovilActiva: Boolean(params.roomId),
      llaveMovilCodigo: params.roomNumber ? `NFC-${params.roomNumber}-${Math.floor(1000 + Math.random() * 8999)}` : undefined,
      ultimoMensaje: 'Canal WhatsApp CRM iniciado',
      updatedAt: now,
      unreadCount: 0,
      messages: [],
    };
    setState((prev) => ({ ...prev, crmThreads: [newThread, ...prev.crmThreads] }));
    return newThread;
  };

  const sendCrmMessage: PMSContextValue['sendCrmMessage'] = (
    threadId,
    texto,
    sender = 'STAFF',
    actionTag
  ) => {
    const thread = state.crmThreads.find((t) => t.id === threadId);
    if (!thread || !texto.trim()) return;
    const now = new Date().toISOString();
    const translated = sender === 'GUEST' ? texto : translateTextPreview(texto, thread.idiomaHuesped);
    const msg: CrmMessage = {
      id: genId('msg'),
      sender,
      textoOriginal: sender === 'GUEST' ? texto : translated,
      textoTraducidoEs: texto,
      idioma: thread.idiomaHuesped,
      timestamp: now,
      actionTag,
    };
    setState((prev) => ({
      ...prev,
      crmThreads: prev.crmThreads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messages: [...t.messages, msg],
              ultimoMensaje: texto,
              updatedAt: now,
              unreadCount: sender === 'GUEST' ? t.unreadCount + 1 : 0,
            }
          : t
      ),
    }));
  };

  const sendBiometricPreCheckIn = (threadId: string) => {
    const thread = state.crmThreads.find((t) => t.id === threadId);
    if (!thread) return;
    const now = new Date().toISOString();
    const msgEs = `Hola ${thread.guestName.split(' ')[0]}, completa tu Pre-Check-In biométrico (DNI/Pasaporte + selfie) aquí para activar tu Llave Digital NFC sin filas: https://checkin.lachuspatech.com/${thread.id}`;
    setState((prev) => ({
      ...prev,
      crmThreads: prev.crmThreads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              preCheckInBiometrico: 'PENDIENTE',
              ultimoMensaje: 'Enlace Pre-Check-In biométrico enviado',
              updatedAt: now,
              messages: [
                ...t.messages,
                {
                  id: genId('msg'),
                  sender: 'AGENT_AI',
                  textoOriginal: translateTextPreview(msgEs, t.idiomaHuesped),
                  textoTraducidoEs: msgEs,
                  idioma: t.idiomaHuesped,
                  timestamp: now,
                  actionTag: 'PRE_CHECKIN',
                },
              ],
            }
          : t
      ),
    }));
    notify('info', 'Enlace biométrico enviado por WhatsApp', thread.guestName);
  };

  const verifyBiometricAndIssueKey = (threadId: string) => {
    const thread = state.crmThreads.find((t) => t.id === threadId);
    if (!thread) return;
    const now = new Date().toISOString();
    const keyCode = thread.llaveMovilCodigo || `NFC-${thread.roomNumber || 'VIP'}-${Math.floor(1000 + Math.random() * 8999)}`;
    const stay = thread.stayId ? state.stays.find((s) => s.id === thread.stayId) : undefined;
    const expira = stay ? `${stay.fechaSalidaProgramada.slice(0, 10)} ${state.config.horaCheckOut}` : `${toYMD(new Date())} 23:59`;
    const msgEs = `Identidad verificada por biometría ✓. Tu Llave Móvil NFC (${keyCode}) ya está activa hasta ${expira}.`;

    setState((prev) => ({
      ...prev,
      guests: thread.guestId
        ? prev.guests.map((g) => (g.id === thread.guestId ? { ...g, biometriaVerificada: true } : g))
        : prev.guests,
      crmThreads: prev.crmThreads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              preCheckInBiometrico: 'VERIFICADO',
              llaveMovilActiva: true,
              llaveMovilCodigo: keyCode,
              llaveExpira: expira,
              ultimoMensaje: `Llave móvil ${keyCode} emitida`,
              updatedAt: now,
              messages: [
                ...t.messages,
                {
                  id: genId('msg'),
                  sender: 'AGENT_AI',
                  textoOriginal: translateTextPreview(msgEs, t.idiomaHuesped),
                  textoTraducidoEs: msgEs,
                  idioma: t.idiomaHuesped,
                  timestamp: now,
                  actionTag: 'DIGITAL_KEY',
                },
              ],
            }
          : t
      ),
      roomDevices: thread.roomId
        ? prev.roomDevices.map((d) =>
            d.roomId === thread.roomId
              ? { ...d, llaveMovilActiva: true, llaveMovilCodigo: keyCode, llaveVigenciaHasta: expira }
              : d
          )
        : prev.roomDevices,
    }));
    notify('success', `Biometría validada · Llave ${keyCode} activa`);
  };

  const approveLateCheckOutFromCrm: PMSContextValue['approveLateCheckOutFromCrm'] = (
    threadId,
    extraHours,
    extraFee,
    chargeToFolio
  ) => {
    const thread = state.crmThreads.find((t) => t.id === threadId);
    if (!thread || !thread.stayId) {
      notify('warning', 'El hilo no tiene una estadía activa asociada');
      return;
    }
    const stay = state.stays.find((s) => s.id === thread.stayId && s.status === 'ACTIVA');
    if (!stay) return;

    renewStay(
      stay.id,
      extraHours,
      'HORAS',
      extraFee,
      !chargeToFolio,
      chargeToFolio ? 'X PAGAR' : 'TARJETA',
      'BOLETA'
    );

    const now = new Date().toISOString();
    const replyEs = `¡Late Check-Out aprobado (+${extraHours}h por S/ ${extraFee.toFixed(2)})! Tu llave móvil NFC ha sido extendida automáticamente.`;
    setState((prev) => ({
      ...prev,
      crmThreads: prev.crmThreads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              ultimoMensaje: replyEs,
              updatedAt: now,
              messages: [
                ...t.messages,
                {
                  id: genId('msg'),
                  sender: 'AGENT_AI',
                  textoOriginal: translateTextPreview(replyEs, t.idiomaHuesped),
                  textoTraducidoEs: replyEs,
                  idioma: t.idiomaHuesped,
                  timestamp: now,
                  actionTag: 'LATE_CHECKOUT',
                },
              ],
            }
          : t
      ),
    }));
  };

  // 4. Room Service & KDS Cocina
  const createRoomServiceOrder: PMSContextValue['createRoomServiceOrder'] = (payload) => {
    const stay = state.stays.find((s) => s.id === payload.stayId && s.status === 'ACTIVA');
    if (!stay || payload.items.length === 0) return null;

    const now = new Date().toISOString();
    const guest = state.guests.find((g) => g.id === stay.guestId);
    const items = payload.items
      .map((it) => {
        const prod = state.products.find((p) => p.id === it.productId);
        if (!prod) return null;
        return {
          productId: prod.id,
          descripcion: prod.descripcion,
          cantidad: it.cantidad,
          precioUnitario: prod.precio,
          subtotal: prod.precio * it.cantidad,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    if (items.length === 0) return null;
    const total = items.reduce((a, b) => a + b.subtotal, 0);
    const orderId = genId('kds');
    const codigo = `KDS-${String(state.roomServiceOrders.length + 85).padStart(3, '0')}`;

    addConsumptionToStay(
      stay.id,
      items.map((i) => ({
        productId: i.productId,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
      })),
      Boolean(payload.pagarAhora),
      payload.metodoPago || 'X PAGAR',
      payload.voucherType || 'TICKET',
      'RECEPCION'
    );

    const order: RoomServiceOrder = {
      id: orderId,
      codigo,
      stayId: stay.id,
      roomId: stay.roomId,
      roomNumber: stay.roomNumber,
      guestName: stay.guestName,
      alergiasAlert: guest?.alergias,
      canal: payload.canal,
      items,
      total,
      pagado: Boolean(payload.pagarAhora),
      status: 'PENDIENTE',
      notasCocina: payload.notasCocina || '',
      createdAt: now,
      whatsappNotificado: false,
    };

    setState((prev) => ({
      ...prev,
      roomServiceOrders: [order, ...prev.roomServiceOrders],
    }));

    notify(
      'success',
      `Comanda ${codigo} enviada a Cocina KDS`,
      `Hab. ${stay.roomNumber} · S/ ${total.toFixed(2)}${guest?.alergias ? ` · ⚠ ${guest.alergias}` : ''}`
    );
    return order;
  };

  const advanceKdsOrderStatus = (orderId: string, nextStatus: RoomServiceOrder['status']) => {
    const order = state.roomServiceOrders.find((o) => o.id === orderId);
    if (!order) return;
    const now = new Date().toISOString();

    setState((prev) => ({
      ...prev,
      roomServiceOrders: prev.roomServiceOrders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: nextStatus,
              readyAt: nextStatus === 'LISTO' ? now : o.readyAt,
              whatsappNotificado: nextStatus === 'LISTO' ? true : o.whatsappNotificado,
            }
          : o
      ),
      stays:
        nextStatus === 'ENTREGADO' || nextStatus === 'FINALIZADO'
          ? prev.stays.map((s) =>
              s.id === order.stayId
                ? {
                    ...s,
                    consumptions: s.consumptions.map((c) =>
                      order.items.some((oi) => oi.productId === c.productId)
                        ? { ...c, entregado: true }
                        : c
                    ),
                  }
                : s
            )
          : prev.stays,
      crmThreads:
        nextStatus === 'LISTO'
          ? prev.crmThreads.map((t) =>
              t.stayId === order.stayId
                ? {
                    ...t,
                    ultimoMensaje: `Pedido ${order.codigo} listo y en camino a Hab. ${order.roomNumber}`,
                    updatedAt: now,
                    messages: [
                      ...t.messages,
                      {
                        id: genId('msg'),
                        sender: 'AGENT_AI',
                        textoOriginal: translateTextPreview(
                          `¡Tu pedido ${order.codigo} está listo y va en camino a tu habitación ${order.roomNumber}! Al terminar, avísanos para retirar la bandeja.`,
                          t.idiomaHuesped
                        ),
                        textoTraducidoEs: `¡Tu pedido ${order.codigo} está listo y va en camino a tu habitación ${order.roomNumber}! Al terminar, avísanos para retirar la bandeja.`,
                        idioma: t.idiomaHuesped,
                        timestamp: now,
                        actionTag: 'ROOM_SERVICE',
                      },
                    ],
                  }
                : t
            )
          : prev.crmThreads,
    }));

    const labelMap: Record<RoomServiceOrder['status'], string> = {
      PENDIENTE: 'Pendiente',
      EN_PREPARACION: 'En preparación en Cocina',
      LISTO: 'Listo · WhatsApp enviado al huésped',
      ENTREGADO: 'Entregado en habitación',
      BANDEJA_POR_RECOGER: 'Solicitud de retiro de bandeja',
      FINALIZADO: 'Bandeja recogida · Ciclo completado',
    };
    notify('info', `KDS ${order.codigo} (Hab. ${order.roomNumber})`, labelMap[nextStatus]);
  };

  // 5. Bell Boys & Transfers
  const createBellBoyTicket: PMSContextValue['createBellBoyTicket'] = (payload) => {
    const ticket: BellBoyTicket = {
      ...payload,
      id: genId('bb'),
      codigoQr: `QR-BG-${Math.floor(1000 + Math.random() * 8999)}`,
      status: payload.status || (payload.tipo === 'GUARDAEQUIPAJE' ? 'RESGUARDADO' : 'PENDIENTE'),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      bellBoyTickets: [ticket, ...prev.bellBoyTickets],
    }));
    notify('success', `Ticket Bell Boy ${ticket.codigoQr}`, `${ticket.guestName} · ${ticket.bultos} bultos`);
    return ticket;
  };

  const updateBellBoyStatus = (
    id: string,
    status: BellBoyTicket['status'],
    asignadoA?: string
  ) => {
    setState((prev) => ({
      ...prev,
      bellBoyTickets: prev.bellBoyTickets.map((b) =>
        b.id === id ? { ...b, status, asignadoA: asignadoA || b.asignadoA } : b
      ),
    }));
    notify('info', `Ticket equipaje actualizado a ${status}`);
  };

  const createTransfer: PMSContextValue['createTransfer'] = (payload) => {
    const transfer: AirportTransfer = {
      ...payload,
      id: genId('tr'),
      codigo: `TRF-${Math.floor(500 + Math.random() * 499)}`,
      horaActualizada: payload.horaProgramada,
      retrasoMin: 0,
      status: 'PROGRAMADO',
    };
    setState((prev) => ({
      ...prev,
      transfers: [transfer, ...prev.transfers],
    }));
    notify('success', `Traslado ${transfer.codigo} programado`, `Vuelo ${transfer.vuelo} · ${transfer.chofer}`);
    return transfer;
  };

  const reportFlightDelay = (id: string, delayMinutes: number) => {
    const tr = state.transfers.find((t) => t.id === id);
    if (!tr) return;
    const [h, m] = tr.horaProgramada.split(':').map(Number);
    const totalMin = ((h || 0) * 60 + (m || 0) + delayMinutes) % (24 * 60);
    const nextHour = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;

    setState((prev) => ({
      ...prev,
      transfers: prev.transfers.map((t) =>
        t.id === id
          ? {
              ...t,
              retrasoMin: delayMinutes,
              horaActualizada: nextHour,
              status: 'VUELO_RETRASADO',
            }
          : t
      ),
    }));
    notify(
      'warning',
      `Vuelo ${tr.vuelo} retrasado +${delayMinutes} min`,
      `Chofer ${tr.chofer} y Bell Boy reprogramados automáticamente para las ${nextHour}.`
    );
  };

  const updateTransferStatus = (id: string, status: AirportTransfer['status']) => {
    setState((prev) => ({
      ...prev,
      transfers: prev.transfers.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  };

  // 6. Medical, Oxygen & Emergency Alerts
  const triggerMedicalAlert: PMSContextValue['triggerMedicalAlert'] = (payload) => {
    const room = state.rooms.find((r) => r.id === payload.roomId);
    if (!room) return null;
    const stay = state.stays.find((s) => s.roomId === room.id && s.status === 'ACTIVA');
    const guest = stay ? state.guests.find((g) => g.id === stay.guestId) : undefined;
    const historyParts = [guest?.alergias, guest?.condicionesMedicas].filter(Boolean);

    const alert: MedicalAlert = {
      id: genId('med'),
      codigo: `SOS-${String(state.medicalAlerts.length + 20).padStart(3, '0')}`,
      roomId: room.id,
      roomNumber: room.numero,
      stayId: stay?.id,
      guestId: guest?.id,
      guestName: stay?.guestName || `HUÉSPED HAB. ${room.numero}`,
      tipo: payload.tipo,
      prioridad: payload.tipo === 'EMERGENCIA_CRITICA' ? 'CRITICA' : 'ALTA',
      origen: payload.origen,
      alergiasHistorial: historyParts.join(' · ') || 'Sin alergias ni antecedentes declarados en CRM',
      sintomas: payload.sintomas,
      cargoServicio: payload.cargoServicio || 0,
      status: 'ACTIVA',
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      medicalAlerts: [alert, ...prev.medicalAlerts],
    }));
    notify(
      'error',
      `ALERTA MÉDICA ${alert.codigo} · HAB. ${room.numero}`,
      `${payload.tipo.replace(/_/g, ' ')} · ${alert.guestName}`
    );
    return alert;
  };

  const updateMedicalAlertStatus = (
    id: string,
    status: MedicalAlert['status'],
    asignadoA?: string,
    cargoServicio?: number
  ) => {
    const alert = state.medicalAlerts.find((m) => m.id === id);
    if (!alert) return;
    const now = new Date().toISOString();
    const finalFee = cargoServicio !== undefined ? cargoServicio : alert.cargoServicio;

    setState((prev) => ({
      ...prev,
      medicalAlerts: prev.medicalAlerts.map((m) =>
        m.id === id
          ? {
              ...m,
              status,
              asignadoA: asignadoA || m.asignadoA,
              cargoServicio: finalFee,
              resolvedAt: status === 'RESUELTA' ? now : m.resolvedAt,
            }
          : m
      ),
      stays:
        status === 'RESUELTA' && finalFee > 0 && alert.stayId && alert.status !== 'RESUELTA'
          ? prev.stays.map((s) => {
              if (s.id !== alert.stayId) return s;
              const con: StayConsumption = {
                id: genId('con'),
                productId: 'med-srv',
                descripcion: `ASISTENCIA MÉDICA / OXÍGENO (${alert.codigo})`,
                cantidad: 1,
                precioUnitario: finalFee,
                subtotal: finalFee,
                fecha: now,
                pagado: false,
                entregado: true,
              };
              const nextTotal = s.totalCargos + finalFee;
              return {
                ...s,
                consumptions: [...s.consumptions, con],
                totalCargos: nextTotal,
                saldoPendiente: Math.max(0, nextTotal - s.totalPagado),
              };
            })
          : prev.stays,
    }));
    notify('info', `Alerta ${alert.codigo} actualizada a ${status}`);
  };

  // 7. GRMS Domotics & ACS Access Control
  const updateRoomDevice = (roomId: string, partial: Partial<RoomDeviceState>) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      roomDevices: prev.roomDevices.map((d) =>
        d.roomId === roomId ? { ...d, ...partial, ultimaActualizacion: now } : d
      ),
    }));
  };

  const toggleMobileKey = (roomId: string, active: boolean, actorName?: string) => {
    const room = state.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const now = new Date().toISOString();
    const stay = state.stays.find((s) => s.roomId === roomId && s.status === 'ACTIVA');
    const code = active ? `NFC-${room.numero}-${Math.floor(1000 + Math.random() * 8999)}` : undefined;
    const exp = stay ? `${stay.fechaSalidaProgramada.slice(0, 10)} ${state.config.horaCheckOut}` : undefined;

    setState((prev) => ({
      ...prev,
      roomDevices: prev.roomDevices.map((d) =>
        d.roomId === roomId
          ? {
              ...d,
              llaveMovilActiva: active,
              llaveMovilCodigo: code,
              llaveVigenciaHasta: exp,
              ultimaActualizacion: now,
            }
          : d
      ),
      acsAccessLogs: [
        {
          id: genId('acs'),
          roomId,
          roomNumber: room.numero,
          actor: actorName || stay?.guestName || activeUser.username,
          rolActor: active ? 'HUESPED_MOVIL' : 'RECEPCION',
          metodo: active ? 'LLAVE_MOVIL_NFC' : 'APERTURA_REMOTA',
          autorizado: true,
          fecha: now,
        },
        ...prev.acsAccessLogs,
      ],
    }));
    notify(
      active ? 'success' : 'info',
      active ? `Llave móvil ${code} activada en Hab. ${room.numero}` : `Llave móvil desactivada en Hab. ${room.numero}`
    );
  };

  const logAcsAccess = (payload: Omit<AcsAccessLog, 'id' | 'fecha'>) => {
    setState((prev) => ({
      ...prev,
      acsAccessLogs: [
        { ...payload, id: genId('acs'), fecha: new Date().toISOString() },
        ...prev.acsAccessLogs,
      ],
    }));
  };

  const reportPreventiveIoTMaintenance = (roomId: string, detalle: string) => {
    const room = state.rooms.find((r) => r.id === roomId);
    if (!room) return;
    createMaintenance({
      roomId: room.id,
      roomNumber: room.numero,
      categoria: 'DOMOTICA GRMS / CLIMATIZACION IoT',
      responsable: 'SENSOR IoT + MANTENIMIENTO',
      observacion: detalle,
      inicio: toYMD(new Date()),
      vigencia: toYMD(new Date()),
    });
    updateRoomDevice(roomId, { alertaPreventiva: detalle });
  };

  // CRM AI Guest Command Simulator (executes real PMS workflows!)
  const simulateGuestCrmCommand: PMSContextValue['simulateGuestCrmCommand'] = (
    threadId,
    commandType,
    params
  ) => {
    const thread = state.crmThreads.find((t) => t.id === threadId);
    if (!thread) return;
    const guest = thread.guestId ? state.guests.find((g) => g.id === thread.guestId) : undefined;
    const stay = thread.stayId ? state.stays.find((s) => s.id === thread.stayId && s.status === 'ACTIVA') : undefined;
    const now = new Date().toISOString();

    let guestMsgEs = params?.customText || '';
    let aiReplyEs = '';
    let actionTag: CrmActionTag | undefined;

    if (commandType === 'WAKEUP') {
      const wakeTime = params?.wakeTime || guest?.horaDespertadorHabitual || '06:30';
      actionTag = 'WAKEUP';
      guestMsgEs = `Por favor, despiértame mañana a las ${wakeTime} a. m.`;
      if (thread.roomId) {
        scheduleWakeUp({
          roomId: thread.roomId,
          horaProgramada: wakeTime,
          fechaProgramada: toYMD(new Date(Date.now() + 86400000)),
          canal: 'DUAL_PBX_WHATSAPP',
          idioma: thread.idiomaHuesped,
          creadoPor: 'WHATSAPP_BOT',
        });
        aiReplyEs = `Listo ${thread.guestName.split(' ')[0]}, despertador programado para las ${wakeTime} (Tel. PBX Hab. ${thread.roomNumber} + WhatsApp). Guardamos tu hora habitual en tu perfil CRM.`;
      } else {
        aiReplyEs = `Anotamos tu solicitud de despertador a las ${wakeTime}. Se activará apenas realices tu Check-In.`;
      }
    } else if (commandType === 'TOUR') {
      const pkg =
        state.tourPackages.find((p) => p.id === params?.tourPackageId) ||
        state.tourPackages[1] ||
        state.tourPackages[0];
      const pax = params?.tourPax || 2;
      actionTag = 'TOUR';
      guestMsgEs = `Quiero reservar el paquete turístico "${pkg.nombre}" para ${pax} personas para mañana.`;
      const booking = bookTourPackage({
        packageId: pkg.id,
        stayId: stay?.id,
        guestId: thread.guestId,
        guestName: thread.guestName,
        roomId: thread.roomId,
        roomNumber: thread.roomNumber,
        fechaTour: toYMD(new Date(Date.now() + 86400000)),
        pax,
        chargeToRoom: Boolean(stay),
        solicitadoVia: 'AGENTE_WHATSAPP',
        observaciones: 'Solicitado vía Agente CRM WhatsApp',
      });
      aiReplyEs = booking
        ? `¡Paquete confirmado (${booking.codigo})! ${pkg.nombre} para ${pax} pax. Recojo: ${booking.horaRecojo}. Total S/ ${booking.total.toFixed(2)} ${stay ? `cargado a Hab. ${stay.roomNumber}` : 'por pagar en recepción'}.`
        : 'No pudimos confirmar cupos en este momento.';
    } else if (commandType === 'LATE_CHECKOUT') {
      actionTag = 'LATE_CHECKOUT';
      guestMsgEs = '¿Puedo salir más tarde mañana (Late Check-Out 3 horas)?';
      const fee = 3 * state.config.penalidadHoraExtra;
      aiReplyEs = `¡Claro! Hab. ${thread.roomNumber || '-'} tiene disponibilidad hasta las 13:00 (+3h). Tarifa: S/ ${fee.toFixed(2)}. Recepción puede aprobarlo y extender tu llave móvil en 1 clic.`;
    } else if (commandType === 'ROOM_SERVICE') {
      const prod =
        state.products.find((p) => p.id === params?.productId) ||
        state.products.find((p) => p.id === 'prod-5') ||
        state.products[0];
      actionTag = 'ROOM_SERVICE';
      guestMsgEs = `Envíenme por favor 2x ${prod.descripcion} a mi habitación ${thread.roomNumber || ''}.`;
      if (stay) {
        const order = createRoomServiceOrder({
          stayId: stay.id,
          items: [{ productId: prod.id, cantidad: 2 }],
          canal: 'WHATSAPP_BOT',
          notasCocina: 'Pedido autogestionado por Agente IA WhatsApp',
        });
        aiReplyEs = order
          ? `Pedido ${order.codigo} enviado directo a Cocina KDS (2x ${prod.descripcion}, S/ ${order.total.toFixed(2)} cargado a Hab. ${stay.roomNumber}).${guest?.alergias ? ` Verificamos tu nota de alergia: ${guest.alergias}.` : ''}`
          : 'No pudimos registrar el pedido.';
      } else {
        aiReplyEs = 'Para pedir Room Service a la habitación es necesario contar con estadía activa.';
      }
    } else if (commandType === 'BELL_BOY') {
      const bultos = params?.bultos || 2;
      actionTag = 'BELL_BOY';
      guestMsgEs = `Ya estoy listo para bajar mis ${bultos} maletas de la habitación ${thread.roomNumber || ''}.`;
      const bb = createBellBoyTicket({
        tipo: 'BAJADA_MALETAS',
        roomId: thread.roomId,
        roomNumber: thread.roomNumber,
        stayId: stay?.id,
        guestName: thread.guestName,
        bultos,
        descripcionEquipaje: 'Solicitud directa desde WhatsApp',
        origen: 'WHATSAPP_QR',
      });
      aiReplyEs = `Ticket Bell Boy ${bb.codigoQr} enviado al smartwatch de nuestro botones de turno para recoger tus ${bultos} maletas en Hab. ${thread.roomNumber || 'Lobby'}.`;
    } else if (commandType === 'MEDICAL_SOS') {
      const mType = params?.medicalType || 'OXIGENO';
      actionTag = 'MEDICAL_SOS';
      guestMsgEs =
        mType === 'OXIGENO'
          ? 'Me siento un poco agitado por la altura, ¿pueden enviarme oxígeno a la habitación?'
          : 'Necesito asistencia médica urgente en mi habitación.';
      if (thread.roomId) {
        const alert = triggerMedicalAlert({
          roomId: thread.roomId,
          tipo: mType,
          origen: 'WHATSAPP_SOS',
          sintomas: guestMsgEs,
        });
        aiReplyEs = alert
          ? `Protocolo prioritario ${alert.codigo} activado en Recepción y Tópico Médico. Nuestro equipo va en camino a Hab. ${thread.roomNumber} con historial CRM.`
          : 'Asistencia notificada a recepción.';
      }
    } else {
      const custom = (params?.customText || '').trim();
      guestMsgEs = custom || 'Hola, necesito asistencia en recepción.';
      // Smart intent detection for custom text
      const low = guestMsgEs.toLowerCase();
      if (low.includes('tour') || low.includes('machu') || low.includes('valle') || low.includes('paquete') || low.includes('spa')) {
        const matched =
          state.tourPackages.find((p) =>
            p.nombre.toLowerCase().split(' ').some((w) => w.length > 4 && low.includes(w))
          ) || state.tourPackages[0];
        actionTag = 'TOUR';
        const booking = bookTourPackage({
          packageId: matched.id,
          stayId: stay?.id,
          guestId: thread.guestId,
          guestName: thread.guestName,
          roomId: thread.roomId,
          roomNumber: thread.roomNumber,
          fechaTour: toYMD(new Date(Date.now() + 86400000)),
          pax: 2,
          chargeToRoom: Boolean(stay),
          solicitadoVia: 'AGENTE_WHATSAPP',
          observaciones: `Detectado en chat: "${guestMsgEs}"`,
        });
        aiReplyEs = booking
          ? `Agendamos el paquete "${matched.nombre}" (${booking.codigo}) para 2 pax · S/ ${booking.total.toFixed(2)}.`
          : `Tenemos disponible "${matched.nombre}" a S/ ${matched.precioPorPax} por persona.`;
      } else if (low.includes('despiert') || low.includes('alarma') || low.includes('wake')) {
        actionTag = 'WAKEUP';
        if (thread.roomId) {
          scheduleWakeUp({
            roomId: thread.roomId,
            horaProgramada: '06:30',
            fechaProgramada: toYMD(new Date(Date.now() + 86400000)),
            canal: 'DUAL_PBX_WHATSAPP',
            idioma: thread.idiomaHuesped,
            creadoPor: 'WHATSAPP_BOT',
          });
        }
        aiReplyEs = 'Despertador programado para mañana a las 06:30 a. m. vía Teléfono PBX + WhatsApp.';
      } else {
        aiReplyEs = 'Gracias por escribirnos. Un asesor de La Chuspa Tech y nuestro sistema inteligente están atendiendo tu solicitud.';
      }
    }

    const guestMsg: CrmMessage = {
      id: genId('msg'),
      sender: 'GUEST',
      textoOriginal: translateTextPreview(guestMsgEs, thread.idiomaHuesped).replace(/^\[.*?\]\s*/, ''),
      textoTraducidoEs: guestMsgEs,
      idioma: thread.idiomaHuesped,
      timestamp: now,
      actionTag,
    };
    const agentMsg: CrmMessage = {
      id: genId('msg'),
      sender: 'AGENT_AI',
      textoOriginal: translateTextPreview(aiReplyEs, thread.idiomaHuesped),
      textoTraducidoEs: aiReplyEs,
      idioma: thread.idiomaHuesped,
      timestamp: new Date(Date.now() + 1000).toISOString(),
      actionTag,
    };

    setState((prev) => ({
      ...prev,
      crmThreads: prev.crmThreads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              ultimoMensaje: aiReplyEs,
              updatedAt: now,
              unreadCount: 0,
              messages: [...t.messages, guestMsg, agentMsg],
            }
          : t
      ),
    }));
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
        checkInAgencyGroup,
        payAgencyGroupConsolidated,
        addConsumptionToStay,
        deliverRoomOrder,
        renewStay,
        payStayBalance,
        changeRoom,
        checkOutStay,
        createReservation,
        updateReservation,
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
        scheduleWakeUp,
        triggerWakeUpCall,
        respondWakeUpCall,
        deleteWakeUpCall,
        saveTourPackage,
        bookTourPackage,
        updateTourBookingStatus,
        ensureCrmThread,
        sendCrmMessage,
        simulateGuestCrmCommand,
        sendBiometricPreCheckIn,
        verifyBiometricAndIssueKey,
        approveLateCheckOutFromCrm,
        createRoomServiceOrder,
        advanceKdsOrderStatus,
        createBellBoyTicket,
        updateBellBoyStatus,
        createTransfer,
        reportFlightDelay,
        updateTransferStatus,
        triggerMedicalAlert,
        updateMedicalAlertStatus,
        updateRoomDevice,
        toggleMobileKey,
        logAcsAccess,
        reportPreventiveIoTMaintenance,
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
