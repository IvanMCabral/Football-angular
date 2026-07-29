# Match engine professional tasks

Fecha: 2026-07-12  
Objetivo: convertir el MVP en una primera versión jugable, consistente y calibrable.

## Estado actual

El harness ya permite comparar el mismo partido con varias formaciones, estilos y seeds. También empieza a medir si el peligro aparece por centro, banda, izquierda o derecha.

La regla madre del proyecto queda así:

> Lo que el DT ve y modifica visualmente en la cancha debe afectar el partido de forma medible, suave y coherente.

## Backlog priorizado

| Prioridad | Punto | Estado | Criterio de aceptación |
|---:|---|---|---|
| 1 | Contratos automáticos de canales izquierda/derecha | En progreso | Tests verifican que `LEFT_FLANK` y `RIGHT_FLANK` generen tiros y xG del lado correcto |
| 2 | Harness visual por canal | En progreso | Tabla Multi-seed muestra xG central/wide y wide L/R para usuario y rival |
| 3 | Cambios de jugadores durante partido | Pendiente | Cambiar un jugador mejora/empeora xG, tiros, posesión o zonas según rol y calidad |
| 4 | Micro-movimientos por píxeles | En progreso | Mover un jugador poco cambia poco; moverlo mucho cambia más; sin saltos raros de frame |
| 5 | Coherencia formación visual vs motor | Pendiente | Una formación manual parecida a 4-4-2 se comporta parecido a 4-4-2, no como otra cosa extrema |
| 6 | Centro vs bandas en defensa | En progreso | Si dejo todos al medio, rival por banda genera más peligro; si abro demasiado, rival por centro castiga |
| 7 | Labs con restore robusto | En progreso | Cada prepare/restore vuelve exactamente al estado previo, incluso tras varias pruebas |
| 8 | Motor de partido profesional | Pendiente | Tácticas, roles, cansancio, calidad, química y posiciones explican diferencias de resultado |
| 9 | Limpieza UI/UX del harness | Pendiente | Presets, estado de carga, progreso, errores legibles y comparación fácil entre runs |
| 10 | QA visual de formaciones | Pendiente | Las 12 formaciones se ven correctas, sin solapamientos graves y con roles/ratings consistentes |

## Checklist de factores que deben afectar el partido

### Formación y dibujo

- Cantidad de defensores, medios y delanteros.
- Ancho real del equipo.
- Profundidad real del equipo.
- Distancia entre líneas.
- Laterales/carrileros altos o bajos.
- Delanteros abiertos o cerrados.
- Mediocampo escalonado o plano.

### Movimiento manual por píxeles

- `x` debe afectar canal: izquierda, centro, derecha.
- `y` debe afectar altura: defensa, medio, ataque.
- Cambios chicos deben producir variaciones chicas.
- Cambios grandes deben producir variaciones claras.
- No debe haber saltos bruscos por cruzar un límite invisible de un pixel.

### Jugadores

- Overall.
- Ataque, defensa, técnica, velocidad, stamina, mentalidad.
- Posición natural vs posición táctica.
- Química con compañeros cercanos.
- Cansancio durante el partido.
- Lesiones, tarjetas y riesgo disciplinario.
- Cambios desde el banco.

### Tácticas

- Juego por centro.
- Juego por bandas.
- Cargar izquierda.
- Cargar derecha.
- Presión/intensidad.
- Estilo directo vs posesión.
- Riesgo ofensivo/defensivo.

### Rival

- Debilidades por banda.
- Debilidades centrales.
- Espacios a la espalda.
- Superioridad numérica por zona.
- Cambios tácticos durante el partido.

## Pruebas necesarias

### Automáticas

- Unit tests de cálculo de canales.
- Tests multi-seed para evitar depender de un solo resultado random.
- Tests de sustituciones: upgrade/downgrade por rol.
- Tests de movimiento manual: pequeño/medio/grande.
- Tests de formación manual vs formación preset equivalente.

### Visuales

- Recorrer las 12 formaciones.
- Mover jugadores por píxeles y mirar cambios de rating/zonas.
- Correr el mismo partido con:
  - varias formaciones
  - varios cambios de jugadores
  - varias tácticas
  - mismo seed
  - múltiples seeds

## Próximo bloque sugerido

1. Agregar preset visual “vulnerable por izquierda/derecha”.
2. Crear prueba visual guiada de micro-movimiento: 1px, 5px, 20px.
3. Probar una formación manual parecida a 4-4-2 contra preset 4-4-2.
4. Calibrar sustituciones por rol y minuto.
5. Recién después calibrar motor de partido completo.

## Avance: micro-movimientos suaves

Fecha: 2026-07-12

Problema detectado:

- Había cálculos de carril con umbrales duros:
  - izquierda si `x < 35`
  - centro si `35 <= x <= 65`
  - derecha si `x > 65`
- Eso podía generar la sensación de que mover un jugador “un frame” cambia demasiado.

Cambio:

- El motor ahora usa pesos suaves de carril:
  - `laneLeftWeight(x)`
  - `laneCenterWeight(x)`
  - `laneRightWeight(x)`
- Un jugador cerca del borde entre banda y centro contribuye parcialmente a ambos carriles.
- La defensa por banda también usa estos pesos suaves, no un interruptor duro.

Test agregado:

- `defenderChannelWeightChangesSmoothlyAroundLaneBoundaries`

Contrato:

- Mover de `x=34` a `x=35` a `x=36` no debe producir un salto grande.
- Mover de `x=64` a `x=65` a `x=66` tampoco.
- El cambio debe ser gradual y legible.

Validación:

- `mvn -q -Dtest=DetailedSprintetailedMatchEngineFormationTest test` OK.
- `mvn -q -DskipTests compile` OK.

QA visual pendiente:

- Recargar el harness y seleccionar un partido válido.
- Abrir editor visual.
- Mover un defensor/medio cerca de los bordes de carril.
- Confirmar que rating y resumen cambian suavemente.

## Avance: QA visual del harness y detalle 404

Fecha: 2026-07-12

Problema detectado:

- Al seleccionar un partido `PENDING` o sin detalle Detailed persistido, Panel A mostraba:
  - `Failed to load match detail.`
- El contrato del servicio decía que `404` debía tratarse como `null`, pero Angular entrega un `HttpErrorResponse` y no entra al `map`.

Cambio:

- `MatchDetailApiService.getMatchDetail(...)` ahora transforma `HttpErrorResponse 404` en `null`.
- `MatchDetailApiService.getMatchTimeline(...)` hace lo mismo para timeline.

Tests:

- `returns null when Angular emits HttpErrorResponse 404`
- `returns null when Angular emits HttpErrorResponse 404 for timeline`

Validación:

- `npm test -- --watch=false --include src/app/features/match-detail/services/match-detail-api.service.spec.ts` OK.
- `npm run build` OK.

QA visual:

- Abrir `http://localhost:4200/debug/test-harness`.
- Seleccionar `Athletic Club vs Real Madrid` para probar matriz con el equipo usuario.
- Correr `Multi-seed matrix`.
- Resultado visible:

| Scenario | Lectura |
|---|---|
| `m45-opponent-left` | `ΔOpp wide L/R xG = L +0.07 · R -0.03` |
| `m45-opponent-right` | `ΔOpp wide L/R xG = L -0.03 · R +0.07` |
| `m45-position-mid-up` | cambio moderado |
| `m45-position-mid-up-1px` | cambio cercano al anterior, sin salto absurdo |

Observación:

- Multi-seed tarda bastante con 20 seeds y no muestra progreso claro durante la espera.
- Agregar progreso/estado visible queda como tarea UI prioritaria.

## Avance: matriz general de comportamiento táctico

Fecha: 2026-07-12

Objetivo:

- Dejar de probar solo izquierda/derecha.
- Probar el dibujo completo que el DT arma visualmente.
- Medir si el motor responde a forma, altura, ancho, compactación y sobrecargas.

Escenarios agregados al harness:

| Scenario | Qué modifica | Señal esperada |
|---|---|---|
| `m45-shape-compact-center` | junta el equipo hacia el centro | más juego central, menos banda |
| `m45-shape-wide-overload` | abre el equipo hacia bandas | más amplitud, más wide |
| `m45-shape-attacking-high` | sube líneas | más ataque/xG propio, posible riesgo atrás |
| `m45-shape-defensive-low` | baja líneas | menos riesgo, menos ataque propio |
| `m45-shape-left-overload` | desplaza dibujo a izquierda | más carga izquierda |
| `m45-shape-right-overload` | desplaza dibujo a derecha | más carga derecha |

Contrato:

- Estos escenarios usan `customX/customY` de los slots, no solo etiqueta de formación.
- Deben mostrar si el motor entiende el dibujo real.
- El objetivo no es que todos “mejoren”, sino que cambien en la dirección esperada.

Validación técnica:

- `mvn -q -DskipTests compile` OK.
- `mvn -q -Dtest=DetailedSprintetailedMatchEngineFormationTest test` OK.

Próximo paso:

- Mejorar las sobrecargas manuales izquierda/derecha:
  - actualmente suben `wide` general;
  - todavía no separan suficientemente `leftWideXg/rightWideXg`.
  - el dibujo visual completo debe influir más en la selección de lado de los tiros.
