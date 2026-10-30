import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../api.js';
import { AvisoError, Campo, Encabezado, Insignia, Modal, Selector, nombreDe, useAccion, useSesion } from '../ui.jsx';

export default function Ajustes() {
    const { usuario } = useSesion();
    if (usuario.rol !== 'admin') {
        return (
            <div className="mx-auto max-w-3xl">
                <Encabezado titulo="Ajustes" />
                <Plantillas soloLectura />
            </div>
        );
    }
    return (
        <div className="mx-auto max-w-3xl space-y-8">
            <Encabezado titulo="Ajustes" descripcion="Equipo, datos del negocio y mensajes de WhatsApp." />
            <Equipo />
            <Negocio />
            <Plantillas />
        </div>
    );
}

function Equipo() {
    const { catalogos, usuario, recargar } = useSesion();
    const [lista, setLista] = useState([]);
    const [editar, setEditar] = useState(null);
    const cargar = () => api('/usuarios').then(setLista);
    useEffect(() => { cargar(); }, []);
    return (
        <section>
            <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">Equipo</h2>
                <button className="btn-secundario py-1.5" onClick={() => setEditar({})}><Plus size={15} aria-hidden="true" /> Agregar persona</button>
            </div>
            <div className="tarjeta divide-y divide-stone-100">
                {lista.map((u) => (
                    <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                        <div>
                            <p className="font-medium">{u.nombre} {u.id === usuario.id && <span className="text-xs font-normal text-stone-500">(tú)</span>}</p>
                            <p className="text-sm text-stone-500">{u.correo}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Insignia tono={u.activo ? 'azul' : 'gris'}>{nombreDe(catalogos.ROLES, u.rol)}{u.activo ? '' : ' · inactivo'}</Insignia>
                            <button className="btn-secundario py-1" onClick={() => setEditar(u)}>Editar</button>
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-2 text-xs text-stone-500">Los prospectos nuevos sin responsable se reparten por turnos entre los vendedores activos.</p>
            <EditarUsuario usuario={editar} alCerrar={() => setEditar(null)} alGuardar={() => { setEditar(null); cargar(); recargar(); }} />
        </section>
    );
}

function EditarUsuario({ usuario, alCerrar, alGuardar }) {
    const { catalogos } = useSesion();
    const [f, setF] = useState({});
    const { cargando, error, ejecutar } = useAccion();
    useEffect(() => { if (usuario) setF({ nombre: usuario.nombre || '', correo: usuario.correo || '', rol: usuario.rol || 'vendedor', clave: '', activo: usuario.activo ?? true }); }, [usuario]);
    const set = (k) => (v) => setF({ ...f, [k]: v });
    const nuevo = !usuario?.id;
    const enviar = (e) => {
        e.preventDefault();
        ejecutar(async () => {
            const cuerpo = nuevo ? f : { nombre: f.nombre, rol: f.rol, activo: f.activo, ...(f.clave ? { clave: f.clave } : {}) };
            alGuardar(await api(nuevo ? '/usuarios' : `/usuarios/${usuario.id}`, { metodo: nuevo ? 'POST' : 'PATCH', cuerpo }));
        });
    };
    return (
        <Modal titulo={nuevo ? 'Agregar persona' : 'Editar persona'} abierto={!!usuario} alCerrar={alCerrar}>
            <form onSubmit={enviar} className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Nombre" className="col-span-2"><input className="entrada" required value={f.nombre || ''} onChange={(e) => set('nombre')(e.target.value)} /></Campo>
                <Campo etiqueta="Correo" className="col-span-2"><input className="entrada" type="email" required disabled={!nuevo} value={f.correo || ''} onChange={(e) => set('correo')(e.target.value)} /></Campo>
                <Campo etiqueta="Rol"><Selector valor={f.rol} alCambiar={set('rol')} vacio={null} opciones={catalogos.ROLES.map((r) => ({ valor: r.clave, nombre: r.nombre }))} /></Campo>
                <Campo etiqueta={nuevo ? 'Contraseña (mín. 8)' : 'Nueva contraseña (opcional)'}>
                    <input className="entrada" type="password" autoComplete="new-password" required={nuevo} minLength={8} value={f.clave || ''} onChange={(e) => set('clave')(e.target.value)} />
                </Campo>
                {!nuevo && (
                    <label className="col-span-2 flex items-center gap-2 text-sm text-stone-600">
                        <input type="checkbox" checked={!!f.activo} onChange={(e) => set('activo')(e.target.checked)} /> Activo (puede iniciar sesión)
                    </label>
                )}
                <div className="col-span-2"><AvisoError mensaje={error} /></div>
                <div className="col-span-2 flex justify-end gap-2">
                    <button type="button" className="btn-secundario" onClick={alCerrar}>Cancelar</button>
                    <button className="btn-primario" disabled={cargando}>Guardar</button>
                </div>
            </form>
        </Modal>
    );
}

function Negocio() {
    const { config, recargar } = useSesion();
    const [f, setF] = useState(config);
    const [ok, setOk] = useState(false);
    const { cargando, error, ejecutar } = useAccion();
    const enviar = (e) => {
        e.preventDefault();
        ejecutar(async () => { await api('/config', { metodo: 'PATCH', cuerpo: f }); await recargar(); setOk(true); setTimeout(() => setOk(false), 2000); });
    };
    return (
        <section>
            <h2 className="mb-2 font-semibold">Negocio</h2>
            <form onSubmit={enviar} className="tarjeta grid gap-3 p-4 sm:grid-cols-3">
                <Campo etiqueta="Nombre"><input className="entrada" value={f.negocio} onChange={(e) => setF({ ...f, negocio: e.target.value })} /></Campo>
                <Campo etiqueta="Horario de atención"><input className="entrada" value={f.horario} onChange={(e) => setF({ ...f, horario: e.target.value })} /></Campo>
                <Campo etiqueta="Meses de garantía"><input className="entrada" type="number" min="0" value={f.meses_garantia} onChange={(e) => setF({ ...f, meses_garantia: e.target.value })} /></Campo>
                <div className="flex items-center justify-end gap-3 sm:col-span-3">
                    <AvisoError mensaje={error} />
                    {ok && <span className="text-sm text-emerald-700">Guardado</span>}
                    <button className="btn-primario" disabled={cargando}>Guardar</button>
                </div>
            </form>
        </section>
    );
}

function Plantillas({ soloLectura = false }) {
    const [lista, setLista] = useState([]);
    const [guardado, setGuardado] = useState('');
    const [error, setError] = useState('');
    useEffect(() => { api('/plantillas').then(setLista).catch((e) => setError(e.message)); }, []);
    const guardar = async (p) => {
        try {
            await api(`/plantillas/${p.clave}`, { metodo: 'PATCH', cuerpo: { texto: p.texto } });
            setGuardado(p.clave);
            setTimeout(() => setGuardado(''), 2000);
        } catch (e) {
            setError(e.message);
        }
    };
    return (
        <section>
            <h2 className="font-semibold">Mensajes de WhatsApp</h2>
            <p className="mb-2 text-sm text-stone-500">
                Variables disponibles: <code>{'{nombre}'}</code> <code>{'{modelo}'}</code> <code>{'{negocio}'}</code> <code>{'{horario}'}</code> <code>{'{meses}'}</code> <code>{'{fecha}'}</code> (dentro de 3 días)
            </p>
            <AvisoError mensaje={error} />
            <div className="space-y-3">
                {lista.map((p, i) => (
                    <div key={p.clave} className="tarjeta p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium">{p.nombre}</p>
                            {guardado === p.clave && <span className="text-xs text-emerald-700">Guardado</span>}
                        </div>
                        <textarea className="entrada" rows={3} readOnly={soloLectura} value={p.texto}
                            onChange={(e) => setLista(lista.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))}
                            onBlur={() => !soloLectura && guardar(lista[i])} aria-label={p.nombre} />
                    </div>
                ))}
            </div>
        </section>
    );
}
