// Reporte de siniestros — paso 4 del roadmap.
// Un miembro reporta un caso: foto (solo se guarda la ruta/referencia, no se sube a
// ningún lado — análisis de imagen vía QVAC está fuera de alcance del hackathon, ver
// README "Qué es real vs simulado"), monto solicitado y descripción.
//
// El reclamo nace en estado "pendiente". La aprobación de delegados y el cálculo de
// quórum son el paso 5 (todavía no implementado acá).

import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { leer, escribir } from '../shared/jsonStore.js';
import { obtenerGrupo, ErrorValidacion } from '../grupo/grupo.js';

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
  if (typeof montoSolicitado !== 'number' || montoSolicitado <= 0) {
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
