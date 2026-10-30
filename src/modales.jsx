import React, { useEffect, useState } from 'react';
import { MessageCircle, Star } from 'lucide-react';
import { api, dinero, fechaHora, relativo } from './api.js';
import { AvisoError, Campo, Insignia, Modal, Selector, nombreDe, useAccion, useSesion } from './ui.jsx';

const opcionesUsuarios = (usuarios) => usuarios.map((u) => ({ valor: String(u.id), nombre: u.nombre }));

/** Buscador de cliente existente o alta rápida de uno nuevo. */
function ElegirCliente({ valor, alCambiar }) {
    const { catalogos } = useSesion();
    const [modo, setModo] = useState(valor?.id ? 'existente' : 'nuevo');
    const [q, setQ] = useState('');
    const [lista, setLista] = useState([]);
    useEffect(() => {
        if (modo !== 'existente' || q.length < 2) return setLista([]);
        const id = setTimeout(() => api(`/contactos?q=${encodeURIComponent(q)}`).then(setLista).catch(() => {}), 250);
        return () => clearTimeout(id);
    }, [q, modo]);

    if (valor?.id) {
        return (
            <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                <span><b>{valor.nombre}</b> · {valor.celular}</span>
                <button type="button" className="text-marca-600 hover:underline" onClick={() => alCambiar(null)}>Cambiar</button>
            </div>
        );
    }
    return (
        <div className="space-y-2">
            <div className="flex gap-1 rounded-lg bg-stone-100 p-1 text-sm" role="tablist">
                {[['nuevo', 'Cliente nuevo'], ['existente', 'Ya registrado']].map(([k, n]) => (
                    <button key={k} type="button" role="tab" aria-selected={modo === k}
                        className={`flex-1 rounded-md py-1 ${modo === k ? 'bg-white font-medium shadow-sm' : 'text-stone-600'}`}
                        onClick={() => { setModo(k); alCambiar(k === 'nuevo' ? { nuevo: true } : null); }}>{n}</button>
                ))}
            </div>
            {modo === 'existente' ? (
                <div>
                    <input className="entrada" placeholder="Busca por nombre o celular" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
                    {lista.length > 0 && (
                        <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-stone-200">
                            {lista.map((c) => (
                                <li key={c.id}>
                                    <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50" onClick={() => alCambiar(c)}>
                                        {c.nombre} <span className="text-stone-500">· {c.celular}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    <Campo etiqueta="Nombre"><input className="entrada" required value={valor?.nombre || ''} onChange={(e) => alCambiar({ ...valor, nuevo: true, nombre: e.target.value })} /></Campo>
                    <Campo etiqueta="Celular"><input className="entrada" required inputMode="tel" placeholder="9XXXXXXXX" value={valor?.celular || ''} onChange={(e) => alCambiar({ ...valor, nuevo: true, celular: e.target.value })} /></Campo>
                    <Campo etiqueta="Fuente" className="col-span-2">
                        <Selector valor={valor?.fuente} alCambiar={(v) => alCambiar({ ...valor, nuevo: true, fuente: v })} opciones={catalogos.FUENTES} />
                    </Campo>
                </div>
            )}
        </div>
    );
}

/** Crear una oportunidad nueva. */
export function NuevaOportunidad({ abierto, alCerrar, alGuardar, contacto = null }) {
    const { catalogos, usuarios } = useSesion();
    const inicial = { interes: '', modelo: '', presupuesto: '', forma_pago: '', etapa: 'nuevo', responsable_id: '' };
    const [cliente, setCliente] = useState(contacto || { nuevo: true });
    const [f, setF] = useState(inicial);
    const { cargando, error, ejecutar } = useAccion();
    useEffect(() => { if (abierto) { setCliente(contacto || { nuevo: true }); setF(inicial); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
    const set = (k) => (v) => setF({ ...f, [k]: v });
    const enviar = (e) => {
        e.preventDefault();
        ejecutar(async () => {
            const cuerpo = { ...f, responsable_id: f.responsable_id || null };
            if (cliente?.id) cuerpo.contacto_id = cliente.id;
            else cuerpo.contacto = { nombre: cliente?.nombre, celular: cliente?.celular, fuente: cliente?.fuente || null };
            const r = await api('/oportunidades', { metodo: 'POST', cuerpo });
            alGuardar(r);
        });
    };
    return (
        <Modal titulo="Nuevo prospecto" abierto={abierto} alCerrar={alCerrar}>
            <form onSubmit={enviar} className="space-y-4">
                <ElegirCliente valor={cliente} alCambiar={setCliente} />
                <div className="grid grid-cols-2 gap-3">
                    <Campo etiqueta="Interés"><Selector valor={f.interes} alCambiar={set('interes')} opciones={catalogos.INTERESES} /></Campo>
                    <Campo etiqueta="Modelo de interés"><input className="entrada" value={f.modelo} placeholder="Galaxy A55 128 GB" onChange={(e) => set('modelo')(e.target.value)} /></Campo>
                    <Campo etiqueta="Presupuesto (S/)"><input className="entrada" type="number" min="0" step="1" value={f.presupuesto} onChange={(e) => set('presupuesto')(e.target.value)} /></Campo>
                    <Campo etiqueta="Forma de pago"><Selector valor={f.forma_pago} alCambiar={set('forma_pago')} opciones={catalogos.FORMAS_PAGO} /></Campo>
                    <Campo etiqueta="Etapa">
                        <Selector valor={f.etapa} alCambiar={set('etapa')} vacio={null}
                            opciones={catalogos.ETAPAS.filter((e) => !['ganado', 'perdido'].includes(e.clave)).map((e) => ({ valor: e.clave, nombre: e.nombre }))} />
                    </Campo>
                    <Campo etiqueta="Responsable">
                        <Selector valor={f.responsable_id} alCambiar={set('responsable_id')} vacio="Automático (por turnos)" opciones={opcionesUsuarios(usuarios)} />
                    </Campo>
                </div>
                <AvisoError mensaje={error} />
                <div className="flex justify-end gap-2">
                    <button type="button" className="btn-secundario" onClick={alCerrar}>Cancelar</button>
                    <button className="btn-primario" disabled={cargando}>Guardar</button>
                </div>
            </form>
        </Modal>
    );
}

const PLANTILLAS_POR_ETAPA = {
    nuevo: ['bienvenida', 'fuera_horario'],
    calificado: ['seguimiento_24h'],
    cotizacion: ['seguimiento_24h', 'seguimiento_72h'],
    separacion: ['seguimiento_72h'],
    ganado: ['postventa_gracias', 'postventa_accesorios', 'equipo_listo'],
    perdido: ['seguimiento_72h'],
};

/** Detalle y edición de una oportunidad. */
export function DetalleOportunidad({ id, alCerrar, alCambiar }) {
    const { catalogos, usuarios } = useSesion();
    const [op, setOp] = useState(null);
    const [f, setF] = useState({});
    const [cierre, setCierre] = useState(null); // 'ganado' | 'perdido'
    const [aviso, setAviso] = useState('');
    const { cargando, error, ejecutar, setError } = useAccion();

    const cargar = async () => {
        const o = await api(`/oportunidades/${id}`);
        setOp(o);
        setF({
            titulo: o.titulo, interes: o.interes || '', modelo: o.modelo, presupuesto: o.presupuesto ?? '', valor: o.valor ?? '',
            forma_pago: o.forma_pago || '', responsable_id: o.responsable_id ? String(o.responsable_id) : '',
            fecha_recojo: o.fecha_recojo || '', comprobante: o.comprobante,
        });
    };
    useEffect(() => { if (id) { setOp(null); setCierre(null); setAviso(''); setError(''); cargar().catch((e) => setError(e.message)); } }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
    const set = (k) => (v) => setF({ ...f, [k]: v });

    const guardar = (extra = {}) => ejecutar(async () => {
        const r = await api(`/oportunidades/${id}`, { metodo: 'PATCH', cuerpo: { ...f, responsable_id: f.responsable_id || null, ...extra } });
        if (r.ticket_creado) setAviso('Calificación baja: se creó un ticket de prioridad alta para el encargado.');
        await cargar();
        setCierre(null);
        alCambiar?.();
    });
    const moverA = (etapa) => (etapa === 'ganado' || etapa === 'perdido' ? setCierre(etapa) : guardar({ etapa }));
    const respondio = () => ejecutar(async () => { await api(`/oportunidades/${id}/respondido`, { metodo: 'POST' }); await cargar(); alCambiar?.(); });
    const abrirWhatsApp = (plantilla) => ejecutar(async () => {
        const m = await api(`/oportunidades/${id}/mensaje/${plantilla}`);
        window.open(m.whatsapp, '_blank', 'noopener');
    });

    const pendientes = op?.seguimientos.filter((s) => s.estado === 'pendiente') || [];
    return (
        <Modal titulo={op ? op.titulo : 'Oportunidad'} abierto={!!id} alCerrar={alCerrar} ancho="max-w-2xl">
            {!op ? <p className="text-sm text-stone-500">{error || 'Cargando…'}</p> : (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <a className="font-medium text-marca-700 hover:underline" href={`#/contactos/${op.contacto_id}`} onClick={alCerrar}>{op.contacto_nombre}</a>
                        <span className="text-stone-500">{op.contacto_celular}</span>
                        {op.contacto_fuente && <Insignia>{op.contacto_fuente}</Insignia>}
                        <Insignia tono={op.etapa === 'ganado' ? 'verde' : op.etapa === 'perdido' ? 'rojo' : 'azul'}>{nombreDe(catalogos.ETAPAS, op.etapa)}</Insignia>
                        {op.motivo_perdida && <Insignia tono="rojo">{op.motivo_perdida}</Insignia>}
                    </div>

                    <div>
                        <p className="etiqueta">Mover a</p>
                        <div className="flex flex-wrap gap-1.5">
                            {catalogos.ETAPAS.filter((e) => e.clave !== op.etapa).map((e) => (
                                <button key={e.clave} type="button" disabled={cargando}
                                    className={e.clave === 'ganado' ? 'btn bg-emerald-600 py-1.5 text-white hover:bg-emerald-700' : e.clave === 'perdido' ? 'btn-peligro py-1.5' : 'btn-secundario py-1.5'}
                                    onClick={() => moverA(e.clave)}>{e.nombre}</button>
                            ))}
                        </div>
                        {cierre === 'perdido' && (
                            <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-red-50 p-3">
                                <Campo etiqueta="Motivo de pérdida (obligatorio)" className="min-w-48 flex-1">
                                    <Selector valor={f.motivo} alCambiar={set('motivo')} opciones={catalogos.MOTIVOS_PERDIDA} />
                                </Campo>
                                <button className="btn bg-red-600 text-white hover:bg-red-700" disabled={!f.motivo || cargando} onClick={() => guardar({ etapa: 'perdido', motivo_perdida: f.motivo })}>Marcar perdido</button>
                                <button className="btn-secundario" onClick={() => setCierre(null)}>Cancelar</button>
                            </div>
                        )}
                        {cierre === 'ganado' && (
                            <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-emerald-50 p-3">
                                <Campo etiqueta="Monto vendido (S/)" className="w-36">
                                    <input className="entrada" type="number" min="1" value={f.valor} onChange={(e) => set('valor')(e.target.value)} />
                                </Campo>
                                <Campo etiqueta="N.º comprobante" className="min-w-36 flex-1">
                                    <input className="entrada" value={f.comprobante} onChange={(e) => set('comprobante')(e.target.value)} />
                                </Campo>
                                <button className="btn bg-emerald-600 text-white hover:bg-emerald-700" disabled={!(Number(f.valor) > 0) || cargando} onClick={() => guardar({ etapa: 'ganado' })}>Cerrar venta</button>
                                <button className="btn-secundario" onClick={() => setCierre(null)}>Cancelar</button>
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="etiqueta">Escribir por WhatsApp</p>
                        <div className="flex flex-wrap gap-1.5">
                            {(PLANTILLAS_POR_ETAPA[op.etapa] || []).map((p) => (
                                <button key={p} type="button" className="btn-whatsapp py-1.5" onClick={() => abrirWhatsApp(p)}>
                                    <MessageCircle size={15} aria-hidden="true" /> {catalogos.NOMBRES_SEGUIMIENTO[p] || { bienvenida: 'Bienvenida', fuera_horario: 'Fuera de horario' }[p]}
                                </button>
                            ))}
                            <a className="btn-secundario py-1.5" href={`https://wa.me/${op.contacto_celular.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">Chat vacío</a>
                        </div>
                    </div>

                    {pendientes.length > 0 && (
                        <div className="rounded-lg border border-marca-100 bg-marca-50 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-medium text-marca-700">Seguimientos programados</p>
                                {op.etapa === 'cotizacion' && <button className="btn-secundario py-1" onClick={respondio} disabled={cargando}>El cliente respondió</button>}
                            </div>
                            <ul className="mt-2 space-y-1 text-sm">
                                {pendientes.map((s) => (
                                    <li key={s.id} className="flex justify-between gap-2">
                                        <span>{catalogos.NOMBRES_SEGUIMIENTO[s.tipo]}</span>
                                        <span className="text-stone-500">{relativo(s.programado)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {op.etapa === 'ganado' && (
                        <div>
                            <p className="etiqueta">Encuesta postventa (1 a 5)</p>
                            <div className="flex gap-1" role="radiogroup" aria-label="Calificación del cliente">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button key={n} type="button" role="radio" aria-checked={op.satisfaccion === n}
                                        className={`btn px-2.5 py-1.5 ${op.satisfaccion === n ? 'bg-amber-100 text-amber-900' : 'border border-stone-300 bg-white'}`}
                                        onClick={() => guardar({ satisfaccion: n })} disabled={cargando}>
                                        <Star size={14} aria-hidden="true" /> {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {aviso && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{aviso}</p>}

                    <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
                        <Campo etiqueta="Título" className="col-span-2"><input className="entrada" value={f.titulo} onChange={(e) => set('titulo')(e.target.value)} /></Campo>
                        <Campo etiqueta="Interés"><Selector valor={f.interes} alCambiar={set('interes')} opciones={catalogos.INTERESES} /></Campo>
                        <Campo etiqueta="Modelo"><input className="entrada" value={f.modelo} onChange={(e) => set('modelo')(e.target.value)} /></Campo>
                        <Campo etiqueta="Presupuesto (S/)"><input className="entrada" type="number" min="0" value={f.presupuesto} onChange={(e) => set('presupuesto')(e.target.value)} /></Campo>
                        <Campo etiqueta="Valor de la venta (S/)"><input className="entrada" type="number" min="0" value={f.valor} onChange={(e) => set('valor')(e.target.value)} /></Campo>
                        <Campo etiqueta="Forma de pago"><Selector valor={f.forma_pago} alCambiar={set('forma_pago')} opciones={catalogos.FORMAS_PAGO} /></Campo>
                        <Campo etiqueta="Responsable"><Selector valor={f.responsable_id} alCambiar={set('responsable_id')} vacio="Sin asignar" opciones={opcionesUsuarios(usuarios)} /></Campo>
                        <Campo etiqueta="Fecha de recojo (separación)"><input className="entrada" type="date" value={f.fecha_recojo} onChange={(e) => set('fecha_recojo')(e.target.value)} /></Campo>
                        <Campo etiqueta="N.º comprobante"><input className="entrada" value={f.comprobante} onChange={(e) => set('comprobante')(e.target.value)} /></Campo>
                        <div className="col-span-2"><AvisoError mensaje={error} /></div>
                        <div className="col-span-2 flex justify-end"><button className="btn-primario" disabled={cargando}>Guardar cambios</button></div>
                    </form>

                    <div>
                        <p className="etiqueta">Historial</p>
                        <ol className="space-y-1.5 border-l border-stone-200 pl-4 text-sm">
                            {op.historial.map((h) => (
                                <li key={h.id}>
                                    <span className="font-medium">{h.desde === h.hacia ? (h.nota || 'Nota') : nombreDe(catalogos.ETAPAS, h.hacia)}</span>
                                    {h.desde !== h.hacia && h.nota && <span className="text-stone-500"> · {h.nota}</span>}
                                    <span className="text-stone-500"> · {fechaHora(h.fecha)}{h.usuario_nombre ? ` · ${h.usuario_nombre}` : ' · Sistema'}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}
        </Modal>
    );
}

export const tonoPrioridad = { alta: 'rojo', media: 'ambar', baja: 'gris' };
export const tonoEstado = { abierto: 'azul', en_proceso: 'azul', esperando: 'gris', escalado: 'rojo', resuelto: 'verde', cerrado: 'gris' };

/** Crear un ticket de soporte. */
export function NuevoTicket({ abierto, alCerrar, alGuardar, contacto = null }) {
    const { catalogos, usuarios } = useSesion();
    const inicial = { categoria: '', prioridad: 'media', asunto: '', descripcion: '', producto: '', comprobante: '', canal: 'WhatsApp', responsable_id: '' };
    const [cliente, setCliente] = useState(contacto);
    const [f, setF] = useState(inicial);
    const { cargando, error, ejecutar } = useAccion();
    useEffect(() => { if (abierto) { setCliente(contacto); setF(inicial); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
    const set = (k) => (v) => setF({ ...f, [k]: v, ...(k === 'categoria' && v === 'Reclamo formal' ? { prioridad: 'alta' } : {}) });
    const enviar = (e) => {
        e.preventDefault();
        ejecutar(async () => {
            let contactoId = cliente?.id;
            if (!contactoId) {
                const c = await api('/contactos', { metodo: 'POST', cuerpo: { nombre: cliente?.nombre, celular: cliente?.celular, fuente: cliente?.fuente || null } });
                contactoId = c.id;
            }
            alGuardar(await api('/tickets', { metodo: 'POST', cuerpo: { ...f, contacto_id: contactoId, responsable_id: f.responsable_id || null } }));
        });
    };
    const prio = catalogos.PRIORIDADES.find((p) => p.clave === f.prioridad);
    return (
        <Modal titulo="Nuevo ticket" abierto={abierto} alCerrar={alCerrar}>
            <form onSubmit={enviar} className="space-y-4">
                <ElegirCliente valor={cliente || { nuevo: true }} alCambiar={setCliente} />
                <div className="grid grid-cols-2 gap-3">
                    <Campo etiqueta="Categoría"><Selector required valor={f.categoria} alCambiar={set('categoria')} opciones={catalogos.CATEGORIAS} /></Campo>
                    <Campo etiqueta="Prioridad">
                        <Selector valor={f.prioridad} alCambiar={set('prioridad')} vacio={null} opciones={catalogos.PRIORIDADES.map((p) => ({ valor: p.clave, nombre: p.nombre }))} />
                    </Campo>
                    <Campo etiqueta="Asunto" className="col-span-2"><input className="entrada" required value={f.asunto} placeholder="La batería dura menos de medio día" onChange={(e) => set('asunto')(e.target.value)} /></Campo>
                    <Campo etiqueta="Descripción" className="col-span-2"><textarea className="entrada" rows={3} value={f.descripcion} onChange={(e) => set('descripcion')(e.target.value)} /></Campo>
                    <Campo etiqueta="Producto / IMEI"><input className="entrada" value={f.producto} onChange={(e) => set('producto')(e.target.value)} /></Campo>
                    <Campo etiqueta="Comprobante u orden"><input className="entrada" value={f.comprobante} onChange={(e) => set('comprobante')(e.target.value)} /></Campo>
                    <Campo etiqueta="Canal"><Selector valor={f.canal} alCambiar={set('canal')} vacio={null} opciones={['WhatsApp', 'Instagram', 'Facebook', 'Tienda', 'Llamada', 'Libro de Reclamaciones']} /></Campo>
                    <Campo etiqueta="Responsable"><Selector valor={f.responsable_id} alCambiar={set('responsable_id')} vacio="Según categoría" opciones={opcionesUsuarios(usuarios)} /></Campo>
                </div>
                {prio && <p className="text-xs text-stone-500">Plazo: primera respuesta en {prio.respuestaHoras} h y solución en {prio.solucionHoras} h.</p>}
                <AvisoError mensaje={error} />
                <div className="flex justify-end gap-2">
                    <button type="button" className="btn-secundario" onClick={alCerrar}>Cancelar</button>
                    <button className="btn-primario" disabled={cargando}>Crear ticket</button>
                </div>
            </form>
        </Modal>
    );
}

/** Detalle de un ticket con notas, cambio de estado y solución. */
export function DetalleTicket({ id, alCerrar, alCambiar }) {
    const { catalogos, usuarios } = useSesion();
    const [t, setT] = useState(null);
    const [nota, setNota] = useState('');
    const [solucion, setSolucion] = useState('');
    const { cargando, error, ejecutar, setError } = useAccion();
    const cargar = async () => {
        const x = await api(`/tickets/${id}`);
        setT(x);
        setSolucion(x.solucion);
    };
    useEffect(() => { if (id) { setT(null); setNota(''); setError(''); cargar().catch((e) => setError(e.message)); } }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
    const actualizar = (cuerpo) => ejecutar(async () => {
        await api(`/tickets/${id}`, { metodo: 'PATCH', cuerpo });
        setNota('');
        await cargar();
        alCambiar?.();
    });
    return (
        <Modal titulo={t ? `${t.codigo} · ${t.asunto}` : 'Ticket'} abierto={!!id} alCerrar={alCerrar} ancho="max-w-2xl">
            {!t ? <p className="text-sm text-stone-500">{error || 'Cargando…'}</p> : (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <a className="font-medium text-marca-700 hover:underline" href={`#/contactos/${t.contacto_id}`} onClick={alCerrar}>{t.contacto_nombre}</a>
                        <span className="text-stone-500">{t.contacto_celular}</span>
                        <Insignia tono={tonoPrioridad[t.prioridad]}>Prioridad {nombreDe(catalogos.PRIORIDADES, t.prioridad).toLowerCase()}</Insignia>
                        <Insignia tono={tonoEstado[t.estado]}>{nombreDe(catalogos.ESTADOS_TICKET, t.estado)}</Insignia>
                        <Insignia>{t.categoria}</Insignia>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 rounded-lg bg-stone-50 p-3 text-sm sm:grid-cols-4">
                        <div><dt className="text-xs text-stone-500">Creado</dt><dd>{fechaHora(t.creado)}</dd></div>
                        <div><dt className="text-xs text-stone-500">Responder antes de</dt><dd className={t.respuesta_vencida ? 'font-medium text-red-700' : ''}>{t.primera_respuesta ? `Respondido ${fechaHora(t.primera_respuesta)}` : fechaHora(t.plazo_respuesta)}</dd></div>
                        <div><dt className="text-xs text-stone-500">Resolver antes de</dt><dd className={t.solucion_vencida ? 'font-medium text-red-700' : ''}>{fechaHora(t.plazo_solucion)}</dd></div>
                        <div><dt className="text-xs text-stone-500">Producto</dt><dd>{t.producto || '—'}</dd></div>
                    </dl>
                    {t.descripcion && <p className="whitespace-pre-line text-sm">{t.descripcion}</p>}

                    <div className="flex flex-wrap gap-1.5">
                        <a className="btn-whatsapp py-1.5" href={t.mensaje_creado?.whatsapp} target="_blank" rel="noopener noreferrer">
                            <MessageCircle size={15} aria-hidden="true" /> Avisar código y plazo
                        </a>
                        <a className="btn-secundario py-1.5" href={t.whatsapp} target="_blank" rel="noopener noreferrer">Chat vacío</a>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Campo etiqueta="Estado">
                            <Selector valor={t.estado} vacio={null} disabled={cargando}
                                alCambiar={(v) => (['resuelto', 'cerrado'].includes(v) && !solucion.trim() ? setError('Escribe la solución aplicada antes de resolver.') : actualizar({ estado: v, solucion }))}
                                opciones={catalogos.ESTADOS_TICKET.map((e) => ({ valor: e.clave, nombre: e.nombre }))} />
                        </Campo>
                        <Campo etiqueta="Prioridad">
                            <Selector valor={t.prioridad} vacio={null} disabled={cargando} alCambiar={(v) => actualizar({ prioridad: v })}
                                opciones={catalogos.PRIORIDADES.map((p) => ({ valor: p.clave, nombre: p.nombre }))} />
                        </Campo>
                        <Campo etiqueta="Responsable">
                            <Selector valor={t.responsable_id ? String(t.responsable_id) : ''} vacio="Sin asignar" disabled={cargando}
                                alCambiar={(v) => actualizar({ responsable_id: v || null })} opciones={opcionesUsuarios(usuarios)} />
                        </Campo>
                        <Campo etiqueta="¿Cliente conforme?">
                            <Selector valor={t.conforme === null ? '' : String(t.conforme)} vacio="Sin confirmar" disabled={cargando}
                                alCambiar={(v) => actualizar({ conforme: v === '' ? null : v === '1' })} opciones={[{ valor: '1', nombre: 'Sí' }, { valor: '0', nombre: 'No' }]} />
                        </Campo>
                        <Campo etiqueta="Solución aplicada" className="col-span-2">
                            <textarea className="entrada" rows={2} value={solucion} onChange={(e) => setSolucion(e.target.value)} onBlur={() => solucion !== t.solucion && actualizar({ solucion })} />
                        </Campo>
                    </div>

                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (nota.trim()) actualizar({ nota }); }}>
                        <input className="entrada" placeholder="Agregar nota o respuesta al cliente…" value={nota} onChange={(e) => setNota(e.target.value)} />
                        <button className="btn-primario" disabled={cargando || !nota.trim()}>Agregar</button>
                    </form>
                    <AvisoError mensaje={error} />
                    <ol className="space-y-2 border-l border-stone-200 pl-4 text-sm">
                        {t.notas.map((n) => (
                            <li key={n.id}>
                                <p>{n.texto}</p>
                                <p className="text-xs text-stone-500">{fechaHora(n.fecha)} · {n.usuario_nombre || 'Sistema'}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </Modal>
    );
}

export { dinero };
