# Relatório — Sons futuristas de tiro

Data: 2026-11-05

## Resultado

Os tiros confirmados agora usam síntese Web Audio por personagem:

- **BoyPunk:** plasma curto, brilhante e agudo, oscilador triangle de aproximadamente 1040→430 Hz;
- **Nilo:** energia mais grave e encorpada, oscilador sawtooth de aproximadamente 390→135 Hz.

A escolha usa `characterId` do atirador no evento `playerShotEmitted`, não o slot. Portanto Nilo solo mantém a identidade de Nilo e os dois jogadores recebem sons próprios no coop.

## Integração

`emitPlayerProjectile` publica o evento somente depois que o projétil entra na simulação e inclui `sourceId`, personagem, índice/ID da rajada e estados TR/RD. `main.js` deixou de tocar o arquivo de ataque no evento genérico `attack` e chama `playPlayerShot` uma vez por `playerShotEmitted`.

A política é **um som por projétil confirmado**: tiro normal = um som; Rajada Dupla = dois sons, com variação leve no segundo; Tiro Rápido preserva cada evento aceito. Projétil recusado pelo limite não toca. Cadência, dano, velocidade, colisão e quantidade de projéteis não mudaram.

O `AudioManager` mantém um único `AudioContext`, um barramento de efeitos com ganho global, um buffer determinístico de ruído por contexto e até oito vozes de tiro simultâneas. Altar e penalidade bônus também passam pelo barramento em vez de conectar diretamente ao destino. Volume e mute atualizam o barramento. Nós são desconectados ao término; falhas usam o arquivo antigo `attack` como fallback e geram aviso único, sem interromper gameplay.

A geração de ruído não chama `Math.random`, mantendo o RNG da simulação independente. `resume()` continua sendo iniciado por interação e rejeições são tratadas. Ausência de Web Audio conserva o fallback existente e os arquivos antigos não foram excluídos.

## Validação

Direcionados: `tests/character-shot-audio.test.mjs`, `tests/audio-webkit.test.mjs`, `tests/powerups.test.mjs`, `tests/coop.test.mjs` e `tests/survival-powerups.test.mjs`: 48 casos internos aprovados, zero falhas/ignorados.

Cobertura: identidade solo/coop, evento por projétil de RD, perfis de frequência distintos, reuso de buffer, independência de `Math.random`, barramento/volume/mute, limite de vozes e falha de Web Audio sem quebra ou spam.

Mocks comprovam roteamento e contratos, não qualidade sonora. A escuta comparativa ficou pendente porque o bind local retornou `EPERM`; nenhum navegador ou controle físico foi declarado como testado.

Validação final do lote: `npm run check` aprovado; `npm test` agregou 33 arquivos, com 33 aprovados, 0 falhos, 0 cancelados e 0 ignorados. A primeira execução integral encontrou uma asserção antiga que media o ganho no envelope local; com o novo mixer, volume global e envelope ficam em nós separados. O teste foi corrigido para verificar o produto efetivo dos dois ganhos (`0,5 × 0,055 = 0,0275`), sem mudar o nível audível nem afrouxar a cobertura.

## Arquivos e reversão

Alterados nesta etapa: `src/audio.js`, `src/core.js`, `src/main.js`, `tests/core.test.mjs`; criado `tests/character-shot-audio.test.mjs`. O checkpoint imediatamente anterior é `docs/checkpoints/survival-powerups-audio-2026-11-05-v2-pos-etapa-a-pre-audio/`. Como `tests/core.test.mjs` só entrou no escopo após a falha integral, seu estado imediatamente anterior ao ajuste foi preservado separadamente em `v2b-pre-ajuste-teste-mixer/`, com manifesto; ele foi reconstruído pela reversão exata do patch de duas linhas capturado nesta execução, e essa limitação está explicitada em vez de atribuir uma origem Git inexistente.

O estado entregue e validado foi preservado em `docs/checkpoints/survival-powerups-audio-2026-11-05-v3-final-validado/`, também com `MANIFESTO.sha256`.

Para reverter somente áudio, restaure individualmente `src/audio.js` a partir do checkpoint inicial `v1`, `src/core.js`/`src/main.js` a partir do checkpoint `v2` e `tests/core.test.mjs` a partir de `v2b`; remova somente `tests/character-shot-audio.test.mjs`. Não restaurar `src/core.js`/`src/main.js` do `v1`, pois isso também apagaria a Etapa A.

## Roteiro de escuta

1. Com volume em 50–70%, disparar isoladamente com BoyPunk e depois com Nilo na campanha e Sobrevivência.
2. Confirmar plasma mais curto/agudo no BoyPunk e corpo mais grave no Nilo.
3. Coletar TR e RD separadamente e juntos; cada projétil visível deve corresponder a um ataque audível, sem duplicação.
4. Repetir no coop com disparos simultâneos; observar ausência de clipping evidente.
5. Alternar mute e volume durante fogo rápido, pausar/retomar e inspecionar o console por erros repetidos.

