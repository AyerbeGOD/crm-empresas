import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Bell, Columns3, LifeBuoy, LogOut, Settings, Users } from 'lucide-react';
import { alCerrarSesion, api, guardarToken, tokenGuardado } from './api.js';
import { AvisoError, Campo, Sesion, useAccion } from './ui.jsx';
import Panel from './paginas/Panel.jsx';
import Pipeline from './paginas/Pipeline.jsx';
import Contactos from './paginas/Contactos.jsx';
import Seguimientos from './paginas/Seguimientos.jsx';
import Tickets from './paginas/Tickets.jsx';
import Ajustes from './paginas/Ajustes.jsx';

const PAGINAS = [
    { ruta: 'panel', nombre: 'Panel', icono: BarChart3, componente: Panel },
    { ruta: 'pipeline', nombre: 'Pipeline', icono: Columns3, componente: Pipeline },
    { ruta: 'seguimientos', nombre: 'Seguimientos', icono: Bell, componente: Seguimientos },
    { ruta: 'tickets', nombre: 'Tickets', icono: LifeBuoy, componente: Tickets },
    { ruta: 'contactos', nombre: 'Clientes', icono: Users, componente: Contactos },
    { ruta: 'ajustes', nombre: 'Ajustes', icono: Settings, componente: Ajustes },
];

const rutaActual = () => (window.location.hash.replace(/^#\/?/, '').split('/')[0] || 'panel');

export default function App() {
    const [estado, setEstado] = useState(null);
    const [sesion, setSesion] = useState(null);
    const [ruta, setRuta] = useState(rutaActual());
    const [avisos, setAvisos] = useState(0);

    const cargarSesion = useCallback(async () => {
        if (!tokenGuardado()) return setSesion(false);
        try {
            setSesion(await api('/me'));
        } catch {
            setSesion(false);
        }
        return undefined;
    }, []);

    useEffect(() => {
        alCerrarSesion(() => setSesion(false));
        api('/estado').then(setEstado).catch(() => setEstado({ configurado: true, error: true }));
        cargarSesion();
        const alCambiar = () => setRuta(rutaActual());
        window.addEventListener('hashchange', alCambiar);
        return () => window.removeEventListener('hashchange', alCambiar);
    }, [cargarSesion]);

    // Contador de seguimientos pendientes en el menú.
    useEffect(() => {
        if (!sesion) return undefined;
        const contar = () => api('/seguimientos?mios=1').then((l) => setAvisos(l.length)).catch(() => {});
        contar();
        const id = setInterval(contar, 60_000);
        return () => clearInterval(id);
    }, [sesion, ruta]);

    useEffect(() => {
        document.title = estado?.negocio ? `CRM · ${estado.negocio}` : 'CRM';
    }, [estado]);

    if (estado === null || sesion === null) {
        return <div className="flex h-screen items-center justify-center text-sm text-stone-500">Cargando…</div>;
    }
    if (!sesion) {
        return <Acceso configurado={estado.configurado} alEntrar={(r) => { guardarToken(r.token); cargarSesion(); }} />;
    }

    const pagina = PAGINAS.find((p) => p.ruta === ruta) || PAGINAS[0];
    const visibles = PAGINAS.filter((p) => p.ruta !== 'ajustes' || ['admin', 'encargado'].includes(sesion.usuario.rol));
    const Pagina = pagina.componente;
    const salir = async () => {
        try { await api('/logout', { metodo: 'POST' }); } catch { /* ya vencida */ }
        guardarToken(null);
        setSesion(false);
    };

    return (
        <Sesion.Provider value={{ ...sesion, recargar: cargarSesion }}>
            <div className="min-h-screen md:flex">
                <aside className="hidden w-56 shrink-0 flex-col border-r border-stone-200 bg-white md:flex">
                    <div className="flex items-center gap-2 px-5 py-5">
                        <img src="/icono.svg" alt="" className="h-7 w-7" />
                        <div className="leading-tight">
                            <p className="text-sm font-semibold">{sesion.config.negocio}</p>
                            <p className="text-xs text-stone-500">CRM</p>
                        </div>
                    </div>
                    <nav className="flex-1 space-y-0.5 px-3" aria-label="Principal">
                        {visibles.map((p) => (
                            <a
                                key={p.ruta}
                                href={`#/${p.ruta}`}
                                aria-current={p.ruta === pagina.ruta ? 'page' : undefined}
                                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${p.ruta === pagina.ruta ? 'bg-marca-50 font-medium text-marca-700' : 'text-stone-600 hover:bg-stone-100'}`}
                            >
                                <p.icono size={17} aria-hidden="true" />
                                <span className="flex-1">{p.nombre}</span>
                                {p.ruta === 'seguimientos' && avisos > 0 && (
                                    <span className="rounded-full bg-marca-500 px-1.5 text-xs font-semibold text-white">{avisos}</span>
                                )}
                            </a>
                        ))}
                    </nav>
                    <div className="border-t border-stone-200 p-3">
                        <p className="truncate px-2 text-sm font-medium">{sesion.usuario.nombre}</p>
                        <p className="truncate px-2 text-xs text-stone-500">{sesion.catalogos.ROLES.find((r) => r.clave === sesion.usuario.rol)?.nombre}</p>
                        <button className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100" onClick={salir}>
                            <LogOut size={15} aria-hidden="true" /> Cerrar sesión
                        </button>
                    </div>
                </aside>

                <main className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 md:pb-8">
                    <div className="mb-4 flex items-center justify-between md:hidden">
                        <div className="flex items-center gap-2">
                            <img src="/icono.svg" alt="" className="h-6 w-6" />
                            <span className="text-sm font-semibold">{sesion.config.negocio}</span>
                        </div>
                        <button className="rounded-lg p-2 text-stone-500" onClick={salir} aria-label="Cerrar sesión"><LogOut size={18} /></button>
                    </div>
                    <Pagina />
                </main>

                <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-stone-200 bg-white md:hidden" aria-label="Principal">
                    {visibles.map((p) => (
                        <a
                            key={p.ruta}
                            href={`#/${p.ruta}`}
                            aria-current={p.ruta === pagina.ruta ? 'page' : undefined}
                            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${p.ruta === pagina.ruta ? 'text-marca-600' : 'text-stone-500'}`}
                        >
                            <p.icono size={20} aria-hidden="true" />
                            {p.nombre}
                            {p.ruta === 'seguimientos' && avisos > 0 && (
                                <span className="absolute right-[18%] top-1 rounded-full bg-marca-500 px-1 text-[10px] font-semibold text-white">{avisos}</span>
                            )}
                        </a>
                    ))}
                </nav>
            </div>
        </Sesion.Provider>
    );
}

function Acceso({ configurado, alEntrar }) {
    const [f, setF] = useState({ nombre: '', negocio: 'Fonazo', correo: '', clave: '', recordar: true });
    const { cargando, error, ejecutar } = useAccion();
    const cambiar = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
    const enviar = (e) => {
        e.preventDefault();
        ejecutar(async () => alEntrar(await api(configurado ? '/login' : '/setup', { metodo: 'POST', cuerpo: f })));
    };
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <form onSubmit={enviar} className="tarjeta w-full max-w-sm space-y-4 p-6 shadow-sm">
                <div className="flex items-center gap-2">
                    <img src="/icono.svg" alt="" className="h-8 w-8" />
                    <div>
                        <h1 className="font-semibold">{configurado ? 'Iniciar sesión' : 'Configura tu CRM'}</h1>
                        <p className="text-xs text-stone-500">{configurado ? 'Ingresa con tu correo' : 'Crea la cuenta del propietario'}</p>
                    </div>
                </div>
                {!configurado && (
                    <>
                        <Campo etiqueta="Tu nombre"><input className="entrada" required value={f.nombre} onChange={cambiar('nombre')} /></Campo>
                        <Campo etiqueta="Nombre del negocio"><input className="entrada" required value={f.negocio} onChange={cambiar('negocio')} /></Campo>
                    </>
                )}
                <Campo etiqueta="Correo"><input className="entrada" type="email" required autoComplete="username" value={f.correo} onChange={cambiar('correo')} /></Campo>
                <Campo etiqueta={configurado ? 'Contraseña' : 'Contraseña (mínimo 8 caracteres)'}>
                    <input className="entrada" type="password" required minLength={configurado ? undefined : 8} autoComplete={configurado ? 'current-password' : 'new-password'} value={f.clave} onChange={cambiar('clave')} />
                </Campo>
                {configurado && (
                    <label className="flex items-center gap-2 text-sm text-stone-600">
                        <input type="checkbox" checked={f.recordar} onChange={cambiar('recordar')} /> Recordarme 30 días
                    </label>
                )}
                <AvisoError mensaje={error} />
                <button className="btn-primario w-full" disabled={cargando}>{cargando ? 'Un momento…' : configurado ? 'Entrar' : 'Crear cuenta'}</button>
            </form>
        </div>
    );
}
