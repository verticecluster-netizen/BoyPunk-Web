# Relatório — HUD compacta e navegação

**Data:** 2026-11-05  
**Raiz:** `/home/flow/Projetos/BoyPunk-Web`  
**Status:** implementado e aprovado por automação; validação visual/interativa pendente

## Recuperação e linha de base

- Não há `AGENTS.md` aplicável nesta raiz.
- `.git/` está vazio; não foi possível criar commit, identificar branch ou atribuir autoria por histórico. Nenhum reset, clean, checkout ou restauração global foi usado.
- O estado pré-edição foi preservado em `docs/checkpoints/hud-navegacao-2026-11-05-pre-edicao-v1/`, com manifesto SHA-256. Esse checkpoint é específico deste lote e não substitui os backups anteriores do parallax.
- Linha de base: `npm run check` aprovado; `npm test` aprovou 30 arquivos, sem falhas ou ignorados.

## Diagnóstico de navegação

A inconsistência não era causada por foco do canvas isoladamente. Havia três causas combinadas:

1. `src/main.js` tinha um `keydown` global com transições próprias para Enter apenas em `menu`, `victory` e `survivalDefeat`. Esse caminho ignorava a opção realmente focada e não existia em derrota, pausa, bônus e coop.
2. Um botão focado também recebe o clique nativo do navegador. Assim, Enter podia executar a transição global e depois o clique do botão, criando dois caminhos lógicos para um único pressionamento.
3. O foco padrão de cada tela só era aplicado automaticamente quando havia um gamepad ativo. Sem clique prévio, teclado podia permanecer no canvas/body e depender do atalho global inconsistente.

O `InputController` também interceptava teclas mapeadas mesmo quando o foco estava em `input`, `select`, `textarea` ou conteúdo editável, o que conflitava com controles de opções.

## Correção implementada

- Clique permanece a ação canônica. Teclado e gamepad confirmam o mesmo elemento chamando o mesmo `click`, que converge para `activateUiAction`.
- Cada ação declara os estados em que é válida. Um evento residual de uma tela anterior é rejeitado após a primeira transição.
- `UiPressGate` aceita uma confirmação por keydown e mantém Enter/Espaço bloqueado até o `keyup`; mudar de tela não libera uma tecla ainda mantida.
- Enter/Espaço confirmam a opção focada. Setas mudam a seleção visível. O foco padrão é aplicado em menu, opções, créditos, lobby/resultado coop, pausa, vitória, bônus, derrota e survival, com ou sem controle conectado.
- Gamepad normal e os pads atribuídos no preview coop usam a mesma rotina de navegação de UI. A confirmação física foi validada somente com mocks/automação de estado, não com joystick real.
- Teclas de gameplay continuam cancelando rolagem quando capturadas, mas campos interativos preservam suas teclas.
- Transições consomem entradas transitórias e o gamepad exige neutralidade conforme o contrato existente.
- A pausa agora reapresenta o resumo de controles, localizado em português/inglês.

## HUD compacta

Os quatro cartões de 136×18 que podiam ocupar até `y=135` foram removidos. O painel superior do personagem continua terminando em `y=45` e contém uma terceira linha de 7 px, já compatível com a tipografia usada pelo HUD coop:

| Código | Significado | Estado exibido |
| --- | --- | --- |
| `TR8.4` | Tiro Rápido | segundos restantes do relógio real |
| `RD6.2` | Rajada Dupla | segundos restantes, independente de TR |
| `ES×1` | Escudo | uma carga/impacto; a mecânica atual é booleana |
| `CU✓` / `CU12.5` | Cura própria | disponibilidade ou recarga real |

As abreviações textuais tornam os efeitos distinguíveis sem depender somente de cor. No coop, o painel identifica explicitamente P1/P2 e filtra os indicadores por proprietário. Como os power-ups estão desativados no preview coop atual, somente a cura de P2 aparece ali em produção; o coletor aceita estados por jogador sem alterar gameplay.

- Avisos de aquisição substituem o aviso anterior, sem fila: o modelo já possui um único `notice`.
- Tiro Rápido, cura, escudo e Rajada Dupla usam 1,0 s de aviso; a duração/potência dos efeitos não mudou.
- A mensagem da Rajada informa somente “obtida”; o tempo continua no indicador persistente, evitando duplicação.
- Avisos críticos do altar e barra de chefe mantêm prioridade e faixa própria.
- A instrução inicial foi condensada e aparece na faixa de interface após o aviso inicial, somente até 7 s. O antigo banner inferior de controles foi removido; depósito continua contextual.
- O aviso da Câmara de Energia saiu da borda inferior e foi movido para a faixa `y=51`.

## Arquivos alterados

- `src/input.js`: foco de campos, confirmação reutilizável e trava por pressionamento.
- `src/main.js`: ação canônica, estados permitidos, foco e navegação de teclado/gamepad/coop.
- `src/renderer.js`: coleta, layout e desenho dos indicadores compactos; avisos reposicionados.
- `src/core.js`: duração exclusivamente visual dos avisos de aquisição em 1,0 s.
- `src/i18n.js`: texto de aquisição e instruções da pausa.
- `index.html`: resumo de controles na pausa.
- `tests/renderer.test.mjs`, `tests/powerups.test.mjs` e novo `tests/hud-navigation.test.mjs`.
- Documentação e checkpoint deste lote.

Nenhum asset, release, dependência, física, geometria, dano, cadência, save, progressão ou regra de power-up foi alterado.

## Validação automatizada

Testes direcionados:

```text
node --test tests/hud-navigation.test.mjs tests/renderer.test.mjs tests/powerups.test.mjs tests/gamepad.test.mjs tests/coop.test.mjs tests/ui-layout.test.mjs tests/bonus-ui.test.mjs tests/i18n.test.mjs
tests 8 · pass 8 · fail 0 · skipped 0
```

Validação final sequencial:

```text
npm run check  → aprovado
npm test       → tests 31 · pass 31 · fail 0 · cancelled 0 · skipped 0 · todo 0
```

`node --test tests/*.test.mjs` agrega cada um dos 31 arquivos como subteste de nível superior (`suites 0`). Esse total não é apresentado como quantidade comprovada de declarações/casos internos.

## Validação visual e limitações

Não há comparativo visual válido deste lote. A tentativa Chrome com perfil temporário falhou antes de abrir a página: Crashpad recebeu `Operation not permitted` e `DevToolsActivePort` não foi criado. Firefox headless com perfil isolado recusou iniciar porque o Snap/AppArmor não está ativo. Nenhuma flag para desabilitar sandbox/segurança foi usada.

O servidor respondeu inicialmente pelo launcher em `http://127.0.0.1:47831/`, mas a verificação final `./iniciar-jogo.sh --status` informou que ele não está ativo. Não se afirma servidor ativo. Joystick físico, telas 1×/2×, movimento reduzido e aparência dos quatro efeitos simultâneos permanecem pendentes de observação humana.

Roteiro manual mínimo:

1. abrir o menu sem clicar no canvas; usar setas/Tab e Enter, mantendo Enter pressionado ao trocar de tela;
2. no Distrito e Fábrica, em `?scale=1` e `?scale=2`, ativar TR, RD e escudo; selecionar Nilo para conferir `CU`;
3. confirmar que os indicadores ficam até `y=45`, sem deslocar personagens, plataformas ou HUD;
4. testar pausa→continuar, derrota→tentar novamente e vitória→próxima fase por teclado, clique e controle;
5. repetir com movimento reduzido e abrir bônus; no coop, testar teclado+pad e dois pads reais;
6. verificar console e rede sem erros de assets.

## Reversão restrita

Para reverter somente este lote, restaurar individualmente do checkpoint os arquivos listados no manifesto, remover apenas `tests/hud-navigation.test.mjs`, `docs/RELATORIO_HUD_NAVEGACAO.md` e `docs/PLANO_COOP_POWERUPS.md`, e retirar apenas os apêndices deste lote nos documentos de status/continuidade. Não usar reset/clean global e não tocar nos backups ou assets anteriores.

## Inicialização

```bash
cd /home/flow/Projetos/BoyPunk-Web
npm run dev
```

URL canônica: `http://127.0.0.1:47831/`.
