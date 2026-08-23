import { useEffect, useState } from 'react';
import { agregarMiembro, confirmarAporte, marcarAporteManual, delegadosElegibles } from '../api.js';
import ReclamosGrupo from './ReclamosGrupo.jsx';

export default function DetalleGrupo({ grupo, usuarioActual, onVolver, onActualizar, onVerHistorial }) {
  const [nombreMiembro, setNombreMiembro] = useState('');
  const [miembroDeposito, setMiembroDeposito] = useState('');
  const [elegibles, setElegibles] = useState([]);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    delegadosElegibles(grupo.id).then(setElegibles).catch(() => {});
  }, [grupo]);

  async function handleAgregarMiembro(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await agregarMiembro(grupo.id, { nombre: nombreMiembro });
      setNombreMiembro('');
      onActualizar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleConfirmarAporte(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setCargando(true);
    try {
      await confirmarAporte(grupo.id, { miembroId: miembroDeposito });
      setMensaje('Depósito confirmado. Miembro marcado al día.');
      setMiembroDeposito('');
      onActualizar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleMarcarManual() {
    if (!miembroDeposito) {
      setError('Elegí un miembro primero.');
      return;
    }
    setError(null);
    setMensaje(null);
    try {
      await marcarAporteManual(grupo.id, miembroDeposito);
      setMensaje('Aporte marcado manualmente (simulado, sin verificar contra WDK).');
      setMiembroDeposito('');
      onActualizar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="encabezado">
        <div>
          <h2>{grupo.nombre}</h2>
          {usuarioActual && <p className="bienvenida">Hola, {usuarioActual.nombre} 👋</p>}
        </div>
        <div className="grupo-botones">
          <button onClick={onVerHistorial}>Historial</button>
          <button onClick={onVolver}>← Inicio</button>
        </div>
      </div>

      <div className="datos-grupo">
        <div className="dato-pill">
          <span className="dato-etiqueta">Cuota periódica</span>
          <span className="dato-valor">{grupo.cuotaPeriodica} USDT</span>
        </div>
        <div className="dato-pill">
          <span className="dato-etiqueta">Monto máx. siniestro</span>
          <span className="dato-valor">{grupo.montoMaxSiniestro} USDT</span>
        </div>
        <div className="dato-pill">
          <span className="dato-etiqueta">Quórum</span>
          <span className="dato-valor">{grupo.quorumDelegados} de {grupo.delegados.length}</span>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {mensaje && <p className="exito">{mensaje}</p>}

      <h3>Miembros ({grupo.miembros.length})</h3>
      <ul className="lista-miembros">
        {grupo.miembros.map((m) => (
          <li key={m.id} className={usuarioActual?.id === m.id ? 'es-yo' : ''}>
            <span>{m.nombre}</span>
            {usuarioActual?.id === m.id && <span className="etiqueta etiqueta-yo">tú</span>}
            {m.esDelegado && <span className="etiqueta">delegado</span>}
            <span className={m.alDia ? 'etiqueta al-dia' : 'etiqueta pendiente'}>
              {m.alDia ? 'al día' : 'pendiente'}
            </span>
          </li>
        ))}
      </ul>

      <form className="formulario-en-linea" onSubmit={handleAgregarMiembro}>
        <input
          placeholder="Nombre del nuevo miembro"
          value={nombreMiembro}
          onChange={(e) => setNombreMiembro(e.target.value)}
          required
        />
        <button type="submit">Agregar miembro</button>
      </form>

      <h3>Confirmar depósito de cuota</h3>
      <form className="formulario-en-linea" onSubmit={handleConfirmarAporte}>
        <select value={miembroDeposito} onChange={(e) => setMiembroDeposito(e.target.value)} required>
          <option value="" disabled>Elegir miembro...</option>
          {grupo.miembros.filter((m) => !m.alDia).map((m) => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>
        <button type="submit" disabled={cargando}>
          {cargando ? 'Verificando en WDK...' : 'Confirmar aporte'}
        </button>
      </form>
      <button className="enlace-manual" type="button" onClick={handleMarcarManual}>
        ⚠️ Marcar manual (sin WDK, solo pruebas)
      </button>

      <h3>Delegados elegibles para votar ({elegibles.length})</h3>
      <ul className="lista-miembros">
        {elegibles.map((m) => <li key={m.id}>{m.nombre}</li>)}
        {elegibles.length === 0 && <li className="vacio">Ninguno todavía (deben ser delegados y estar al día).</li>}
      </ul>

      <ReclamosGrupo grupo={grupo} elegibles={elegibles} />
    </section>
  );
}
