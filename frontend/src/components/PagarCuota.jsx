import { useState } from 'react';
import { conectarWallet, asegurarRedSepolia, pagarCuotaUSDT, urlExplorerTx } from '../lib/wallet.js';

export default function PagarCuota({ direccionFondo, monto }) {
  const [cuenta, setCuenta] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [conectando, setConectando] = useState(false);
  const [pagando, setPagando] = useState(false);

  async function handleConectar() {
    setError(null);
    setConectando(true);
    try {
      const cuentaConectada = await conectarWallet();
      await asegurarRedSepolia();
      setCuenta(cuentaConectada);
    } catch (err) {
      setError(err.message || 'No se pudo conectar la wallet.');
    } finally {
      setConectando(false);
    }
  }

  async function handlePagar() {
    setError(null);
    setPagando(true);
    try {
      const hash = await pagarCuotaUSDT({ desde: cuenta, hacia: direccionFondo, monto });
      setTxHash(hash);
    } catch (err) {
      setError(err.message || 'No se pudo enviar el pago.');
    } finally {
      setPagando(false);
    }
  }

  if (!direccionFondo) return null;

  return (
    <div className="pagar-cuota">
      <h3>Pagar mi cuota</h3>
      <p className="aviso-delegados">
        Conectá tu propia wallet (MetaMask u otra compatible, en la red Sepolia) y pagá los{' '}
        {monto} USDT directo desde acá. Después de pagar, un delegado confirma tu aporte (o lo
        confirmás vos con "Confirmar aporte" más abajo).
      </p>

      {!cuenta && (
        <button type="button" onClick={handleConectar} disabled={conectando}>
          {conectando ? 'Conectando...' : 'Conectar wallet'}
        </button>
      )}

      {cuenta && !txHash && (
        <>
          <p className="vacio">Conectada: {cuenta}</p>
          <button type="button" onClick={handlePagar} disabled={pagando}>
            {pagando ? 'Confirmá en tu wallet...' : `Pagar ${monto} USDT`}
          </button>
        </>
      )}

      {txHash && (
        <p className="exito">
          Pago enviado.{' '}
          <a href={urlExplorerTx(txHash)} target="_blank" rel="noreferrer">
            Ver transacción en Etherscan
          </a>
        </p>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
