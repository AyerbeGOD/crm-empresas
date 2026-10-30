# CRM Empresas

Estrategia e implementación de CRM para una tienda de celulares, accesorios y servicio técnico (B2C).

| Parte | Contenido |
|---|---|
| [docs/estrategia](docs/estrategia/README.md) | Plan CRM: pipeline, automatizaciones, captación, tickets, software y hoja de ruta |
| [docs/kommo](docs/kommo/README.md) | Guía paso a paso para montar el plan en Kommo |
| **App CRM propia** (este README) | Aplicación web que implementa el plan sin pagar licencias |

---

## App CRM

Aplicación web para un equipo pequeño (propietario, encargado, vendedores y técnico). Funciona en la computadora y en el celular.

| Módulo | Qué hace |
|---|---|
| **Panel** | Ventas, conversión, tiempo de primera respuesta, satisfacción, prospectos por canal, pipeline, ventas por semana, motivos de pérdida y KPIs de tickets (7, 30 o 90 días) |
| **Pipeline** | Tablero de 6 etapas con arrastrar y soltar. Exige monto para cerrar una venta y motivo para marcarla perdida. Avisa cuando una tarjeta se queda demasiado tiempo en su etapa |
| **Seguimientos** | Lista diaria de mensajes por enviar, con el texto listo y un botón que abre WhatsApp |
| **Tickets** | Código T-0001, categoría, prioridad, plazos de respuesta y solución, notas, responsable y escalamiento automático |
| **Clientes** | Un registro por celular, ficha con compras y tickets, etiquetas e importación desde CSV |
| **Ajustes** | Equipo y roles, datos del negocio y textos de los mensajes de WhatsApp |

### Automatizaciones incluidas

| Flujo | Disparador | Qué pasa |
|---|---|---|
| **Reparto por turnos** | Prospecto nuevo sin responsable | Se asigna al vendedor con menos oportunidades abiertas |
| **B · Cotizaciones** | Oportunidad pasa a *Cotización enviada* | Seguimiento a las 24 h y a las 72 h; a los 7 días sin respuesta pasa a *Perdido · No respondió* y el cliente queda etiquetado `Reactivar`. «El cliente respondió» detiene el flujo |
| **C · Postventa** | Oportunidad pasa a *Venta cerrada* | Agradecimiento con encuesta (día 1), oferta de accesorios (día 7) y mantenimiento (día 90). Si la calificación es de 1 a 3, se crea un ticket de prioridad alta |
| **Tickets** | Ticket creado | Responsable según categoría, plazos según prioridad (1 h / 4 h / 24 h para responder). Si vence el plazo, pasa a *Escalado* y se asigna al encargado; si queda *Esperando al cliente* más de 72 h, se resuelve |

> **WhatsApp:** la app arma el mensaje y abre WhatsApp (`wa.me`) con el texto listo; la persona solo pulsa *Enviar*. No usa la API de pago de Meta, así que no envía mensajes sola.

### Roles

| Rol | Puede |
|---|---|
| Propietario | Todo, además de gestionar el equipo, las plantillas, la configuración y eliminar clientes |
| Encargado | Todo lo operativo, importar CSV y eliminar oportunidades |
| Vendedor / Técnico | Clientes, pipeline, seguimientos y tickets |

## Instalar y usar

Necesitas **Node.js 22.13 o superior**.

```bash
npm install
npm run build
npm start
```

Abre `http://localhost:3100`. La primera vez se crea la cuenta del **propietario**; luego agrega al equipo en *Ajustes*. Los celulares de la misma red Wi-Fi pueden entrar con la dirección de red local que muestra el servidor.

Para desarrollar con recarga automática:

```bash
npm run dev:server   # API en el puerto 3100
npm run dev          # interfaz en http://localhost:5173
```

Pruebas:

```bash
npm test
```

### Variables de entorno

| Variable | Para qué | Por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `3100` |
| `CRM_DATA_DIR` | Carpeta **persistente** de la base de datos SQLite | `server/data` |

### Publicar en internet

1. Servidor con Node.js 22.13+ (VPS, Seenode, Render, Railway…).
2. Build: `npm install && npm run build` · Start: `npm start`.
3. Define `CRM_DATA_DIR` en un **volumen persistente**; si no, los datos se pierden en cada despliegue.
4. Usa **HTTPS** (la mayoría de proveedores lo dan).
5. Respalda periódicamente el archivo `crm.db` de esa carpeta.

### Importar tus clientes

En *Clientes → Importar CSV* sube un archivo con estas columnas (sirve la plantilla [importacion-contactos.csv](docs/estrategia/plantillas/importacion-contactos.csv)):

```
nombre,celular,fuente,interes,modelo_interes,presupuesto_soles,forma_pago,etapa,etiquetas,notas
```

- El celular se normaliza a `+51 9XXXXXXXX`. Si ya existe, el cliente se completa en lugar de duplicarse.
- También acepta columnas al estilo Kommo (`Nombre del contacto`, `Teléfono`, `Logrado con éxito`…).
- Las filas con errores se informan con su número y el motivo.

## Estructura

```
server/
  logica.mjs   catálogos, celulares, plantillas, plazos y lector CSV
  app.mjs      API REST, base SQLite y reglas automáticas
  index.mjs    arranque del servidor y revisión de vencimientos cada 5 min
src/
  App.jsx      acceso, menú y navegación
  modales.jsx  detalle y alta de oportunidades y tickets
  paginas/     Panel, Pipeline, Seguimientos, Tickets, Contactos, Ajustes
tests/         pruebas de lógica y de la API (node --test)
docs/          estrategia CRM y guía de Kommo
```

### Pendientes sugeridos

- Conectar con la app de inventario Fonazo por webhook: venta registrada → oportunidad ganada; orden «Lista para recoger» → mensaje al cliente.
- Integrar la API oficial de WhatsApp Business para enviar seguimientos sin intervención.
- Copias de seguridad automáticas de `crm.db`.
