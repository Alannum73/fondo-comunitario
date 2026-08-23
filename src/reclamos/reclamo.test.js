// Tests del módulo de reclamos. Correr con: npm test
// Usa archivos de datos temporales (GRUPOS_DB_PATH / RECLAMOS_DB_PATH) para no tocar los reales.

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
const { crearReclamo, listarReclamos, obtenerReclamo, aprobarReclamo, rechazarReclamo, ErrorValidacion } =
  await import('./reclamo.js');

const crearGrupoConMiembro = () => {
  const grupo = crearGrupo({
    nombre: 'Repartidores Cochabamba',
    cuotaPeriodica: 5,
    montoMaxSiniestro: 50,
    delegados: ['Ana', 'Carla', 'Elena'],
    quorumDelegados: 2,
  });
  const miembro = agregarMiembro(grupo.id, { nombre: 'Usuario B' });
  return { grupo, miembro };
};

// Grupo con los 3 delegados agregados como miembros y al día (elegibles para votar).
const crearGrupoConDelegadosElegibles = () => {
  const { grupo, miembro } = crearGrupoConMiembro();
  const delegados = ['Ana', 'Carla', 'Elena'].map((nombre) => {
    const d = agregarMiembro(grupo.id, { nombre });
    marcarAporte(grupo.id, d.id);
    return d;
  });
  return { grupo, miembro, delegados };
};

const datosValidos = (grupo, miembro) => ({
  grupoId: grupo.id,
  miembroId: miembro.id,
  montoSolicitado: 30,
  descripcion: 'Choque leve, daño en la rueda delantera',
  fotoPath: '/uploads/siniestro-1.jpg',
});

test('crea un reclamo válido en estado pendiente', () => {
  const { grupo, miembro } = crearGrupoConMiembro();
  const reclamo = crearReclamo(datosValidos(grupo, miembro));

  assert.equal(reclamo.estado, 'pendiente');
  assert.equal(reclamo.grupoId, grupo.id);
  assert.equal(reclamo.miembroId, miembro.id);
  assert.deepEqual(reclamo.aprobaciones, []);
  assert.ok(reclamo.id);
});

test('rechaza si el miembro no pertenece al grupo', () => {
  const { grupo } = crearGrupoConMiembro();
  assert.throws(
    () => crearReclamo({ ...datosValidos(grupo, { id: 'no-existe' }), miembroId: 'no-existe' }),
    ErrorValidacion
  );
});

test('rechaza monto <= 0', () => {
  const { grupo, miembro } = crearGrupoConMiembro();
  assert.throws(
    () => crearReclamo({ ...datosValidos(grupo, miembro), montoSolicitado: 0 }),
    ErrorValidacion
  );
});

test('rechaza monto no numérico (NaN)', () => {
  const { grupo, miembro } = crearGrupoConMiembro();
  assert.throws(
    () => crearReclamo({ ...datosValidos(grupo, miembro), montoSolicitado: NaN }),
    ErrorValidacion
  );
});

test('rechaza monto que supera el máximo por siniestro del grupo', () => {
  const { grupo, miembro } = crearGrupoConMiembro();
  assert.throws(
    () => crearReclamo({ ...datosValidos(grupo, miembro), montoSolicitado: 999 }),
    ErrorValidacion
  );
});

test('rechaza sin descripción', () => {
  const { grupo, miembro } = crearGrupoConMiembro();
  assert.throws(
    () => crearReclamo({ ...datosValidos(grupo, miembro), descripcion: '  ' }),
    ErrorValidacion
  );
});

test('rechaza sin ruta de foto', () => {
  const { grupo, miembro } = crearGrupoConMiembro();
  assert.throws(
    () => crearReclamo({ ...datosValidos(grupo, miembro), fotoPath: '' }),
    ErrorValidacion
  );
});

test('listarReclamos filtra por grupo', () => {
  const { grupo, miembro } = crearGrupoConMiembro();
  const { grupo: otroGrupo, miembro: otroMiembro } = crearGrupoConMiembro();

  crearReclamo(datosValidos(grupo, miembro));
  crearReclamo(datosValidos(otroGrupo, otroMiembro));

  assert.equal(listarReclamos(grupo.id).length, 1);
  assert.equal(listarReclamos(otroGrupo.id).length, 1);
});

test('obtenerReclamo devuelve el reclamo creado', () => {
  const { grupo, miembro } = crearGrupoConMiembro();
  const creado = crearReclamo(datosValidos(grupo, miembro));
  const obtenido = obtenerReclamo(creado.id);
  assert.equal(obtenido.id, creado.id);
});

test('obtenerReclamo lanza error si no existe', () => {
  assert.throws(() => obtenerReclamo('no-existe'), ErrorValidacion);
});

test('un solo voto de aprobación no alcanza el quórum (2)', () => {
  const { grupo, miembro, delegados } = crearGrupoConDelegadosElegibles();
  const reclamo = crearReclamo(datosValidos(grupo, miembro));

  const actualizado = aprobarReclamo(reclamo.id, delegados[0].id);
  assert.equal(actualizado.estado, 'pendiente');
  assert.equal(actualizado.aprobaciones.length, 1);
});

test('el segundo voto de aprobación alcanza el quórum y aprueba el reclamo', () => {
  const { grupo, miembro, delegados } = crearGrupoConDelegadosElegibles();
  const reclamo = crearReclamo(datosValidos(grupo, miembro));

  aprobarReclamo(reclamo.id, delegados[0].id);
  const actualizado = aprobarReclamo(reclamo.id, delegados[1].id);

  assert.equal(actualizado.estado, 'aprobado');
  assert.equal(actualizado.aprobaciones.length, 2);
});

test('el quórum de rechazos rechaza el reclamo', () => {
  const { grupo, miembro, delegados } = crearGrupoConDelegadosElegibles();
  const reclamo = crearReclamo(datosValidos(grupo, miembro));

  rechazarReclamo(reclamo.id, delegados[0].id);
  const actualizado = rechazarReclamo(reclamo.id, delegados[1].id);

  assert.equal(actualizado.estado, 'rechazado');
});

test('rechaza el voto de un delegado no elegible (no está al día)', () => {
  const { grupo, miembro } = crearGrupoConMiembro();
  const delegadaNoAlDia = agregarMiembro(grupo.id, { nombre: 'Ana' });
  const reclamo = crearReclamo(datosValidos(grupo, miembro));

  assert.throws(() => aprobarReclamo(reclamo.id, delegadaNoAlDia.id), ErrorValidacion);
});

test('rechaza el voto de alguien que no es delegado', () => {
  const { grupo, miembro } = crearGrupoConDelegadosElegibles();
  const reclamo = crearReclamo(datosValidos(grupo, miembro));

  assert.throws(() => aprobarReclamo(reclamo.id, miembro.id), ErrorValidacion);
});

test('rechaza el doble voto del mismo delegado', () => {
  const { grupo, miembro, delegados } = crearGrupoConDelegadosElegibles();
  const reclamo = crearReclamo(datosValidos(grupo, miembro));

  aprobarReclamo(reclamo.id, delegados[0].id);
  assert.throws(() => aprobarReclamo(reclamo.id, delegados[0].id), ErrorValidacion);
});

test('rechaza votos sobre un reclamo que ya no está pendiente', () => {
  const { grupo, miembro, delegados } = crearGrupoConDelegadosElegibles();
  const reclamo = crearReclamo(datosValidos(grupo, miembro));

  aprobarReclamo(reclamo.id, delegados[0].id);
  aprobarReclamo(reclamo.id, delegados[1].id); // alcanza quórum, queda "aprobado"

  assert.throws(() => rechazarReclamo(reclamo.id, delegados[2].id), ErrorValidacion);
});
