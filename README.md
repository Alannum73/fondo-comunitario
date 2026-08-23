# Fondo Comunitario

Fondo mutual en USDT para un gremio o grupo pequeño, construido para el Aleph Hackathon (Cochabamba, 22-23 agosto 2026). Los miembros aportan una cuota periódica; cuando alguien sufre un siniestro, un grupo de delegados designados revisa el caso dentro de la app y aprueba o rechaza el pago. Los pagos aprobados se ejecutan automáticamente vía **WDK CLI** de Tether, con un recibo `--json` por cada transacción.

> Esto NO es un seguro regulado con reserva actuarial. Es un fondo mutual comunitario asistido por software.

**Pista objetivo:** WDK (Tether) — track 1, "Mejor proyecto creado con WDK CLI".

## Estado del proyecto

- [x] Wallet del fondo (WDK CLI) — crear/desbloquear (verificado en vivo en Sepolia)
- [x] Lógica de grupo (cuota, monto máx, delegados, quórum)
- [x] Depósitos de miembros — confirmación vía `wdk get balance` real
- [x] Reporte de siniestro (foto + monto + descripción)
- [x] Panel de aprobación de delegados
- [x] Proceso de tesorería (`wdk send` + recibo `--json`)
- [x] Historial completo
- [x] UI mínima end-to-end (CLI interactiva, `npm start`)
- [ ] Diferenciador: motor de reglas de gasto (tope agregado + reserva mínima)
- [ ] Diferenciador: agente de tesorería vía `wdk-mcp`

Los 8 módulos base están implementados, cubiertos por tests (`npm test`), y el flujo de depósito + pago se verificó en vivo contra WDK CLI real en Sepolia (ver "Qué es real vs. qué es simulado" abajo).

## Qué módulos de WDK se usan

- `@tetherto/wdk-cli` — versión `1.0.0-beta.3`
- Comandos de la CLI usados por la app: `wdk get balance` (depósitos y validación de fondos antes de pagar) y `wdk send` (pago de reclamos aprobados). `wdk wallet create`/`wdk wallet unlock`/`wdk get address` se usan al configurar la wallet del fondo (paso manual, ver Setup).

## Integración de WDK (permalinks)

`@tetherto/wdk-cli` es la dependencia principal del proyecto — no es un wrapper decorativo, es lo que ejecuta cada consulta de balance y cada pago real.

- [`src/shared/wdk.js#L36-L41`](https://github.com/Alannum73/fondo-comunitario/blob/aaed9a75676ed3a8a774e69ff1206e0a6cc3630b/src/shared/wdk.js#L36-L41) — invocación real del binario de WDK CLI (`node bin/wdk.mjs ... --json`), base de todo lo demás.
- [`src/shared/wdk.js#L60-L65`](https://github.com/Alannum73/fondo-comunitario/blob/aaed9a75676ed3a8a774e69ff1206e0a6cc3630b/src/shared/wdk.js#L60-L65) — `obtenerBalance()`, ejecuta `wdk get balance --network <red> --token <token> --wallet <wallet> --json`.
- [`src/shared/wdk.js#L70-L74`](https://github.com/Alannum73/fondo-comunitario/blob/aaed9a75676ed3a8a774e69ff1206e0a6cc3630b/src/shared/wdk.js#L70-L74) — `enviarPago()`, ejecuta `wdk send --network <red> --to <dirección> --amount <monto> --token <token> --wallet <wallet> --json`.
- [`src/depositos/depositos.js#L42`](https://github.com/Alannum73/fondo-comunitario/blob/aaed9a75676ed3a8a774e69ff1206e0a6cc3630b/src/depositos/depositos.js#L42) — un depósito de cuota se confirma consultando el balance real de la wallet del fondo antes de marcar al miembro "al día".
- [`src/tesoreria/tesoreria.js#L34`](https://github.com/Alannum73/fondo-comunitario/blob/aaed9a75676ed3a8a774e69ff1206e0a6cc3630b/src/tesoreria/tesoreria.js#L34) — se valida el balance disponible en la wallet ANTES de intentar pagar un reclamo aprobado (para no fallar en silencio por fondos insuficientes).
- [`src/tesoreria/tesoreria.js#L42-L48`](https://github.com/Alannum73/fondo-comunitario/blob/aaed9a75676ed3a8a774e69ff1206e0a6cc3630b/src/tesoreria/tesoreria.js#L42-L48) — el pago aprobado se ejecuta on-chain vía `wdk send`, y el recibo (`--json`) queda guardado en el reclamo.

## Red y token de la demo

- Red: **Sepolia Testnet** (`sepolia`, chainId 11155111)
- Token: **USDT** (built-in en el registro de tokens de WDK CLI para Sepolia)
- Dirección de contrato: `0xd077A400968890Eacc75cdc901F0356c943e4fDb`
- Es el mismo token que usa el paymaster de Candide preconfigurado para `smart-account-sepolia` — si más adelante se agrega el módulo sin gas, no hace falta desplegar nada propio.

## Setup (desde un clon limpio)

Requisitos: Node.js 22.18.0+

```bash
git clone <este-repo>
cd fondo-comunitario
npm install
cp .env.example .env   # completar las variables (ver abajo)
npm start
```

### Variables de entorno

Ver `.env.example`. Nunca usar una wallet personal — este proyecto usa una wallet de prueba dedicada con fondos limitados (los paquetes de WDK están en fase beta).

## Qué es real vs. qué es simulado

- **Real, verificado en vivo de punta a punta el 2026-08-23:**
  - Wallet del fondo creada y desbloqueada con WDK CLI (`fondo-comunitario-dev`, dirección `0x24c7E155317d21ee6a9bB755A077Abe3f12169Ff` en Sepolia).
  - Wallet fondeada con 100 USDT reales de testnet (faucet de Aave), consultados vía `wdk get balance --json`.
  - **Depósito real confirmado:** `confirmarAporte()` detectó el aumento de balance (0 → 100 USDT) contra la wallet real y marcó a un miembro "al día", sin mocks.
  - **Pago real ejecutado:** `pagarReclamo()` corrió `wdk send` de verdad — 1 USDT enviado en Sepolia, balance bajó de 100 a 99 USDT. Transacción: [`0x80b98c9c7a30c0e787e6766ae24e5d79f0de8b9627399bea372b35f876692ffb`](https://sepolia.etherscan.io/tx/0x80b98c9c7a30c0e787e6766ae24e5d79f0de8b9627399bea372b35f876692ffb).
  - Toda la lógica de negocio (grupos, delegados, quórum, reclamos, aprobaciones, historial) corre sobre datos reales guardados en `data/*.json`, sin mocks salvo en los tests unitarios.
- **Simulado / fuera de alcance en el hackathon:** análisis automático de fotos (QVAC), votación P2P entre todos los miembros (Pears), multisig on-chain real del fondo, cumplimiento regulatorio/KYC.

## Modelo de custodia (léelo antes de preguntar quién tiene la llave)

En este MVP, el dispositivo que crea el fondo actúa como custodio de la wallet. El "quórum de delegados" que aprueba un reclamo es lógica de aplicación (off-chain) que dispara la transacción — no es una garantía criptográfica del protocolo. En producción esto se resolvería con multisig real entre delegados.

**Cada grupo/fondo tiene su propia wallet de WDK CLI** (`grupo.walletName`), creada de antemano por el usuario con `wdk wallet create` — la passphrase la elige y la recuerda el usuario, la app nunca la ve ni la guarda. Esto evita que dos grupos distintos compartan el mismo balance de USDT: sin esto, un pago aprobado en un grupo podría gastar plata que en realidad correspondía a los aportes de otro grupo.

**Cada miembro tiene su propia contraseña** (hasheada con `scrypt`, nunca en texto plano ni expuesta por la API). Entrar a un fondo requiere loguearse como ese miembro, y **votar un reclamo (aprobar/rechazar) solo lo puede hacer el delegado logueado como sí mismo** — el servidor valida la sesión contra el `delegadoId` que se manda, no alcanza con conocer su id. Esto evita que cualquiera pueda actuar como cualquier otro miembro solo sabiendo su nombre.

## Roadmap (qué faltaría para producción)

- Multisig real entre delegados para la wallet del fondo.
- Módulo WDK sin gas para onboarding sin saldo inicial.
- Análisis de evidencia del siniestro con QVAC.
- Votación P2P real entre miembros (Pears).
- Cumplimiento regulatorio / KYC.

## Equipo

<!-- TODO: nombres -->

## Video demo

<!-- TODO: link -->
