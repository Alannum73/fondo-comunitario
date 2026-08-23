import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { listarGrupos, obtenerGrupo } from './api.js';
import Inicio from './components/Inicio.jsx';
import ListaGrupos from './components/ListaGrupos.jsx';
import CrearGrupo from './components/CrearGrupo.jsx';
import EntrarFondo from './components/EntrarFondo.jsx';
import DetalleGrupo from './components/DetalleGrupo.jsx';
import HistorialGrupo from './components/HistorialGrupo.jsx';

export default function App() {
  const [vista, setVista] = useState('inicio'); // 'inicio' | 'lista' | 'crear' | 'entrar' | 'detalle' | 'historial'
  const [grupos, setGrupos] = useState([]);
  const [grupoActivo, setGrupoActivo] = useState(null);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [error, setError] = useState(null);

  const cargarGrupos = useCallback(() => {
    listarGrupos().then(setGrupos).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    cargarGrupos();
  }, [cargarGrupos]);

  async function seleccionarGrupo(id) {
    try {
      const grupo = await obtenerGrupo(id);
      setGrupoActivo(grupo);
      setUsuarioActual(null);
      setVista('detalle');
    } catch (err) {
      setError(err.message);
    }
  }

  function entrarComoMiembro(grupo, miembro) {
    setGrupoActivo(grupo);
    setUsuarioActual(miembro ?? null);
    setVista('detalle');
  }

  async function refrescarGrupoActivo() {
    if (!grupoActivo) return;
    const grupo = await obtenerGrupo(grupoActivo.id);
    setGrupoActivo(grupo);
    cargarGrupos();
  }

  function irAInicio() {
    setGrupoActivo(null);
    setUsuarioActual(null);
    setVista('inicio');
  }

  function grupoEliminado() {
    cargarGrupos();
    irAInicio();
  }

  if (vista === 'inicio') {
    return (
      <Inicio
        totalGrupos={grupos.length}
        onCrear={() => setVista('crear')}
        onEntrar={() => setVista('entrar')}
        onVerTodos={() => setVista('lista')}
      />
    );
  }

  return (
    <div className="fondo-pagina">
      <main className="app">
        <header>
          <button className="marca" onClick={irAInicio}>
            <span>Fondo Comunitario</span>
          </button>
          {usuarioActual && (
            <span className="chip-usuario">
              {usuarioActual.nombre}
              <button className="chip-salir" onClick={irAInicio}>Salir</button>
            </span>
          )}
        </header>

        {error && <p className="error global">{error}</p>}

        {vista === 'lista' && (
          <ListaGrupos
            grupos={grupos}
            onSeleccionar={seleccionarGrupo}
            onNuevoGrupo={() => setVista('crear')}
            onVolver={irAInicio}
          />
        )}

        {vista === 'crear' && (
          <CrearGrupo
            onCancelar={() => setVista('inicio')}
            onCreado={(grupo) => {
              cargarGrupos();
              setGrupoActivo(grupo);
              setUsuarioActual(null);
              setVista('detalle');
            }}
          />
        )}

        {vista === 'entrar' && (
          <EntrarFondo grupos={grupos} onVolver={() => setVista('inicio')} onEntrar={entrarComoMiembro} />
        )}

        {vista === 'detalle' && grupoActivo && (
          <DetalleGrupo
            grupo={grupoActivo}
            usuarioActual={usuarioActual}
            onVolver={irAInicio}
            onActualizar={refrescarGrupoActivo}
            onVerHistorial={() => setVista('historial')}
            onEliminado={grupoEliminado}
          />
        )}

        {vista === 'historial' && grupoActivo && (
          <HistorialGrupo grupoId={grupoActivo.id} onVolver={() => setVista('detalle')} />
        )}
      </main>
    </div>
  );
}
