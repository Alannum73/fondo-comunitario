// Conexión a la wallet del navegador (MetaMask u otra compatible con EIP-1193) para que
// un miembro pague su cuota directo, sin depender de una librería web3 aparte (wagmi/ethers).
// Esto es intencionalmente independiente de WDK CLI: WDK solo maneja la wallet del FONDO
// (server-side, con seed phrase propia) — la wallet del miembro es la suya, en su navegador.

// USDT en Sepolia (mismo contrato que usa el resto del proyecto, ver README "Red y token de
// la demo"). decimals=6 confirmado en vivo contra WDK CLI (wdk get balance --json).
const USDT_SEPOLIA = '0xd077A400968890Eacc75cdc901F0356c943e4fDb';
const USDT_DECIMALS = 6;
const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7'; // 11155111

const ERC20_TRANSFER_SELECTOR = '0xa9059cbb'; // primeros 4 bytes de keccak256("transfer(address,uint256)")

function tieneWalletInyectada() {
  return typeof window !== 'undefined' && window.ethereum;
}

function encodeTransferData(direccionDestino, montoDecimal) {
  const direccionHex = direccionDestino.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const unidades = BigInt(Math.round(montoDecimal * 10 ** USDT_DECIMALS));
  const montoHex = unidades.toString(16).padStart(64, '0');
  return ERC20_TRANSFER_SELECTOR + direccionHex + montoHex;
}

export async function conectarWallet() {
  if (!tieneWalletInyectada()) {
    throw new Error('No se detectó una wallet de navegador instalada (ej. MetaMask).');
  }
  const cuentas = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!cuentas?.[0]) {
    throw new Error('No se pudo obtener una cuenta de la wallet.');
  }
  return cuentas[0];
}

export async function asegurarRedSepolia() {
  if (!tieneWalletInyectada()) return;
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (chainId === SEPOLIA_CHAIN_ID_HEX) return;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (err) {
    if (err?.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: 'Sepolia',
            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

/**
 * Envía una transferencia de USDT (Sepolia) desde la wallet conectada del miembro hacia
 * la wallet del fondo. Devuelve el hash de la transacción apenas se firma y transmite
 * (no espera confirmación en bloque).
 */
export async function pagarCuotaUSDT({ desde, hacia, monto }) {
  const data = encodeTransferData(hacia, monto);
  return window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{ from: desde, to: USDT_SEPOLIA, data }],
  });
}

export function urlExplorerTx(hash) {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}
