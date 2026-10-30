# 1. Pipeline de ventas

En venta de celulares B2C el ciclo es corto (horas o pocos días) y casi todo pasa por WhatsApp. Por eso el embudo tiene **pocas etapas, cada una con una acción concreta** que la cierra.

## Embudo principal: Venta de equipos y accesorios

```
[1] Nuevo prospecto → [2] Calificado → [3] Cotización enviada → [4] Separación / Negociación → [5] Venta cerrada
                                                                                               ↘ [6] Perdido (con motivo)
```

| # | Etapa | Qué significa | Acción para avanzar | Tiempo máximo en la etapa | Responsable |
|---|---|---|---|---|---|
| 1 | **Nuevo prospecto** | Llegó un mensaje, llamada o visita y aún no se conversa | Responder y hacer las 3 preguntas de calificación | **15 min** en horario de tienda | Asignado automático |
| 2 | **Calificado** | Se sabe qué busca, presupuesto y forma de pago | Enviar precio, fotos y disponibilidad | 2 h | Vendedor |
| 3 | **Cotización enviada** | El cliente tiene precio y opciones | Seguimiento (automático a 24 h y 72 h) | 7 días | Vendedor |
| 4 | **Separación / Negociación** | Pidió descuento, cuotas, parte de pago o dejó adelanto | Confirmar fecha de recojo o cerrar condiciones | 3 días (o fecha pactada) | Vendedor + encargado |
| 5 | **Venta cerrada** | Pagó y recibió el equipo | Registrar venta en Fonazo y activar postventa | — | Vendedor |
| 6 | **Perdido** | No compró | Elegir **motivo** obligatorio | — | Vendedor |

### Las 3 preguntas de calificación (etapa 1 → 2)

1. **¿Qué equipo o modelo buscas?** (o: ¿para qué lo usarás? fotos, juegos, trabajo)
2. **¿Cuál es tu presupuesto aproximado?**
3. **¿Cómo pagarías?** efectivo, Yape/Plin, tarjeta, cuotas o parte de pago con tu equipo usado

### Motivos de pérdida (lista cerrada)

`Precio alto` · `Sin stock del modelo` · `Compró en otra tienda` · `No respondió` · `Solo consultaba` · `Sin financiamiento` · `Otro`

Revisar estos motivos **cada mes** dice qué stock pedir y qué precios ajustar.

## Campos obligatorios de cada oportunidad

| Campo | Tipo | Ejemplo |
|---|---|---|
| Nombre | Texto | Carla Mendoza |
| Celular (WhatsApp) | Teléfono, **único** | +51 9XX XXX XXX |
| Fuente | Lista | WhatsApp · Instagram · Facebook · Marketplace · TikTok · Tienda · Llamada · Referido |
| Interés | Lista | Celular nuevo · Seminuevo · Accesorio · Servicio técnico |
| Modelo de interés | Texto | Galaxy A55 128 GB |
| Presupuesto | Monto (S/) | 1 200 |
| Forma de pago | Lista | Efectivo · Yape/Plin · Tarjeta · Cuotas · Parte de pago |
| Valor estimado | Monto (S/) | 1 150 |
| Motivo de pérdida | Lista | (solo en etapa 6) |

## Embudo secundario: Servicio técnico

La app Fonazo ya gestiona las órdenes de reparación. En el CRM solo se replica el estado **visible para el cliente**, para disparar mensajes:

| Etapa | Mensaje automático al cliente |
|---|---|
| Recibido | Confirmación con código de rastreo |
| Diagnóstico / Presupuesto | Monto y pedido de aprobación |
| En reparación | — |
| **Listo para recoger** | Aviso con horario de tienda |
| Entregado | Agradecimiento + garantía del servicio + encuesta |

## Reglas del equipo

- Una oportunidad = un cliente + una intención de compra. Si vuelve meses después por otro equipo, se crea una **nueva** oportunidad en el mismo contacto.
- Nadie mueve una tarjeta a *Venta cerrada* sin registrar la venta en Fonazo.
- Nada se queda en *Cotización enviada* más de 7 días: o avanza o pasa a *Perdido*.
