export default function ListaGrupos({ grupos, onSeleccionar, onNuevoGrupo, onVolver }) {
  return (
    <section>
      <div className="encabezado">
        <h2>Todos los fondos</h2>
        <div className="grupo-botones">
          <button onClick={onVolver}>← Inicio</button>
          <button className="boton-acento" onClick={onNuevoGrupo}>+ Nuevo fondo</button>
        </div>
      </div>

      {grupos.length === 0 && <p className="vacio">Todavía no hay fondos creados.</p>}

      <ul className="lista-grupos">
        {grupos.map((grupo) => (
          <li key={grupo.id}>
            <button className="tarjeta-grupo" onClick={() => onSeleccionar(grupo.id)}>
              <strong>{grupo.nombre}</strong>
              <span>Cuota: {grupo.cuotaPeriodica} USDT · Miembros: {grupo.miembros.length}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
