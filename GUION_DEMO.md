# Guión — Video demo Fondo Comunitario (Aleph Hackathon)

Duración objetivo: **3 minutos**. Track: *Mejor proyecto creado con WDK CLI*.

---

## 1. Gancho (0:00 – 0:15)

> "En Bolivia, miles de gremios, sindicatos y grupos comunitarios se autofinancian con una caja chica de papel: alguien anota en un cuaderno quién pagó su cuota este mes, y si a alguien le pasa algo — un accidente, un robo — el grupo decide a mano, sin registro, sin transparencia y sin poder auditar nada después.
>
> Nosotros construimos **Fondo Comunitario**: la misma caja chica, pero en USDT, con reglas que se cumplen solas."

*(Mostrar en pantalla: landing page — "Sumate a tu fondo" / "Armá un fondo nuevo")*

---

## 2. La solución (0:15 – 0:50)

> "Fondo Comunitario es un fondo mutual en USDT para un gremio o grupo pequeño. Cada miembro aporta una cuota periódica. Si alguien sufre un siniestro, un grupo de delegados designados por el propio grupo lo revisa **dentro de la app** y lo aprueba o rechaza por quórum. Si se aprueba, el pago sale **automáticamente**, on-chain, vía WDK CLI de Tether — no hay intermediario, no hay 'confía en mí'.
>
> Cada fondo tiene su propia wallet, separada de los demás — así ningún fondo se mezcla con la plata de otro grupo."

*(Mostrar: crear grupo → pestañas Miembros / Cuotas / Siniestros del detalle)*

---

## 3. Por qué importa / mercado (0:50 – 1:10)

> "Esto no es un seguro regulado — es la infraestructura que ya usan informalmente miles de gremios de transporte, sindicatos, juntas vecinales y asociaciones en toda Bolivia y Latinoamérica. Les damos la misma lógica que ya conocen y confían, pero con reglas que corren en código en vez de en un cuaderno."

---

## 4. Stack técnico — por qué WDK (1:10 – 1:35)

> "Todo el movimiento de dinero real corre sobre **WDK CLI de Tether**: creamos una wallet por fondo con `wdk wallet create`, verificamos que la cuota llegó comparando el saldo real con `wdk get balance`, y ejecutamos los pagos aprobados con `wdk send` — guardando el recibo JSON real de cada transacción, sin inventar ni un solo campo.
>
> Encima armamos una API en Node/Express y un frontend en React que hablan con esa lógica — pero el corazón financiero es 100% WDK, corriendo en Sepolia testnet con USDT."

*(Mostrar: terminal con `wdk wallet create`, o el pill "Wallet" en el detalle del grupo)*

---

## 5. Demo en vivo (1:35 – 2:50)

**Guion de pantalla, en este orden:**

1. **Crear fondo** — nombre, wallet (`wdk wallet create` ya hecha antes), cuota, monto máx. por siniestro, delegados, quórum.
2. **Agregar miembros** — mostrar que uno con el mismo nombre que un delegado designado queda marcado automáticamente como "delegado".
3. **Pestaña Cuotas** — mostrar la dirección real de la wallet del fondo, y **"Pagar mi cuota"**: conectar una wallet de navegador y pagar en vivo si hay USDT de testnet disponible; si no, usar "Confirmar aporte" (verificación real de saldo vía WDK) o el modo manual para pruebas.
4. **Pestaña Siniestros** — reportar un siniestro (monto, descripción, foto), y que un delegado elegible lo apruebe. Mostrar el contador de aprobaciones vs. quórum.
5. **Pago del reclamo aprobado** — tesorería ejecuta `wdk send` real y muestra el recibo.
6. **Historial** — línea de tiempo con todos los eventos y el resumen (recaudado / pagado).

> "Todo esto — el saldo, el pago, el recibo — es real, no simulado. Lo único fuera de alcance para el hackathon es el análisis automático de la foto de evidencia y el multisig on-chain entre delegados, que hoy es lógica de aplicación."

---

## 6. Equipo (2:50 – 3:00)

> "Somos un equipo de Cochabamba construyendo esto en 48 horas para el track de WDK CLI."

*(Nombres del equipo)*

---

## 7. Cierre (3:00)

> "Fondo Comunitario le da a cada gremio la misma confianza que ya tienen entre ellos — pero ahora con reglas que se cumplen solas, y una wallet real detrás de cada peso. Gracias."

---

## Checklist antes de grabar

- [ ] Video de 3 minutos, en español (con subtítulos en inglés si se puede)
- [ ] Link al código fuente (repo público)
- [ ] README con info del proyecto (ya está)
- [ ] Dirección del contrato USDT usado: `0xd077A400968890Eacc75cdc901F0356c943e4fDb` (Sepolia)
- [ ] Seleccionar en DoraHacks la categoría/recompensa "WDK CLI" y explicar por qué aplica
- [ ] Entrega antes del domingo 23, 12:00 (hora Argentina)
