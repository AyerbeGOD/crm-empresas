# 2. Automatizaciones clave

Tres flujos para activar **la primera semana**. Ahorran tiempo y, sobre todo, evitan que se pierdan ventas por olvido. Los textos están en [plantillas/mensajes-whatsapp.md](plantillas/mensajes-whatsapp.md).

## Flujo A · Respuesta inmediata y asignación de prospectos

**Problema que resuelve:** el cliente escribe, nadie le responde en 1 hora y compra en otra tienda.

```
Disparador: mensaje nuevo por WhatsApp / Instagram / Facebook de un número desconocido
  ├─ Crear contacto + oportunidad en "Nuevo prospecto" (Fuente = canal de origen)
  ├─ Enviar bienvenida con menú: 1) Celulares  2) Accesorios  3) Servicio técnico  4) Garantía o reclamo
  ├─ Según la opción:
  │     1-2 → asignar vendedor por turnos (round-robin) y crear tarea "Responder en 15 min"
  │     3   → etiqueta "Servicio técnico", asignar al técnico
  │     4   → crear TICKET (ver documento 4), no oportunidad
  ├─ Fuera de horario → mensaje "Te respondemos mañana desde las 9:00" + tarea para la apertura
  └─ Si a los 15 min nadie respondió → alerta al encargado de tienda
```

**Ahorro estimado:** clasificación y reparto manual de chats (~1 h al día) y respuesta en minutos en lugar de horas.

## Flujo B · Seguimiento de cotizaciones

**Problema que resuelve:** se envía el precio y nadie vuelve a escribir.

```
Disparador: oportunidad entra a "Cotización enviada"
  ├─ +24 h sin respuesta → mensaje de seguimiento 1 (¿te quedó alguna duda?)
  ├─ +72 h sin respuesta → mensaje 2 con incentivo (mica o funda de regalo / precio válido hasta X)
  │                         + tarea al vendedor: "Llamar"
  ├─ +7 días sin respuesta → mover a "Perdido" con motivo "No respondió"
  │                          + etiqueta "Reactivar" para la siguiente campaña
  └─ Si el cliente responde en cualquier momento → se detiene el flujo
```

**Ahorro estimado:** recuperar parte de las cotizaciones abandonadas sin que el vendedor lleve la cuenta.

## Flujo C · Postventa y venta cruzada

**Problema que resuelve:** el cliente compra una vez y no vuelve; no se ofrecen accesorios ni se piden reseñas.

```
Disparador: oportunidad pasa a "Venta cerrada" (o orden de servicio "Entregado")
  ├─ Día 1   → agradecimiento + datos de garantía + encuesta de 1 pregunta (1 a 5)
  │             └─ Si califica 1-3 → crear TICKET prioridad Alta para el encargado
  │             └─ Si califica 4-5 → pedir reseña en Google / Facebook
  ├─ Día 7   → oferta de accesorios del modelo comprado (case, mica, cargador, audífonos)
  ├─ Día 90  → recordatorio de mantenimiento / limpieza gratis o con descuento
  └─ Mes 11  → aviso de que la garantía está por vencer + oferta de parte de pago para renovar
```

**Ahorro estimado:** campañas de postventa sin trabajo manual y una fuente constante de reseñas y ventas de accesorios (alto margen).

## Recordatorios internos (sin mensaje al cliente)

| Disparador | Tarea creada |
|---|---|
| Separación con adelanto | Recordar fecha de recojo 1 día antes |
| Pedido de modelo sin stock | Avisar al cliente cuando el producto ingrese al inventario |
| Ticket sin respuesta en su plazo | Escalar al encargado |

## Buenas prácticas

- Plantillas de WhatsApp **aprobadas por Meta** para escribir fuera de la ventana de 24 h (seguimientos y postventa).
- Siempre ofrecer **"Responde SALIR para no recibir más mensajes"** en campañas.
- Máximo **2 mensajes de marketing por semana** por cliente.
