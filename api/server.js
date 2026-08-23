// Servidor HTTP fino para el front — expone la lógica ya existente en src/grupo y
// src/depositos como API REST. No reimplementa reglas de negocio, solo las envuelve.

import express from 'express';
import cors from 'cors';
import { cargarEnv } from '../src/shared/env.js';
import {
  crearGrupo,
  listarGrupos,
  obtenerGrupo,
  agregarMiembro,
  delegadosElegibles,
  marcarAporte,
  ErrorValidacion,
} from '../src/grupo/grupo.js';
import { confirmarAporte } from '../src/depositos/depositos.js';
import {
  crearReclamo,
  listarReclamos,
  obtenerReclamo,
  aprobarReclamo,
  rechazarReclamo,
} from '../src/reclamos/reclamo.js';
import { pagarReclamo } from '../src/tesoreria/tesoreria.js';
import { obtenerHistorial } from '../src/historial/historial.js';

// Sin esto, WDK_WALLET_NAME/WDK_NETWORK/WDK_TOKEN quedan undefined salvo que se exporten
// a mano en la shell antes de `npm run server` — el frontend no los manda en el body,
// asume que el server los toma del entorno (ver confirmarAporte más abajo).
cargarEnv();

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

function manejar(fn) {
  return async (req, res) => {
    try {
      const resultado = await fn(req, res);
      res.json(resultado);
    } catch (err) {
      if (err instanceof ErrorValidacion) {
        res.status(400).json({ error: err.message });
      } else {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor.' });
      }
    }
  };
}

app.get('/api/grupos', manejar(() => listarGrupos()));

app.post('/api/grupos', manejar((req) => crearGrupo(req.body)));

app.get('/api/grupos/:grupoId', manejar((req) => obtenerGrupo(req.params.grupoId)));

app.post(
  '/api/grupos/:grupoId/miembros',
  manejar((req) => agregarMiembro(req.params.grupoId, req.body))
);

app.get(
  '/api/grupos/:grupoId/delegados-elegibles',
  manejar((req) => delegadosElegibles(req.params.grupoId))
);

app.post(
  '/api/grupos/:grupoId/depositos/confirmar',
  manejar((req) => {
    const { miembroId, wallet, network, token } = req.body;
    return confirmarAporte(req.params.grupoId, miembroId, {
      wallet: wallet || process.env.WDK_WALLET_NAME,
      network: network || process.env.WDK_NETWORK,
      token: token || process.env.WDK_TOKEN,
    });
  })
);

app.post(
  '/api/grupos/:grupoId/depositos/marcar-manual',
  manejar((req) => marcarAporte(req.params.grupoId, req.body.miembroId))
);

app.get(
  '/api/grupos/:grupoId/reclamos',
  manejar((req) => listarReclamos(req.params.grupoId))
);

app.post(
  '/api/grupos/:grupoId/reclamos',
  manejar((req) =>
    crearReclamo({
      grupoId: req.params.grupoId,
      miembroId: req.body.miembroId,
      montoSolicitado: Number(req.body.montoSolicitado),
      descripcion: req.body.descripcion,
      fotoPath: req.body.fotoPath,
    })
  )
);

app.get(
  '/api/reclamos/:reclamoId',
  manejar((req) => obtenerReclamo(req.params.reclamoId))
);

app.post(
  '/api/reclamos/:reclamoId/aprobar',
  manejar((req) => aprobarReclamo(req.params.reclamoId, req.body.delegadoId))
);

app.post(
  '/api/reclamos/:reclamoId/rechazar',
  manejar((req) => rechazarReclamo(req.params.reclamoId, req.body.delegadoId))
);

app.post(
  '/api/reclamos/:reclamoId/pagar',
  manejar((req) => {
    const { direccionDestino, wallet, network, token } = req.body;
    return pagarReclamo(req.params.reclamoId, direccionDestino, {
      wallet: wallet || process.env.WDK_WALLET_NAME,
      network: network || process.env.WDK_NETWORK,
      token: token || process.env.WDK_TOKEN,
    });
  })
);

app.get(
  '/api/grupos/:grupoId/historial',
  manejar((req) => obtenerHistorial(req.params.grupoId))
);

app.listen(PORT, () => {
  console.log(`API del fondo comunitario escuchando en http://localhost:${PORT}`);
});
