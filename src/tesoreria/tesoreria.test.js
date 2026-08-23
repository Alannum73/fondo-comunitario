// Tests del módulo de tesorería. Correr con: npm test
// `obtenerBalance`/`enviarPago` se inyectan como fakes — no pegan contra WDK CLI real ni la red.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let tmpDir;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'fondo-test-'));
  process.env.GRUPOS_DB_PATH = join(tmpDir, 'grupos.json');
  process.env.RECLAMOS_DB_PATH = join(tmpDir, 'reclamos.json');
});

after(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

const { crearGrupo, agregarMiembro, marcarAporte } = await import('../grupo/grupo.js');
const { crearReclamo, aprobarReclamo, obtenerReclamo, ErrorValidacion } = await import('../reclamos/reclamo.js');
const { pagarReclamo } = await import('./tesoreria.js');

const opcionesWdk = { wallet: 'fondo-test', network: 'sepolia', token: 'usdt' };
const DIRECCION_DESTINO = '0x24c7E155317d21ee6a9bB755A077Abe3f12169Ff';

// Crea un grupo con delegados al día, un miembro reclamante, y un reclamo ya aprobado
// (quórum alcanzado). Devuelve todo lo necesario para probar tesorería.
const crearReclamoAprobado = () => {
  const grupo = crearGrupo({
    nombre: 'Repartidores Cochabamba',
    cuotaPeriodica: 5,
    montoMaxSiniestro: 50,
    delegados: ['Ana', 'Carla', 'Elena'],
    quorumDelegados: 2,
  });
  const miembro = agregarMiembro(grupo.id, { nombre: 'Usuario B' });
  const delegados = ['Ana', 'Carla', 'Elena'].map((nombre) => {
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

  return { grupo, miembro, delegados, reclamo };
};

test('paga un reclamo aprobado con balance suficiente', async () => {
  const { reclamo } = crearReclamoAprobado();
  const enviarPago = async (args) => ({ txHash: '0xabc', ...args });

  const actualizado = await pagarReclamo(reclamo.id, DIRECCION_DESTINO, {
    ...opcionesWdk,
    obtenerBalance: async () => 100,
    enviarPago,
  });

  assert.equal(actualizado.estado, 'pagado');
  assert.equal(actualizado.recibo.txHash, '0xabc');
  assert.equal(actualizado.recibo.to, DIRECCION_DESTINO);
  assert.equal(actualizado.recibo.amount, 30);
  assert.ok(actualizado.fechaPago);
});

test('rechaza pagar si el balance es insuficiente', async () => {
  const { reclamo } = crearReclamoAprobado();
  const enviarPagoNoDeberiaLlamarse = async () => {
    throw new Error('no debería intentar enviar el pago si el balance no alcanza');
  };

  await assert.rejects(
    () =>
      pagarReclamo(reclamo.id, DIRECCION_DESTINO, {
        ...opcionesWdk,
        obtenerBalance: async () => 10,
        enviarPago: enviarPagoNoDeberiaLlamarse,
      }),
    ErrorValidacion
  );

  const reclamoSinCambios = obtenerReclamo(reclamo.id);
  assert.equal(reclamoSinCambios.estado, 'aprobado');
});

test('rechaza pagar un reclamo que no está aprobado', async () => {
  const grupo = crearGrupo({
    nombre: 'Otro grupo',
    cuotaPeriodica: 5,
    montoMaxSiniestro: 50,
    delegados: ['Ana', 'Carla', 'Elena'],
    quorumDelegados: 2,
  });
  const miembro = agregarMiembro(grupo.id, { nombre: 'Usuario B' });
  const reclamoPendiente = crearReclamo({
    grupoId: grupo.id,
    miembroId: miembro.id,
    montoSolicitado: 30,
    descripcion: 'Choque leve',
    fotoPath: '/uploads/siniestro-2.jpg',
  });

  await assert.rejects(
    () =>
      pagarReclamo(reclamoPendiente.id, DIRECCION_DESTINO, {
        ...opcionesWdk,
        obtenerBalance: async () => 100,
        enviarPago: async () => ({}),
      }),
    ErrorValidacion
  );
});

test('rechaza pagar sin dirección de destino', async () => {
  const { reclamo } = crearReclamoAprobado();
  await assert.rejects(
    () =>
      pagarReclamo(reclamo.id, '', {
        ...opcionesWdk,
        obtenerBalance: async () => 100,
        enviarPago: async () => ({}),
      }),
    ErrorValidacion
  );
});

test('rechaza pagar dos veces el mismo reclamo', async () => {
  const { reclamo } = crearReclamoAprobado();
  const opciones = { ...opcionesWdk, obtenerBalance: async () => 100, enviarPago: async (args) => ({ ...args }) };

  await pagarReclamo(reclamo.id, DIRECCION_DESTINO, opciones);
  await assert.rejects(() => pagarReclamo(reclamo.id, DIRECCION_DESTINO, opciones), ErrorValidacion);
});
