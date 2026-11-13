# Relatório — Power-ups na Sobrevivência

Data: 2026-11-05

## Resultado

A Sobrevivência solo e a nova entrada de Sobrevivência coop local reutilizam `GameModel`/`CoopGameModel`, o loop de combate, os quatro pickups existentes e a HUD compacta. Não foi criado um segundo simulador, não há multiplayer online e campanha/bônus continuam com suas regras próprias.

## Estado anterior e implementação

Antes deste lote, a Sobrevivência solo existia, mas sempre iniciava BoyPunk, não atualizava power-ups e não gerava pickups. O coop era uma prévia isolada da campanha do Distrito e bloqueava power-ups.

Agora:

- o botão **Sobrevivência Coop Local** abre `?coop-survival=1` e o lobby existente;
- P1 é BoyPunk e P2 é Nilo;
- layouts disponíveis: P1 teclado + P2 controle ou dois controles;
- Sobrevivência solo usa o personagem selecionado no menu, inclusive Nilo e sua cura própria;
- Tiro Rápido, Cura pickup, Escudo e Rajada Dupla têm spawns estáveis e no máximo uma entidade ativa por spawn;
- efeitos temporários e escudo pertencem ao coletor; a cura própria de Nilo não foi convertida em pickup;
- HUD exibe TR, RD, ES e CU no painel do proprietário.

Controles atuais: A/D ou setas movem, Espaço/W/↑ pula, J/X/F ataca, Q usa a cura de Nilo e Esc pausa. Em controle padrão: analógico/D-pad move, botão 0 pula/confirma, botão 2 ataca, botão 4 usa habilidade e botão 9 pausa. Perfis genéricos usam o mapeamento salvo. Não houve teste com dispositivo físico neste lote.

## Regras autoritativas

| Pickup/estado | Efeito preservado | Respawn inicial | Relação duração/intervalo |
| --- | --- | ---: | --- |
| Cura pickup | +1 vida, até o máximo | 18 s | instantâneo; intervalo mais curto por ser suporte defensivo básico |
| Tiro Rápido | duração 10 s; cooldown ×0,5 | 22 s | 12 s mínimos sem efeito após uma coleta não renovada |
| Escudo | absorve 1 impacto | 24 s | carga instantânea; não é consumido se já houver carga |
| Rajada Dupla | duração 10 s; segundo projétil após 0,12 s | 30 s | 20 s mínimos sem efeito após uma coleta não renovada |

São valores centralizados em `BALANCE.survival.supportPickupRespawnSeconds` e constituem balanceamento inicial conservador para playtest. Tiro Rápido e Rajada Dupla continuam independentes, combináveis e renovam a duração para 10 s quando coletados novamente; não acumulam multiplicadores ou projéteis adicionais.

Cada tick considera somente jogadores vivos, elegíveis e sobrepostos. Vence o mais próximo do centro do pickup. Em empate dentro do epsilon determinístico, cada spawn usa um slot preferido estável e o alterna após uma coleta bem-sucedida; assim o empate não favorece sempre P1. A aplicação e a remoção ocorrem uma única vez. Cura com vida cheia e escudo já carregado permanecem no mundo.

O respawn usa `dt` da simulação: pausa congela, retry recria os quatro spawns e limpa efeitos/filas, e a saída do modo elimina os timers. Não há `setTimeout`. Almas, objetivos, recompensas, inimigos e itens de campanha não entram nesse registro.

Posições: TR `(96,220)`, Cura `(264,220)` e Escudo `(388,220)` no piso; RD `(180,160)` no ponto já usado pelo Distrito. Plataformas e geometria não foram alteradas.

## Validação

Direcionados finais da etapa: `tests/survival-powerups.test.mjs`, `tests/powerups.test.mjs`, `tests/coop.test.mjs` e `tests/renderer.test.mjs`: 55 casos internos aprovados em execução sem isolamento, zero falhas/ignorados.

Barreira da Etapa A:

- `npm run check`: aprovado;
- `npm test`: 32 arquivos de teste agregados, 32 aprovados, 0 falhos, 0 cancelados e 0 ignorados.

Os testes cobrem personagens solo, P1/P2, coleta simultânea, inelegibilidade, respawn, não duplicação, pausa, retry, isolamento e combinação TR+RD. O executor padrão agrega arquivos como subtestes de nível superior; 32 não é uma contagem de todas as declarações internas.

Validação visual/manual ficou pendente: o servidor local não pôde vincular `127.0.0.1:47831` neste ambiente (`listen EPERM`). Nenhuma segurança foi desativada.

## Arquivos, checkpoints e reversão

Código/UI: `src/config.js`, `src/core.js`, `src/coop.js`, `src/main.js`, `src/renderer.js`, `src/i18n.js`, `index.html`. Testes: `tests/powerups.test.mjs` e novo `tests/survival-powerups.test.mjs`.

- pré-lote: `docs/checkpoints/survival-powerups-audio-2026-11-05-v1-pre-etapa-a/`;
- pós-Etapa A/pré-áudio: `docs/checkpoints/survival-powerups-audio-2026-11-05-v2-pos-etapa-a-pre-audio/`;
- estado final validado das duas etapas: `docs/checkpoints/survival-powerups-audio-2026-11-05-v3-final-validado/`;
- todos possuem `MANIFESTO.sha256` e não substituem backups anteriores.

O workspace não possui repositório Git utilizável. Para reverter somente a Etapa A, compare os arquivos do checkpoint `v1` com os caminhos ativos e restaure individualmente apenas os sete arquivos de código/UI e os testes listados; remova somente o novo teste se a reversão integral for desejada. Não aplicar restauração global e não tocar em assets/releases.

## Roteiro manual

1. `npm run dev`; abrir `http://127.0.0.1:47831/`.
2. Selecionar BoyPunk e iniciar **Modo Sobrevivência**; coletar os quatro pickups, combinar TR+RD, pausar durante um respawn e tentar novamente após derrota.
3. Voltar, selecionar Nilo, repetir e confirmar que Q/cura própria não é a Cura pickup.
4. Abrir **Sobrevivência Coop Local**, escolher teclado+controle ou dois controles, atribuir dispositivos e iniciar.
5. Coletar com P1 e P2, disputar o mesmo pickup, deixar ambos inelegíveis para Cura/Escudo e observar vários ciclos sem duplicação.

