// Demo manual del historial — corre el flujo completo (grupo -> aportes -> reclamo ->
// aprobación -> pago simulado) y muestra la vista combinada del paso 7.
//
// Uso: node scripts/demo-historial.js

import { crearGrupo, agregarMiembro, marcarAporte } from '../src/grupo/grupo.js';
import { crearReclamo, aprobarReclamo } from '../src/reclamos/reclamo.js';
import { pagarReclamo } from '../src/tesoreria/tesoreria.js';
import { obtenerHistorial } from '../src/historial/historial.js';

const grupo = crearGrupo({
  nombre: 'Repartidores Cochabamba',
  walletName: 'fondo-demo',
  cuotaPeriodica: 5,
  montoMaxSiniestro: 50,
  delegados: ['Usuario A', 'Usuario C', 'Usuario E'],
  quorumDelegados: 2,
});
const miembro = agregarMiembro(grupo.id, { nombre: 'Usuario B', password: 'clave1234' });
const delegados = ['Usuario A', 'Usuario C', 'Usuario E'].map((nombre) => {
  const d = agregarMiembro(grupo.id, { nombre, password: 'clave1234' });
  marcarAporte(grupo.id, d.id);
  return d;
});
marcarAporte(grupo.id, miembro.id);

const reclamo = crearReclamo({
  grupoId: grupo.id,
  miembroId: miembro.id,
  montoSolicitado: 30,
  descripcion: 'Choque leve, daño en la rueda delantera',
  fotoPath: '/uploads/siniestro-1.jpg',
});
aprobarReclamo(reclamo.id, delegados[0].id);
aprobarReclamo(reclamo.id, delegados[1].id);
await pagarReclamo(reclamo.id, '0x000000000000000000000000000000000000dEaD', {
  // sin "wallet": usa grupo.walletName ("fondo-demo") automáticamente
  network: 'sepolia',
  token: 'usdt',
  obtenerBalance: async () => 100,
  enviarPago: async ({ to, amount }) => ({ txHash: '0xsimulado', to, amount }),
});

const historial = obtenerHistorial(grupo.id);

console.log(`Historial de "${historial.grupo.nombre}"\n`);
console.log('Resumen:', historial.resumen);
console.log('\nLínea de tiempo:');
for (const evento of historial.eventos) {
  console.log(`  [${evento.fecha}] ${evento.tipo}`, JSON.stringify(evento));
}
