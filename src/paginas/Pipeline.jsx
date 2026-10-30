import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Plus, Search } from 'lucide-react';
import { api, dinero, relativo } from '../api.js';
import { AvisoError, Encabezado, Insignia, Selector, useSesion } from '../ui.jsx';
import { DetalleOportunidad, NuevaOportunidad } from '../modales.jsx';

/** Plazo máximo recomendado en cada etapa (documento 1 de la estrategia). */
const LIMITE_HORAS = { nuevo: 0.25, calificado: 2, cotizacion: 24 * 7, separacion: 24 * 3 };

export default function Pipeline() {
    const { catalogos, usuarios, usuario } = useSesion();
    const [ops, setOps] = useState(null);
    const [q, setQ] = useState('');
    const [resp, setResp] = useState(usuario.rol === 'vendedor' ? String(usuario.id) : '');
    const [nuevo, setNuevo] = useState(false);
    const [abierta, setAbierta] = useState(null);
    const [arrastrando, setArrastrando] = useState(null);
    const [error, setError] = useState('');

    const cargar = () => {
        const p = new URLSearchParams();
        if (q) p.set('q', q);
        if (resp) p.set('responsable', resp);
        return api(`/oportunidades?${p}`).then(setOps).catch((e) => setError(e.message));
    };
    useEffect(() => {
        const id = setTimeout(cargar, 200);
        return () => clearTimeout(id);
    }, [q, resp]); // eslint-disable-line react-hooks/exhaustive-deps

    const columnas = useMemo(() => catalogos.ETAPAS.map((e) => {
        const lista = (ops || []).filter((o) => o.etapa === e.clave);
        return { ...e, lista, valor: lista.reduce((a, o) => a + (o.valor ?? o.presupuesto ?? 0), 0) };
    }), [ops, catalogos]);

    const soltar = async (etapa) => {
        const op = ops.find((o) => o.id === arrastrando);
        setArrastrando(null);
        if (!op || op.etapa === etapa) return;
        // Ganar o perder pide datos (monto o motivo): se abre el detalle.
        if (etapa === 'ganado' || etapa === 'perdido') return setAbierta(op.id);
        setOps(ops.map((o) => (o.id === op.id ? { ...o, etapa, etapa_desde: Date.now() } : o)));
        try {
            await api(`/oportunidades/${op.id}`, { metodo: 'PATCH', cuerpo: { etapa } });
        } catch (e) {
            setError(e.message);
        }
        cargar();
        return undefined;
    };

    return (
        <div>
            <Encabezado titulo="Pipeline de ventas" descripcion="Arrastra las tarjetas entre etapas o ábrelas para ver el detalle.">
                <button className="btn-primario" onClick={() => setNuevo(true)}><Plus size={16} aria-hidden="true" /> Nuevo prospecto</button>
            </Encabezado>
            <div className="mb-4 flex flex-wrap gap-2">
                <div className="relative min-w-56 flex-1 sm:max-w-xs">
                    <Search size={15} className="absolute left-3 top-2.5 text-stone-400" aria-hidden="true" />
                    <input className="entrada pl-8" placeholder="Buscar cliente o modelo" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <div className="w-48">
                    <Selector aria-label="Responsable" valor={resp} alCambiar={setResp} vacio="Todo el equipo" opciones={usuarios.map((u) => ({ valor: String(u.id), nombre: u.nombre }))} />
                </div>
            </div>
            <AvisoError mensaje={error} />

            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
                {columnas.map((col) => (
                    <section
                        key={col.clave}
                        aria-label={col.nombre}
                        className={`flex w-72 shrink-0 snap-start flex-col rounded-xl border bg-stone-100/70 ${arrastrando ? 'border-dashed border-marca-500/40' : 'border-transparent'}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => soltar(col.clave)}
                    >
                        <header className="flex items-baseline justify-between px-3 pb-2 pt-3">
                            <h2 className="text-sm font-semibold">{col.nombre} <span className="font-normal text-stone-500">{col.lista.length}</span></h2>
                            <span className="text-xs text-stone-500">{dinero(col.valor)}</span>
                        </header>
                        <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                            {ops === null && <p className="px-1 text-xs text-stone-500">Cargando…</p>}
                            {col.lista.map((o) => {
                                const horas = (Date.now() - o.etapa_desde) / 3.6e6;
                                const atrasada = LIMITE_HORAS[o.etapa] && horas > LIMITE_HORAS[o.etapa];
                                return (
                                    <button
                                        key={o.id}
                                        draggable
                                        onDragStart={() => setArrastrando(o.id)}
                                        onDragEnd={() => setArrastrando(null)}
                                        onClick={() => setAbierta(o.id)}
                                        className="tarjeta w-full cursor-grab p-3 text-left shadow-sm transition hover:border-marca-500/50 active:cursor-grabbing"
                                    >
                                        <p className="truncate text-sm font-medium">{o.contacto_nombre}</p>
                                        <p className="truncate text-sm text-stone-600">{o.titulo}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            {(o.valor ?? o.presupuesto) != null && <span className="text-xs font-medium">{dinero(o.valor ?? o.presupuesto)}</span>}
                                            {o.contacto_fuente && <Insignia>{o.contacto_fuente}</Insignia>}
                                            {o.motivo_perdida && <Insignia tono="rojo">{o.motivo_perdida}</Insignia>}
                                            {atrasada && <Insignia tono="ambar" icono={Clock}>{relativo(o.etapa_desde)}</Insignia>}
                                        </div>
                                        {o.responsable_nombre && <p className="mt-1.5 text-xs text-stone-500">{o.responsable_nombre}</p>}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
            <p className="text-xs text-stone-500">Las ventas cerradas y perdidas se muestran durante 30 días.</p>

            <NuevaOportunidad abierto={nuevo} alCerrar={() => setNuevo(false)} alGuardar={() => { setNuevo(false); cargar(); }} />
            <DetalleOportunidad id={abierta} alCerrar={() => setAbierta(null)} alCambiar={cargar} />
        </div>
    );
}
