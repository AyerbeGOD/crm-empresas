# 4. Atención al cliente: sistema de tickets

Un **ticket** es cualquier duda o problema de un cliente que **ya compró**. Se separa del pipeline de ventas para que los reclamos no se mezclen con oportunidades nuevas y para medir cuánto tardamos en resolverlos.

## Cómo se crea un ticket

| Entrada | Cómo |
|---|---|
| WhatsApp / redes | Opción **4 · Garantía o reclamo** del menú de bienvenida (Flujo A) |
| Encuesta postventa | Calificación de 1 a 3 crea ticket automático (Flujo C) |
| Tienda o llamada | El colaborador lo registra en el CRM con el formulario de [plantillas/formato-ticket.md](plantillas/formato-ticket.md) |
| Libro de Reclamaciones | Se registra siempre como ticket **Alta** con categoría `Reclamo formal` |

Al crearse, el cliente recibe: *"Registramos tu caso con el código T-0001. Te responderemos antes de [plazo]."*

## Categorías

| Categoría | Ejemplos | Responsable por defecto |
|---|---|---|
| **Garantía** | Falla de fábrica, batería, pantalla sin golpe | Técnico |
| **Servicio técnico** | Reparación que volvió a fallar, consulta de estado | Técnico |
| **Consulta de uso** | Pasar contactos, configurar cuenta, WhatsApp, cámara | Vendedor |
| **Cambio / devolución** | Accesorio incompatible, producto equivocado | Encargado de tienda |
| **Reclamo formal** | Libro de Reclamaciones, mala atención, cobro incorrecto | Encargado / propietario |

## Prioridades y tiempos (SLA)

| Prioridad | Cuándo | Primera respuesta | Solución objetivo |
|---|---|---|---|
| **Alta** | Equipo sin funcionar, cobro incorrecto, reclamo formal, encuesta 1-3 | 1 h | 48 h |
| **Media** | Garantía con equipo usable, cambio de accesorio | 4 h | 5 días |
| **Baja** | Consultas de uso, dudas generales | 24 h | 3 días |

> **Libro de Reclamaciones:** el plazo legal de respuesta en Perú es de **15 días hábiles** (verificar la norma vigente en Indecopi). El objetivo interno debe ser mucho menor.

## Estados del ticket

```
Abierto → En proceso → Esperando al cliente → Resuelto → Cerrado
                ↘ Escalado (si vence el plazo)
```

| Estado | Regla |
|---|---|
| Abierto | Se asigna responsable automáticamente según categoría |
| En proceso | El responsable respondió al cliente |
| Esperando al cliente | Se pausa el reloj del SLA; si no responde en 3 días → Resuelto |
| Escalado | Venció el plazo de primera respuesta o solución → pasa al encargado |
| Resuelto | Se envía mensaje: *"¿Quedó solucionado? Responde SÍ o NO"* |
| Cerrado | El cliente confirmó o pasaron 48 h sin respuesta |

## Base de respuestas rápidas

Crear en el CRM respuestas guardadas para las 10 consultas más repetidas (horarios, garantía, formas de pago, cómo pasar contactos, cuánto tarda una reparación, etc.). Con IA del CRM, esas mismas respuestas alimentan al bot del Flujo A.

## Indicadores semanales

| Indicador | Meta inicial |
|---|---|
| Tickets abiertos al cierre de semana | < 5 |
| % primera respuesta dentro del SLA | > 90 % |
| Tiempo promedio de solución | < 48 h |
| Satisfacción postventa (1-5) | ≥ 4.5 |
| Tickets por categoría | Revisar la categoría que más crece |
