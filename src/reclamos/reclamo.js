// Reporte de siniestros — paso 4 del roadmap.
// Un miembro reporta un caso: foto (solo se guarda la ruta/referencia, no se sube a
// ningún lado — análisis de imagen vía QVAC está fuera de alcance del hackathon, ver
// README "Qué es real vs simulado"), monto solicitado y descripción.
//
// El reclamo nace en estado "pendiente". El panel de aprobación de delegados (paso 5)
// vive acá mismo: aprobarReclamo/rechazarReclamo. El quórum es simétrico — el mismo
// número de votos (grupo.quorumDelegados) decide tanto la aprobación como el rechazo,
// consistente con cómo ya está definido quorumDelegados en grupo.js.

import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { leer, escribir } from '../shared/jsonStore.js';
import { obtenerGrupo, delegadosElegibles, ErrorValidacion } from '../grupo/grupo.js';
export { ErrorValidacion };

const DB_PATH = process.env.RECLAMOS_DB_PATH || join(process.cwd(), 'data', 'reclamos.json');

function cargarReclamos() {
  return leer(DB_PATH, { reclamos: [] });
}

function guardarReclamos(db) {
  escribir(DB_PATH, db);
}

function validarDatosReclamo(grupo, { miembroId, montoSolicitado, descripcion, fotoPath }) {
  const miembro = grupo.miembros.find((m) => m.id === miembroId);
  if (!miembro) {
    throw new ErrorValidacion(`El miembro ${miembroId} no pertenece a este grupo.`);
  }
  if (!Number.isFinite(montoSolicitado) || montoSolicitado <= 0) {
    throw new ErrorValidacion('El monto solicitado debe ser un número mayor a 0.');
  }
  if (montoSolicitado > grupo.montoMaxSiniestro) {
    throw new ErrorValidacion(
      `El monto solicitado (${montoSolicitado}) supera el máximo por siniestro del grupo (${grupo.montoMaxSiniestro}).`
    );
  }
  if (!descripcion || typeof descripcion !== 'string' || !descripcion.trim()) {
    throw new ErrorValidacion('El reclamo necesita una descripción.');
  }
  if (!fotoPath || typeof fotoPath !== 'string' || !fotoPath.trim()) {
    throw new ErrorValidacion('El reclamo necesita la ruta de una foto como evidencia.');
  }
  return miembro;
}

/**
 * Crea un reclamo/reporte de siniestro para un miembro de un grupo.
 * @param {{grupoId: string, miembroId: string, montoSolicitado: number, descripcion: string, fotoPath: string}} datos
 */
export function crearReclamo(datos) {
  const grupo = obtenerGrupo(datos.grupoId);
  validarDatosReclamo(grupo, datos);

  const db = cargarReclamos();
  const reclamo = {
    id: randomUUID(),
    grupoId: grupo.id,
    miembroId: datos.miembroId,
    montoSolicitado: datos.montoSolicitado,
    descripcion: datos.descripcion.trim(),
    fotoPath: datos.fotoPath.trim(),
    estado: 'pendiente',
    aprobaciones: [],
    rechazos: [],
    createdAt: new Date().toISOString(),
  };

  db.reclamos.push(reclamo);
  guardarReclamos(db);
  return reclamo;
}

export function listarReclamos(grupoId) {
  const reclamos = cargarReclamos().reclamos;
  return grupoId ? reclamos.filter((r) => r.grupoId === grupoId) : reclamos;
}

export function obtenerReclamo(reclamoId) {
  const reclamo = cargarReclamos().reclamos.find((r) => r.id === reclamoId);
  if (!reclamo) throw new ErrorValidacion(`No existe un reclamo con id ${reclamoId}.`);
  return reclamo;
}

function validarVoto(reclamo, delegadoId) {
  if (reclamo.estado !== 'pendiente') {
    throw new ErrorValidacion(`El reclamo ya está en estado "${reclamo.estado}", no admite más votos.`);
  }
  const elegible = delegadosElegibles(reclamo.grupoId).some((d) => d.id === delegadoId);
  if (!elegible) {
    throw new ErrorValidacion(
      `El miembro ${delegadoId} no es un delegado elegible para votar en este grupo (debe ser delegado y estar al día con su cuota).`
    );
  }
  if (reclamo.aprobaciones.includes(delegadoId) || reclamo.rechazos.includes(delegadoId)) {
    throw new ErrorValidacion('Este delegado ya votó este reclamo.');
  }
}

function votar(reclamoId, delegadoId, campo, estadoSiAlcanzaQuorum) {
  const reclamo = obtenerReclamo(reclamoId);
  validarVoto(reclamo, delegadoId);
  const grupo = obtenerGrupo(reclamo.grupoId);

  const db = cargarReclamos();
  const actualizado = db.reclamos.find((r) => r.id === reclamoId);
  actualizado[campo].push(delegadoId);
  if (actualizado[campo].length >= grupo.quorumDelegados) {
    actualizado.estado = estadoSiAlcanzaQuorum;
  }
  guardarReclamos(db);
  return actualizado;
}

/**
 * Un delegado elegible aprueba un reclamo pendiente. Si con este voto se alcanza el
 * quórum de aprobaciones del grupo, el reclamo pasa a estado "aprobado".
 */
export function aprobarReclamo(reclamoId, delegadoId) {
  return votar(reclamoId, delegadoId, 'aprobaciones', 'aprobado');
}

/**
 * Un delegado elegible rechaza un reclamo pendiente. Si con este voto se alcanza el
 * quórum de rechazos del grupo, el reclamo pasa a estado "rechazado".
 */
export function rechazarReclamo(reclamoId, delegadoId) {
  return votar(reclamoId, delegadoId, 'rechazos', 'rechazado');
}

/**
 * Marca un reclamo aprobado como pagado, guardando el recibo de la transacción real
 * (JSON crudo de `wdk send`). La llama el módulo de tesorería (paso 6) tras ejecutar el pago.
 */
export function marcarReclamoPagado(reclamoId, recibo) {
  const reclamoActual = obtenerReclamo(reclamoId);
  if (reclamoActual.estado !== 'aprobado') {
    throw new ErrorValidacion(
      `El reclamo debe estar "aprobado" para marcarlo como pagado (estado actual: "${reclamoActual.estado}").`
    );
  }

  const db = cargarReclamos();
  const reclamo = db.reclamos.find((r) => r.id === reclamoId);
  reclamo.estado = 'pagado';
  reclamo.recibo = recibo;
  reclamo.fechaPago = new Date().toISOString();
  guardarReclamos(db);
  return reclamo;
}
