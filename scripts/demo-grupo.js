// Demo manual del módulo de grupo — corre el flujo del spec (sección 5) hasta donde
// llega la lógica de grupo (todavía sin depósitos reales en WDK, eso es el paso 3).
//
// Uso: node scripts/demo-grupo.js

import {
  crearGrupo,
  agregarMiembro,
  marcarAporte,
  delegadosElegibles,
  listarGrupos,
} from '../src/grupo/grupo.js';

const grupo = crearGrupo({
  nombre: 'Repartidores Cochabamba',
  cuotaPeriodica: 5,
  montoMaxSiniestro: 50,
  delegados: ['Usuario A', 'Usuario C', 'Usuario E'],
  quorumDelegados: 2,
});
console.log(`Grupo creado: "${grupo.nombre}" (id ${grupo.id})`);
console.log(`  cuota: $${grupo.cuotaPeriodica} USDT | monto máx: $${grupo.montoMaxSiniestro} USDT | quórum: ${grupo.quorumDelegados}/${grupo.delegados.length}`);

for (const nombre of ['Usuario A', 'Usuario B', 'Usuario C', 'Usuario D', 'Usuario E']) {
  const miembro = agregarMiembro(grupo.id, { nombre });
  console.log(`  + ${miembro.nombre} se unió${miembro.esDelegado ? ' (delegado)' : ''}`);
}

console.log('\nAntes de los aportes, delegados elegibles para votar:', delegadosElegibles(grupo.id).length);

for (const nombre of ['Usuario A', 'Usuario C', 'Usuario E']) {
  const m = listarGrupos()
    .find((g) => g.id === grupo.id)
    .miembros.find((m) => m.nombre === nombre);
  marcarAporte(grupo.id, m.id);
  console.log(`  ✓ ${nombre} depositó su cuota, queda "al día"`);
}

console.log('\nDespués de los aportes, delegados elegibles para votar:', delegadosElegibles(grupo.id).length);
