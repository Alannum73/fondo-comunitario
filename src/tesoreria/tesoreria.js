// Proceso de tesorería — paso 6 del roadmap.
// Toma un reclamo con quórum de aprobación alcanzado, valida que la wallet del fondo
// tenga balance suficiente y ejecuta el pago real vía WDK CLI. No dejamos que un
// reclamo aprobado falle silenciosamente por fondos insuficientes: se valida el
// balance ANTES de intentar `wdk send` (decisión ya tomada, ver README/CLAUDE.md).

import { obtenerReclamo, marcarReclamoPagado, ErrorValidacion } from '../reclamos/reclamo.js';
import { obtenerBalance as obtenerBalanceWdk, enviarPago as enviarPagoWdk } from '../shared/wdk.js';

/**
 * Ejecuta el pago de un reclamo aprobado hacia `direccionDestino`.
 *
 * @param {string} reclamoId
 * @param {string} direccionDestino
 * @param {{wallet: string, network: string, token: string, obtenerBalance?: Function, enviarPago?: Function}} opciones
 *   `obtenerBalance`/`enviarPago` son inyectables para tests; por defecto pegan contra WDK CLI real.
 */
export async function pagarReclamo(
  reclamoId,
  direccionDestino,
  { wallet, network, token, obtenerBalance = obtenerBalanceWdk, enviarPago = enviarPagoWdk }
) {
  const reclamo = obtenerReclamo(reclamoId);

  if (reclamo.estado !== 'aprobado') {
    throw new ErrorValidacion(
      `El reclamo debe estar "aprobado" para pagarlo (estado actual: "${reclamo.estado}").`
    );
  }
  if (!direccionDestino || typeof direccionDestino !== 'string' || !direccionDestino.trim()) {
    throw new ErrorValidacion('Falta la dirección de destino del pago.');
  }

  const balanceActual = await obtenerBalance({ wallet, network, token });
  if (balanceActual < reclamo.montoSolicitado) {
    throw new ErrorValidacion(
      `Balance insuficiente en la wallet del fondo para pagar este reclamo ` +
        `(disponible: ${balanceActual}, requerido: ${reclamo.montoSolicitado}).`
    );
  }

  const recibo = await enviarPago({
    wallet,
    network,
    token,
    to: direccionDestino.trim(),
    amount: reclamo.montoSolicitado,
  });

  return marcarReclamoPagado(reclamoId, recibo);
}
