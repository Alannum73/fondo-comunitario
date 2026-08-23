import { useEffect, useState } from 'react';
import {
  agregarMiembro,
  confirmarAporte,
  marcarAporteManual,
  delegadosElegibles,
  obtenerDireccionFondo,
  obtenerHistorial,
  eliminarGrupo,
} from '../api.js';
import ReclamosGrupo from './ReclamosGrupo.jsx';
import PagarCuota from './PagarCuota.jsx';

const PESTANAS = [
  { id: 'miembros', etiqueta: 'Miembros' },
  { id: 'cuotas', etiqueta: 'Cuotas' },
  { id: 'siniestros', etiqueta: 'Siniestros' },
];

export default function DetalleGrupo({
  grupo,
  usuarioActual,
  usuarioToken,
  onVolver,
  onActualizar,
  onVerHistorial,
  onEliminado,
}) {
  const [pestana, setPestana] = useState('miembros');
  const [nombreMiembro, setNombreMiembro] = useState('');
  const [passwordMiembro, setPasswordMiembro] = useState('');
  const [miembroDeposito, setMiembroDeposito] = useState('');
  const [referenciaTx, setReferenciaTx] = useState('');
  const [elegibles, setElegibles] = useState([]);
  const [direccionFondo, setDireccionFondo] = useState(null);
  const [errorDireccion, setErrorDireccion] = useState(null);
  const [totalRetirado, setTotalRetirado] = useState(0);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
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

  useEffect(() => {
    obtenerHistorial(grupo.id)
      .then((h) => setTotalRetirado(h.resumen.totalPagado))
      .catch(() => {});
  }, [grupo]);

  const delegadosPendientes = grupo.delegados.filter(
    (d) => !grupo.miembros.some((m) => m.nombre.toLowerCase() === d.toLowerCase())
  );

  const miembrosAlDia = grupo.miembros.filter((m) => m.alDia).length;
  const totalEsperado = grupo.cuotaPeriodica * grupo.miembros.length;
  const totalRecaudado = grupo.cuotaPeriodica * miembrosAlDia;

  async function handleAgregarMiembro(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await agregarMiembro(grupo.id, { nombre: nombreMiembro, password: passwordMiembro });
      setNombreMiembro('');
      setPasswordMiembro('');
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
      await confirmarAporte(grupo.id, { miembroId: miembroDeposito, referenciaTx: referenciaTx || undefined });
      setMensaje('Depósito confirmado. Miembro marcado al día.');
      setMiembroDeposito('');
      setReferenciaTx('');
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
      await marcarAporteManual(grupo.id, miembroDeposito, referenciaTx || undefined);
      setMensaje('Aporte marcado manualmente (simulado, sin verificar contra WDK).');
      setMiembroDeposito('');
      setReferenciaTx('');
      onActualizar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEliminarGrupo() {
    setEliminando(true);
    setError(null);
    try {
      await eliminarGrupo(grupo.id);
      onEliminado();
    } catch (err) {
      setError(err.message);
      setEliminando(false);
      setConfirmandoEliminar(false);
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
                {m.referenciaTx && <code className="referencia-tx" title="Referencia de la transacción">{m.referenciaTx}</code>}
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
            <input
              type="password"
              placeholder="Contraseña (mín. 4 caracteres)"
              value={passwordMiembro}
              onChange={(e) => setPasswordMiembro(e.target.value)}
              minLength={4}
              required
            />
            <button type="submit">Agregar miembro</button>
          </form>
          <p className="vacio">
            La contraseña la elige y recuerda el miembro — la necesita para entrar como sí
            mismo después ("Entrar a un fondo") y para votar reclamos si es delegado.
          </p>

          {delegadosPendientes.length > 0 && (
            <p className="aviso-delegados">
              Delegados designados que todavía no se unieron — escribí el nombre exacto para que
              queden marcados como delegado: <strong>{delegadosPendientes.join(', ')}</strong>.
            </p>
          )}
        </>
      )}

      {pestana === 'cuotas' && (
        <>
          <PagarCuota direccionFondo={direccionFondo} monto={grupo.cuotaPeriodica} />

          <h3>Pagos</h3>
          <div className="datos-grupo">
            <div className="dato-pill">
              <span className="dato-etiqueta">Total esperado</span>
              <span className="dato-valor">{totalEsperado} USDT</span>
            </div>
            <div className="dato-pill">
              <span className="dato-etiqueta">Recaudado hasta ahora</span>
              <span className="dato-valor">{totalRecaudado} USDT</span>
            </div>
            <div className="dato-pill">
              <span className="dato-etiqueta">Retirado (siniestros pagados)</span>
              <span className="dato-valor">{totalRetirado} USDT</span>
            </div>
          </div>

          <ul className="lista-miembros">
            {grupo.miembros.map((m) => (
              <li key={m.id}>
                <span>{m.nombre}</span>
                <span className={m.alDia ? 'etiqueta al-dia' : 'etiqueta pendiente'}>
                  {m.alDia ? `pagó ${grupo.cuotaPeriodica} USDT` : 'falta'}
                </span>
                {m.alDia && m.fechaUltimoAporte && (
                  <span className="vacio">{new Date(m.fechaUltimoAporte).toLocaleDateString()}</span>
                )}
              </li>
            ))}
            {grupo.miembros.length === 0 && <li className="vacio">Todavía no hay miembros.</li>}
          </ul>

          <h3>Confirmar depósito de cuota</h3>
          <p className="aviso-delegados">
            Esto no es un pago: el miembro primero transfiere {grupo.cuotaPeriodica} USDT a la
            wallet del fondo por fuera de la app (dirección arriba de todo). Acá solo se confirma
            que esa plata ya llegó (se verifica el saldo real vía WDK).
          </p>

          <form className="formulario-en-linea" onSubmit={handleConfirmarAporte}>
            <select value={miembroDeposito} onChange={(e) => setMiembroDeposito(e.target.value)} required>
              <option value="" disabled>Elegir miembro...</option>
              {grupo.miembros.filter((m) => !m.alDia).map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
            <input
              placeholder="Hash de la transacción (opcional)"
              value={referenciaTx}
              onChange={(e) => setReferenciaTx(e.target.value)}
            />
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

          <ReclamosGrupo
            grupo={grupo}
            elegibles={elegibles}
            usuarioActual={usuarioActual}
            usuarioToken={usuarioToken}
          />
        </>
      )}

      <div className="pie-detalle">
        <button className="volver-al-final" onClick={onVolver}>← Volver al inicio</button>

        {!confirmandoEliminar ? (
          <button className="enlace-peligro" type="button" onClick={() => setConfirmandoEliminar(true)}>
            Eliminar grupo
          </button>
        ) : (
          <span className="confirmar-eliminar">
            ¿Seguro? No se puede deshacer.
            <button type="button" onClick={() => setConfirmandoEliminar(false)}>Cancelar</button>
            <button className="boton-peligro" type="button" onClick={handleEliminarGrupo} disabled={eliminando}>
              {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          </span>
        )}
      </div>
    </section>
  );
}
