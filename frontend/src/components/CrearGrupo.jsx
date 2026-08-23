import { useState } from 'react';
import { crearGrupo } from '../api.js';

const inicial = {
  nombre: '',
  cuotaPeriodica: '',
  montoMaxSiniestro: '',
  delegados: '',
  quorumDelegados: '',
};

const PASOS = [
  { id: 'datos', etiqueta: 'Datos del grupo' },
  { id: 'delegados', etiqueta: 'Delegados y quórum' },
];

export default function CrearGrupo({ onCreado, onCancelar }) {
  const [paso, setPaso] = useState('datos');
  const [form, setForm] = useState(inicial);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function actualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const grupo = await crearGrupo({
        nombre: form.nombre,
        cuotaPeriodica: Number(form.cuotaPeriodica),
        montoMaxSiniestro: Number(form.montoMaxSiniestro),
        delegados: form.delegados.split(',').map((d) => d.trim()).filter(Boolean),
        quorumDelegados: Number(form.quorumDelegados),
      });
      onCreado(grupo);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section>
      <div className="encabezado">
        <h2>Nuevo grupo</h2>
        <button onClick={onCancelar}>← Volver</button>
      </div>

      <div className="pestanas">
        {PASOS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={paso === p.id ? 'pestana pestana-activa' : 'pestana'}
            onClick={() => setPaso(p.id)}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <form className="formulario" onSubmit={enviar}>
        {paso === 'datos' && (
          <>
            <label>
              Nombre del grupo
              <input value={form.nombre} onChange={(e) => actualizar('nombre', e.target.value)} required />
            </label>

            <label>
              Cuota periódica (USDT)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cuotaPeriodica}
                onChange={(e) => actualizar('cuotaPeriodica', e.target.value)}
                required
              />
            </label>

            <label>
              Monto máx. por siniestro (USDT)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.montoMaxSiniestro}
                onChange={(e) => actualizar('montoMaxSiniestro', e.target.value)}
                required
              />
            </label>

            <button type="button" className="boton-acento" onClick={() => setPaso('delegados')}>
              Siguiente: delegados →
            </button>
          </>
        )}

        {paso === 'delegados' && (
          <>
            <label>
              Delegados (separados por coma, mínimo 3)
              <input
                value={form.delegados}
                onChange={(e) => actualizar('delegados', e.target.value)}
                placeholder="Ana, Luis, Marco"
                required
              />
            </label>

            <label>
              Quórum de delegados
              <input
                type="number"
                min="1"
                value={form.quorumDelegados}
                onChange={(e) => actualizar('quorumDelegados', e.target.value)}
                required
              />
            </label>

            {error && <p className="error">{error}</p>}

            <button type="submit" disabled={enviando}>
              {enviando ? 'Creando...' : 'Crear grupo'}
            </button>
          </>
        )}
      </form>
    </section>
  );
}
