// Historial completo — paso 7 del roadmap.
// Combina, en una sola vista de solo lectura, el estado de aportes de los miembros
// (src/grupo/grupo.js) con los reclamos, sus aprobaciones/rechazos y pagos
// (src/reclamos/reclamo.js). No agrega persistencia propia — lee los datos ya
// guardados por esos módulos.
//
// Limitación conocida: los votos de aprobación/rechazo no guardan fecha individual
// (solo la lista de ids de delegados que votaron), así que no aparecen como eventos
// con fecha en la línea de tiempo — sí se reflejan en el resumen agregado y en
// `reclamo.estado`. Consistente con el resto de simplificaciones deliberadas del
// proyecto (ver README).

import { obtenerGrupo } from '../grupo/grupo.js';
import { listarReclamos } from '../reclamos/reclamo.js';

export function obtenerHistorial(grupoId) {
  const grupo = obtenerGrupo(grupoId);
  const reclamos = listarReclamos(grupoId);

  const eventosAporte = grupo.miembros
    .filter((m) => m.alDia && m.fechaUltimoAporte)
    .map((m) => ({
      tipo: 'aporte',
      fecha: m.fechaUltimoAporte,
      miembroId: m.id,
      miembroNombre: m.nombre,
    }));

  const eventosReclamoCreado = reclamos.map((r) => ({
    tipo: 'reclamo_creado',
    fecha: r.createdAt,
    reclamoId: r.id,
    miembroId: r.miembroId,
    monto: r.montoSolicitado,
    descripcion: r.descripcion,
  }));

  const eventosReclamoPagado = reclamos
    .filter((r) => r.estado === 'pagado')
    .map((r) => ({
      tipo: 'reclamo_pagado',
      fecha: r.fechaPago,
      reclamoId: r.id,
      miembroId: r.miembroId,
      monto: r.montoSolicitado,
      recibo: r.recibo,
    }));

  const eventos = [...eventosAporte, ...eventosReclamoCreado, ...eventosReclamoPagado].sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha)
  );

  const reclamosPagados = reclamos.filter((r) => r.estado === 'pagado');

  return {
    grupo: {
      id: grupo.id,
      nombre: grupo.nombre,
      cuotaPeriodica: grupo.cuotaPeriodica,
      montoMaxSiniestro: grupo.montoMaxSiniestro,
    },
    resumen: {
      totalMiembros: grupo.miembros.length,
      miembrosAlDia: grupo.miembros.filter((m) => m.alDia).length,
      reclamosPendientes: reclamos.filter((r) => r.estado === 'pendiente').length,
      reclamosAprobados: reclamos.filter((r) => r.estado === 'aprobado').length,
      reclamosRechazados: reclamos.filter((r) => r.estado === 'rechazado').length,
      reclamosPagados: reclamosPagados.length,
      totalPagado: reclamosPagados.reduce((suma, r) => suma + r.montoSolicitado, 0),
    },
    eventos,
  };
}
