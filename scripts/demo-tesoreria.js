// Demo manual de tesorería — flujo completo hasta el paso 6: grupo, reclamo aprobado
// por quórum, y pago simulado (obtenerBalance/enviarPago fake, no pega contra WDK CLI
// real). Para probar contra la wallet real, ver README / conectar los wrappers de
// src/shared/wdk.js directamente.
//
// Uso: node scripts/demo-tesoreria.js

import { crearGrupo, agregarMiembro, marcarAporte } from '../src/grupo/grupo.js';
import { crearReclamo, aprobarReclamo } from '../src/reclamos/reclamo.js';
import { pagarReclamo } from '../src/tesoreria/tesoreria.js';

const grupo = crearGrupo({
  nombre: 'Repartidores Cochabamba',
  walletName: 'fondo-demo',
  cuotaPeriodica: 5,
  montoMaxSiniestro: 50,
  delegados: ['Usuario A', 'Usuario C', 'Usuario E'],
  quorumDelegados: 2,
});
const miembro = agregarMiembro(grupo.id, { nombre: 'Usuario B' });
const delegados = ['Usuario A', 'Usuario C', 'Usuario E'].map((nombre) => {
  const d = agregarMiembro(grupo.id, { nombre });
  marcarAporte(grupo.id, d.id);
  return d;
});

const reclamo = crearReclamo({
  grupoId: grupo.id,
  miembroId: miembro.id,
  montoSolicitado: 30,
  descripcion: 'Choque leve, daño en la rueda delantera',
  fotoPath: '/uploads/siniestro-1.jpg',
});
aprobarReclamo(reclamo.id, delegados[0].id);
aprobarReclamo(reclamo.id, delegados[1].id);
console.log(`Reclamo aprobado (id ${reclamo.id}) | monto: $${reclamo.montoSolicitado} USDT`);

const direccionDestino = '0x000000000000000000000000000000000000dEaD'; // dirección de ejemplo
const pagado = await pagarReclamo(reclamo.id, direccionDestino, {
  // sin "wallet": usa grupo.walletName ("fondo-demo") automáticamente
  network: 'sepolia',
  token: 'usdt',
  obtenerBalance: async () => 100, // simula balance suficiente en la wallet del fondo
  enviarPago: async ({ to, amount }) => ({ txHash: '0xsimulado', to, amount, network: 'sepolia' }),
});

console.log(`\nPago ejecutado -> estado: ${pagado.estado}`);
console.log('Recibo:', pagado.recibo);
