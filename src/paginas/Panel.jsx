import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bell } from 'lucide-react';
import { api, dinero, porcentaje } from '../api.js';
import { AvisoError, Encabezado } from '../ui.jsx';

const RANGOS = [
    { dias: 7, nombre: '7 días' },
    { dias: 30, nombre: '30 días' },
    { dias: 90, nombre: '90 días' },
];
const hoyLima = (offsetDias = 0) =>
    new Date(Date.now() - offsetDias * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

export default function Panel() {
    const [dias, setDias] = useState(30);
    const [k, setK] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        setError('');
        api(`/kpis?desde=${hoyLima(dias - 1)}&hasta=${hoyLima()}`).then(setK).catch((e) => setError(e.message));
    }, [dias]);

    return (
        <div className="mx-auto max-w-6xl">
            <Encabezado titulo="Panel" descripcion="Indicadores de ventas y atención. Los prospectos y tickets se cuentan por fecha de creación.">
                <div className="flex gap-1 rounded-lg bg-stone-100 p-1 text-sm" role="tablist" aria-label="Periodo">
                    {RANGOS.map((r) => (
                        <button key={r.dias} role="tab" aria-selected={dias === r.dias}
                            className={`rounded-md px-3 py-1 ${dias === r.dias ? 'bg-white font-medium shadow-sm' : 'text-stone-600'}`}
                            onClick={() => setDias(r.dias)}>{r.nombre}</button>
                    ))}
                </div>
            </Encabezado>
            <AvisoError mensaje={error} />
            {!k ? <p className="text-sm text-stone-500">Cargando…</p> : (
                <div className="space-y-5">
                    {(k.seguimientos_vencidos > 0 || k.tickets.escalados > 0) && (
                        <div className="flex flex-wrap gap-2">
                            {k.seguimientos_vencidos > 0 && (
                                <a href="#/seguimientos" className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 hover:bg-amber-100">
                                    <Bell size={15} aria-hidden="true" /> {k.seguimientos_vencidos} seguimientos por enviar hoy
                                </a>
                            )}
                            {k.tickets.escalados > 0 && (
                                <a href="#/tickets" className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 hover:bg-red-100">
                                    <AlertTriangle size={15} aria-hidden="true" /> {k.tickets.escalados} tickets escalados por plazo vencido
                                </a>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Indicador titulo="Ventas cerradas" valor={dinero(k.ventas.monto)} detalle={`${k.ventas.ganadas} ventas · ticket promedio ${dinero(k.ventas.ticket_promedio)}`} />
                        <Indicador titulo="Conversión" valor={porcentaje(k.ventas.conversion)} detalle={`${k.ventas.prospectos} prospectos nuevos`} />
                        <Indicador titulo="Primera respuesta" valor={minutos(k.ventas.primera_respuesta_min)}
                            detalle={k.ventas.respondidas_15min === null ? 'Meta: menos de 15 min' : `${porcentaje(k.ventas.respondidas_15min)} en menos de 15 min`} />
                        <Indicador titulo="Satisfacción" valor={k.ventas.satisfaccion === null ? '—' : `${k.ventas.satisfaccion.toFixed(1)} / 5`}
                            detalle={`${k.ventas.encuestas} encuestas · ${k.ventas.recuperadas} ventas tras seguimiento`} />
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <Grafico titulo="Prospectos por canal" subtitulo="Conversión y monto vendido de cada fuente"
                            filas={k.por_fuente.map((f) => ({ etiqueta: f.fuente, valor: f.prospectos, texto: `${f.prospectos}`, detalle: `${f.ventas} ventas · ${porcentaje(f.conversion)} · ${dinero(f.monto)}` }))}
                            vacio="Aún no hay prospectos en este periodo." />
                        <Grafico titulo="Pipeline actual" subtitulo="Oportunidades abiertas por etapa (valor estimado)"
                            filas={k.embudo.map((e) => ({ etiqueta: e.nombre, valor: e.total, texto: `${e.total}`, detalle: dinero(e.valor) }))}
                            vacio="No hay oportunidades abiertas." />
                        <Columnas titulo="Ventas por semana" subtitulo="Monto cerrado en las últimas 8 semanas" filas={k.ventas_semanales} />
                        <Grafico titulo="Motivos de pérdida" subtitulo="Qué ajustar en precios y stock"
                            filas={k.motivos_perdida.map((m) => ({ etiqueta: m.motivo, valor: m.total, texto: `${m.total}` }))}
                            vacio="Sin oportunidades perdidas en este periodo." />
                    </div>

                    <h2 className="pt-2 font-semibold">Atención al cliente</h2>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Indicador titulo="Tickets activos" valor={k.tickets.activos} detalle={`${k.tickets.creados} creados en el periodo`} />
                        <Indicador titulo="Respondidos a tiempo" valor={porcentaje(k.tickets.dentro_sla)} detalle="Meta: más de 90 %" />
                        <Indicador titulo="Tiempo de solución" valor={k.tickets.solucion_horas === null ? '—' : `${Math.round(k.tickets.solucion_horas)} h`} detalle="Promedio · meta: menos de 48 h" />
                        <Indicador titulo="Escalados" valor={k.tickets.escalados} detalle="Plazo vencido, ahora con el encargado" />
                    </div>
                    <Grafico titulo="Tickets por categoría" subtitulo="Creados en el periodo"
                        filas={k.tickets.por_categoria.map((c) => ({ etiqueta: c.categoria, valor: c.total, texto: `${c.total}` }))}
                        vacio="Sin tickets en este periodo." />
                </div>
            )}
        </div>
    );
}

const minutos = (m) => (m === null ? '—' : m < 60 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`);

function Indicador({ titulo, valor, detalle }) {
    return (
        <div className="tarjeta p-4">
            <p className="text-xs font-medium text-stone-500">{titulo}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{valor}</p>
            {detalle && <p className="mt-1 text-xs text-stone-500">{detalle}</p>}
        </div>
    );
}

/** Barras horizontales de una sola serie: cada fila lleva su valor a la derecha y el detalle en el tooltip. */
function Grafico({ titulo, subtitulo, filas, vacio }) {
    const max = Math.max(1, ...filas.map((f) => f.valor));
    const [hover, setHover] = useState(null);
    return (
        <figure className="tarjeta p-4">
            <figcaption className="mb-3">
                <p className="text-sm font-semibold">{titulo}</p>
                {subtitulo && <p className="text-xs text-stone-500">{subtitulo}</p>}
            </figcaption>
            {filas.length === 0 ? <p className="py-6 text-center text-sm text-stone-500">{vacio}</p> : (
                <ul className="space-y-1">
                    {filas.map((f, i) => (
                        <li key={f.etiqueta}
                            tabIndex={0}
                            className="group relative grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 rounded-md px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-marca-100"
                            onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
                            onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                            aria-label={`${f.etiqueta}: ${f.texto}${f.detalle ? `, ${f.detalle}` : ''}`}>
                            <span className="truncate text-xs text-stone-600">{f.etiqueta}</span>
                            <span className="h-3.5 rounded-r bg-stone-100">
                                <span className="block h-full rounded-r-[4px] bg-[#2a78d6] transition-[width]" style={{ width: `${Math.max(2, (f.valor / max) * 100)}%`, opacity: hover === null || hover === i ? 1 : 0.55 }} />
                            </span>
                            <span className="w-8 text-right text-xs font-medium tabular-nums text-stone-800">{f.texto}</span>
                            {hover === i && f.detalle && (
                                <span role="tooltip" className="pointer-events-none absolute -top-8 left-32 z-10 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 text-xs text-white shadow">
                                    <b>{f.texto}</b> · {f.detalle}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </figure>
    );
}

/** Columnas verticales de una sola serie con eje de base y tooltip por columna. */
function Columnas({ titulo, subtitulo, filas }) {
    const max = Math.max(1, ...filas.map((f) => f.monto));
    const [hover, setHover] = useState(null);
    const total = filas.reduce((a, f) => a + f.monto, 0);
    return (
        <figure className="tarjeta p-4">
            <figcaption className="mb-3 flex items-baseline justify-between gap-2">
                <span>
                    <span className="block text-sm font-semibold">{titulo}</span>
                    {subtitulo && <span className="block text-xs text-stone-500">{subtitulo}</span>}
                </span>
                <span className="text-xs text-stone-500">Total {dinero(total)}</span>
            </figcaption>
            <div className="relative flex h-40 items-end gap-1.5 border-b border-stone-300 pt-6">
                {filas.map((f, i) => (
                    <div key={f.semana} tabIndex={0} className="relative flex h-full flex-1 flex-col justify-end outline-none focus-visible:ring-2 focus-visible:ring-marca-100"
                        onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                        aria-label={`Semana del ${f.semana}: ${dinero(f.monto)}, ${f.ventas} ventas`}>
                        <div className="rounded-t-[4px] bg-[#2a78d6] transition-[height]" style={{ height: `${f.monto ? Math.max(2, (f.monto / max) * 100) : 0}%`, opacity: hover === null || hover === i ? 1 : 0.55 }} />
                        {hover === i && (
                            <span role="tooltip" className={`pointer-events-none absolute -top-7 z-10 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 text-xs text-white shadow ${i > filas.length / 2 ? 'right-0' : 'left-0'}`}>
                                <b>{dinero(f.monto)}</b> · {f.ventas} ventas · sem. {f.semana}
                            </span>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-1 flex gap-1.5">
                {filas.map((f, i) => (
                    <span key={f.semana} className="flex-1 truncate text-center text-[10px] text-stone-500">{i % 2 === 1 || i === filas.length - 1 ? f.semana : ''}</span>
                ))}
            </div>
        </figure>
    );
}
