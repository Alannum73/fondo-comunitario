// Lógica de grupo/fondo: creación, miembros, delegados y quórum.
// Paso 2 del orden de desarrollo del spec. Persistencia simple en JSON (data/grupos.json).
// El balance real de USDT vive en la wallet de WDK, no acá — este módulo es solo las reglas
// del fondo (cuota, monto máx, delegados, quórum) y el registro de miembros.

import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { leer, escribir } from '../shared/jsonStore.js';
import { hashPassword, verificarPassword } from '../shared/auth.js';

const DB_PATH = process.env.GRUPOS_DB_PATH || join(process.cwd(), 'data', 'grupos.json');
const MIN_DELEGADOS = 3;

export class ErrorValidacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorValidacion';
  }
}

function cargarGrupos() {
  return leer(DB_PATH, { grupos: [] });
}

function guardarGrupos(db) {
  escribir(DB_PATH, db);
}

// El passwordHash nunca sale de este módulo salvo hacia verificarLogin (que lo necesita
// para comparar). Todas las funciones públicas que devuelven un miembro o un grupo pasan
// por estos limpiadores antes de retornar, así ningún consumidor (API, CLI, tests) puede
// llegar a exponerlo por accidente.
function limpiarMiembro(miembro) {
  const { passwordHash, ...resto } = miembro;
  return resto;
}

function limpiarGrupo(grupo) {
  return { ...grupo, miembros: grupo.miembros.map(limpiarMiembro) };
}

function obtenerGrupoCrudo(grupoId) {
  const grupo = cargarGrupos().grupos.find((g) => g.id === grupoId);
  if (!grupo) throw new ErrorValidacion(`No existe un grupo con id ${grupoId}.`);
  return grupo;
}

function validarDatosGrupo({ nombre, walletName, cuotaPeriodica, montoMaxSiniestro, delegados, quorumDelegados }) {
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    throw new ErrorValidacion('El grupo necesita un nombre.');
  }
  if (!walletName || typeof walletName !== 'string' || !walletName.trim()) {
    throw new ErrorValidacion(
      'El grupo necesita el nombre de una wallet de WDK CLI ya creada (cada grupo tiene su propia wallet).'
    );
  }
  if (!Number.isFinite(cuotaPeriodica) || cuotaPeriodica <= 0) {
    throw new ErrorValidacion('La cuota periódica debe ser un número mayor a 0.');
  }
  if (!Number.isFinite(montoMaxSiniestro) || montoMaxSiniestro <= 0) {
    throw new ErrorValidacion('El monto máx por siniestro debe ser un número mayor a 0.');
  }
  if (!Array.isArray(delegados) || delegados.length < MIN_DELEGADOS) {
    throw new ErrorValidacion(`Se necesitan al menos ${MIN_DELEGADOS} delegados.`);
  }
  const delegadosUnicos = new Set(delegados.map((d) => d.trim().toLowerCase()));
  if (delegadosUnicos.size !== delegados.length) {
    throw new ErrorValidacion('Hay delegados duplicados en la lista.');
  }
  if (!Number.isInteger(quorumDelegados) || quorumDelegados < 1) {
    throw new ErrorValidacion('El quórum debe ser un entero mayor o igual a 1.');
  }
  if (quorumDelegados > delegados.length) {
    throw new ErrorValidacion('El quórum no puede ser mayor a la cantidad de delegados.');
  }
}

/**
 * Crea un nuevo grupo/fondo. Cada grupo tiene su propia wallet de WDK CLI (`walletName`)
 * — ya tiene que existir (creada por el usuario con `wdk wallet create`, passphrase propia
 * que solo el usuario conoce). Esto evita que varios grupos compartan un mismo balance.
 * @param {{nombre: string, walletName: string, cuotaPeriodica: number, montoMaxSiniestro: number, delegados: string[], quorumDelegados: number}} datos
 */
export function crearGrupo(datos) {
  validarDatosGrupo(datos);
  const db = cargarGrupos();

  const grupo = {
    id: randomUUID(),
    nombre: datos.nombre.trim(),
    walletName: datos.walletName.trim(),
    cuotaPeriodica: datos.cuotaPeriodica,
    montoMaxSiniestro: datos.montoMaxSiniestro,
    delegados: datos.delegados.map((d) => d.trim()),
    quorumDelegados: datos.quorumDelegados,
    miembros: [],
    createdAt: new Date().toISOString(),
  };

  db.grupos.push(grupo);
  guardarGrupos(db);
  return grupo;
}

export function listarGrupos() {
  return cargarGrupos().grupos.map(limpiarGrupo);
}

export function obtenerGrupo(grupoId) {
  return limpiarGrupo(obtenerGrupoCrudo(grupoId));
}

/**
 * Agrega un miembro al grupo. `alDia` empieza en false hasta que el módulo de
 * depósitos (paso 3, integrado con WDK) confirme el primer aporte.
 * Requiere `password` — cada miembro tiene la suya para poder entrar como sí mismo
 * (ver verificarLogin) y así evitar que cualquiera pueda actuar como cualquier otro
 * miembro solo eligiendo su nombre. Se guarda hasheada (nunca en texto plano).
 */
export function agregarMiembro(grupoId, { nombre, password }) {
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    throw new ErrorValidacion('El miembro necesita un nombre.');
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    throw new ErrorValidacion('El miembro necesita una contraseña de al menos 4 caracteres.');
  }
  const db = cargarGrupos();
  const grupo = db.grupos.find((g) => g.id === grupoId);
  if (!grupo) throw new ErrorValidacion(`No existe un grupo con id ${grupoId}.`);

  if (grupo.miembros.some((m) => m.nombre.toLowerCase() === nombre.trim().toLowerCase())) {
    throw new ErrorValidacion(`${nombre} ya es miembro de este grupo.`);
  }

  const miembro = {
    id: randomUUID(),
    nombre: nombre.trim(),
    passwordHash: hashPassword(password),
    esDelegado: grupo.delegados.some((d) => d.toLowerCase() === nombre.trim().toLowerCase()),
    alDia: false,
    fechaUltimoAporte: null,
    referenciaTx: null,
  };

  grupo.miembros.push(miembro);
  guardarGrupos(db);
  return limpiarMiembro(miembro);
}

/**
 * Marca a un miembro como "al día" tras un aporte confirmado.
 * La llama el módulo de depósitos (paso 3) una vez que WDK confirma la transacción.
 * `referenciaTx` es opcional (hash de la transacción o cualquier nota que el miembro quiera
 * dejar) — no se usa para verificar nada (la verificación real sigue siendo por balance vía
 * WDK), solo queda guardada como registro auditable de qué transacción correspondía a este aporte.
 */
export function marcarAporte(grupoId, miembroId, referenciaTx = null) {
  const db = cargarGrupos();
  const grupo = db.grupos.find((g) => g.id === grupoId);
  if (!grupo) throw new ErrorValidacion(`No existe un grupo con id ${grupoId}.`);

  const miembro = grupo.miembros.find((m) => m.id === miembroId);
  if (!miembro) throw new ErrorValidacion(`No existe un miembro con id ${miembroId} en este grupo.`);

  miembro.alDia = true;
  miembro.fechaUltimoAporte = new Date().toISOString();
  miembro.referenciaTx = referenciaTx && String(referenciaTx).trim() ? String(referenciaTx).trim() : null;
  guardarGrupos(db);
  return limpiarMiembro(miembro);
}

/**
 * Delegados elegibles para votar: deben ser delegados designados Y estar al día
 * con su cuota (regla marcada como pendiente en la revisión del spec original).
 */
export function delegadosElegibles(grupoId) {
  const grupo = obtenerGrupo(grupoId);
  return grupo.miembros.filter((m) => m.esDelegado && m.alDia);
}

/**
 * Elimina un grupo. Solo borra el registro del grupo/fondo — no toca reclamos,
 * historial ni balances asociados (fuera de alcance del hackathon; esos quedan
 * huérfanos en sus propios archivos, sin impacto porque se filtran por grupoId
 * inexistente).
 */
export function eliminarGrupo(grupoId) {
  const db = cargarGrupos();
  const indice = db.grupos.findIndex((g) => g.id === grupoId);
  if (indice === -1) throw new ErrorValidacion(`No existe un grupo con id ${grupoId}.`);

  const [grupo] = db.grupos.splice(indice, 1);
  guardarGrupos(db);
  return limpiarGrupo(grupo);
}

/**
 * Verifica la contraseña de un miembro para "entrar" como él. No devuelve una sesión acá
 * (eso lo arma la capa de API con crearSesion de src/shared/auth.js) — esto solo valida.
 * Es la única función que lee `passwordHash`; el miembro que devuelve ya viene limpio.
 */
export function verificarLogin(grupoId, miembroId, password) {
  const grupo = obtenerGrupoCrudo(grupoId);
  const miembro = grupo.miembros.find((m) => m.id === miembroId);
  if (!miembro) throw new ErrorValidacion(`No existe un miembro con id ${miembroId} en este grupo.`);
  if (!verificarPassword(password, miembro.passwordHash)) {
    throw new ErrorValidacion('Contraseña incorrecta.');
  }
  return limpiarMiembro(miembro);
}
