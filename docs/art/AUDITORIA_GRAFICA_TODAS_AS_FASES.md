# Auditoria gráfica de todas as fases — BoyPunk! Web

**Data da auditoria:** 2026-11-04  
**Raiz canônica verificada:** `/home/flow/Projetos/BoyPunk-Web`  
**Versão autoritativa da fonte modular:** `0.4.2`  
**Escopo:** auditoria somente de leitura e contrato de produção de arte; nenhuma alteração de jogo foi implementada.

## 1. Resumo executivo

O jogo atual possui **duas fases de campanha jogáveis**, uma **fase bônus jogável** e um pacote de arte de uma possível quarta ambientação:

1. `district-neon` — **Distrito Neon**, primeira fase de campanha.
2. `scrap-factory` — **Fábrica de Sucata**, segunda fase de campanha.
3. `energy-chamber` — **Câmara de Energia**, fase bônus temporizada; não pertence ao catálogo de campanha.
4. **Cyber Lab** — background e tileset presentes e registrados como opcionais, mas sem nível, geometria, progressão ou consumidor no renderer. É somente um **candidato de arte**, não uma quarta fase confirmada.

Não foi localizada outra quarta ambientação implementada. As expressões “Fase 4A”, “4B”, “4C” e “4D” dos documentos de continuidade designam etapas de produção — coop, acabamento visual e personagens — e **não** um quarto nível.

A fonte que deve orientar qualquer trabalho futuro é a modular `0.4.2`. `BoyPunk-Studio-v0.4.0.html` e `dist-portable/JOGAR.html` são históricos e têm versões internas diferentes dos nomes externos. O Studio corrente é `studio-builds/BoyPunk-Studio-v0.4.2.html`, mas nem ele substitui a fonte modular como origem de edição.

O refinamento pode avançar sem alterar jogabilidade desde que respeite o espaço lógico `480×270`, a geometria de `src/level-data.js`, os pivôs e margens transparentes, as chaves do manifesto e os dois caminhos visuais atuais. **Não se deve mudar smoothing ou escala global**, nem presumir nearest-neighbor global: o runtime usa `image-rendering: auto` e smoothing de alta qualidade quando `renderScale > 1`.

## 2. Base verificada, fontes e limitações

### 2.1 Estado do projeto

- `package.json`: nome `boypunk-web`, versão `0.4.2`.
- `src/version.js`: `GAME_VERSION = "0.4.2"`.
- A cópia não é um repositório Git funcional. Não há `HEAD`/índice utilizável; portanto branch, commit e estado “limpo” não podem ser comprovados.
- Não existe `AGENTS.md` aplicável em `/home/flow/Projetos/BoyPunk-Web` nem no pai `/home/flow/Projetos`.
- Foram lidos os documentos de continuidade e os handoffs relevantes, incluindo `RELATORIO_ESTADO_BOYPUNK_CODEX.md`, `CONTINUIDADE_BOYPUNK_WEB.md`, passagens de bônus, fábrica, personagens, coop e `docs/art/CYBER_LAB_ART_HANDOFF.md`.
- `/home/flow/Documentos/assets.js` não foi usado como fonte do projeto.

### 2.2 Evidências novas de navegador

Pasta preservada:

`/home/flow/Projetos/BoyPunk-Web/evidencias/auditoria-grafica-2026-11-04/`

Arquivos:

- `distrito-neon-scale-1.png`
- `distrito-neon-scale-2.png`
- `fabrica-sucata-scale-1.png`
- `fabrica-sucata-scale-2.png`
- `camara-energia-scale-1.png`
- `camara-energia-scale-2.png`
- `capture-report.json`

O relatório comprova Chrome em zoom de página `1` (100%), `devicePixelRatio = 1`, fonte `0.4.2`, backing buffers `480×270` e `960×540`, estados/IDs corretos e nenhum erro de console. As capturas `scale=1` representam o caminho clássico; `scale=2`, o caminho que tenta arte ilustrada.

Limitação: o capturador trocou diretamente o modelo para as cenas sem encerrar o `AttractDirector`; por isso a faixa HTML inferior “DEMONSTRAÇÃO” permaneceu visível. Os estados registrados são reais (`campaign`/`bonus` e IDs corretos), e os passes de background, plataformas, entidades e HUD Canvas são válidos. A faixa inferior, porém, **não é baseline de sobreposição da campanha normal**. Não foram repetidas as capturas para evitar trabalho redundante. Os quadros foram feitos no início das cenas e não cobrem ciclos completos de inimigos, tiros, prensa ou aparição tardia do Overlord; para esses pontos, a conclusão vem do código e das evidências especializadas já existentes.

### 2.3 Referências HTML locais

Foram encontrados nove arquivos, correspondendo a oito conteúdos únicos porque `foice_sombria (1).html` é cópia byte a byte de `foice_sombria.html`:

- `/home/flow/Downloads/DARK SCYTHE — Halloween Slice.html`
- `/home/flow/Downloads/foice_sombria.html`
- `/home/flow/Downloads/foice_sombria (1).html` — duplicata exata
- `/home/flow/Downloads/foice_sombria V2.html`
- `/home/flow/Downloads/Parque Terra Encantada.html`
- `/home/flow/Downloads/Parque Terra Encantada (1).html`
- `/home/flow/Downloads/A CRIPTA.html`
- `/home/flow/Downloads/Simulador de Clínica Psicológica.html`
- `/home/flow/Downloads/relaxamento_muscular_progressivo (2).html`

Eles foram examinados estaticamente como referência; scripts não foram executados nem importados. Confirmam os princípios já resumidos no pedido: gradientes localizados de material, sombras de contato, camadas de silhueta/névoa, iluminação aditiva controlada, limites por qualidade, hierarquia de informação, transições suaves e respeito a `prefers-reduced-motion`.

Esses princípios podem ser adaptados. Não devem ser copiados controles, câmera, mecânicas, personagens, armas, flashes, paletas completas ou escurecimento que esconda ameaças.

## 3. Inventário verificado de níveis

| ID / nome | Papel e estado | Background / tiles | Entidades e objetos | Efeitos e elementos específicos |
|---|---|---|---|---|
| `district-neon` / Distrito Neon | Campanha 1; jogável; desbloqueado inicialmente | `world.background` → `distrito-neon.png`; `world.tiles` → `platformtiles.png` | BoyPunk ou Nilo; altar; almas; chaser; shooter fixo; patrol-shooter conforme fase; Rajada Dupla; Tiro Rápido, Vida e Escudo | chuva e grid/laser cyberpunk, névoa leve em escala alta, poças neon, reflexo de piso, iluminação reativa do altar, HUD de campanha |
| `scrap-factory` / Fábrica de Sucata | Campanha 2; jogável; liberada ao concluir Distrito | `world.background.factory` → `fabrica-sucata.png`; `world.tiles.factory` → `factory-platformtiles.png` | mesmos protagonistas/objetivo/inimigos/power-ups; altar próprio; prensa real `scrap-press-01` | atmosfera industrial, fuligem/brasas, lodo e reflexo de piso, pistões laterais decorativos, Overlord decorativo, prensa procedural com quatro fases |
| `energy-chamber` / Câmara de Energia | **Bônus**, jogável após qualificação ou por preview local; não integra `LEVEL_CATALOG` | `world.background.bonus` → `camara-energia.png`; `world.tiles.bonus` → `energy-platformtiles.png` | protagonista preservado, 30 almas bônus, canhão `energy-cannon-01`; sem altar, inimigos ou power-ups | atmosfera energética, fosso central real, canhão/laser/retícula procedurais, speed-rush, HUD próprio, penalidade de tempo |
| sem ID de nível / Cyber Lab | Somente arte candidata; não jogável | `world.background.cyberlab` → `cyber-lab.png`; `world.tiles.cyberlab` → `cyber-lab-platformtiles.png` | nenhuma | não há branch de tema, geometria, HUD, entidades, progressão ou URL de preview |

### 3.1 Elementos compartilhados

- Mundo lógico e renderer Canvas 2D.
- Plataformas definidas como retângulos e revestidas por células `16×16`.
- Personagens, chaser, shooters, projéteis e VFX comuns às duas fases de campanha.
- Almas de campanha preferem `soul.cyber.*`; `soul.*` é fallback legado.
- HUD, iluminação reativa, partículas, textos flutuantes, flashes, trilhas e efeitos de vitória/derrota são majoritariamente procedurais.
- As colisões e a geometria não vêm dos pixels do background ou tileset.

### 3.2 Elementos exclusivos

- Distrito: chuva, varredura laser/grid, poças e altar com conjunto ilustrado disponível.
- Fábrica: prensa de gameplay, altar próprio, fuligem/brasas, pistões decorativos, Overlord e barra de “boss” decorativos.
- Câmara: layout vertical, 30 almas fixas, fosso central, canhão e relógio de 20 s.
- Cyber Lab: dois PNGs opcionais e previews de composição; nenhum comportamento.

## 4. Inventário de modos e previews

| Modo / acesso | Ambiente | Estado | Particularidades gráficas |
|---|---|---|---|
| Campanha solo | Distrito e Fábrica | jogável | BoyPunk ou Nilo, altar, inimigos, almas, quatro power-ups independentes e HUD completo |
| Bônus qualificado | Câmara de Energia | jogável, condicionado à vitória/qualificação | 30 almas, canhão, HUD próprio; resultado pode alimentar recorde bônus |
| Preview bônus `?bonus-preview=1` | Câmara de Energia | preview de desenvolvimento | mesma arena, sem persistência |
| Survival | Distrito Neon | jogável, modo separado | BoyPunk, ondas de chaser/shooter; sem altar, almas, prensa ou power-ups; HUD de onda/tempo |
| Demo/attract | Distrito Neon | jogável por controlador automático | BoyPunk fixo, sem progressão e sem power-ups; patrol-shooter desativado para demo |
| Coop local `?coop-preview=1` | Distrito Neon | experimental/isolado | P1 BoyPunk + P2 Nilo, HUD duplo; sem Rajada Dupla, bônus ou persistência; exige controle(s) real(is) |
| Preview do patrol-shooter `?patrol-shooter-preview=1` | Distrito Neon | experimental/diagnóstico | um patrol-shooter com colisores ativos; não salva |
| Cyber Lab | nenhum | apenas arte | não há modo nem preview de runtime |

“Demo” é um modo sobre Distrito Neon, não uma fase. “Coop” é uma prévia isolada sobre Distrito Neon, não uma campanha paralela. A Câmara continua sendo bônus mesmo quando aberta por URL direta.

## 5. Relação com os standalones

| Artefato | Versão interna | Relação com esta auditoria |
|---|---:|---|
| fonte modular (`index.html` + `src/`) | `0.4.2` | origem autoritativa |
| `studio-builds/BoyPunk-Studio-v0.4.2.html` | `0.4.2` | standalone corrente; útil para avaliação, não para edição-fonte |
| `studio-builds/BoyPunk-Studio-v0.4.1.html` | `0.4.1` | histórico anterior à correção independente de Rapid/Double |
| `BoyPunk-Studio-v0.4.0.html` | `0.2.8` | nome enganoso; histórico e inadequado como baseline |
| `dist-portable/JOGAR.html` | `0.2.6` | portátil histórico/desatualizado |

Nenhum standalone ou pacote deve ser regenerado durante os lotes de arte. A promoção para Studio/portátil é uma etapa final e separada do Codex.

## 6. Contrato técnico do renderer e dos assets

### 6.1 Resolução, escala e filtragem

- Espaço lógico fixo: `WORLD = { width: 480, height: 270 }`, proporção 16:9.
- Canvas 2D com `{ alpha: false }`; não há WebGL.
- Backing padrão desktop: `960×540` (`renderScale = 2`).
- Janela menor que 640 CSS px: padrão `720×405` (`renderScale = 1.5`).
- `?scale=1..4` seleciona explicitamente a escala; o renderer faz clamp no intervalo.
- O CSS ocupa o frame 16:9 com `width/height: 100%` e `image-rendering: auto`.
- `imageSmoothingEnabled = false` somente em `renderScale = 1`; acima de 1 é `true`, com `imageSmoothingQuality = "high"`.
- Não alterar smoothing, escala global ou `image-rendering` como parte do refinamento artístico.
- Não presumir pixel art nearest-neighbor global. Os assets ilustrados foram criados justamente para o caminho suavizado de maior resolução.

### 6.2 Caminhos clássico e ilustrado

`resolveAnimationImage()` usa a escala como seletor atual:

- `renderScale = 1`: procura apenas o namespace clássico.
- `renderScale > 1`: tenta primeiro `<namespace>.illustrated.*`; se faltar, cai para o clássico.

O mesmo princípio vale para bala de jogador/inimigo e, no Distrito, para altar. Backgrounds e tilesets não têm par clássico/ilustrado: são os mesmos PNGs nos dois caminhos.

Assim, toda entrega precisa ser aprovada em pelo menos `?scale=1` e `?scale=2`. O chaser ilustrado não possui `jump`; nesse estado há troca para o frame clássico, assimetria real que deve ser corrigida por asset antes de qualquer remoção de fallback.

### 6.3 Backgrounds e recorte

O renderer aplica um recorte central equivalente a `cover` e desenha o resultado em `0,0,480,270`:

```text
se sourceRatio > 16/9: corta igualmente nas laterais
senão: corta igualmente em cima e embaixo
```

| Ambiente | Dimensão medida | Canais | Recorte atual aproximado |
|---|---:|---|---|
| Distrito Neon | `1672×941` | RGB opaco | `sw=1672`, `sh=940,5`, `sy=0,25` |
| Fábrica de Sucata | `1365×768` | RGB opaco | `sw=1365`, `sh=767,8125`, `sy=0,09375` |
| Câmara de Energia | `1365×768` | RGB opaco | igual à Fábrica |
| Cyber Lab | `1365×768` | RGB opaco | seria igual à Fábrica, se integrado |

Não colocar informação crítica nas bordas. A arte deve tolerar o subpixel do recorte e continuar correta após redução a `480×270`.

### 6.4 Tilesets e amostragem exata

Todos os tilesets atuais são `128×128 RGBA`, mas somente duas células são consumidas:

- one-way: origem `(sx=0, sy=0, sw=16, sh=16)`;
- sólida: origem `(sx=16, sy=0, sw=16, sh=16)`;
- destino: blocos `16×16` repetidos e recortados ao retângulo da plataforma;
- região restante do PNG: não amostrada e deve permanecer transparente.

Antes do tile o renderer preenche uma base escura. Depois adiciona overlays procedurais:

- Distrito: borda ciano em one-way, laranja em sólido, brilho violeta, suportes/sombra em escala alta e reflexo molhado no piso.
- Fábrica: borda de manutenção ciano nas passarelas, sinalização âmbar nos sólidos, suportes triangulares, rebites, reflexo quente/frio e faixas de piso.
- Câmara: trilho ciano, subglow violeta, borda sólida violeta, conduítes, nós de energia, reflexo e marcação do fosso.

O tileset não deve duplicar com intensidade esses overlays. Cantos especiais pintados no PNG não serão selecionados pelo código atual.

### 6.5 Ordem de renderização

1. limpeza do backing buffer;
2. transformação lógica→física;
3. background e atmosfera do ambiente;
4. iluminação reativa do altar;
5. plataformas;
6. canhão bônus;
7. altar;
8. power-ups;
9. almas;
10. inimigos;
11. projéteis;
12. protagonista(s);
13. prensa real;
14. efeitos e debug;
15. speed-rush do bônus;
16. HUD em screen-space;
17. vitória/derrota;
18. telas e overlays HTML/CSS.

Background e HUD não recebem o screen shake do passe do mundo.

## 7. Contrato de animação, pivôs e transparência

### 7.1 Protagonistas

Estados obrigatórios para BoyPunk e Nilo, em ordem numérica `000`, `001` etc.:

| Estado | Frames | Cadência | Loop |
|---|---:|---:|---|
| `idle` | 4 | 5 fps | sim |
| `walk` | 4 | 12 fps | sim |
| `jump` | 1 | pose | não |
| `fall` | 1 | pose | não |
| `attack1` | 4 | 22 fps | durante o ataque |
| `hurt` | 3 | 12 fps | enquanto há flash de dano |
| `die` | 4 | 10 fps | não |

Prioridade: morte → ataque → dano → salto/queda → caminhada → idle. Cada personagem tem 21 frames clássicos `64×96 RGBA` e 21 ilustrados `128×192 RGBA`.

Contrato lógico:

- colisor: `22×32`, origem `player.x/player.y`;
- draw: `64×96` em `drawX = x + w/2 - 16`, `drawY = y + h - 64`;
- pivô corporal: X lógico `16`, não o centro do canvas em X=32;
- pés: fronteira lógica Y=64; em clássico, o último pixel de contato é Y=63;
- linhas clássicas Y=64..95 ficam transparentes;
- no ilustrado, a metade inferior Y=128..191 deve ficar transparente para produzir a mesma linha de chão após redução;
- facing esquerdo: renderer desloca `renderX = drawX - 32` e então espelha o canvas inteiro;
- não recortar, fazer auto-trim, recentralizar ou deslocar o corpo entre frames.

Envelopes alpha medidos no conjunto atual, úteis como limite de compatibilidade:

| Conjunto | Canvas | União aproximada do alpha atual |
|---|---:|---|
| BoyPunk clássico | `64×96` | X `0..61`, Y `36..63` |
| Nilo clássico | `64×96` | X `5..47`, Y `35..63` |
| BoyPunk ilustrado | `128×192` | X `12..93`, Y `40..127` |
| Nilo ilustrado | `128×192` | X `12..88`, Y `40..127` |

Esses envelopes incluem extensões de ataque e morte; não são convite para preencher toda a área. Manter folga transparente para arma, flash e espelhamento.

Âncoras autoritativas de arma:

| Personagem / ID | Centro do muzzle | Top-left do projétil `8×8` |
|---|---|---|
| BoyPunk / `boypunk`, direita | `(x+38, y+16)` | `(x+34, y+12)` |
| BoyPunk, esquerda | `(x-16, y+16)` | `(x-20, y+12)` |
| Nilo / `support`, direita | `(x+32, y+12)` | `(x+28, y+8)` |
| Nilo, esquerda | `(x-10, y+12)` | `(x-14, y+8)` |

Esses valores vêm de `CHARACTERS.weaponAnchor` e são compartilhados pelo modelo e pelo muzzle flash. Handoffs antigos com outras coordenadas estão superados pelo código 0.4.2.

Direção autorizada para uma rodada futura, não para esta auditoria:

- BoyPunk: armadura clara, metal escuro e iluminação ciano, mantendo silhueta e âncora.
- Nilo: personagem negro, armadura coerente com BoyPunk e arma visualmente distinta; ID técnico continua `support`.
- Cor de pele, cabelo, face e armadura de Nilo devem continuar legíveis nas dimensões efetivas, inclusive no clássico.
- Nenhuma nova arma visual pode mudar origem, dano, cadência, hitbox ou timing.

### 7.2 Inimigos

| Arquétipo | Clássico | Ilustrado | Frames / contrato |
|---|---:|---:|---|
| chaser | `16×32` | `32×64` | idle 2@3; walk 8@12; jump 2@6 somente clássico; attack 4@22; dead 4@12 sem loop |
| patrol-shooter | `32×32` | `64×64` | patrol 8@12; aim 4 ao longo de 0,9 s; fire 1; recovery 4 em 0,28 s |
| shooter fixo | `32×32` | sem par ilustrado | ready 1; shooting 4 na recuperação inicial |

- Chaser: colisor `16×32`; clássico desenhado na origem do colisor; ilustrado desenhado `32×64`, centralizado no colisor. Facing esquerdo é espelhado.
- Patrol-shooter: colisor `16×32`; clássico centralizado por `x-8`, ilustrado por `x-24`; orientação canônica olha para a esquerda e facing direita é espelhado. Muzzle em `centerX ± 10`, `y+13`.
- Shooter fixo: colisor `24×24`; sprite `32×32` com offset `x-4,y-4`.
- Frames `turret.created.*` e `turret.patrol.*` estão no manifesto, mas não foram confirmados como caminho do shooter fixo atual. Não redesenhá-los como prioridade sem primeiro remover/confirmar o consumo.

### 7.3 Objetos

- Almas de campanha: `15×16`, 4 frames a 10 fps, bob visual ±2 px.
- Almas bônus: `15×16`, 4 frames a 10 fps, mesmo colisor.
- Rajada Dupla: `16×16`, 4 frames a 7 fps, bob visual 1,5 px.
- Tiro Rápido, Vida e Escudo: `20×20`, desenho procedural; não têm sprite dedicado.
- Altar: `32×48`, sete estados `0..6` selecionados por razão depositada.
- Projéteis de jogador, inimigo e canhão: colisor/destino `8×8`.
- Cura de Nilo: quatro frames `32×32`, centrados em `(16,16)`, somente VFX.
- Prensa: colisor `44×16` em `press.x, press.y`; causa dano somente em `closing`.
- Canhão bônus: muzzle fixo `(448,220)`, projétil `8×8`.

## 8. Identificadores que devem ser preservados

### Níveis, temas e entidades

- IDs: `district-neon`, `scrap-factory`, `energy-chamber`.
- Temas: `neon-district`, `scrap-factory`, `energy-chamber`.
- Personagens: `boypunk`, `support`.
- Power-ups: `double-burst`, `rapid-fire`, `health`, `shield`.
- Prensa: `scrap-press-01`.
- Canhão: `energy-cannon-01`.

### Chaves principais do manifesto

- `world.background`, `world.background.factory`, `world.background.bonus`, `world.background.cyberlab`.
- `world.tiles`, `world.tiles.factory`, `world.tiles.bonus`, `world.tiles.cyberlab`.
- `player.<state>.<frame>`, `player.illustrated.<state>.<frame>`.
- `nilo.<state>.<frame>`, `nilo.illustrated.<state>.<frame>`.
- `chaser.<state>.<frame>`, `chaser.illustrated.<state>.<frame>`.
- `patrolShooter.<state>.<frame>`, `patrolShooter.illustrated.<state>.<frame>`.
- `soul.<frame>`, `soul.cyber.<frame>`, `bonusSoul.<frame>`.
- `altar.<frame>`, `altar.distrito-neon.<frame>`, `altar.distrito-neon.illustrated.<frame>`, `altar.scrap-factory.<frame>`.
- `powerUp.double-burst.idle.<frame>`.

Cyber Lab usa `cyberlab` sem hífen nas chaves e `cyber-lab` com hífen nos nomes dos PNGs. Não criar alias ou ID de nível sem decisão de design e migração explícita.

## 9. Diagnóstico visual

### 9.1 Consistência geral

- Os três backgrounds têm linguagem cyberpunk coerente, boa profundidade pintada e paletas próprias.
- As plataformas são mais rígidas, repetitivas e “tileadas” do que os fundos. O contraste é funcional, mas a diferença de acabamento denuncia duas camadas de produção.
- Em `scale=1`, personagens e chaser clássicos têm massa visual muito menor e mais pixelada que cenário, HUD e objetos procedurais. Em `scale=2`, protagonistas ilustrados integram melhor materiais e silhueta, mas o conjunto ainda mistura assets sem variante ilustrada.
- A Fábrica não possui altar ilustrado próprio; acima de 1× continua no conjunto `32×48`, ampliado. O chaser em salto também regride para o clássico.
- A repetição de células é mais visível nas passarelas longas e nas quatro fileiras da Câmara.

### 9.2 Decoração, coletáveis e perigos

- Almas, power-ups e altar são legíveis por forma, contorno e brilho. Os power-ups procedurais são grandes e separam bem Tiro Rápido, Vida e Escudo.
- Os ícones procedurais de power-up têm acabamento mais vetorial/limpo que os personagens clássicos; o refinamento deve aproximar materiais sem transformar tudo em laboratório.
- Na Fábrica, os dois pistões laterais desenhados por `drawHydraulicPistons()` usam blocos móveis e faixas de perigo, mas **não** aparecem em `level.presses` e não têm dano/collider. Podem ser lidos falsamente como ameaça.
- A prensa central `scrap-press-01` é o perigo real: existe em `level-data`, atualiza fases no modelo, possui hitbox/dano e é renderizada por `drawPresses()`. Sua sinalização deve continuar exclusiva e superior à decoração.
- Lodo, faixas de piso, brasas e reflexos da fábrica são decoração/VFX; não foi localizado dano associado a eles.
- O fosso central da Câmara corresponde a uma abertura real do piso. Queda no bônus aciona recuperação/penalidade, não morte de campanha.

### 9.3 Almas bônus e contornos retangulares

A origem foi comprovada em `Renderer.drawSouls()`:

```js
if (bonus) {
  ctx.strokeStyle = "rgba(255,177,74,.72)";
  ctx.strokeRect(Math.round(soul.x - 2), Math.round(soul.y + bob - 2), 19, 20);
}
```

O retângulo **não está nos PNGs** `bonus-soul-000..003.png`. Como existem 30 almas simultâneas, a grade de caixas compete com a arquitetura e aumenta repetição. Uma futura remoção/substituição é tarefa do Codex no renderer: Antigravity pode melhorar o sprite, mas não eliminar esses retângulos por asset. O colisor `15×16` e as posições devem permanecer.

### 9.4 Tiros sobre luzes ciano

- O projétil do jogador recebe halo aditivo ciano, mas mantém corpo âmbar e núcleo branco/ciano. Essa combinação evita desaparecimento total sobre luzes ciano.
- Ainda há risco de o halo e a trilha se fundirem com bordas de plataforma, almas e luminárias do Distrito/Câmara. O refinamento deve preservar núcleo claro e separação âmbar/escura, limitar bloom de cenário nas rotas de tiro e nunca depender só de ciano.
- Projétil inimigo usa rosa/vermelho; canhão bônus usa âmbar. Essa semântica deve continuar consistente.

### 9.5 HUD e áreas jogáveis

- Campanha: painéis principais ocupam `y=7..45`; cards de estado à esquerda podem ocupar `y=51`, `73`, `95` e `117`.
- Avisos comuns usam a faixa `y=51..68`; com barra decorativa de boss, mudam para `y=77`.
- A barra do “Factory Overlord” ocupa `x=152..472`, `y=51..73`.
- O hint inferior começa em `y=246` e cobre visualmente parte do piso `y=240..270`; em cenas movimentadas pode esconder pés, pickup ou sinalização baixa.
- Câmara: as almas superiores começam em `y=56`, logo abaixo do HUD `y=7..45`; a folga é curta, mas existente.
- HUD é desenhado depois do mundo e não treme. Isso é correto e deve ser preservado.

### 9.6 Overlord e falsa leitura de chefe

`drawFactoryOverlord()` é uma composição procedural decorativa que aparece conforme progresso do altar. `drawBossHealthBar()` pode aparecer com razão padrão 100%, embora não exista entidade de boss, vida de boss, IA, colisão ou combate correspondente no modelo.

Portanto:

- não tratar o Overlord como chefe implementado;
- não produzir animações de ataque/dano/morte de boss nesta rodada;
- uma futura revisão deve ou rotulá-lo claramente como observador/maquinário de fundo, ou remover a barra de vida até existir combate real.

## 10. Direção visual comum

O padrão compartilhado deve ser cyberpunk industrial, não “laboratório em todos os mapas”:

1. **Três planos de profundidade:** silhueta distante pouco contrastada, arquitetura média com cor local e plano jogável com arestas claras.
2. **Materiais consistentes:** metal escuro com gradação curta, highlights localizados e sombras de contato; evitar brilho uniforme em todas as superfícies.
3. **Semântica estável:** ciano para tecnologia/energia e leitura amigável, âmbar para interação/industrial, rosa/vermelho para ameaça. Forma e movimento devem reforçar cor.
4. **Orçamento de emissão:** deixar rotas de tiros, almas e personagens com os picos de luminância. Luminárias de fundo não devem disputar o núcleo branco/âmbar dos projéteis.
5. **Contato:** pés, altar, prensa e pickups precisam de sombra/reflexo curto que confirme o plano sem virar hitbox falsa.
6. **HUD protegido:** reduzir detalhe e contraste sob `y=0..45`, sob a segunda faixa `y=51..77` e na faixa inferior de avisos.
7. **Movimento reduzido:** informação essencial deve sobreviver sem bob, pulso, névoa móvel, scan ou partículas.
8. **Escalabilidade:** efeitos adicionais devem ter versão restrita ou condicional, sem mudar smoothing/escala global.

## 11. Plano por ambientação

### 11.1 Distrito Neon

- Reforçar profundidade urbana com três distâncias: skyline frio, passarelas médias e plataformas transitáveis.
- Reduzir luminárias ciano exatamente atrás das rotas comuns de projéteis; preservar pontos de cor, mas com bloom localizado.
- Variar sujeira, rebites, painéis e reflexos por blocos maiores sem sugerir novos pisos.
- Tornar metal das plataformas compatível com o background por highlights finos e sombra de contato, mantendo one-way ciano e sólido laranja.
- Conter chuva/grid para não cruzar rosto, arma e alma com a mesma intensidade.
- Manter poças como reflexão baixa, sem aparência de perigo.

### 11.2 Câmara de Energia

- Fazer a identidade vir de contenção, circuito e energia pulsante, não de “mais um laboratório genérico”.
- Manter as quatro alturas e o fosso central visualmente inequívocos.
- Criar variação interna nas passarelas sem quebrar o tile `16×16` nem o topo de colisão.
- Reduzir repetição das 30 caixas: primeiro alterar o contorno procedural no renderer; depois calibrar sprite/glow.
- Reservar ciano claro para trilhos e núcleo do cenário; usar violeta/âmbar para separar almas, canhão e risco.
- Manter o canhão e sua retícula mais legíveis que qualquer painel decorativo.
- Evitar flashes de fundo que pareçam alma coletável.

### 11.3 Fábrica de Sucata

- Priorizar aço queimado, ferrugem, fuligem, óleo e luz quente de fornalha, com ciano apenas como manutenção/tecnologia.
- Variar sucata e placas no background sem desenhar superfícies falsas sobre vãos reais.
- Reduzir faixas de perigo nos pistões decorativos laterais ou dar-lhes comportamento visual claramente de fundo.
- Preservar exclusivamente na prensa real: corredor projetado, setas, beacons, face inferior e mudança por fase.
- Manter a prensa central em primeiro plano e o Overlord atrás dela, sem prometer combate.
- Controlar brasas e lodo para não encobrir alma, projétil ou power-up no piso.

### 11.4 Cyber Lab

- Tratar como candidato até existir decisão explícita sobre a quarta fase.
- Preservar os assets atuais; não regenerar nem ativar automaticamente.
- A arte já segue o contrato básico de background `1365×768` e tiles `128×128`.
- Antes de integração, definir: papel na campanha, ID, geometria, objetivo, perigos reais, paleta exclusiva, progressão e se reutiliza ou não altar/inimigos.
- Só depois criar branch de renderer, nível, testes e preview. O laboratório não deve contaminar visualmente Distrito, Câmara ou Fábrica.

## 12. Arquivos que o Antigravity poderá produzir

Para impedir sobrescrita acidental, a primeira entrega deve ser um pacote candidato fora do manifesto. Caminhos exatos sugeridos:

```text
art-deliveries/antigravity/refino-fases-v1/world/distrito-neon.png
art-deliveries/antigravity/refino-fases-v1/world/platformtiles.png
art-deliveries/antigravity/refino-fases-v1/world/fabrica-sucata.png
art-deliveries/antigravity/refino-fases-v1/world/factory-platformtiles.png
art-deliveries/antigravity/refino-fases-v1/world/camara-energia.png
art-deliveries/antigravity/refino-fases-v1/world/energy-platformtiles.png
art-deliveries/antigravity/refino-fases-v1/README.md
```

`README.md` deve registrar dimensões, canais, ferramenta, prompt/processo, licença/procedência, data e mapa de correspondência com o runtime. Não criar novos scripts de geração dentro do jogo.

Cyber Lab não entra nesse lote porque os dois candidatos já existem:

```text
assets/images/world/cyber-lab.png
assets/images/world/cyber-lab-platformtiles.png
```

Se a rodada separada de protagonistas for iniciada depois desta auditoria, os candidatos devem ficar em:

```text
art-deliveries/antigravity/personagens-v1/boypunk/classic/playeranim-{idle:000..003,walk:000..003,jump:000,fall:000,attack1:000..003,hurt:000..002,die:000..003}.png
art-deliveries/antigravity/personagens-v1/boypunk/illustrated/playeranim-{idle:000..003,walk:000..003,jump:000,fall:000,attack1:000..003,hurt:000..002,die:000..003}.png
art-deliveries/antigravity/personagens-v1/nilo/classic/nilo-{idle:000..003,walk:000..003,jump:000,fall:000,attack1:000..003,hurt:000..002,die:000..003}.png
art-deliveries/antigravity/personagens-v1/nilo/illustrated/nilo-{idle:000..003,walk:000..003,jump:000,fall:000,attack1:000..003,hurt:000..002,die:000..003}.png
art-deliveries/antigravity/personagens-v1/boypunk/player-portrait-000.png
art-deliveries/antigravity/personagens-v1/nilo/nilo-portrait-000.png
art-deliveries/antigravity/personagens-v1/README.md
```

As chaves entre `{}` acima são uma enumeração compacta exata dos 21 arquivos de cada conjunto, não um sprite sheet. A entrega futura não deve substituir arquivos ativos. Promoção, manifesto, testes e renderer pertencem ao Codex.

Não produzir nesta frente: código, saves, configurações, releases, colisores, mapas, controles, áudio, efeitos de dano, novas armas funcionais ou boss.

## 13. Mudanças futuras que caberão ao Codex

1. Comparar candidatos e promover arquivos aprovados para os caminhos do manifesto, mantendo cópia/reversão.
2. Ajustar somente mapeamento de assets/tema, sem tocar geometria ou física.
3. Substituir o `strokeRect` das almas bônus por glow/silhueta não retangular, se aprovado.
4. Diferenciar visualmente pistões decorativos e prensa real sem alterar a prensa.
5. Remover/reformular barra do Overlord enquanto não houver boss funcional.
6. Completar `chaser.illustrated.jump.0..1` antes de eliminar o fallback clássico.
7. Decidir se seleção clássico/ilustrado continuará acoplada a `renderScale`; qualquer desacoplamento exige testes próprios e não deve alterar smoothing global.
8. Integrar Cyber Lab somente após confirmação de design, adicionando ID, `LEVELS`, catálogo/progressão se aplicável, branch de background/tiles, QA e testes.
9. Atualizar testes de assets, renderer e screenshots.
10. Regenerar Studio/portátil somente após aprovação final e em tarefa separada.

## 14. Critérios de comparação antes/depois

### Integridade técnica

- mesmas dimensões, canais e nomes previstos;
- mesmos IDs, frame counts, ordem e cadências;
- pés/pivôs imóveis entre frames e facings;
- nenhum alpha opaco abaixo da linha de chão contratada;
- plataformas, vãos, altar, prensa, canhão e almas alinhados aos AABBs;
- nenhuma geometria falsa pintada no background;
- nenhum erro de console ou asset obrigatório ausente.

### Legibilidade

- personagem, inimigo, alma, power-up, projétil e perigo reconhecíveis em menos de um segundo;
- tiro do jogador legível sobre ciano por núcleo/contraste, não só por bloom;
- prensa real mais saliente que pistões decorativos;
- one-way e sólido distinguíveis também em escala de cinza;
- HUD legível sem encobrir informação crítica;
- Câmara sem grade dominante de 30 retângulos;
- Overlord não interpretado como combate ativo.

### Comparação controlada

- Chrome, zoom 100%, DPR 1;
- capturas em `?scale=1` e `?scale=2`;
- mesma posição, estado, tempo e seed quando possível;
- `AttractDirector` encerrado antes da captura final;
- debug/touch ocultos salvo quando forem o objeto do teste;
- quadros adicionais para prensa `idle/warning/closing/recovery`, tiros sobre luzes ciano, boss decorativo, reduced motion e HUD cheio;
- comparação visual e, quando útil, diferença de pixels; não exigir identidade de pixels para partículas aleatórias.

### Preservação de gameplay

- `npm run check` e suíte completa aprovados após cada promoção;
- mesma geometria, dano, cadência, ondas, IA, progressão, tempo do bônus e controles;
- Tiro Rápido continua reduzindo cooldown de forma independente;
- Rajada Dupla continua emitindo dois projéteis com intervalo próprio;
- nenhum lote gráfico pode reacoplar esses efeitos.

## 15. Ordem de implementação em pequenos lotes

1. **Baseline e staging:** registrar hashes/capturas atuais; receber somente os sete arquivos candidatos do ambiente.
2. **Distrito — background:** promover e validar um único background nos dois caminhos.
3. **Distrito — tiles:** promover tileset; conferir todas as bordas/vãos.
4. **Câmara — background/tiles:** validar legibilidade das 30 almas e canhão, sem mexer no renderer ainda.
5. **Câmara — renderer:** lote Codex separado para contornos das almas e orçamento de glow.
6. **Fábrica — background/tiles:** validar materiais, fuligem e contraste da prensa.
7. **Fábrica — semântica procedural:** lote Codex separado para pistões decorativos e Overlord/barra.
8. **Coerência transversal:** projéteis, almas, altar, power-ups, HUD cheio e reduced motion.
9. **Personagens:** rodada separada, primeiro BoyPunk completo, depois Nilo completo; não misturar frames parciais em produção.
10. **Cyber Lab:** gate de decisão. Se confirmado como quarta fase, planejar gameplay em tarefa própria; se não, manter apenas pacote candidato.
11. **Empacotamento:** somente após regressão completa e aprovação comparativa.

Cada lote deve ser reversível por arquivo e não deve combinar background, tiles, renderer, personagem e release numa mesma mudança.

## 16. Comando e URLs corretos

Iniciar a **fonte modular atual**, sem usar o portátil histórico:

```bash
cd /home/flow/Projetos/BoyPunk-Web
./iniciar-jogo.sh --no-open
```

Equivalente:

```bash
cd /home/flow/Projetos/BoyPunk-Web
npm run dev
```

URL principal:

`http://127.0.0.1:47831/`

URLs de diagnóstico existentes:

```text
http://127.0.0.1:47831/?scale=1
http://127.0.0.1:47831/?scale=2
http://127.0.0.1:47831/?bonus-preview=1
http://127.0.0.1:47831/?patrol-shooter-preview=1
http://127.0.0.1:47831/?coop-preview=1
```

`coop-preview` requer localhost HTTP e hardware/assignments compatíveis. `test` e `debug` são rotas de diagnóstico e não devem ser usados como apresentação visual final.

## 17. Pendências explícitas

- Aprovar a direção de arte e o diretório de staging antes de produzir assets.
- Capturar baseline final sem o selo de demo e com estados dinâmicos controlados; as seis capturas atuais continuam válidas para ambiente e caminhos de escala.
- Testar tiros em movimento sobre luzes ciano e HUD em carga máxima.
- Confirmar em hardware real o coop, se ele entrar na revisão visual.
- Medir frame time/heap depois de qualquer aumento de assets ou efeitos; esta auditoria não fez profiling.
- Decidir se Cyber Lab é realmente a quarta fase e qual função ela teria.
- Resolver em lote de renderer a falsa semântica de boss e dos pistões decorativos.
- Completar o salto ilustrado do chaser.

## 18. Preservação confirmada nesta auditoria

Nenhum código, asset, save, configuração, release, pacote, colisão, geometria, física, dano, cadência, onda, IA, controle, progressão, duração do bônus ou áudio foi alterado. Não houve instalação de dependências. O servidor e o Chrome usados para evidências foram temporários e já estão encerrados.

As correções independentes de **Tiro Rápido** e **Rajada Dupla** permanecem como contrato obrigatório. WASD, mouse, joystick e novos sons não pertencem a esta frente gráfica.
