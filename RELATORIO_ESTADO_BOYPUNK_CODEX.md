# Relatório de estado para refinamento gráfico — BoyPunk! Web

**Data da auditoria:** 2026-11-04  
**Projeto auditado:** `/home/flow/Projetos/BoyPunk-Web`  
**Escopo:** somente leitura do projeto; a criação deste relatório foi a única escrita autorizada.  
**Versão funcional da fonte modular:** `0.4.2`

## Resumo executivo

A fonte modular atual identifica-se de forma consistente como **0.4.2** em
`package.json`, `src/version.js` e no menu montado por `src/main.js`. O launcher
`iniciar-jogo.sh` serve essa fonte em `http://127.0.0.1:47831/`. O Studio corrente
é `studio-builds/BoyPunk-Studio-v0.4.2.html`, também identificado internamente
como 0.4.2 e com a correção que separa Tiro Rápido de Rajada Dupla.

Há artefatos históricos que não devem ser confundidos com a fonte atual:

- `dist-portable/JOGAR.html` executa internamente **0.2.6**;
- `BoyPunk-Studio-v0.4.0.html`, apesar do nome, executa internamente **0.2.8** e
  ainda contém a condição antiga que fazia Tiro Rápido acionar Rajada Dupla;
- releases em `releases/` vão somente até 0.2.2;
- o artefato correto para avaliação standalone atual é
  `studio-builds/BoyPunk-Studio-v0.4.2.html`.

A separação entre Tiro Rápido e Rajada Dupla **já foi corrigida na fonte 0.4.2 e
no Studio 0.4.2**. A suíte automatizada atual passou em 28/28 arquivos, incluindo
regressões específicas dos quatro casos: nenhum efeito, só Tiro Rápido, só
Rajada Dupla e ambos.

O “Factory Overlord” é **somente uma apresentação visual**. Não existe entidade
de chefe no modelo, HP autoritativo, recepção de dano, ataques próprios ou
condição de vitória associada ao chefe. A barra desenhada começa em 100% e não é
alimentada por gameplay real.

Não foi executado navegador nesta auditoria. Portanto, aparência final,
desempenho real, áudio, `file://`, controles físicos, touch físico e comportamento
em Windows/iOS/Android continuam sem validação atual. Os testes de Node e as
inspeções estáticas feitas nesta sessão não substituem playtest.

## Método, fontes e limites de evidência

Foram inspecionados os arquivos reais atuais, e não assumido que relatórios
anteriores continuavam válidos. Foram consultados `README.md`,
`CONTINUIDADE_BOYPUNK_WEB.md`, `RETOMADA_BOYPUNK.md`,
`RELATORIO_BOYPUNK_WEB_PARA_CHATGPT.md`, todos os `PASSAGEM_*.md`, o guia de
estilo, a documentação de qualidade, código, testes, assets e artefatos gerados.

`AGENTS.md` não existe neste projeto nem em diretório ancestral dentro do
workspace. Os únicos `AGENTS.md` encontrados pertencem ao repositório vizinho
`opj-studio-site` e não se aplicam a BoyPunk. As pastas locais `.agents` e
`.codex` estão vazias.

Neste relatório:

- **Verificado no código atual** significa que a implementação presente foi
  inspecionada diretamente.
- **Verificado por teste atual** significa que um teste executado nesta sessão
  passou.
- **Documentado** significa que um documento anterior afirma o resultado, sem
  que esta auditoria o tenha reexecutado em navegador/hardware.
- **Não testado** é indicado explicitamente.

Nenhum servidor do jogo estava ativo (`./iniciar-jogo.sh --status` informou
“BoyPunk! não está ativo”). Nenhum servidor foi iniciado, nenhum browser foi
aberto, nenhum save/localStorage foi lido ou alterado e nenhuma dependência foi
instalada.

## 1. Versão, branch, commit e alterações locais

### Estado comprovado

| Item | Estado atual | Evidência |
|---|---|---|
| Fonte modular | `0.4.2` | `package.json`, `src/version.js` |
| Studio corrente | `studio-builds/BoyPunk-Studio-v0.4.2.html` | marcador interno `GAME_VERSION = "0.4.2"` |
| SHA-256 do Studio 0.4.2 | `93c1c0263c68d56cde16f8a64da8b5667bd487080a89c8175cae765b8759a349` | calculado nesta auditoria; coincide com a continuidade |
| Branch Git | **não verificável** | `.git/` existe, mas está vazio |
| Último commit | **não verificável** | `git log` retorna “not a git repository” |
| Alterações locais pendentes | **não verificáveis** | sem índice/HEAD não há base para distinguir arquivos versionados, novos ou modificados |
| Remotos/tags | **não verificáveis** | ausência dos metadados Git |

Não é correto inferir branch ou commit a partir de checkpoints `.tar.gz`, datas
de arquivos ou relatórios. Também não é correto declarar a árvore “limpa”: sem
`.git`, todo o diretório é apenas uma cópia de trabalho sem referência de
comparação.

## 2. Como iniciar e qual versão é efetivamente executada

### Desenvolvimento atual

```bash
cd /home/flow/Projetos/BoyPunk-Web
./iniciar-jogo.sh
```

Ou, sem abrir navegador:

```bash
npm run dev
# equivalente a ./iniciar-jogo.sh --no-open
```

O launcher fixa `127.0.0.1:47831`, valida a raiz canônica do projeto e só
reutiliza um servidor que pertença a esta cópia. O `index.html` importa
`src/main.js`, que importa `GAME_VERSION` de `src/version.js`; portanto essa rota
executa **0.4.2**. Na primeira carga comum, o código inicia a demonstração de
startup; o menu aparece quando o usuário sai da demo.

Rotas de desenvolvimento existentes:

- `?bonus-preview=1`: Câmara de Energia sem persistência;
- `?patrol-shooter-preview=1`: prévia isolada do atirador;
- `?coop-preview=1`: prévia coop local, somente em HTTP localhost;
- `?test=1` e `?debug=1`: APIs/diagnóstico de teste;
- `?scale=1..4`: escala do backing buffer.

### Standalone/portátil

| Arquivo | Versão interna | Situação |
|---|---:|---|
| `studio-builds/BoyPunk-Studio-v0.4.2.html` | 0.4.2 | artefato standalone corrente; contém a correção Rapid/Double |
| `studio-builds/BoyPunk-Studio-v0.4.1.html` | 0.4.1 | anterior à correção |
| `BoyPunk-Studio-v0.4.0.html` | **0.2.8** | nome enganoso; histórico; contém o defeito antigo |
| `dist-portable/JOGAR.html` | **0.2.6** | portátil histórico, desatualizado |
| `releases/BoyPunk-Web-v0.2.0..0.2.2/` | 0.2.x | releases históricos |

Abrir o Studio atual:

```bash
xdg-open /home/flow/Projetos/BoyPunk-Web/studio-builds/BoyPunk-Studio-v0.4.2.html
```

Esse comando não foi executado nesta auditoria. O conteúdo do HTML foi
inspecionado estaticamente, mas o carregamento por `file://` não foi validado.

## 3. Funcionalidades concluídas, parciais e pendentes

### Concluídas e confirmadas no código/testes atuais

- Campanha com Distrito Neon e Fábrica de Sucata, ambas com objetivo de coleta e
  depósito, spawns, inimigos, vitória e derrota.
- Dificuldades fácil/normal/difícil, alterando vida, altar, meta e pressão de
  encontro.
- BoyPunk e Nilo selecionáveis; Nilo possui Cura Própria de +1, recarga de 20 s
  ativos e cooldown de ataque 20% maior.
- Movimento com aceleração, atrito, gravidade, salto variável, coyote time,
  jump buffer e salto duplo.
- Combate corpo a corpo e Bola de Pulso; projéteis usam swept-AABB e paredes
  sólidas têm precedência.
- Perseguidor, atirador fixo e atirador móvel de patrulha. O patrol-shooter está
  ativo na campanha (`campaignEnabled: true`), mas desativado em survival e demo.
- Almas carregadas/depositadas, altar com vida/invulnerabilidade/fases, meta e
  progressão entre os dois níveis.
- Power-ups Tiro Rápido, Vida e Escudo como pickups flutuantes; Rajada Dupla como
  pickup separado liberado após quatro almas recuperadas.
- Câmara de Energia, canhão de penalidade temporal, pontuação, qualificação e
  preview sem persistência.
- Modo Sobrevivência, pausa, Game Over, retry, menu, vitória, demo/attract mode,
  save de progressão e transferência de save.
- Entrada por teclado, touch e arquitetura de Gamepad API; remapeamento genérico.
- i18n pt-BR/en, áudio, carregador sequencial compatível com WebKit e preferência
  de movimento reduzido.
- Prévia coop local com P1/P2, ownership, alvo por jogador vivo, resultado e
  lifecycle próprios.

Esses itens têm implementação atual e cobertura automatizada, mas nem todos
foram observados visualmente nesta sessão.

### Parciais ou deliberadamente isoladas

| Item | Estado real |
|---|---|
| Factory Overlord | shell visual; sem combate, entidade, HP ou vitória de chefe |
| Coop | somente `?coop-preview=1`; não aparece no menu comum, não salva, não usa touch de dois jogadores, não entra no bônus/survival e desativa power-ups |
| Arte ilustrada 2× | cobre protagonistas, chaser, patrol-shooter, projéteis e altar do Distrito; chaser não tem `jump` ilustrado; altar da Fábrica e atirador fixo permanecem no conjunto clássico |
| Power-ups Tiro Rápido/Vida/Escudo | gameplay real, porém visual procedural; só Rajada Dupla possui sprites próprios |
| Chefes/pistões/lodo | Overlord, pistões laterais e lodo são apresentação; somente a prensa central definida no nível é hazard real |
| Distribuição portátil | existe Studio 0.4.2, porém `dist-portable/` e `releases/` não foram atualizados para ele |

### Pendentes ou não comprovadas

- Combate autoritativo do chefe.
- Teste humano de dificuldade, legibilidade e rotas.
- Teste atual em navegador real da fonte 0.4.2 e do Studio 0.4.2.
- Validação offline por duplo clique em Windows/macOS/Linux e em Safari/WebKit.
- Testes em aparelho Android/iOS, controles USB/Bluetooth reais, safe areas e
  multitouch físico.
- Consolidação de licenças/proveniência antes de distribuição pública.
- Coop de campanha, progressão coop, ressurreição/cura de aliado e power-ups por
  jogador; os documentos os listam como fora da Fase 4A.
- Não existe terceira fase; a conclusão da Fábrica encerra o fluxo existente.

## 4. Tiro Rápido e Rajada Dupla

### Fonte 0.4.2: correção realizada

Em `src/core.js`, `playerAttack()` calcula estados independentes:

- `rapidFireActive`: exige `player.rapidFire` e tempo positivo; altera apenas o
  cooldown para 50% do valor do personagem;
- `doubleBurstActive`: exige explicitamente
  `activePowerUp.id === "double-burst"` e tempo positivo; somente ele cria o
  `burstId` e agenda o segundo tiro.

Matriz atual:

| Estado | BoyPunk | Nilo | Projéteis por ataque |
|---|---:|---:|---:|
| nenhum | 0,34 s | 0,408 s | 1 |
| só Tiro Rápido | 0,17 s | 0,204 s | **1** |
| só Rajada Dupla | 0,34 s | 0,408 s | 2, com 0,12 s entre tiros |
| ambos | 0,17 s | 0,204 s | 2, com 0,12 s entre tiros |

`tests/powerups.test.mjs` verifica diretamente que Tiro Rápido isolado não cria
fila nem evento de Rajada Dupla, além de testar a matriz para BoyPunk e Nilo e
as expirações independentes. A suíte passou nesta auditoria.

O HUD também os separa: Rajada Dupla usa slot `y=51`; Cura `y=73`; Tiro Rápido
`y=95`; Escudo `y=117` (`src/renderer.js`).

### Artefatos antigos

`BoyPunk-Studio-v0.4.0.html` ainda contém uma condição na qual
`player.rapidFire` satisfaz o branch de Rajada Dupla. Esse arquivo é internamente
0.2.8 e não deve ser usado para avaliar o estado atual. O Studio 0.4.2 contém as
duas condições separadas.

## 5. Morte, Game Over, reinício, altar, vitória, pausa e demo

### Morte e Game Over

- Se a vida do jogador chega a zero, `resolveTerminalOutcome()` chama
  `beginPlayerDefeat("Você foi derrotado")`.
- O modelo entra em `defeatPresentation` por 0,4 s, zera movimento/ataque,
  limpa projéteis/power-ups/habilidade e avança a animação `die`; depois entra em
  `defeat` e a tela HTML mostra Game Over.
- Se jogador e altar chegam a zero no mesmo passo, a verificação do jogador vem
  primeiro; a razão é “Você foi derrotado”. Isso é coberto em `core.test.mjs`.
- A morte no modo survival vai diretamente a `survivalDefeat`, com onda, tempo e
  kills.

### Altar

- AABB do altar: 32×48. Vida normal 4, fácil 6, difícil 3; invulnerabilidade de
  1,2 s.
- Recebe dano de contato e de projéteis inimigos; a prensa não o atinge.
- Se chega a zero com o jogador vivo, o modelo termina com “Altar destruído”.
- A fase visual do altar depende do progresso depositado e pode ser elevada por
  dano crítico. O frame de sprite é calculado por progresso, de 0 a 6.

### Vitória

- O depósito que atinge a meta congela um resumo em `completedRun`, limpa
  projéteis/transitórios e entra em `victoryPresentation` (0,85 s; 0,18 s com
  movimento reduzido).
- Depois abre vitória ou transição de bônus, conforme qualificação.
- Vitória real grava conclusão/desbloqueio; demo e previews não são elegíveis.
- A Fábrica é o segundo e último nível atual; sua vitória não cria fase 3.

### Reinício

`restartCurrent()` em `src/main.js` escolhe o reinício correto para coop,
survival, preview do atirador, preview bônus ou campanha. Campanha reinicia o
nível de origem por `startGame()`, que chama `startRun()` e recria entidades,
timers, altar, inimigos, projéteis, efeitos e power-ups. Há testes de múltiplos
ciclos de restart e de limpeza de estado.

### Pausa e aba oculta

- Pausa aceita campanha, bônus e survival, guardando `pausedFrom`.
- Enquanto `state === "paused"`, o modelo não avança gameplay.
- Perda de foco chama pausa para jogo humano; `visibilitychange` limpa inputs,
  zera o acumulador e, com a página oculta, o loop não simula.
- Bônus e clocks de power-up têm testes específicos de congelamento.

### Demonstração

- A aplicação entra em demo no startup, pode iniciá-la pelo menu e também após
  120 s de inatividade.
- Usa Distrito Neon, BoyPunk, semente reproduzível, física/combate/depósito reais
  e um controlador autônomo.
- Vitória, derrota, estagnação ou 90 s agendam nova tentativa; três falhas
  consecutivas abortam para o menu.
- Demo não salva, não habilita power-ups, Cura de Nilo ou patrol-shooter.
- Enter, Espaço, Esc, clique/toque deliberado ou ação significativa de controle
  saem para o menu sem reaproveitar a borda de entrada.

Tudo acima foi confirmado em código e testes de modelo. A apresentação em
navegador não foi observada nesta auditoria.

## 6. Situação do chefe

O Factory Overlord é **apenas visual**.

Evidências atuais:

- `src/core.js` não cria qualquer `boss`, `overlord`, `bossHealth` ou máquina de
  estados de chefe.
- `src/level-data.js` não define entidade, hitbox, HP, spawn ou ataques de chefe.
- `src/renderer.js::drawFactoryOverlord()` desenha proceduralmente uma silhueta
  quando a Fábrica chega a progresso avançado do altar (fase ≥2 e ≥6 almas) ou
  quando flags artificiais de teste são injetadas.
- `isBossHudVisible()` torna a barra visível mais tarde, por fase ≥3 ou ≥8 almas.
- `drawBossHealthBar()` usa `bossHealth ?? bossHealthRatio ?? 1.0`; como o modelo
  real não fornece esses campos, a barra permanece em 100%.
- Os testes de boss em `visual-effects.test.mjs` testam apenas desenho, posição e
  shell DOM/CSS com modelos artificiais.
- O elemento DOM `#boss-health-bar` começa `hidden` e não há código atual que o
  alimente; a imagem efetiva usa a barra Canvas.

Consequência para a nova arte: não se deve desenhar telegraphs, pontos fracos,
golpes, fases de HP ou feedback de dano como se fossem mecânicas já existentes.
A única ameaça industrial autoritativa na Fábrica é a prensa central.

## 7. Arquitetura gráfica

### Espaço, escala e renderizador

- Mundo e coordenadas lógicas fixos: **480×270**, 16:9
  (`src/level-data.js::WORLD`).
- Renderer: **Canvas 2D**, contexto `{ alpha: false }`; não há WebGL, shader ou
  pós-processamento por framebuffer.
- Escala física padrão: **2×**, backing buffer 960×540.
- Em `window.innerWidth < 640`: padrão **1,5×**, backing 720×405.
- `?scale=` aceita 1 a 4; `Renderer` também faz clamp 1..4.
- O CSS estica o canvas para preencher `.game-frame` 16:9 e usa
  `image-rendering: auto`.
- `imageSmoothingEnabled` fica ativo acima de 1×, com qualidade `high`.

### Câmera

Não existe câmera rolável. O mundo inteiro cabe em 480×270. A única transformação
de “câmera” é screen shake aleatório aplicado ao passe do mundo durante campanha
ou survival. Fundo e HUD não herdam esse shake.

### Ordem de passes/camadas

1. limpeza do backing buffer físico;
2. escala lógica→física;
3. fundo por nível, com recorte central tipo `cover`;
4. atmosfera procedural e iluminação reativa;
5. mundo com shake: plataformas → canhão bônus → altar → power-ups → almas →
   inimigos → projéteis → protagonista(s) → prensa → efeitos → debug;
6. speed-rush do bônus;
7. HUD em screen-space;
8. celebração de vitória ou decaimento de derrota;
9. telas e overlays HTML/CSS acima do canvas.

### Filtros e efeitos

- Canvas: sombras, gradientes, alpha, `lighter`, linhas, partículas e formas
  procedurais; não há filtro global do canvas.
- CSS: `backdrop-filter: blur()` nos painéis, scanlines, vignette, glitch,
  drop-shadow do speed-rush, retratos e animações de telas.
- `prefers-reduced-motion` desliga/reduz várias animações, filtros e partículas.
- HUD é desenhado fora da transformação do mundo, evitando tremor e alpha
  herdados.

### Seleção de arte clássica/ilustrada

Quando `renderScale > 1`, `resolveAnimationImage()` tenta primeiro o namespace
`.illustrated`; em 1× usa o conjunto clássico. Assim, `?scale=1` muda não apenas
resolução, mas também o conjunto visual. Desktop padrão 2× e mobile compacto
1,5× usam as variantes ilustradas quando elas existem.

### Carregamento de assets

- `ASSET_MANIFEST` contém **249 entradas**: 241 imagens, 7 áudios e 1 fonte;
  12 entradas são obrigatórias.
- São **243 URLs únicas**, sendo 235 imagens únicas.
- O carregamento é deliberadamente sequencial para evitar pico de memória no
  standalone WebKit.
- Imagens são convertidas preferencialmente para `ImageBitmap`; há fallback por
  canvas. A URL embutida e o `src` do elemento são liberados depois da cópia.
- Falha obrigatória interrompe o boot; falha opcional é relatada e o renderer
  usa fallback/procedural quando disponível.
- Os PNGs efetivamente manifestados somam aproximadamente 5,20 MB compactados e
  equivalem a cerca de **20,07 MiB RGBA** se todos forem decodificados em 4
  bytes/pixel. Isso é cálculo teórico de superfície, não medição de heap.

## 8. Inventário de arquivos gráficos usados

### Protagonistas

| Uso | Arquivos/namespace | Dimensão |
|---|---|---:|
| BoyPunk clássico | `assets/images/player-helmet/playeranim-{state}-{NNN}.png` | 64×96, 21 frames |
| BoyPunk ilustrado | `assets/images/characters/boypunk-illustrated/playeranim-{state}-{NNN}.png` | 128×192, 21 frames |
| Nilo clássico | `assets/images/characters/nilo/nilo-{state}-{NNN}.png` | 64×96, 21 frames |
| Nilo ilustrado | `assets/images/characters/nilo-illustrated/nilo-{state}-{NNN}.png` | 128×192, 21 frames |
| Cura de Nilo | `assets/images/characters/nilo/nilo-heal-000..003.png` | 32×32 |
| Projétil BoyPunk | `player-helmet/bulletcandymachine-normal-000.png` | 8×8 |
| Projétil ilustrado | `characters/boypunk-illustrated/bulletcandymachine-normal-000.png` | 16×16 |
| Retratos carregados | `player-portrait-000.png`, `nilo-portrait-000.png` | 32×32 |

Os retratos PNG estão no manifesto, mas o HUD visível usa avatares construídos
em HTML/CSS; não foi localizado lookup desses dois keys no renderer atual.

### Inimigos

| Uso | Arquivos | Dimensão/frames |
|---|---|---:|
| Chaser clássico | `assets/images/enemies/enemycaveira-*` | 16×32; idle 2, walk 8, jump 2, attack 4, dead 4 |
| Chaser ilustrado | `assets/images/enemies/chaser-illustrated/enemycaveira-*` | 32×64; idle 2, walk 8, attack 4, dead 4; **sem jump** |
| Atirador fixo | `enemytorreta-ready-000.png`, `enemytorreta-shooting-000..003.png` | 32×32 |
| Patrol-shooter clássico | `enemypatrolshooter-{patrol,aim,fire,recovery}-*.png` | 32×32; 8+4+1+4 |
| Patrol-shooter ilustrado | `enemies/patrol-shooter-illustrated/...` | 64×64; 8+4+1+4 |
| Bala inimiga | `enemybalabasic-walk-000.png` clássico/ilustrado | 16×16 |

`turret.created.0..4` e `turret.patrol.0..7` também são carregados pelo
manifesto, mas o branch atual do atirador fixo usa somente `ready`/`shooting`, e
o patrol-shooter usa seu namespace próprio. Portanto, esses frames não foram
confirmados como usados no gameplay corrente.

### Cenários, plataformas e objetos

| Uso | Arquivo | Dimensão |
|---|---|---:|
| Distrito Neon | `assets/images/world/distrito-neon.png` | 1672×941 RGB |
| Fábrica de Sucata | `assets/images/world/fabrica-sucata.png` | 1365×768 RGB |
| Câmara de Energia | `assets/images/world/camara-energia.png` | 1365×768 RGB |
| Tiles Distrito | `platformtiles.png` | 128×128 RGBA |
| Tiles Fábrica | `factory-platformtiles.png` | 128×128 RGBA |
| Tiles Câmara | `energy-platformtiles.png` | 128×128 RGBA |
| Textura extra | `tilebg.png` | 128×128 RGBA; carregada como `world.texture`, sem lookup atual localizado |
| Almas clássicas/cyber/bônus | quatro frames por conjunto | 15×16 |
| Altar genérico/Distrito/Fábrica | sete frames por conjunto | 32×48 |
| Altar Distrito ilustrado | sete frames | 64×96 |
| Rajada Dupla | `powerup-double-burst-idle-000..003.png` | 16×16 |

Plataformas são retângulos de `src/level-data.js`, revestidos em tiles 16×16 e
formas procedurais. Prensa, canhão bônus, Overlord, Tiro Rápido, Vida, Escudo,
trilhas, faíscas e grande parte dos VFX não possuem sprites: são desenhados por
Canvas.

### HUD e menus

- Fonte: `assets/fonts/PixelifySans.ttf`.
- HUD de gameplay: Canvas 2D procedural; não há atlas de HUD.
- Menus, pause, vitória, derrota, opções, coop e resultado: HTML em `index.html`
  e CSS em `styles.css`.
- Ícone do site: `assets/images/icon-32.png`.
- Áudio manifestado: menu, ataque, dano, coleta, depósito, botão e início. O
  `battle-music.webm` existe em disco, mas a música de batalha atual também
  possui composição procedural em `src/music.js` e esse arquivo não aparece no
  manifesto mostrado.

## 9. Frames, animações, pivôs, offsets, hitboxes e disparos

### Protagonistas

Estados compartilhados por BoyPunk e Nilo:

| Estado | Frames | Cadência | Loop |
|---|---:|---:|---|
| idle | 4 | 5 fps | sim |
| walk | 4 | 12 fps | sim |
| jump | 1 | pose | — |
| fall | 1 | pose | — |
| attack1 | 4 | 22 fps | durante ataque |
| hurt | 3 | 12 fps | enquanto hurtFlash |
| die | 4 | 10 fps | não |

Ordem dos arquivos: índice `000`, `001`, etc. O relógio zera na troca de estado;
pausa não avança a simulação. Prioridade de estado: morte → ataque → dano →
salto/queda → caminhada → idle.

Contrato físico/visual atual:

- hitbox do jogador: **22×32**, origem `player.x/player.y`;
- draw lógico: 64×96 em `drawX = x + w/2 - 16` e
  `drawY = y + h - 64`;
- assets clássicos mantêm o corpo próximo de pivô local X=16 e chão Y=64;
- no facing esquerdo o renderer usa `renderX = drawX - 32` antes de espelhar,
  para conservar o AABB;
- assets ilustrados 128×192 são desenhados no mesmo retângulo lógico 64×96 e
  chegam 1:1 ao backing físico no padrão 2×.

Hitbox corpo a corpo:

- direita: `(x+20, y+7, 26×20)`;
- esquerda: `(x-24, y+7, 26×20)`.

Âncoras de disparo atuais — estas substituem coordenadas antigas descritas em
alguns handoffs:

| Personagem | Centro do flash/projétil | Top-left do projétil 8×8 |
|---|---|---|
| BoyPunk direita | `(x+38, y+16)` | `(x+34, y+12)` |
| BoyPunk esquerda | `(x-16, y+16)` | `(x-20, y+12)` |
| Nilo direita | `(x+32, y+12)` | `(x+28, y+8)` |
| Nilo esquerda | `(x-10, y+12)` | `(x-14, y+8)` |

Esses valores vêm de `CHARACTERS.weaponAnchor` mais `resolveWeaponAnchor()` em
`src/config.js`, consumido tanto pelo modelo quanto pelo muzzle flash. O handoff
do taco que cita projétil em `x+54` documenta um estado histórico e **não é mais
o comportamento do código atual**.

### Chaser

- hitbox: 16×32; contato usa o AABB inteiro;
- clássico: draw 16×32 em `enemy.x, enemy.y`;
- ilustrado: canvas/draw 32×64, centralizado em
  `enemy.x + enemy.w/2 - 16`, com transparência inferior para preservar o chão;
- facing esquerdo é espelhado;
- animações: idle 2@3 fps, walk 8@12, jump 2@6, attack 4@22, dead 4@12 sem loop;
- o conjunto ilustrado não possui jump: nesse estado o resolver cai para o
  sprite clássico.

### Atirador fixo

- hitbox: 24×24; sprite 32×32 desenhado com offset `x-4,y-4`;
- mira parte do centro do corpo; projétil 8×8 nasce centrado nesse ponto;
- `ready` parado e `shooting.0..3` distribuídos pelos primeiros 0,28 s da
  recuperação.

### Patrol-shooter

- hitbox: 16×32;
- clássico 32×32 centrado com offset horizontal `x-8`;
- ilustrado 64×64 centrado com offset horizontal `x-24`;
- orientação canônica é esquerda; facing direita é espelhado;
- muzzle: `enemy.centerX ± 10`, `enemy.y + 13`;
- projétil: 8×8, top-left `muzzle - 4`, velocidade 118 px/s;
- patrol 8@12 fps; aim 4 ao longo de 0,9 s, sem loop; fire 1 no compromisso de
  1/120 s, com feedback visual de 0,08 s; recovery 4 nos 0,28 s de recuo.

### Coletáveis, altar, projéteis e prensa

- almas: AABB 15×16; animação 4 frames a 10 fps; bob de ±2 px é somente visual;
- Rajada Dupla: AABB 16×16; quatro frames a 7 fps; bob 1,5 px somente visual;
- Tiro Rápido/Vida/Escudo: AABB e desenho procedural 20×20;
- altar: AABB e desenho 32×48; frame 0..6 selecionado pelo percentual depositado;
- projéteis de jogador/inimigo/canhão: AABB 8×8, mesmo quando a fonte da imagem
  é 16×16;
- prensa: hitbox exatamente `press.x, press.y, 44×16` somente durante `closing`;
- canhão bônus: muzzle fixo `(448,220)`, projétil 8×8.

## 10. Restrições para a nova arte

Para preservar colisões, plataformas, rotas e jogabilidade:

1. **Não alterar o espaço lógico 480×270**, `WORLD`, plataformas, spawns,
   posições de almas, altar, prensa, canhão ou rotas do patrol-shooter durante
   um refinamento puramente gráfico.
2. Manter os AABBs: jogador 22×32; chaser 16×32; shooter 24×24;
   patrol-shooter 16×32; altar 32×48; almas 15×16; Rajada 16×16; projéteis 8×8.
3. Manter linha de chão e raiz estáveis em todos os frames. Movimento interno da
   animação não pode deslocar pés/esteiras nem alterar a posição lógica.
4. BoyPunk/Nilo clássicos: canvas 64×96; corpo ancorado no contrato de X=16 e
   pés na fronteira Y=64. Ilustrados: 128×192, mas devem produzir o mesmo pivô
   quando reduzidos ao retângulo lógico 64×96.
5. Preservar espaço transparente necessário para espelhamento e extensões de
   ataque. Não centralizar automaticamente o corpo no canvas sem revisar
   `drawX/renderX` nos dois facings.
6. Alinhar armas às âncoras **atuais** de `CHARACTERS.weaponAnchor`, não às
   coordenadas antigas dos handoffs. O flash e o projétil hoje compartilham o
   mesmo centro lógico.
7. Ataques visuais não podem definir timing, dano ou spawn; esses vêm do modelo.
   O arco, flashes, trilhas e bob devem continuar sem hitbox.
8. Manter nomes, índices e contagens de frame. Se faltar frame ilustrado, o
   fallback pode causar troca de estilo/tamanho em runtime.
9. Plataformas one-way e sólidas precisam continuar distinguíveis por forma e
   contraste; decoração não deve sugerir piso onde não existe AABB.
10. Não cobrir aberturas e vãos com arte opaca que contradiga a geometria. Em
    especial: fosso da Câmara, rotas altas da Fábrica, corredor da prensa e
    bordas de patrulha.
11. Respeitar as faixas de HUD: topo `y=7..45`; cards esquerdos `y=51,73,95,117`;
    boss/aviso à direita `x=152..472`; no bônus, almas mais altas começam perto
    de `y=56`.
12. Garantir legibilidade sem depender só de cor/bloom, inclusive sólido versus
    one-way, perigo da prensa, dois tiros da Rajada, dano crítico e foco de menu.
13. Testar ambos os pipelines: clássico em `?scale=1` e ilustrado em
    `?scale>1`, além de fallback por frame ausente.
14. Preservar `prefers-reduced-motion`; efeitos essenciais precisam continuar
    compreensíveis quando pulsos, bob, scan e partículas forem reduzidos.

## 11. Problemas gráficos e de desempenho comprovados

### Problemas/assimetrias confirmados

1. **Artefato com nome/versão incorretos e bug antigo:**
   `BoyPunk-Studio-v0.4.0.html` declara 0.2.8 e mantém o acoplamento
   Rapid/Double. Isso cria alto risco de revisão gráfica sobre a versão errada.
2. **Portátil público desatualizado:** `dist-portable/JOGAR.html` é 0.2.6 e
   `releases/` termina em 0.2.2. Não representam a arte/lógica atual.
3. **Chaser ilustrado incompleto:** não existem frames
   `chaser.illustrated.jump.*`; a animação de salto troca para arte clássica.
4. **Boss visual semanticamente enganoso:** a barra aparece pelo progresso do
   altar, fica em 100% e sugere combate que não existe. O shell DOM/CSS do boss
   também permanece oculto e desconectado; o Canvas desenha outra barra.
5. **Pipeline muda a identidade por escala:** `?scale=1` usa arte clássica;
   qualquer escala acima de 1 tenta arte ilustrada. Isso deve ser tratado como
   dois conjuntos de QA visual, não apenas como resolução.
6. **Assets carregados sem consumo corrente localizado:** `world.texture`, os
   retratos PNG, `turret.created.*` e `turret.patrol.*` estão no manifesto, mas
   não foram encontrados nos lookups do renderer atual. Isso aumenta preload e
   superfície de manutenção, ainda que o custo isolado dos pequenos PNGs seja
   baixo.
7. **Efeitos visuais dependentes de FPS:** screen shake perde 0,45 de amplitude
   por frame renderizado, e partículas de pouso avançam/expiram em passos fixos
   de 0,016 por render, não pelo delta real. Em telas com refresh diferente, a
   duração/velocidade visual muda. Isso está em `src/renderer.js`.

### Custo comprovado, sem alegar regressão de FPS

- O boot carrega sequencialmente 235 imagens únicas antes de concluir, incluindo
  conjuntos clássico e ilustrado e os três fundos grandes.
- A superfície decodificada teórica é ~20,07 MiB RGBA, fora overhead de
  `ImageBitmap`, canvas, áudio, HTML e data URLs do standalone.
- Plataformas, atmosferas, boss, VFX e HUD usam muitos draws/gradientes por frame
  e não há cache de cena estática identificado.
- CSS usa `backdrop-filter`, sombras e várias animações sobre o Canvas.

Não foi feito profiling de CPU/GPU, heap, frame time ou bateria nesta auditoria.
Logo, não há prova atual de FPS baixo, vazamento ou travamento; os itens acima
são fatos arquiteturais e riscos mensuráveis, não uma medição de desempenho.

## 12. Testes executados e lacunas por plataforma

### Executados nesta auditoria

Ambiente:

- Linux x86_64, kernel `7.0.0-38-generic`;
- Node `v24.18.0`;
- npm `11.16.0`;
- Google Chrome instalado: `156.0.8078.47` (não executado).

Comandos/resultados:

1. `npm run check` — **aprovado**. Validou sintaxe dos módulos JS, ferramentas
   listadas e scripts Bash.
2. `npm test` — **28/28 arquivos aprovados**, 0 falhas, 0 cancelados, 0 ignorados,
   0 todo. Inclui core, renderer, assets, power-ups, personagens, níveis,
   colisões, bônus, demo, coop, gamepad, mobile, i18n, saves e prontidão Studio.
3. Inspeção de cabeçalhos/dimensões de todos os PNGs manifestados — realizada.
4. Inspeção estática de versão e branch Rapid/Double nos HTMLs — realizada.
5. SHA-256 dos artefatos principais — realizado.
6. Estado de servidor/processos — nenhum servidor BoyPunk ativo; nada foi
   iniciado ou encerrado.

### Não executados nesta auditoria

| Plataforma/modo | Estado |
|---|---|
| Linux + navegador HTTP | não executado; somente Node/static |
| Linux `file://` Studio 0.4.2 | não executado |
| Windows | não testado |
| macOS/Safari | não testado |
| Android físico | não testado |
| iPhone/iPad físico | não testado |
| Teclado/mouse humano | não testado |
| Controle USB/Bluetooth real | não testado; testes usam mocks |
| Multitouch real | não testado; testes são de lógica/eventos |
| Offline/sem rede | não testado em runtime; independência é apenas estática |
| Studio 0.4.2 por duplo clique | não testado em runtime |
| Performance/heap/FPS | não medido |
| Áudio/autoplay/decodificação WebM | não ouvido/testado em browser |

### Documentação anterior versus prova atual

Os documentos registram várias execuções históricas de Chrome headless e
capturas para versões intermediárias. Elas são úteis como histórico, mas não
foram tratadas como prova da árvore atual. A própria continuidade mais recente
declara que o runtime `file://` do Studio 0.4.2 não foi aprovado naquele ambiente
e requer validação manual. Essa pendência continua aberta após esta auditoria.

## Conclusão para o próximo refinamento gráfico

A base funcional que deve ser preservada é a fonte modular/Studio **0.4.2**. O
refinamento pode trabalhar sobre o renderer e os assets atuais, desde que
mantenha o espaço lógico, AABBs, pivôs, âncoras atuais de arma, geometria dos
níveis e os dois caminhos de renderização (clássico/ilustrado). Antes de aprovar
uma nova arte, é especialmente importante testar: chaser em salto, ambos os
facings dos protagonistas, muzzle/projétil, linhas de chão, boss meramente
decorativo, leitura de plataformas/vãos e todos os HUDs em escalas 1×, 1,5× e
2×.

Nenhuma correção, substituição de arte, build ou nova versão foi produzida nesta
etapa.
