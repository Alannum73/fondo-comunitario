import { useEffect, useState } from 'react';
import { obtenerGrupo } from '../api.js';

export default function EntrarFondo({ grupos, onVolver, onEntrar }) {
  const [grupoId, setGrupoId] = useState('');
  const [grupo, setGrupo] = useState(null);
  const [miembroId, setMiembroId] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setMiembroId('');
    setGrupo(null);
    if (!grupoId) return;
    obtenerGrupo(grupoId).then(setGrupo).catch((err) => setError(err.message));
  }, [grupoId]);

  function entrar(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const miembro = grupo.miembros.find((m) => m.id === miembroId);
    onEntrar(grupo, miembro);
  }

  return (
    <section>
      <div className="encabezado">
        <h2>Entrar a un fondo</h2>
        <button onClick={onVolver}>← Volver</button>
      </div>

      {grupos.length === 0 && <p className="vacio">Todavía no hay fondos creados. Creá uno primero.</p>}

      <form className="formulario" onSubmit={entrar}>
        <label>
          Tu fondo
          <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} required>
            <option value="" disabled>Elegir fondo...</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
        </label>

        {grupo && (
          <label>
            Tu nombre
            <select value={miembroId} onChange={(e) => setMiembroId(e.target.value)} required>
              <option value="" disabled>Elegir tu nombre...</option>
              {grupo.miembros.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}{m.esDelegado ? ' (delegado)' : ''}</option>
              ))}
            </select>
          </label>
        )}

        {grupo && grupo.miembros.length === 0 && (
          <p className="vacio">Este fondo todavía no tiene miembros registrados.</p>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={!miembroId || cargando}>
          Entrar
        </button>
      </form>
    </section>
  );
}
