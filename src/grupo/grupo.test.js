// Tests del módulo de grupo. Correr con: npm test
// Usa un archivo de datos temporal (vía GRUPOS_DB_PATH) para no tocar data/grupos.json real.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let tmpDir;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'fondo-test-'));
  process.env.GRUPOS_DB_PATH = join(tmpDir, 'grupos.json');
});

after(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

const { crearGrupo, agregarMiembro, marcarAporte, delegadosElegibles, obtenerGrupo, ErrorValidacion } =
  await import('./grupo.js');

const datosValidos = () => ({
  nombre: 'Repartidores Cochabamba',
  cuotaPeriodica: 5,
  montoMaxSiniestro: 50,
  delegados: ['Ana', 'Carla', 'Elena'],
  quorumDelegados: 2,
});

test('crea un grupo válido', () => {
  const grupo = crearGrupo(datosValidos());
  assert.equal(grupo.nombre, 'Repartidores Cochabamba');
  assert.equal(grupo.delegados.length, 3);
  assert.equal(grupo.miembros.length, 0);
  assert.ok(grupo.id);
});

test('rechaza cuota <= 0', () => {
  assert.throws(() => crearGrupo({ ...datosValidos(), cuotaPeriodica: 0 }), ErrorValidacion);
});

test('rechaza monto máx <= 0', () => {
  assert.throws(() => crearGrupo({ ...datosValidos(), montoMaxSiniestro: -10 }), ErrorValidacion);
});

test('rechaza menos de 3 delegados', () => {
  assert.throws(() => crearGrupo({ ...datosValidos(), delegados: ['Ana', 'Carla'] }), ErrorValidacion);
});

test('rechaza delegados duplicados', () => {
  assert.throws(
    () => crearGrupo({ ...datosValidos(), delegados: ['Ana', 'ana', 'Elena'] }),
    ErrorValidacion
  );
});

test('rechaza quórum mayor a la cantidad de delegados', () => {
  assert.throws(() => crearGrupo({ ...datosValidos(), quorumDelegados: 5 }), ErrorValidacion);
});

test('agrega miembros y marca delegados automáticamente', () => {
  const grupo = crearGrupo(datosValidos());
  const miembroB = agregarMiembro(grupo.id, { nombre: 'Usuario B' });
  const delegadaAna = agregarMiembro(grupo.id, { nombre: 'Ana' });

  assert.equal(miembroB.esDelegado, false);
  assert.equal(delegadaAna.esDelegado, true);
  assert.equal(miembroB.alDia, false);
});

test('rechaza miembro duplicado', () => {
  const grupo = crearGrupo(datosValidos());
  agregarMiembro(grupo.id, { nombre: 'Usuario B' });
  assert.throws(() => agregarMiembro(grupo.id, { nombre: 'usuario b' }), ErrorValidacion);
});

test('marcarAporte pone al miembro al día', () => {
  const grupo = crearGrupo(datosValidos());
  const ana = agregarMiembro(grupo.id, { nombre: 'Ana' });
  assert.equal(ana.alDia, false);

  marcarAporte(grupo.id, ana.id);
  const grupoActualizado = obtenerGrupo(grupo.id);
  const anaActualizada = grupoActualizado.miembros.find((m) => m.id === ana.id);
  assert.equal(anaActualizada.alDia, true);
  assert.ok(anaActualizada.fechaUltimoAporte);
});

test('delegadosElegibles solo cuenta delegados al día', () => {
  const grupo = crearGrupo(datosValidos());
  const ana = agregarMiembro(grupo.id, { nombre: 'Ana' }); // delegada, no al día todavía
  agregarMiembro(grupo.id, { nombre: 'Carla' }); // delegada, no al día todavía

  assert.equal(delegadosElegibles(grupo.id).length, 0);

  marcarAporte(grupo.id, ana.id);
  assert.equal(delegadosElegibles(grupo.id).length, 1);
});
