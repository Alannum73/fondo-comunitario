// Parser mínimo de .env — evita agregar una dependencia como `dotenv` solo para esto
// (WDK CLI debe ser la dependencia principal del proyecto, pista del hackathon).
// Usado tanto por la CLI (index.js) como por la API del frontend (api/server.js).

import { existsSync, readFileSync } from 'node:fs';

export function cargarEnv() {
  if (!existsSync('.env')) return;
  for (const linea of readFileSync('.env', 'utf-8').split('\n')) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const separador = limpia.indexOf('=');
    if (separador === -1) continue;
    const clave = limpia.slice(0, separador).trim();
    const valor = limpia.slice(separador + 1).trim();
    if (clave && !(clave in process.env)) process.env[clave] = valor;
  }
}
