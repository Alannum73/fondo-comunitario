// Lógica de grupo/fondo: creación, miembros, delegados y quórum.
// Paso 2 del orden de desarrollo del spec. Persistencia simple en JSON (data/grupos.json).
// El balance real de USDT vive en la wallet de WDK, no acá — este módulo es solo las reglas
// del fondo (cuota, monto máx, delegados, quórum) y el registro de miembros.

import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { leer, escribir } from '../shared/jsonStore.js';

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
  return cargarGrupos().grupos;
}

export function obtenerGrupo(grupoId) {
  const grupo = cargarGrupos().grupos.find((g) => g.id === grupoId);
  if (!grupo) throw new ErrorValidacion(`No existe un grupo con id ${grupoId}.`);
  return grupo;
}

/**
 * Agrega un miembro al grupo. `alDia` empieza en false hasta que el módulo de
 * depósitos (paso 3, integrado con WDK) confirme el primer aporte.
 */
export function agregarMiembro(grupoId, { nombre }) {
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    throw new ErrorValidacion('El miembro necesita un nombre.');
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
    esDelegado: grupo.delegados.some((d) => d.toLowerCase() === nombre.trim().toLowerCase()),
    alDia: false,
    fechaUltimoAporte: null,
  };

  grupo.miembros.push(miembro);
  guardarGrupos(db);
  return miembro;
}

/**
 * Marca a un miembro como "al día" tras un aporte confirmado.
 * La llama el módulo de depósitos (paso 3) una vez que WDK confirma la transacción.
 */
export function marcarAporte(grupoId, miembroId) {
  const db = cargarGrupos();
  const grupo = db.grupos.find((g) => g.id === grupoId);
  if (!grupo) throw new ErrorValidacion(`No existe un grupo con id ${grupoId}.`);

  const miembro = grupo.miembros.find((m) => m.id === miembroId);
  if (!miembro) throw new ErrorValidacion(`No existe un miembro con id ${miembroId} en este grupo.`);

  miembro.alDia = true;
  miembro.fechaUltimoAporte = new Date().toISOString();
  guardarGrupos(db);
  return miembro;
}

/**
 * Delegados elegibles para votar: deben ser delegados designados Y estar al día
 * con su cuota (regla marcada como pendiente en la revisión del spec original).
 */
export function delegadosElegibles(grupoId) {
  const grupo = obtenerGrupo(grupoId);
  return grupo.miembros.filter((m) => m.esDelegado && m.alDia);
}
