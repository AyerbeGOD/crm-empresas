// Reglas del negocio sin base de datos: catálogos, teléfonos, plantillas, plazos y CSV.
// Se comparte entre el servidor y las pruebas.

export const ETAPAS = [
    { clave: 'nuevo', nombre: 'Nuevo prospecto' },
    { clave: 'calificado', nombre: 'Calificado' },
    { clave: 'cotizacion', nombre: 'Cotización enviada' },
    { clave: 'separacion', nombre: 'Separación / Negociación' },
    { clave: 'ganado', nombre: 'Venta cerrada' },
    { clave: 'perdido', nombre: 'Perdido' },
];
export const ETAPAS_ABIERTAS = ['nuevo', 'calificado', 'cotizacion', 'separacion'];

export const FUENTES = ['WhatsApp', 'Instagram', 'Facebook', 'Marketplace', 'TikTok', 'Tienda', 'Llamada', 'Referido'];
export const INTERESES = ['Celular nuevo', 'Seminuevo', 'Accesorio', 'Servicio técnico'];
export const FORMAS_PAGO = ['Efectivo', 'Yape/Plin', 'Tarjeta', 'Cuotas', 'Parte de pago'];
export const MOTIVOS_PERDIDA = [
    'Precio alto', 'Sin stock del modelo', 'Compró en otra tienda', 'No respondió',
    'Solo consultaba', 'Sin financiamiento', 'Otro',
];

export const CATEGORIAS = ['Garantía', 'Servicio técnico', 'Consulta de uso', 'Cambio / devolución', 'Reclamo formal'];
export const PRIORIDADES = [
    { clave: 'alta', nombre: 'Alta', respuestaHoras: 1, solucionHoras: 48 },
    { clave: 'media', nombre: 'Media', respuestaHoras: 4, solucionHoras: 120 },
    { clave: 'baja', nombre: 'Baja', respuestaHoras: 24, solucionHoras: 72 },
];
export const ESTADOS_TICKET = [
    { clave: 'abierto', nombre: 'Abierto' },
    { clave: 'en_proceso', nombre: 'En proceso' },
    { clave: 'esperando', nombre: 'Esperando al cliente' },
    { clave: 'escalado', nombre: 'Escalado' },
    { clave: 'resuelto', nombre: 'Resuelto' },
    { clave: 'cerrado', nombre: 'Cerrado' },
];
export const ESTADOS_TICKET_ACTIVOS = ['abierto', 'en_proceso', 'esperando', 'escalado'];
/** Un ticket en "esperando al cliente" sin novedad por estas horas pasa a resuelto. */
export const ESPERA_CLIENTE_HORAS = 72;

export const ROLES = [
    { clave: 'admin', nombre: 'Propietario' },
    { clave: 'encargado', nombre: 'Encargado de tienda' },
    { clave: 'vendedor', nombre: 'Vendedor' },
    { clave: 'tecnico', nombre: 'Técnico' },
];

const HORA = 3600 * 1000;

/** Seguimientos que se programan al entrar a una etapa. `auto` = el sistema lo ejecuta solo al vencer. */
export const REGLAS_SEGUIMIENTO = {
    cotizacion: [
        { tipo: 'seguimiento_24h', horas: 24, plantilla: 'seguimiento_24h' },
        { tipo: 'seguimiento_72h', horas: 72, plantilla: 'seguimiento_72h' },
        { tipo: 'cierre_7d', horas: 24 * 7, plantilla: null, auto: true },
    ],
    ganado: [
        { tipo: 'postventa_gracias', horas: 24, plantilla: 'postventa_gracias' },
        { tipo: 'postventa_accesorios', horas: 24 * 7, plantilla: 'postventa_accesorios' },
        { tipo: 'mantenimiento', horas: 24 * 90, plantilla: 'mantenimiento' },
    ],
};

export const NOMBRES_SEGUIMIENTO = {
    seguimiento_24h: 'Seguimiento de cotización (24 h)',
    seguimiento_72h: 'Seguimiento con incentivo (72 h)',
    cierre_7d: 'Cierre automático por falta de respuesta (7 días)',
    postventa_gracias: 'Agradecimiento y encuesta',
    postventa_accesorios: 'Oferta de accesorios',
    mantenimiento: 'Recordatorio de mantenimiento',
    equipo_listo: 'Equipo listo para recoger',
};

export const PLANTILLAS_INICIALES = [
    {
        clave: 'bienvenida', nombre: 'Bienvenida con menú',
        texto: '¡Hola {nombre}! 👋 Gracias por escribir a {negocio}.\n¿En qué te ayudamos? Responde con un número:\n1️⃣ Celulares\n2️⃣ Accesorios\n3️⃣ Servicio técnico\n4️⃣ Garantía o reclamo',
    },
    {
        clave: 'fuera_horario', nombre: 'Fuera de horario',
        texto: '¡Hola {nombre}! Ahora estamos fuera de horario ({horario}). Te respondemos apenas abramos. Si nos cuentas qué modelo buscas, tendremos la información lista. 📱',
    },
    {
        clave: 'seguimiento_24h', nombre: 'Seguimiento de cotización (24 h)',
        texto: 'Hola {nombre}, ¿pudiste revisar la información del {modelo}? Si tienes alguna duda sobre precio, colores o forma de pago, aquí estoy para ayudarte.',
    },
    {
        clave: 'seguimiento_72h', nombre: 'Seguimiento con incentivo (72 h)',
        texto: '{nombre}, te mantenemos el precio del {modelo} hasta el {fecha}. Si lo llevas esta semana, te regalamos la mica de vidrio templado. 🎁 ¿Te lo reservo?',
    },
    {
        clave: 'postventa_gracias', nombre: 'Agradecimiento y encuesta',
        texto: '¡Gracias por tu compra, {nombre}! Tu {modelo} tiene garantía de {meses} meses; guarda tu comprobante.\n¿Cómo calificarías tu atención del 1 al 5?',
    },
    {
        clave: 'postventa_accesorios', nombre: 'Oferta de accesorios',
        texto: 'Hola {nombre}, ¿qué tal tu {modelo}? Tenemos cases, micas y cargadores rápidos compatibles. Responde "VER" y te enviamos fotos y precios.\nResponde SALIR si no deseas recibir ofertas.',
    },
    {
        clave: 'mantenimiento', nombre: 'Recordatorio de mantenimiento',
        texto: 'Hola {nombre}, ya pasaron 3 meses desde tu compra. Te invitamos a una limpieza y revisión de tu {modelo} en {negocio}. ¡Te esperamos! 🔧',
    },
    {
        clave: 'equipo_listo', nombre: 'Equipo listo para recoger',
        texto: 'Hola {nombre}, tu equipo ya está listo para recoger. 🔧✅\nHorario: {horario}.',
    },
    {
        clave: 'ticket_creado', nombre: 'Ticket registrado',
        texto: 'Registramos tu caso con el código {ticket}. Te responderemos antes de {plazo}.',
    },
];

export const CONFIG_INICIAL = {
    negocio: 'Fonazo',
    horario: 'lunes a sábado de 9:00 a 20:00',
    meses_garantia: '12',
};

/**
 * Normaliza un celular a formato internacional `+51XXXXXXXXX`.
 * Acepta 9 dígitos peruanos (empiezan con 9), con 51 delante, o un número internacional con +.
 * Devuelve null si no es válido.
 */
export function normalizarCelular(valor) {
    const crudo = String(valor ?? '').trim();
    if (!crudo) return null;
    const digitos = crudo.replace(/\D/g, '');
    if (/^9\d{8}$/.test(digitos)) return `+51${digitos}`;
    if (/^519\d{8}$/.test(digitos)) return `+${digitos}`;
    if (crudo.startsWith('+') && digitos.length >= 8 && digitos.length <= 15) return `+${digitos}`;
    return null;
}

export function linkWhatsApp(celular, texto = '') {
    const digitos = String(celular || '').replace(/\D/g, '');
    if (!digitos) return null;
    return `https://wa.me/${digitos}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

/** Reemplaza {variables}; las que no existen se dejan vacías para que no se envíe "{modelo}" al cliente. */
export function renderPlantilla(texto, variables = {}) {
    return String(texto || '')
        .replace(/\{(\w+)\}/g, (_, k) => {
            const v = variables[k];
            return v === undefined || v === null ? '' : String(v);
        })
        .replace(/ {2,}/g, ' ');
}

export const primerNombre = (nombre) => String(nombre || '').trim().split(/\s+/)[0] || '';

export function prioridad(clave) {
    return PRIORIDADES.find((p) => p.clave === clave) || null;
}

/** Plazos de un ticket (ms) según su prioridad y fecha de creación. */
export function plazosTicket(prioridadClave, creadoMs) {
    const p = prioridad(prioridadClave);
    if (!p) throw new Error('Prioridad no válida');
    return {
        plazo_respuesta: creadoMs + p.respuestaHoras * HORA,
        plazo_solucion: creadoMs + p.solucionHoras * HORA,
    };
}

/** Seguimientos a programar cuando una oportunidad entra a `etapa`. */
export function seguimientosPara(etapa, desdeMs) {
    return (REGLAS_SEGUIMIENTO[etapa] || []).map((r) => ({
        tipo: r.tipo,
        plantilla: r.plantilla,
        auto: !!r.auto,
        programado: desdeMs + r.horas * HORA,
    }));
}

export const fechaCorta = (ms) =>
    new Date(ms).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long' });

export const fechaHoraCorta = (ms) =>
    new Date(ms).toLocaleString('es-PE', {
        timeZone: 'America/Lima', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });

/** Lector de CSV (RFC 4180): comillas, comas y saltos de línea dentro de comillas, separador , o ; */
export function parseCSV(texto) {
    const src = String(texto || '').replace(/^﻿/, '');
    const primera = src.split(/\r?\n/, 1)[0] || '';
    const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
    const filas = [];
    let fila = [];
    let campo = '';
    let comillas = false;
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (comillas) {
            if (c === '"') {
                if (src[i + 1] === '"') { campo += '"'; i++; } else comillas = false;
            } else campo += c;
        } else if (c === '"') comillas = true;
        else if (c === sep) { fila.push(campo); campo = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && src[i + 1] === '\n') i++;
            fila.push(campo); campo = '';
            if (fila.some((x) => x.trim() !== '')) filas.push(fila);
            fila = [];
        } else campo += c;
    }
    fila.push(campo);
    if (fila.some((x) => x.trim() !== '')) filas.push(fila);
    if (!filas.length) return [];
    const cab = filas[0].map((h) => h.trim());
    return filas.slice(1).map((f) => Object.fromEntries(cab.map((h, i) => [h, (f[i] ?? '').trim()])));
}

const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Busca un valor de catálogo ignorando mayúsculas y tildes. */
export function enCatalogo(lista, valor) {
    if (!valor) return null;
    const v = sinTildes(valor);
    return lista.find((x) => sinTildes(x) === v) || null;
}

const ALIAS_COLUMNAS = {
    nombre: ['nombre', 'nombre del contacto', 'cliente'],
    celular: ['celular', 'telefono', 'teléfono', 'whatsapp'],
    fuente: ['fuente', 'origen', 'canal'],
    interes: ['interes', 'interés'],
    modelo: ['modelo_interes', 'modelo de interés', 'modelo de interes', 'modelo'],
    presupuesto: ['presupuesto_soles', 'presupuesto (s/)', 'presupuesto'],
    forma_pago: ['forma_pago', 'forma de pago'],
    etapa: ['etapa'],
    etiquetas: ['etiquetas'],
    notas: ['notas', 'nota'],
    acepta_promos: ['acepta promociones', 'acepta_promociones'],
};

/** Convierte una fila de CSV (con nombres de columna flexibles) en datos de contacto y oportunidad. */
export function filaImportacion(fila) {
    const llaves = Object.fromEntries(Object.keys(fila).map((k) => [sinTildes(k), k]));
    const tomar = (campo) => {
        for (const alias of ALIAS_COLUMNAS[campo]) {
            const k = llaves[sinTildes(alias)];
            if (k !== undefined && fila[k] !== '') return fila[k];
        }
        return '';
    };
    const etapaTxt = tomar('etapa');
    const etapa = etapaTxt
        ? (ETAPAS.find((e) => sinTildes(e.nombre) === sinTildes(etapaTxt) || e.clave === sinTildes(etapaTxt))?.clave
            ?? ({ 'logrado con exito': 'ganado', 'venta perdida': 'perdido' })[sinTildes(etapaTxt)]
            ?? null)
        : null;
    const num = (x) => {
        const n = Number(String(x).replace(/[^\d.]/g, ''));
        return Number.isFinite(n) && String(x).trim() !== '' ? n : null;
    };
    return {
        nombre: tomar('nombre'),
        celularTexto: tomar('celular'),
        celular: normalizarCelular(tomar('celular')),
        fuente: enCatalogo(FUENTES, tomar('fuente')),
        interes: enCatalogo(INTERESES, tomar('interes')),
        modelo: tomar('modelo'),
        presupuesto: num(tomar('presupuesto')),
        forma_pago: enCatalogo(FORMAS_PAGO, tomar('forma_pago')),
        etapaTexto: etapaTxt,
        etapa,
        etiquetas: tomar('etiquetas'),
        notas: tomar('notas'),
        acepta_promos: /^(si|sí|1|true|x)$/i.test(tomar('acepta_promos')) ? 1 : 0,
    };
}

export function promedio(valores) {
    const v = valores.filter((x) => Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
