// Persistencia simple en JSON — suficiente para el alcance del hackathon.
// No maneja escrituras concurrentes de múltiples procesos; para el MVP no hace falta.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function leer(path, valorPorDefecto) {
  if (!existsSync(path)) return structuredClone(valorPorDefecto);
  const contenido = readFileSync(path, 'utf-8').trim();
  if (!contenido) return structuredClone(valorPorDefecto);
  return JSON.parse(contenido);
}

export function escribir(path, datos) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(datos, null, 2) + '\n', 'utf-8');
}
