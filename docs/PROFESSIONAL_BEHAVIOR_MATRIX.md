# Professional behavior matrix

Fecha: 2026-07-14

Objetivo: que el modal de DT, el harness y el motor hablen el mismo idioma. Un
cambio visual no tiene que garantizar un resultado distinto en una seed, pero si
debe mover probabilidades y lecturas tacticas en una direccion futbolistica
razonable.

## Estados del harness

| Estado | Significado | Accion |
|---|---|---|
| OK | Encaje tactico limpio y senal esperada. | Mantener como contrato. |
| Fallback | El equipo cubre el rol con perfil cercano por falta de natural. | Permitido, pero debe penalizar/explicar. |
| Review | Hay hueco, fuera de linea, salto brusco o senal contradictoria. | Revisar motor/modal. |
| Bug | El dato visual no llega al motor o rompe invariantes. | Bloqueante antes de MVP. |

## Matriz modal -> motor

| Cambio de DT | Lo que debe afectar | Senales esperadas | Harness actual | Estado |
|---|---|---|---|---|
| Cambiar formacion | roles, lineas, ancho, altura, balance ATT/MID/DEF | cambia `team shape`, zonas, xG/tiros promedio, exposicion rival | `All formations line audit`, `Formation matrix`, `Formation avg` | En progreso |
| Auto-select por formacion | encaje jugador-slot, preserva roles escasos | LB/RB no cruzados; CAM natural en CAM; CF/ST preservados para ST | `All formations line audit` | OK |
| Faltan extremos naturales | calidad de bandas ofensivas | LW/RW cubiertos por ST/CF debe ser `Fallback`, no OK perfecto | `All formations line audit` | OK como alerta |
| Faltan LM/RM naturales | ancho en 4-4-2/5-4-1 | CM/CDM en LM/RM debe ser `Fallback` y bajar ancho/centros | `All formations line audit` | Falta calibrar motor |
| Mover jugador 1px | senal interna continua | delta pequeno; sin cliff por cruzar 1 pixel | `Professional QA checklist`, `Sensitivity check`, `Position presets matrix`, `Multi-match position smoke` | OK: micro suave |
| Mover jugador 5-10px | zona/linea mas visible | cambia xG, tiros, zona, presion o riesgo en promedio | `Professional QA checklist`, `Position presets matrix`, `Multi-match position smoke` | OK como senal; calibrar sensibilidad |
| Subir un delantero | amenaza, presion, desmarque | sube ataque/riesgo; no debe bajar todo por un pixel | `ATT position smoke` | Revisar mas seeds |
| Bajar un delantero | conexion, menos profundidad | baja amenaza directa, puede subir posesion/conexion | `ATT position smoke` | Pendiente |
| Subir un defensor | presion/salida, riesgo espalda | sube presion/ataque; sube riesgo rival a espalda | `DEF position smoke` | Pendiente |
| Compactar al centro | control central, menor ancho | sube centralidad; baja wide; rival puede atacar bandas | `Scenario matrix`, `Position presets matrix` | OK parcial |
| Abrir bandas | ancho, centros, aislamiento | sube wide; baja compactacion; mas riesgo central/espalda | `Scenario matrix`, `Position presets matrix` | OK parcial |
| Sobrecargar izquierda | canal izquierdo propio/rival | sube izquierda mas que derecha, especialmente vs debilidad | `Smoke rival`, `Battery tablero` | Debil |
| Sobrecargar derecha | canal derecho propio/rival | sube derecha mas que izquierda, especialmente vs debilidad | `Smoke rival`, `Battery tablero` | Debil |
| Cambiar jugador por mejor mismo rol | calidad especifica de rol | mejora promedio en xG/defensa/zona ligada al rol | `Professional QA checklist`, `Player swap matrix`, `Player swap battery`, `Compare precision` | OK; usar Balanced para decidir |
| Cambiar jugador fuera de rol | penalizacion + posible beneficio parcial | baja eficiencia del rol; puede subir una virtud individual | `Player swap matrix`, `Formation line audit` | En progreso |
| Cambiar tactica/style | ritmo, foco, riesgo | modifica distribucion de eventos sin ignorar posiciones | `Scenario matrix`, `Multi-seed matrix` | En progreso |

## Criterios profesionales minimos para MVP jugable

1. El modal debe persistir formacion, jugadores, slots y x/y.
2. El harness debe poder reusar esa configuracion en el mismo partido y seed.
3. El motor debe leer esa configuracion, no recalcular una alineacion generica.
4. Un cambio pequeno debe alterar probabilidades internas de forma suave.
5. Un cambio grande debe alterar comportamiento observable en multi-seed.
6. Los roles escasos deben reservarse: no robar CF/ST si quedan slots ST; no
   usar CAM natural en banco si la formacion pide CAM.
7. Los fallbacks deben ser visibles y penalizables, no bugs silenciosos.
8. Ninguna formacion debe ser estrictamente superior por nombre; debe tener
   tradeoffs de ancho, centro, altura, riesgo y encaje de plantel.

## Smoke visual confirmado

Validado en `/debug/test-harness` con backend/frontend actualizados:

Orden recomendado para tablero combinado: seleccionar primero un partido del usuario y luego correr formaciones, pixeles y swaps. Si se cambia el partido despues, el harness limpia resultados dependientes del contexto del partido.

1. `All formations line audit`:
   - 36/36 rows.
   - 29 OK.
   - 7 Fallback.
   - 0 Review.
2. `Multi-match position smoke`:
   - 45 rows.
   - 24 visible/non-stable.
   - 0 strong 1px cliff rows.
   - 0 repeated 5px bias.
   - 1 visible 5px pattern.
   - 1 big tactical move.
   - Lectura: micro-movimiento suave; la calibracion pendiente es sensibilidad 5px/big-move, no cliff de 1px.
3. `Player swap battery` en partido `Vigo City vs Vigo City 1`:
   - 6 swaps.
   - 6 actionable reads.
   - Low confidence en modo quick.
4. `Player swap precision compare` en partido `Vigo City vs Vigo City 1`:
   - 6 swaps.
   - 4 stable reads.
   - 1 changed read.
   - 1 needs more seeds.
   - Lectura: quick sirve como smoke, pero Balanced 10 seeds es la lectura para decidir calibracion.

## Proxima bateria recomendada

Ejecutar en `/debug/test-harness` para calibracion fina:

1. Calibrar sensibilidad 5px/big tactical move sin apagar la respuesta por pixel.
2. `Formation avg (20 seeds)` para comparar tradeoffs entre las 12 formaciones.
3. `Position presets matrix` o `Sensitivity check` sobre:
   - un ST;
   - un CM;
   - un lateral/carrilero.
4. `Player swap battery` con mas seeds y luego fuera de rol.
5. Registrar cada caso como OK / Fallback / Review / Bug.

## Pendientes concretos

- Separar mejor izquierda vs derecha en el motor: hoy wide global responde mejor
  que side-specific.
- Convertir `Fallback` en penalizacion numerica visible en preview y motor.
- Usar `Professional QA checklist` como tablero principal; ya existe en Panel E
  y queda visible con formaciones, pixels o swaps.
- Probar varios equipos, no solo Real Madrid/Vigo City, para validar planteles
  con perfiles naturales distintos.

## V25D99.122 - Player swap precision compare

- Smoke visual en `/debug/test-harness`, partido `Vigo City vs Vigo City 1`.
- Resultado:
  - 6 swaps comparados.
  - 4 `Stable read`.
  - 1 `Changed read`.
  - 1 `Needs more seeds`.
- Lectura:
  - `Quick 3 seeds` sirve como detector rapido.
  - `Balanced 10 seeds` es la lectura para decidir calibracion.
  - Quick sobreactuo algunos upgrades defensivos; Balanced los llevo a neutral/noise.
- Ajuste del harness:
  - Si se corre solo `Compare precision`, el `Professional QA checklist` ya toma esas filas como evidencia de `Player swap signal`.
  - Checklist visual confirmado: `6 precision swaps · 4 stable · 1 changed · 1 need more seeds` -> `Review`, accion `Trust balanced reads; quick is smoke only.`
- Test frontend harness especifico: 55/55 OK.

## V25D99.123 - Suite frontend completa verde

- Fix CareerSetupComponent: auto-selecciona primera liga disponible si no habia seleccion del usuario.
- Fix SquadManagementComponent: confirmacion usa slots/subdivisiones persistidas como verdad del lineup, no players stale.
- Tests especificos career+squad: 61/61 OK.
- Suite frontend completa: 526 SUCCESS, 2 skipped.

## V25D99.124 - Smoke visual Celta Vigo

- Carrera smoke con Celta Vigo, partido Celta Vigo vs Mallorca, seed 12345.
- All formations audit: 36/36 rows, 29 OK, 4 fallback, 3 review.
- Reviews: 4-4-2 MID, 4-1-4-1 MID y 5-4-1 MID por hard off-role en roles de banda/medio, especialmente Iago Aspas usado como RM.
- Pixel smoke: 15 rows, 7 visible/non-stable, 0 strong 1px cliff, 3 big tactical move -> OK.
- Player swap precision: 6 precision swaps, 6 stable, 0 changed, 0 need more seeds -> OK.
- Formation avg confirma tradeoffs; 4-3-3/4-1-2-3 producen mas tiros/xG, 5-4-1 baja produccion ofensiva.
- Fix harness: Formation avg ya no borra el checklist ni evidencia previa de Panel E; test harness 55/55 OK.
- Proximo ajuste sugerido: auto-select debe preferir WINGER natural para LM/RM antes que convertir ATT a medio de banda cuando el plantel lo permite.

## V25D99.125 - Auto-select profesional para bandas y extremos

- Backend:
  - `WINGER` cuenta como mediocampo solo en formaciones con `LM/RM/LWB/RWB`.
  - `WINGER` cuenta como atacante solo en formaciones con `LW/RW`.
  - Ataques con extremos reservan primero los cupos `LW/RW` y despues completan `ST/CF`.
  - El score de asignacion prefiere roles especificos de banda antes que `MID/ATT` genericos.
- Tests:
  - `LineupCommandUseCaseImplAutoSelectTest`: 20/20 OK.
  - Cubierto `4-4-2`: winger natural en `LM/RM`, no ATT central reconvertido a medio externo.
  - Cubierto `4-3-3`: wingers naturales en `LW/RW`, no gastados en `CM`.
- Smoke visual Celta en `/debug/test-harness`:
  - `All formations line audit`: `36/36 rows · 29 OK · 0 fallback · 7 review`.
  - `4-4-2`: `Bamba LM`, `Damian/F. Beltran CM`, `Hugo Alvarez RM`, `Iago/Jorgen ST` -> OK.
  - `4-3-3`: `Damian/F. Beltran/Hugo Sotelo CM`, `Bamba LW`, `Hugo Alvarez RW`, `Iago ST` -> OK.
  - `4-1-2-3`: extremos arriba y mediocampo limpio -> OK.
- Lectura:
  - Cerrado el bug de autoselect que usaba delanteros centrales como banda cuando habia wingers naturales.
  - Quedan reviews reales en lineas de 3/5 por escasez de carrileros/defensores adecuados; siguiente calibracion tactica, no inconsistencia del modal.

## V25D99.126 - Carrileros segun linea real de la formacion

- Backend:
  - Las necesidades `DEF/MID/ATT` salen del contrato declarado de la formacion, no de interpretar `LWB/RWB` siempre como defensa.
  - `LW/RW` se tratan como ataque solo cuando el cupo ATT permite extremos + delantero central; si no, son mediapuntas de la linea MID (`4-2-3-1`).
- Tests:
  - `LineupCommandUseCaseImplAutoSelectTest` + `LineupCommandUseCaseImplSubdivisionTest`: 39/39 OK.
  - Nuevo pin para `3-5-2`: carrileros/CM quedan en MID; un central extra no invade la linea media.
  - Nuevo pin para `4-2-3-1`: wingers cubren `LW/RW` mediapunta sin generar 12 jugadores.
- Smoke visual Celta:
  - `All formations line audit`: `36/36 rows · 34 OK · 0 fallback · 2 review`.
  - OK nuevo: `3-5-2`, `3-4-3`, `3-5-2-CDM`, `3-4-1-2`, `4-2-3-1`.
  - Reviews restantes:
    - `5-3-2 MID`: 1 defensor como CM.
    - `5-4-1 MID`: 2 defensores como linea media.
- Lectura:
  - Los 2 reviews restantes son coherentes con una plantilla corta para jugar con 5 atras; deben mostrarse/penalizarse, no ocultarse.

## V25D99.127 - Feedback profesional para penalizaciones reales

- Modal `/squad`:
  - Las penalizaciones reales por jugador fuera de rol ahora tienen resumen de impacto acumulado.
  - Cada fila muestra consejo tactico: por ejemplo, un DEF usado como MID se lee como recurso defensivo/partido cerrado, no como bug silencioso.
  - El resumen usa la misma fuente que el motor/preview (`formationEffectiveness.perPlayerEffectiveness`), no una metrica paralela.
- Test:
  - `squad-editor-modal.component.spec.ts`: nuevo pin para DEF parado en MID con penalizacion visible, resumen y consejo.
  - Resultado: `123 SUCCESS`.
- Lectura:
  - Los casos Celta `5-3-2 MID` y `5-4-1 MID` siguen siendo `Review` reales: el sistema debe avisar y penalizar, no esconderlos.
  - Proximo paso recomendado: llevar este mismo lenguaje de "impacto tactico" al harness/motor para comparar formacion, cambio de jugador y movimiento pixelado con una lectura unica.

## V25D99.128 - Coach read contextual en harness

- Harness `/debug/test-harness`:
  - La columna `Coach read` del Scenario summary ahora arranca con el tipo de decision: `formacion`, `estilo`, `cambio`, `posicion`, `rival`, `base` o `escenario`.
  - La lectura deja de ser generica: diferencia "formacion: gana ataque", "cambio: pierde ataque", "rival: rival amenaza", etc.
  - Mantiene los mismos scores tacticos existentes: ataque, perdida de ataque, proteccion, riesgo y canales.
- Test:
  - `test-harness-page.component.spec.ts`: nuevo pin para formacion ofensiva, cambio negativo y amenaza rival.
  - Resultado: `56 SUCCESS`.
- Lectura:
  - Primer puente entre modal y harness: ambos explican el impacto como decision de DT, no como numero aislado.
  - Siguiente paso recomendado: agregar una mini tarjeta de "decision recomendada" por fila o grupo, usando esta lectura contextual.

## V25D99.129 - DT tip por escenario multi-seed

- Harness `/debug/test-harness`:
  - El Scenario summary suma columna `DT tip`.
  - Cada fila traduce la lectura tactica a una recomendacion directa: `Usar como plan A`, `Usar si necesitas empujar`, `Usar para proteger`, `Usar solo por contexto`, `Evitar si defendes`, `Evitar salvo urgencia`, `Revisar con mas seeds` o `No decidir con esto`.
  - El tip tambien se exporta en JSON/CSV como `recommendation` y `recommendationDetail`.
- Test:
  - `test-harness-page.component.spec.ts`: cubre upgrade usable, riesgo defensivo y caso review.
  - Resultado: `57 SUCCESS`.
- Lectura:
  - El harness ya funciona mas como herramienta de DT: ve cambio, impacto, outcome y recomendacion accionable en una misma fila.
  - Siguiente paso recomendado: validar visualmente en navegador con una corrida real de Scenario smoke/Multi-seed.

## V25D99.130 - Smoke visual del harness y error persistente

- Smoke visual en `/debug/test-harness`:
  - Caso probado: `Atletico Madrid vs Sevilla`, `Smoke ataque`.
  - Resultado visible: el endpoint `scenario-matrix/summary` devuelve `404 Not Found` para el `matchId` seleccionado desde Panel C.
  - La ruta backend existe: una llamada directa sin autenticacion devuelve `401`, por lo tanto el bloqueo no parece ser ruta ausente sino mismatch de `matchId`/carrera/fixture usado por el harness.
- Fix frontend:
  - Los errores de Scenario summary ya no quedan solo como snackbar fugaz.
  - Panel E/estado de analisis conserva el error con el texto `... no pudo generar Panel E: ...`, para que el QA visual no pierda la pista.
- Test:
  - `test-harness-page.component.spec.ts`: cubre que el error de Scenario smoke quede visible en el estado de Panel E.
  - Resultado: `58 SUCCESS`.
- Lectura:
  - Mejoro la trazabilidad visual del harness: cuando falla un smoke, ahora sabemos exactamente que fallo.
  - Pendiente real: investigar por que los `matchId` visibles en Panel C no son aceptados por `TestHarnessUseCase`/fixtures del torneo actual para `scenario-matrix/summary`.
