// API del CRM: usuarios, contactos, oportunidades (pipeline), seguimientos, tickets, plantillas y KPIs.
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
    CATEGORIAS, CONFIG_INICIAL, ESPERA_CLIENTE_HORAS, ESTADOS_TICKET, ESTADOS_TICKET_ACTIVOS, ETAPAS,
    ETAPAS_ABIERTAS, FORMAS_PAGO, FUENTES, INTERESES, MOTIVOS_PERDIDA, NOMBRES_SEGUIMIENTO,
    PLANTILLAS_INICIALES, PRIORIDADES, ROLES, enCatalogo, fechaCorta, fechaHoraCorta, filaImportacion,
    linkWhatsApp, normalizarCelular, parseCSV, plazosTicket, primerNombre, promedio, renderPlantilla,
    seguimientosPara,
} from './logica.mjs';

const HORA = 3600 * 1000;
const DIA = 24 * HORA;
const SESION_MS = 12 * HORA;
const SESION_RECORDAR_MS = 30 * DIA;

class ErrorApi extends Error {
    constructor(status, mensaje) {
        super(mensaje);
        this.status = status;
    }
}
const falla = (status, mensaje) => { throw new ErrorApi(status, mensaje); };

function hashClave(clave, sal = crypto.randomBytes(16).toString('hex')) {
    const h = crypto.scryptSync(String(clave), sal, 64).toString('hex');
    return `${sal}:${h}`;
}
function verificarClave(clave, guardado) {
    const [sal, h] = String(guardado).split(':');
    if (!sal || !h) return false;
    const calc = crypto.scryptSync(String(clave), sal, 64);
    const esperado = Buffer.from(h, 'hex');
    return esperado.length === calc.length && crypto.timingSafeEqual(calc, esperado);
}

function abrirBase(dataDir) {
    fs.mkdirSync(dataDir, { recursive: true });
    const db = new DatabaseSync(path.join(dataDir, 'crm.db'));
    db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, correo TEXT NOT NULL UNIQUE,
            rol TEXT NOT NULL, hash TEXT NOT NULL, activo INTEGER NOT NULL DEFAULT 1, creado INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sesiones (
            token TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            expira INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS contactos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, celular TEXT NOT NULL UNIQUE,
            fuente TEXT, acepta_promos INTEGER NOT NULL DEFAULT 0, etiquetas TEXT NOT NULL DEFAULT '',
            notas TEXT NOT NULL DEFAULT '', creado INTEGER NOT NULL, actualizado INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS oportunidades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contacto_id INTEGER NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
            titulo TEXT NOT NULL, etapa TEXT NOT NULL, interes TEXT, modelo TEXT NOT NULL DEFAULT '',
            presupuesto REAL, forma_pago TEXT, valor REAL, motivo_perdida TEXT, fecha_recojo TEXT,
            comprobante TEXT NOT NULL DEFAULT '', satisfaccion INTEGER,
            responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
            creado INTEGER NOT NULL, actualizado INTEGER NOT NULL, etapa_desde INTEGER NOT NULL,
            primera_respuesta INTEGER, cerrado INTEGER
        );
        CREATE INDEX IF NOT EXISTS op_etapa ON oportunidades (etapa);
        CREATE INDEX IF NOT EXISTS op_contacto ON oportunidades (contacto_id);
        CREATE TABLE IF NOT EXISTS historial (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            oportunidad_id INTEGER NOT NULL REFERENCES oportunidades(id) ON DELETE CASCADE,
            desde TEXT, hacia TEXT NOT NULL, usuario_id INTEGER, fecha INTEGER NOT NULL, nota TEXT
        );
        CREATE TABLE IF NOT EXISTS seguimientos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            oportunidad_id INTEGER NOT NULL REFERENCES oportunidades(id) ON DELETE CASCADE,
            tipo TEXT NOT NULL, plantilla TEXT, auto INTEGER NOT NULL DEFAULT 0,
            programado INTEGER NOT NULL, estado TEXT NOT NULL DEFAULT 'pendiente',
            hecho INTEGER, usuario_id INTEGER
        );
        CREATE INDEX IF NOT EXISTS seg_estado ON seguimientos (estado, programado);
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT, codigo TEXT NOT NULL UNIQUE,
            contacto_id INTEGER NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
            oportunidad_id INTEGER REFERENCES oportunidades(id) ON DELETE SET NULL,
            categoria TEXT NOT NULL, prioridad TEXT NOT NULL, estado TEXT NOT NULL, canal TEXT,
            asunto TEXT NOT NULL, descripcion TEXT NOT NULL DEFAULT '', producto TEXT NOT NULL DEFAULT '',
            comprobante TEXT NOT NULL DEFAULT '', solucion TEXT NOT NULL DEFAULT '', conforme INTEGER,
            responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
            creado INTEGER NOT NULL, actualizado INTEGER NOT NULL,
            plazo_respuesta INTEGER NOT NULL, plazo_solucion INTEGER NOT NULL,
            primera_respuesta INTEGER, resuelto INTEGER, cerrado INTEGER, escalado INTEGER
        );
        CREATE INDEX IF NOT EXISTS tk_estado ON tickets (estado);
        CREATE TABLE IF NOT EXISTS ticket_notas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
            usuario_id INTEGER, texto TEXT NOT NULL, fecha INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS plantillas (clave TEXT PRIMARY KEY, nombre TEXT NOT NULL, texto TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS config (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
    `);
    const insP = db.prepare('INSERT OR IGNORE INTO plantillas (clave, nombre, texto) VALUES (?, ?, ?)');
    for (const p of PLANTILLAS_INICIALES) insP.run(p.clave, p.nombre, p.texto);
    const insC = db.prepare('INSERT OR IGNORE INTO config (clave, valor) VALUES (?, ?)');
    for (const [k, v] of Object.entries(CONFIG_INICIAL)) insC.run(k, v);
    return db;
}

/**
 * Crea la aplicación Express.
 * @param {{dataDir: string, ahora?: () => number, distDir?: string}} opciones
 */
export function crearApp({ dataDir, ahora = () => Date.now(), distDir } = {}) {
    const db = abrirBase(dataDir);
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '5mb' }));

    const uno = (sql, ...p) => db.prepare(sql).get(...p);
    const todos = (sql, ...p) => db.prepare(sql).all(...p);
    const correr = (sql, ...p) => db.prepare(sql).run(...p);
    const transaccion = (fn) => {
        db.exec('BEGIN');
        try {
            const r = fn();
            db.exec('COMMIT');
            return r;
        } catch (e) {
            db.exec('ROLLBACK');
            throw e;
        }
    };

    const config = () => Object.fromEntries(todos('SELECT clave, valor FROM config').map((r) => [r.clave, r.valor]));

    // ---------- Sesión ----------
    const intentos = new Map();
    function limiteIntentos(clave) {
        const t = ahora();
        const lista = (intentos.get(clave) || []).filter((x) => t - x < 15 * 60 * 1000);
        if (lista.length >= 8) falla(429, 'Demasiados intentos. Espera 15 minutos.');
        lista.push(t);
        intentos.set(clave, lista);
    }
    const usuarioPublico = (u) => u && { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, activo: !!u.activo };

    function crearSesion(usuarioId, recordar) {
        const token = crypto.randomBytes(32).toString('base64url');
        correr('DELETE FROM sesiones WHERE expira < ?', ahora());
        correr('INSERT INTO sesiones (token, usuario_id, expira) VALUES (?, ?, ?)',
            token, usuarioId, ahora() + (recordar ? SESION_RECORDAR_MS : SESION_MS));
        return token;
    }

    function autenticar(req, _res, next) {
        const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
        const s = token && uno(`SELECT u.* FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
                                WHERE s.token = ? AND s.expira > ? AND u.activo = 1`, token, ahora());
        if (!s) return next(new ErrorApi(401, 'Inicia sesión para continuar.'));
        req.usuario = s;
        req.token = token;
        next();
    }
    const soloAdmin = (req, _res, next) => next(req.usuario.rol === 'admin' ? undefined : new ErrorApi(403, 'Solo el propietario puede hacer esto.'));
    const gestor = (req, _res, next) => next(['admin', 'encargado'].includes(req.usuario.rol) ? undefined : new ErrorApi(403, 'Solo el propietario o el encargado pueden hacer esto.'));
    const ruta = (fn) => (req, res, next) => {
        try {
            procesarVencimientos();
            const r = fn(req, res);
            if (r !== undefined) res.json(r);
        } catch (e) {
            next(e);
        }
    };

    // ---------- Reglas automáticas ----------
    function cambiarEtapa(op, hacia, usuarioId, extra = {}, nota = null) {
        const t = ahora();
        const campos = { etapa: hacia, etapa_desde: t, actualizado: t, ...extra };
        if (op.etapa === 'nuevo' && hacia !== 'nuevo' && !op.primera_respuesta) campos.primera_respuesta = t;
        if (['ganado', 'perdido'].includes(hacia)) campos.cerrado = t;
        else campos.cerrado = null;
        const sets = Object.keys(campos).map((k) => `${k} = ?`).join(', ');
        correr(`UPDATE oportunidades SET ${sets} WHERE id = ?`, ...Object.values(campos), op.id);
        correr('INSERT INTO historial (oportunidad_id, desde, hacia, usuario_id, fecha, nota) VALUES (?, ?, ?, ?, ?, ?)',
            op.id, op.etapa, hacia, usuarioId ?? null, t, nota);
        // Al salir de una etapa se cancelan sus seguimientos pendientes; al entrar se programan los nuevos.
        correr(`UPDATE seguimientos SET estado = 'cancelado', hecho = ? WHERE oportunidad_id = ? AND estado = 'pendiente'
                AND tipo IN ('seguimiento_24h','seguimiento_72h','cierre_7d')`, t, op.id);
        const ins = db.prepare('INSERT INTO seguimientos (oportunidad_id, tipo, plantilla, auto, programado) VALUES (?, ?, ?, ?, ?)');
        for (const s of seguimientosPara(hacia, t)) ins.run(op.id, s.tipo, s.plantilla, s.auto ? 1 : 0, s.programado);
    }

    let ultimoBarrido = 0;
    function procesarVencimientos(forzar = false) {
        const t = ahora();
        if (!forzar && t - ultimoBarrido < 5000 && t >= ultimoBarrido) return;
        ultimoBarrido = t;
        transaccion(() => {
            // Flujo B: 7 días en "Cotización enviada" sin respuesta → Perdido "No respondió".
            const vencidos = todos(`SELECT s.id AS sid, o.* FROM seguimientos s JOIN oportunidades o ON o.id = s.oportunidad_id
                                    WHERE s.estado = 'pendiente' AND s.auto = 1 AND s.programado <= ?`, t);
            for (const v of vencidos) {
                correr("UPDATE seguimientos SET estado = 'hecho', hecho = ? WHERE id = ?", t, v.sid);
                if (v.etapa === 'cotizacion') {
                    cambiarEtapa(v, 'perdido', null, { motivo_perdida: 'No respondió' }, 'Automático: 7 días sin respuesta');
                    const c = uno('SELECT etiquetas FROM contactos WHERE id = ?', v.contacto_id);
                    const etiquetas = new Set(String(c?.etiquetas || '').split(',').map((x) => x.trim()).filter(Boolean));
                    etiquetas.add('Reactivar');
                    correr('UPDATE contactos SET etiquetas = ?, actualizado = ? WHERE id = ?', [...etiquetas].join(', '), t, v.contacto_id);
                }
            }
            // Tickets: escalar los que vencieron su plazo.
            const escalar = todos(`SELECT * FROM tickets WHERE estado IN ('abierto','en_proceso') AND
                                   ((primera_respuesta IS NULL AND plazo_respuesta < ?) OR plazo_solucion < ?)`, t, t);
            const encargado = uno("SELECT id FROM usuarios WHERE activo = 1 AND rol IN ('encargado','admin') ORDER BY rol = 'admin', id LIMIT 1");
            for (const tk of escalar) {
                correr("UPDATE tickets SET estado = 'escalado', escalado = ?, actualizado = ?, responsable_id = COALESCE(?, responsable_id) WHERE id = ?",
                    t, t, encargado?.id ?? null, tk.id);
                correr('INSERT INTO ticket_notas (ticket_id, usuario_id, texto, fecha) VALUES (?, NULL, ?, ?)',
                    tk.id, 'Escalado automáticamente: venció el plazo.', t);
            }
            // Tickets esperando al cliente sin novedad → resueltos.
            const esperando = todos("SELECT id FROM tickets WHERE estado = 'esperando' AND actualizado < ?", t - ESPERA_CLIENTE_HORAS * HORA);
            for (const tk of esperando) {
                correr("UPDATE tickets SET estado = 'resuelto', resuelto = ?, actualizado = ? WHERE id = ?", t, t, tk.id);
                correr('INSERT INTO ticket_notas (ticket_id, usuario_id, texto, fecha) VALUES (?, NULL, ?, ?)',
                    tk.id, `Resuelto automáticamente: el cliente no respondió en ${ESPERA_CLIENTE_HORAS} h.`, t);
            }
        });
    }

    // ---------- Utilidades de datos ----------
    const texto = (v, max = 500) => String(v ?? '').trim().slice(0, max);
    const numeroONulo = (v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) falla(400, 'Monto no válido.');
        return Math.round(n * 100) / 100;
    };
    const catalogo = (lista, v, campo, obligatorio = false) => {
        if (v === null || v === undefined || v === '') {
            if (obligatorio) falla(400, `Falta ${campo}.`);
            return null;
        }
        const r = enCatalogo(lista, v);
        if (!r) falla(400, `${campo} no válido: ${v}`);
        return r;
    };
    const usuarioValido = (id) => {
        if (id === null || id === undefined || id === '') return null;
        const u = uno('SELECT id FROM usuarios WHERE id = ? AND activo = 1', Number(id));
        if (!u) falla(400, 'Responsable no válido.');
        return u.id;
    };
    const idParam = (req) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) falla(400, 'Identificador no válido.');
        return id;
    };

    function variablesPara(contacto, op, extra = {}) {
        const c = config();
        return {
            nombre: primerNombre(contacto?.nombre),
            negocio: c.negocio,
            horario: c.horario,
            meses: c.meses_garantia,
            modelo: op?.modelo || op?.titulo || 'equipo',
            fecha: fechaCorta(ahora() + 3 * DIA),
            ...extra,
        };
    }
    function mensaje(clave, contacto, op, extra) {
        const p = clave && uno('SELECT texto FROM plantillas WHERE clave = ?', clave);
        if (!p) return null;
        const textoFinal = renderPlantilla(p.texto, variablesPara(contacto, op, extra));
        return { texto: textoFinal, whatsapp: linkWhatsApp(contacto?.celular, textoFinal) };
    }

    const SELECT_OP = `SELECT o.*, c.nombre AS contacto_nombre, c.celular AS contacto_celular, c.fuente AS contacto_fuente,
                       u.nombre AS responsable_nombre
                       FROM oportunidades o JOIN contactos c ON c.id = o.contacto_id
                       LEFT JOIN usuarios u ON u.id = o.responsable_id`;
    const SELECT_TK = `SELECT t.*, c.nombre AS contacto_nombre, c.celular AS contacto_celular, u.nombre AS responsable_nombre
                       FROM tickets t JOIN contactos c ON c.id = t.contacto_id
                       LEFT JOIN usuarios u ON u.id = t.responsable_id`;

    function ticketVista(t) {
        const n = ahora();
        const activo = ESTADOS_TICKET_ACTIVOS.includes(t.estado);
        return {
            ...t,
            respuesta_vencida: !t.primera_respuesta && n > t.plazo_respuesta,
            solucion_vencida: activo && n > t.plazo_solucion,
            whatsapp: linkWhatsApp(t.contacto_celular),
        };
    }

    function siguienteCodigo() {
        const r = uno("SELECT MAX(CAST(SUBSTR(codigo, 3) AS INTEGER)) AS n FROM tickets");
        return `T-${String((r?.n || 0) + 1).padStart(4, '0')}`;
    }

    function crearTicket(datos, usuarioId) {
        const contacto = uno('SELECT * FROM contactos WHERE id = ?', Number(datos.contacto_id));
        if (!contacto) falla(400, 'Elige un cliente.');
        const categoria = catalogo(CATEGORIAS, datos.categoria, 'Categoría', true);
        const prio = PRIORIDADES.find((p) => p.clave === datos.prioridad) ? datos.prioridad
            : (categoria === 'Reclamo formal' ? 'alta' : falla(400, 'Prioridad no válida.'));
        const asunto = texto(datos.asunto, 200);
        if (!asunto) falla(400, 'Escribe el asunto del ticket.');
        const t = ahora();
        const plazos = plazosTicket(prio, t);
        // Responsable por defecto según la categoría (documento 4 de la estrategia).
        let responsable = usuarioValido(datos.responsable_id);
        if (!responsable) {
            const rol = ['Garantía', 'Servicio técnico'].includes(categoria) ? 'tecnico'
                : categoria === 'Consulta de uso' ? 'vendedor' : 'encargado';
            responsable = uno('SELECT id FROM usuarios WHERE activo = 1 AND rol = ? ORDER BY id LIMIT 1', rol)?.id
                ?? uno("SELECT id FROM usuarios WHERE activo = 1 AND rol = 'admin' ORDER BY id LIMIT 1")?.id ?? null;
        }
        const codigo = siguienteCodigo();
        const r = correr(`INSERT INTO tickets (codigo, contacto_id, oportunidad_id, categoria, prioridad, estado, canal, asunto,
                          descripcion, producto, comprobante, responsable_id, creado, actualizado, plazo_respuesta, plazo_solucion)
                          VALUES (?, ?, ?, ?, ?, 'abierto', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            codigo, contacto.id, datos.oportunidad_id ? Number(datos.oportunidad_id) : null, categoria, prio,
            datos.canal ? texto(datos.canal, 40) : null, asunto, texto(datos.descripcion, 4000), texto(datos.producto, 200),
            texto(datos.comprobante, 60), responsable, t, t, plazos.plazo_respuesta, plazos.plazo_solucion);
        correr('INSERT INTO ticket_notas (ticket_id, usuario_id, texto, fecha) VALUES (?, ?, ?, ?)',
            r.lastInsertRowid, usuarioId ?? null, 'Ticket creado.', t);
        return Number(r.lastInsertRowid);
    }

    // ---------- Rutas públicas ----------
    app.get('/api/estado', ruta(() => ({
        configurado: (uno('SELECT COUNT(*) AS n FROM usuarios').n) > 0,
        negocio: config().negocio,
    })));

    app.post('/api/setup', ruta((req) => {
        if (uno('SELECT COUNT(*) AS n FROM usuarios').n > 0) falla(409, 'El CRM ya está configurado.');
        const { nombre, correo, clave, negocio } = req.body || {};
        if (!texto(nombre) || !/^\S+@\S+\.\S+$/.test(texto(correo))) falla(400, 'Escribe tu nombre y un correo válido.');
        if (String(clave || '').length < 8) falla(400, 'La contraseña debe tener al menos 8 caracteres.');
        const r = correr('INSERT INTO usuarios (nombre, correo, rol, hash, creado) VALUES (?, ?, ?, ?, ?)',
            texto(nombre, 80), texto(correo).toLowerCase(), 'admin', hashClave(clave), ahora());
        if (texto(negocio)) correr("UPDATE config SET valor = ? WHERE clave = 'negocio'", texto(negocio, 80));
        const u = uno('SELECT * FROM usuarios WHERE id = ?', r.lastInsertRowid);
        return { token: crearSesion(u.id, true), usuario: usuarioPublico(u) };
    }));

    app.post('/api/login', ruta((req) => {
        const correo = texto(req.body?.correo).toLowerCase();
        limiteIntentos(`${req.ip}|${correo}`);
        const u = uno('SELECT * FROM usuarios WHERE correo = ? AND activo = 1', correo);
        if (!u || !verificarClave(req.body?.clave ?? '', u.hash)) falla(401, 'Correo o contraseña incorrectos.');
        intentos.delete(`${req.ip}|${correo}`);
        return { token: crearSesion(u.id, !!req.body?.recordar), usuario: usuarioPublico(u) };
    }));

    // ---------- Rutas con sesión ----------
    const api = express.Router();
    api.use(autenticar);

    api.post('/logout', ruta((req) => {
        correr('DELETE FROM sesiones WHERE token = ?', req.token);
        return { ok: true };
    }));

    api.get('/me', ruta((req) => ({
        usuario: usuarioPublico(req.usuario),
        config: config(),
        catalogos: { ETAPAS, FUENTES, INTERESES, FORMAS_PAGO, MOTIVOS_PERDIDA, CATEGORIAS, PRIORIDADES, ESTADOS_TICKET, ROLES, NOMBRES_SEGUIMIENTO },
        usuarios: todos('SELECT id, nombre, rol, activo FROM usuarios WHERE activo = 1 ORDER BY nombre'),
    })));

    // Usuarios
    api.get('/usuarios', soloAdmin, ruta(() => todos('SELECT * FROM usuarios ORDER BY id').map(usuarioPublico)));
    api.post('/usuarios', soloAdmin, ruta((req) => {
        const { nombre, correo, rol, clave } = req.body || {};
        if (!texto(nombre) || !/^\S+@\S+\.\S+$/.test(texto(correo))) falla(400, 'Escribe nombre y correo válido.');
        if (!ROLES.some((r) => r.clave === rol)) falla(400, 'Rol no válido.');
        if (String(clave || '').length < 8) falla(400, 'La contraseña debe tener al menos 8 caracteres.');
        if (uno('SELECT id FROM usuarios WHERE correo = ?', texto(correo).toLowerCase())) falla(409, 'Ese correo ya existe.');
        const r = correr('INSERT INTO usuarios (nombre, correo, rol, hash, creado) VALUES (?, ?, ?, ?, ?)',
            texto(nombre, 80), texto(correo).toLowerCase(), rol, hashClave(clave), ahora());
        return usuarioPublico(uno('SELECT * FROM usuarios WHERE id = ?', r.lastInsertRowid));
    }));
    api.patch('/usuarios/:id', soloAdmin, ruta((req) => {
        const id = idParam(req);
        const u = uno('SELECT * FROM usuarios WHERE id = ?', id) || falla(404, 'Usuario no encontrado.');
        const b = req.body || {};
        if (b.rol !== undefined && !ROLES.some((r) => r.clave === b.rol)) falla(400, 'Rol no válido.');
        const quitaAdmin = (b.rol && b.rol !== 'admin') || b.activo === false;
        if (u.rol === 'admin' && quitaAdmin && uno("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin' AND activo = 1").n <= 1) {
            falla(400, 'Debe quedar al menos un propietario activo.');
        }
        if (b.clave !== undefined && String(b.clave).length < 8) falla(400, 'La contraseña debe tener al menos 8 caracteres.');
        correr('UPDATE usuarios SET nombre = ?, rol = ?, activo = ?, hash = ? WHERE id = ?',
            b.nombre !== undefined ? texto(b.nombre, 80) || u.nombre : u.nombre, b.rol ?? u.rol,
            b.activo === undefined ? u.activo : (b.activo ? 1 : 0), b.clave ? hashClave(b.clave) : u.hash, id);
        if (b.activo === false || b.clave) correr('DELETE FROM sesiones WHERE usuario_id = ?', id);
        return usuarioPublico(uno('SELECT * FROM usuarios WHERE id = ?', id));
    }));

    // Configuración y plantillas
    api.patch('/config', soloAdmin, ruta((req) => {
        for (const k of Object.keys(CONFIG_INICIAL)) {
            if (req.body?.[k] !== undefined) correr('UPDATE config SET valor = ? WHERE clave = ?', texto(req.body[k], 120), k);
        }
        return config();
    }));
    api.get('/plantillas', ruta(() => todos('SELECT * FROM plantillas ORDER BY rowid')));
    api.patch('/plantillas/:clave', soloAdmin, ruta((req) => {
        const p = uno('SELECT * FROM plantillas WHERE clave = ?', req.params.clave) || falla(404, 'Plantilla no encontrada.');
        const t = texto(req.body?.texto, 1000);
        if (!t) falla(400, 'La plantilla no puede quedar vacía.');
        correr('UPDATE plantillas SET texto = ? WHERE clave = ?', t, p.clave);
        return uno('SELECT * FROM plantillas WHERE clave = ?', p.clave);
    }));

    // Contactos
    api.get('/contactos', ruta((req) => {
        const q = `%${texto(req.query.q, 80)}%`;
        const filtros = ['(c.nombre LIKE ? OR c.celular LIKE ? OR c.etiquetas LIKE ?)'];
        const params = [q, q, q];
        if (req.query.fuente) { filtros.push('c.fuente = ?'); params.push(String(req.query.fuente)); }
        return todos(`SELECT c.*,
                (SELECT COUNT(*) FROM oportunidades o WHERE o.contacto_id = c.id) AS oportunidades,
                (SELECT COUNT(*) FROM oportunidades o WHERE o.contacto_id = c.id AND o.etapa = 'ganado') AS compras,
                (SELECT COALESCE(SUM(valor), 0) FROM oportunidades o WHERE o.contacto_id = c.id AND o.etapa = 'ganado') AS total_comprado,
                (SELECT COUNT(*) FROM tickets t WHERE t.contacto_id = c.id AND t.estado IN ('abierto','en_proceso','esperando','escalado')) AS tickets_abiertos
                FROM contactos c WHERE ${filtros.join(' AND ')} ORDER BY c.actualizado DESC LIMIT 500`, ...params)
            .map((c) => ({ ...c, whatsapp: linkWhatsApp(c.celular) }));
    }));
    api.get('/contactos/:id', ruta((req) => {
        const c = uno('SELECT * FROM contactos WHERE id = ?', idParam(req)) || falla(404, 'Cliente no encontrado.');
        return {
            ...c,
            whatsapp: linkWhatsApp(c.celular),
            oportunidades: todos(`${SELECT_OP} WHERE o.contacto_id = ? ORDER BY o.creado DESC`, c.id),
            tickets: todos(`${SELECT_TK} WHERE t.contacto_id = ? ORDER BY t.creado DESC`, c.id).map(ticketVista),
        };
    }));
    function datosContacto(b, actual = {}) {
        const nombre = b.nombre !== undefined ? texto(b.nombre, 120) : actual.nombre;
        if (!nombre) falla(400, 'Escribe el nombre del cliente.');
        const celular = b.celular !== undefined ? normalizarCelular(b.celular) : actual.celular;
        if (!celular) falla(400, 'Celular no válido. Usa 9 dígitos (9XXXXXXXX) o el formato +51 9XXXXXXXX.');
        return {
            nombre, celular,
            fuente: b.fuente !== undefined ? catalogo(FUENTES, b.fuente, 'Fuente') : actual.fuente ?? null,
            acepta_promos: b.acepta_promos !== undefined ? (b.acepta_promos ? 1 : 0) : actual.acepta_promos ?? 0,
            etiquetas: b.etiquetas !== undefined ? texto(b.etiquetas, 300) : actual.etiquetas ?? '',
            notas: b.notas !== undefined ? texto(b.notas, 4000) : actual.notas ?? '',
        };
    }
    api.post('/contactos', ruta((req) => {
        const d = datosContacto(req.body || {});
        const existe = uno('SELECT id, nombre FROM contactos WHERE celular = ?', d.celular);
        if (existe) falla(409, `Ese celular ya está registrado a nombre de ${existe.nombre}.`);
        const t = ahora();
        const r = correr(`INSERT INTO contactos (nombre, celular, fuente, acepta_promos, etiquetas, notas, creado, actualizado)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, d.nombre, d.celular, d.fuente, d.acepta_promos, d.etiquetas, d.notas, t, t);
        return uno('SELECT * FROM contactos WHERE id = ?', r.lastInsertRowid);
    }));
    api.patch('/contactos/:id', ruta((req) => {
        const id = idParam(req);
        const actual = uno('SELECT * FROM contactos WHERE id = ?', id) || falla(404, 'Cliente no encontrado.');
        const d = datosContacto(req.body || {}, actual);
        const otro = uno('SELECT nombre FROM contactos WHERE celular = ? AND id <> ?', d.celular, id);
        if (otro) falla(409, `Ese celular ya está registrado a nombre de ${otro.nombre}.`);
        correr(`UPDATE contactos SET nombre = ?, celular = ?, fuente = ?, acepta_promos = ?, etiquetas = ?, notas = ?, actualizado = ?
                WHERE id = ?`, d.nombre, d.celular, d.fuente, d.acepta_promos, d.etiquetas, d.notas, ahora(), id);
        return uno('SELECT * FROM contactos WHERE id = ?', id);
    }));
    api.delete('/contactos/:id', soloAdmin, ruta((req) => {
        const r = correr('DELETE FROM contactos WHERE id = ?', idParam(req));
        if (!r.changes) falla(404, 'Cliente no encontrado.');
        return { ok: true };
    }));

    api.post('/contactos/importar', gestor, ruta((req) => {
        const filas = parseCSV(req.body?.csv);
        if (!filas.length) falla(400, 'El archivo está vacío o no tiene encabezados.');
        if (filas.length > 5000) falla(400, 'Máximo 5000 filas por importación.');
        const res = { contactos_nuevos: 0, contactos_actualizados: 0, oportunidades: 0, errores: [] };
        transaccion(() => {
            filas.forEach((fila, i) => {
                const n = i + 2; // fila 1 = encabezados
                const d = filaImportacion(fila);
                if (!d.nombre) return res.errores.push({ fila: n, motivo: 'Falta el nombre' });
                if (!d.celular) return res.errores.push({ fila: n, motivo: `Celular no válido: "${d.celularTexto}"` });
                if (d.etapaTexto && !d.etapa) return res.errores.push({ fila: n, motivo: `Etapa desconocida: "${d.etapaTexto}"` });
                const t = ahora();
                let c = uno('SELECT * FROM contactos WHERE celular = ?', d.celular);
                if (c) {
                    const etiquetas = new Set([...String(c.etiquetas).split(','), ...String(d.etiquetas).split(',')].map((x) => x.trim()).filter(Boolean));
                    correr(`UPDATE contactos SET fuente = COALESCE(fuente, ?), etiquetas = ?,
                            notas = CASE WHEN notas = '' THEN ? ELSE notas END, actualizado = ? WHERE id = ?`,
                        d.fuente, [...etiquetas].join(', '), d.notas, t, c.id);
                    res.contactos_actualizados++;
                } else {
                    const r = correr(`INSERT INTO contactos (nombre, celular, fuente, acepta_promos, etiquetas, notas, creado, actualizado)
                                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, d.nombre, d.celular, d.fuente, d.acepta_promos, d.etiquetas, d.notas, t, t);
                    c = { id: Number(r.lastInsertRowid) };
                    res.contactos_nuevos++;
                }
                if (d.etapa || d.interes || d.modelo) {
                    const etapa = d.etapa || 'nuevo';
                    const titulo = d.modelo || d.interes || 'Oportunidad importada';
                    const r = correr(`INSERT INTO oportunidades (contacto_id, titulo, etapa, interes, modelo, presupuesto, forma_pago, valor,
                                      responsable_id, creado, actualizado, etapa_desde, primera_respuesta, cerrado)
                                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        c.id, titulo, etapa, d.interes, d.modelo, d.presupuesto, d.forma_pago, d.presupuesto, req.usuario.id,
                        t, t, t, etapa === 'nuevo' ? null : t, ['ganado', 'perdido'].includes(etapa) ? t : null);
                    correr('INSERT INTO historial (oportunidad_id, desde, hacia, usuario_id, fecha, nota) VALUES (?, NULL, ?, ?, ?, ?)',
                        r.lastInsertRowid, etapa, req.usuario.id, t, 'Importado desde CSV');
                    // Las cotizaciones importadas arrancan su seguimiento desde hoy; las ventas antiguas no generan postventa.
                    if (etapa === 'cotizacion') {
                        const ins = db.prepare('INSERT INTO seguimientos (oportunidad_id, tipo, plantilla, auto, programado) VALUES (?, ?, ?, ?, ?)');
                        for (const s of seguimientosPara('cotizacion', t)) ins.run(r.lastInsertRowid, s.tipo, s.plantilla, s.auto ? 1 : 0, s.programado);
                    }
                    res.oportunidades++;
                }
            });
        });
        return res;
    }));

    // Oportunidades / pipeline
    api.get('/oportunidades', ruta((req) => {
        const filtros = [];
        const params = [];
        if (req.query.abiertas === '1') filtros.push(`o.etapa IN (${ETAPAS_ABIERTAS.map(() => '?').join(',')})`), params.push(...ETAPAS_ABIERTAS);
        if (req.query.responsable) { filtros.push('o.responsable_id = ?'); params.push(Number(req.query.responsable)); }
        if (req.query.q) {
            const q = `%${texto(req.query.q, 80)}%`;
            filtros.push('(o.titulo LIKE ? OR c.nombre LIKE ? OR c.celular LIKE ?)');
            params.push(q, q, q);
        }
        // Cerradas: solo los últimos 30 días para que el tablero no crezca sin fin.
        filtros.push('(o.cerrado IS NULL OR o.cerrado > ?)');
        params.push(ahora() - 30 * DIA);
        return todos(`${SELECT_OP} WHERE ${filtros.join(' AND ')} ORDER BY o.etapa_desde DESC`, ...params);
    }));
    api.get('/oportunidades/:id', ruta((req) => {
        const o = uno(`${SELECT_OP} WHERE o.id = ?`, idParam(req)) || falla(404, 'Oportunidad no encontrada.');
        return {
            ...o,
            historial: todos(`SELECT h.*, u.nombre AS usuario_nombre FROM historial h LEFT JOIN usuarios u ON u.id = h.usuario_id
                              WHERE h.oportunidad_id = ? ORDER BY h.fecha DESC, h.id DESC`, o.id),
            seguimientos: todos('SELECT * FROM seguimientos WHERE oportunidad_id = ? ORDER BY programado', o.id),
        };
    }));
    function datosOportunidad(b, actual = {}) {
        const d = {};
        if (b.titulo !== undefined) d.titulo = texto(b.titulo, 160);
        if (b.interes !== undefined) d.interes = catalogo(INTERESES, b.interes, 'Interés');
        if (b.modelo !== undefined) d.modelo = texto(b.modelo, 160);
        if (b.presupuesto !== undefined) d.presupuesto = numeroONulo(b.presupuesto);
        if (b.valor !== undefined) d.valor = numeroONulo(b.valor);
        if (b.forma_pago !== undefined) d.forma_pago = catalogo(FORMAS_PAGO, b.forma_pago, 'Forma de pago');
        if (b.fecha_recojo !== undefined) {
            if (b.fecha_recojo && !/^\d{4}-\d{2}-\d{2}$/.test(b.fecha_recojo)) falla(400, 'Fecha de recojo no válida.');
            d.fecha_recojo = b.fecha_recojo || null;
        }
        if (b.comprobante !== undefined) d.comprobante = texto(b.comprobante, 60);
        if (b.responsable_id !== undefined) d.responsable_id = usuarioValido(b.responsable_id);
        if (b.satisfaccion !== undefined) {
            const s = b.satisfaccion === null || b.satisfaccion === '' ? null : Number(b.satisfaccion);
            if (s !== null && !(Number.isInteger(s) && s >= 1 && s <= 5)) falla(400, 'La calificación va de 1 a 5.');
            d.satisfaccion = s;
        }
        if ((d.titulo ?? actual.titulo ?? '') === '') d.titulo = d.modelo || actual.modelo || d.interes || 'Oportunidad';
        return d;
    }
    api.post('/oportunidades', ruta((req) => {
        const b = req.body || {};
        let contactoId = Number(b.contacto_id);
        transaccion(() => {
            if (!contactoId && b.contacto) {
                // Alta rápida: cliente nuevo + oportunidad en un paso (como en el mostrador o el chat).
                const d = datosContacto(b.contacto);
                const existe = uno('SELECT id FROM contactos WHERE celular = ?', d.celular);
                if (existe) contactoId = existe.id;
                else {
                    const t = ahora();
                    contactoId = Number(correr(`INSERT INTO contactos (nombre, celular, fuente, acepta_promos, etiquetas, notas, creado, actualizado)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, d.nombre, d.celular, d.fuente, d.acepta_promos, d.etiquetas, d.notas, t, t).lastInsertRowid);
                }
            }
            if (!uno('SELECT id FROM contactos WHERE id = ?', contactoId)) falla(400, 'Elige o registra un cliente.');
            const d = datosOportunidad(b);
            const etapa = b.etapa && ETAPAS_ABIERTAS.includes(b.etapa) ? b.etapa : 'nuevo';
            // Si no se elige responsable: reparto por turnos entre vendedores (el que tiene menos oportunidades abiertas).
            let responsable = d.responsable_id;
            if (!responsable) {
                responsable = uno(`SELECT u.id FROM usuarios u WHERE u.activo = 1 AND u.rol = 'vendedor'
                                   ORDER BY (SELECT COUNT(*) FROM oportunidades o WHERE o.responsable_id = u.id
                                   AND o.etapa IN ('nuevo','calificado','cotizacion','separacion')), u.id LIMIT 1`)?.id ?? req.usuario.id;
            }
            const t = ahora();
            const r = correr(`INSERT INTO oportunidades (contacto_id, titulo, etapa, interes, modelo, presupuesto, forma_pago, valor,
                              fecha_recojo, comprobante, responsable_id, creado, actualizado, etapa_desde, primera_respuesta)
                              VALUES (?, ?, 'nuevo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
                contactoId, d.titulo, d.interes ?? null, d.modelo ?? '', d.presupuesto ?? null, d.forma_pago ?? null,
                d.valor ?? d.presupuesto ?? null, d.fecha_recojo ?? null, d.comprobante ?? '', responsable, t, t, t);
            const id = Number(r.lastInsertRowid);
            correr('INSERT INTO historial (oportunidad_id, desde, hacia, usuario_id, fecha) VALUES (?, NULL, ?, ?, ?)', id, 'nuevo', req.usuario.id, t);
            if (etapa !== 'nuevo') cambiarEtapa(uno('SELECT * FROM oportunidades WHERE id = ?', id), etapa, req.usuario.id);
            correr('UPDATE contactos SET actualizado = ? WHERE id = ?', t, contactoId);
            b._id = id;
        });
        return uno(`${SELECT_OP} WHERE o.id = ?`, b._id);
    }));
    api.patch('/oportunidades/:id', ruta((req) => {
        const id = idParam(req);
        const op = uno('SELECT * FROM oportunidades WHERE id = ?', id) || falla(404, 'Oportunidad no encontrada.');
        const b = req.body || {};
        const d = datosOportunidad(b, op);
        let ticketNuevo = null;
        transaccion(() => {
            if (Object.keys(d).length) {
                const sets = Object.keys(d).map((k) => `${k} = ?`).join(', ');
                correr(`UPDATE oportunidades SET ${sets}, actualizado = ? WHERE id = ?`, ...Object.values(d), ahora(), id);
            }
            if (b.etapa !== undefined && b.etapa !== op.etapa) {
                if (!ETAPAS.some((e) => e.clave === b.etapa)) falla(400, 'Etapa no válida.');
                const extra = {};
                if (b.etapa === 'perdido') {
                    extra.motivo_perdida = catalogo(MOTIVOS_PERDIDA, b.motivo_perdida, 'Motivo de pérdida', true);
                } else extra.motivo_perdida = null;
                if (b.etapa === 'ganado') {
                    const valor = d.valor ?? op.valor;
                    if (!(valor > 0)) falla(400, 'Para cerrar la venta registra el monto vendido.');
                }
                cambiarEtapa(uno('SELECT * FROM oportunidades WHERE id = ?', id), b.etapa, req.usuario.id, extra, texto(b.nota, 300) || null);
            }
            // Encuesta postventa: 1 a 3 crea un ticket de prioridad alta para el encargado (Flujo C).
            if (d.satisfaccion && d.satisfaccion <= 3 && op.satisfaccion !== d.satisfaccion) {
                const ya = uno("SELECT id FROM tickets WHERE oportunidad_id = ? AND asunto LIKE 'Encuesta postventa%'", id);
                if (!ya) {
                    ticketNuevo = crearTicket({
                        contacto_id: op.contacto_id, oportunidad_id: id, categoria: 'Reclamo formal', prioridad: 'alta',
                        canal: 'Encuesta', asunto: `Encuesta postventa: calificó ${d.satisfaccion} de 5`,
                        descripcion: 'Creado automáticamente por una calificación baja. Llamar al cliente.',
                        producto: op.modelo || op.titulo,
                    }, req.usuario.id);
                }
            }
        });
        return { ...uno(`${SELECT_OP} WHERE o.id = ?`, id), ticket_creado: ticketNuevo };
    }));
    api.post('/oportunidades/:id/respondido', ruta((req) => {
        // El cliente contestó: se detienen los seguimientos automáticos de la cotización.
        const id = idParam(req);
        const op = uno('SELECT * FROM oportunidades WHERE id = ?', id) || falla(404, 'Oportunidad no encontrada.');
        const t = ahora();
        transaccion(() => {
            if (!op.primera_respuesta) correr('UPDATE oportunidades SET primera_respuesta = ? WHERE id = ?', t, id);
            correr(`UPDATE seguimientos SET estado = 'cancelado', hecho = ?, usuario_id = ? WHERE oportunidad_id = ? AND estado = 'pendiente'
                    AND tipo IN ('seguimiento_24h','seguimiento_72h','cierre_7d')`, t, req.usuario.id, id);
            correr('INSERT INTO historial (oportunidad_id, desde, hacia, usuario_id, fecha, nota) VALUES (?, ?, ?, ?, ?, ?)',
                id, op.etapa, op.etapa, req.usuario.id, t, 'El cliente respondió');
        });
        return uno(`${SELECT_OP} WHERE o.id = ?`, id);
    }));
    api.delete('/oportunidades/:id', gestor, ruta((req) => {
        const r = correr('DELETE FROM oportunidades WHERE id = ?', idParam(req));
        if (!r.changes) falla(404, 'Oportunidad no encontrada.');
        return { ok: true };
    }));
    api.get('/oportunidades/:id/mensaje/:plantilla', ruta((req) => {
        const o = uno(`${SELECT_OP} WHERE o.id = ?`, idParam(req)) || falla(404, 'Oportunidad no encontrada.');
        const c = { nombre: o.contacto_nombre, celular: o.contacto_celular };
        return mensaje(req.params.plantilla, c, o) || falla(404, 'Plantilla no encontrada.');
    }));

    // Seguimientos
    api.get('/seguimientos', ruta((req) => {
        // Por defecto solo lo que ya toca hacer; ?dias=7 incluye los próximos días.
        const dias = Math.min(Math.max(Number(req.query.dias) || 0, 0), 120);
        const hasta = ahora() + dias * DIA;
        const filtros = ["s.estado = 'pendiente'", 's.auto = 0', 's.programado <= ?'];
        const params = [hasta];
        if (req.query.mios === '1') { filtros.push('o.responsable_id = ?'); params.push(req.usuario.id); }
        return todos(`SELECT s.*, o.titulo, o.modelo, o.etapa, o.responsable_id, u.nombre AS responsable_nombre,
                      c.id AS contacto_id, c.nombre AS contacto_nombre, c.celular AS contacto_celular
                      FROM seguimientos s JOIN oportunidades o ON o.id = s.oportunidad_id
                      JOIN contactos c ON c.id = o.contacto_id LEFT JOIN usuarios u ON u.id = o.responsable_id
                      WHERE ${filtros.join(' AND ')} ORDER BY s.programado`, ...params)
            .map((s) => ({
                ...s,
                nombre: NOMBRES_SEGUIMIENTO[s.tipo] || s.tipo,
                vencido: s.programado <= ahora(),
                cuando: fechaHoraCorta(s.programado),
                mensaje: mensaje(s.plantilla, { nombre: s.contacto_nombre, celular: s.contacto_celular }, s),
            }));
    }));
    api.post('/seguimientos/:id/:accion', ruta((req) => {
        const id = idParam(req);
        const accion = req.params.accion;
        if (!['hecho', 'omitir'].includes(accion)) falla(404, 'Acción no válida.');
        const s = uno("SELECT * FROM seguimientos WHERE id = ? AND estado = 'pendiente'", id) || falla(404, 'Seguimiento no encontrado o ya atendido.');
        correr('UPDATE seguimientos SET estado = ?, hecho = ?, usuario_id = ? WHERE id = ?',
            accion === 'hecho' ? 'hecho' : 'omitido', ahora(), req.usuario.id, s.id);
        return { ok: true };
    }));

    // Tickets
    api.get('/tickets', ruta((req) => {
        const filtros = [];
        const params = [];
        if (req.query.estado === 'activos') filtros.push("t.estado IN ('abierto','en_proceso','esperando','escalado')");
        else if (req.query.estado) { filtros.push('t.estado = ?'); params.push(String(req.query.estado)); }
        if (req.query.prioridad) { filtros.push('t.prioridad = ?'); params.push(String(req.query.prioridad)); }
        if (req.query.categoria) { filtros.push('t.categoria = ?'); params.push(String(req.query.categoria)); }
        if (req.query.mios === '1') { filtros.push('t.responsable_id = ?'); params.push(req.usuario.id); }
        if (req.query.q) {
            const q = `%${texto(req.query.q, 80)}%`;
            filtros.push('(t.codigo LIKE ? OR t.asunto LIKE ? OR c.nombre LIKE ? OR c.celular LIKE ?)');
            params.push(q, q, q, q);
        }
        const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
        return todos(`${SELECT_TK} ${where} ORDER BY CASE t.prioridad WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
                      t.plazo_solucion LIMIT 500`, ...params).map(ticketVista);
    }));
    api.get('/tickets/:id', ruta((req) => {
        const t = uno(`${SELECT_TK} WHERE t.id = ?`, idParam(req)) || falla(404, 'Ticket no encontrado.');
        return {
            ...ticketVista(t),
            notas: todos(`SELECT n.*, u.nombre AS usuario_nombre FROM ticket_notas n LEFT JOIN usuarios u ON u.id = n.usuario_id
                          WHERE n.ticket_id = ? ORDER BY n.fecha DESC, n.id DESC`, t.id),
            mensaje_creado: mensaje('ticket_creado', { nombre: t.contacto_nombre, celular: t.contacto_celular }, null,
                { ticket: t.codigo, plazo: fechaHoraCorta(t.plazo_respuesta) }),
        };
    }));
    api.post('/tickets', ruta((req) => {
        const id = transaccion(() => crearTicket(req.body || {}, req.usuario.id));
        return ticketVista(uno(`${SELECT_TK} WHERE t.id = ?`, id));
    }));
    api.patch('/tickets/:id', ruta((req) => {
        const id = idParam(req);
        const tk = uno('SELECT * FROM tickets WHERE id = ?', id) || falla(404, 'Ticket no encontrado.');
        const b = req.body || {};
        const t = ahora();
        const d = {};
        const notas = [];
        if (b.estado !== undefined && b.estado !== tk.estado) {
            if (!ESTADOS_TICKET.some((e) => e.clave === b.estado)) falla(400, 'Estado no válido.');
            if (['resuelto', 'cerrado'].includes(b.estado) && !texto(b.solucion ?? tk.solucion)) falla(400, 'Describe la solución aplicada.');
            d.estado = b.estado;
            if (b.estado !== 'abierto' && !tk.primera_respuesta) d.primera_respuesta = t;
            if (b.estado === 'resuelto' && !tk.resuelto) d.resuelto = t;
            if (b.estado === 'cerrado') { d.cerrado = t; if (!tk.resuelto) d.resuelto = t; }
            if (ESTADOS_TICKET_ACTIVOS.includes(b.estado)) { d.cerrado = null; d.resuelto = null; }
            notas.push(`Estado: ${ESTADOS_TICKET.find((e) => e.clave === tk.estado)?.nombre} → ${ESTADOS_TICKET.find((e) => e.clave === b.estado).nombre}`);
        }
        if (b.prioridad !== undefined && b.prioridad !== tk.prioridad) {
            if (!PRIORIDADES.some((p) => p.clave === b.prioridad)) falla(400, 'Prioridad no válida.');
            Object.assign(d, { prioridad: b.prioridad }, plazosTicket(b.prioridad, tk.creado));
            notas.push(`Prioridad cambiada a ${b.prioridad}`);
        }
        if (b.categoria !== undefined) d.categoria = catalogo(CATEGORIAS, b.categoria, 'Categoría', true);
        if (b.responsable_id !== undefined) {
            d.responsable_id = usuarioValido(b.responsable_id);
            if (d.responsable_id !== tk.responsable_id) notas.push('Responsable reasignado');
        }
        for (const k of ['asunto', 'descripcion', 'producto', 'comprobante', 'solucion']) {
            if (b[k] !== undefined) d[k] = texto(b[k], k === 'asunto' ? 200 : 4000);
        }
        if (b.conforme !== undefined) d.conforme = b.conforme === null ? null : (b.conforme ? 1 : 0);
        transaccion(() => {
            if (Object.keys(d).length) {
                const sets = Object.keys(d).map((k) => `${k} = ?`).join(', ');
                correr(`UPDATE tickets SET ${sets}, actualizado = ? WHERE id = ?`, ...Object.values(d), t, id);
            }
            const ins = db.prepare('INSERT INTO ticket_notas (ticket_id, usuario_id, texto, fecha) VALUES (?, ?, ?, ?)');
            for (const n of notas) ins.run(id, req.usuario.id, n, t);
            if (texto(b.nota)) {
                ins.run(id, req.usuario.id, texto(b.nota, 2000), t);
                if (!tk.primera_respuesta && !d.primera_respuesta) correr('UPDATE tickets SET primera_respuesta = ? WHERE id = ?', t, id);
            }
        });
        return ticketVista(uno(`${SELECT_TK} WHERE t.id = ?`, id));
    }));

    // KPIs
    api.get('/kpis', ruta((req) => {
        const n = ahora();
        const desde = req.query.desde ? Date.parse(`${req.query.desde}T00:00:00-05:00`) : n - 30 * DIA;
        const hasta = req.query.hasta ? Date.parse(`${req.query.hasta}T23:59:59-05:00`) : n;
        if (!Number.isFinite(desde) || !Number.isFinite(hasta) || desde > hasta) falla(400, 'Rango de fechas no válido.');

        const ops = todos(`SELECT o.*, c.fuente FROM oportunidades o JOIN contactos c ON c.id = o.contacto_id
                           WHERE o.creado BETWEEN ? AND ?`, desde, hasta);
        const ganadas = ops.filter((o) => o.etapa === 'ganado');
        const porFuente = FUENTES.concat(['Sin fuente']).map((f) => {
            const del = ops.filter((o) => (o.fuente || 'Sin fuente') === f);
            const g = del.filter((o) => o.etapa === 'ganado');
            return {
                fuente: f, prospectos: del.length, ventas: g.length,
                conversion: del.length ? g.length / del.length : null,
                monto: g.reduce((a, o) => a + (o.valor || 0), 0),
            };
        }).filter((f) => f.prospectos > 0);

        const respuestas = ops.filter((o) => o.primera_respuesta).map((o) => (o.primera_respuesta - o.creado) / 60000);
        const motivos = MOTIVOS_PERDIDA.map((m) => ({
            motivo: m, total: ops.filter((o) => o.etapa === 'perdido' && o.motivo_perdida === m).length,
        })).filter((m) => m.total > 0);

        const embudo = ETAPAS.filter((e) => ETAPAS_ABIERTAS.includes(e.clave)).map((e) => {
            const r = uno('SELECT COUNT(*) AS total, COALESCE(SUM(COALESCE(valor, presupuesto, 0)), 0) AS valor FROM oportunidades WHERE etapa = ?', e.clave);
            return { etapa: e.clave, nombre: e.nombre, total: r.total, valor: r.valor };
        });

        // Ventas recuperadas: oportunidades ganadas que recibieron al menos un seguimiento de cotización.
        const recuperadas = uno(`SELECT COUNT(DISTINCT o.id) AS n FROM oportunidades o JOIN seguimientos s ON s.oportunidad_id = o.id
                                 WHERE o.etapa = 'ganado' AND o.cerrado BETWEEN ? AND ? AND s.estado = 'hecho'
                                 AND s.tipo IN ('seguimiento_24h','seguimiento_72h')`, desde, hasta).n;
        const satisfacciones = todos('SELECT satisfaccion FROM oportunidades WHERE satisfaccion IS NOT NULL AND cerrado BETWEEN ? AND ?', desde, hasta)
            .map((r) => r.satisfaccion);

        const tks = todos('SELECT * FROM tickets WHERE creado BETWEEN ? AND ?', desde, hasta);
        // Cuentan los respondidos y los que vencieron sin respuesta (estos, fuera de plazo).
        const conRespuesta = tks.filter((t) => t.primera_respuesta || t.plazo_respuesta < n);
        const dentroSla = conRespuesta.filter((t) => t.primera_respuesta && t.primera_respuesta <= t.plazo_respuesta).length;
        const resueltos = tks.filter((t) => t.resuelto);
        const ventasSemanas = [];
        for (let i = 7; i >= 0; i--) {
            const fin = n - i * 7 * DIA;
            const ini = fin - 7 * DIA;
            const r = uno("SELECT COUNT(*) AS ventas, COALESCE(SUM(valor), 0) AS monto FROM oportunidades WHERE etapa = 'ganado' AND cerrado > ? AND cerrado <= ?", ini, fin);
            const semana = new Date(ini + DIA).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short' }).replace('.', '');
            ventasSemanas.push({ semana, ventas: r.ventas, monto: r.monto });
        }

        return {
            rango: { desde, hasta },
            ventas: {
                prospectos: ops.length,
                ganadas: ganadas.length,
                perdidas: ops.filter((o) => o.etapa === 'perdido').length,
                conversion: ops.length ? ganadas.length / ops.length : null,
                monto: ganadas.reduce((a, o) => a + (o.valor || 0), 0),
                ticket_promedio: ganadas.length ? ganadas.reduce((a, o) => a + (o.valor || 0), 0) / ganadas.length : null,
                primera_respuesta_min: promedio(respuestas),
                respondidas_15min: respuestas.length ? respuestas.filter((m) => m <= 15).length / respuestas.length : null,
                recuperadas,
                satisfaccion: promedio(satisfacciones),
                encuestas: satisfacciones.length,
            },
            por_fuente: porFuente,
            motivos_perdida: motivos,
            embudo,
            ventas_semanales: ventasSemanas,
            tickets: {
                creados: tks.length,
                activos: uno("SELECT COUNT(*) AS n FROM tickets WHERE estado IN ('abierto','en_proceso','esperando','escalado')").n,
                escalados: uno("SELECT COUNT(*) AS n FROM tickets WHERE estado = 'escalado'").n,
                dentro_sla: conRespuesta.length ? dentroSla / conRespuesta.length : null,
                solucion_horas: promedio(resueltos.map((t) => (t.resuelto - t.creado) / HORA)),
                por_categoria: CATEGORIAS.map((c) => ({ categoria: c, total: tks.filter((t) => t.categoria === c).length })).filter((c) => c.total),
            },
            seguimientos_vencidos: uno("SELECT COUNT(*) AS n FROM seguimientos WHERE estado = 'pendiente' AND auto = 0 AND programado <= ?", n).n,
        };
    }));

    app.use('/api', api);
    app.use('/api', (_req, _res, next) => next(new ErrorApi(404, 'Ruta no encontrada.')));

    if (distDir && fs.existsSync(distDir)) {
        app.use(express.static(distDir, { index: false, maxAge: '1h' }));
        app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
    }

    // eslint-disable-next-line no-unused-vars
    app.use((err, _req, res, _next) => {
        if (err instanceof ErrorApi) return res.status(err.status).json({ error: err.message });
        if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON no válido.' });
        if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'El archivo es demasiado grande.' });
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    });

    app.locals.db = db;
    app.locals.procesarVencimientos = procesarVencimientos;
    return app;
}
