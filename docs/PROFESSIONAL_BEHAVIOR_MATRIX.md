# Professional behavior matrix

Fecha: 2026-07-12

Objetivo: auditar si el motor se comporta como un juego profesional cuando el DT modifica el dibujo, los jugadores y la táctica.

## Regla de lectura

No buscamos que todos los cambios mejoren al equipo. Buscamos que cada cambio afecte en una dirección futbolística razonable.

| Cambio | Resultado esperado | Resultado actual | Estado |
|---|---|---|---|
| Jugar por izquierda contra debilidad izquierda | sube xG rival/propio por izquierda | `m45-opponent-left`: L sube, R baja | OK |
| Jugar por derecha contra debilidad derecha | sube xG rival/propio por derecha | `m45-opponent-right`: R sube, L baja | OK |
| Mover 1px cerca de una zona | cambio chico, sin salto | test automático OK; visual pendiente | En progreso |
| Compactar centro | más central, menos wide | `m45-shape-compact-center`: xG `+0.20`, zonas C `+1.90`, W `-0.85`; rival wide `+1.05` | OK con riesgo |
| Abrir bandas | más wide, menos central | `m45-shape-wide-overload`: xG `+0.10`, tiros `+1.25`, W `+0.60`; también concede más | OK con riesgo |
| Subir líneas | más ataque y/o presión, posible riesgo | `m45-shape-attacking-high`: xG `+0.29`, tiros `+3.90`; xG rival `+0.14`, tiros rival `+3.95` | OK |
| Bajar líneas | menos riesgo, menos ataque | `m45-shape-defensive-low`: xG `-0.29`, tiros `-5.05`; xG rival `-0.03`, tiros rival `-1.20` | OK |
| Sobrecarga izquierda | más actividad izquierda | `m45-shape-left-overload`: xG `+0.11`, tiros `+4.40`, wide `+3.30`; L/R xG casi plano | Débil en lado específico |
| Sobrecarga derecha | más actividad derecha | `m45-shape-right-overload`: xG `+0.19`, tiros `+4.50`, wide `+3.30`; L/R xG casi plano | Débil en lado específico |
| Sustitución ofensiva fuerte | cambia xG/tiros propios | ya se ve en downgrade ofensivo; falta más rol | En progreso |
| Sustitución defensiva fuerte | cambia xG/tiros rivales por zona correcta | señal todavía débil | Débil |

## Próxima actualización

## Lectura de la corrida shape

Pantalla: `http://localhost:4200/debug/test-harness`  
Match: `Athletic Club vs Real Madrid`  
Seeds: `12345..12364`  
Fecha: 2026-07-12

Conclusión:

- El motor ya responde bien a altura global:
  - subir líneas aumenta ataque y riesgo;
  - bajar líneas reduce ataque y reduce algo el riesgo.
- El motor responde a ancho global:
  - wide/overload aumenta volumen wide;
  - compact-center mueve juego al centro.
- Lo todavía débil:
  - `left-overload` y `right-overload` suben wide en general, pero no separan claramente L/R xG.
  - Eso indica que el shape completo por lado todavía necesita conectarse mejor con generación de coordenadas/selección de lado, no solo con estilo `LEFT_FLANK` / `RIGHT_FLANK`.

Próxima actualización:

- Mejorar sobrecargas manuales izquierda/derecha para que el lado visual real afecte `leftWideXg/rightWideXg`.
