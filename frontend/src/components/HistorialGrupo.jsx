import { useEffect, useState } from 'react';
import { obtenerHistorial } from '../api.js';

const TITULO_EVENTO = {
  aporte: 'Aporte confirmado',
  reclamo_creado: 'Siniestro reportado',
  reclamo_pagado: 'Reclamo pagado',
};

export default function HistorialGrupo({ grupoId, onVolver }) {
  const [historial, setHistorial] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    obtenerHistorial(grupoId).then(setHistorial).catch((err) => setError(err.message));
  }, [grupoId]);

  if (error) {
    return (
      <section>
        <div className="encabezado">
          <h2>Historial</h2>
          <button onClick={onVolver}>← Volver</button>
        </div>
        <p className="error">{error}</p>
      </section>
    );
  }

  if (!historial) return null;

  const { grupo, resumen, eventos } = historial;

  return (
    <section>
      <div className="encabezado">
        <h2>Historial — {grupo.nombre}</h2>
        <button onClick={onVolver}>← Volver</button>
      </div>

      <div className="datos-grupo">
        <div className="dato-pill">
          <span className="dato-etiqueta">Miembros al día</span>
          <span className="dato-valor">{resumen.miembrosAlDia} / {resumen.totalMiembros}</span>
        </div>
        <div className="dato-pill">
          <span className="dato-etiqueta">Reclamos pendientes</span>
          <span className="dato-valor">{resumen.reclamosPendientes}</span>
        </div>
        <div className="dato-pill">
          <span className="dato-etiqueta">Total pagado</span>
          <span className="dato-valor">{resumen.totalPagado} USDT</span>
        </div>
      </div>

      <h3>Línea de tiempo ({eventos.length})</h3>
      <ul className="lista-miembros">
        {eventos.map((ev, i) => (
          <li key={i}>
            <span>{TITULO_EVENTO[ev.tipo] ?? ev.tipo}</span>
            <span className="vacio">{ev.miembroNombre ?? ''}</span>
            {ev.monto != null && <span className="etiqueta">{ev.monto} USDT</span>}
            {ev.referenciaTx && <code className="referencia-tx">{ev.referenciaTx}</code>}
            <span className="vacio">{new Date(ev.fecha).toLocaleString()}</span>
          </li>
        ))}
        {eventos.length === 0 && <li className="vacio">Todavía no hay eventos.</li>}
      </ul>

      <button className="volver-al-final" onClick={onVolver}>← Volver</button>
    </section>
  );
}
