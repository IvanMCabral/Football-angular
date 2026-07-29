# Test Harness QA — comportamiento profesional del motor

Fecha: 2026-07-12  
Stack usado: backend local `8080`, frontend local `4200`, perfil `local,detailed-mutations`
Career smoke: `Vigo City 1`, división `UNDECIMA`, temporada 1, ronda 1  
Seed principal: `12345` / seed de formación real: `223344`

## Objetivo

Validar si el harness permite probar el motor como un juego de fútbol profesional:

- mismo partido con diferentes formaciones;
- mismo partido con cambios tácticos durante el partido;
- varios partidos/equipos con el mismo seed;
- determinismo del motor cuando partido + seed + estado táctico son iguales;
- detectar señales raras o bugs de integración.

## Camino reproducible

1. Levantar Redis, backend y frontend según `PROJECT-STATUS.md`.
2. Crear o usar una career activa.
3. Abrir `/debug/test-harness`.
4. Seleccionar un partido que incluya al equipo del usuario.
5. Para comparar formaciones de verdad, usar `POST /api/v1/career/lineup/auto-select` o `manual-select`, no sólo `set-formation`.
6. Ejecutar `POST /api/v1/test-harness/career/match/{matchId}/replay` con seed fijo.
7. Ejecutar `POST /api/v1/test-harness/career/match/{matchId}/scenario-matrix` con seed fijo.

## Hallazgos ejecutivos

| Área | Resultado | Veredicto |
|---|---:|---|
| Harness carga con career activa | OK | Usable |
| Scenario matrix visual en Panel E | OK | Usable |
| Panel B sin matriz duplicada | OK | Limpio |
| Determinismo mismo seed/estado | OK | Profesional |
| Diferentes equipos/partidos mismo seed | OK | Hay variedad |
| Cambios en vivo por estilo | Parcial | Cambian zonas/xG, no resultado/tiros en esta muestra |
| Formaciones con `auto-select` real | OK | Impactan ratings y partido |
| Formaciones con sólo `set-formation` | Bug/limitación | No impactan nada si no hay lineup/slots reales |

## Prueba A — mismo partido, formaciones reales con auto-select

Partido: `Vigo City 1 vs Valladolid Reserve`  
Seed: `223344`  
Método: `auto-select` por formación + replay del mismo partido.

| Formación | Química | ATT | MID | DEF | Posesión | Tiros | Resultado | Lectura profesional |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 4-4-2 | 74 | 103.0 | 102.8 | 89.5 | 61%-39% | 19-12 | 2-0 | Base equilibrada, gana bien. |
| 4-3-3 | 73 | 123.5 | 104.9 | 77.9 | 66%-34% | 20-8 | 1-0 | Más ataque y control, concede menos tiros; resultado no explota por seed/definición. |
| 4-2-3-1 | 73 | 121.5 | 112.6 | 73.4 | 62%-38% | 15-10 | 2-0 | Buen medio/ataque, menos volumen de tiro pero eficaz. |
| 3-5-2 | 73 | 95.2 | 119.8 | 88.1 | 61%-39% | 22-14 | 2-1 | Más ida y vuelta: alto volumen, también concede más. Tiene sentido. |
| 5-3-2 | 73 | 87.2 | 111.8 | 101.7 | 62%-38% | 19-12 | 1-0 | Más defensa, menos gol. Coherente. |

Conclusión: cuando el cambio de formación reconstruye el lineup/slots, el motor sí responde. Esta es la ruta válida para el harness profesional.

## Prueba B — mismo partido, cambios durante el partido

Partido: `Vigo City 1 vs Valladolid Reserve`  
Seed: `12345`  
Método: `scenario-matrix`.

| Escenario | Minuto | Acción | Score | xG usuario | Tiros usuario | Posesión usuario | Zonas C/W/L | Lectura profesional |
|---|---:|---|---:|---:|---:|---:|---:|---|
| base-balanced | Base | Sin cambios | 0-0 | 0.581 | 9 | 38% | 5/2/2 | Base pobre, rival domina posesión. |
| m45-wide | 45 | WIDE_PLAY | 0-0 | 0.539 | 9 | 38% | 4/3/2 | Sube juego por banda, baja centro. Coherente. |
| m45-central | 45 | CENTRAL_PLAY | 0-0 | 0.587 | 9 | 38% | 7/0/2 | Concentra ataques al centro. Coherente. |
| m45-formation-433 | 45 | 4-3-3 | 0-0 | 0.559 | 9 | 38% | 5/2/2 | Cambia xG leve, poco impacto estructural. |
| m45-formation-4231 | 45 | 4-2-3-1 | 0-0 | 0.575 | 9 | 38% | 6/1/2 | Cambia distribución, impacto moderado. |
| m60-impact-sub | 60 | ST por ST | 0-0 | 0.557 | 9 | 38% | 5/2/2 | Registra sustitución, impacto bajo. |

Conclusión: el harness muestra que los estilos por banda/centro afectan las zonas, lo cual es muy bueno. Pero tiros, posesión y resultado quedaron congelados en esta muestra; para sensación profesional, cambios de minuto 45/60 deberían tener probabilidad visible de alterar volumen, xG y/o marcador según contexto.

## Prueba C — varios partidos/equipos, mismo seed

Seed: `12345`

| Partido | Resultado | Posesión | Tiros | Lectura |
|---|---:|---:|---:|---|
| Barcelona vs Atletico Madrid | 0-1 | 48%-52% | 31-39 | Partido abierto, Atlético superior en volumen. |
| Athletic Club vs Real Madrid | 0-2 | 38%-62% | 20-40 | Real Madrid domina fuerte. Coherente por nivel esperado. |

Conclusión: distintos equipos con mismo seed producen partidos distintos. El motor no está devolviendo una plantilla fija.

## Prueba D — determinismo

Partido: `Vigo City 1 vs Valladolid Reserve`  
Formación: `4-4-2`  
Seed: `998877`

| Run | Resultado | Posesión | Tiros |
|---|---:|---:|---:|
| 1 | 0-0 | 49%-51% | 15-15 |
| 2 | 0-0 | 49%-51% | 15-15 |

Conclusión: determinismo OK. Esto es clave para ajustar motor con seguridad: podemos comparar cambios de código sin ruido aleatorio.

## Bug/limitación detectada: `set-formation` solo no alcanza

Antes de usar `auto-select`, probé:

1. `POST /test-harness/career/set-formation`
2. `POST /test-harness/career/match/{matchId}/replay`

Resultado: 5 formaciones distintas (`4-4-2`, `4-3-3`, `4-2-3-1`, `3-5-2`, `5-3-2`) devolvieron exactamente:

| Score | Posesión | Tiros |
|---:|---:|---:|
| 0-0 | 38%-62% | 9-10 |

Diagnóstico probable: `set-formation` cambia una etiqueta/estado de equipo, pero si no existe lineup real con slots, el motor no recibe una estructura táctica suficiente. En cambio, `auto-select` crea 11 jugadores + 11 slots y ahí el partido cambia.

Recomendación:

- En el harness, el botón `Formation matrix` debe asegurar siempre `auto-select`/`manual-select` antes del replay.
- Si `lineup/current` está vacío, mostrar warning: “No hay lineup activo; set-formation solo no prueba el motor”.
- Ideal: `set-formation` debería rechazar o advertir cuando no hay starting XI confirmado.

## Criterios para que se sienta profesional

| Criterio | Estado actual | Próximo ajuste sugerido |
|---|---|---|
| Misma seed reproduce el mismo partido | OK | Mantener como contrato de QA. |
| Cambiar formación cambia ratings y partido | OK con `auto-select` | Hacer que el harness use siempre slots reales. |
| Cambiar banda/centro cambia zonas | OK | Expandir impacto a tiros/xG según rival. |
| Cambios al minuto 45/60 alteran momentum | Parcial | Que estilo/formación/sustitución afecten posesión, ritmo y generación posterior. |
| Formaciones defensivas conceden menos | Parcial/OK en muestra | Medir con más seeds y promedios. |
| Formaciones ofensivas generan más peligro | Parcial | 4-3-3 subió ataque/posesión, pero no siempre goles; bien si es probabilístico. |
| Sustituciones importan | Débil en muestra | Sustitución debería depender de OVR, cansancio, rol, minuto y estado del partido. |

## Próximas tareas recomendadas

1. Agregar al harness una “Professional QA Matrix” que ejecute N seeds por formación y muestre promedios, no sólo un partido.
2. Mostrar alerta si `lineup/current.players.length !== 11` antes de permitir matrix/replay táctico.
3. En `scenario-matrix`, calcular deltas promedio por seed para estilo ancho/centro/formación/sustitución.
4. Revisar motor live: cambios al minuto 45/60 hoy modifican zonas y xG leve, pero no siempre tiros/posesión/resultados.
5. Agregar prueba automática de contrato:
   - mismo seed + mismo estado = igual resultado;
   - distinta formación real + mismo seed = cambia al menos una métrica relevante;
   - WIDE_PLAY aumenta wide shots promedio;
   - CENTRAL_PLAY aumenta central shots promedio.

## V25D99.22.3 - Scenario matrix con posicion visual

Se agrego al harness la capacidad de probar movimientos visuales sin cambiar formacion ni jugador:

| Scenario | Accion |
|---|---|
| `m45-position-mid-up` | mueve un MID del equipo usuario a `x=50/y=40` desde minuto 45 |
| `m45-position-mid-up-1px` | mueve el mismo MID a `x=50/y=39` |
| `m45-position-mid-wide` | mueve el mismo MID a `x=18/y=50` |

Smoke visual ejecutado en `http://localhost:4200/debug/test-harness` con Real Madrid, seed `12345`:

| Scenario | Observacion |
|---|---|
| `m45-position-mid-up` | subio shots y xG del usuario; confirma que el motor lee el movimiento visual |
| `m45-position-mid-up-1px` | quedo igual en numeros visibles vs `y=40`; correcto por redondeo/seed, sin cliff visible |
| `m45-position-mid-wide` | cambio metricas sin romper resultado; queda para calibrar impacto lateral promedio |

Pendiente profesional:

- Correr la misma matriz en varias seeds y mostrar promedio/desvio.
- Decidir con promedio si `m45-position-mid-up` esta demasiado fuerte o si fue efecto de una seed.
- Panel A todavia puede mostrar `Failed to load match detail` para partido pendiente seleccionado; anotado como bug de UX/harness.

## V25D99.22.4 - Calibracion multi-seed vs replay sin cambio

Fecha: 2026-07-12  
Pantalla: `http://localhost:4200/debug/test-harness`  
Endpoint: `POST /api/v1/test-harness/career/match/{matchId}/scenario-matrix`  
Seeds: `12345..12364` (`n=20`)  
Partido smoke: usuario como visitante en round 1  
Baseline correcto para cambios al minuto 45: `m45-noop-replay`, no `base-balanced`.

Motivo: comparar contra `base-balanced` mezclaba dos cosas distintas:

- partido completo desde minuto 0;
- replay desde minuto 45 con estado parcial ya generado.

Eso hacia parecer que todos los cambios del minuto 45 agregaban tiros por igual. Se agrego `m45-noop-replay` para separar el ruido del harness del impacto tactico real.

| Scenario | Cambio | Avg user xG delta | Avg opp xG delta | Shots | Poss | Central | Wide | Lectura |
|---|---|---:|---:|---:|---:|---:|---:|---|
| `m45-central` | estilo centro | +0.119 | +0.029 | +0.00 | -0.60 | +3.75 | -2.55 | OK: concentra ataques por dentro. |
| `m45-wide` | estilo bandas | -0.017 | +0.029 | +0.00 | -0.60 | -2.30 | +3.75 | OK: mueve ataques a banda, no deberia regalar xG automaticamente. |
| `m45-formation-433` | 4-3-3 | +0.000 | +0.000 | +0.00 | +0.00 | +0.00 | +0.00 | OK si la base ya estaba inferida como 4-3-3 en ese partido. |
| `m45-formation-4231` | 4-2-3-1 | +0.060 | -0.004 | +0.05 | +0.10 | +1.25 | -1.15 | OK: mejora leve y mas central. |
| `m45-position-mid-up` | Valverde x50/y40 | +0.011 | +0.029 | -0.05 | -0.75 | +0.20 | +0.50 | OK: impacto suave, sin cliff promedio. |
| `m45-position-mid-up-1px` | Valverde x50/y39 | +0.023 | +0.027 | +0.15 | -0.75 | +0.30 | +0.65 | OK: 1 pixel afecta, pero poco. |
| `m45-position-mid-wide` | Valverde x18/y50 | -0.020 | +0.013 | +0.05 | -0.30 | -0.15 | +0.70 | OK: abre ancho sin convertirlo en boost gratis. |
| `m60-impact-sub` | Mbappe -> Bellingham | -0.095 | +0.011 | -3.00 | -0.40 | -1.30 | -0.90 | OK/realista: sacar un ATT elite por jugador fuera de rol reduce ataque. |

Conclusion de calibracion:

- El harness ya puede distinguir impacto tactico real de ruido de replay.
- El motor ya toma posiciones visuales por pixel en los inputs tacticos.
- Un pixel no debe garantizar gol/tiro distinto en una sola seed; si debe poder alterar probabilidades. En promedio, `y39` quedo ligeramente mas ofensivo que `y40`.
- Centro/bandas se comportan coherente por zonas: central sube tiros centrales; wide sube tiros por banda.
- No se detecto el bug anterior de "un frame cambia todo" al medir contra el baseline correcto.

Pendiente siguiente:

1. Exponer este promedio multi-seed en la UI del harness, no solo por script.
2. Agregar baseline `m60-noop-replay` para medir sustituciones del minuto 60 con la misma limpieza.
3. Probar el mismo contrato con varias formaciones/equipos, no solo Real Madrid.
4. Guardar en el reporte tambien min/max o desviacion para detectar seeds extremas.

## V25D99.22.5 - Baseline m60 para sustituciones

Fecha: 2026-07-12  
Endpoint: `POST /api/v1/test-harness/career/match/{matchId}/scenario-matrix`  
Seeds: `12345..12364` (`n=20`)  
Baseline correcto para cambios al minuto 60: `m60-noop-replay`.

Se agrego `m60-noop-replay` para medir sustituciones sin mezclar ruido de replay. La sustitucion actual del harness fue:

`Kylian Mbappe (ATT) -> Jude Bellingham (ATT)`

Resultado promedio vs `m60-noop-replay`:

| Scenario | Avg user xG delta | Min | Max | Avg opp xG delta | User shots | Opp shots | Poss | Central | Wide | Lectura |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `m60-impact-sub` | -0.095 | -0.347 | +0.062 | +0.011 | -3.00 | +0.50 | -0.40 | -1.30 | -0.90 | La sustitucion afecta claramente y en esta muestra empeora al usuario. |

Lectura profesional:

- El cambio de jugadores ya afecta el partido desde el minuto efectivo.
- En este equipo/partido, sacar a Mbappe por Bellingham como ATT no se comporta como mejora.
- El harness no debe llamar automaticamente "impact" a una sustitucion; debe mostrar si es upgrade, downgrade o neutral.
- Se agrego `scoreDelta` al detalle de sustitucion como primera ayuda de lectura. En esta muestra aparece `[+0]`, lo que indica que el score simple no alcanza para explicar todo el impacto del motor.

Pendiente siguiente:

1. Mejorar `scoreDelta` para incluir OVR, rol natural vs rol tactico, stamina y atributos reales usados por el motor.
2. Agregar dos escenarios separados:
   - `m60-upgrade-sub`: solo si el banco tiene un jugador claramente mejor para ese slot.
   - `m60-downgrade-sub`: cambio malo intencional para verificar que el motor castiga.
3. Mostrar en la UI del harness: `Sub score`, `role fit`, `natural position`, `slot position`, y delta esperado.
4. Repetir multi-seed con otros equipos donde si exista upgrade real desde el banco.

## V25D99.22.6 - Sustituciones upgrade/downgrade separadas

Fecha: 2026-07-12  
Endpoint: `POST /api/v1/test-harness/career/match/{matchId}/scenario-matrix`  
Seeds: `12345..12364` (`n=20`)  
Baseline: `m60-noop-replay`.

Se separo la sustitucion generica en tres escenarios:

| Scenario | Seleccion |
|---|---|
| `m60-impact-sub` | sustitucion ofensiva historica del harness |
| `m60-upgrade-sub` | mejor par titular/banco por misma posicion y `scoreDelta > 0` |
| `m60-downgrade-sub` | peor par titular/banco por misma posicion y `scoreDelta < 0` |

Resultado promedio vs `m60-noop-replay`:

| Scenario | Cambio | Avg user xG | Avg opp xG | User shots | Opp shots | Lectura |
|---|---|---:|---:|---:|---:|---|
| `m60-downgrade-sub` | Mbappe -> Endrick `[-40]` | -0.129 | +0.028 | -3.30 | +0.90 | OK: cambio ofensivo malo castiga mas que el neutral. |
| `m60-impact-sub` | Mbappe -> Bellingham `[+0]` | -0.095 | +0.011 | -3.00 | +0.50 | OK: cambio neutral/fuera de ajuste baja ataque. |
| `m60-upgrade-sub` | Raul Asencio -> Ferland Mendy `[+36]` | +0.003 | -0.007 | +0.00 | +0.00 | OK: upgrade defensivo no sube ataque, reduce apenas xG rival. |

Conclusion:

- Las sustituciones ya tienen efecto medible.
- El motor castiga un downgrade ofensivo de forma mas clara que un cambio neutral.
- Un upgrade defensivo se ve mas en xG rival que en xG propio; esto es profesionalmente razonable.
- Para probar un upgrade ofensivo real hace falta un equipo/plantel donde el banco tenga un ATT/WINGER claramente mejor que el titular.

Pendiente siguiente:

1. Buscar o crear un fixture/plantel de prueba con upgrade ofensivo real desde el banco.
2. Mostrar `scoreDelta` y tipo de sustitucion en la UI de la matriz.
3. Convertir estos contratos multi-seed en tests automatizados de tendencia.

## V25D99.22.7 - Sustituciones por intencion: ofensivas vs defensivas

Fecha: 2026-07-12  
Endpoint: `POST /api/v1/test-harness/career/match/{matchId}/scenario-matrix`  
Seeds: `12345..12364` (`n=20`)  
Baseline: `m60-noop-replay`.

Se agregaron escenarios mas especificos para que la lectura sea productiva:

| Scenario | Que busca |
|---|---|
| `m60-offensive-upgrade-sub` | mejora ATT/WINGER si existe |
| `m60-offensive-downgrade-sub` | empeora ATT/WINGER si existe |
| `m60-defensive-upgrade-sub` | mejora DEF si existe |
| `m60-defensive-downgrade-sub` | empeora DEF si existe |

En el fixture smoke actual no existe `m60-offensive-upgrade-sub`, porque el banco no tiene un ATT/WINGER mejor que el titular segun `scoreDelta`. Eso es correcto: el harness no inventa un caso falso.

Resultado promedio vs `m60-noop-replay`:

| Scenario | Cambio | Avg user xG | Avg opp xG | User shots | Opp shots | Lectura |
|---|---|---:|---:|---:|---:|---|
| `m60-offensive-downgrade-sub` | Mbappe -> Endrick `[-40]` | -0.129 | +0.028 | -3.30 | +0.90 | OK: downgrade ofensivo castiga fuerte. |
| `m60-defensive-upgrade-sub` | Raul Asencio -> Ferland Mendy `[+36]` | +0.003 | -0.007 | +0.00 | +0.00 | OK leve: upgrade defensivo baja un poco xG rival. |
| `m60-defensive-downgrade-sub` | Dani Carvajal -> Fran Garcia `[-16]` | -0.001 | +0.002 | +0.00 | +0.00 | Debil: diferencia casi imperceptible. |

Conclusion:

- El harness ya separa correctamente cambios ofensivos y defensivos.
- El motor responde bien a downgrade ofensivo.
- El efecto defensivo existe pero es pequeno; para calibracion profesional falta probar un downgrade defensivo mas extremo o aumentar sensibilidad defensiva si los promedios siguen planos.
- Para cerrar el contrato ofensivo positivo falta un fixture con upgrade real ATT/WINGER desde el banco.

Pendiente siguiente:

1. Crear un fixture/plantel controlado para `m60-offensive-upgrade-sub`.
2. Agregar una matriz multi-seed visible en UI para que estos promedios no dependan de PowerShell.
3. Definir umbrales profesionales por tipo:
   - downgrade ofensivo: debe bajar xG/tiros propios;
   - upgrade ofensivo: debe subir xG/tiros propios;
   - upgrade defensivo: debe bajar xG/tiros rivales;
   - downgrade defensivo: debe subir xG/tiros rivales.

## V25D99.22.8 - Fixture controlado con upgrade ofensivo real

Fecha: 2026-07-12  
Endpoint usado para preparar el laboratorio: `POST /api/v1/test-harness/career/inject-player-stats`  
Endpoint medido: `POST /api/v1/test-harness/career/match/{matchId}/scenario-matrix`  
Seeds: `12345..12364` (`n=20`)  
Baseline: `m60-noop-replay`.

Preparacion del career smoke:

| Jugador | Antes | Inyeccion |
|---|---|---|
| Kylian Mbappe | ATT 88 / TEC 88 / MEN 88 | ATT 65 / TEC 65 / MEN 65 / stamina 88 |
| Endrick | ATT 78 / TEC 78 / MEN 78 | ATT 99 / TEC 99 / MEN 99 / speed 99 / stamina 99 |

Objetivo: forzar un caso real de `m60-offensive-upgrade-sub` sin inventar filas falsas.

Resultado promedio vs `m60-noop-replay`:

| Scenario | Cambio | Avg user xG | Avg opp xG | User shots | Opp shots | Lectura |
|---|---|---:|---:|---:|---:|---|
| `m60-offensive-upgrade-sub` | Mbappe -> Endrick `[+136]` | +0.151 | +0.000 | +2.25 | -0.50 | OK: upgrade ofensivo real mejora ataque. |
| `m60-downgrade-sub` | Valverde -> Camavinga `[-20]` | -0.030 | +0.005 | -1.00 | -0.15 | OK leve: downgrade medio reduce ataque. |
| `m60-defensive-upgrade-sub` | Raul Asencio -> Ferland Mendy `[+36]` | +0.002 | -0.008 | +0.00 | +0.00 | OK leve: mejora defensiva reduce xG rival. |
| `m60-defensive-downgrade-sub` | Dani Carvajal -> Fran Garcia `[-16]` | -0.001 | +0.003 | +0.00 | +0.00 | Debil: necesita caso mas extremo o sensibilidad mayor. |

Conclusion:

- Queda cerrado el contrato basico: un upgrade ofensivo real desde el banco sube xG y tiros en promedio.
- Las sustituciones de jugador ya afectan el motor de forma productiva para QA.
- El career smoke quedo alterado intencionalmente para esta prueba controlada. Si se quiere volver al estado Real Madrid original, restaurar Mbappe/Endrick con `inject-player-stats` o recrear career custom.

Pendiente siguiente:

1. Automatizar esta preparacion como boton/accion del harness: "Prepare offensive upgrade lab".
2. Mostrar la matriz multi-seed en la UI con promedios y baseline.
3. Crear tambien un downgrade defensivo extremo para calibrar sensibilidad defensiva.

## V25D99.22.9 - Lab ofensivo automatizado en el harness

Fecha: 2026-07-12

Se agregaron acciones repetibles al harness:

| Accion | Endpoint | Efecto |
|---|---|---|
| Prepare offensive lab | `POST /api/v1/test-harness/career/labs/offensive-upgrade/prepare` | baja a Mbappe y sube a Endrick para forzar `m60-offensive-upgrade-sub` |
| Restore lab | `POST /api/v1/test-harness/career/labs/offensive-upgrade/restore` | restaura Mbappe/Endrick a los valores smoke por defecto |

Valores del laboratorio:

| Jugador | Prepare | Restore |
|---|---|---|
| Mbappe | ATT/DEF/TEC/SPD/MEN `65`, STA `88` | todos `88` |
| Endrick | ATT/TEC/SPD/STA/MEN `99`, DEF `80` | todos `78` |

Tambien se agregaron botones en `http://localhost:4200/debug/test-harness`:

- `Prepare offensive lab`
- `Restore lab`

Flujo recomendado:

1. Click `Prepare offensive lab`.
2. Elegir partido del equipo usuario.
3. Click `Scenario matrix`.
4. Verificar que aparece `m60-offensive-upgrade-sub`.
5. Click `Restore lab` si se quiere volver al plantel smoke base.

Ajustes de motor detectados hasta ahora:

| Area | Lectura | Ajuste candidato |
|---|---|---|
| Upgrade ofensivo | OK: sube xG/tiros en promedio cuando el cambio es fuerte | Mantener, convertir en test de tendencia. |
| Downgrade ofensivo | OK: baja xG/tiros en promedio | Mantener, convertir en test de tendencia. |
| Upgrade defensivo | OK leve: baja xG rival poco | Probar casos mas extremos antes de tocar coeficientes. |
| Downgrade defensivo | Debil: cambios DEF chicos casi no se ven | Crear lab defensivo extremo; si sigue plano, subir sensibilidad defensiva en duelos/riesgo. |
| UI QA | La matriz actual muestra una seed | Agregar multi-seed promedio en UI para evitar conclusiones por una seed. |

## V25D99.22.10 - Lab defensivo extremo

Fecha: 2026-07-12  
Endpoint prepare: `POST /api/v1/test-harness/career/labs/defensive-downgrade/prepare`  
Endpoint restore: `POST /api/v1/test-harness/career/labs/defensive-downgrade/restore`  
Seeds: `12345..12364` (`n=20`)  
Baseline: `m60-noop-replay`.

Preparacion:

| Jugador | Prepare | Restore |
|---|---|---|
| Dani Carvajal | DEF/MEN/STA `99`, ATT/TEC/SPD `88` | todos `85` |
| Fran Garcia | DEF/MEN `35`, ATT/TEC/SPD `45`, STA `55` | todos `78` |

Resultado promedio vs `m60-noop-replay`:

| Scenario | Cambio | Avg user xG | Avg opp xG | User shots | Opp shots | Lectura |
|---|---|---:|---:|---:|---:|---|
| `m60-defensive-downgrade-sub` | Carvajal -> Fran Garcia `[-193]` | -0.011 | +0.056 | +0.00 | +0.00 | OK parcial: sube calidad rival, no volumen. |

Conclusion:

- El motor si detecta un downgrade defensivo extremo: el xG rival sube en promedio.
- No suben los tiros rivales; el impacto entra por calidad de chance concedida, no por volumen.
- Si queremos que el usuario "sienta" mas el error defensivo, el ajuste candidato no es solo xG, sino tambien frecuencia/volumen de ataques rivales desde el minuto efectivo.

Pendiente motor:

1. Revisar si `aggregateDefenderStat` impacta tambien volumen rival o solo calidad.
2. Considerar que un DEF muy malo en cancha aumente:
   - entradas rivales por su canal;
   - errores/duelos perdidos;
   - tiros del rival, no solo xG por tiro.
3. Crear Professional multi-seed UI para ver esta lectura sin PowerShell.

## V25D99.22.11 - Ajuste motor: defensa afecta volumen de chances

Fecha: 2026-07-12  
Cambio: `DetailedSprintetailedMatchEngine` ahora usa `defenderRosterChanceVolumeMultiplier(...)` en `chanceProbability`.

Antes del ajuste, `aggregateDefenderStat` afectaba sobre todo calidad/xG del tiro dentro de `attemptShot`, pero casi no afectaba volumen. Ahora la calidad real de DEF/GK tambien mueve un poco la probabilidad de crear chances:

- defensa debil: sube volumen rival;
- defensa elite: baja volumen rival;
- rango conservador: `0.94` a `1.12`.

Lab defensivo extremo repetido con seeds `12345..12364`:

| Medicion | Avg opp xG | Opp shots | Lectura |
|---|---:|---:|---|
| Antes | +0.056 | +0.00 | Subia calidad rival, no volumen. |
| Despues | +0.070 | +0.35 | Sube calidad y tambien algo de volumen. |

Conclusion:

- El ajuste va en la direccion correcta sin romper el balance.
- El efecto sigue siendo moderado; parece razonable para MVP/profesional inicial.
- Si al probar visualmente se siente poco, el siguiente ajuste deberia ser por canal/duelos, no subir globalmente mucho mas el multiplicador.

## V25D99.22.12 - Multi-seed scenario summary en UI/API

Fecha: 2026-07-12  
Endpoint: `POST /api/v1/test-harness/career/match/{matchId}/scenario-matrix/summary`  
UI: Panel B -> `Multi-seed matrix`.

Objetivo:

- Dejar de decidir balance por una sola seed.
- Comparar cada escenario contra su baseline correcto:
  - cambios minuto 45 -> `m45-noop-replay`;
  - cambios minuto 60 -> `m60-noop-replay`;
  - fallback -> `base-balanced`.
- Mostrar promedio, minimo y maximo de deltas para detectar tendencia real.

Request:

```json
{
  "seedStart": 12345,
  "seedCount": 20
}
```

Respuesta por escenario:

| Campo | Uso |
|---|---|
| `avgUserXgDelta` | tendencia ofensiva del usuario |
| `minUserXgDelta` / `maxUserXgDelta` | ruido/rango de la simulacion |
| `avgOpponentXgDelta` | peligro concedido |
| `avgUserShotsDelta` / `avgOpponentShotsDelta` | volumen de tiros |
| `avgUserCentralDelta` / `avgUserWideDelta` | si el cambio mueve juego por centro/bandas |
| `baselineScenario` | baseline usado para comparar |

Smoke real:

- Usuario: `smoke_20260708214053@test.com`.
- Partido probado: `4a9c6711-72ac-4901-a672-b5790857787e`.
- Seeds: `12345..12349` (`n=5`).
- Resultado: `13` escenarios resumidos OK.

Smoke default UI:

- Seeds: `12345..12364` (`n=20`).
- Tiempo local: `21.52s`.
- Resultado: `13` escenarios resumidos OK.

Lecturas iniciales:

| Scenario | Lectura |
|---|---|
| `m45-wide` | `+3.55` wide, `-1.25` central: coherente. |
| `m45-central` | `+3.65` central, `-1.65` wide: coherente. |
| `m45-position-mid-up-1px` | efecto chico/moderado: `+0.051` xG usuario, `+0.45` central, `+0.40` wide. |
| `m60-upgrade-sub` | impacto casi plano en career base: `+0.001` xG usuario; usar labs extremos para calibracion. |
| `m60-defensive-downgrade-sub` | casi plano sin lab preparado: `+0.005` xG rival; para medir defensa usar `Prepare defensive lab`. |

Nota importante:

- Si se pide un partido que no involucra al equipo usuario, devuelve `422 LINEUP_VALIDATION_ERROR`.
- Esto es correcto: la matriz modifica/lee la tactica del equipo usuario y no debe calibrar partidos ajenos.

Siguiente paso profesional:

1. Correr `Multi-seed matrix` con `n=20` en UI.
2. Repetir tras `Prepare offensive lab` y `Prepare defensive lab`.
3. Si los deltas de sustituciones siguen debiles, calibrar por rol/canal/minuto efectivo.

## V25D99.22.13 - Labs medidos desde Multi-seed matrix

Fecha: 2026-07-12  
Partido: `4a9c6711-72ac-4901-a672-b5790857787e`  
Seeds: `12345..12364` (`n=20`)  
Estado: cada lab fue preparado, medido y restaurado.

### Lab ofensivo

Preparacion: `Prepare offensive lab`.

| Scenario | xG usuario | xG rival | Tiros usuario | Tiros rival | Lectura |
|---|---:|---:|---:|---:|---|
| `m60-offensive-upgrade-sub` | `+0.167` | `-0.020` | `+2.95` | `-0.50` | OK: upgrade ofensivo fuerte se siente. |
| `m60-downgrade-sub` | `+0.003` | `+0.006` | `+0.20` | `+0.05` | Casi neutro en este plantel/caso. |

### Lab defensivo

Preparacion: `Prepare defensive lab`.

| Scenario | xG usuario | xG rival | Tiros usuario | Tiros rival | Lectura |
|---|---:|---:|---:|---:|---|
| `m60-defensive-downgrade-sub` | `-0.027` | `+0.070` | `-0.30` | `+0.35` | OK: downgrade defensivo extremo aumenta peligro rival. |
| `m60-offensive-downgrade-sub` | `-0.125` | `-0.006` | `-2.45` | `-0.20` | OK: sacar ofensivo fuerte baja volumen/xG propio. |

Conclusion:

- El motor ya responde bien a cambios extremos de jugador cuando el lab esta preparado.
- La matriz base puede parecer plana porque los suplentes reales no siempre son lo suficientemente distintos.
- Para version profesional, el siguiente salto no es subir todo globalmente: es mostrar/medir impacto por rol y canal, y hacer que sustituciones naturales tengan diferencias visibles pero razonables.

Bug menor UI corregido:

- El rango mostrado en `Multi-seed scenario summary` ahora toma la seed actual del input; antes podia quedar cacheado en el valor inicial.

## V25D99.22.14 - Defensa sensible por canal en xG

Fecha: 2026-07-12  
Cambio: `DetailedSprintetailedMatchEngine` ahora calcula la calidad defensiva tambien segun la zona del tiro.

Antes:

- `aggregateDefenderStat(...)` devolvia un promedio global de DEF/GK.
- Un lateral debil y un central fuerte se mezclaban demasiado.
- El motor podia detectar "defensa mala" en general, pero no siempre "por donde esta mala".

Ahora:

- `PENALTY_AREA_WIDE` pondera mas defensores ubicados en banda.
- `PENALTY_AREA_CENTER` y `SIX_YARD_BOX` ponderan mas defensores centrales/GK.
- El resultado se mezcla `70%` canal + `30%` global para evitar saltos arcade.

Contrato unitario agregado:

- `channelSensitiveDefenderStatMakesWeakWideDefenderHurtWideShotsMore`
- Caso: lateral izquierdo debil + central fuerte.
- Esperado: la defensa calculada para tiro wide queda por debajo de la defensa calculada para tiro central.

Smoke multi-seed despues del cambio:

| Escenario | Lectura |
|---|---|
| `m45-wide` / `m45-central` | siguen coherentes; no se rompio centro/bandas. |
| `m60-defensive-downgrade-sub` | mantiene `+0.070` xG rival y `+0.35` tiros rival con lab defensivo. |

Conclusion:

- La capa por canal esta en el motor y cubierta por test.
- El harness actual no aisla todavia "atacar exactamente la banda del defensor debil"; por eso el multi-seed general no muestra un salto nuevo evidente.
- Siguiente mejora: agregar un escenario de matriz que fuerce/compare ataque wide contra un lateral debil por izquierda/derecha, con resumen de xG rival por zona.

## V25D99.22.15 - Harness: exposicion defensiva por centro/bandas

Fecha: 2026-07-12  
Endpoint: `scenario-matrix/summary`  
Seeds: `12345..12364` (`n=20`)  
Partido: `4a9c6711-72ac-4901-a672-b5790857787e`.

Cambios:

- Nuevos escenarios:
  - `m45-opponent-wide`: minuto 45, rival cambia a `WIDE_PLAY`.
  - `m45-opponent-central`: minuto 45, rival cambia a `CENTRAL_PLAY`.
- El resumen multi-seed ahora muestra tambien:
  - `avgOpponentCentralDelta`
  - `avgOpponentWideDelta`
- UI: nueva columna `ΔOpp zones C/W`.

Smoke real:

| Scenario | Δ xG rival | Δ tiros rival | Δ zonas rival C/W | Lectura |
|---|---:|---:|---:|---|
| `m45-opponent-wide` | `+0.021` | `+0.65` | `-0.70 / +1.65` | El rival entra mas por bandas. |
| `m45-opponent-central` | `+0.072` | `+0.65` | `+2.55 / -1.05` | El rival entra mas por centro y genera mas xG. |

Conclusion:

- El harness ya permite ver si un cambio nos expone por bandas o por centro.
- Esto conecta directamente con la pregunta de Ivan: un equipo puede tener buen puntaje general, pero si deja costados libres, el rival puede entrar por ahi.
- Proximo paso fino: crear lab de lateral izquierdo/derecho debil y medir `opponent-wide` contra ese canal especifico.

## V25D99.22.16 - Lab de defensores wide debiles

Fecha: 2026-07-12  
Endpoints:

- `POST /api/v1/test-harness/career/labs/weak-wide-defenders/prepare`
- `POST /api/v1/test-harness/career/labs/weak-wide-defenders/restore`

UI:

- `Prepare weak wide DEF lab`
- `Restore weak wide DEF lab`

Comportamiento:

- Detecta defensores del equipo usuario.
- Si no hay slots wide persistidos, toma defensores DEF de fallback.
- En prepare:
  - baja stats a `ATT 45 / DEF 25 / TEC 45 / SPD 45 / STA 55 / MEN 25`;
  - fuerza dos defensores a slots de banda `x18/y78` y `x82/y78`.
- En restore:
  - vuelve a smoke defaults `76`;
  - remueve solo los slots forzados por el lab y preserva otros slots.

Smoke real:

| Estado | Scenario | xG rival | Tiros rival | Zonas rival C/W |
|---|---|---:|---:|---:|
| baseline | `m45-opponent-wide` | `+0.021` | `+0.65` | `-0.70 / +1.65` |
| weak-wide-def-lab | `m45-opponent-wide` | `+0.049` | `+0.00` | `-0.65 / +1.30` |
| baseline | `m45-opponent-central` | `+0.073` | `+0.65` | `+2.55 / -1.05` |
| weak-wide-def-lab | `m45-opponent-central` | `+0.048` | `+0.00` | `+2.45 / -1.25` |

Jugadores afectados en smoke:

- `Antonio Rudiger`
- `Raul Asencio`

Lectura:

- El lab confirma la capa de calidad por canal: al debilitar defensores colocados en banda, `opponent-wide` sube xG rival (`+0.021` -> `+0.049`).
- El volumen no necesariamente sube porque lo controla el estilo/shape; lo que sube es la calidad de las chances concedidas por ese canal.
- Esto es correcto para un primer modelo profesional: mala defensa de banda no debe inventar siempre mas tiros, pero si debe hacer mejores las chances rivales por ahi.

QA adicional:

- `restore` fue ajustado para no borrar la estructura completa de slots del equipo.
- Smoke corto `n=5`: prepare -> matrix -> restore OK, `15` escenarios devueltos.

## V25D99.22.17 - xG por zona en Scenario Matrix Summary

Fecha: 2026-07-12  
Objetivo: distinguir volumen por zona de calidad/peligro real por zona.

Campos agregados:

- `homeCentralXg`, `homeWideXg`, `homeLongXg`
- `awayCentralXg`, `awayWideXg`, `awayLongXg`
- `avgUserCentralXgDelta`, `avgUserWideXgDelta`
- `avgOpponentCentralXgDelta`, `avgOpponentWideXgDelta`

UI:

- Nueva columna en Multi-seed matrix: `ΔOpp xG C/W`.

Smoke real con `Prepare weak wide DEF lab`, `n=5`:

| Scenario | Δ xG rival total | Δ tiros rival C/W | Δ xG rival C/W |
|---|---:|---:|---:|
| `m45-opponent-wide` | `+0.035` | `-1.40 / +1.80` | `-0.053 / +0.098` |
| `m45-opponent-central` | `+0.054` | `+1.80 / -0.60` | `+0.114 / -0.039` |

Conclusion:

- Ahora el harness muestra por donde tira el rival y donde genera xG.
- Esta es la metrica correcta para calibrar laterales/carrileros/centrales.
- Si un equipo deja libres los costados, no solo veremos tiros wide: veremos tambien si esos tiros wide son peligrosos.

## V25D99.22.18 - QA multi-seed amplia del harness

Fecha: 2026-07-12  
Backend: `local,detailed-mutations`
Smoke user recreado desde cero:

- `POST /api/v1/world/seed-la-liga`
- `POST /api/v1/career/start`
- `POST /api/v1/career/lineup/auto-select` con `4-4-2`
- `GET /api/v1/test-harness/career/snapshot`

Partido usado:

- `careerId`: `6f5b0309-10e9-4a19-8d72-6256c585604a`
- `matchId`: `d1eb7556-10a5-4711-87d0-2a4598796068`
- Usuario de local.
- Seeds por bloque: `20`.

Validaciones previas:

- Backend targeted test: `mvn -q -Dtest=DetailedSprintetailedMatchEngineFormationTest test` OK.
- Frontend build: `npm run build` OK.

Tabla principal:

| Lab | Scenario | Δ user xG | Δ opp xG | Δ user xG C/W | Δ opp xG C/W | Δ user tiros C/W | Δ opp tiros C/W |
|---|---:|---:|---:|---:|---:|---:|---:|
| base | `m45-central` | `+0.248` | `-0.009` | `+0.339 / -0.073` | `-0.010 / +0.002` | `+5.30 / -2.15` | `-0.30 / +0.10` |
| base | `m45-wide` | `+0.087` | `-0.009` | `-0.032 / +0.135` | `-0.010 / +0.002` | `-0.65 / +3.65` | `-0.30 / +0.10` |
| base | `m45-opponent-central` | `+0.018` | `+0.032` | `+0.014 / +0.006` | `+0.045 / -0.012` | `+0.30 / +0.20` | `+1.35 / -0.65` |
| base | `m45-opponent-wide` | `+0.018` | `+0.002` | `+0.014 / +0.006` | `-0.028 / +0.028` | `+0.30 / +0.20` | `-0.90 / +1.30` |
| offensive-upgrade | `m60-offensive-upgrade-sub` | `+0.181` | `+0.002` | `+0.135 / +0.039` | `+0.008 / -0.005` | `+1.50 / +0.75` | `+0.30 / -0.25` |
| base | `m60-offensive-downgrade-sub` | `-0.150` | `-0.012` | `-0.115 / -0.022` | `-0.015 / +0.003` | `-1.65 / -0.65` | `-0.45 / +0.15` |
| weak-wide-defenders | `m45-opponent-wide` | `-0.005` | `+0.047` | `+0.000 / -0.010` | `-0.026 / +0.073` | `+0.10 / -0.30` | `-0.75 / +1.20` |
| weak-wide-defenders | `m45-opponent-central` | `-0.005` | `+0.026` | `+0.000 / -0.010` | `+0.098 / -0.068` | `+0.10 / -0.30` | `+1.85 / -1.20` |

Lectura:

- El eje visual centro/banda ya responde de manera consistente:
  - `m45-central` sube tiros y xG centrales del usuario.
  - `m45-wide` sube tiros y xG wide del usuario.
  - `m45-opponent-central` mueve el peligro rival al centro.
  - `m45-opponent-wide` mueve el peligro rival a bandas.
- La calidad defensiva por canal ya se ve en xG:
  - con `weak-wide-defenders`, el rival por banda pasa a `+0.073` xG wide aunque su xG central baja.
- Las sustituciones empiezan a afectar:
  - mejora ofensiva: `+0.181` user xG.
  - downgrade ofensivo: `-0.150` user xG.

Hallazgos / cosas que todavia necesitamos:

1. Hacer los labs reversibles de forma perfecta.
   - Hoy los labs restauran a defaults smoke (`76`) en vez de guardar snapshot exacto de stats originales.
   - Para QA profesional conviene que cada prepare guarde un snapshot temporal o incluya restore exacto por jugador.

2. Separar labs de canal izquierdo/derecho.
   - El lab actual debilita dos defensores wide a la vez.
   - Para calibrar fino necesitamos:
     - weak-left-defender
     - weak-right-defender
     - weak-center-backs
   - Eso permitiria verificar si atacar por izquierda/derecha castiga exactamente al defensor correcto.

3. Mejorar escenarios de sustitucion.
   - Algunos escenarios de downgrade/defensive sub tienen efecto bajo o ambiguo.
   - Deben quedar mas expresivos: cambio de jugador claramente mejor/peor debe producir señal estable en `n=20`.

4. Convertir esta matriz en test automatizado.
   - El harness ya permite verlo manualmente.
   - Falta un smoke/contract test que falle si:
     - central no sube central xG,
     - wide no sube wide xG,
     - offensive upgrade no sube user xG,
     - weak-wide no sube opponent wide xG.

5. Performance / UX.
   - `n=20` con 4 labs tardo cerca de 3m30s.
   - Para producto conviene correrlo async con progreso o presets (`fast n=5`, `balanced n=20`, `deep n=100`).

## V25D99.22.19 - Labs reversibles con snapshot exacto

Fecha: 2026-07-12  
Objetivo: que los experimentos del harness no contaminen la carrera ni restauren a defaults inventados.

Cambio:

- `prepare` de cada lab guarda un snapshot en memoria por `userId + lab`:
  - stats exactos de jugadores afectados;
  - slots exactos del equipo antes de mutar.
- `restore` primero intenta restaurar ese snapshot exacto.
- Si el backend fue reiniciado entre `prepare` y `restore`, se conserva el fallback anterior de smoke defaults.

Labs cubiertos:

- `offensive-upgrade`
- `defensive-downgrade`
- `weak-wide-defenders`

Smoke real:

| Lab | Restore exacto | Jugadores restaurados | Slots restaurados |
|---|---:|---:|---:|
| `offensive-upgrade` | `true` | `2` | `11` |
| `defensive-downgrade` | `true` | `2` | `11` |
| `weak-wide-defenders` | `true` | `2` | `11` |

Validacion:

- `mvn -q -DskipTests compile` OK.
- `mvn -q -Dtest=DetailedSprintetailedMatchEngineFormationTest test` OK.
- `npm run build` OK.

Lectura:

- Ahora los labs son bastante mas seguros para iterar.
- Podemos preparar, correr matrix, restaurar, y repetir sin degradar silenciosamente los jugadores.
- Sigue pendiente una version persistente de snapshots si queremos tolerar restart de backend entre prepare/restore.

Proximo ajuste recomendado:

1. Crear labs por canal:
   - `weak-left-defender`
   - `weak-right-defender`
   - `weak-center-backs`
2. Agregar asserts automaticos para que la matrix falle si centro/banda deja de responder.

## V25D99.22.20 - Labs defensivos por canal

Fecha: 2026-07-12  
Objetivo: aislar mejor si el motor castiga el canal defensivo correcto.

Endpoints agregados:

- `POST /api/v1/test-harness/career/labs/weak-left-defender/prepare`
- `POST /api/v1/test-harness/career/labs/weak-left-defender/restore`
- `POST /api/v1/test-harness/career/labs/weak-right-defender/prepare`
- `POST /api/v1/test-harness/career/labs/weak-right-defender/restore`
- `POST /api/v1/test-harness/career/labs/weak-center-backs/prepare`
- `POST /api/v1/test-harness/career/labs/weak-center-backs/restore`

UI:

- Botones nuevos en `debug/test-harness`:
  - `Prepare weak left DEF`
  - `Restore weak left DEF`
  - `Prepare weak right DEF`
  - `Restore weak right DEF`
  - `Prepare weak CB lab`
  - `Restore weak CB lab`

Comportamiento:

- `weak-left-defender`: toma un DEF en canal izquierdo y lo fuerza a `x18/y78`.
- `weak-right-defender`: toma un DEF en canal derecho y lo fuerza a `x82/y78`.
- `weak-center-backs`: toma dos DEF centrales y los fuerza a `x42/y78` y `x58/y78`.
- Todos usan snapshot exacto para restaurar stats + slots.

Smoke real:

| Lab | Canal | Afectados | Restore exacto | Slots restaurados |
|---|---:|---:|---:|---:|
| `weak-left-defender` | `LEFT` | `1` | `true` | `11` |
| `weak-right-defender` | `RIGHT` | `1` | `true` | `11` |
| `weak-center-backs` | `CENTER` | `2` | `true` | `11` |

Validacion:

- `mvn -q -DskipTests compile` OK.
- `mvn -q -Dtest=DetailedSprintetailedMatchEngineFormationTest test` OK.
- `npm run build` OK.

Lectura:

- Ya tenemos herramientas para preparar experimentos por canal.
- La matrix actual todavia reporta wide agregado, no left/right separado.
- Siguiente mejora de precision: agregar escenarios/metricas de ataque rival por izquierda y por derecha, no solo `opponent-wide`.

## V25D99.22.21 - Métricas wide izquierda/derecha

Fecha: 2026-07-12  
Objetivo: empezar a distinguir el peligro por cada banda, no solo `wide` agregado.

Campos backend agregados en `ScenarioMatrixRow`:

- `homeLeftWideShots`, `homeRightWideShots`
- `homeLeftWideXg`, `homeRightWideXg`
- `awayLeftWideShots`, `awayRightWideShots`
- `awayLeftWideXg`, `awayRightWideXg`

Campos agregados en `ScenarioMatrixSummaryRow`:

- `avgUserLeftWideDelta`, `avgUserRightWideDelta`
- `avgOpponentLeftWideDelta`, `avgOpponentRightWideDelta`
- `avgUserLeftWideXgDelta`, `avgUserRightWideXgDelta`
- `avgOpponentLeftWideXgDelta`, `avgOpponentRightWideXgDelta`

Criterio:

- El motor usa coordenadas `x/y`.
- `x` = profundidad hacia el arco.
- `y` = eje izquierda/derecha.
- Para tiros `PENALTY_AREA_WIDE`:
  - `y < 50` cuenta como left wide.
  - `y >= 50` cuenta como right wide.

Smoke real corto (`n=5`, scenario `m45-opponent-wide`):

| Lab | Δ xG wide rival | Δ xG rival L/R | Δ tiros rival L/R |
|---|---:|---:|---:|
| base | `+0.047` | `+0.054 / -0.007` | `+2.00 / -0.40` |
| `weak-left-defender` | `+0.063` | `+0.040 / +0.023` | `+1.00 / +0.60` |
| `weak-right-defender` | `+0.056` | `+0.040 / +0.016` | `+1.00 / +0.40` |

Lectura:

- El JSON ya trae metricas L/R y compila.
- Pero el scenario `m45-opponent-wide` todavia no fuerza un lado: solo aumenta probabilidad de tiros wide.
- La coordenada exacta izquierda/derecha sigue saliendo por distribucion aleatoria del `DetailedShotCoordinateGenerator`.
- Por eso `weak-left-defender` y `weak-right-defender` todavia no se separan con claridad.

Siguiente mejora real:

- Agregar en el motor/harness un sesgo lateral explicito:
  - `m45-opponent-left`
  - `m45-opponent-right`
- Opciones:
  1. extender `TeamStyle` con `LEFT_FLANK` / `RIGHT_FLANK`;
  2. agregar un `sideBias` solo en `ScenarioAction` del harness;
  3. agregar un modo de generador de coordenadas wide con bias lateral.

Preferencia actual:

- Opción 2 para QA/harness primero.
- Luego, si se siente bien, convertirlo en táctica real de juego.

## V25D99.22.22 - LEFT/RIGHT flank internos y xG defensivo por lado

Fecha: 2026-07-12  
Objetivo: que los labs `weak-left-defender` / `weak-right-defender` tengan una prueba real, no solo `wide` aleatorio.

Cambios:

- `TeamStyle` agrega estilos internos:
  - `LEFT_FLANK`
  - `RIGHT_FLANK`
- Se usan como estilos de calibración/harness, no como táctica visible todavía.
- En volumen y distribución base se comportan como `WIDE_PLAY`.
- Diferencia:
  - `LEFT_FLANK` sesga tiros `PENALTY_AREA_WIDE` a `y=18..42`.
  - `RIGHT_FLANK` sesga tiros `PENALTY_AREA_WIDE` a `y=58..82`.
- El motor ahora genera coordenada antes de calcular xG.
- El cálculo defensivo de tiros wide usa la coordenada:
  - defensor del mismo lado pesa más;
  - defensor del lado opuesto pesa menos;
  - centrales pesan menos en tiros wide.
- El harness agrega scenarios:
  - `m45-opponent-left`
  - `m45-opponent-right`

Smoke real (`n=10`):

| Lab | Scenario | Δ xG wide rival | Δ xG rival L/R | Δ tiros rival L/R |
|---|---|---:|---:|---:|
| base | `m45-opponent-left` | `+0.014` | `+0.032 / -0.018` | `+1.40 / -0.80` |
| base | `m45-opponent-right` | `+0.014` | `-0.017 / +0.032` | `-0.80 / +1.40` |
| base | `m45-opponent-wide` | `+0.014` | `+0.009 / +0.005` | `+0.40 / +0.20` |
| `weak-left-defender` | `m45-opponent-left` | `+0.036` | `+0.064 / -0.028` | `+1.60 / -1.00` |
| `weak-left-defender` | `m45-opponent-right` | `+0.005` | `-0.042 / +0.047` | `-1.10 / +1.70` |
| `weak-right-defender` | `m45-opponent-left` | `+0.015` | `+0.051 / -0.035` | `+1.80 / -0.90` |
| `weak-right-defender` | `m45-opponent-right` | `+0.048` | `-0.026 / +0.074` | `-1.00 / +1.90` |

Lectura:

- `m45-opponent-left` ya carga claramente el lado izquierdo.
- `m45-opponent-right` ya carga claramente el lado derecho.
- Debilitar el lateral correcto aumenta el xG concedido por ese lado:
  - `weak-left-defender` + `opponent-left`: left xG `+0.064`.
  - `weak-right-defender` + `opponent-right`: right xG `+0.074`.
- Esto ya se comporta como una herramienta profesional de calibración por canal.

Validacion:

- Backend compile OK.
- Frontend build OK.
- `mvn -q -Dtest=DetailedSprintetailedMatchEngineFormationTest test` OK.

Siguiente mejora:

- Agregar columna visual en la tabla Multi-seed para `ΔOpp wide L/R xG`.
- Limpiar mojibake viejo del template (`Î”`, `Â·`) antes de seguir agregando columnas.
- Después decidir si `LEFT_FLANK` / `RIGHT_FLANK` se vuelven tácticas reales visibles para el DT.

## V25D99.22.23 - Columna visual ΔOpp wide L/R xG

Fecha: 2026-07-12  
Objetivo: que la tabla Multi-seed muestre directamente el impacto por banda izquierda/derecha rival.

UI:

- Se agregó columna:
  - `ΔOpp wide L/R xG`
- La celda muestra:
  - `L {avgOpponentLeftWideXgDelta}`
  - `R {avgOpponentRightWideXgDelta}`
- Se ajustó el grid de `scenario-matrix-summary-row` a 13 columnas.
- Se aumentó `min-width` de la tabla summary a `1600px`.

Encoding:

- El template está en UTF-8 correcto.
- La consola PowerShell puede mostrar mojibake (`Î”`, `Â·`) por codepage, pero el archivo contiene:
  - `Δ` (`\u0394`)
  - `·`

Validación:

- `npm run build` OK.

Lectura:

- Ahora se puede ver en pantalla si `m45-opponent-left` carga xG por izquierda y `m45-opponent-right` por derecha.
- Esto cierra el circuito visual mínimo para calibrar laterales/carrileros.

## V25D99.22.24 - QA visual de Multi-seed L/R

Fecha: 2026-07-12  
Pantalla: `http://localhost:4200/debug/test-harness`

Flujo visual probado:

1. Abrir `debug/test-harness`.
2. Seleccionar match `Atletico Madrid vs Real Madrid`.
3. Correr `Multi-seed matrix`.
4. Esperar tabla `Multi-seed scenario summary`.
5. Verificar columna `ΔOpp wide L/R xG`.

Resultado visible:

| Scenario | ΔOpp wide L/R xG |
|---|---:|
| `m45-opponent-wide` | `L +0.02 · R +0.01` |
| `m45-opponent-left` | `L +0.05 · R -0.02` |
| `m45-opponent-right` | `L -0.03 · R +0.06` |

Lectura:

- La columna aparece correctamente.
- `opponent-left` carga el lado izquierdo.
- `opponent-right` carga el lado derecho.
- El harness ya permite ver en pantalla si los cambios de banda tienen efecto real en el partido.

Validación:

- DOM visual contiene `ΔOpp wide L/R xG`.
- Multi-seed corrió con `20` seeds.
- La tabla conserva scroll horizontal y no rompe el layout.
