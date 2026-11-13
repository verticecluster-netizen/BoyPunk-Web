# Relatório — correção do movimento horizontal A/D

Data: 2026-11-05  
Escopo: input horizontal e composição teclado/mouse/gamepad/coop.

## Resultado

O eixo horizontal agora respeita a última direção fisicamente pressionada. Se
A e D estiverem mantidos, vence a mais recente; ao soltá-la, a outra volta a
comandar o personagem. Soltar uma tecla não cancela outra tecla equivalente
ainda mantida (por exemplo, `KeyA` e `ArrowLeft`). Sem direção mantida, o input
fica em zero e a velocidade termina de cair pelo atrito já existente.

Não foram alterados aceleração, atrito, velocidade máxima, salto, colisões,
deadzone de gamepad, arte, poderes, dificuldade, fases ou releases.

## Causa comprovada

O lote anterior passou a rastrear os códigos físicos para não perder uma ação
quando duas teclas equivalentes estavam mantidas, mas o snapshot continuava
publicando `left: true` e `right: true` ao pressionar direções opostas. Em
`GameModel.updatePlayer`, o cálculo `right - left` convertia esse estado em
zero. Assim, A → D não invertia imediatamente: aplicava atrito enquanto as duas
direções permaneciam verdadeiras. Não era apenas animação; a velocidade e a
posição recebiam eixo zero.

O caminho comprovado era:

`keydown/keyup` (`event.code`) → `heldCodes`/ações mantidas → snapshot com dois
booleanos opostos → subtração no modelo → aceleração/atrito → `vx` → posição.

Não foi encontrada mistura de `event.key` com `event.code`, input horizontal de
mouse, listener de `InputController` recriado no retry ou orientação visual
usada como fonte de velocidade. O mouse no Canvas somente pulsa o ataque; a
direção de tiro usa `player.facing`, que é atualizada pelo eixo horizontal.

## Correção

- Cada fonte horizontal física recebe uma ordem monotônica apenas no primeiro
  `keydown`/`pointerdown` válido.
- Repetições do navegador não reordenam as direções. Um `repeat` órfão após
  blur é descartado e não reativa uma tecla antiga.
- O snapshot resolve um único eixo `-1`, `0` ou `1` e deriva `left/right` desse
  resultado. `GameModel.updatePlayer` consome esse eixo; chamadas antigas que
  fornecem somente booleanos mantêm fallback compatível.
- A e ←, assim como D e →, permanecem fontes independentes. Soltar uma preserva
  a outra.
- Teclado autorizado tem precedência enquanto realmente solicita direção;
  gamepad neutro não bloqueia o teclado. Quando não há teclado autorizado, o
  provider de gamepad continua sendo a fonte do slot.
- Blur, documento oculto e limpeza integral removem códigos e prioridade. A
  transição limpa a prioridade e bloqueia ações antigas até a liberação física,
  impedindo retomada sem nova entrada.
- Coop mantém `keyboardSlots` e providers por jogador; nenhum slot novo foi
  habilitado e não houve mudança de deadzone.

## Arquivos

- `src/input.js`: prioridade por fonte física, resolução do eixo e limpeza.
- `src/core.js`: consumo explícito do eixo resolvido, com fallback compatível.
- `tests/horizontal-input.test.mjs`: regressões de eventos e efeito no modelo.
- `CONTINUIDADE_BOYPUNK_WEB.md`: passagem desta correção.
- Este relatório.

Backup anterior à edição:

- `evidencias/recovery/BoyPunk-Web-pre-correcao-movimento-ad-20261105-v1.tar.gz`
- SHA-256 `d044201485673ea9eaac1df57b4096301abeba72ab1952b85a91e23f8744f96f`

Checkpoint final:

- `evidencias/recovery/BoyPunk-Web-correcao-movimento-ad-20261105-v2-final.tar.gz`

O repositório não possui metadados Git utilizáveis nesta cópia; por isso os
checkpoints são arquivos versionados e não commits. Não foi usado reset/clean.

## Testes

Baseline antes da correção:

- `npm run check`: aprovado.
- `npm test`: 35/35 arquivos aprovados.
- A nova regressão nasceu vermelha: 6/6 casos falharam antes da implementação.

Após a correção:

- Direcionados de input/movimento/mobile/gamepad/coop/core: 92/92 aprovados.
- `npm run check`: aprovado.
- `npm test`: 36/36 arquivos aprovados.
- Execução interna completa: 348/348 testes aprovados, zero falhas.

A cobertura usa sequências A down/up, D down/up, as duas ordens de alternância,
repeat, A + ArrowLeft, blur/visibilidade/transição, cinco partidas sucessivas,
gamepad neutro, isolamento coop e mouse em ambos os lados. Ela verifica o eixo
resolvido e também `vx`/posição no modelo. O teste de mouse confirma ataque
simultâneo, `facing` e projéteis sem composição de deslocamento pelo cursor.

## Navegador e pendências

O launcher informou o servidor existente em `http://127.0.0.1:47831/`. A automação real
não pôde ser concluída neste ambiente: Chrome encerrou com Crashpad
`setsockopt: Operation not permitted`; Firefox headless encerrou sem produzir a
captura e o `geckodriver` Snap recusou iniciar por ausência da política AppArmor.
Portanto, teclado físico, alternância durante clique e game feel continuam
pendentes de validação manual. A suíte não é apresentada como substituta desse
playtest.

## Roteiro manual curto

1. Inicie uma partida sem clicar novamente no Canvas; mantenha A, solte e
   confirme que o personagem desacelera e para.
2. Repita com D.
3. Mantenha A, pressione D, solte D e depois A; confirme direita, retorno à
   esquerda e parada. Repita começando por D.
4. Durante as alternâncias, dispare com o botão esquerdo, inclusive com o
   cursor de cada lado do personagem. O tiro deve coexistir com o movimento e
   não deve decidir o deslocamento.
5. Com uma direção mantida, troque de janela e volte; nenhuma tecla antiga deve
   continuar ativa até uma nova pressão.
