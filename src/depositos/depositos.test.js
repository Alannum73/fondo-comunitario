// Tests del módulo de depósitos. Correr con: npm test
// `obtenerBalance` se inyecta como fake — no pega contra WDK CLI real ni la red.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let tmpDir;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'fondo-test-'));
  process.env.GRUPOS_DB_PATH = join(tmpDir, 'grupos.json');
  process.env.BALANCE_SNAPSHOT_PATH = join(tmpDir, 'balance-fondo.json');
});

after(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

const { crearGrupo, agregarMiembro } = await import('../grupo/grupo.js');
const { confirmarAporte } = await import('./depositos.js');
const { ErrorValidacion } = await import('../grupo/grupo.js');

const crearGrupoDePrueba = () =>
  crearGrupo({
    nombre: 'Repartidores Cochabamba',
    cuotaPeriodica: 5,
    montoMaxSiniestro: 50,
    delegados: ['Ana', 'Carla', 'Elena'],
    quorumDelegados: 2,
  });

const opcionesWdk = { wallet: 'fondo-test', network: 'sepolia', token: 'usdt' };

test('confirma el aporte cuando el balance subió al menos la cuota', async () => {
  const grupo = crearGrupoDePrueba();
  const ana = agregarMiembro(grupo.id, { nombre: 'Ana' });

  const obtenerBalance = async () => 5;
  const miembro = await confirmarAporte(grupo.id, ana.id, { ...opcionesWdk, obtenerBalance });

  assert.equal(miembro.alDia, true);
});

test('rechaza si el balance no subió lo suficiente', async () => {
  const grupo = crearGrupoDePrueba();
  const ana = agregarMiembro(grupo.id, { nombre: 'Ana' });

  const obtenerBalance = async () => 2;
  await assert.rejects(
    () => confirmarAporte(grupo.id, ana.id, { ...opcionesWdk, obtenerBalance }),
    ErrorValidacion
  );
});

test('depósitos sucesivos consumen el snapshot y no se re-cuentan', async () => {
  const grupo = crearGrupoDePrueba();
  const ana = agregarMiembro(grupo.id, { nombre: 'Ana' });
  const carla = agregarMiembro(grupo.id, { nombre: 'Carla' });

  await confirmarAporte(grupo.id, ana.id, { ...opcionesWdk, obtenerBalance: async () => 5 });

  // Balance no subió desde el último snapshot (sigue en 5): no debería confirmar a Carla.
  await assert.rejects(
    () => confirmarAporte(grupo.id, carla.id, { ...opcionesWdk, obtenerBalance: async () => 5 }),
    ErrorValidacion
  );

  // Sube otros 5 (segundo depósito real): ahora sí confirma a Carla.
  const miembro = await confirmarAporte(grupo.id, carla.id, { ...opcionesWdk, obtenerBalance: async () => 10 });
  assert.equal(miembro.alDia, true);
});
