import React, { createContext, useContext, useEffect, useState } from 'react';
import { X } from 'lucide-react';

export const Sesion = createContext(null);
export const useSesion = () => useContext(Sesion);

export function Modal({ titulo, abierto, alCerrar, children, ancho = 'max-w-lg' }) {
    useEffect(() => {
        if (!abierto) return undefined;
        const tecla = (e) => e.key === 'Escape' && alCerrar();
        window.addEventListener('keydown', tecla);
        return () => window.removeEventListener('keydown', tecla);
    }, [abierto, alCerrar]);
    if (!abierto) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 sm:items-center sm:p-4" onMouseDown={alCerrar}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={titulo}
                className={`max-h-[92vh] w-full ${ancho} overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3">
                    <h2 className="text-base font-semibold">{titulo}</h2>
                    <button className="rounded-lg p-1 text-stone-500 hover:bg-stone-100" onClick={alCerrar} aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

export function Campo({ etiqueta, children, className = '' }) {
    return (
        <label className={`block ${className}`}>
            <span className="etiqueta">{etiqueta}</span>
            {children}
        </label>
    );
}

export function Selector({ valor, alCambiar, opciones, vacio = 'Elegir…', ...resto }) {
    return (
        <select className="entrada" value={valor ?? ''} onChange={(e) => alCambiar(e.target.value)} {...resto}>
            {vacio !== null && <option value="">{vacio}</option>}
            {opciones.map((o) => {
                const v = typeof o === 'string' ? o : o.valor;
                const n = typeof o === 'string' ? o : o.nombre;
                return <option key={v} value={v}>{n}</option>;
            })}
        </select>
    );
}

const TONOS = {
    gris: 'bg-stone-100 text-stone-700',
    azul: 'bg-marca-50 text-marca-700',
    verde: 'bg-emerald-50 text-emerald-800',
    ambar: 'bg-amber-50 text-amber-800',
    rojo: 'bg-red-50 text-red-700',
};
export function Insignia({ tono = 'gris', children, icono: Icono }) {
    return (
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONOS[tono]}`}>
            {Icono && <Icono size={12} aria-hidden="true" />}
            {children}
        </span>
    );
}

export function AvisoError({ mensaje }) {
    if (!mensaje) return null;
    return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensaje}</p>;
}

export function Vacio({ icono: Icono, titulo, children }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            {Icono && <Icono size={32} className="mb-3 text-stone-300" aria-hidden="true" />}
            <p className="font-medium text-stone-700">{titulo}</p>
            {children && <div className="mt-1 max-w-sm text-sm text-stone-500">{children}</div>}
        </div>
    );
}

export function Encabezado({ titulo, descripcion, children }) {
    return (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
                {descripcion && <p className="mt-0.5 text-sm text-stone-500">{descripcion}</p>}
            </div>
            {children && <div className="flex flex-wrap gap-2">{children}</div>}
        </div>
    );
}

/** Ejecuta una acción async con estado de carga y error. */
export function useAccion() {
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const ejecutar = async (fn) => {
        setCargando(true);
        setError('');
        try {
            return await fn();
        } catch (e) {
            setError(e.message);
            return undefined;
        } finally {
            setCargando(false);
        }
    };
    return { cargando, error, setError, ejecutar };
}

export const nombreDe = (lista, clave) => lista.find((x) => x.clave === clave)?.nombre ?? clave;
