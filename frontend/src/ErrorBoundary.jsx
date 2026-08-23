import { Component } from 'react';

// Sin esto, cualquier error de render (ej. conflicto entre extensiones de wallet del
// navegador manipulando el DOM) tira toda la app a una pantalla en blanco sin ninguna
// pista de qué pasó. Con esto al menos se ve un mensaje y la opción de recargar.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error de render capturado por ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fondo-pagina">
          <div className="app error-boundary">
            <h2>Algo salió mal</h2>
            <p>
              La app tuvo un error inesperado. Si tenés varias extensiones de wallet
              instaladas (MetaMask, Bybit, etc.), probá desactivar todas menos una — suelen
              chocar entre sí y romper la página.
            </p>
            <p className="vacio">{this.state.error.message}</p>
            <button onClick={() => window.location.reload()}>Recargar</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
