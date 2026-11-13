# Passagem Cooperativa para Codex — Fase 4A

Data: 2026-10-28  
Fonte modular: BoyPunk-Web 0.2.7  
Estado: prévia local isolada implementada; campanha normal não expõe coop.

## Entrada e execução

```bash
cd /home/flow/Projetos/BoyPunk-Web
./iniciar-jogo.sh --no-open
```

Abrir exclusivamente em localhost:

`http://127.0.0.1:47831/?coop-preview=1`

O parâmetro exige protocolo HTTP e hostname `127.0.0.1` ou `localhost`. Não
conflita com `bonus-preview`, `patrol-shooter-preview`, `debug` ou `test`; não há
botão no menu normal. A sessão fixa Distrito Neon, viewport 480×270, dificuldade
normal, BoyPunk P1 e Nilo P2. Attract mode, campanha, bônus, survival, demo,
progressão, unlocks, recordes e scores não são escritos.

## Arquitetura e ownership

- `CoopGameModel extends GameModel` é a camada explícita da prévia. O mundo,
  inimigos, spawner, projéteis e altar continuam no único fixed-step existente.
- `model.player` permanece alias de P1 para compatibilidade; `model.players`
  contém dois estados completos. Cada jogador guarda character resolvido uma
  vez, física, vida, cooldown, animação, carga, habilidade e temporários.
- `CoopGamepadRouter` usa runtime IDs próprios e assignments transitórios por
  slot. Nunca persiste índices. Nulls, desconexão e reuso de índice removem a
  conexão anterior; outro botão deliberado é exigido para reatribuir.
- `InputController` separa providers físicos de snapshots lógicos. Edges dos
  dois slots são capturados antes do tick e consumidos depois do primeiro
  fixed-step, preservando simultaneidade.

## Layouts aceitos pelo lobby

1. `P1 teclado + P2 controle`: A/D/setas, salto, ataque, depósito e Esc ficam em
   P1; o controle atribuído fica exclusivamente em P2.
2. `P1 controle + P2 controle`: dois devices distintos. O teclado não move nem
   ataca jogadores, mas continua disponível para Tab/Enter/Esc e pausa.

Pressionar eixo não atribui controle; é necessária uma nova borda de botão.
Conectar outro device não rouba ownership. Controles standard usam o mapa
existente; genéricos precisam de perfil completo salvo pelas Opções do jogo
normal. Só há suporte ao que o navegador expõe na Gamepad API.

## Regras implementadas

- P1/P2: 4 PV no normal; altar: 4; meta: 15 almas.
- Spawns: P1 `(18,208)`, P2 `(50,208)`, ambos no piso original.
- Jogadores não colidem entre si e não há friendly fire.
- Tiros dos dois jogadores têm `sourceId` e compartilham o cap histórico de
  oito projéteis. Nenhum tiro ativo é removido para abrir vaga.
- Perseguidor mira o jogador vivo mais próximo a cada update. Shooter fixo e
  patrol-shooter escolhem o vivo mais próximo ao iniciar warning; distância
  empata por ID e a mira permanece travada até o disparo.
- Projéteis inimigos resolvem plataforma/jogadores vivos/altar pelo primeiro
  tempo de impacto e aplicam dano uma vez.
- Cada alma é removida uma vez. Cargas são individuais; depósito e meta são
  compartilhados e capacidade é recalculada por slot no mesmo tick.
- Jogador derrotado fica inativo e mantém pose de derrota. Seus projéteis,
  pending shots, habilidade e temporários são cancelados. Carga cai uma vez na
  última posição segura como almas coletáveis. Não há ressurreição.
- Derrota: altar zero ou ambos inativos. Vitória: 15 depositadas. Perda tem
  precedência em empate terminal do mesmo tick.
- Cura de Nilo: somente nele, +1, clamp, 20 s ativos, sem cura de aliado.
- Rajada Dupla: explicitamente desativada nesta prévia. Integração por jogador
  fica para fase futura, evitando comportamento parcial.

## Lobby, HUD, pausa e lifecycle

O lobby mostra layout, P1/P2 e device atribuído. Start só libera com todos os
slots e perfis necessários prontos. Confirmação fica suspensa até neutralidade.
O HUD identifica P1 BoyPunk e P2 Nilo por texto, mostra vida/carga, cura de Nilo,
inatividade, altar, almas compartilhadas e tempo.

Qualquer pad atribuído ou Esc pausa. Aba oculta congela fixed-step e limpa held.
Ao desconectar, a run pausa, identifica o slot e bloqueia resume. Um novo botão
reatribui; depois ainda é preciso escolher Continuar. Retry não recarrega a
página, limpa mundo/run e mantém assignments ainda conectados. Voltar ao lobby
mantém assignments até “Limpar controles”. Touch coop fica oculto.

## Arquivos funcionais

- `src/coop.js`: sessão/modelo cooperativo.
- `src/core.js`: ganchos compatíveis para lista/seleção/dano de jogadores.
- `src/input.js`: keyboard slots e pausa global.
- `src/gamepad.js`: `CoopGamepadRouter`.
- `src/main.js`: rota, lobby, lifecycle e dois snapshots por tick.
- `src/renderer.js`: dois sprites, motion history por ID e HUD cooperativo.
- `index.html`, `styles.css`: lobby, resultado e aviso de desconexão.
- `tests/coop.test.mjs`, `tests/mobile-controls.test.mjs`: regressões.
- `package.json`, `tools/build-portable.mjs`: check e ordem modular futura.

## Validação e compatibilidade

- Baseline pré-edição: `npm run check` e 25/25 arquivos de teste aprovados.
- Focados: 11/11 arquivos aprovados.
- Final: `npm run check` e 26/26 arquivos aprovados.
- Bundle diagnóstico em `/tmp`: 18 módulos, script inline compilável e 138
  assets incorporados. Nenhum pacote/release foi criado.
- Studio v0.2.7 preservado: SHA-256
  `ab77f0de9724b1ff053adbc04708e28361a19941038c891f2c9bd3e546156503`.
- Browser/hardware: pendente. O sandbox bloqueou socket local; pads dos testes
  são mocks da Gamepad API, não hardware físico.

Checklist manual mínimo:

1. Testar teclado+pad; depois dois pads.
2. Mover/saltar/atacar simultaneamente e confirmar owners distintos.
3. Coletar/depositar com ambos; derrubar P1 e recuperar suas almas com P2.
4. Carregar cura de Nilo, sofrer dano e curar somente P2.
5. Pausar com cada pad; ocultar/restaurar aba.
6. Desconectar um pad, reatribuir outro, soltar tudo e retomar deliberadamente.
7. Vencer, perder por ambos e por altar; retry e lobby sem reload.
8. Voltar ao jogo normal e conferir campanha, bônus, survival e saves.

## Próximos marcos, fora da Fase 4A

- cura de aliado e regras de incapacitação/ressurreição;
- balanceamento cooperativo e métricas humanas;
- progressão cooperativa de campanha;
- Rajada Dupla por jogador e caps específicos;
- integração da Câmara de Energia/bônus.

## Nota de compatibilidade Phase 4D — 2026-10-29

A revisão Codex adicionou um contrato de âncora por personagem consumido pelo
mesmo `playerAttack()` usado dentro de `withPlayerContext`. P1 BoyPunk usa centro
`player center ± 27`, `y+16`; P2 Nilo usa `player center ± 21`, `y+12`.
`sourceId`, direção, cooldown, animação e origem são resolvidos no contexto do
slot e cobertos por regressão simultânea. A Rajada Dupla continua desativada na
prévia, conforme a regra original desta passagem.

Nenhuma regra cooperativa, input, objetivo, IA ou lifecycle foi alterada. O
browser/hardware continua pendente nesta revisão; somente os testes automatizados
de P1/P2 foram executados.

## Nota de HUD 0.2.8 — 2026-10-29

`drawCoopHud` agora é chamado no passe autoritativo de screen-space, fora do
screen shake do mundo. Os painéis P1, P2 e altar continuam independentes e com
as mesmas informações, ownership e coordenadas. Nenhuma lógica de `src/coop.js`,
input, vida, cura, objetivo ou acesso público à prévia foi modificada. A rota
continua exclusivamente `?coop-preview=1`; hardware real permanece pendente.
