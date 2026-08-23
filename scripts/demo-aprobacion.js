// Demo manual del panel de aprobación — flujo hasta donde llega el paso 5: grupo con
// delegados al día, reclamo pendiente, votos hasta alcanzar el quórum. El pago real
// (paso 6, tesorería) todavía no existe.
//
// Uso: node scripts/demo-aprobacion.js

import { crearGrupo, agregarMiembro, marcarAporte } from '../src/grupo/grupo.js';
import { crearReclamo, aprobarReclamo } from '../src/reclamos/reclamo.js';

const grupo = crearGrupo({
  nombre: 'Repartidores Cochabamba',
  cuotaPeriodica: 5,
  montoMaxSiniestro: 50,
  delegados: ['Usuario A', 'Usuario C', 'Usuario E'],
  quorumDelegados: 2,
});
const miembro = agregarMiembro(grupo.id, { nombre: 'Usuario B' });

const delegados = ['Usuario A', 'Usuario C', 'Usuario E'].map((nombre) => {
  const d = agregarMiembro(grupo.id, { nombre });
  marcarAporte(grupo.id, d.id); // al día, elegibles para votar
  return d;
});
console.log(`Grupo: "${grupo.nombre}" | quórum: ${grupo.quorumDelegados}/${grupo.delegados.length} delegados`);

const reclamo = crearReclamo({
  grupoId: grupo.id,
  miembroId: miembro.id,
  montoSolicitado: 30,
  descripcion: 'Choque leve, daño en la rueda delantera',
  fotoPath: '/uploads/siniestro-1.jpg',
});
console.log(`\nReclamo creado (id ${reclamo.id}) | estado: ${reclamo.estado}`);

let actual = aprobarReclamo(reclamo.id, delegados[0].id);
console.log(`  ${delegados[0].nombre} aprueba -> estado: ${actual.estado} (${actual.aprobaciones.length}/${grupo.quorumDelegados} votos)`);

actual = aprobarReclamo(reclamo.id, delegados[1].id);
console.log(`  ${delegados[1].nombre} aprueba -> estado: ${actual.estado} (${actual.aprobaciones.length}/${grupo.quorumDelegados} votos)`);

console.log(`\nEstado final del reclamo: ${actual.estado}`);
