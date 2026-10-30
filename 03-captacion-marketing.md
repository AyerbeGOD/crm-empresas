# 3. Estrategia de captación (marketing)

Meta: **que todos los canales caigan en una sola bandeja del CRM** y que cada prospecto tenga su campo **Fuente**, para saber qué canal vende de verdad.

## Arquitectura de canales

```
WhatsApp Business API ─┐
Instagram (DM)        ─┤
Facebook / Messenger  ─┼──► BANDEJA ÚNICA DEL CRM ──► Pipeline de ventas
Marketplace           ─┤        (Fuente automática)      └─► Tickets (garantía/reclamos)
TikTok (link a WA)    ─┤
Tienda física (QR)    ─┤
Llamadas              ─┘  (registro manual en 30 s)
```

## Conexión canal por canal

| Canal | Cómo se conecta | Fuente | Acción clave |
|---|---|---|---|
| **WhatsApp** | WhatsApp Business **API** conectada al CRM (no la app del celular). Un **solo número** del negocio para todo el equipo | `WhatsApp` | Migrar el número actual; publicar un solo número en todos lados |
| **Instagram** | Integración nativa del CRM con la cuenta profesional (DM y comentarios) | `Instagram` | Respuesta automática a comentarios "precio" → enviar DM |
| **Facebook / Messenger** | Integración nativa con la página | `Facebook` | Botón "Enviar mensaje por WhatsApp" en la página |
| **Marketplace** | Los mensajes llegan a Messenger → CRM | `Marketplace` | Publicar con el mismo formato y enlace a WhatsApp |
| **TikTok** | Enlace `wa.me` con texto prellenado en la bio y videos | `TikTok` | Texto prellenado: *"Hola, vengo de TikTok"* |
| **Tienda física** | Cartel con **código QR** a WhatsApp con texto prellenado, o registro rápido en el CRM desde el celular | `Tienda` | Al vender, pedir siempre el celular |
| **Llamadas** | Registro manual (nombre, celular, interés) en la app móvil del CRM | `Llamada` | Nadie corta sin registrar |
| **Referidos** | Código o pregunta *"¿Quién te recomendó?"* | `Referido` | Premio al cliente que refiere (accesorio o descuento) |

### Enlaces de WhatsApp con origen rastreable

Usa un texto prellenado distinto por canal para que el CRM (o una regla) etiquete la fuente:

```
https://wa.me/51XXXXXXXXX?text=Hola%2C%20vengo%20de%20Instagram
https://wa.me/51XXXXXXXXX?text=Hola%2C%20vengo%20de%20TikTok
https://wa.me/51XXXXXXXXX?text=Hola%2C%20vi%20el%20QR%20en%20tienda
```

## Migración de datos actuales

1. **Excel:** limpiar duplicados, normalizar celulares a `+51 9XXXXXXXX` y cargar con [plantillas/importacion-contactos.csv](plantillas/importacion-contactos.csv).
2. **Libretas:** las separaciones y encargos pendientes se pasan a mano como oportunidades en etapa 4.
3. **Chats de WhatsApp:** exportar contactos de clientes activos de los últimos 6 meses; etiquetar `Cliente antiguo`.
4. **Consentimiento:** solo enviar campañas a quien compró o escribió antes; incluir opción de baja (Ley 29733 de protección de datos personales).

## Campañas recomendadas (usando la base del CRM)

| Campaña | Segmento | Frecuencia |
|---|---|---|
| Ingreso de nuevos modelos | Etiqueta `Interés: celular nuevo` | Al ingresar stock |
| Reactivación | Perdidos por `No respondió` o `Precio alto` | Mensual |
| Accesorios para tu modelo | Compradores de los últimos 30 días | Automática (Flujo C) |
| Renueva tu equipo (parte de pago) | Compras de hace 12 a 24 meses | Trimestral |
| Fechas clave | Toda la base con consentimiento | Día de la Madre, Fiestas Patrias, Navidad, regreso a clases |

## Métricas por canal (revisión mensual)

| Métrica | Fórmula |
|---|---|
| Prospectos por canal | Conteo por *Fuente* |
| Tasa de cierre por canal | Ventas cerradas / prospectos del canal |
| Ticket promedio por canal | Monto vendido / ventas del canal |
| Tiempo de primera respuesta | Promedio desde el primer mensaje hasta la respuesta humana |
