export type ModuleId =
  | 'recepcion'
  | 'dashboard'
  | 'reservas_libro'
  | 'reservas_llegadas'
  | 'reservas_control'
  | 'habitaciones_tipos'
  | 'tarifa_hotelera'
  | 'limpieza'
  | 'mantenimientos'
  | 'post_venta'
  | 'facturacion'
  | 'caja_gastos'
  | 'caja_bancos'
  | 'clientes'
  | 'agencias'
  | 'personas_no_gratas'
  | 'inventario'
  | 'compras'
  | 'productos'
  | 'despacho'
  | 'personal_empleados'
  | 'personal_marcador'
  | 'personal_asistencias'
  | 'reportes_huespedes'
  | 'reportes_rendimiento'
  | 'configuracion_empresa'
  | 'configuracion_reservas'
  | 'configuracion_diseno'
  | 'configuracion_sunat'
  | 'seguridad_cuenta'
  | 'seguridad_usuarios'
  | 'seguridad_autorizacion'
  | 'contabilidad'
  | 'servicios_pagos'
  | 'soporte'
  | 'crm_whatsapp'
  | 'despertador_pbx'
  | 'paquetes_tours'
  | 'kds_cocina'
  | 'bell_boys'
  | 'salud_emergencias'
  | 'grms_iot';

export type RoomStatus =
  | 'DISPONIBLE'
  | 'OCUPADO'
  | 'EN_LIMPIEZA'
  | 'EN_MANTENIMIENTO'
  | 'RESERVADO';

export type RateTier = '12h' | '24h' | '48h';

export type DayKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom' | 'ferd';

export interface RoomAmenities {
  aguaCaliente: boolean;
  wifi: boolean;
  smartTv: boolean;
  butacasMesa: boolean;
  netflix: boolean;
  cable: boolean;
  vistaCalle: boolean;
  tina: boolean;
}

export interface RoomType {
  id: string;
  nombre: string;
  codigoCorto: string;
  capacidad: number;
  camas: number;
  precioDefecto: number;
  descripcion: string;
  foto: string;
  serviciosIncluidos: string[];
}

export interface Room {
  id: string;
  numero: string;
  piso: number;
  roomTypeId: string;
  status: RoomStatus;
  amenities: RoomAmenities;
  rates: Record<RateTier, Record<DayKey, number>>;
  currentStayId?: string;
}

export type DocType = 'DNI' | 'PAS' | 'CE' | 'RUC';

export interface Guest {
  id: string;
  tipoDoc: DocType;
  numDoc: string;
  nombres: string;
  fechaNacimiento: string; // YYYY-MM-DD
  fechaRegistro: string; // YYYY-MM-DD
  nacionalidad: string;
  sexo: 'M' | 'F';
  correo: string;
  celular: string;
  direccion: string;
  esVip: boolean;
  idiomaPreferido?: 'ES' | 'EN' | 'DE' | 'JP' | 'FR' | 'PT';
  alergias?: string;
  condicionesMedicas?: string;
  horaDespertadorHabitual?: string;
  preferenciasHabitacion?: string;
  biometriaVerificada?: boolean;
}

export interface Agency {
  id: string;
  tipoEntidad: 'Agencia' | 'Empresa';
  tipoDoc: DocType;
  numDoc: string;
  nombre: string;
  telefono: string;
  paginaWeb: string;
  sector: string;
  direccionFiscal: string;
}

export interface PersonaNoGrata {
  id: string;
  numDoc: string;
  nombres: string;
  apellidos: string;
  fecha: string;
  tipo: 'ALERTA' | 'BLOQUEO' | 'OBSERVACION';
  comentario: string;
}

export type PaymentMethodName =
  | 'EFECTIVO'
  | 'TARJETA'
  | 'YAPE'
  | 'PLIN'
  | 'AGENCIA'
  | 'TRANSFERENCIA'
  | 'X PAGAR'
  | 'PAX LIBRES'
  | 'AGENCIAS X PAGAR';

export type VoucherType = 'TICKET' | 'BOLETA' | 'FACTURA';

export interface StayConsumption {
  id: string;
  productId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  fecha: string;
  pagado: boolean;
  entregado: boolean;
  metodoPago?: PaymentMethodName;
}

export interface StayRenewal {
  id: string;
  fecha: string;
  cantidad: number; // nights or hours
  modalidad: 'NOCHES' | 'HORAS';
  monto: number;
  metodoPago: PaymentMethodName;
}

export interface StayPayment {
  id: string;
  fecha: string;
  monto: number;
  metodoPago: PaymentMethodName;
  comprobante: string;
  voucherType: VoucherType;
  concepto: string;
  turno: string;
  responsable: string;
}

export interface Stay {
  id: string;
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  guestId: string;
  guestName: string;
  guestDocType: DocType;
  guestDocNum: string;
  guestNationality: string;
  guestSex: 'M' | 'F';
  guestBirthDate: string;
  invitados: { id: string; nombres: string; doc: string }[];
  modalidad: 'NOCHES' | 'HORAS';
  cantidadInicial: number;
  tarifaBase: number;
  fechaEntrada: string; // ISO
  fechaSalidaProgramada: string; // ISO
  fechaSalidaReal?: string; // ISO
  status: 'ACTIVA' | 'FINALIZADA';
  esCortesia: boolean;
  agencyId?: string;
  agencyName?: string;
  groupId?: string;
  groupName?: string;
  paxCount?: number;
  observaciones: string;
  consumptions: StayConsumption[];
  renewals: StayRenewal[];
  payments: StayPayment[];
  totalCargos: number;
  totalPagado: number;
  saldoPendiente: number;
  reservationId?: string;
}

export interface AgencyGroup {
  id: string;
  codigo: string;
  nombreGrupo: string;
  agencyId: string;
  agencyName: string;
  agencyDoc?: string;
  guiaResponsable: string;
  totalPax: number;
  fechaEntrada: string;
  fechaSalidaProgramada: string;
  noches: number;
  observaciones: string;
  status: 'ACTIVO' | 'CERRADO';
  facturadoConsolidado?: boolean;
  comprobanteConsolidado?: string;
  montoTotalConsolidado?: number;
}

export type ReservationStatus = 'CONFIRMADA' | 'PENDIENTE' | 'CHECKED_IN' | 'CANCELADA';

export interface Reservation {
  id: string;
  localizador: string;
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  guestId: string;
  guestName: string;
  guestDoc: string;
  fechaEntrada: string; // YYYY-MM-DD HH:mm
  fechaSalida: string; // YYYY-MM-DD HH:mm
  noches: number;
  total: number;
  adelanto: number;
  metodoPagoAdelanto?: PaymentMethodName;
  origen: 'DIRECTA' | 'BOOKING' | 'AIRBNB' | 'AGENCIA' | 'WEB';
  agencyName?: string;
  status: ReservationStatus;
  observaciones: string;
}

export interface CleaningLog {
  id: string;
  roomId: string;
  roomNumber: string;
  staffId: string;
  staffName: string;
  inicio: string;
  fin?: string;
  estado: 'EN_PROCESO' | 'COMPLETADA';
  observacion: string;
}

export interface MaintenanceRecord {
  id: string;
  roomId: string;
  roomNumber: string;
  categoria: string;
  responsable: string;
  observacion: string;
  inicio: string;
  vigencia: string;
  estado: 'ACTIVO' | 'RESUELTO';
}

export type WarehouseArea = 'ALMACEN_PRINCIPAL' | 'RECEPCION' | 'LIMPIEZA' | 'ROOFTOP';

export interface ProductCategory {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Product {
  id: string;
  descripcion: string;
  codigoBarra: string;
  moneda: 'PEN' | 'USD';
  precio: number;
  precioMin: number;
  tipo: 'STOCKABLE' | 'SERVICIO';
  categoryId: string;
  categoriaNombre: string;
  familia: string;
  codigoSunat?: string;
  activo: boolean;
  stocks: Record<WarehouseArea, number>;
}

export interface PurchaseItem {
  productId: string;
  descripcion: string;
  cantidad: number;
  lote?: string;
  importe: number;
}

export interface Purchase {
  id: string;
  tipoDoc: 'FACTURA' | 'BOLETA' | 'GUIA';
  numDoc: string;
  fecha: string;
  proveedor: string;
  area: WarehouseArea;
  items: PurchaseItem[];
  total: number;
  responsable: string;
}

export interface StockMovement {
  id: string;
  fecha: string;
  tipoMovimiento: 'COMPRA' | 'ENTREGA_PRODUCTOS' | 'VENTA' | 'AJUSTE_INGRESO' | 'AJUSTE_SALIDA';
  origen: string;
  destino: string;
  productId: string;
  descripcion: string;
  cantidad: number;
  stockResultante: number;
  observaciones: string;
  responsable: string;
}

export interface SaleRecord {
  id: string;
  fecha: string;
  origenTipo: 'HABITACION' | 'VENTA_LIBRE' | 'RESERVA';
  roomNumber?: string;
  guestName: string;
  guestDoc?: string;
  descripcion: string;
  metodoPago: PaymentMethodName;
  voucherType: VoucherType;
  comprobante: string;
  monto: number;
  esCortesia: boolean;
  turno: string;
  responsable: string;
  status: 'ACTIVO' | 'ANULADO';
  motivoAnulacion?: string;
  sunatEnviado?: boolean;
  stayId?: string;
  groupId?: string;
}

export interface CashRegisterClose {
  id: string;
  fechaCierre: string;
  turno: string;
  caja: string;
  responsable: string;
  totalEfectivoEsperado: number;
  totalTarjeta: number;
  totalYapePlin: number;
  totalTransferencia: number;
  totalAgencia: number;
  totalGastosEfectivo: number;
  efectivoContado: number;
  diferencia: number;
  observacion: string;
}

export interface ExpenseRecord {
  id: string;
  fecha: string;
  salidaDe: WarehouseArea | 'RECEPCION';
  sede: string;
  areaTipo: string;
  tipoPago: PaymentMethodName;
  monto: number;
  empresaPersona: string;
  detalle: string;
  responsable: string;
}

export interface BankDeposit {
  id: string;
  numEnvio: string;
  dniResponsable: string;
  nombreResponsable: string;
  nombreEmisor: string;
  montoEnviado: number;
  fechaEmision: string;
  banco: string;
  fechaDeposito: string;
  numOperacion: string;
  montoDepositado: number;
}

export interface StaffPosition {
  id: string;
  nombre: string;
}

export interface Employee {
  id: string;
  tipoDoc: DocType;
  numDoc: string;
  idCard: string;
  nombres: string;
  apellidos: string;
  cargoId: string;
  cargoNombre: string;
  cumpleanos: string;
  telefono: string;
  activo: boolean;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  numDoc: string;
  nombreCompleto: string;
  cargoNombre: string;
  fecha: string; // YYYY-MM-DD
  ingreso?: string;
  inicioBreak?: string;
  finBreak?: string;
  salida?: string;
}

export interface SystemUser {
  id: string;
  username: string;
  nombreCompleto: string;
  rol: 'ADMINISTRADOR' | 'RECEPCION' | 'SUPERVISOR' | 'LIMPIEZA';
  passwordHash: string;
  activo: boolean;
  accesos: ModuleId[];
}

export interface AuthCode {
  id: string;
  nombre: string;
  codigo: string;
  tipo: 'ANULACION' | 'DESCUENTO' | 'GENERAL';
}

export interface SupportTicket {
  id: string;
  fecha: string;
  numeroTicket: string;
  usuario: string;
  correo: string;
  incidencia: string;
  detalle: string;
  estado: 'ABIERTO' | 'EN_REVISION' | 'RESUELTO';
}

export interface PaymentMethodConfig {
  id: string;
  nombre: PaymentMethodName;
  esCredito: boolean;
  porDefecto: boolean;
  reqNroOperacion: boolean;
  comision: boolean;
}

export interface ShiftConfig {
  id: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  descripcion: string;
}

export interface HotelConfig {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  nombreAdicional: string;
  telefono: string;
  correo: string;
  direccionFiscal: string;
  ubigeo: string;
  logo: string;
  mostrarBarraPedidos: boolean;
  mostrarBarraReservas: boolean;
  imprimirComandas: boolean;
  imprimirComprobantes: boolean;
  firmaPorIngreso: boolean;
  politicaIngreso: string;
  activarQrTicket: boolean;
  adelantoPagos: boolean;
  solicitarMotivoAnulacion: boolean;
  modificarPreciosPos: boolean;
  checkInPagoPendiente: boolean;
  codigoSocioVip: boolean;
  requiereCodigoAutorizacion: boolean;
  horaCheckIn: string;
  horaCheckOut: string;
  penalidadHoraExtra: number;
  sunafactActivo: boolean;
  impuestoIgv: number;
  serieBoleta: string;
  serieFactura: string;
  serieTicket: string;
  coloresEstado: Record<RoomStatus, string>;
  paymentMethods: PaymentMethodConfig[];
  shifts: ShiftConfig[];
  reservaWebBg: string;
  reservaWebText: string;
  reservaWebAccent: string;
  terminosUrl: string;
  privacidadUrl: string;
  guiaPagos: string;
  sunatCodesSeleccionados: { codigo: string; descripcion: string; clase: string }[];
  theme: {
    presetId: string;
    sidebarBg: string;
    sidebarText: string;
    topbarBg: string;
    accentColor: string;
    canvasBg: string;
    cardRadius: 'md' | 'xl' | '2xl';
  };
  reservaWebDesign: {
    layoutStyle: 'moderno' | 'clasico' | 'minimal';
    headerBg: string;
    showRoomPhotos: boolean;
    showAmenities: boolean;
    bannerTitle: string;
    bannerSubtitle: string;
  };
  firebaseRtdbUrl?: string;
}

export interface PMSState {
  config: HotelConfig;
  roomTypes: RoomType[];
  rooms: Room[];
  guests: Guest[];
  agencies: Agency[];
  agencyGroups: AgencyGroup[];
  personasNoGratas: PersonaNoGrata[];
  stays: Stay[];
  reservations: Reservation[];
  cleaningLogs: CleaningLog[];
  maintenanceRecords: MaintenanceRecord[];
  categories: ProductCategory[];
  products: Product[];
  purchases: Purchase[];
  stockMovements: StockMovement[];
  sales: SaleRecord[];
  cashCloses: CashRegisterClose[];
  expenses: ExpenseRecord[];
  bankDeposits: BankDeposit[];
  positions: StaffPosition[];
  employees: Employee[];
  attendanceLogs: AttendanceLog[];
  users: SystemUser[];
  activeUserId: string;
  activeShiftId: string;
  authCodes: AuthCode[];
  supportTickets: SupportTicket[];
  wakeUpCalls: WakeUpCall[];
  tourPackages: TourPackage[];
  tourBookings: TourBooking[];
  crmThreads: CrmThread[];
  roomServiceOrders: RoomServiceOrder[];
  bellBoyTickets: BellBoyTicket[];
  transfers: AirportTransfer[];
  medicalAlerts: MedicalAlert[];
  roomDevices: RoomDeviceState[];
  acsAccessLogs: AcsAccessLog[];
}

export type GuestLanguage = 'ES' | 'EN' | 'DE' | 'JP' | 'FR' | 'PT';

export interface WakeUpCall {
  id: string;
  roomId: string;
  roomNumber: string;
  stayId?: string;
  guestId?: string;
  guestName: string;
  horaProgramada: string; // HH:mm
  fechaProgramada: string; // YYYY-MM-DD
  canal: 'PBX_TELEFONO' | 'WHATSAPP_BOT' | 'DUAL_PBX_WHATSAPP' | 'ALEXA_NEST';
  idioma: GuestLanguage;
  pbxExtension: string;
  pbxProvider: 'Yeastar' | 'Grandstream' | 'Mitel';
  status: 'PROGRAMADO' | 'SONANDO' | 'ATENDIDO' | 'POSPUESTO' | 'FALLO_SIN_RESPUESTA';
  intentos: number;
  pospuestoMin: number;
  respuestaHuesped?: string;
  creadoPor: string;
  ultimaEjecucion?: string;
}

export interface TourPackage {
  id: string;
  codigo: string;
  nombre: string;
  categoria: 'TOUR_CUSCO' | 'AVENTURA' | 'SPA_BIENESTAR' | 'TRASLADO_VIP';
  duracion: string;
  precioPorPax: number;
  cuposDia: number;
  operadorAliado: string;
  horarioSalida: string;
  incluye: string[];
  activo: boolean;
  descripcion: string;
}

export interface TourBooking {
  id: string;
  codigo: string;
  packageId: string;
  packageName: string;
  stayId?: string;
  roomId?: string;
  roomNumber?: string;
  guestId?: string;
  guestName: string;
  guestDoc?: string;
  fechaTour: string;
  horaRecojo: string;
  pax: number;
  precioUnitario: number;
  total: number;
  cargadoAHabitacion: boolean;
  pagado: boolean;
  metodoPago?: PaymentMethodName;
  status: 'CONFIRMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA';
  solicitadoVia: 'RECEPCION' | 'AGENTE_WHATSAPP' | 'WEB';
  observaciones: string;
}

export type CrmActionTag =
  | 'WAKEUP'
  | 'LATE_CHECKOUT'
  | 'TOUR'
  | 'ROOM_SERVICE'
  | 'BELL_BOY'
  | 'MEDICAL_SOS'
  | 'DIGITAL_KEY'
  | 'PRE_CHECKIN';

export interface CrmMessage {
  id: string;
  sender: 'GUEST' | 'AGENT_AI' | 'STAFF';
  textoOriginal: string;
  textoTraducidoEs?: string;
  idioma: GuestLanguage;
  timestamp: string;
  actionTag?: CrmActionTag;
}

export interface CrmThread {
  id: string;
  guestId?: string;
  guestName: string;
  telefono: string;
  canal: 'WHATSAPP' | 'INSTAGRAM' | 'WEB' | 'SMS';
  idiomaHuesped: GuestLanguage;
  roomId?: string;
  roomNumber?: string;
  stayId?: string;
  reservationId?: string;
  preCheckInBiometrico: 'NO_ENVIADO' | 'PENDIENTE' | 'VERIFICADO';
  llaveMovilCodigo?: string;
  llaveMovilActiva: boolean;
  llaveExpira?: string;
  ultimoMensaje: string;
  updatedAt: string;
  unreadCount: number;
  messages: CrmMessage[];
}

export interface RoomServiceItem {
  productId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface RoomServiceOrder {
  id: string;
  codigo: string;
  stayId: string;
  roomId: string;
  roomNumber: string;
  guestName: string;
  alergiasAlert?: string;
  canal: 'QR_HABITACION' | 'WHATSAPP_BOT' | 'SMART_TV' | 'RECEPCION';
  items: RoomServiceItem[];
  total: number;
  pagado: boolean;
  status:
    | 'PENDIENTE'
    | 'EN_PREPARACION'
    | 'LISTO'
    | 'ENTREGADO'
    | 'BANDEJA_POR_RECOGER'
    | 'FINALIZADO';
  notasCocina: string;
  createdAt: string;
  readyAt?: string;
  whatsappNotificado: boolean;
}

export interface BellBoyTicket {
  id: string;
  codigoQr: string;
  tipo: 'BAJADA_MALETAS' | 'SUBIDA_CHECKIN' | 'GUARDAEQUIPAJE';
  roomId?: string;
  roomNumber?: string;
  stayId?: string;
  reservationId?: string;
  guestName: string;
  bultos: number;
  ubicacionRack?: string;
  descripcionEquipaje: string;
  asignadoA?: string;
  origen: 'WHATSAPP_QR' | 'RECEPCION';
  status: 'PENDIENTE' | 'EN_CAMINO' | 'RESGUARDADO' | 'ENTREGADO';
  createdAt: string;
}

export interface AirportTransfer {
  id: string;
  codigo: string;
  tipo: 'PICK_UP' | 'DROP_OFF';
  guestName: string;
  roomNumber?: string;
  vuelo: string;
  aerolinea: string;
  horaProgramada: string;
  horaActualizada: string;
  retrasoMin: number;
  chofer: string;
  vehiculo: string;
  pax: number;
  status: 'PROGRAMADO' | 'VUELO_RETRASADO' | 'EN_RUTA' | 'COMPLETADO';
}

export interface MedicalAlert {
  id: string;
  codigo: string;
  roomId: string;
  roomNumber: string;
  stayId?: string;
  guestId?: string;
  guestName: string;
  tipo: 'OXIGENO' | 'MEDICO_HABITACION' | 'TELEMEDICINA' | 'EMERGENCIA_CRITICA';
  prioridad: 'ALTA' | 'CRITICA';
  origen: 'TELEFONO_HABITACION' | 'WHATSAPP_SOS' | 'TV_SMART' | 'RECEPCION';
  alergiasHistorial: string;
  sintomas: string;
  asignadoA?: string;
  cargoServicio: number;
  status: 'ACTIVA' | 'EN_ATENCION' | 'RESUELTA';
  createdAt: string;
  resolvedAt?: string;
}

export interface RoomDeviceState {
  roomId: string;
  roomNumber: string;
  temperaturaObjetivo: number;
  temperaturaActual: number;
  aireModo: 'CONFORT' | 'ECO' | 'APAGADO';
  luces: 'ENCENDIDAS' | 'TENUE' | 'APAGADAS';
  cortinas: 'ABIERTAS' | 'CERRADAS';
  cartelDigital: 'NINGUNO' | 'NO_MOLESTAR' | 'LIMPIAR_AHORA';
  sensorPresencia: 'CON_HUESPED' | 'VACIA_SIN_MOVIMIENTO';
  consumoKwh: number;
  alertaPreventiva?: string;
  llaveMovilActiva: boolean;
  llaveMovilCodigo?: string;
  llaveVigenciaHasta?: string;
  ultimaActualizacion: string;
}

export interface AcsAccessLog {
  id: string;
  roomId: string;
  roomNumber: string;
  actor: string;
  rolActor: 'HUESPED_MOVIL' | 'CAMARERA' | 'MANTENIMIENTO' | 'BELL_BOY' | 'RECEPCION';
  metodo: 'LLAVE_MOVIL_NFC' | 'TARJETA_MAESTRA' | 'PIN_EMERGENCIA' | 'APERTURA_REMOTA';
  autorizado: boolean;
  fecha: string;
}

