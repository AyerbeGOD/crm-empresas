# Guía de configuración de Kommo

Pasos para montar en **Kommo** el plan de [docs/estrategia](../estrategia/README.md): pipeline, campos, bots de WhatsApp, seguimientos, tickets e importación de clientes.

> Los nombres de menús pueden cambiar con las actualizaciones de Kommo. Si no encuentras una opción, búscala por su nombre en la ayuda de Kommo.

## 0. Antes de empezar

| Decisión | Recomendación |
|---|---|
| Plan | **Avanzado** (USD 30/usuario/mes): incluye **Salesbot**, necesario para los flujos A, B y C. El Básico (USD 20) no sirve para automatizar |
| Pago | Mínimo **6 meses** (no hay pago mensual). Empieza con la **prueba gratis de 14 días** |
| Usuarios | 5: propietario (administrador), encargado, 2 vendedores, técnico |
| Número de WhatsApp | Un solo número del negocio, conectado por la **API oficial** |

## 1. Crear la cuenta y los usuarios (día 1)

1. Regístrate en kommo.com con el correo del negocio y elige idioma **español** y zona horaria **Lima (UTC-5)**.
2. **Ajustes → Usuarios → Agregar usuario** para cada persona.
3. Crea 3 **grupos**: `Ventas`, `Servicio técnico`, `Administración`.
4. **Permisos** (Ajustes → Usuarios → Derechos de acceso):

| Rol | Ver leads | Editar leads | Eliminar | Exportar |
|---|---|---|---|---|
| Propietario | Todos | Todos | Sí | Sí |
| Encargado | Todos | Todos | No | Sí |
| Vendedor | Todos | Solo los suyos | No | No |
| Técnico | Solo los suyos | Solo los suyos | No | No |

## 2. Campos personalizados (día 1)

**Ajustes → Campos** (o desde la ficha de un lead → Configurar). Créalos **antes de importar**.

### En el contacto

| Campo | Tipo | Valores |
|---|---|---|
| Teléfono | (estándar) | Formato `+51 9XXXXXXXX` |
| Fuente | Lista | WhatsApp · Instagram · Facebook · Marketplace · TikTok · Tienda · Llamada · Referido |
| Cliente desde | Fecha | |
| Acepta promociones | Casilla | |

### En el lead (oportunidad)

| Campo | Tipo | Valores |
|---|---|---|
| Interés | Lista | Celular nuevo · Seminuevo · Accesorio · Servicio técnico |
| Modelo de interés | Texto | |
| Presupuesto (S/) | Número | |
| Forma de pago | Lista | Efectivo · Yape/Plin · Tarjeta · Cuotas · Parte de pago |
| Motivo de pérdida | Lista | Precio alto · Sin stock del modelo · Compró en otra tienda · No respondió · Solo consultaba · Sin financiamiento · Otro |
| Fecha de recojo | Fecha | Para separaciones |
| Comprobante Fonazo | Texto | N.º de venta u orden |

El **valor estimado** usa el campo estándar *Presupuesto/Venta* del lead.

## 3. Pipelines (día 1)

**Leads → Configurar embudo / pipeline.**

### Pipeline 1: `Ventas`

| Etapa en Kommo | Color sugerido |
|---|---|
| Entrantes (automática de Kommo) | — |
| Nuevo prospecto | Gris |
| Calificado | Azul |
| Cotización enviada | Amarillo |
| Separación / Negociación | Naranja |
| *Logrado con éxito* = **Venta cerrada** | Verde (fija) |
| *Venta perdida* = **Perdido** | Rojo (fija) |

En *Venta perdida*, marca **Motivo de pérdida** como obligatorio (Ajustes del campo → Obligatorio al pasar a esta etapa).

### Pipeline 2: `Tickets`

`Abierto` → `En proceso` → `Esperando al cliente` → `Escalado` → *Resuelto (logrado)* / *Cerrado sin solución (perdido)*

Campos del lead en este pipeline: **Categoría** (Garantía · Servicio técnico · Consulta de uso · Cambio/devolución · Reclamo formal) y **Prioridad** (Alta · Media · Baja). Usa **etiquetas** `ALTA`, `MEDIA`, `BAJA` para filtrar rápido.

### Pipeline 3 (opcional): `Servicio técnico`

`Recibido` → `Diagnóstico` → `En reparación` → `Listo para recoger` → *Entregado*

## 4. Conectar canales (día 2)

**Leads → Automatizar (Pipeline digital) → columna izquierda "Fuentes de leads"**, o **Ajustes → Integraciones**.

| Canal | Qué conectar | Etiqueta de fuente |
|---|---|---|
| WhatsApp | Integración de **WhatsApp Business API** oficial (sigue el asistente; necesitas acceso al Business Manager de Meta y el número) | `WhatsApp` |
| Instagram | Integración de Instagram con la cuenta profesional | `Instagram` |
| Facebook / Marketplace | Integración de Facebook Messenger con la página | `Facebook` |
| TikTok y QR de tienda | Enlaces `wa.me` con texto prellenado (ver abajo) | por palabra clave |

Cada fuente se configura para crear el lead en la etapa **Nuevo prospecto** del pipeline `Ventas`.

```
https://wa.me/51XXXXXXXXX?text=Hola%2C%20vengo%20de%20TikTok
https://wa.me/51XXXXXXXXX?text=Hola%2C%20vi%20el%20QR%20en%20tienda
```

## 5. Respuestas rápidas (día 2)

**Ajustes → Herramientas de comunicación → Plantillas.** Copia los textos de [plantillas/mensajes-whatsapp.md](../estrategia/plantillas/mensajes-whatsapp.md). Los mensajes que se envían **fuera de la ventana de 24 h** (seguimientos, postventa) deben enviarse a Meta para aprobación como **plantillas de WhatsApp**; tardan de minutos a un día.

| Nombre de la plantilla | Categoría Meta |
|---|---|
| `bienvenida_menu` | (no requiere, se envía dentro de 24 h) |
| `seguimiento_24h` | Utilidad |
| `seguimiento_72h_regalo` | Marketing |
| `postventa_gracias_encuesta` | Utilidad |
| `postventa_accesorios` | Marketing |
| `equipo_listo` | Utilidad |
| `ticket_creado` | Utilidad |

## 6. Automatizaciones con Salesbot (días 3-5)

Los bots se crean en **Ajustes → Herramientas de comunicación → Salesbots** y se colocan en el **Pipeline digital** (Leads → Automatizar → botón **+** bajo la etapa).

### Flujo A · Bienvenida, menú y asignación

**Disparador:** en la etapa *Nuevo prospecto*, "cuando se crea en esta etapa" (mensaje entrante).

```
[Mensaje] bienvenida_menu con 4 botones: Celulares | Accesorios | Servicio técnico | Garantía o reclamo
   ├─ Celulares / Accesorios
   │     → [Cambiar campo] Interés
   │     → [Distribución de leads] por turnos entre Ventas
   │     → [Crear tarea] "Responder en 15 min" al responsable
   ├─ Servicio técnico
   │     → [Cambiar campo] Interés = Servicio técnico
   │     → [Cambiar responsable] Técnico  → [Crear tarea]
   ├─ Garantía o reclamo
   │     → [Cambiar etapa] pipeline Tickets / Abierto  → [Mensaje] ticket_creado
   └─ Sin respuesta (temporizador 10 min)
         → [Crear tarea] para el encargado: "Contactar prospecto"
```

- **Distribución por turnos:** Ajustes → (o desde el Pipeline digital) **Distribución de leads → Por turnos** entre el grupo `Ventas`.
- **Horario:** en el disparador, limita días y horas de atención; crea un segundo bot `fuera_de_horario` con el mensaje del horario y una tarea para la apertura.
- **Alerta de 15 minutos:** disparador **Crear tarea** en *Nuevo prospecto*; si el lead sigue ahí después del plazo, la tarea vencida aparece en rojo para el encargado.

### Flujo B · Seguimiento de cotizaciones

**Disparador:** "cuando es movido a esta etapa" en *Cotización enviada*.

```
[Esperar] 24 h  ─┬─ si el cliente respondió → detener bot
                 └─ [Mensaje] seguimiento_24h
[Esperar] 48 h  ─┬─ si respondió → detener
                 └─ [Mensaje] seguimiento_72h_regalo
                    [Crear tarea] "Llamar al cliente" al responsable
[Esperar] 4 días ─┬─ si respondió → detener
                  └─ [Cambiar campo] Motivo de pérdida = No respondió
                     [Agregar etiqueta] Reactivar
                     [Cambiar etapa] Venta perdida
```

Usa el paso **Condición** sobre "el cliente respondió" o pasos **Recibir mensaje** con temporizador para cortar el flujo cuando el cliente contesta.

### Flujo C · Postventa

**Disparador:** "cuando es movido a esta etapa" en *Logrado con éxito*.

```
[Esperar] 1 día   → [Mensaje] postventa_gracias_encuesta (botones 1 a 5)
                    ├─ 1, 2 o 3 → [Crear lead] en pipeline Tickets / Abierto, etiqueta ALTA
                    └─ 4 o 5    → [Mensaje] pedir reseña en Google
[Esperar] 6 días  → [Mensaje] postventa_accesorios
[Esperar] 83 días → [Mensaje] recordatorio de mantenimiento
```

### Tickets: plazos y escalamiento

En el pipeline `Tickets`, etapa *Abierto*:

| Disparador | Configuración |
|---|---|
| Crear tarea | "Primera respuesta" con plazo: 1 h (ALTA), 4 h (MEDIA), 24 h (BAJA). Usa un disparador por etiqueta |
| Cambiar etapa | Si sigue en *Abierto* tras el plazo → mover a *Escalado* |
| Cambiar responsable | En *Escalado* → asignar al encargado |

## 7. Importar los clientes actuales (día 2)

1. Limpia el Excel: un cliente por fila, celular en formato `+51 9XXXXXXXX`, sin duplicados.
2. Usa la plantilla [importacion-kommo.csv](importacion-kommo.csv) (columnas ya pensadas para mapear).
3. **Leads → ⋯ → Importar**, sube el archivo y **relaciona cada columna** con su campo (contacto o lead).
4. Elige el pipeline `Ventas` y revisa el resultado con 10 registros antes de subir todo.
5. Las separaciones de las libretas se crean a mano en *Separación / Negociación* con **Fecha de recojo**.

## 8. Reportes (semana 2)

| Reporte de Kommo | Para qué |
|---|---|
| **Análisis de ventas / embudo** | Conversión por etapa del pipeline `Ventas` |
| **Informe de leads por fuente** | Qué canal trae más prospectos (requiere el campo *Fuente*) |
| **Informe de actividad / chats** | Tiempo de respuesta por vendedor |
| **Motivos de pérdida** | Filtro por el campo *Motivo de pérdida* en leads perdidos |

Revisa el panel cada lunes con el equipo (15 minutos).

## Lista de verificación final

- [ ] 5 usuarios creados con permisos
- [ ] Campos personalizados creados
- [ ] Pipelines `Ventas` y `Tickets` creados
- [ ] WhatsApp API, Instagram y Facebook conectados
- [ ] Plantillas enviadas a Meta y aprobadas
- [ ] Flujo A activo y probado con un número de prueba
- [ ] Flujo B activo
- [ ] Flujo C activo
- [ ] Clientes importados y revisados
- [ ] Equipo capacitado (1 h) y WhatsApp personal fuera de las ventas

## Fuentes

- [Kommo — precios y planes](https://www.kommo.com/es/blog/amocrm-precios/)
- [Kommo — disparadores del pipeline digital](https://www.kommo.com/es/recursos/pipeline-triggers/)
- [Kommo — configurar disparadores de Salesbot](https://www.kommo.com/es/recursos/crm/configuracion-de-los-ajustes-del-salesbot/)
- [Kommo — pasos y acciones de Salesbot](https://www.kommo.com/es/recursos/crm/pasos-y-acciones-del-ventabot/)
