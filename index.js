// UI mínima end-to-end — paso 8 del roadmap.
// Una CLI interactiva sobre los módulos ya construidos (grupo, depositos, reclamos,
// tesoreria, historial). Sin framework web: para el alcance del hackathon (equipo de
// 2 personas, 48h) alcanza con esto — decisión ya tomada, ver README/CLAUDE.md.
//
// Uso: npm start (o `node index.js`)

import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';

import { cargarEnv } from './src/shared/env.js';
import { crearGrupo, listarGrupos, agregarMiembro, marcarAporte, ErrorValidacion } from './src/grupo/grupo.js';
import { confirmarAporte } from './src/depositos/depositos.js';
import { crearReclamo, listarReclamos, aprobarReclamo, rechazarReclamo } from './src/reclamos/reclamo.js';
import { pagarReclamo } from './src/tesoreria/tesoreria.js';
import { obtenerHistorial } from './src/historial/historial.js';
import { obtenerDireccion } from './src/shared/wdk.js';

cargarEnv();

// `rl.question()` de `node:readline/promises` no encadena bien preguntas sucesivas
// cuando el input no es una TTY (se cuelga después de la primera) — manejamos las
// líneas nosotros mismos con el iterador asíncrono de la interfaz clásica, que sí
// funciona igual con input interactivo o con datos ya bufferizados (tests/pipes).
const rl = createInterface({ input: stdin, output: stdout, terminal: Boolean(stdin.isTTY) });
const lineas = rl[Symbol.asyncIterator]();
async function preguntar(texto) {
  stdout.write(texto);
  const { value, done } = await lineas.next();
  return done ? '' : value;
}

// La wallet ya no viene de acá — cada grupo tiene la suya propia (grupo.walletName).
// Solo la red y el token son configuración global (misma cadena/token para todos los fondos).
function opcionesWdk() {
  const { WDK_NETWORK: network, WDK_TOKEN: token } = process.env;
  if (!network) {
    console.log('\n⚠️  Falta WDK_NETWORK en tu .env (copiá .env.example a .env y completalo).\n');
  }
  return { network, token };
}

function manejarError(error) {
  if (error instanceof ErrorValidacion) {
    console.log(`\n✗ ${error.message}\n`);
  } else {
    console.log(`\n✗ Error inesperado: ${error.message}\n`);
  }
}

async function crearGrupoFlujo() {
  console.log(
    '\nCada grupo/fondo necesita su propia wallet de WDK CLI, ya creada, con una passphrase que solo vos conocés.\n' +
      'Si todavía no la creaste, abrí OTRA terminal ahora y corré (sin cerrar esta app):\n' +
      '  npx wdk wallet create --name <nombre-de-wallet>\n'
  );
  const walletName = await preguntar('Nombre de la wallet ya creada para este grupo: ');

  const nombre = await preguntar('Nombre del grupo: ');
  const cuotaPeriodica = Number(await preguntar('Cuota periódica (USDT): '));
  const montoMaxSiniestro = Number(await preguntar('Monto máx por siniestro (USDT): '));
  const delegados = (await preguntar('Delegados (nombres separados por coma, mínimo 3): '))
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
  const quorumDelegados = Number(await preguntar('Quórum de delegados: '));

  const grupo = crearGrupo({ nombre, walletName, cuotaPeriodica, montoMaxSiniestro, delegados, quorumDelegados });
  console.log(`\n✓ Grupo creado. id: ${grupo.id} (wallet: ${grupo.walletName})\n`);
}

async function verGruposFlujo() {
  const grupos = listarGrupos();
  if (grupos.length === 0) {
    console.log('\nNo hay grupos todavía.\n');
    return;
  }
  console.log('');
  for (const g of grupos) {
    const alDia = g.miembros.filter((m) => m.alDia).length;
    console.log(`- ${g.nombre} (id ${g.id})`);
    console.log(`    wallet: ${g.walletName}`);
    try {
      const direccion = await obtenerDireccion({ wallet: g.walletName, network: process.env.WDK_NETWORK });
      console.log(`    dirección para depositar (${process.env.WDK_NETWORK}): ${direccion}`);
    } catch (error) {
      console.log(`    dirección: no disponible (${error.message})`);
    }
    console.log(
      `    cuota: ${g.cuotaPeriodica} | monto máx: ${g.montoMaxSiniestro} | quórum: ${g.quorumDelegados}/${g.delegados.length} delegados`
    );
    console.log(`    delegados designados (nombres): ${g.delegados.join(', ')}`);
    console.log(`    miembros: ${g.miembros.length} (${alDia} al día)`);
    for (const m of g.miembros) {
      const etiquetas = [m.esDelegado ? 'delegado' : null, m.alDia ? 'al día' : 'no al día'].filter(Boolean);
      const referencia = m.referenciaTx ? ` — ref: ${m.referenciaTx}` : '';
      console.log(`      · ${m.nombre} (id ${m.id}) [${etiquetas.join(', ')}]${referencia}`);
    }

    const reclamos = listarReclamos(g.id);
    if (reclamos.length > 0) {
      console.log(`    reclamos:`);
      for (const r of reclamos) {
        console.log(`      · ${r.montoSolicitado} USDT — ${r.estado} (id ${r.id})`);
      }
    }
  }
  console.log('');
}

async function agregarMiembroFlujo() {
  const grupoId = await preguntar('id del grupo: ');
  const nombre = await preguntar('Nombre del miembro: ');
  const password = await preguntar('Contraseña del miembro (mín. 4 caracteres, la elige y recuerda él/ella): ');
  const miembro = agregarMiembro(grupoId, { nombre, password });
  console.log(`\n✓ ${miembro.nombre} agregado${miembro.esDelegado ? ' (delegado)' : ''}. id: ${miembro.id}\n`);
}

async function confirmarAporteFlujo() {
  const grupoId = await preguntar('id del grupo: ');
  const miembroId = await preguntar('id del miembro: ');
  const referenciaTx = await preguntar('Hash de la transacción (opcional, Enter para omitir): ');
  const miembro = await confirmarAporte(grupoId, miembroId, { ...opcionesWdk(), referenciaTx });
  console.log(`\n✓ ${miembro.nombre} quedó al día con su cuota.\n`);
}

async function marcarAporteManualFlujo() {
  const grupoId = await preguntar('id del grupo: ');
  const miembroId = await preguntar('id del miembro: ');
  const referenciaTx = await preguntar('Hash de la transacción (opcional, Enter para omitir): ');
  const miembro = marcarAporte(grupoId, miembroId, referenciaTx);
  console.log(
    `\n⚠️  SIMULADO (no verificado con WDK): ${miembro.nombre} quedó marcado al día manualmente. ` +
      `Usar solo para pruebas mientras no haya USDT real en la wallet del fondo.\n`
  );
}

async function reportarReclamoFlujo() {
  const grupoId = await preguntar('id del grupo: ');
  const miembroId = await preguntar('id del miembro reclamante: ');
  const montoSolicitado = Number(await preguntar('Monto solicitado (USDT): '));
  const descripcion = await preguntar('Descripción del siniestro: ');
  const fotoPath = await preguntar('Ruta de la foto (evidencia): ');

  const reclamo = crearReclamo({ grupoId, miembroId, montoSolicitado, descripcion, fotoPath });
  console.log(`\n✓ Reclamo creado. id: ${reclamo.id} (estado: ${reclamo.estado})\n`);
}

async function votarReclamoFlujo() {
  const reclamoId = await preguntar('id del reclamo: ');
  const delegadoId = await preguntar('id del delegado que vota: ');
  const voto = (await preguntar('¿Aprobar o rechazar? (a/r): ')).trim().toLowerCase();

  const actualizado = voto === 'a' ? aprobarReclamo(reclamoId, delegadoId) : rechazarReclamo(reclamoId, delegadoId);
  console.log(`\n✓ Voto registrado. Estado del reclamo: ${actualizado.estado}\n`);
}

async function pagarReclamoFlujo() {
  const reclamoId = await preguntar('id del reclamo aprobado: ');
  const direccionDestino = await preguntar('Dirección de destino del pago: ');

  const actualizado = await pagarReclamo(reclamoId, direccionDestino, opcionesWdk());
  console.log(`\n✓ Pago ejecutado. Estado: ${actualizado.estado}`);
  console.log('  Recibo:', actualizado.recibo, '\n');
}

async function verHistorialFlujo() {
  const grupoId = await preguntar('id del grupo: ');
  const historial = obtenerHistorial(grupoId);

  console.log(`\nHistorial de "${historial.grupo.nombre}"`);
  console.log('Resumen:', historial.resumen);
  console.log('Eventos:');
  for (const evento of historial.eventos) {
    console.log(`  [${evento.fecha}] ${evento.tipo}`, JSON.stringify(evento));
  }
  console.log('');
}

const OPCIONES = {
  1: ['Crear grupo', crearGrupoFlujo],
  2: ['Ver grupos', verGruposFlujo],
  3: ['Agregar miembro a un grupo', agregarMiembroFlujo],
  4: ['Confirmar aporte de un miembro (real, vía WDK)', confirmarAporteFlujo],
  5: ['Reportar un reclamo', reportarReclamoFlujo],
  6: ['Votar un reclamo (delegado)', votarReclamoFlujo],
  7: ['Pagar un reclamo aprobado (real, vía WDK)', pagarReclamoFlujo],
  8: ['Ver historial de un grupo', verHistorialFlujo],
  9: ['Marcar aporte manual (SIN WDK — solo para pruebas)', marcarAporteManualFlujo],
};

async function menuPrincipal() {
  console.log('\n=== Fondo Comunitario ===');
  for (const [numero, [etiqueta]] of Object.entries(OPCIONES)) {
    console.log(`${numero}) ${etiqueta}`);
  }
  console.log('0) Salir\n');

  const opcion = (await preguntar('Elegí una opción: ')).trim();
  if (opcion === '0') {
    rl.close();
    return;
  }

  const entrada = OPCIONES[opcion];
  if (!entrada) {
    console.log('\nOpción inválida.\n');
  } else {
    try {
      await entrada[1]();
    } catch (error) {
      manejarError(error);
    }
  }
  await menuPrincipal();
}

console.log('Bienvenido al Fondo Comunitario.');
await menuPrincipal();
