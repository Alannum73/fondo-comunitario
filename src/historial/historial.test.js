// Tests del módulo de historial. Correr con: npm test

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
const { crearReclamo, aprobarReclamo, rechazarReclamo } = await import('../reclamos/reclamo.js');
const { pagarReclamo } = await import('../tesoreria/tesoreria.js');
const { obtenerHistorial } = await import('./historial.js');

const opcionesWdk = {
  wallet: 'fondo-test',
  network: 'sepolia',
  token: 'usdt',
  obtenerBalance: async () => 1000,
  enviarPago: async ({ to, amount }) => ({ txHash: '0xabc', to, amount }),
};

const crearGrupoBase = () =>
  crearGrupo({
    nombre: 'Repartidores Cochabamba',
    walletName: 'fondo-test',
    cuotaPeriodica: 5,
    montoMaxSiniestro: 50,
    delegados: ['Ana', 'Carla', 'Elena'],
    quorumDelegados: 2,
  });

test('historial de un grupo recién creado está vacío', () => {
  const grupo = crearGrupoBase();
  const historial = obtenerHistorial(grupo.id);

  assert.equal(historial.resumen.totalMiembros, 0);
  assert.equal(historial.resumen.miembrosAlDia, 0);
  assert.equal(historial.resumen.reclamosPendientes, 0);
  assert.equal(historial.resumen.totalPagado, 0);
  assert.deepEqual(historial.eventos, []);
});

test('un aporte confirmado aparece como evento', () => {
  const grupo = crearGrupoBase();
  const ana = agregarMiembro(grupo.id, { nombre: 'Ana', password: 'clave1234' });
  marcarAporte(grupo.id, ana.id);

  const historial = obtenerHistorial(grupo.id);
  assert.equal(historial.resumen.miembrosAlDia, 1);
  assert.equal(historial.eventos.length, 1);
  assert.equal(historial.eventos[0].tipo, 'aporte');
  assert.equal(historial.eventos[0].miembroNombre, 'Ana');
});

test('un reclamo creado aparece como evento y en el resumen de pendientes', () => {
  const grupo = crearGrupoBase();
  const miembro = agregarMiembro(grupo.id, { nombre: 'Usuario B', password: 'clave1234' });
  crearReclamo({
    grupoId: grupo.id,
    miembroId: miembro.id,
    montoSolicitado: 30,
    descripcion: 'Choque leve',
    fotoPath: '/uploads/1.jpg',
  });

  const historial = obtenerHistorial(grupo.id);
  assert.equal(historial.resumen.reclamosPendientes, 1);
  assert.equal(historial.eventos.length, 1);
  assert.equal(historial.eventos[0].tipo, 'reclamo_creado');
});

test('un reclamo pagado aparece en eventos y en el resumen con el monto total', async () => {
  const grupo = crearGrupoBase();
  const miembro = agregarMiembro(grupo.id, { nombre: 'Usuario B', password: 'clave1234' });
  const delegados = ['Ana', 'Carla', 'Elena'].map((nombre) => {
    const d = agregarMiembro(grupo.id, { nombre, password: 'clave1234' });
    marcarAporte(grupo.id, d.id);
    return d;
  });

  const reclamo = crearReclamo({
    grupoId: grupo.id,
    miembroId: miembro.id,
    montoSolicitado: 30,
    descripcion: 'Choque leve',
    fotoPath: '/uploads/1.jpg',
  });
  aprobarReclamo(reclamo.id, delegados[0].id);
  aprobarReclamo(reclamo.id, delegados[1].id);
  await pagarReclamo(reclamo.id, '0x24c7E155317d21ee6a9bB755A077Abe3f12169Ff', opcionesWdk);

  const historial = obtenerHistorial(grupo.id);
  assert.equal(historial.resumen.reclamosPagados, 1);
  assert.equal(historial.resumen.totalPagado, 30);

  const eventoPago = historial.eventos.find((e) => e.tipo === 'reclamo_pagado');
  assert.ok(eventoPago);
  assert.equal(eventoPago.recibo.txHash, '0xabc');
});

test('un reclamo rechazado se refleja en el resumen', () => {
  const grupo = crearGrupoBase();
  const miembro = agregarMiembro(grupo.id, { nombre: 'Usuario B', password: 'clave1234' });
  const delegados = ['Ana', 'Carla', 'Elena'].map((nombre) => {
    const d = agregarMiembro(grupo.id, { nombre, password: 'clave1234' });
    marcarAporte(grupo.id, d.id);
    return d;
  });

  const reclamo = crearReclamo({
    grupoId: grupo.id,
    miembroId: miembro.id,
    montoSolicitado: 30,
    descripcion: 'Choque leve',
    fotoPath: '/uploads/1.jpg',
  });
  rechazarReclamo(reclamo.id, delegados[0].id);
  rechazarReclamo(reclamo.id, delegados[1].id);

  const historial = obtenerHistorial(grupo.id);
  assert.equal(historial.resumen.reclamosRechazados, 1);
  assert.equal(historial.resumen.reclamosPendientes, 0);
});

test('los eventos quedan ordenados cronológicamente', async () => {
  const grupo = crearGrupoBase();
  const miembro = agregarMiembro(grupo.id, { nombre: 'Usuario B', password: 'clave1234' });
  const ana = agregarMiembro(grupo.id, { nombre: 'Ana', password: 'clave1234' });
  marcarAporte(grupo.id, ana.id); // evento más temprano

  const reclamo = crearReclamo({
    grupoId: grupo.id,
    miembroId: miembro.id,
    montoSolicitado: 30,
    descripcion: 'Choque leve',
    fotoPath: '/uploads/1.jpg',
  }); // evento más tardío

  const historial = obtenerHistorial(grupo.id);
  const fechas = historial.eventos.map((e) => new Date(e.fecha).getTime());
  const fechasOrdenadas = [...fechas].sort((a, b) => a - b);
  assert.deepEqual(fechas, fechasOrdenadas);
});
