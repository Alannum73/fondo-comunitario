export default function Inicio({ onCrear, onEntrar, onVerTodos, totalGrupos }) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="marca marca--landing">
          <span>Fondo Comunitario</span>
        </span>
        <span className="landing-nav-nota">USDT · Sepolia testnet</span>
      </nav>

      <div className="landing-hero">
        <div className="hero-mitad hero-mitad--miembro">
          <span className="hero-pill">Para miembros</span>
          <h1>
            Sumate a tu <span className="acento-dorado">fondo</span>
          </h1>
          <p>
            Elegí tu grupo y tu nombre para ver tu estado, confirmar tu cuota o revisar un siniestro.
          </p>
          <button className="hero-boton hero-boton--dorado" onClick={onEntrar}>
            Entrar a un fondo
          </button>
        </div>

        <div className="hero-mitad hero-mitad--fundador">
          <span className="hero-pill">Para fundadores</span>
          <h1>
            Armá un fondo <span className="acento-menta">nuevo</span>
          </h1>
          <p>
            Definí la cuota, los delegados y el quórum. Tu comunidad decide en minutos, no en semanas.
          </p>
          <button className="hero-boton hero-boton--menta" onClick={onCrear}>
            Crear un fondo
          </button>
        </div>
      </div>

      <div className="landing-contenido">
        <div className="franja-caracteristicas">
          <div className="caracteristica">
            <span className="check">✓</span>
            <div>
              <strong>Sin papeleo</strong>
              <span>Creás el grupo y sumás miembros en minutos.</span>
            </div>
          </div>
          <div className="caracteristica">
            <span className="check">✓</span>
            <div>
              <strong>Decisión por quórum</strong>
              <span>Ningún pago sale sin el acuerdo de los delegados.</span>
            </div>
          </div>
          <div className="caracteristica">
            <span className="check">✓</span>
            <div>
              <strong>Cuota que vos definís</strong>
              <span>Monto periódico y tope por siniestro, a medida del grupo.</span>
            </div>
          </div>
        </div>

        {totalGrupos > 0 && (
          <button className="enlace-secundario" onClick={onVerTodos}>
            Ver los {totalGrupos} fondo{totalGrupos === 1 ? '' : 's'} registrado{totalGrupos === 1 ? '' : 's'}
          </button>
        )}
      </div>
    </div>
  );
}
