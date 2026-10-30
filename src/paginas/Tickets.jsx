import React, { useEffect, useState } from 'react';
import { AlertTriangle, LifeBuoy, Plus, Search } from 'lucide-react';
import { api, relativo } from '../api.js';
import { AvisoError, Encabezado, Insignia, Selector, Vacio, nombreDe, useSesion } from '../ui.jsx';
import { DetalleTicket, NuevoTicket, tonoEstado, tonoPrioridad } from '../modales.jsx';

export default function Tickets() {
    const { catalogos, usuario } = useSesion();
    const [lista, setLista] = useState(null);
    const [filtro, setFiltro] = useState({ estado: 'activos', prioridad: '', categoria: '', q: '', mios: usuario.rol === 'tecnico' });
    const [nuevo, setNuevo] = useState(false);
    const [abierto, setAbierto] = useState(null);
    const [error, setError] = useState('');

    const cargar = () => {
        const p = new URLSearchParams(Object.entries({ ...filtro, mios: filtro.mios ? '1' : '' }).filter(([, v]) => v));
        return api(`/tickets?${p}`).then(setLista).catch((e) => setError(e.message));
    };
    useEffect(() => {
        const id = setTimeout(cargar, 200);
        return () => clearTimeout(id);
    }, [filtro]); // eslint-disable-line react-hooks/exhaustive-deps
    const set = (k) => (v) => setFiltro({ ...filtro, [k]: v });

    return (
        <div>
            <Encabezado titulo="Tickets de soporte" descripcion="Garantías, reclamos y consultas de clientes que ya compraron.">
                <button className="btn-primario" onClick={() => setNuevo(true)}><Plus size={16} aria-hidden="true" /> Nuevo ticket</button>
            </Encabezado>
            <div className="mb-4 flex flex-wrap gap-2">
                <div className="relative min-w-56 flex-1 sm:max-w-xs">
                    <Search size={15} className="absolute left-3 top-2.5 text-stone-400" aria-hidden="true" />
                    <input className="entrada pl-8" placeholder="Código, asunto o cliente" aria-label="Buscar" value={filtro.q} onChange={(e) => set('q')(e.target.value)} />
                </div>
                <div className="w-44"><Selector aria-label="Estado" valor={filtro.estado} alCambiar={set('estado')} vacio="Todos los estados"
                    opciones={[{ valor: 'activos', nombre: 'Activos' }, ...catalogos.ESTADOS_TICKET.map((e) => ({ valor: e.clave, nombre: e.nombre }))]} /></div>
                <div className="w-40"><Selector aria-label="Prioridad" valor={filtro.prioridad} alCambiar={set('prioridad')} vacio="Toda prioridad"
                    opciones={catalogos.PRIORIDADES.map((p) => ({ valor: p.clave, nombre: p.nombre }))} /></div>
                <div className="w-48"><Selector aria-label="Categoría" valor={filtro.categoria} alCambiar={set('categoria')} vacio="Toda categoría" opciones={catalogos.CATEGORIAS} /></div>
                <label className="flex items-center gap-2 px-2 text-sm text-stone-600">
                    <input type="checkbox" checked={filtro.mios} onChange={(e) => set('mios')(e.target.checked)} /> Solo los míos
                </label>
            </div>
            <AvisoError mensaje={error} />

            <div className="tarjeta overflow-hidden">
                {lista === null ? <p className="p-4 text-sm text-stone-500">Cargando…</p> : lista.length === 0 ? (
                    <Vacio icono={LifeBuoy} titulo="Sin tickets">No hay tickets con estos filtros.</Vacio>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs text-stone-500">
                            <tr>
                                <th className="px-4 py-2 font-medium">Ticket</th>
                                <th className="hidden px-4 py-2 font-medium sm:table-cell">Cliente</th>
                                <th className="px-4 py-2 font-medium">Estado</th>
                                <th className="hidden px-4 py-2 font-medium md:table-cell">Responsable</th>
                                <th className="px-4 py-2 text-right font-medium">Plazo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {lista.map((t) => {
                                const activo = ['abierto', 'en_proceso', 'esperando', 'escalado'].includes(t.estado);
                                const plazo = !t.primera_respuesta ? t.plazo_respuesta : t.plazo_solucion;
                                const vencido = t.respuesta_vencida || t.solucion_vencida;
                                return (
                                    <tr key={t.id} className="cursor-pointer hover:bg-stone-50" onClick={() => setAbierto(t.id)}>
                                        <td className="px-4 py-3">
                                            <button className="text-left" onClick={(e) => { e.stopPropagation(); setAbierto(t.id); }}>
                                                <span className="font-medium">{t.codigo}</span> <span className="text-stone-700">{t.asunto}</span>
                                            </button>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                <Insignia tono={tonoPrioridad[t.prioridad]}>{nombreDe(catalogos.PRIORIDADES, t.prioridad)}</Insignia>
                                                <Insignia>{t.categoria}</Insignia>
                                                <span className="text-xs text-stone-500 sm:hidden">{t.contacto_nombre}</span>
                                            </div>
                                        </td>
                                        <td className="hidden px-4 py-3 sm:table-cell">{t.contacto_nombre}</td>
                                        <td className="px-4 py-3"><Insignia tono={tonoEstado[t.estado]}>{nombreDe(catalogos.ESTADOS_TICKET, t.estado)}</Insignia></td>
                                        <td className="hidden px-4 py-3 text-stone-600 md:table-cell">{t.responsable_nombre || '—'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            {activo ? (
                                                <span className={vencido ? 'inline-flex items-center gap-1 font-medium text-red-700' : 'text-stone-600'}>
                                                    {vencido && <AlertTriangle size={14} aria-label="Vencido" />}
                                                    {!t.primera_respuesta ? 'Responder ' : 'Resolver '}{relativo(plazo)}
                                                </span>
                                            ) : <span className="text-stone-400">—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <NuevoTicket abierto={nuevo} alCerrar={() => setNuevo(false)} alGuardar={(t) => { setNuevo(false); cargar(); setAbierto(t.id); }} />
            <DetalleTicket id={abierto} alCerrar={() => setAbierto(null)} alCambiar={cargar} />
        </div>
    );
}
