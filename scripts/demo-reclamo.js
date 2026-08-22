// Demo manual del módulo de reclamos — flujo hasta donde llega el paso 4 (reporte de
// siniestro). La aprobación de delegados (paso 5) todavía no existe.
//
// Uso: node scripts/demo-reclamo.js

import { crearGrupo, agregarMiembro } from '../src/grupo/grupo.js';
import { crearReclamo, listarReclamos } from '../src/reclamos/reclamo.js';

const grupo = crearGrupo({
  nombre: 'Repartidores Cochabamba',
  cuotaPeriodica: 5,
  montoMaxSiniestro: 50,
  delegados: ['Usuario A', 'Usuario C', 'Usuario E'],
  quorumDelegados: 2,
});
const miembro = agregarMiembro(grupo.id, { nombre: 'Usuario B' });
console.log(`Grupo: "${grupo.nombre}" | monto máx por siniestro: $${grupo.montoMaxSiniestro} USDT`);
console.log(`Miembro: ${miembro.nombre} (id ${miembro.id})`);

const reclamo = crearReclamo({
  grupoId: grupo.id,
  miembroId: miembro.id,
  montoSolicitado: 30,
  descripcion: 'Choque leve, daño en la rueda delantera',
  fotoPath: '/uploads/siniestro-1.jpg',
});
console.log(`\nReclamo creado (id ${reclamo.id}):`);
console.log(`  monto solicitado: $${reclamo.montoSolicitado} USDT | estado: ${reclamo.estado}`);
console.log(`  descripción: ${reclamo.descripcion}`);

try {
  crearReclamo({
    grupoId: grupo.id,
    miembroId: miembro.id,
    montoSolicitado: 200,
    descripcion: 'Reclamo exagerado',
    fotoPath: '/uploads/siniestro-2.jpg',
  });
} catch (error) {
  console.log(`\nIntento de reclamo por sobre el máximo, rechazado correctamente: "${error.message}"`);
}

console.log(`\nReclamos del grupo: ${listarReclamos(grupo.id).length}`);
