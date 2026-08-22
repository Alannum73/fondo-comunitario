// Wrapper fino sobre WDK CLI — evita repetir invocaciones de child_process en cada módulo.
// Solo cubre los comandos que la app necesita (get balance por ahora; send se agrega en tesorería).
//
// Shape real confirmado en vivo (wdk get balance --network sepolia --token usdt --json):
// {"network":"sepolia","index":0,"balance":"0","symbol":"USDT","decimals":6,"formatted":"0 USDT","usd":0,"token":"0x..."}
// `balance` viene en unidades base (según `decimals`); usamos `formatted` (ya en decimal) para
// no tener que reimplementar el escalado por decimals acá.

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
  const { stdout } = await execFileAsync(process.execPath, [WDK_BIN, ...args, '--json'], {
    windowsHide: true,
  });
  return JSON.parse(stdout);
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
