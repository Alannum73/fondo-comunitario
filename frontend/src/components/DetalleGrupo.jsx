import { useEffect, useState } from 'react';
import { agregarMiembro, confirmarAporte, marcarAporteManual, delegadosElegibles, obtenerDireccionFondo } from '../api.js';
import ReclamosGrupo from './ReclamosGrupo.jsx';

const PESTANAS = [
  { id: 'miembros', etiqueta: 'Miembros' },
  { id: 'cuotas', etiqueta: 'Cuotas' },
  { id: 'siniestros', etiqueta: 'Siniestros' },
];

export default function DetalleGrupo({ grupo, usuarioActual, onVolver, onActualizar, onVerHistorial }) {
  const [pestana, setPestana] = useState('miembros');
  const [nombreMiembro, setNombreMiembro] = useState('');
  const [miembroDeposito, setMiembroDeposito] = useState('');
  const [elegibles, setElegibles] = useState([]);
  const [direccionFondo, setDireccionFondo] = useState(null);
  const [errorDireccion, setErrorDireccion] = useState(null);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    delegadosElegibles(grupo.id).then(setElegibles).catch(() => {});
    setDireccionFondo(null);
    setErrorDireccion(null);
    obtenerDireccionFondo(grupo.id)
      .then((r) => setDireccionFondo(r.direccion))
      .catch((err) => setErrorDireccion(err.message));
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

  function cambiarPestana(id) {
    setPestana(id);
    setError(null);
    setMensaje(null);
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
          <span className="dato-etiqueta">Wallet</span>
          <span className="dato-valor">{grupo.walletName}</span>
        </div>
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

      <div className="aviso-delegados">
        <strong>Dirección para depositar la cuota:</strong>{' '}
        {direccionFondo && (
          <>
            <code>{direccionFondo}</code>{' '}
            <button
              type="button"
              className="enlace-manual"
              onClick={() => {
                navigator.clipboard.writeText(direccionFondo);
                setMensaje('Dirección copiada.');
              }}
            >
              Copiar
            </button>
          </>
        )}
        {!direccionFondo && !errorDireccion && 'Consultando...'}
        {errorDireccion && (
          <span className="error"> No se pudo consultar ({errorDireccion}). ¿La wallet está desbloqueada?</span>
        )}
      </div>

      <div className="pestanas">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            className={pestana === p.id ? 'pestana pestana-activa' : 'pestana'}
            onClick={() => cambiarPestana(p.id)}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {mensaje && <p className="exito">{mensaje}</p>}

      {pestana === 'miembros' && (
        <>
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
        </>
      )}

      {pestana === 'cuotas' && (
        <>
          <h3>Confirmar depósito de cuota</h3>
          <p className="aviso-delegados">
            Esto no es un pago: el miembro primero transfiere {grupo.cuotaPeriodica} USDT a la
            wallet del fondo por fuera de la app. Acá solo se confirma que esa plata ya llegó (se
            verifica el saldo real vía WDK).
          </p>
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
        </>
      )}

      {pestana === 'siniestros' && (
        <>
          <h3>Delegados elegibles para votar ({elegibles.length})</h3>
          <ul className="lista-miembros">
            {elegibles.map((m) => <li key={m.id}>{m.nombre}</li>)}
            {elegibles.length === 0 && (
              <li className="vacio">
                Ninguno todavía. Deben unirse como miembro con el mismo nombre que un delegado
                designado ({grupo.delegados.join(', ')}) y estar al día con su cuota.
              </li>
            )}
          </ul>

          <ReclamosGrupo grupo={grupo} elegibles={elegibles} />
        </>
      )}

      <button className="volver-al-final" onClick={onVolver}>← Volver al inicio</button>
    </section>
  );
}
