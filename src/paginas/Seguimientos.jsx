import React, { useEffect, useState } from 'react';
import { Bell, Check, MessageCircle, SkipForward } from 'lucide-react';
import { api } from '../api.js';
import { AvisoError, Encabezado, Insignia, Vacio, useSesion } from '../ui.jsx';
import { DetalleOportunidad } from '../modales.jsx';

export default function Seguimientos() {
    const { usuario } = useSesion();
    const [lista, setLista] = useState(null);
    const [mios, setMios] = useState(usuario.rol === 'vendedor');
    const [proximos, setProximos] = useState(false);
    const [abierta, setAbierta] = useState(null);
    const [error, setError] = useState('');

    const cargar = () => api(`/seguimientos?mios=${mios ? 1 : 0}&dias=${proximos ? 7 : 0}`).then(setLista).catch((e) => setError(e.message));
    useEffect(() => { cargar(); }, [mios, proximos]); // eslint-disable-line react-hooks/exhaustive-deps

    const marcar = async (s, accion) => {
        try {
            await api(`/seguimientos/${s.id}/${accion}`, { metodo: 'POST' });
            setLista((l) => l.filter((x) => x.id !== s.id));
        } catch (e) {
            setError(e.message);
        }
    };
    const enviar = (s) => {
        window.open(s.mensaje.whatsapp, '_blank', 'noopener');
        marcar(s, 'hecho');
    };

    return (
        <div className="mx-auto max-w-3xl">
            <Encabezado titulo="Seguimientos" descripcion="Mensajes que toca enviar hoy: cotizaciones sin respuesta y postventa." />
            <div className="mb-4 flex flex-wrap gap-2 text-sm">
                <div className="flex gap-1 rounded-lg bg-stone-100 p-1" role="tablist">
                    {[[false, 'Para hoy'], [true, 'Próximos 7 días']].map(([v, n]) => (
                        <button key={n} role="tab" aria-selected={proximos === v} className={`rounded-md px-3 py-1 ${proximos === v ? 'bg-white font-medium shadow-sm' : 'text-stone-600'}`} onClick={() => setProximos(v)}>{n}</button>
                    ))}
                </div>
                <label className="flex items-center gap-2 px-2 text-stone-600">
                    <input type="checkbox" checked={mios} onChange={(e) => setMios(e.target.checked)} /> Solo los míos
                </label>
            </div>
            <AvisoError mensaje={error} />
            {lista === null ? <p className="text-sm text-stone-500">Cargando…</p> : lista.length === 0 ? (
                <div className="tarjeta"><Vacio icono={Bell} titulo="Todo al día">No hay seguimientos pendientes {proximos ? 'esta semana' : 'para hoy'}.</Vacio></div>
            ) : (
                <ul className="space-y-3">
                    {lista.map((s) => (
                        <li key={s.id} className="tarjeta p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <button className="text-left font-medium hover:underline" onClick={() => setAbierta(s.oportunidad_id)}>{s.contacto_nombre} · {s.titulo}</button>
                                    <p className="text-sm text-stone-600">{s.nombre}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {s.vencido ? <Insignia tono="ambar">Toca hoy</Insignia> : <Insignia>{s.cuando}</Insignia>}
                                    {s.responsable_nombre && <Insignia>{s.responsable_nombre}</Insignia>}
                                </div>
                            </div>
                            {s.mensaje && <p className="mt-3 whitespace-pre-line rounded-lg bg-stone-50 p-3 text-sm text-stone-700">{s.mensaje.texto}</p>}
                            <div className="mt-3 flex flex-wrap gap-2">
                                {s.mensaje && <button className="btn-whatsapp" onClick={() => enviar(s)}><MessageCircle size={15} aria-hidden="true" /> Enviar por WhatsApp</button>}
                                <button className="btn-secundario" onClick={() => marcar(s, 'hecho')}><Check size={15} aria-hidden="true" /> Ya lo hice</button>
                                <button className="btn-secundario" onClick={() => marcar(s, 'omitir')}><SkipForward size={15} aria-hidden="true" /> Omitir</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <p className="mt-4 text-xs text-stone-500">Si una cotización pasa 7 días sin respuesta, el sistema la mueve a «Perdido · No respondió» y etiqueta al cliente para reactivarlo.</p>
            <DetalleOportunidad id={abierta} alCerrar={() => setAbierta(null)} alCambiar={cargar} />
        </div>
    );
}
