// Cliente de la API con el token de sesión guardado en el navegador.
const CLAVE = 'crm.token';

export const tokenGuardado = () => {
    try {
        return localStorage.getItem(CLAVE);
    } catch {
        return null;
    }
};
export const guardarToken = (t) => {
    try {
        if (t) localStorage.setItem(CLAVE, t);
        else localStorage.removeItem(CLAVE);
    } catch {
        /* navegador sin almacenamiento: la sesión dura lo que la pestaña */
    }
};

let alSalir = () => {};
export const alCerrarSesion = (fn) => { alSalir = fn; };

export async function api(ruta, { metodo = 'GET', cuerpo } = {}) {
    const token = tokenGuardado();
    const r = await fetch(`/api${ruta}`, {
        method: metodo,
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    let datos = null;
    try {
        datos = await r.json();
    } catch {
        datos = null;
    }
    if (r.status === 401 && token) {
        guardarToken(null);
        alSalir();
    }
    if (!r.ok) throw new Error(datos?.error || `Error ${r.status}`);
    return datos;
}

const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 });
export const dinero = (n) => (n === null || n === undefined ? '—' : soles.format(n));
export const porcentaje = (x) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)} %`);
export const fecha = (ms) =>
    ms ? new Date(ms).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fechaHora = (ms) =>
    ms ? new Date(ms).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/** "hace 3 h", "en 2 d": para plazos y antigüedad. */
export function relativo(ms, ahora = Date.now()) {
    if (!ms) return '—';
    const d = ms - ahora;
    const abs = Math.abs(d);
    const min = Math.round(abs / 60000);
    const txt = min < 60 ? `${min} min` : min < 60 * 48 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} d`;
    return d < 0 ? `hace ${txt}` : `en ${txt}`;
}
