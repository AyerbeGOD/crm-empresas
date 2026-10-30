# Estrategia CRM · Fonazo

Plan de implementación de CRM para una tienda de **celulares, accesorios y servicio técnico** que vende a **público general (B2C)**, con un equipo de **5 personas** que hoy trabaja con **Excel, WhatsApp y libretas**.

> **Objetivo:** que ningún prospecto se pierda, que cada cliente tenga historial y que el equipo deje de copiar datos a mano.
> **Regla de oro:** *si no está en el CRM, no existe.*

| Documento | Contenido |
|---|---|
| [01-pipeline-ventas.md](01-pipeline-ventas.md) | Etapas del embudo, campos obligatorios y reglas de avance |
| [02-automatizaciones.md](02-automatizaciones.md) | Los 3 flujos automáticos a activar primero |
| [03-captacion-marketing.md](03-captacion-marketing.md) | Cómo conectar cada canal al CRM |
| [04-atencion-cliente-tickets.md](04-atencion-cliente-tickets.md) | Sistema de tickets, prioridades y tiempos de respuesta |
| [05-recomendacion-software.md](05-recomendacion-software.md) | Las 2 mejores opciones de CRM para este tamaño y presupuesto |
| [06-hoja-de-ruta.md](06-hoja-de-ruta.md) | Plan de 90 días, roles del equipo e indicadores (KPIs) |
| [plantillas/](plantillas/) | Mensajes de WhatsApp, CSV de importación y formato de tickets |

---

## Diagnóstico de la situación actual

| Hoy | Problema | Con CRM |
|---|---|---|
| Chats de WhatsApp en varios celulares | Si el vendedor no está, nadie sabe qué se conversó | Bandeja única compartida, historial por cliente |
| Libretas para separaciones y encargos | Se pierden, no hay recordatorios | Tarjeta en el pipeline con fecha y responsable |
| Excel de clientes | Desactualizado, duplicado, sin origen del cliente | Base única con fuente, compras y etiquetas |
| Seguimiento "de memoria" | Cotizaciones que nunca se retoman | Recordatorios automáticos a las 24 h, 72 h y 7 días |
| Reclamos por chat | Se olvidan, no se mide el tiempo de respuesta | Tickets con prioridad, responsable y plazo |

## Cómo encaja con la app Fonazo

El CRM **no reemplaza** la app de inventario y punto de venta de este repositorio; la complementa:

| Función | Dónde vive |
|---|---|
| Conversaciones, prospectos, cotizaciones, campañas, tickets | **CRM** |
| Stock, precios, ventas en caja, cortes, órdenes de reparación, rastreo público | **App Fonazo** |
| Ficha del cliente (nombre, celular, DNI opcional) | Ambos, con el **celular como identificador único** |

Fase 3 de la hoja de ruta: conectar ambos por webhook (venta cerrada en Fonazo → oportunidad "Ganada" en el CRM; orden "Lista para recoger" → mensaje al cliente).

## Resumen ejecutivo

1. **Pipeline de 6 etapas** de *Nuevo prospecto* a *Venta cerrada / Perdido*, más un embudo aparte para servicio técnico.
2. **3 automatizaciones inmediatas:** respuesta y asignación automática, seguimiento de cotizaciones y postventa con venta cruzada de accesorios.
3. **Todos los canales a una sola bandeja:** WhatsApp, Instagram, Facebook/Marketplace, TikTok, tienda física y llamadas, siempre con el campo *Fuente*.
4. **Tickets** con 5 categorías, 3 prioridades y plazos de respuesta medibles.
5. **Software:** Kommo (primera opción, centrado en WhatsApp) o Zoho CRM (segunda, más barato y con tickets vía Zoho Desk).
