// Autenticación mínima por miembro: contraseña (hasheada con scrypt nativo de Node, sin
// dependencias nuevas) + sesión en memoria. Alcanza para el hackathon (un solo proceso de
// servidor); las sesiones se pierden si el server se reinicia, igual que ya pasa con los
// datos en JSON local — no es peor que el resto del modelo de persistencia del proyecto.

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const DURACION_SESION_MS = 4 * 60 * 60 * 1000; // 4 horas

export class ErrorAutenticacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorAutenticacion';
  }
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verificarPassword(password, passwordHash) {
  if (!passwordHash || typeof passwordHash !== 'string') return false;
  const [salt, hash] = passwordHash.split(':');
  if (!salt || !hash) return false;
  const intento = scryptSync(password, salt, 64).toString('hex');
  const bufHash = Buffer.from(hash, 'hex');
  const bufIntento = Buffer.from(intento, 'hex');
  return bufHash.length === bufIntento.length && timingSafeEqual(bufHash, bufIntento);
}

const sesiones = new Map();

export function crearSesion(grupoId, miembroId) {
  const token = randomUUID();
  sesiones.set(token, { grupoId, miembroId, expira: Date.now() + DURACION_SESION_MS });
  return token;
}

export function verificarSesion(token) {
  const sesion = token && sesiones.get(token);
  if (!sesion) return null;
  if (sesion.expira < Date.now()) {
    sesiones.delete(token);
    return null;
  }
  return sesion;
}
