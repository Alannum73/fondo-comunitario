// Confirmación de depósitos de cuota — paso 3 del roadmap.
//
// Modelo: cada grupo tiene su propia wallet de WDK CLI (grupo.walletName), pero dentro
// de esa wallet seguimos sin poder atribuir una entrada de balance a un miembro
// específico por dirección (la wallet es custodio único del grupo, no una por miembro).
// En su lugar, comparamos el balance actual contra el último snapshot guardado: si
// subió al menos lo de una cuota, asumimos que el depósito que se está confirmando es
// ese y avanzamos. Es una limitación conocida (igual que el modelo de custodia y el
// quórum off-chain, ver README) — para el alcance del hackathon alcanza con un flujo
// secuencial (un delegado confirma un aporte a la vez).

import { leer, escribir } from '../shared/jsonStore.js';
import { obtenerGrupo, marcarAporte, ErrorValidacion } from '../grupo/grupo.js';
import { obtenerBalance as obtenerBalanceWdk } from '../shared/wdk.js';
import { join } from 'node:path';

const SNAPSHOT_PATH = process.env.BALANCE_SNAPSHOT_PATH || join(process.cwd(), 'data', 'balance-fondo.json');

function leerUltimoBalance(grupoId) {
  const db = leer(SNAPSHOT_PATH, { balances: {} });
  return db.balances[grupoId] ?? 0;
}

function guardarUltimoBalance(grupoId, balance) {
  const db = leer(SNAPSHOT_PATH, { balances: {} });
  db.balances[grupoId] = balance;
  escribir(SNAPSHOT_PATH, db);
}

/**
 * Confirma el aporte de un miembro contra el balance real de la wallet del fondo.
 * Si el balance subió al menos `cuotaPeriodica` desde el último snapshot conocido,
 * marca al miembro como al día y actualiza el snapshot.
 *
 * @param {string} grupoId
 * @param {string} miembroId
 * @param {{wallet: string, network: string, token: string, obtenerBalance?: Function}} opciones
 *   `obtenerBalance` es inyectable para tests; por defecto pega contra WDK CLI real.
 */
export async function confirmarAporte(grupoId, miembroId, { wallet, network, token, obtenerBalance = obtenerBalanceWdk }) {
  const grupo = obtenerGrupo(grupoId);
  const walletUsada = wallet || grupo.walletName;

  const balanceActual = await obtenerBalance({ wallet: walletUsada, network, token });
  const ultimoBalance = leerUltimoBalance(grupoId);
  const incremento = balanceActual - ultimoBalance;

  if (incremento < grupo.cuotaPeriodica) {
    throw new ErrorValidacion(
      `No se detectó un depósito nuevo de al menos ${grupo.cuotaPeriodica} ${token ?? ''} en la wallet del fondo ` +
        `(balance actual: ${balanceActual}, último registrado: ${ultimoBalance}).`
    );
  }

  guardarUltimoBalance(grupoId, balanceActual);
  return marcarAporte(grupoId, miembroId);
}
