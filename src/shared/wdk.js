// Wrapper fino sobre WDK CLI — evita repetir invocaciones de child_process en cada módulo.
// Cubre get balance y send (usado por tesorería).
//
// Shape real confirmado en vivo (wdk get balance --network sepolia --token usdt --json):
// {"network":"sepolia","index":0,"balance":"0","symbol":"USDT","decimals":6,"formatted":"0 USDT","usd":0,"token":"0x..."}
// `balance` viene en unidades base (según `decimals`); usamos `formatted` (ya en decimal) para
// no tener que reimplementar el escalado por decimals acá.
//
// Shape real confirmado en vivo (wdk send --network sepolia --to 0x...dEaD --amount 1 --token usdt --json),
// pago real ejecutado en Sepolia el 2026-08-23:
// {"network":"sepolia","txHash":"0x80b98c9c...","from":"0x24c7...69Ff","to":"0x000...dEaD",
//  "amount":"1000000","amountFormatted":"1 USDT","fee":"91440598902840","feeFormatted":"0.00009144 ETH"}
// `enviarPago()` devuelve este JSON crudo tal cual lo entrega la CLI como "recibo" — no le
// extraemos campos individuales, así que tampoco hay nada que romper con este shape.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const execFileAsync = promisify(execFile);

// Invocamos el entry point real (bin/wdk.mjs) con `node` directo en vez de pasar por el
// shim `npx`/`wdk.cmd` — en Windows, execFile no puede spawnear un .cmd sin `shell: true`
// (EINVAL), y evitamos depender de una shell para construir el comando.
const WDK_BIN = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'node_modules',
  '@tetherto',
  'wdk-cli',
  'bin',
  'wdk.mjs'
);

async function ejecutarWdk(args) {
  try {
    const { stdout } = await execFileAsync(process.execPath, [WDK_BIN, ...args, '--json'], {
      windowsHide: true,
    });
    return JSON.parse(stdout);
  } catch (error) {
    // Cuando WDK CLI falla (ej. wallet bloqueada), sale con código de error pero igual
    // imprime un JSON con detalle en stdout (`{"error", "code", "suggestion"}`) — sin este
    // catch, ese detalle se perdía y solo se veía "Command failed: <comando>".
    const salida = error.stdout ? intentarParsear(error.stdout) : null;
    if (salida?.error) {
      throw new Error(`WDK CLI: ${salida.error}${salida.suggestion ? ` (${salida.suggestion})` : ''}`);
    }
    throw error;
  }
}

function intentarParsear(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function extraerBalance(resultado) {
  if (typeof resultado.formatted !== 'string') {
    throw new Error(
      `No se pudo extraer el balance de la respuesta de WDK CLI: ${JSON.stringify(resultado)}`
    );
  }
  // "5 USDT" -> 5 ; "0 USDT" -> 0
  const numero = Number.parseFloat(resultado.formatted);
  if (Number.isNaN(numero)) {
    throw new Error(`Balance formateado inesperado de WDK CLI: "${resultado.formatted}"`);
  }
  return numero;
}

/**
 * Balance de una wallet para un token en una red, en unidades decimales (ej. USDT, no wei).
 */
export async function obtenerBalance({ wallet, network, token }) {
  const args = ['get', 'balance', '--network', network, '--wallet', wallet];
  if (token) args.push('--token', token);
  const resultado = await ejecutarWdk(args);
  return extraerBalance(resultado);
}

/**
 * Envía un pago on-chain vía `wdk send`. Devuelve el JSON crudo de la CLI (el "recibo").
 */
export async function enviarPago({ wallet, network, token, to, amount }) {
  const args = ['send', '--network', network, '--to', to, '--amount', String(amount), '--wallet', wallet];
  if (token) args.push('--token', token);
  return ejecutarWdk(args);
}
