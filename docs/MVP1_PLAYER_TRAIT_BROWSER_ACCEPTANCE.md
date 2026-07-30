# MVP 1 player trait browser acceptance

Date: 2026-07-30

Scope: final visual smoke for player names, positions and two special trait chips after frontend UTF-8 remediation.

## Browser path

Chrome local was launched with remote debugging and controlled through the Chrome DevTools Protocol. No npm dependency was added and no backend contract was changed.

Screenshots were captured under `D:\temp\mvp1-browser-smoke`:

- `esp-squad.png`
- `arg-squad.png`
- `bra-squad.png`

Raw smoke output:

- `D:\temp\mvp1-browser-smoke\visual-smoke-results.json`

## Results

| Country | Route | League | Club | Players | Sample player | Position | Trait count | Mojibake in DOM | Console errors | Unexpected network failures |
| --- | --- | --- | --- | ---: | --- | --- | ---: | --- | ---: | --- |
| ESP | `/squad` | Spanish Primera Division | Real Madrid | 24 | Federico Valverde | CM | 2 | no | 0 | only `/favicon.ico` 404 |
| ARG | `/squad` | Argentine Primera Division | River Plate | 24 | Juan Carlos Portillo | CB | 2 | no | 0 | none |
| BRA | `/squad` | Brazilian Serie A | Flamengo | 24 | Ayrton Lucas | CDM | 2 | no | 0 | none |

## Trait samples

| Country | Trait 1 | Trait 2 |
| --- | --- | --- |
| ESP | Workhorse — Sustains defensive and pressing work. | Set piece specialist — Danger from dead-ball delivery or shots. |
| ARG | Aerial specialist — Strong aerial duel profile. | Leader — Collective mentality stabilizer. |
| BRA | Set piece specialist — Danger from dead-ball delivery or shots. | Press resistant — Keeps control under pressure. |

## Encoding guard

`npm test` now runs `tools/check-visible-text-encoding.mjs` first. The guard scans `src/app` and `src/assets`, excluding dependencies and build output, and fails if common mojibake markers are present in visible text or active fixtures.

Latest focused execution:

- command: `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/shared/components/player-card/player-card.component.spec.ts`
- guard: passed, 381 files scanned
- tests: 11 success

## Verdict

Player trait visual acceptance is approved for MVP 1. The UI renders real player data for Spain, Argentina and Brazil, keeps exactly two backend traits per sampled player, and shows no mojibake in the observed DOM.
