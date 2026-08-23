// Cliente delgado para la API del backend (api/server.js).
// En dev, Vite hace proxy de /api hacia http://localhost:3001 (ver vite.config.js).

async function pedir(path, opciones = {}, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { headers, ...opciones });
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(datos?.error || `Error ${res.status} al llamar ${path}`);
  }
  return datos;
}

export function listarGrupos() {
  return pedir('/grupos');
}

export function crearGrupo(datos) {
  return pedir('/grupos', { method: 'POST', body: JSON.stringify(datos) });
}

export function obtenerGrupo(grupoId) {
  return pedir(`/grupos/${grupoId}`);
}

export function eliminarGrupo(grupoId) {
  return pedir(`/grupos/${grupoId}`, { method: 'DELETE' });
}

export function agregarMiembro(grupoId, datos) {
  return pedir(`/grupos/${grupoId}/miembros`, { method: 'POST', body: JSON.stringify(datos) });
}

export function delegadosElegibles(grupoId) {
  return pedir(`/grupos/${grupoId}/delegados-elegibles`);
}

export function loginMiembro(grupoId, miembroId, password) {
  return pedir(`/grupos/${grupoId}/miembros/${miembroId}/login`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function obtenerDireccionFondo(grupoId) {
  return pedir(`/grupos/${grupoId}/direccion`);
}

export function confirmarAporte(grupoId, datos) {
  return pedir(`/grupos/${grupoId}/depositos/confirmar`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export function marcarAporteManual(grupoId, miembroId, referenciaTx) {
  return pedir(`/grupos/${grupoId}/depositos/marcar-manual`, {
    method: 'POST',
    body: JSON.stringify({ miembroId, referenciaTx }),
  });
}

export function listarReclamos(grupoId) {
  return pedir(`/grupos/${grupoId}/reclamos`);
}

export function crearReclamo(grupoId, datos) {
  return pedir(`/grupos/${grupoId}/reclamos`, { method: 'POST', body: JSON.stringify(datos) });
}

export function aprobarReclamo(reclamoId, delegadoId, token) {
  return pedir(
    `/reclamos/${reclamoId}/aprobar`,
    { method: 'POST', body: JSON.stringify({ delegadoId }) },
    token
  );
}

export function rechazarReclamo(reclamoId, delegadoId, token) {
  return pedir(
    `/reclamos/${reclamoId}/rechazar`,
    { method: 'POST', body: JSON.stringify({ delegadoId }) },
    token
  );
}

export function pagarReclamo(reclamoId, direccionDestino) {
  return pedir(`/reclamos/${reclamoId}/pagar`, {
    method: 'POST',
    body: JSON.stringify({ direccionDestino }),
  });
}

export function obtenerHistorial(grupoId) {
  return pedir(`/grupos/${grupoId}/historial`);
}
