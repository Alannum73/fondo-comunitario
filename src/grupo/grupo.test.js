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

const {
  crearGrupo,
  agregarMiembro,
  marcarAporte,
  delegadosElegibles,
  obtenerGrupo,
  eliminarGrupo,
  listarGrupos,
  verificarLogin,
  ErrorValidacion,
} = await import('./grupo.js');

const datosValidos = () => ({
  nombre: 'Repartidores Cochabamba',
  walletName: 'fondo-test',
  cuotaPeriodica: 5,
  montoMaxSiniestro: 50,
  delegados: ['Ana', 'Carla', 'Elena'],
  quorumDelegados: 2,
});

test('crea un grupo válido', () => {
  const grupo = crearGrupo(datosValidos());
  assert.equal(grupo.nombre, 'Repartidores Cochabamba');
  assert.equal(grupo.walletName, 'fondo-test');
  assert.equal(grupo.delegados.length, 3);
  assert.equal(grupo.miembros.length, 0);
  assert.ok(grupo.id);
});

test('rechaza crear un grupo sin walletName', () => {
  const { walletName, ...sinWallet } = datosValidos();
  assert.throws(() => crearGrupo(sinWallet), ErrorValidacion);
});

test('dos grupos pueden tener wallets distintas', () => {
  const grupoA = crearGrupo({ ...datosValidos(), nombre: 'Grupo A', walletName: 'wallet-a' });
  const grupoB = crearGrupo({ ...datosValidos(), nombre: 'Grupo B', walletName: 'wallet-b' });
  assert.notEqual(grupoA.walletName, grupoB.walletName);
});

test('rechaza cuota <= 0', () => {
  assert.throws(() => crearGrupo({ ...datosValidos(), cuotaPeriodica: 0 }), ErrorValidacion);
});

test('rechaza monto máx <= 0', () => {
  assert.throws(() => crearGrupo({ ...datosValidos(), montoMaxSiniestro: -10 }), ErrorValidacion);
});

test('rechaza cuota o monto máx no numéricos (NaN)', () => {
  assert.throws(() => crearGrupo({ ...datosValidos(), cuotaPeriodica: NaN }), ErrorValidacion);
  assert.throws(() => crearGrupo({ ...datosValidos(), montoMaxSiniestro: NaN }), ErrorValidacion);
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
  const miembroB = agregarMiembro(grupo.id, { nombre: 'Usuario B', password: 'clave1234' });
  const delegadaAna = agregarMiembro(grupo.id, { nombre: 'Ana', password: 'clave1234' });

  assert.equal(miembroB.esDelegado, false);
  assert.equal(delegadaAna.esDelegado, true);
  assert.equal(miembroB.alDia, false);
});

test('rechaza miembro duplicado', () => {
  const grupo = crearGrupo(datosValidos());
  agregarMiembro(grupo.id, { nombre: 'Usuario B', password: 'clave1234' });
  assert.throws(() => agregarMiembro(grupo.id, { nombre: 'usuario b', password: 'clave1234' }), ErrorValidacion);
});

test('rechaza agregar un miembro sin contraseña o con una muy corta', () => {
  const grupo = crearGrupo(datosValidos());
  assert.throws(() => agregarMiembro(grupo.id, { nombre: 'Sin Clave' }), ErrorValidacion);
  assert.throws(() => agregarMiembro(grupo.id, { nombre: 'Clave Corta', password: 'abc' }), ErrorValidacion);
});

test('agregarMiembro nunca devuelve la contraseña en texto plano ni el hash', () => {
  const grupo = crearGrupo(datosValidos());
  const miembro = agregarMiembro(grupo.id, { nombre: 'Ana', password: 'clave1234' });
  assert.equal(miembro.password, undefined);
  assert.equal(miembro.passwordHash, undefined);
});

test('verificarLogin acepta la contraseña correcta y rechaza una incorrecta', () => {
  const grupo = crearGrupo(datosValidos());
  const ana = agregarMiembro(grupo.id, { nombre: 'Ana', password: 'clave-secreta' });

  const logueada = verificarLogin(grupo.id, ana.id, 'clave-secreta');
  assert.equal(logueada.id, ana.id);

  assert.throws(() => verificarLogin(grupo.id, ana.id, 'clave-incorrecta'), ErrorValidacion);
});

test('marcarAporte pone al miembro al día', () => {
  const grupo = crearGrupo(datosValidos());
  const ana = agregarMiembro(grupo.id, { nombre: 'Ana', password: 'clave1234' });
  assert.equal(ana.alDia, false);

  marcarAporte(grupo.id, ana.id);
  const grupoActualizado = obtenerGrupo(grupo.id);
  const anaActualizada = grupoActualizado.miembros.find((m) => m.id === ana.id);
  assert.equal(anaActualizada.alDia, true);
  assert.ok(anaActualizada.fechaUltimoAporte);
  assert.equal(anaActualizada.referenciaTx, null);
});

test('marcarAporte guarda la referencia de transacción si se pasa', () => {
  const grupo = crearGrupo(datosValidos());
  const ana = agregarMiembro(grupo.id, { nombre: 'Ana', password: 'clave1234' });

  marcarAporte(grupo.id, ana.id, '0xabc123');
  const actualizada = obtenerGrupo(grupo.id).miembros.find((m) => m.id === ana.id);
  assert.equal(actualizada.referenciaTx, '0xabc123');
});

test('delegadosElegibles solo cuenta delegados al día', () => {
  const grupo = crearGrupo(datosValidos());
  const ana = agregarMiembro(grupo.id, { nombre: 'Ana', password: 'clave1234' }); // delegada, no al día todavía
  agregarMiembro(grupo.id, { nombre: 'Carla', password: 'clave1234' }); // delegada, no al día todavía

  assert.equal(delegadosElegibles(grupo.id).length, 0);

  marcarAporte(grupo.id, ana.id);
  assert.equal(delegadosElegibles(grupo.id).length, 1);
});

test('eliminarGrupo borra el grupo de la lista', () => {
  const totalAntes = listarGrupos().length;
  const grupo = crearGrupo(datosValidos());
  assert.equal(listarGrupos().length, totalAntes + 1);

  const eliminado = eliminarGrupo(grupo.id);
  assert.equal(eliminado.id, grupo.id);
  assert.equal(listarGrupos().length, totalAntes);
  assert.throws(() => obtenerGrupo(grupo.id), ErrorValidacion);
});

test('eliminarGrupo rechaza un id inexistente', () => {
  assert.throws(() => eliminarGrupo('no-existe'), ErrorValidacion);
});
