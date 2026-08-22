# Fondo Comunitario

Fondo mutual en USDT para un gremio o grupo pequeño, construido para el Aleph Hackathon (Cochabamba, 22-23 agosto 2026). Los miembros aportan una cuota periódica; cuando alguien sufre un siniestro, un grupo de delegados designados revisa el caso dentro de la app y aprueba o rechaza el pago. Los pagos aprobados se ejecutan automáticamente vía **WDK CLI** de Tether, con un recibo `--json` por cada transacción.

> Esto NO es un seguro regulado con reserva actuarial. Es un fondo mutual comunitario asistido por software.

**Pista objetivo:** WDK (Tether) — track 1, "Mejor proyecto creado con WDK CLI".

## Estado del proyecto

<!-- TODO: actualizar a medida que se construye. Marcar qué está funcional vs. qué es roadmap. -->

- [ ] Wallet del fondo (WDK CLI) — crear/desbloquear
- [ ] Lógica de grupo (cuota, monto máx, delegados, quórum)
- [ ] Depósitos de miembros
- [ ] Reporte de siniestro (foto + monto + descripción)
- [ ] Panel de aprobación de delegados
- [ ] Proceso de tesorería (`wdk send` + recibo `--json`)
- [ ] Historial completo
- [ ] Diferenciador: motor de reglas de gasto (tope agregado + reserva mínima)
- [ ] Diferenciador: agente de tesorería vía `wdk-mcp`

## Qué módulos de WDK se usan

- `@tetherto/wdk-cli` — versión `1.0.0-beta.3`

## Integración de WDK (permalinks)

<!-- TODO: los jueces revisan esto primero. Completar con enlaces directos de GitHub a las líneas exactas donde se invoca WDK, una vez pusheado. -->

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

<!-- TODO: honestidad explícita, los jueces lo valoran en "Technicality" -->

- **Real:** <!-- ej. wallet, depósitos, ejecución de pagos vía wdk-cli -->
- **Simulado / fuera de alcance en el hackathon:** análisis automático de fotos (QVAC), votación P2P entre todos los miembros (Pears), multisig on-chain real del fondo, cumplimiento regulatorio/KYC.

## Modelo de custodia (léelo antes de preguntar quién tiene la llave)

En este MVP, el dispositivo que crea el fondo actúa como custodio de la wallet. El "quórum de delegados" que aprueba un reclamo es lógica de aplicación (off-chain) que dispara la transacción — no es una garantía criptográfica del protocolo. En producción esto se resolvería con multisig real entre delegados.

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
