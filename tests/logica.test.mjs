import test from 'node:test';
import assert from 'node:assert/strict';
import {
    filaImportacion, linkWhatsApp, normalizarCelular, parseCSV, plazosTicket, renderPlantilla, seguimientosPara,
} from '../server/logica.mjs';

test('normaliza celulares peruanos e internacionales', () => {
    assert.equal(normalizarCelular('987 654 321'), '+51987654321');
    assert.equal(normalizarCelular('+51 987-654-321'), '+51987654321');
    assert.equal(normalizarCelular('51987654321'), '+51987654321');
    assert.equal(normalizarCelular('+1 305 555 0101'), '+13055550101');
    assert.equal(normalizarCelular('12345'), null);
    assert.equal(normalizarCelular('053 481234'), null);
    assert.equal(normalizarCelular(''), null);
});

test('arma enlaces de WhatsApp con texto codificado', () => {
    assert.equal(linkWhatsApp('+51987654321', 'Hola Ana & cía'), 'https://wa.me/51987654321?text=Hola%20Ana%20%26%20c%C3%ADa');
    assert.equal(linkWhatsApp('+51987654321'), 'https://wa.me/51987654321');
});

test('las plantillas reemplazan variables y no dejan llaves sueltas', () => {
    assert.equal(renderPlantilla('Hola {nombre}, tu {modelo}', { nombre: 'Ana' }), 'Hola Ana, tu ');
});

test('plazos de ticket según prioridad', () => {
    const p = plazosTicket('alta', 0);
    assert.equal(p.plazo_respuesta, 3600_000);
    assert.equal(p.plazo_solucion, 48 * 3600_000);
    assert.throws(() => plazosTicket('urgente', 0));
});

test('seguimientos de cotización y de postventa', () => {
    assert.deepEqual(seguimientosPara('cotizacion', 0).map((s) => s.programado / 3600_000), [24, 72, 168]);
    assert.equal(seguimientosPara('cotizacion', 0)[2].auto, true);
    assert.deepEqual(seguimientosPara('ganado', 0).map((s) => s.tipo), ['postventa_gracias', 'postventa_accesorios', 'mantenimiento']);
    assert.deepEqual(seguimientosPara('calificado', 0), []);
});

test('CSV con comillas, saltos de línea, punto y coma y BOM', () => {
    const filas = parseCSV('﻿nombre;notas\r\n"Pérez; Ana";"dijo ""hola""\nluego"\r\n\r\nLuis;ok\n');
    assert.deepEqual(filas, [{ nombre: 'Pérez; Ana', notas: 'dijo "hola"\nluego' }, { nombre: 'Luis', notas: 'ok' }]);
});

test('lee la plantilla de importación y también columnas estilo Kommo', () => {
    const propia = filaImportacion({
        nombre: 'Carla', celular: '+51900000001', fuente: 'instagram', interes: 'Celular nuevo',
        modelo_interes: 'A55', presupuesto_soles: '1,200', forma_pago: 'cuotas', etapa: 'Cotización enviada',
    });
    assert.equal(propia.fuente, 'Instagram');
    assert.equal(propia.presupuesto, 1200);
    assert.equal(propia.forma_pago, 'Cuotas');
    assert.equal(propia.etapa, 'cotizacion');
    const kommo = filaImportacion({ 'Nombre del contacto': 'Luis', 'Teléfono': '900000002', Etapa: 'Logrado con éxito', 'Acepta promociones': 'Sí' });
    assert.equal(kommo.celular, '+51900000002');
    assert.equal(kommo.etapa, 'ganado');
    assert.equal(kommo.acepta_promos, 1);
    assert.equal(filaImportacion({ nombre: 'X', celular: '900000003', etapa: 'Inventada' }).etapa, null);
});
