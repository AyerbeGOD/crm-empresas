import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crearApp } from '../server/app.mjs';

const HORA = 3600 * 1000;
const DIA = 24 * HORA;

async function iniciar() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-'));
    const reloj = { t: Date.parse('2026-11-02T15:00:00Z') };
    const app = crearApp({ dataDir: dir, ahora: () => reloj.t });
    const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    let token = null;
    const llamar = async (metodo, ruta, cuerpo, tk = token) => {
        const r = await fetch(base + ruta, {
            method: metodo,
            headers: { 'content-type': 'application/json', ...(tk ? { authorization: `Bearer ${tk}` } : {}) },
            body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        });
        const datos = await r.json();
        return { status: r.status, datos };
    };
    const ok = async (...args) => {
        const r = await llamar(...args);
        assert.ok(r.status < 300, `${args[0]} ${args[1]} → ${r.status} ${JSON.stringify(r.datos)}`);
        return r.datos;
    };
    const setup = await ok('POST', '/setup', { nombre: 'Dueño', correo: 'dueno@tienda.pe', clave: 'secreta123', negocio: 'Fonazo' });
    token = setup.token;
    const avanzar = (ms) => { reloj.t += ms; };
    const cerrar = () => new Promise((r) => server.close(() => { fs.rmSync(dir, { recursive: true, force: true }); r(); }));
    return { llamar, ok, avanzar, cerrar, reloj, setToken: (t) => { token = t; } };
}

test('configuración inicial, sesiones y permisos', async () => {
    const s = await iniciar();
    try {
        assert.equal((await s.llamar('POST', '/setup', { nombre: 'X', correo: 'x@x.pe', clave: '12345678' })).status, 409);
        assert.equal((await s.llamar('GET', '/me', undefined, null)).status, 401);
        assert.equal((await s.llamar('POST', '/login', { correo: 'dueno@tienda.pe', clave: 'mala' })).status, 401);
        await s.ok('POST', '/usuarios', { nombre: 'Vale', correo: 'vale@tienda.pe', rol: 'vendedor', clave: 'clave1234' });
        const v = await s.ok('POST', '/login', { correo: 'VALE@tienda.pe', clave: 'clave1234' });
        assert.equal(v.usuario.rol, 'vendedor');
        assert.equal((await s.llamar('GET', '/usuarios', undefined, v.token)).status, 403);
        assert.equal((await s.llamar('POST', '/contactos/importar', { csv: 'nombre\nA' }, v.token)).status, 403);
        const yo = await s.ok('GET', '/me', undefined, v.token);
        assert.equal(yo.config.negocio, 'Fonazo');
        // No se puede dejar el CRM sin propietario.
        assert.equal((await s.llamar('PATCH', '/usuarios/1', { rol: 'vendedor' })).status, 400);
        // Sesión vencida.
        s.avanzar(13 * HORA);
        assert.equal((await s.llamar('GET', '/me', undefined, v.token)).status, 401);
    } finally {
        await s.cerrar();
    }
});

test('contactos: celular único y normalizado', async () => {
    const s = await iniciar();
    try {
        const c = await s.ok('POST', '/contactos', { nombre: 'Ana Ruiz', celular: '987 654 321', fuente: 'tiktok' });
        assert.equal(c.celular, '+51987654321');
        assert.equal(c.fuente, 'TikTok');
        const dup = await s.llamar('POST', '/contactos', { nombre: 'Otra', celular: '+51987654321' });
        assert.equal(dup.status, 409);
        assert.match(dup.datos.error, /Ana Ruiz/);
        assert.equal((await s.llamar('POST', '/contactos', { nombre: 'Mal', celular: '123' })).status, 400);
        assert.equal((await s.llamar('POST', '/contactos', { nombre: 'Mal', celular: '911111111', fuente: 'Radio' })).status, 400);
        const lista = await s.ok('GET', '/contactos?q=654');
        assert.equal(lista.length, 1);
        assert.equal(lista[0].whatsapp, 'https://wa.me/51987654321');
    } finally {
        await s.cerrar();
    }
});

test('pipeline: reparto por turnos, primera respuesta, motivo de pérdida y venta', async () => {
    const s = await iniciar();
    try {
        const v1 = await s.ok('POST', '/usuarios', { nombre: 'V1', correo: 'v1@t.pe', rol: 'vendedor', clave: 'clave1234' });
        const v2 = await s.ok('POST', '/usuarios', { nombre: 'V2', correo: 'v2@t.pe', rol: 'vendedor', clave: 'clave1234' });
        const a = await s.ok('POST', '/oportunidades', { contacto: { nombre: 'Ana', celular: '911111111', fuente: 'WhatsApp' }, interes: 'Celular nuevo', modelo: 'A55', presupuesto: 1200 });
        const b = await s.ok('POST', '/oportunidades', { contacto: { nombre: 'Beto', celular: '922222222' }, modelo: 'Funda' });
        assert.deepEqual([a.responsable_id, b.responsable_id].sort(), [v1.id, v2.id].sort());
        assert.equal(a.etapa, 'nuevo');
        assert.equal(a.titulo, 'A55');

        s.avanzar(10 * 60 * 1000);
        await s.ok('PATCH', `/oportunidades/${a.id}`, { etapa: 'calificado' });
        const perdida = await s.llamar('PATCH', `/oportunidades/${b.id}`, { etapa: 'perdido' });
        assert.equal(perdida.status, 400);
        await s.ok('PATCH', `/oportunidades/${b.id}`, { etapa: 'perdido', motivo_perdida: 'precio alto' });

        const sinMonto = await s.llamar('PATCH', `/oportunidades/${a.id}`, { etapa: 'ganado', valor: 0 });
        assert.equal(sinMonto.status, 400);
        const g = await s.ok('PATCH', `/oportunidades/${a.id}`, { etapa: 'ganado', valor: 1150 });
        assert.ok(g.cerrado);
        const det = await s.ok('GET', `/oportunidades/${a.id}`);
        assert.deepEqual(det.historial.map((h) => h.hacia), ['ganado', 'calificado', 'nuevo']);
        assert.deepEqual(det.seguimientos.map((x) => x.tipo), ['postventa_gracias', 'postventa_accesorios', 'mantenimiento']);

        const k = await s.ok('GET', '/kpis');
        assert.equal(k.ventas.prospectos, 2);
        assert.equal(k.ventas.ganadas, 1);
        assert.equal(k.ventas.monto, 1150);
        assert.equal(k.ventas.conversion, 0.5);
        assert.equal(k.ventas.primera_respuesta_min, 10);
        assert.deepEqual(k.motivos_perdida, [{ motivo: 'Precio alto', total: 1 }]);
    } finally {
        await s.cerrar();
    }
});

test('Flujo B: seguimientos de cotización y cierre automático a los 7 días', async () => {
    const s = await iniciar();
    try {
        const o = await s.ok('POST', '/oportunidades', { contacto: { nombre: 'Carla Mendoza', celular: '933333333' }, modelo: 'Galaxy A55', etapa: 'cotizacion' });
        assert.equal(o.etapa, 'cotizacion');
        assert.equal((await s.ok('GET', '/seguimientos')).length, 0, 'nada vence hoy');
        s.avanzar(25 * HORA);
        const hoy = await s.ok('GET', '/seguimientos');
        assert.equal(hoy.length, 1);
        assert.equal(hoy[0].tipo, 'seguimiento_24h');
        assert.equal(hoy[0].vencido, true);
        assert.match(hoy[0].mensaje.texto, /^Hola Carla, ¿pudiste revisar la información del Galaxy A55\?/);
        assert.match(hoy[0].mensaje.whatsapp, /^https:\/\/wa\.me\/51933333333\?text=Hola%20Carla/);
        await s.ok('POST', `/seguimientos/${hoy[0].id}/hecho`);
        assert.equal((await s.llamar('POST', `/seguimientos/${hoy[0].id}/hecho`)).status, 404);

        s.avanzar(7 * DIA);
        const det = await s.ok('GET', `/oportunidades/${o.id}`);
        assert.equal(det.etapa, 'perdido');
        assert.equal(det.motivo_perdida, 'No respondió');
        const c = await s.ok('GET', `/contactos/${det.contacto_id}`);
        assert.match(c.etiquetas, /Reactivar/);

        // Si el cliente responde, se detienen los seguimientos.
        const o2 = await s.ok('POST', '/oportunidades', { contacto: { nombre: 'Dani', celular: '944444444' }, modelo: 'Redmi', etapa: 'cotizacion' });
        await s.ok('POST', `/oportunidades/${o2.id}/respondido`);
        s.avanzar(8 * DIA);
        const det2 = await s.ok('GET', `/oportunidades/${o2.id}`);
        assert.equal(det2.etapa, 'cotizacion');
        assert.ok(det2.seguimientos.every((x) => x.estado === 'cancelado'));
    } finally {
        await s.cerrar();
    }
});

test('Flujo C: encuesta baja crea ticket de prioridad alta', async () => {
    const s = await iniciar();
    try {
        const enc = await s.ok('POST', '/usuarios', { nombre: 'Enc', correo: 'enc@t.pe', rol: 'encargado', clave: 'clave1234' });
        const o = await s.ok('POST', '/oportunidades', { contacto: { nombre: 'Eva', celular: '955555555' }, modelo: 'iPhone 13', valor: 2500 });
        await s.ok('PATCH', `/oportunidades/${o.id}`, { etapa: 'ganado' });
        const r = await s.ok('PATCH', `/oportunidades/${o.id}`, { satisfaccion: 2 });
        assert.ok(r.ticket_creado);
        const t = await s.ok('GET', `/tickets/${r.ticket_creado}`);
        assert.equal(t.prioridad, 'alta');
        assert.equal(t.responsable_id, enc.id);
        assert.equal(t.codigo, 'T-0001');
        // No se duplica si se vuelve a guardar la misma calificación.
        assert.equal((await s.ok('PATCH', `/oportunidades/${o.id}`, { satisfaccion: 2 })).ticket_creado, null);
        assert.equal((await s.llamar('PATCH', `/oportunidades/${o.id}`, { satisfaccion: 7 })).status, 400);
    } finally {
        await s.cerrar();
    }
});

test('tickets: responsable por categoría, plazos, escalamiento y cierre', async () => {
    const s = await iniciar();
    try {
        const tec = await s.ok('POST', '/usuarios', { nombre: 'Tec', correo: 'tec@t.pe', rol: 'tecnico', clave: 'clave1234' });
        const enc = await s.ok('POST', '/usuarios', { nombre: 'Enc', correo: 'enc@t.pe', rol: 'encargado', clave: 'clave1234' });
        const c = await s.ok('POST', '/contactos', { nombre: 'Rosa', celular: '966666666' });
        const t = await s.ok('POST', '/tickets', { contacto_id: c.id, categoria: 'garantia', prioridad: 'media', asunto: 'Batería dura poco' });
        assert.equal(t.categoria, 'Garantía');
        assert.equal(t.responsable_id, tec.id);
        assert.equal(t.plazo_respuesta - t.creado, 4 * HORA);
        const t2 = await s.ok('POST', '/tickets', { contacto_id: c.id, categoria: 'Consulta de uso', prioridad: 'baja', asunto: 'Pasar contactos' });
        assert.equal(t2.codigo, 'T-0002');

        // Respuesta a tiempo con una nota.
        s.avanzar(HORA);
        await s.ok('PATCH', `/tickets/${t.id}`, { nota: 'Le pedimos traer el equipo', estado: 'en_proceso' });
        // El segundo vence su plazo de respuesta (24 h) y se escala al encargado.
        s.avanzar(25 * HORA);
        const esc = await s.ok('GET', `/tickets/${t2.id}`);
        assert.equal(esc.estado, 'escalado');
        assert.equal(esc.responsable_id, enc.id);
        assert.match(esc.notas[0].texto, /Escalado automáticamente/);

        assert.equal((await s.llamar('PATCH', `/tickets/${t.id}`, { estado: 'resuelto' })).status, 400);
        const res = await s.ok('PATCH', `/tickets/${t.id}`, { estado: 'resuelto', solucion: 'Cambio de batería en garantía' });
        assert.equal(res.estado, 'resuelto');
        const activos = await s.ok('GET', '/tickets?estado=activos');
        assert.deepEqual(activos.map((x) => x.codigo), ['T-0002']);
        const k = await s.ok('GET', '/kpis');
        assert.equal(k.tickets.creados, 2);
        assert.equal(k.tickets.escalados, 1);
        assert.equal(k.tickets.dentro_sla, 0.5);
        assert.equal(k.tickets.solucion_horas, 26);

        // Esperando al cliente más de 72 h → resuelto automático.
        await s.ok('PATCH', `/tickets/${t2.id}`, { estado: 'esperando' });
        s.avanzar(73 * HORA);
        assert.equal((await s.ok('GET', `/tickets/${t2.id}`)).estado, 'resuelto');
    } finally {
        await s.cerrar();
    }
});

test('importación CSV con la plantilla del repositorio', async () => {
    const s = await iniciar();
    try {
        const csv = fs.readFileSync(new URL('../docs/estrategia/plantillas/importacion-contactos.csv', import.meta.url), 'utf8')
            + 'Sin Celular,,Tienda,,,,,,,,\nRepetida,+51900000001,Tienda,Accesorio,Mica,20,Efectivo,Etapa rara,,,\n';
        const r = await s.ok('POST', '/contactos/importar', { csv });
        assert.equal(r.contactos_nuevos, 4);
        assert.equal(r.oportunidades, 4);
        assert.deepEqual(r.errores.map((e) => e.fila), [6, 7]);
        const r2 = await s.ok('POST', '/contactos/importar', { csv: 'nombre,celular,etiquetas\nCarla,900000001,VIP\n' });
        assert.equal(r2.contactos_actualizados, 1);
        const carla = (await s.ok('GET', '/contactos?q=Carla'))[0];
        assert.equal(carla.etiquetas, 'Cliente nuevo, VIP');
        const ops = await s.ok('GET', '/oportunidades');
        assert.deepEqual(ops.map((o) => o.etapa).sort(), ['calificado', 'cotizacion', 'ganado', 'separacion']);
    } finally {
        await s.cerrar();
    }
});
