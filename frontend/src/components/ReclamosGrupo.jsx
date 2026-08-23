import { useEffect, useState } from 'react';
import {
  listarReclamos,
  crearReclamo,
  aprobarReclamo,
  rechazarReclamo,
  pagarReclamo,
} from '../api.js';

const ETIQUETA_ESTADO = {
  pendiente: { texto: 'pendiente', clase: 'pendiente' },
  aprobado: { texto: 'aprobado', clase: 'al-dia' },
  rechazado: { texto: 'rechazado', clase: 'rechazado' },
  pagado: { texto: 'pagado', clase: 'al-dia' },
};

const FORM_INICIAL = { miembroId: '', montoSolicitado: '', descripcion: '', fotoPath: '' };

export default function ReclamosGrupo({ grupo, elegibles }) {
  const [reclamos, setReclamos] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [delegadoVotante, setDelegadoVotante] = useState('');
  const [direcciones, setDirecciones] = useState({});
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(false);

  function cargarReclamos() {
    listarReclamos(grupo.id).then(setReclamos).catch((err) => setError(err.message));
  }

  useEffect(() => {
    cargarReclamos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupo.id]);

  async function handleReportar(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await crearReclamo(grupo.id, {
        miembroId: form.miembroId,
        montoSolicitado: Number(form.montoSolicitado),
        descripcion: form.descripcion,
        fotoPath: form.fotoPath,
      });
      setForm(FORM_INICIAL);
      setMensaje('Siniestro reportado. Queda pendiente de aprobación.');
      cargarReclamos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleVotar(reclamoId, aprobar) {
    if (!delegadoVotante) {
      setError('Elegí qué delegado está votando.');
      return;
    }
    setError(null);
    setMensaje(null);
    try {
      await (aprobar ? aprobarReclamo : rechazarReclamo)(reclamoId, delegadoVotante);
      cargarReclamos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePagar(reclamoId) {
    const direccionDestino = direcciones[reclamoId];
    if (!direccionDestino) {
      setError('Falta la dirección de destino del pago.');
      return;
    }
    setError(null);
    setMensaje(null);
    setCargando(true);
    try {
      await pagarReclamo(reclamoId, direccionDestino);
      setMensaje('Pago ejecutado vía WDK. Reclamo marcado como pagado.');
      cargarReclamos();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <h3>Reportar un siniestro</h3>
      <form className="formulario" onSubmit={handleReportar}>
        <label>
          Miembro afectado
          <select
            value={form.miembroId}
            onChange={(e) => setForm((f) => ({ ...f, miembroId: e.target.value }))}
            required
          >
            <option value="" disabled>Elegir miembro...</option>
            {grupo.miembros.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Monto solicitado (USDT, máx. {grupo.montoMaxSiniestro})
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.montoSolicitado}
            onChange={(e) => setForm((f) => ({ ...f, montoSolicitado: e.target.value }))}
            required
          />
        </label>
        <label>
          Descripción
          <input
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            placeholder="Qué pasó"
            required
          />
        </label>
        <label>
          Foto de evidencia (ruta o URL)
          <input
            value={form.fotoPath}
            onChange={(e) => setForm((f) => ({ ...f, fotoPath: e.target.value }))}
            placeholder="/fotos/recibo.jpg"
            required
          />
        </label>
        <button type="submit">Reportar siniestro</button>
      </form>

      {error && <p className="error">{error}</p>}
      {mensaje && <p className="exito">{mensaje}</p>}

      <h3>Reclamos ({reclamos.length})</h3>

      {elegibles.length > 0 && (
        <label className="selector-votante">
          Votando como
          <select value={delegadoVotante} onChange={(e) => setDelegadoVotante(e.target.value)}>
            <option value="">Elegir delegado...</option>
            {elegibles.map((d) => (
              <option key={d.id} value={d.id}>{d.nombre}</option>
            ))}
          </select>
        </label>
      )}

      <ul className="lista-reclamos">
        {reclamos.map((r) => {
          const estado = ETIQUETA_ESTADO[r.estado] ?? { texto: r.estado, clase: '' };
          const miembro = grupo.miembros.find((m) => m.id === r.miembroId);
          return (
            <li key={r.id} className="tarjeta-reclamo">
              <div className="reclamo-linea">
                <strong>{miembro?.nombre ?? 'Miembro'}</strong>
                <span className={`etiqueta ${estado.clase}`}>{estado.texto}</span>
              </div>
              <p className="reclamo-desc">{r.descripcion}</p>
              <span className="reclamo-monto">{r.montoSolicitado} USDT</span>

              {r.estado === 'pendiente' && (
                <div className="reclamo-acciones">
                  <span className="vacio">
                    {r.aprobaciones.length} aprob. / {r.rechazos.length} rechazos (quórum {grupo.quorumDelegados})
                  </span>
                  <div className="grupo-botones">
                    <button onClick={() => handleVotar(r.id, true)}>Aprobar</button>
                    <button onClick={() => handleVotar(r.id, false)}>Rechazar</button>
                  </div>
                </div>
              )}

              {r.estado === 'aprobado' && (
                <div className="formulario-en-linea">
                  <input
                    placeholder="Dirección de destino del pago"
                    value={direcciones[r.id] ?? ''}
                    onChange={(e) => setDirecciones((d) => ({ ...d, [r.id]: e.target.value }))}
                  />
                  <button onClick={() => handlePagar(r.id)} disabled={cargando}>
                    {cargando ? 'Pagando...' : 'Pagar con WDK'}
                  </button>
                </div>
              )}

              {r.estado === 'pagado' && (
                <span className="vacio">Pagado el {new Date(r.fechaPago).toLocaleDateString()}</span>
              )}
            </li>
          );
        })}
        {reclamos.length === 0 && <li className="vacio">Todavía no hay siniestros reportados.</li>}
      </ul>
    </>
  );
}
