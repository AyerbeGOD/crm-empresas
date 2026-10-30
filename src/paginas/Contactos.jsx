import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, Plus, Search, Upload, Users } from 'lucide-react';
import { api, dinero, fecha } from '../api.js';
import { AvisoError, Campo, Encabezado, Insignia, Modal, Selector, Vacio, nombreDe, useAccion, useSesion } from '../ui.jsx';
import { DetalleOportunidad, DetalleTicket, NuevaOportunidad, NuevoTicket, tonoEstado } from '../modales.jsx';

const idDeRuta = () => Number(window.location.hash.split('/')[2]) || null;

export default function Contactos() {
    const [id, setId] = useState(idDeRuta());
    useEffect(() => {
        const f = () => setId(idDeRuta());
        window.addEventListener('hashchange', f);
        return () => window.removeEventListener('hashchange', f);
    }, []);
    return id ? <FichaCliente id={id} /> : <ListaClientes />;
}

function ListaClientes() {
    const { catalogos, usuario } = useSesion();
    const [lista, setLista] = useState(null);
    const [q, setQ] = useState('');
    const [fuente, setFuente] = useState('');
    const [editar, setEditar] = useState(null);
    const [importar, setImportar] = useState(false);
    const [error, setError] = useState('');
    const cargar = () => api(`/contactos?q=${encodeURIComponent(q)}${fuente ? `&fuente=${encodeURIComponent(fuente)}` : ''}`).then(setLista).catch((e) => setError(e.message));
    useEffect(() => {
        const id = setTimeout(cargar, 200);
        return () => clearTimeout(id);
    }, [q, fuente]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <Encabezado titulo="Clientes" descripcion="Un registro por celular. Aquí está el historial de compras y tickets de cada uno.">
                {['admin', 'encargado'].includes(usuario.rol) && (
                    <button className="btn-secundario" onClick={() => setImportar(true)}><Upload size={16} aria-hidden="true" /> Importar CSV</button>
                )}
                <button className="btn-primario" onClick={() => setEditar({})}><Plus size={16} aria-hidden="true" /> Nuevo cliente</button>
            </Encabezado>
            <div className="mb-4 flex flex-wrap gap-2">
                <div className="relative min-w-56 flex-1 sm:max-w-xs">
                    <Search size={15} className="absolute left-3 top-2.5 text-stone-400" aria-hidden="true" />
                    <input className="entrada pl-8" placeholder="Nombre, celular o etiqueta" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <div className="w-44"><Selector aria-label="Fuente" valor={fuente} alCambiar={setFuente} vacio="Todas las fuentes" opciones={catalogos.FUENTES} /></div>
            </div>
            <AvisoError mensaje={error} />
            <div className="tarjeta overflow-hidden">
                {lista === null ? <p className="p-4 text-sm text-stone-500">Cargando…</p> : lista.length === 0 ? (
                    <Vacio icono={Users} titulo="Sin clientes">Registra uno nuevo o importa tu Excel guardado como CSV.</Vacio>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs text-stone-500">
                            <tr>
                                <th className="px-4 py-2 font-medium">Cliente</th>
                                <th className="hidden px-4 py-2 font-medium sm:table-cell">Fuente</th>
                                <th className="px-4 py-2 text-right font-medium">Compras</th>
                                <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Total</th>
                                <th className="px-4 py-2"><span className="sr-only">WhatsApp</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {lista.map((c) => (
                                <tr key={c.id} className="hover:bg-stone-50">
                                    <td className="px-4 py-3">
                                        <a className="font-medium hover:underline" href={`#/contactos/${c.id}`}>{c.nombre}</a>
                                        <p className="text-xs text-stone-500">{c.celular}</p>
                                        {(c.etiquetas || c.tickets_abiertos > 0) && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {c.etiquetas.split(',').filter((x) => x.trim()).map((e) => <Insignia key={e} tono="azul">{e.trim()}</Insignia>)}
                                                {c.tickets_abiertos > 0 && <Insignia tono="ambar">{c.tickets_abiertos} ticket abierto</Insignia>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="hidden px-4 py-3 text-stone-600 sm:table-cell">{c.fuente || '—'}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{c.compras}</td>
                                    <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">{dinero(c.total_comprado)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <a className="inline-flex rounded-lg p-1.5 text-[#1f8f4e] hover:bg-emerald-50" href={c.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${c.nombre}`}>
                                            <MessageCircle size={18} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <EditarCliente cliente={editar} alCerrar={() => setEditar(null)} alGuardar={(c) => { setEditar(null); window.location.hash = `#/contactos/${c.id}`; }} />
            <ImportarCSV abierto={importar} alCerrar={() => setImportar(false)} alTerminar={cargar} />
        </div>
    );
}

function EditarCliente({ cliente, alCerrar, alGuardar }) {
    const { catalogos } = useSesion();
    const [f, setF] = useState({});
    const { cargando, error, ejecutar } = useAccion();
    useEffect(() => {
        if (cliente) setF({ nombre: '', celular: '', fuente: '', etiquetas: '', notas: '', acepta_promos: false, ...cliente, acepta_promos: !!cliente.acepta_promos });
    }, [cliente]);
    const set = (k) => (v) => setF({ ...f, [k]: v });
    const enviar = (e) => {
        e.preventDefault();
        ejecutar(async () => {
            const cuerpo = { nombre: f.nombre, celular: f.celular, fuente: f.fuente || null, etiquetas: f.etiquetas, notas: f.notas, acepta_promos: f.acepta_promos };
            alGuardar(await api(cliente.id ? `/contactos/${cliente.id}` : '/contactos', { metodo: cliente.id ? 'PATCH' : 'POST', cuerpo }));
        });
    };
    return (
        <Modal titulo={cliente?.id ? 'Editar cliente' : 'Nuevo cliente'} abierto={!!cliente} alCerrar={alCerrar}>
            <form onSubmit={enviar} className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Nombre" className="col-span-2"><input className="entrada" required value={f.nombre || ''} onChange={(e) => set('nombre')(e.target.value)} /></Campo>
                <Campo etiqueta="Celular (WhatsApp)"><input className="entrada" required inputMode="tel" placeholder="9XXXXXXXX" value={f.celular || ''} onChange={(e) => set('celular')(e.target.value)} /></Campo>
                <Campo etiqueta="Fuente"><Selector valor={f.fuente} alCambiar={set('fuente')} opciones={catalogos.FUENTES} /></Campo>
                <Campo etiqueta="Etiquetas (separadas por coma)" className="col-span-2"><input className="entrada" value={f.etiquetas || ''} placeholder="VIP, Referido" onChange={(e) => set('etiquetas')(e.target.value)} /></Campo>
                <Campo etiqueta="Notas" className="col-span-2"><textarea className="entrada" rows={3} value={f.notas || ''} onChange={(e) => set('notas')(e.target.value)} /></Campo>
                <label className="col-span-2 flex items-center gap-2 text-sm text-stone-600">
                    <input type="checkbox" checked={!!f.acepta_promos} onChange={(e) => set('acepta_promos')(e.target.checked)} /> Acepta recibir promociones por WhatsApp
                </label>
                <div className="col-span-2"><AvisoError mensaje={error} /></div>
                <div className="col-span-2 flex justify-end gap-2">
                    <button type="button" className="btn-secundario" onClick={alCerrar}>Cancelar</button>
                    <button className="btn-primario" disabled={cargando}>Guardar</button>
                </div>
            </form>
        </Modal>
    );
}

function ImportarCSV({ abierto, alCerrar, alTerminar }) {
    const [archivo, setArchivo] = useState(null);
    const [resultado, setResultado] = useState(null);
    const { cargando, error, ejecutar } = useAccion();
    useEffect(() => { if (abierto) { setArchivo(null); setResultado(null); } }, [abierto]);
    const enviar = (e) => {
        e.preventDefault();
        ejecutar(async () => {
            const csv = await archivo.text();
            setResultado(await api('/contactos/importar', { metodo: 'POST', cuerpo: { csv } }));
            alTerminar();
        });
    };
    return (
        <Modal titulo="Importar clientes desde CSV" abierto={abierto} alCerrar={alCerrar}>
            {resultado ? (
                <div className="space-y-3 text-sm">
                    <p><b>{resultado.contactos_nuevos}</b> clientes nuevos, <b>{resultado.contactos_actualizados}</b> actualizados y <b>{resultado.oportunidades}</b> oportunidades creadas.</p>
                    {resultado.errores.length > 0 && (
                        <div className="rounded-lg bg-amber-50 p-3">
                            <p className="font-medium text-amber-900">{resultado.errores.length} filas no se importaron:</p>
                            <ul className="mt-1 list-inside list-disc text-amber-900">
                                {resultado.errores.slice(0, 20).map((x) => <li key={x.fila}>Fila {x.fila}: {x.motivo}</li>)}
                            </ul>
                        </div>
                    )}
                    <div className="flex justify-end"><button className="btn-primario" onClick={alCerrar}>Listo</button></div>
                </div>
            ) : (
                <form onSubmit={enviar} className="space-y-4 text-sm">
                    <p className="text-stone-600">
                        Guarda tu Excel como <b>CSV</b> con estas columnas (las que no tengas pueden ir vacías):
                    </p>
                    <code className="block overflow-x-auto whitespace-nowrap rounded-lg bg-stone-100 p-2 text-xs">nombre,celular,fuente,interes,modelo_interes,presupuesto_soles,forma_pago,etapa,etiquetas,notas</code>
                    <p className="text-stone-600">Si el celular ya existe, se completa el cliente en vez de duplicarlo.</p>
                    <input type="file" accept=".csv,text/csv" required onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="block w-full text-sm" />
                    <AvisoError mensaje={error} />
                    <div className="flex justify-end gap-2">
                        <button type="button" className="btn-secundario" onClick={alCerrar}>Cancelar</button>
                        <button className="btn-primario" disabled={!archivo || cargando}>{cargando ? 'Importando…' : 'Importar'}</button>
                    </div>
                </form>
            )}
        </Modal>
    );
}

function FichaCliente({ id }) {
    const { catalogos, usuario } = useSesion();
    const [c, setC] = useState(null);
    const [editar, setEditar] = useState(null);
    const [nuevaOp, setNuevaOp] = useState(false);
    const [nuevoTk, setNuevoTk] = useState(false);
    const [op, setOp] = useState(null);
    const [tk, setTk] = useState(null);
    const [error, setError] = useState('');
    const cargar = () => api(`/contactos/${id}`).then(setC).catch((e) => setError(e.message));
    useEffect(() => { setC(null); cargar(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
    const eliminar = async () => {
        if (!window.confirm(`¿Eliminar a ${c.nombre} con todo su historial? No se puede deshacer.`)) return;
        try {
            await api(`/contactos/${id}`, { metodo: 'DELETE' });
            window.location.hash = '#/contactos';
        } catch (e) {
            setError(e.message);
        }
    };

    if (!c) return <p className="text-sm text-stone-500">{error || 'Cargando…'}</p>;
    const ganadas = c.oportunidades.filter((o) => o.etapa === 'ganado');
    return (
        <div className="mx-auto max-w-4xl">
            <a href="#/contactos" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft size={15} aria-hidden="true" /> Clientes</a>
            <Encabezado titulo={c.nombre} descripcion={`${c.celular}${c.fuente ? ` · llegó por ${c.fuente}` : ''} · cliente desde ${fecha(c.creado)}`}>
                <a className="btn-whatsapp" href={c.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" /> WhatsApp</a>
                <button className="btn-secundario" onClick={() => setEditar(c)}>Editar</button>
                {usuario.rol === 'admin' && <button className="btn-peligro" onClick={eliminar}>Eliminar</button>}
            </Encabezado>
            <AvisoError mensaje={error} />
            <div className="mb-5 grid grid-cols-3 gap-3">
                <div className="tarjeta p-4"><p className="text-xs text-stone-500">Compras</p><p className="text-2xl font-semibold tabular-nums">{ganadas.length}</p></div>
                <div className="tarjeta p-4"><p className="text-xs text-stone-500">Total comprado</p><p className="text-2xl font-semibold tabular-nums">{dinero(ganadas.reduce((a, o) => a + (o.valor || 0), 0))}</p></div>
                <div className="tarjeta p-4"><p className="text-xs text-stone-500">Promociones</p><p className="mt-1.5 text-sm font-medium">{c.acepta_promos ? 'Acepta' : 'No acepta'}</p></div>
            </div>
            {(c.etiquetas || c.notas) && (
                <div className="tarjeta mb-5 space-y-2 p-4 text-sm">
                    {c.etiquetas && <div className="flex flex-wrap gap-1">{c.etiquetas.split(',').filter((x) => x.trim()).map((e) => <Insignia key={e} tono="azul">{e.trim()}</Insignia>)}</div>}
                    {c.notas && <p className="whitespace-pre-line text-stone-700">{c.notas}</p>}
                </div>
            )}

            <section className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-semibold">Oportunidades</h2>
                    <button className="btn-secundario py-1.5" onClick={() => setNuevaOp(true)}><Plus size={15} aria-hidden="true" /> Nueva</button>
                </div>
                <div className="tarjeta divide-y divide-stone-100">
                    {c.oportunidades.length === 0 && <p className="p-4 text-sm text-stone-500">Sin oportunidades.</p>}
                    {c.oportunidades.map((o) => (
                        <button key={o.id} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-stone-50" onClick={() => setOp(o.id)}>
                            <span><span className="font-medium">{o.titulo}</span> <span className="text-sm text-stone-500">· {fecha(o.creado)}</span></span>
                            <span className="flex items-center gap-2 text-sm">
                                {(o.valor ?? o.presupuesto) != null && dinero(o.valor ?? o.presupuesto)}
                                <Insignia tono={o.etapa === 'ganado' ? 'verde' : o.etapa === 'perdido' ? 'rojo' : 'azul'}>{nombreDe(catalogos.ETAPAS, o.etapa)}</Insignia>
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-semibold">Tickets</h2>
                    <button className="btn-secundario py-1.5" onClick={() => setNuevoTk(true)}><Plus size={15} aria-hidden="true" /> Nuevo</button>
                </div>
                <div className="tarjeta divide-y divide-stone-100">
                    {c.tickets.length === 0 && <p className="p-4 text-sm text-stone-500">Sin tickets.</p>}
                    {c.tickets.map((t) => (
                        <button key={t.id} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-stone-50" onClick={() => setTk(t.id)}>
                            <span><span className="font-medium">{t.codigo}</span> {t.asunto}</span>
                            <Insignia tono={tonoEstado[t.estado]}>{nombreDe(catalogos.ESTADOS_TICKET, t.estado)}</Insignia>
                        </button>
                    ))}
                </div>
            </section>

            <EditarCliente cliente={editar} alCerrar={() => setEditar(null)} alGuardar={() => { setEditar(null); cargar(); }} />
            <NuevaOportunidad abierto={nuevaOp} contacto={c} alCerrar={() => setNuevaOp(false)} alGuardar={() => { setNuevaOp(false); cargar(); }} />
            <NuevoTicket abierto={nuevoTk} contacto={c} alCerrar={() => setNuevoTk(false)} alGuardar={(t) => { setNuevoTk(false); cargar(); setTk(t.id); }} />
            <DetalleOportunidad id={op} alCerrar={() => setOp(null)} alCambiar={cargar} />
            <DetalleTicket id={tk} alCerrar={() => setTk(null)} alCambiar={cargar} />
        </div>
    );
}
