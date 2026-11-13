# Relatório — correções de controles, power-ups e feedback

Data: 2026-11-05  
Fonte modular: 0.4.2  
Escopo: controles → ciclo dos pickups → `undefined`/`BLOQUEADO` → Factory Overlord e textos

## Resultado e limites

Foram corrigidas regressões comprovadas de input, coleta e apresentação sem
reconstruir combate, pickups, campanha, bônus ou Sobrevivência. A composição de
inimigos do bônus, seus valores de balanceamento, arte, física, geometria,
sons, saves e recompensas não foram alterados.

A implementação técnica passou nos testes direcionados, em `npm run check` e
em `npm test`. Playtest, escuta e joystick físico permanecem pendentes: o
ambiente recusou sockets locais, Firefox/Snap não iniciou por confinamento e
Chrome caiu no Crashpad com `setsockopt EPERM`.

## Recuperação e checkpoints

- Não existe `AGENTS.md` aplicável à raiz; os arquivos encontrados pertencem
  ao projeto vizinho `opj-studio-site`.
- `.git/` existe vazio e a raiz não é um repositório Git utilizável. Não foi
  usado reset, clean ou restauração global.
- Linha de base: `npm run check` aprovado e `npm test` com 34/34 arquivos.
- Checkpoint pré-lote versionado:
  `evidencias/recovery/BoyPunk-Web-pre-correcoes-controles-powerups-20261105-v1.tar.gz`,
  49 entradas, SHA-256
  `c8b035ad1a257172422cf51915c10c9fa41cdaa407c6005bad4cdcd5eaff12ed`.
- Checkpoint final:
  `evidencias/recovery/BoyPunk-Web-correcoes-controles-powerups-20261105-v2-final.tar.gz`.

Nenhum release, Studio ou portátil foi regenerado.

## Causas comprovadas e correções

### Botão esquerdo e teclado

O listener de ataque no Canvas verificava `PointerEvent.button === 0`, mas não
confirmava o bit esquerdo em `PointerEvent.buttons`. A aceitação agora exige
ponteiro de mouse primário, `button === 0` e `buttons & 1`; botão direito,
toque no Canvas e ponteiro não primário não disparam. Não foi adicionado
listener de `click`, e o menu de contexto normal do Canvas não foi bloqueado.
Como o handler roda na captura e verifica o estado antes da ação de UI, clicar
para iniciar ou retomar não vira tiro.

O teclado guardava somente ações agregadas. Isso causava duas falhas reais:

1. ao manter D e seta direita, soltar uma delas removia `right` mesmo com a
   outra fisicamente pressionada;
2. se o foco mudasse para `input/select/textarea` antes do `keyup`, a liberação
   era ignorada e a ação podia permanecer presa.

Agora cada código físico é rastreado e uma ação só é liberada quando nenhuma
tecla nem ponteiro ainda a sustenta. `keyup` de uma tecla previamente aceita é
processado mesmo após mudança de foco. `blur`, perda de visibilidade e
`pointercancel` continuam limpando estado e pausando gameplay ativo.

Mapeamento real preservado: A/← esquerda, D/→ direita, W/↑/Espaço salto e
salto duplo, J/X/F ataque, E interação, Q habilidade de Nilo e Esc pausa. S não
produz movimento vertical livre, pois o jogo é um platformer. Ajuda e README
agora informam W/↑/Espaço e botão esquerdo. No coop, teclado/mouse continuam
restritos ao slot habilitado (P1 no layout teclado+controle; nenhum jogador no
layout de dois controles).

### Coleta sem benefício e identidade do coletor

Na campanha, os pickups flutuantes eram marcados como removidos antes de
`activateFloatingPowerUp` confirmar benefício. Assim, Cura com vida cheia e
Escudo já carregado podiam desaparecer. A coleta agora aplica elegibilidade
antes da remoção, e a própria ativação rejeita esses dois casos. Sobrevivência
e bônus já usavam esse contrato e foram mantidos.

Eventos `powerUpCollected` agora carregam sempre `id` válido e `playerId`,
inclusive a Rajada Dupla legada da campanha. As mensagens de TR, Cura, Escudo
e RD possuem chaves pt-BR/en próprias.

### Mensagem literal `undefined`

A origem foi reproduzida: Rajada Dupla cria `notice = { key:
"powerup.doubleBurst.acquired" }`, mas `drawBonusHud` lia somente
`model.notice.text`. O Canvas recebia `undefined` diretamente. O renderer agora
resolve uniformemente `key + params` ou `text` em campanha, coop,
Sobrevivência e bônus; payload sem texto válido é rejeitado antes do banner.
O teste do evento comprova que a Câmara entrega `RAJADA DUPLA OBTIDA`, não uma
substituição vazia.

### `BLOQUEADO`

Cada projétil bloqueado criava um efeito de 0,48/0,62 s. Tiro Rápido e Rajada
Dupla podiam produzir várias instâncias quase coincidentes; eram impactos
reais, não uma duplicação do evento terminal, mas a apresentação ficava
repetitiva. Efeitos dentro de 24 px e do mesmo proprietário agora são agrupados
sem renovar a vida do primeiro aviso. Cada aviso visual dura no máximo 0,34 s;
impactos espacialmente distintos continuam visíveis. Colisão, escudo, dano,
cadência, áudio e evento `projectileBlocked` não mudaram.

## Matriz real dos power-ups

| Caminho | Criação / tipos | Coleta e respawn | Pausa, saída e observação |
| --- | --- | --- | --- |
| Campanha solo | TR, Cura e Escudo surgem no início; RD surge após 4 almas recuperadas e posição validada. | Coleta AABB. Cura cheia/Escudo carregado permanecem. Os três iniciais não respawnam; RD expira em 12 s e não repõe, conforme contrato atual. | Efeitos usam simulação; morte, vitória, retry e menu limpam temporários. |
| Bônus solo | Nenhum imediato; TR 2,2 s, Cura 5,8 s, Escudo 8 s, RD 10,5 s. | Respawns de 6/5/5,5/5 s; coleta independente das 30 almas. | Pausa congela; conclusão, morte, timeout e saída limpam pickups/agendas/inimigos/projéteis. |
| Sobrevivência solo | Quatro tipos ativos desde o início. | Respawns TR 22 s, Cura 18 s, Escudo 24 s, RD 30 s; sem duplicação. | Pausa congela; retry recria quatro spawns; derrota/saída limpa. |
| Sobrevivência coop | Mesmos quatro spawns. | Coleta atômica pelo jogador elegível mais próximo; desempate alterna slot; efeitos individuais. | P1/P2 preservados; derrota final e saída limpam ambos. |
| Preview coop da campanha | Sem pickups por contrato atual. | Não há scheduler/renderer/coleta a ativar. | Isolamento técnico, sem progressão. |
| Demonstração simulada | Sem pickups por contrato (`demoMode`). | IA demonstra campanha sem efeitos/recompensas de power-up. | Saída da demo limpa todas as entidades. |
| Preview do atirador | Power-ups desabilitados explicitamente. | Não aplicável. | Ferramenta de desenvolvimento, não modo de progressão. |

O novo teste `powerup-modes.test.mjs` percorre os modelos reais, em vez de
inferir funcionamento pela existência de um helper. Testes anteriores cobrem
renderização, coleta, inelegibilidade, respawn em tempo de simulação, pausa,
retry, ownership coop e cleanup.

### Identificação do `+`

Há três elementos relacionados, mas distintos:

- cruz verde no mundo: pickup de Cura, coleta automática somente abaixo da
  vida máxima; `+1 VIDA` confirma benefício;
- habilidade de Nilo: comando Q/LB/touch, com recarga própria de 20 s e sem
  entidade coletável;
- feedback numérico `+1`: cura ou objetivo já aplicado, não pickup bloqueado.

Para evitar confusão, o botão touch de Nilo e seu contador de HUD passaram de
`✚`/`CU8.0` para `HAB`/`HAB8.0` (ou `HAB✓`), com título acessível que informa
“Habilidade Cura Própria” e a recarga. A Cura do mundo mantém a cruz médica.
Rajada Dupla no registro compartilhado agora reutiliza seu asset `×2`, em vez
de parecer outro Tiro Rápido.

## Bônus e Factory Overlord

Os inimigos adicionais do bônus estavam presentes e funcionais. Foram
revalidados: até dois Chasers, entrada escalonada/telegrafada, 3 HP, dano,
limpeza e ausência de almas por abate. Nada foi refeito ou rebalanceado.

O Factory Overlord não é um chefe funcional no modelo atual. Não há entidade,
`maxHp`, colisão, recepção de dano, ataque, morte ou condição de vitória de
chefe. O depósito de almas atualiza o altar e conclui a fase ao atingir a meta;
o desenho `drawFactoryOverlord` aparece por progresso do altar e é cenário
decorativo. A prensa industrial é uma mecânica separada e real.

A barra era enganosa: aparecia por fase/depósito do altar e assumia razão 1,0
quando `bossHealth` não existia. Essa ativação foi removida. A barra só pode ser
renderizada com `bossActive === true`, `bossHealth` finito e `bossMaxHealth`
finito/positivo. Como o gameplay não fornece esse contrato, ela não aparece;
o Overlord decorativo permanece intacto. Nenhum HP foi inventado ou reduzido.

## Strings e legibilidade

| Relato visual | String real / origem | Tratamento |
| --- | --- | --- |
| `DISTROITO` | `DISTRITO NEON // INICIALIZAÇÃO` | String correta; rótulos densos usam fonte de sistema legível e menor espaçamento. |
| `DAMARA DE ENERGIA` | `CÂMARA DE ENERGIA` | String/acentos corretos; mesma correção de apresentação. |
| `ESOURO OBTIDO` | `ESCUDO OBTIDO · 1 IMPACTO` | String correta e agora também chave i18n; banner usa fonte legível. |
| `QUALIFICAÇÃO 100/12` | DOM monta `QUALIFICAÇÃO {points}/75`; limite autoritativo é 75. | Número não foi alterado; fonte/espaçamento do eyebrow foram corrigidos. |
| `assessando` | Nenhuma string literal correspondente foi encontrada. | Não houve substituição especulativa; requer quadro/rota exata se reaparecer. |
| `ATAOA` | Ajuda real contém `ATACA`. | Banner usa fonte de sistema e ajuda foi sincronizada com W/↑/mouse. |
| `BLOQUEA` | Efeito real é `BLOQUEADO`. | Fonte legível, duração curta e agrupamento espacial. |

## Arquivos alterados

Gameplay/input/UI: `src/input.js`, `src/main.js`, `src/core.js`, `src/coop.js`,
`src/renderer.js`, `src/i18n.js`, `index.html`, `styles.css` e `README.md`.

Testes: `tests/mobile-controls.test.mjs`, `tests/bonus-combat.test.mjs`,
`tests/bonus-ui.test.mjs`, `tests/powerups.test.mjs`,
`tests/powerup-modes.test.mjs` (novo), `tests/core.test.mjs`,
`tests/renderer.test.mjs`, `tests/hud-navigation.test.mjs` e
`tests/visual-effects.test.mjs`.

Documentação: este relatório, `CONTINUIDADE_BOYPUNK_WEB.md` e
`docs/STATUS_IMPLEMENTACOES_BOYPUNK.md`.

## Validação executada

- baseline: `npm run check` aprovado; `npm test` 34/34 arquivos;
- direcionados finais sem isolamento: 180/180 casos internos, zero falhas;
- `npm run check`: aprovado;
- `npm test`: 35/35 arquivos, zero falhas, cancelados ou ignorados;
- suíte completa sem isolamento: 341/341 casos internos, zero falhas;
- servidor existente PID 7023 foi reutilizado e não encerrado;
- HTTP local: socket negado pelo sandbox;
- Firefox headless: Snap recusou iniciar por confinamento/AppArmor;
- Chrome headless: Crashpad, `setsockopt: Operation not permitted`;
- nenhuma captura foi aceita; áudio, joystick físico e qualidade de jogo não
  foram declarados validados.

## Roteiro manual curto

1. Primeiro, iniciar campanha e manter A/D enquanto dispara repetidamente com
   o botão esquerdo no Canvas. Confirmar que botão direito abre o contexto
   normal e não é necessário para atirar.
2. Ainda segurando movimento, soltar o mouse fora do Canvas, alternar janela e
   voltar. Confirmar pausa automática, retomada sem tecla presa e nenhum tiro
   provocado pelo botão Continuar.
3. Testar W/↑/Espaço, J/X/F, pausa, retry e, em coop, P1 teclado+mouse/P2
   controle e depois dois controles. Confirmar que P1 não move P2.
4. Depois testar coleta e respawn: campanha (Cura cheia permanece; após dano
   coleta), bônus (ordem 2,2/5,8/8/10,5 s), Sobrevivência solo e coop (quatro
   tipos e seus ciclos completos). Pausar no meio de cada relógio.
5. Coletar RD no bônus e confirmar mensagem `RAJADA DUPLA OBTIDA`; combinar
   TR+RD, observar `BLOQUEADO` sem pilha ilegível e concluir 30 almas sem matar
   todos os Chasers.
6. Entrar na Fábrica: confirmar Overlord visual sem barra de HP, depositar até
   a vitória normal e verificar recompensa/transição única.
7. Repetir em pt-BR/en e conferir `DISTRITO`, `CÂMARA`, `ESCUDO`,
   `QUALIFICAÇÃO …/75`, `ATACA` e `BLOQUEADO`. Escutar sons de BoyPunk/Nilo e
   registrar separadamente qualquer problema auditivo.

Implementação técnica: concluída e validada automaticamente.  
Aprovação manual de controles físicos, legibilidade final e game feel: pendente.
