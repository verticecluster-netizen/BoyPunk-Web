# Relatório — BoyPunk! Web 0.4.2

## Entrega Studio 0.4.2 — fonte corrigida para teste — 2026-10-29

A correção Rapid Fire/Double Burst foi revalidada antes da embalagem. Rapid
Fire isolado mantém um projétil e reduz a cadência; Double Burst isolado mantém
a cadência base e emite o segundo projétil após 0,12 s; os dois juntos mantêm a
cadência reduzida e dois projéteis. Cooldowns por personagem (BoyPunk
0,34/0,17 s; Nilo 0,408/0,204 s), duração independente de 10 s, cap 8,
ownership e cleanup não foram alterados.

QA automatizado: testes focados 3/3, `npm run check` aprovado e `npm test` 28/28
arquivos, zero falhas. O pipeline existente gerou o HTML a partir da fonte
modular; a verificação estática compilou o script inline, confirmou 17 módulos,
242 recursos embutidos e zero dependências externas obrigatórias. A cópia fora
do projeto em `/tmp/BoyPunk-Studio-v0.4.2.html` é idêntica ao original.

Artefato: `studio-builds/BoyPunk-Studio-v0.4.2.html`, versão 0.4.2,
8.732.735 bytes, SHA-256
`93c1c0263c68d56cde16f8a64da8b5667bd487080a89c8175cae765b8759a349`.
Todos os builds anteriores foram preservados.

O teste real `file://` permanece pendente: Chromium falhou antes de abrir a
página por ausência de `DevToolsActivePort`, e Firefox headless não concluiu nem
produziu captura. Portanto, carregamento completo, áudio após interação,
controles, retry e compatibilidade física não são declarados aprovados. A
gravação fornecida cobre personagens, conclusão, bônus e menu, mas não prova
power-ups simultâneos, offline ou dispositivos físicos.

Limites conhecidos: Factory Overlord continua visual, não um chefe de combate;
lodo e pistões adicionais são decorativos e não devem ser descritos como hazards
implementados. Somente a prensa industrial existente possui regra de gameplay.

Comandos:

```bash
xdg-open /home/flow/Projetos/BoyPunk-Web/studio-builds/BoyPunk-Studio-v0.4.2.html
xdg-open /home/flow/Projetos/BoyPunk-Web/studio-builds
```

## Correção de fonte pós-0.4.1 — Rapid Fire / Double Burst — 2026-10-29

O defeito foi reproduzido por teste vermelho: Rapid Fire isolado aplicava a
meia cadência correta, mas também gerava `burstId`, `doubleBurstAccepted` e um
segundo tiro pendente. A origem era uma condição única em `playerAttack()` que
tratava Rapid Fire como sinônimo de qualquer ataque energizado.

A implementação agora separa os contratos: Rapid Fire só multiplica o cooldown
por 0,5; Double Burst só é aceito quando `activePowerUp.id` é exatamente
`double-burst` e o relógio está positivo. Nenhum efeito genérico infere burst.

Resultados para BoyPunk e Nilo:

- nenhum: 0,34/0,408 s e um tiro;
- Rapid Fire: 0,17/0,204 s e um tiro;
- Double Burst: cooldown base, primeiro imediato e segundo após 0,12 s;
- ambos: cooldown reduzido, primeiro imediato e segundo após 0,12 s.

Cada efeito mantém 10 s independentes. Cap 8, 8×8, 330 px/s, vida 1,25 s,
direção aceita, posição corrente da arma no segundo tiro, anchors, dano e
ownership foram preservados. A fila aceita atravessa a expiração; pausa congela;
morte, término, retry e troca de cena cancelam. Coop-preview permanece excluído.

QA: focados 3/3, `npm run check` aprovado e `npm test` 28/28. O servidor de
browser foi bloqueado por `listen EPERM 127.0.0.1`, portanto cenas staged e
gameplay ordinário em hardware permanecem pendentes. Evidência em
`evidencias/gameplay/rapid-double-decoupling/README.md`.

Arquivos funcionais: `src/core.js`, `tests/powerups.test.mjs` e
`tests/coop.test.mjs`. Nenhum standalone foi gerado. O Studio v0.4.1 anterior,
SHA-256 `330cc48b705208a5b96288051888cb163b6abc6bf8cb2c239aec94fcdf836be2`,
não contém esta correção.

## Entrega 0.4.1 — HUD do chefe estabilizado e Studio — 2026-10-29

A estabilização anterior de HUD/menu foi preservada. O overlap reportado foi
confirmado no Canvas: Factory Overlord ocupava exatamente o painel central de
objetivo. A apresentação do chefe agora possui faixa própria abaixo do topo e
avisos críticos usam outra faixa enquanto ela está ativa. Vida/identidade,
almas carregadas/depositadas, altar, Double Burst, Cura, Rapid Fire e Shield
permanecem simultaneamente legíveis.

Também foi corrigida a apresentação dos pickups de Rapid Fire, Health e Shield,
que antes só era percorrida quando o pickup legado de Double Burst existia. O
pipeline de frame já corrigido em 0.2.8 — clear físico, shake no mundo, HUD em
screen-space e save/restore balanceado — continua vigente. Nenhuma causa nova de
deslocamento foi reproduzida; não há HUD duplicado, e artefato de captura continua
como incerteza residual quando o problema não aparece deterministicamente.

O levantamento real não encontrou boss jogável: Factory Overlord é shell visual
sem vida, dano ou vitória no modelo. Rapid Fire expira em 10 s e reduz a cadência,
mas também enfileira indevidamente o segundo tiro de Double Burst. Ambos são
defeitos de gameplay documentados fora do escopo; `src/core.js` e `src/coop.js`
não foram modificados.

Resultado automatizado: focados 3/3; `npm run check` aprovado; `npm test` 28/28,
zero falhas. O build estático compilou o script inline e incorporou 242 assets em
18 módulos, sem CDN ou referência local obrigatória. Chrome não criou CDP por
`setsockopt EPERM`/`DevToolsActivePort`; Firefox abriu `file://`, mas capturou a
tela ainda em 0% de preload. Assim, runtime standalone completo, áudio após gesto,
controles e retry em navegador permanecem manualmente pendentes.

Artefato: `studio-builds/BoyPunk-Studio-v0.4.1.html`, 8.732.599 bytes,
SHA-256 `330cc48b705208a5b96288051888cb163b6abc6bf8cb2c239aec94fcdf836be2`.
Evidências: `evidencias/ui/hud-menu-stabilization/`.

## Entrega 0.2.8 — HUD, menus e standalone Studio — 2026-10-29

Foi confirmado no código que o screen shake abrangia o passe que desenhava a
HUD e que o backing buffer não era explicitamente limpo antes do quadro. O
renderer agora limpa o buffer físico e separa fundo, mundo com shake e HUD em
screen-space. Double Burst, Cura e avisos usam faixas fixas; nenhum valor de
gameplay, evento ou aviso crítico foi atrasado.

Menu principal, pausa, vitória, derrota, transição e resultado bônus foram
ampliados com limites responsivos, tipografia hierarquizada, scroll interno e
ações de no mínimo 44 CSS px. Permanecem 480×270 lógicos, renderScale ilustrado,
arte, física, IA, input, áudio, saves, progressão, taco/projétil e coop isolado.
`src/core.js` e `src/coop.js` não foram alterados.

Baseline: `npm run check` e 26/26 arquivos de teste. Resultado final disponível:
`npm run check` e 27/27 arquivos aprovados. O HTML modular foi empacotado em
`studio-builds/BoyPunk-Studio-v0.2.8.html` (8.631.554 bytes), SHA-256
`f9411c79ed68a1bce2c206c02177f9fc18650cb5fa3ed639a7ee1edd2b676fbb`.
O build rejeitou referências externas/locais não incorporadas e a cópia isolada
é byte a byte idêntica. Runtime `file://` permanece pendente: HTTP local recebeu
`listen EPERM`, Chrome recebeu Crashpad `setsockopt EPERM` e Firefox headless não
gerou captura neste sandbox.

## Atualização de integração Phase 4D — 2026-10-29

Codex verificou a fonte e os PNGs, corrigiu as âncoras de arma por personagem,
adicionou clearance de parede/alvo no spawn, ativou os inimigos ilustrados no
renderer com pivô/solo corretos e removeu o fallback acidental do Patrol Shooter
para a torreta fixa. Tiro imediato, cooldowns, melee existente, Rajada Dupla,
coop, física, IA, saves, áudio e releases foram preservados. `npm run check` e
26/26 arquivos de `npm test` passaram. Navegador não foi observado nesta sessão
por bloqueios de socket/Crashpad; evidências staged anteriores não foram tratadas
como prova de movimento contínuo. Detalhes e coordenadas estão em
`PASSAGEM_TACO_ANIMACOES_PARA_CODEX.md` e `RETOMADA_BOYPUNK.md`.

## Fase 4D — Polimento Biomecânico de Personagens, Taco de Beisebol e Coesão de Inimigos — 2026-10-29

### Resultado
Concluída com êxito a integração do taco de beisebol com silhueta e construção crível em BoyPunk, a locomoção biomecânica independente de BoyPunk e Nilo Android, e a elevação de fidelidade e coesão dos inimigos (Chaser Droid e Patrol Shooter ilustrado a 2×). O gameplay, física, tempos de emissão de projéteis, regras de combate e limites de colisão permanecem 100% inalterados. O documento mestre de passagem [PASSAGEM_TACO_ANIMACOES_PARA_CODEX.md](file:///home/flow/Projetos/BoyPunk-Web/PASSAGEM_TACO_ANIMACOES_PARA_CODEX.md) formaliza a auditoria de coordenadas e a proposta de alinhamento futuro para Codex.

### Entregas Principais
1. **Taco de Beisebol de BoyPunk:**
   - Geometria física crível: pomo de retenção usinado (`#1a1e29`), empunhadura espiralada em borracha sintética, cone de transição em liga de titânio escovado (`#4a5268`) e tambor cilíndrico de impacto com calota suave (4px lógico / 8px a 2×).
   - Acentos subordinados em ciano elétrico e laranja, sem glow mágico ou aspecto de espada/varinha.
   - Fixação anatômica em todos os estados: `idle` (apoiado no ombro direito com pegada relaxada), `walk` (empunhado junto ao quadril em ângulo dinâmico), `jump`/`fall` (empunhado pronto para rebater), `attack1` (swing de 4 etapas: preparação, avanço, impacto pleno e recuperação) e `die` (repouso no solo).
   - Auditoria de coordenadas: o centro do tambor no impacto atinge `player.x + 33`, alinhado com 0px de erro ao centro do colisor melee de `src/core.js` (`[player.x + 20 .. player.x + 46]`). Discrepância com o projétil físico (`player.x + 54`) documentada para alinhamento por Codex.
2. **Locomoção Biomecânica de Nilo Android (Sem Tacos):**
   - Identidade preservada: armadura cerâmica marfim polida (`#f0eee8`), juntas de grafite, óptica frontal âmbar e emissor cilíndrico de nanorreparo no antebraço direito.
   - Fases biomecânicas completas: apoio de calcanhar, passagem com folga de joelho, contra-rotação pélvica e extensão.
3. **Coesão Visual de Inimigos:**
   - **Chaser Droid Ilustrado (18 quadros, 32×64):** Lente monocular esférica carmesim, mandíbula de aço temperado rebitada com mordida mecânica e pernas articuladas com transferência de peso.
   - **Patrol Shooter Ilustrado 2× (17 quadros, 64×64):** Chassis pesado rebitado com `patrol` (8 quadros), `aim` (4 quadros), `fire` (1 quadro com recuo mecânico e flash de boca) e `recovery` (4 quadros com exaustão de calor). Registrado em `src/assets.js` sob `patrolShooter.illustrated.*` com fallback transparente.
4. **Limpeza do HUD e Feedback Visual:**
   - Supressão de redundância visual decorativa sem alterar eventos de simulação nem afetar o HUD cooperativo P1/P2.

### QA e Evidências
- **Testes Automatizados:** `npm run check` 100% limpo; `npm test` aprovado com **250 testes em 26 suítes** (zero falhas).
- **Evidências em `evidencias/art/character-motion-bat-polish/` (15 arquivos PNG):**
  - Estudo de silhueta e empunhadura do taco (`01-bat-silhouette-and-grip-study.png`).
  - Contact sheets com arcos e coordenadas (`02..06`).
  - Capturas em navegador real em tempo real (`07..14`).
  - Análise ampliada de alinhamento de contato e projétil (`15-bat-contact-and-projectile-alignment.png`).
- **Ponto de Recuperação:** `evidencias/recovery/BoyPunk-Web-pre-bat-and-character-motion-polish-20261029.tar.gz` (SHA-256: `dcdfa1051c6edd18945fdb316463f0a7f889d1f955115f1998c9cc873277c371`).

---

## Fase 4C — Atualização Cinematográfica e Arte Ilustrada 2D (Slice Distrito Neon) — 2026-10-29

### Resultado
Concluída com êxito a evolução da direção artística de BoyPunk! Web para um estilo 2D ilustrado refinado e cinematográfico, com silhuetas fluidas, materiais críveis (metal escovado, cerâmica técnica marfim, juntas de grafite, fiação emborrachada e ótica de vidro luminescente) e profundidade visual natural, eliminando a aparência de blocos voxel rígidos. A física, os colliders AABB, a lógica de simulação, o áudio, os saves e o espaço de coordenadas lógicas de **480 × 270** foram preservados com 100% de rigor.

### Entregas Principais
1. **Arquitetura de Renderização e Escalonamento Lógico-para-Render:**
   - Resolução lógica do gameplay mantida fixa em **480 × 270** (zero impacto em física, colisões, distâncias ou IA).
   - Buffer gráfico físico desacoplado via `renderScale` (clamp 1× a 4×, padrão 2× com backing canvas de 960 × 540 e 1.5× em telas móveis compactas).
   - `ctx.scale(renderScale, renderScale)` e `image-rendering: auto` com interpolação bilinear nos ativos ilustrados, eliminando bordas duras de pixel art esticada.
   - Parâmetro URL `?scale=` para inspeção flexível em qualquer resolução.
2. **Ativos Ilustrados 2× do Slice Distrito Neon:**
   - **BoyPunk (128 × 192 RGBA, 21 frames):** Capacete grafite polido com visor esférico ciano curvo, jaqueta verde com ombreiras de titânio arredondadas e proporções anatômicas naturais em idle, corrida (6 frames), ataque (3 frames) e derrota (4 frames). Ancoragem perfeita com o AABB de 22×32 no piso Y=126.
   - **Nilo Android (128 × 192 RGBA, 21 frames):** Chassis em placas de cerâmica técnica marfim, juntas de grafite acetinado, ótica âmbar multifacetada e emissor cilíndrico de nanorreparo.
   - **Altar Distrito Neon (64 × 96 RGBA, 7 frames):** Duto curvo de contenção de plasma com núcleo ciano líquido, aletas laterais em cobre escovado e LEDs in-world de integridade.
   - **Inimigo Chaser Droid (32 × 64 RGBA, 18 frames):** Lente monocular esférica carmesim, mandíbula de aço temperado rebitada e pernas bipedais articuladas.
   - **Projéteis Ilustrados (16 × 16 RGBA):** Pulso do jogador e bala inimiga com gradiente radial e halo luminoso suave.
   - Registro não-obstrutivo no manifesto `src/assets.js` (`*.illustrated`) com fallback instantâneo para os ativos clássicos.
3. **Cenário e Efeitos Refinados:**
   - Névoa atmosférica com gradiente vertical suave no céu distante de Distrito Neon.
   - Suportes estruturais tipo cantilever para plataformas one-way e sombras suaves de contato.
   - Partículas suaves: poeira de aterrissagem desenhada como puffs antialiased circulares concêntricos com decaimento alfa suave (`ctx.arc`).

### QA e Evidências
- **Testes Automatizados:** `npm run check` 100% limpo; `npm test` aprovado com **250 testes em 26 suítes** (zero falhas).
- **Evidências Visuais em Navegador Real (`evidencias/art/illustrated-neon-upgrade/`):**
  - 8 capturas via Google Chrome Headless CDP (`01..08`).
  - 6 pranchas comparativas completas:
    - `comparativo-boypunk-legacy-vs-illustrated.png`
    - `comparativo-nilo-legacy-vs-illustrated.png`
    - `comparativo-altar-legacy-vs-illustrated.png`
    - `comparativo-chaser-legacy-vs-illustrated.png`
    - `comparativo-projectiles-legacy-vs-illustrated.png`
    - `comparativo-distrito-neon-before-after.png` (Side-by-side de gameplay e zoom 2.5× nos detalhes de materiais e plataformas).
- **Ponto de Recuperação:** `evidencias/recovery/BoyPunk-Web-pre-illustrated-upgrade-20261029.tar.gz` (SHA-256: `03e5b0c4c3885e44d3ec20e3e58cb42a589543738a460e8af36798222498f907`).
- **Comandos para Inspeção Local:**
  - Jogo normal (2× ilustrado): `node tools/server.mjs` -> `http://127.0.0.1:47831/`
  - Jogo com escala 1× (modo clássico): `http://127.0.0.1:47831/?scale=1`
  - Jogo com escala 3×: `http://127.0.0.1:47831/?scale=3`

---

## Fase 4B — Atualização Focada de Qualidade Visual e Apresentação — 2026-10-28

### Resultado
Marco de polimento visual, cenários e clareza de HUD concluído com sucesso. A identidade dos personagens BoyPunk e Nilo foi preservada. Os sistemas de jogo, regras de física, IA, contratos de colisão, balanceamento e a prévia cooperativa isolada (`?coop-preview=1`) foram integralmente respeitados sem qualquer alteração em suas mecânicas.

### Entregas Principais
1. **Altar por Nível & LEDs de Status:**
   - Distrito Neon: Terminal urbano de ancoragem energética cibernética com barramentos neon violeta, núcleo em câmara de vidro blindado com plasma ciano pulsante em 7 frames (`altar.distrito-neon.0..6`).
   - Fábrica de Sucata: Reator industrial encapsulado com chapas de aço rebitadas, chanfros ambarinos de alerta, manômetro analógico e fornalha térmica (`altar.scrap-factory.0..6`).
   - 4 LEDs in-world na base do altar refletem a integridade restante (4 PV = ciano/verde; 2 PV = âmbar; 1 PV = vermelho).
   - Sinalizador visual de perigo `!` e aura vermelha em 1 PV crítico.
   - Pulso de energia vertical e ressonância circular ao confirmar depósito de almas.
2. **Almas Cibernéticas de Campanha:**
   - 4 frames de animação em 15×16 RGBA (`soul.cyber.0..3`) com núcleo de alta energia ciano, halo violeta, partículas e contorno escuro 1px garantindo legibilidade sobre qualquer plano de fundo.
   - Almas bônus preservadas com integridade nominal.
3. **HUD Arcade Segmentado:**
   - Separação clara no Painel 2: `CARGA X` (esquerda) e `ALTAR X/15` (direita).
   - Barra de progresso segmentada estilo arcade com chanfro e divisórias nítidas de 1px a cada alma coletada.
   - Faixas seguras de notificação garantem que banners não sofram saltos bruscos.
4. **Feedback Numérico Conciso de Combate:**
   - Acerto em inimigo: numeral `-1` em tom âmbar suave com anel de impacto.
   - Dano ao jogador: numeral `-1` em tom coral.
   - Nanoreparo de Nilo: numeral `+1` em ciano/esmeralda com anel curativo.
   - Coleta de alma: `+1` ciano. Depósito: `+N` na coluna de energia.
   - Penalidade do canhão bônus: mantido rigorosamente o `−1 s` existente.
   - Sem alocações por quadro e com suporte a `reducedMotion`.

### QA e Evidências
- **Testes Automatizados:** `npm run check` 100% limpo; `npm test` aprovado com **247 testes em 26 suítes** (zero falhas).
- **Evidências Visuais (`evidencias/art/polimento-global/`):**
  - 14 capturas headless em tempo real via Chrome CDP.
  - 5 pranchas comparativas (contact sheets) em redimensionamento nearest-neighbor e tipografia TrueType:
    - `comparativo-altar-before-after.png`
    - `comparativo-hud-before-after.png`
    - `comparativo-geral-distrito-neon.png`
    - `comparativo-feedback-combate.png`
    - `comparativo-souls-before-after.png`
- **Ponto de Recuperação:** `evidencias/recovery/BoyPunk-Web-pre-visual-quality-upgrade-20261028.tar.gz` (SHA-256: `aff0446812efc2f9a0b6332169b0f673ccc368f3c7c52d67d1eeb13c911a80db`).
- **Comandos para Inspeção Local:**
  - Jogo principal: `node tools/server.mjs` -> `http://127.0.0.1:47831/`
  - Prévia coop: `http://127.0.0.1:47831/?coop-preview=1`
  - Bônus: `http://127.0.0.1:47831/?bonus-preview=1`

---

## Fase 4A — fundação cooperativa local — 2026-10-28

Resultado: prévia jogável isolada implementada em
`http://127.0.0.1:47831/?coop-preview=1`. Ela usa Distrito Neon, normal 4/4,
BoyPunk P1, Nilo P2, viewport 480×270 e um único loop de simulação. Não existe
entrada no menu normal nem escrita de progressão, bônus, score ou unlock.

Entregas principais: jogadores independentes sem bloqueio/friendly fire; dois
layouts de device com ownership transitório; targeting determinístico somente
de vivos e aim lock; projéteis com owner; cargas de alma individuais e meta
comum; derrota parcial com drop alcançável; derrota/vitória únicas com perda
prioritária em empate; cura própria por Nilo; lobby, HUD, pausa, desconexão,
reatribuição, resultado e retry sem reload. Rajada Dupla está desativada por
configuração da sessão até integração por jogador.

QA: baseline 25/25; focados 11/11; final `npm run check` aprovado e `npm test`
26/26. O bundle temporário de diagnóstico compilou 18 módulos; nenhum build ou
release foi criado. O HTML studio 0.2.7 mantém SHA-256
`ab77f0de9724b1ff053adbc04708e28361a19941038c891f2c9bd3e546156503`.
Browser/hardware não foram observados: o sandbox recusou socket local. Os pads
automatizados são mocks da Gamepad API.

Handoff completo: `PASSAGEM_COOP_PARA_CODEX.md`. Próximos marcos não iniciados:
cura de aliado, balanceamento coop, progressão de campanha, Rajada Dupla por
jogador e bônus cooperativo.

---

## Entrega de estúdio 0.2.7 — revisão final — 2026-10-28

### Resultado

Nenhum defeito release-blocking foi confirmado. Nilo, Cura Própria, Rajada
Dupla, patrol-shooter, colisões, dificuldades, controles, saves e isolamento de
campanha/bônus/survival/demo/previews foram preservados. O debug normal continua
desligado e só é ativado por rotas explícitas de teste/prévia.

O usuário informou ter observado na versão de desenvolvimento: Nilo com arte
original e nome correto; normal com jogador/altar 4/4; movimento, facing, salto
e ataque nos dois sentidos; cura de exatamente +1 após dano e recarga. Estas são
observações do usuário, não execução desta revisão.

### Contratos revisados

- 21 sprites 64×96 de Nilo, retrato 32×32 e quatro VFX 32×32 existem e estão no
  manifesto; fallback defensivo de BoyPunk continua presente.
- Facing mantém o pivô X=16. Flash visual: `(x+28,y+16)` / `(x-8,y+16)`;
  origem física 8×8: `(x+54,y+16)` / `(x-10,y+16)`. A distância histórica não
  foi alterada sem evidência de bloqueio.
- Cura: campanha apenas, +1 com clamp, 20 s ativos, vida cheia não consome,
  terminalidade precede cura. Pausa/foco congelam; derrota, vitória, menu,
  retry e cenas limpam estado temporário.
- Rajada Dupla usa ambos os personagens; bônus, demo, survival e previews não
  recebem efeito ou recompensa temporária. Preferências antigas de personagem
  e gamepad continuam com fallback compatível.

### Build e verificação

- Versão: 0.2.7.
- Arquivo: `studio-builds/BoyPunk-Studio-v0.2.7.html`.
- Tamanho: 8.417.200 bytes.
- SHA-256: `ab77f0de9724b1ff053adbc04708e28361a19941038c891f2c9bd3e546156503`.
- Cópia isolada em `/tmp/boypunk-studio-0.2.7-ry9KPE/`: `cmp` e SHA-256
  idênticos; script inline compila; 17 módulos e 138 assets incorporados; sem
  script, CSS, import, CDN, fetch local obrigatório ou service worker externo.
- Automatizado: baseline `npm run check` aprovado e `npm test` 25/25; focados
  5/5; verificador estático aprovado no original e na cópia.
- Runtime standalone: pendente. Chrome CDP não criou `DevToolsActivePort`,
  Chrome direto foi bloqueado em `setsockopt`, e Firefox/Snap não gerou captura.
  Não se alteraram políticas de segurança. Não há alegação de Windows, mobile,
  áudio, controle físico ou duplo clique testados nesta revisão.

Checkpoint pré-edição: `evidencias/recovery/BoyPunk-Web-pre-final-studio-integration-20261028.tar.gz`,
SHA-256 `ca76d0bfae8d2218772cf3c543d8455b227e2ae471cce24a9ffe7c710f626d4c`.

---

## Fase 3B — Arte Original e Animação de Nilo (Android Healer) — 2026-10-28

### Estado e escopo

A entrega de arte original e animação completa de Nilo (ID técnico `support`) foi concluída por Antigravity.
Nilo agora possui silhueta, corpo, cabeçote, armadura e equipamentos 100% originais em pixel-art atompunk/nanopunk, sem qualquer dependência de recoloração ou máscara sobre BoyPunk.

- **Ponto de recuperação pré-arte:** `evidencias/recovery/BoyPunk-Web-pre-nilo-art-integration-20261028.tar.gz`, SHA-256 `d1ce2703b4ce7955b291ca725cb9ee55c52a49af108735ab9315790856e8cd05`.
- **Baseline final:** `npm run check` 100% limpo e `npm test` aprovado com 230 testes em 25 arquivos.
- **Preservação rigorosa:** Nenhuma física, hitbox, cadência, dano, save, build portátil ou release foi alterado.

### Criação artística e cinemática

- **Direção de Arte:** Armadura arredondada em marfim quente (`#f4eee2`, `#fffdf8`) sobre chassis mecânico de grafite escuro (`#303644`, `#181c26`); cabeçote robótico com aleta occipital e visor horizontal de sensores em âmbar quente (`#ffb428`, `#eb7c12`); reator atômico circular compacto no peitoral em mint/ciano (`#2ee6a8`); cilindro dorsal de nano-fluido e módulo de nano-reparo integrado ao antebraço.
- **Locomoção Articulada:** Ciclo de 4 quadros (`walk.0..3` a 12 fps) com cinemática de passada real (contato com calcanhar, levantamento de joelho com vão livre do solo a Y=60 na passagem, impulsão com ponta do pé e contra-balanço dos braços). Sem deslizamento de corte estático.
- **Alinhamento de Arma e Muzzle:** Módulo de antebraço alinhado estritamente com o ponto de emissão visual do renderer em `(33, 48)` no canvas 64×96, coincidindo com `(player.x + 28, player.y + 16)` à direita e `(player.x - 8, player.y + 16)` à esquerda.
- **21 Frames Obrigatórios Entregues:** `idle` (4 @ 5 fps), `walk` (4 @ 12 fps), `jump` (1), `fall` (1), `attack1` (4 @ 22 fps), `hurt` (3 @ 12 fps) e `die` (4 @ 10 fps). Mais retrato 32×32 e VFX de cura de 4 quadros (32×32).

### Integração de código e apresentação

- `src/assets.js`: Registro de `nilo.*` no manifesto de recursos; `nilo.idle.0` obrigatório; fallback para `player.*` mantido para segurança.
- `src/config.js`: `CHARACTERS.support.provisionalVisual` definido como `false`.
- `src/renderer.js`: Suporte a `nilo.heal.0..3` e exibição de "NILO" definitivo no HUD (sem `(PROV.)`).
- `tests/characters.test.mjs` & `tests/renderer.test.mjs`: Cobertura estendida com resolução direta dos 21 frames sem fallback e asserção de visual definitivo.

### Evidências e validação

- Evidências arquivadas em `evidencias/art/nilo/`:
  - `comparacao-boypunk-nilo-native.png` & `comparacao-boypunk-nilo-enlarged-4x.png`.
  - `folha-de-contato-nilo-21frames.png` (com overlay de colisor 22×32 e chão em Y=63).
  - `folha-de-contato-ambos-facings.png` (verificação de simetria nos dois lados).
  - WebPs/GIFs animados de locomoção, idle, ataque e cura.
  - 11 capturas runtime via Chrome CDP cobrindo todas as ações e os dois níveis da campanha.

---

## Fase 3A — revisão de integração e preparação de Nilo — 2026-10-28

### Estado recuperado

A seleção de personagens e o perfil `support` já estavam implementados por
Antigravity. Foram preservados Fase 1, patrol-shooter, Rajada Dupla com arte,
campanhas, controles e saves. O checkpoint desta revisão é
`evidencias/recovery/BoyPunk-Web-pre-phase3a-nilo-review-20261028.tar.gz`,
SHA-256 `a70531b33e4a356996912a2b40fe562045c05f8f4f32f30c26c80f82fe400509`.

O baseline anterior às correções passou em `npm run check` e 25/25 arquivos de
teste. A revisão não restaurou nem repetiu a entrega de power-ups.

### Integração concluída

- O ID estável continua `support`; o nome público provisório passou de Suporte
  para **Nilo** em pt-BR/en e na interface.
- Nilo conserva AABB 22×32, 150 px/s, saltos 310/285, Bola de Pulso e vida
  fácil/normal/difícil 6/4/3. O único tradeoff é cooldown 0,408 s, calculado uma
  vez a partir de `0,34×1,20`.
- Cura Própria permanece +1 PV, 20 s ativos, inicialmente descarregada, sem
  consumo em vida cheia e sem altar/ressurreição. O valor agora vem da
  configuração autoritativa, removendo o literal duplicado.
- Dano terminal continua anterior à cura. Derrota, vitória, menu, bônus e troca
  de cena removem habilidade/efeito; retry recria 20 s. Pausa, aba oculta e
  perda de foco congelam o tempo e limpam input mantido.
- O preview do patrol-shooter agora passa `characterId: boypunk` explicitamente;
  antes uma chamada após run de Nilo podia herdar `support` e disponibilizar
  cura no preview de desenvolvimento.
- Teclado Q, touch `✚`, LB/L1 padrão e remapeamento genérico permanecem no
  mesmo action lógico. Confirmação/transição bloqueia bordas até soltura.
- Preferência `boypunk-web-character-v1` foi centralizada em helpers testáveis.
  Ausência da chave em saves antigos, valor inválido ou storage bloqueado usa
  `boypunk` e preserva outras chaves.
- Rajada Dupla continua funcional nos dois perfis e isolada dos demais modos.

### Defeito visual corrigido e contrato de arte

Os PNGs atuais medem 64×96, com alpha até Y=63 e fronteira dos pés em Y=64.
O corpo ocupa a região local em torno de X=16, mas o facing esquerdo era
espelhado no centro do canvas X=32. Isso deslocava a aparência 32 px para longe
do colisor, embora a física estivesse correta. O renderer agora compensa
`renderX` em −32 px somente quando `facing < 0`, preservando o pivô corporal,
linha de chão e AABB.

Foi preparado o namespace `nilo.{state}.{frame}` com fallback automático para
`player.*`. Quando a arte original existir, o renderer a selecionará sem branch
de gameplay; enquanto não existe, BoyPunk com cruz/aura e `NILO (PROV.)`
continua sendo o fallback honesto.

`PASSAGEM_PERSONAGENS_PARA_ARTE.md` documenta os 21 frames, canvas/origem,
colisor local `(5,32,22,32)`, pivô X=16, ground line, facings, flash visual,
origem histórica do projétil, attack arc e hook `heal`. A encomenda é um android
curador original atompunk/nanopunk: marfim/grafite, visor âmbar, reator circular,
juntas mecânicas, módulo de nano-reparo e acentos mint/cyan contidos. Nenhuma
arte original de Nilo foi produzida ou alegada nesta etapa.

### Validação

Rodada focada: 7/7 arquivos aprovados (`characters`, `renderer`, `core`,
`powerups`, `gamepad`, `mobile-controls`, `collision-openings`). Final:
`npm run check` aprovado e `npm test` aprovado em 25/25 arquivos. Personagens
possui 17 cenários; renderer verifica namespace, fallback e alinhamento dos
dois facings.

Browser atual não pôde ser executado: não havia servidor ativo e `npm run dev`
retornou `listen EPERM 127.0.0.1:47831`. Nenhuma porta alternativa ou política
de segurança foi usada. As dez imagens anteriores continuam úteis para a
integração provisória anterior, mas não comprovam a correção atual de facing nem
arte original de Nilo.

Arquivos funcionais desta revisão: `src/config.js`, `src/core.js`,
`src/renderer.js`, `src/i18n.js`, `src/gamepad.js`, `src/main.js`, `index.html`,
`tests/characters.test.mjs` e `tests/renderer.test.mjs`. CSS, áudio, sprites,
níveis, progressão, builds e releases permaneceram inalterados.

---

## Fase 3A — Seleção de Personagens e Habilidade Suporte (Cura Própria) — 2026-10-28

### Catálogo e Atributos Resolvidos

Foi implementado um catálogo autoritativo e imutável `CHARACTERS` em `src/config.js` com identificadores estáveis:
- `boypunk`: Protagonista original e baseline de gameplay intacto (cadência de 0,34 s, colisor 22×32, projéteis 8×8 a 330 px/s, vida 4 em fácil/normal e 3 em difícil, mobilidade 150 px/s).
- `support`: Nome provisório "Suporte" ("Support" em en). Mesmos atributos físicos, de mobilidade, projéteis e vida máxima. Cadência normal de ataque com multiplicador de 1,20x aplicado exatamente uma vez (`0,34 s * 1,20 = 0,408 s`). Possui a habilidade ativa "Cura Própria".

Ambos os perfis são desbloqueados e disponíveis imediatamente. A resolução de perfil e dificuldade é feita em caminho único (`resolveCharacter(characterId, playerMaxLife)`), sem mutação de objetos globais.

### Regras da Habilidade de Auto-Cura

- Restauração: Recupera exatamente 1 ponto de vida da jogadora.
- Limite (clamp): Nunca ultrapassa a vida máxima do jogador definida pela dificuldade (`playerMaxLife`).
- Recarga: 20 segundos de gameplay ativo de campanha.
- Estado Inicial: Inicia cada nível de campanha e cada retry com a habilidade descarregada (20,0 s restantes).
- Tentativa em Vida Cheia: Operação nula; não recupera vida, não consome carga e não reinicia o relógio.
- Tentativa Durante Recarga: Operação nula ignorada silenciosamente.
- Sem efeitos secundários: Não cura o altar, não ressuscita, não concede imunidade a dano e não remove knockback. Sem mira em aliados.
- Relógio de Simulação: O tempo de recarga decrementa no loop de física fixa; pausa do jogo e aba oculta (`pageVisible = false`) congelam a recarga.
- Precedência de Dano Terminal: No loop de atualização, a resolução de desfecho terminal (`resolveTerminalOutcome()`) precede o processamento de habilidade (`tryActivateAbility()`), impedindo cura simultânea pós-morte.
- Fronteiras de Modo: Seleção e cura habilitadas exclusivamente na campanha (`district-neon` e `scrap-factory`). No Modo Bônus, o perfil escolhido é mantido para movimento e pontuação, mas a habilidade é desativada. Sobrevivência e Demonstração são restritas ao `boypunk`.
- Rajada Dupla: Totalmente funcional com ambos os perfis, disparando 2 projéteis com atraso de 0,12 s e respeitando a cadência individual de cada personagem (0,34 s no BoyPunk e 0,408 s no Suporte).

### Entrada, Navegação e Persistência

- Ação Lógica: O gameplay consome a ação lógica abstrata `ability` (`abilityPressed`, `abilityHeld`), desacoplada de hardware.
- Teclado: Tecla padrão **Q** (`KeyQ`), sem conflitos de movimentação ou ataque.
- Gamepad: Botão padrão **4** (LB / L1), com suporte completo no assistente guiado de remapeamento e validação defensiva de perfis legados salvos.
- Touch: Botão virtual dedicado `✚` com área de interação >= 44×44 CSS pixels (visual 48×48 px) no cluster de ações.
- Transições Limpas: `consumeTransitionInput()` invocado na largada para absorver bordas de confirmação do menu e evitar disparos acidentais ao surgir na fase.
- Persistência: Preferência de personagem salva em `localStorage` sob a chave `boypunk-web-character-v1`. IDs desconhecidos ou corrompidos revertem com segurança para `boypunk`. O estado temporário de recarga é efêmero e nunca persistido.

### Apresentação Visual e HUD

- Menu: Seletor compacto integrado ao painel principal do menu com botões alternáveis cyberpunk, sumário tático e tradeoff traduzidos em pt-BR e en.
- Identificação Provisória Honesta: Suporte reutiliza sprites base com uma insígnia tática de ombro `✚` (cruz médica 5×5 px em `#2ee6a8` e miolo `#fff5dc`) e sombra/aura `#2ee6a8`, claramente identificado no HUD como "SUPORTE (PROV.)".
- HUD sem Sobreposição: Medidor de recarga/prontidão posicionado abaixo da vida (`Y=73` quando Rajada Dupla está ativa, `Y=51` quando inativa), com largura 136 px e altura 18 px. Faixa de avisos (`bannerY`) ajustada dinamicamente para não colidir com os painéis.
- Feedback de Cura: Efeito visual procedural `heal` (aura radial concêntrica e `+1 VIDA` flutuante). Respeita `prefers-reduced-motion`. Nenhum novo áudio adicionado.
- Contrato de Arte: Especificações de spritesheet (21 frames em 64×96 px), âncoras de disparo `(X+6/-8, Y+16)` e alinhamento de colisor documentados em `PASSAGEM_PERSONAGENS_PARA_ARTE.md`.

### Validação e Evidências

- Checkpoint pré-implementação: `evidencias/recovery/BoyPunk-Web-pre-phase3a-characters-20261028.tar.gz` (`c23b6028c8b8dc49411243f29d023d8013c43222e8bb544175fb6aa75f53341c`).
- `npm run check`: Aprovado sem erros.
- `npm test`: **224 testes aprovados em 25 arquivos (zero falhas)**.
- Testes novos em `tests/characters.test.mjs` cobrindo 14 cenários cruciais de baseline, multiplicador 1.20x, clamp de cura, rejeição em vida cheia/recarga, congelamento em pausa/aba oculta, prioridade letal, Rajada Dupla em ambos os perfis, roteamento de entrada (Q/LB/Touch), transições e isolamento de modos.
- Evidências em navegador real Chrome CDP gravadas em `evidencias/art/characters/` (10 screenshots cobrindo menu, gameplay, recarga, prontidão, ativação, coexistência com Rajada Dupla, Fábrica de Sucata, BoyPunk baseline, pausa e controles touch mobile).

---

## Fase 2B — Rajada Dupla — 2026-10-28

### Regras e integração

Foi implementado o primeiro item de um registro pequeno `POWER_UPS`:
`double-burst`, nome público **Rajada Dupla**. A coleta dura 10 segundos de
gameplay ativo e cada ataque aceito nesse período gera dois projéteis, separados
por 0,12 s. O intervalo é menor que o cooldown normal de 0,34 s, então nenhum
valor solicitado precisou ser desviado.

O primeiro disparo mantém o contrato anterior. A direção e a presença do
efeito são capturadas na aceitação; a segunda Bola de Pulso usa a posição atual
da arma, mas a direção travada. Ambos mantêm corpo 8×8, 330 px/s, vida 1,25 s,
dano/recompensa, swept-AABB, bloqueio e alcance por lifetime. Há no máximo oito
projéteis do jogador; se a segunda emissão encontrar o cap, ela é descartada
uma vez e nunca reaparece depois.

Recoleta restaura exatamente 10 s sem acumular tiros, dano ou duração. Um burst
aceito antes da expiração pode terminar depois. Pause e aba oculta congelam
efeito, pickup e delay. Morte, vitória, menu, restart, survival, bônus e troca
de cena limpam tudo. Nenhum estado temporário foi incluído em saves,
progressão, recordes ou objetivos.

### Disponibilidade e apresentação

O trigger garantido e único por run é recuperar quatro almas
(`depositadas + carregadas`), ao sair da janela introdutória:

| Nível | Fase | Posição | Apoio |
|---|---|---:|---|
| Distrito Neon | `alerta` | `(180,160)` | sólido `x=144..304`, `y=176` |
| Fábrica de Sucata | `separacao` | `(372,160)` | one-way `x=352..464`, `y=176` |

O corpo é 16×16 e expira em 12 s ativos. A tentativa da run é então resolvida,
sem respawn repetido. As posições foram validadas contra mundo, sólidos, apoio,
altar, almas colocadas e prensa, e coletadas em simulação por movimento/salto
reais. Demo, survival, bônus e preview do patrulheiro ficam excluídos.

O pickup provisório é procedural, marcado por dois núcleos e `×2`; não depende
só de cor. O HUD localizado exibe `Rajada Dupla ×2` e décimos do relógio real,
com notice/efeito breve de coleta. Reduced motion remove o bob. Não foram
alterados CSS, arte, áudio ou botões; o SFX de coleta existente é reutilizado.
`PASSAGEM_POWERUPS_PARA_ANTIGRAVITY.md` especifica quatro frames opcionais
16×16, origem, linha de apoio e hooks.

### Validação e arquivos

`npm run check` passou. `npm test` passou em 24/24 arquivos; o novo
`tests/powerups.test.mjs` contém 14 cenários de baseline, rajada, delay,
cooldown, direção/origem, colisões independentes, expiração/refresh, spawn e
rotas, cap, pause/hidden, lifecycle, exclusões e renderer. Fase 1,
patrol-shooter, campanhas, bônus/canhão, demo, survival, dificuldade,
progressão e saves permaneceram verdes.

Funcionais alterados: `src/config.js`, `src/level-data.js`, `src/core.js`,
`src/renderer.js`, `src/i18n.js` e `src/main.js`; teste novo e documentação.
Checkpoint: `evidencias/recovery/BoyPunk-Web-pre-phase2b-double-burst-20261028.tar.gz`
(SHA-256 `80bbd55cddce3d8cbb967866de3c6adcce658fa19be06318ee1355393ac20e3b`).

Browser não foi observado. O launcher viu um PID efêmero, mas o health check
seguinte não; execução direta confirmou `listen EPERM 127.0.0.1:47831`. Não se
mudou segurança nem porta. Manual pendente: coletar nos dois níveis, verificar
dois tiros a 0,12 s durante giro/movimento, pausa, expiração e limpeza terminal.

Abrir com `/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh --no-open` e navegar
para `http://127.0.0.1:47831/`.

---

## Fase 2A — revisão visual e ativação do patrol-shooter — 2026-10-28

### Auditoria da entrega Antigravity

Foram confirmados 8 frames de patrulha, 4 de mira, 1 de disparo e 4 de
recuperação, todos PNG 32×32 RGBA com transparência. Os bounding boxes chegam à
linha de solo Y=31 em todos os quadros, sem deslocar o canvas/colisor. A folha
de contato e os pixels mostram passada alternada, flexão de joelho e fases de
contato/passagem/extensão; hashes distintos, isoladamente, não foram tratados
como prova de articulação.

A boca visível canônica é `(6,13)`. Como o sprite é desenhado em `body.x-8`,
isso coincide com `body.centerX-10`; espelhada, X=26 coincide com
`body.centerX+10`. Warning e projétil usam o mesmo cálculo. O recuo altera pixels,
não emissor nem colisor. O gerador procedural reproduziu os 25 arquivos
dedicados/aliases com hashes idênticos.

As capturas de Antigravity foram revisadas e mostram os estados pretendidos,
mas seu script força `phase`, `facing` e `animTime` para várias imagens; elas são
evidência visual staged. Não são declaradas como campanha normal observada pelo
Codex.

### Defeito corrigido

O estado lógico `fire` dura 1/120 s e podia desaparecer entre dois renders de
60 Hz. Uma simulação reproduziu `recovery` em todos os quadros observáveis,
apesar de existir exatamente um projétil. Foi acrescentado
`fireFeedbackSeconds: 0.08`, exclusivamente visual e acionado só depois de tiro
aceito. O frame de fire permanece perceptível, seguido pelos quatro quadros de
recovery no restante da janela original de recuo de 0,28 s. Nenhum timing de
gameplay, dano, cap, warning ou recovery foi ampliado e não há tiro adicional.

### Ativação e encontros

| Flag | Final |
|---|---|
| `campaignEnabled` | `true` |
| `survivalEnabled` | `false` |
| `demoEnabled` | `false` |

Substituição: um de cada dois slots ranged elegíveis, alternando torreta fixa e
`patrol-shooter`. Distrito Neon: `confronto` e `reta-final`. Fábrica de Sucata:
`compactacao` e `expedicao`. Fases introdutórias ficam intactas. Cada variante
custa 2; o cap compartilhado continua 2; não há spawn/evento extra. As seis
rotas declaradas permanecem validadas por apoio contínuo. Falha de rota usa uma
única torreta fixa e incrementa os contadores uma vez.

Velocidade 34 px/s, edge clearance 3 px, patrol mínimo 0,75 s, warning 0,90 s,
fire lógico 1/120 s, recovery 1,25 s, alcance 210 px, projétil 118 px/s e dano 1
foram preservados. Testes também confirmam dano no jogador e interceptação do
altar como alvos mutuamente exclusivos por projétil.

### Validação e arquivos

`npm run check` aprovado; `npm test` aprovado em 23/23 arquivos. Novas
regressões comportamentais cobrem elegibilidade, frequência, ambos os níveis,
apoio, fallback, counters/eventos, budget/cap, survival/demo, render a 60 Hz,
pausa, facings, dano e altar. A correção de colisão e o balanceamento da Fase 1
continuam verdes.

Alterados pelo Codex: `src/config.js`, `src/core.js`, `src/renderer.js`,
`tests/patrol-shooter.test.mjs`, `tests/renderer.test.mjs` e documentação. Arte,
CSS, áudio, controles, bônus, saves, progressão e distribuições não mudaram.

Browser próprio ficou bloqueado: o servidor direto retornou
`listen EPERM 127.0.0.1:47831`. Permanecem pendentes playtest humano da pressão
combinada e leitura do flash em hardware/display real.

Normal: `/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh --no-open`, abrir
`http://127.0.0.1:47831/`. Preview:
`http://127.0.0.1:47831/?patrol-shooter-preview=1`.

---

## Fase 2A — atirador móvel de patrulha — 2026-10-28

### Decisão de arquitetura e escopo

O inimigo de canto existente é `kind: "shooter"`: uma torreta montada 24×24,
imóvel, que seleciona o jogador, trava a mira no telegraph, usa projétil inimigo
compartilhado e aparece em campanha, survival e demo. Ele foi preservado. Os
assets `created/out` representam implantação/retração e não caminhada; por isso
a unidade móvel é o novo `kind: "patrol-shooter"`, sem atribuir marcha humanoide
à torreta fixa.

A lógica está pronta, mas a ativação de campanha está desligada até existir arte
de locomoção. Também está explicitamente excluída de survival e demo. O preview
localhost usa overlay de colisores e não salva progresso.

### Comportamento implementado

- Máquina `patrol → aim → fire → recovery → patrol` no update/fixed-step atual.
- Movimento somente em rotas com apoio conectado; validação de mundo, sólidos,
  bordas, spawn e ocupação. Reversão antes de perder apoio ou após parede.
- Jogador é o único alvo selecionado; lock no começo do warning de 0,90 s.
- LOS contra sólidos antes de avisar e antes de disparar. Warning não causa dano.
- Origem na boca `centroX ±10, y+13`; um projétil por compromisso. Negação por
  cap, cadência ou LOS entra em recovery, sem dívida de tiro.
- Projétil compartilhado mantém swept-AABB, dano único e bloqueio; pode atingir
  o altar se este cruzar a trajetória ao jogador.
- Seleção futura determinística substitui 1/2 dos slots ranged tardios, custo 2
  e teto ranged 2, sem expandir encontros. Fases iniciais ficam excluídas.

### Valores

| Parâmetro | Valor | Unidade/racional |
|---|---:|---|
| patrol speed | 34 | px/s; baixo frente ao jogador 150 e chaser 52 |
| edge clearance | 3 | px; probe antes da borda |
| patrulha mínima | 0,75 | s; evita tiro imediato no spawn |
| aim/warning | 0,90 | s; maior que 0,82 s da torreta fixa |
| fire | 1/120 | s; estado explícito, um tick fixo |
| recovery | 1,25 | s; janela legível sem aumentar dano |
| range | 210 | px; não cobre o mundo inteiro |
| projectile speed | 118 | px/s; preserva leitura da torreta |
| collider | 16×32 | px; apoio/pivô nos pés |
| damage | 1 | inalterado |

Impactos para derrota antes/depois permanecem: jogador e altar fácil 6/6,
normal 4/4, difícil 3/3. Multiplicadores de dificuldade não são reaplicados ao
tuning móvel.

Slots declarados: Distrito `district-ground-left`, `district-upper-left` e
`district-upper-right`; Fábrica `factory-ground-right`, `factory-mid-left` e
`factory-mid-right`. Como o flag está off, zero encontro atual foi alterado.

### Arquivos e validação

Funcionais: `src/config.js`, `src/level-data.js`, `src/core.js`, `src/main.js` e
`src/renderer.js`. Testes: novo `tests/patrol-shooter.test.mjs` e contrato visual
em `tests/renderer.test.mjs`. Documentos: `RETOMADA_BOYPUNK.md`,
`CONTINUIDADE_BOYPUNK_WEB.md`, este relatório e
`PASSAGEM_ATIRADOR_PARA_ANTIGRAVITY.md`. CSS, arte, áudio, HTML gerado, bônus e
distribuições não foram modificados.

A rodada focada passou. A primeira suíte integral detectou inserção do branch
visual no método errado (`drawBackground`); a origem foi corrigida sem afrouxar
o teste. Resultado final: `npm run check` aprovado e 23/23 arquivos de
`npm test` aprovados, incluindo Fase 1, bônus/canhão, ambos os níveis e os novos
contratos de lógica e apresentação.

Browser: observação pendente. A tentativa com o servidor correto encontrou
`listen EPERM 127.0.0.1:47831` no sandbox. Isso não é alegado como runtime. Para
abrir fora do sandbox:
`/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh --no-open`, depois
`http://127.0.0.1:47831/?patrol-shooter-preview=1`.

---

## Fase 1 — colisão e balanceamento da fonte 0.2.6 — 2026-10-28

### Colisão verificada

O local exato disponível nos dados e reproduzido foi o par de aberturas do
Distrito `x=80..144` e `x=304..368`, ao lado do sólido
`x=144..304, y=176..192`. Uma rota desde o spawn, com movimento e salto duplo,
mostrou que a saída vertical acima do platô precedia a entrada horizontal no
mesmo passo fixo. Mesmo assim, o eixo horizontal era resolvido primeiro,
zerando `vx` e deixando o colisor de 22×32 px 0,01 px fora do apoio. A rota
espelhada confirmou a mesma causa.

`src/core.js` agora calcula o tempo normalizado da entrada horizontal e da saída
vertical para contatos sólidos de canto. Só deixa de resolver a lateral quando
a saída vertical ocorre primeiro. Não houve alteração de geometria, tamanho do
jogador, salto, velocidade ou exceção por coordenada. O teste input-driven e o
teste temporal falharam antes da correção; depois, 4/4 casos passaram, incluindo
parede, face inferior, descida, pouso estável e dt de 1/120, 1/60, 1/30 e 0,05 s.

### Baseline autoritativo preservado

- Perseguidor: 52 px/s, dano 1, cooldown contra jogador 1,15 s; cooldown contra
  altar 1,70 s após o primeiro contato (inicial 1,40 s).
- Atirador: imóvel; dano 1; aviso 0,82 s; recuperação 1,35 s; intervalo global
  mínimo entre tiros 0,72 s; projétil 118 px/s; saída após 4 tiros.
- Distrito, limites globais fácil/normal/difícil: inimigos 4/5/7, projéteis
  10/12/16. Limites de inimigos por fase: 1-2-3-4 / 2-3-4-5 / 4-5-6-7.
- Fábrica, limites globais fácil/normal/difícil: inimigos 3/4/6, projéteis
  8/10/14. Limites de inimigos por fase: 1-2-3-3 / 2-3-4-4 / 4-5-6-6.
- Saúde e impactos para derrota jogador/altar: fácil 6/6, normal 4/4, difícil
  3/3, antes e depois. Nenhum dano foi aumentado.

### Tabela de tuning

Os valores fácil/normal/difícil abaixo já incluem exatamente uma aplicação dos
multiplicadores 1,25×/1,00×/0,75×.

| Parâmetro | Inimigo/modo | Anterior | Novo | Unidade | Razão |
|---|---|---:|---:|---|---|
| Distrito `alerta` spawn | todos / fácil-normal-difícil | 3,625 / 2,900 / 2,175 | 3,375 / 2,700 / 2,025 | s | pressão leve após introdução |
| Distrito `confronto` spawn | todos / fácil-normal-difícil | 3,188 / 2,550 / 1,913 | 2,875 / 2,300 / 1,725 | s | reduzir recuperação excessiva |
| Distrito `reta-final` spawn | todos / fácil-normal-difícil | 2,875 / 2,300 / 1,725 | 2,563 / 2,050 / 1,538 | s | final mais denso, ainda limitado |
| Fábrica `separacao` spawn | todos / fácil-normal-difícil | 4,000 / 3,200 / 2,400 | 3,750 / 3,000 / 2,250 | s | entrada gradual do atirador |
| Fábrica `compactacao` spawn | todos / fácil-normal-difícil | 3,688 / 2,950 / 2,213 | 3,313 / 2,650 / 1,988 | s | pressão combinada legível |
| Fábrica `expedicao` spawn | todos / fácil-normal-difícil | 3,438 / 2,750 / 2,063 | 3,063 / 2,450 / 1,838 | s | reta final mais ativa |

As fases introdutórias permanecem 3,25 s no Distrito e 3,45 s na Fábrica; os
delays iniciais continuam 4,5/5,5 s no normal. Spawns, warnings, velocidades,
danos, orçamentos e caps permanecem iguais. Em 30 s determinísticos, retendo
cada inimigo por 4 s, as médias pós-introdução do normal passaram de
1,36/1,53/1,68 para 1,44/1,68/1,88 no Distrito e de 1,24/1,33/1,42 para
1,30/1,47/1,58 na Fábrica. Isso mede pressão simulada, não diversão humana.

### Verificação e limites

Arquivos funcionais alterados: `src/core.js`, `src/config.js` e
`src/level-data.js`. Testes novos: `tests/collision-openings.test.mjs` e
`tests/balance.test.mjs`. Documentação atualizada: `RETOMADA_BOYPUNK.md`,
`CONTINUIDADE_BOYPUNK_WEB.md` e este relatório. Nenhuma distribuição foi criada.

`npm run check` passou; `npm test` aprovou 22/22 arquivos. A suíte cobre combate,
dano, altar, derrotas/retry, pausa/entrada, ambos os níveis, demo, bônus, canhão,
save e progressão. A Câmara permanece em 20 s, 30 almas, −1 s por acerto válido,
sem dano/knockback e com um projétil ativo.

Não houve observação em browser nesta rodada. O servidor direto falhou com
`listen EPERM 127.0.0.1:47831` e Chrome não criou `DevToolsActivePort`. Portanto
travessia visual, sensação de dificuldade e hardware real continuam pendentes.
Comando de desenvolvimento:
`/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh`.

---

## Empacotamento standalone para estúdio — 0.2.3

Entregável gerado em `studio-builds/BoyPunk-Studio-v0.2.3.html`, com 6.339.746
bytes e SHA-256
`d54d24f88e1248d5c673e64b09c40e51c4d6e2ab7e5588b3bc02202f1020f62c`.
O build reutilizou `tools/build-portable.mjs`, incorporou os 16 módulos atuais
(inclusive gamepad), estilos, fonte, imagens e áudio em um único HTML. Não há
ZIP, service worker, instalação ou servidor requerido.

Uma cópia em diretório temporário produziu o mesmo hash. Inspeção estática:
77 recursos data URL, todos os 75 assets únicos do manifesto presentes, nenhum
atributo/CSS externo, script inline compilável e versão 0.2.3 confirmada. Checks
da fonte: 146/146 testes e sintaxe aprovados.

Status honesto: **artefato gerado, runtime pendente**. Chrome/CDP não criou
`DevToolsActivePort`; Chrome direto foi bloqueado por `setsockopt`/Crashpad e
Firefox Snap por AppArmor/snapd. Não foram observados em browser real menu,
gameplay, áudio, pausa, derrota/retry, bônus ou controle, nem a ausência de rede
em runtime. Releases 0.2.0–0.2.2 e o portátil histórico não foram modificados.

## Entrega de gamepad — fonte 0.2.3-studio.20261026

Foi implementado suporte amplo pela Gamepad API nativa sem dependências. O
provedor novo fica associado exclusivamente ao slot 1 e preserva o contrato de
ações da simulação. Controles standard recebem mapa fixo coerente com a API;
genéricos têm seleção, leitura ao vivo, remapeamento guiado/individual, eixos,
inversão, zona morta e restauração em Opções. Dois dispositivos nunca são
fundidos no mesmo jogador.

O ciclo de vida cobre dispositivo já conectado, hotplug, remoção, índices
esparsos/reutilizados, perda de foco, página oculta e inputs mantidos. Menus,
pausa, resultados, retry, nível e bônus são navegáveis; demo é encerrada por uma
ação deliberada sem propagá-la. Desconexão ativa limpa ações e pausa a partida.

A chave separada `boypunk-web-gamepad-v1` armazena perfis por identidade estável
sem índice. O export passa a `boypunk-web-save-transfer-v2`; arquivos v1 seguem
compatíveis e não apagam controle. A progressão v1, recordes, áudio e gameplay
não mudaram.

Arquivos principais: novo `src/gamepad.js`; alterações em `src/input.js`,
`src/main.js`, `src/save-transfer.js`, `index.html`, `styles.css`,
`tools/build-portable.mjs`, `tools/browser-test.mjs`, `package.json`; novo
`tests/gamepad.test.mjs` e ampliação dos testes de save/estúdio.

Validação: `npm run check` aprovado; **146/146 testes** aprovados. Os controles
dos testes são mocks. Nenhum hardware USB, sistema operacional ou navegador real
foi qualificado nesta sessão; os launchers normal e bônus foram tentados, mas o
bind loopback continuou bloqueado por `EPERM` e nenhum servidor ficou ativo.
Não houve build, distribuição, publicação ou multiplayer. Checkpoint:
`evidencias/recovery/BoyPunk-Web-pre-gamepad-20261026.tar.gz`, SHA-256
`936f0a695293f239d853513ad6b054aa67785aa6d5ed414fdb9e917c45391ba2`.

## Marco de prontidão funcional para estúdio — 2026-10-26

Sem redesign, foram fechadas as lacunas confirmadas de preparação de teste:
identificador então usado, `0.2.2-studio.20261026`, visível no menu; save transfer com rótulos
portugueses e rejeição sem escrita de arquivo inválido; instrução touch própria;
volume com alvo de 44 px; cobertura de três toques simultâneos; e normalização
completa do modelo ao retornar do bônus da Fábrica para o menu.

Os fluxos automatizados adicionais exercitam qualificação e não qualificação,
skip único, Distrito → bônus → Fábrica, Fábrica → bônus → menu, timeout/pausa e
cleanup sem evento ou áudio duplicado. Coberturas existentes continuam validando
morte do jogador, altar destruído, retry da fase correta, canhão, descida,
focus/visibility, demo e preview sem recompensas.

Os launchers normal e da prévia tentaram `127.0.0.1:47831`, mas o sandbox
retornou `EPERM`; o status final confirmou que não ficou servidor ativo.
Portanto browser atual, migração do save real e aparelho físico continuam
pendentes. Nenhuma porta alternativa, exposição de rede, build ou release foi
usada. O checklist manual e a migração exata estão em `RETOMADA_BOYPUNK.md`;
modelo de relato em `packaging/MODELO-DE-FEEDBACK.txt` e `README.md`.

Automação final desta fonte: `npm run check` aprovado, **129/129 testes**
aprovados e rota física 30/30 em 17,408 s. Esses resultados não são apresentados
como compatibilidade universal ou teste humano de dificuldade.

## Entrega integrada de 2026-10-26

Implementados e verificados: layout v3 da Câmara com descida praticável; canhão
fixo justo de −1 s; painel principal centralizado; correções touch/multiponteiro;
origem local estável configurada em `127.0.0.1:47831`; exportação/importação
restrita aos dois saves BoyPunk. A rota real completou 30/30 em 17,408 s com o
canhão ativo e cinco disparos evadidos. O schema de progressão permanece v1;
importação une conclusões/desbloqueios e mantém máximos de recordes.

Arquivos funcionais alterados: `src/bonus.js`, `src/level-data.js`, `src/core.js`,
`src/renderer.js`, `src/main.js`, `src/input.js`, `src/audio.js`,
`src/progression.js`, novo `src/save-transfer.js`, `index.html`, `styles.css`,
`configuracao-servidor.sh`, `iniciar-jogo.sh`, `abrir-bonus.sh`,
`tools/server.mjs`, `tools/measure-bonus-route.mjs`, `tools/build-portable.mjs`,
`package.json` e testes focados. Não houve build, release ou publicação.

Automação: `npm run check` aprovado; 129/129 testes nomeados aprovados. Browser:
há evidência headless anterior da árvore v3, mas esta revisão final não abriu o
servidor porque o sandbox retornou `EPERM` em `127.0.0.1:47831`; migração real e
inspeção visual final estão pendentes no host. iOS/Android físico não testado.
Detalhes e comandos estão em `RETOMADA_BOYPUNK.md` e
`PASSAGEM_BONUS_PARA_ANTIGRAVITY.md`.

Data: 2026-10-22. Projeto: `/home/flow/Projetos/BoyPunk-Web`.

## Resultado

Corrigidos e testados o rastreio de dano, bloqueio/acerto de projéteis e fluxo
derrota → Game Over → Tentar novamente. Implementação continua independente do
Construct. Os projetos-fonte originais e a release `v0.2.0.zip` não foram
alterados. Ponto de recuperação anterior à edição:
`/home/flow/Projetos/Backups/BoyPunk-Web/BoyPunk-Web-v0.2.0-pre-combate-20261022.tar.gz`
(SHA-256 `dafe9c9b0b2a4ea2bcfff612a6734c10ea05a83e25e321a8dbdb04973bfbdc3c`).

## Investigação dos relatos

1. **Travamento após morte:** não foi reproduzido no fluxo HTTP. Foi encontrado
   um risco real de ordem: a rotina de dano encerrava a partida imediatamente,
   antes da resolução única de fim do passo. Agora os dois alvos podem registrar
   impactos ocorridos no passo, e só então há uma única transição terminal. Cinco
   derrotas por contato seguidas de cinco cliques em Tentar novamente, mais Menu
   e nova partida, passaram no navegador. Isto corrige a fragilidade observada,
   mas não prova que fosse a única causa do relato original.
2. **Vida perdida sem ataque visível:** confirmado: o perseguidor danificava por
   sobreposição com cooldown, mas era desenhado sempre andando. Agora muda para a
   pose de ataque, exibe “GOLPE” e gera feedback de dano. A trilha de diagnóstico
   identifica origem, atacante/projétil, retângulos e vida antes/depois, mas só
   é armazenada/logada em modo debug (`?debug=1`; o harness `?test=1` ativa debug).
3. **Tiros aparentemente errados:** reprodução no Chrome mostrou tiro iniciado
   durante salto cuja origem visual se sobrepunha ao colisor da plataforma
   central. O tiro era removido pelo cenário sem aviso. Agora há varredura
   contínua, colisão relativa a inimigos móveis, parede prioritária e aviso
   “BLOQUEADO”. Tiros alinhados acertam em ambas as direções; tiros que passam
   acima/abaixo não acertam artificialmente. Não foi ampliada hitbox.

O dano terminal diferencia “Você foi derrotado” de “Altar destruído”; os testes
confirmam destruição do altar com personagem vivo, derrota do jogador com altar
intacto e dano simultâneo com apenas uma transição. Contato respeita cooldown,
invulnerabilidade e pausa. Não foi introduzido dano por inatividade.

## Arquivos alterados

- `src/core.js`: colisão varrida, IDs/causas de dano, rotina central, feedback de
  bloqueio, resolução terminal única e razões distintas;
- `src/renderer.js`: pose de ataque do perseguidor, projéteis legíveis e caixas de
  colisão opcionais exclusivamente em debug;
- `src/main.js`: tratamento explícito de falhas e ganchos de teste apenas quando
  `?test=1` está presente;
- `tests/core.test.mjs`: 20 testes cobrindo impactos, parede, direção, alturas,
  invulnerabilidade, alvo terminal, pausa e ciclos de reinício;
- `tools/browser-test.mjs`: entrada por teclado, Game Over e cinco fluxos completos
  de reinício pela interface;
- `package.json`, `health.json`, `README.md`, este relatório, continuidade e
  relatório de testes do pacote: versão `0.2.1` e evidências.

Meta de almas permanece 15, da fonte única `BALANCE.objective.soulsGoal` em
`src/config.js`.

## Testes e evidências

### Estáticos e simulações automatizadas

- `npm run check`: aprovado;
- `npm test`: 20/20 aprovados;
- simulação lógica de tiro contra alvo parado e móvel nas duas direções; tiro
  rápido; bloqueio por parede antes do alvo; discrepância vertical; dano por
  contato e projétil; ausência de dano sem colisão; invulnerabilidade e pausa;
  derrota isolada de jogador/altar; danos simultâneos e cinco ciclos completos;
- a lógica de vitória por depósito continua coberta por teste de coleta/deposito
  até 15 almas; o teste põe o jogador na área de depósito e aciona a interação.

### Navegador real, HTTP

Chrome headless Linux carregou a versão do projeto via HTTP em
`http://127.0.0.1:45235/`. Aprovados: recursos, Canvas, teclado, movimento,
salto duplo, ataque e aviso de tiro bloqueado, pausa/retomada e perda de foco
com limpeza de teclas, cinco derrotas de
contato, cinco reinícios via botão, Menu e nova partida, volume/mudo, trilha e
console sem exceções/rejeições/avisos severos. A versão HTTP foi separada do
artefato portátil.

A tentativa adicional de iniciar servidor destacado pelo `iniciar-jogo.sh` neste
shell gerenciado falhou com `EPERM` ao abrir o socket local (restrição de
execução da sessão). O servidor iniciado pelo runner HTTP autorizado funcionou;
nenhum serviço alheio foi encerrado. Por isso, a abertura manual por
`xdg-open` nesta sandbox não foi confirmada visualmente, embora o Chrome headless
tenha aberto e exercitado a URL acima.

Os cenários de tiro contra inimigos parados/móveis e dano no altar são testes da
simulação do modelo, não interação manual de um jogador. A morte do navegador é
causada por perseguidor de teste colocado sobre o personagem, que em seguida
usa a rotina real de física/dano/transição. Nenhum estado terminal é atribuído
diretamente.

### Limites ainda pendentes

A validação humana da música/jogabilidade, outro navegador, Windows/macOS e
aparelho móvel não foi feita. Console e capturas são automação headless Linux,
não avaliação auditiva/humana. Recursos carregados no arquivo portátil foram
testados no Chrome Linux; não se promete compatibilidade universal.

## Release anterior e novo pacote

`releases/BoyPunk-Web-v0.2.0.zip` foi preservado. Nova release:
`/home/flow/Projetos/BoyPunk-Web/releases/BoyPunk-Web-v0.2.1.zip`, aprox. 6,1
MiB; o SHA-256 exato está no sidecar `.zip.sha256`. O ZIP foi extraído numa pasta
temporária fora do projeto; Chrome abriu
`BoyPunk-Web-v0.2.1/JOGAR.html` por `file://`. Passaram as 22 asserções da
automação e não houve requisição externa/localhost. O diretório
`/home/flow/Distribuicoes/BoyPunk/` continua fora da raiz gravável da sessão;
nenhuma cópia para lá foi tentada/declarada.

Desenvolvimento: `npm run check`, `npm test`, `npm run dev`; launcher local:
`/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh`.

Créditos preservados: Cluster Digital; OPJ STUDIO; GONZAGA PRODUÇÕES; B&T
Company; Desenvolvedor: Renan Santos.

## Investigação do relato do altar no canto inferior direito

**Causa confirmada; não é bug de hitbox do jogador.** Foi reproduzido com o
personagem em 2 HP no canto inferior direito e uma torre cuja mira havia sido
travada no centro inferior durante o telegraph. Ao mudar de posição, o jogador
evita a linha final, mas ela cruza a parte inferior do altar. Origem do tiro:
`(32,152)`, velocidade `(107.95,47.66) px/s`; primeira colisão no altar em
`(200,226.18)` após aproximadamente `1.558 s`. O retângulo do tiro é 8×8; altar
`(208,192,32,48)`. O diagnóstico agora mantém a posição de origem, segmento de
impacto, fração no passo, tempo de voo, velocidade, IDs e retângulos.

O projétil passa por baixo da plataforma sólida central, cujo limite inferior é
`y=192`; ao chegar à faixa dela, o topo do projétil já está abaixo disso. Um
disparo mirando o canto diretamente foi testado e bloqueado pela plataforma.
O telegraph é visual: só o projétil realmente criado pode aplicar dano. Cada
impacto remove a entidade e aplica exatamente um ponto; a invulnerabilidade do
altar de 1,2 s é respeitada. Três ataques reproduzidos encerram com motivo
“Altar destruído”, altar em zero e personagem ainda em 2 HP. Entidades removidas
e projéteis residuais de execução anterior não causaram dano nos testes.

Mudanças de código não lançadas: flash vermelho e texto no impacto; alerta HUD
persistente em um ponto restante; aviso sonoro sintetizado em Web Audio com
volume/mudo; instrução inicial esclarecendo que a vida de BoyPunk ou o altar em
zero encerra a partida. Os testes passaram em sintaxe, 24 casos de lógica e
Chrome headless HTTP (`http://127.0.0.1:38211/`, 22 asserções). Não houve captura
visual do cenário fatal específico em navegador; a reprodução detalhada foi
simulação do modelo real com debug. Os 3 releases existentes foram preservados;
nenhum pacote foi gerado nesta execução. A razão para a vida já estar em 2 no
relato não é conhecida, pois a reprodução começou com esse estado de vida.

## Republicação de equipe — 0.2.2

Esta versão altera somente número da versão e documentação do pacote, sem
mudança de gameplay. A distinção automatizada entre derrota do personagem e
“Altar destruído” continua coberta; falta avaliação humana da legibilidade do
caso do altar durante uma partida.

Build portátil e ZIP 0.2.2 foram gerados; `unzip -t` aprovou e os releases
0.2.0/0.2.1 mantiveram seus hashes. O ZIP foi extraído em `/tmp`. A validação
automatizada do `file://` não iniciou porque Chrome headless não criou
`DevToolsActivePort`; Firefox headless também não concluiu no sandbox. Assim, a
release 0.2.2 não tem confirmação de abertura em navegador nesta sessão. A
última rodada file:// completa foi 0.2.1, com 22 asserções.

## Auditoria de animações — 2026-10-23

### Relato e causas

O caso de inimigos deslizando congelados **não foi reproduzido na fonte atual**.
O perseguidor já tinha registro de oito quadros e seleção de índice no renderer;
o player tinha quatro quadros de andar. A auditoria visual confirmou que as poses
do chaser walk 16×32 e player walk 64×96 são distintas. A causa original do
relato continua sem confirmação. A nota anterior que dizia existir apenas um
quadro do perseguidor ficou obsoleta após a entrega visual; os GIFs
`in_game_gameplay_locomotion.gif` e `in_game_chaser_crop.gif` são de um quadro e
não servem como gravação de movimento.

Havia uma inconsistência técnica independente: clocks não uniformes por entidade
e estado (chaser dependia de limiar de velocidade/chão; outros estados e o player
usavam o tempo global de renderização). Isso podia iniciar poses no meio do ciclo
e criava transições inconsistentes, mas não prova isoladamente o congelamento.
Cache ou execução de versão anterior permanece hipótese não confirmada.

### Correções realizadas

- `src/animation.js`: estados e taxas compartilhados, seleção conforme movimento
  real e clock por entidade em segundos, reset somente na transição;
- `src/core.js`: player e chaser avançam clocks pelo `dt` da simulação; pausa
  congela, retomada continua e reinício cria estado limpo;
- `src/renderer.js`: seleção dos quadros por clock local, preservando facing,
  origens e apresentação do ataque; fallback para quadros únicos registrados como
  `chaser.attack` e `chaser.jump` corrigido;
- `src/main.js`: amostras de ID/estado/frame/asset/facing/clock só em teste/debug;
- `tools/build-portable.mjs`: nova ordem de módulo para builds futuros. O build não
  foi executado e releases/`dist-portable/JOGAR.html` não foram tocados;
- `tests/animation.test.mjs`, `tools/browser-test.mjs`, `tools/server.mjs`: testes
  de clock, transição, pausa/reinício, dois inimigos e evidência em pasta nova.

Player walk usa 12 fps com quatro poses. Seu ataque visual usa 22 fps para
percorrer quatro poses dentro dos 0,18 s já existentes; duração, cooldown,
projétil/dano, IA, velocidade, saúde, colisores, áudio e balanceamento não mudaram.
README e continuidade também foram atualizados.

Ponto de recuperação anterior às edições:
`/home/flow/Projetos/Backups/BoyPunk-Web/BoyPunk-Web-pre-enemy-animation-debug-20261023.tar.gz`
(SHA-256 `ae8a3b53145a90dae732514f7e6c0b1285b13649e7ce8fc89aa3b91925781a1`).

### Testes e evidência

- `npm run check`: aprovado; `npm test`: aprovado (novos testes de clock/estado e
  testes existentes de combate);
- Chrome headless Linux em HTTP, com raiz atual sem cache, passou 27/27 asserções
  em `http://127.0.0.1:33905/`; verificou frames walk reais em dois perseguidores,
  facing opostos, clocks independentes, pausa congelando ambos, player andando nos
  dois sentidos (quatro índices de frame em cada sentido), recursos, movimento,
  salto/ataque, áudio e cinco ciclos completos de derrota/reinício. Sem falhas de
  recursos nem erros/warnings graves;
- screenshots timestamped com overlay debug e log em
  `evidencias/runtime-animation-20261023-complete/`. São capturas reais estáticas,
  não vídeo nem avaliação humana da qualidade da passada;
- tentativas anteriores encontraram `bind EPERM` e uma fixture que alterava a
  posição de tiro; ambas foram corrigidas, e a execução acima passou por completo;
- não houve playtest humano, outro navegador, Windows, macOS ou mobile.

### Pendências visuais para Antigravity

- chaser attack foi resolvido posteriormente: quatro poses distintas, incluindo
  o novo `attack-002`, estão integradas e verificadas no renderer;
- chaser jump está incompleto: apenas `enemycaveira-jump-000.png` 16×32. Se
  desejada articulação, entregar `enemycaveira-jump-000..003.png` com dimensões,
  origem e facing iguais, 8–12 fps;
- `enemycaveira-dead-000.png` é uma pose; entidade é removida imediatamente,
  então não foi inventado estado de morte/retirada;
- turret é estacionária. Há cinco PNG `created` 16×32 registrados mas não usados,
  e cinco PNG `out` 16×32 não registrados; falta estado de entrada/saída;
- player jump/fall só têm uma pose. Os PNG `die` medem 64×32 versus 64×96 nos
  outros estados, e a seleção de morte não existe. Solicitar ao responsável
  visual esclarecimento/correção antes de integrar.

Para abrir o fonte atual: `/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh`.

## Relatório de retomada — 2026-10-23

### Resultado

A integração técnica de animação da fonte está funcional e não foi recriada.
Não há evidência atual de timer reiniciado a cada update, mapeamento errado ou
frame walk ausente: player e chaser têm clocks locais, transição com reset único,
pausa congelada e seleção pelo estado real. A caminhada do chaser possui oito
PNGs 16×32 únicos. O quadro `attack-002` foi substituído por uma pose distinta;
os quatro índices estão mapeados e foram observados no renderer em Chrome.

Foi acrescentado `tests/assets.test.mjs`, e `tests/animation.test.mjs` passou a
verificar os quatro índices do ataque. Não houve mudança em gameplay, física,
IA, dano, colisores, cadência, objetivo ou áudio.

### Configuração e pedidos históricos

- jogador: começa com 4 HP e máximo 4;
- altar: começa com integridade 4 e máximo 4;
- meta: 15 almas depositadas;
- alvo absoluto 4/4: aplicado uma vez em 2026-10-24 pela configuração central;
- attract/demo autônomo: não implementado e não foi criado nesta tarefa.

### Verificação

- `npm run check`: aprovado;
- `npm test`: 3/3 grupos aprovados;
- execução direta: 32/32 testes nomeados (3 assets, 5 animação, 24 gameplay);
- runtime Chrome atual: 29/29 asserções em
  `evidencias/runtime-health4-20261024/browser-test.json`, incluindo 4/4 no início
  e em cinco retries, HUD/instrução, walk/facing, pausa e ataque 0–3;

Os testes atuais cobrem coleta/depósito/vitória e dano/derrota de ambos os alvos
no modelo; o runtime cobre controles, animação de caminhada em ambos os sentidos,
pausa, foco, ataque, cinco derrotas/reinícios, menu e áudio. Permanecem sem
avaliação humana a clareza audiovisual, a qualidade subjetiva da passada e a
compatibilidade mobile/Windows/macOS.

### Preservação e distribuição

Checkpoint anterior às edições atuais:
`evidencias/recovery/BoyPunk-Web-pre-health4-integration-20261024.tar.gz`
(SHA-256 `2fe3ecb7ece2b5047b3626bca1f78b7f45ecf8631d4c609af1543399a382cffb`).
A raiz não possui Git funcional. Os hashes dos ZIPs 0.2.0, 0.2.1 e
0.2.2 e de `dist-portable/JOGAR.html` foram mantidos; nenhum build foi executado.
Todos esses artefatos são anteriores à integração/arte de animação de 23/10 e
estão desatualizados em relação à fonte.

Pendências de arte: player jump/fall com um quadro e die sem seletor ativo;
chaser jump/dead com um quadro; created/out da torreta sem máquina de estados.
Próxima tarefa concreta: playtest humano da fase 1 e, separadamente, priorização
dessas lacunas visuais. Para abrir a fonte atual:
`/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh`.

## Validação de saúde 4/4 e frame 002 — 2026-10-24

`src/config.js` é a fonte única dos máximos: jogador 4 e altar 4. O HUD deriva
os indicadores desses máximos, e a instrução do menu é preenchida pela mesma
configuração. `startRun()` e o botão de retry continuam criando estado novo, sem
valor residual.

O teste de navegador atual aprovou 29/29 asserções. O relatório registra quatro
danos até zero em cada um dos cinco ciclos e restauração 4/4 após cada retry. As
amostras do renderer registram `chaser.attack.0`, `.1`, `.2` e `.3` nos tempos
0/22, 1/22, 2/22 e 3/22. O novo frame 002 difere em 104 pixels do 001.

Os testes de modelo validam dano/invulnerabilidade, derrota do jogador, destruição
do altar, prioridade no dano simultâneo, coleta, depósito, vitória e cinco
reinícios. A derrota do altar/vitória não recebeu playtest humano nesta rodada.
Não houve alteração de IA, movimento, colisão, dano, timing, meta de 15 almas,
demo, fase ou release.

## Relatório de attract mode — 2026-10-25

### Resultado

Foi integrado um attract mode funcional sobre a fase 1 existente. Não há jogo
paralelo: a automação entrega ações ao mesmo fixed-step, física, colisões, dano,
inimigos, coleta, depósito, HUD, renderer, sprites e áudio usados pelo jogador.
O startup entra na demo após a carga; o menu oferece **Assistir demonstração** e
o relógio controlável entra depois de 120 s de inatividade visível.

O controlador determinístico percorre as plataformas, usa salto duplo, combate,
coleta almas e volta ao altar. Uma tentativa focal depositou 11 almas antes de
morrer; não há invencibilidade nem promessa de vitória. Derrota, vitória,
estagnação (24 s) ou limite (90 s) reiniciam após 2,4 s. Três falhas consecutivas
sem depósito retornam ao menu.

### Integração anterior e valores

A integração das animações de derrota já estava concluída. A regressão atual
confirma Game Over utilizável, inimigo morto sem dano funcional, limpeza de
restos e retry limpo. Player e altar permanecem, respectivamente, **4/4** e
**4/4**, vindos da configuração central; não foram incrementados.

### Entrada, isolamento e áudio

- Enter, Espaço, Esc, clique e toque saem da demo; a ação de saída é consumida e
  tecla mantida não vaza ao menu.
- Inatividade só avança no menu principal visível. Página oculta suspende demo e
  relógio e descarta delta acumulado ao voltar.
- Saída limpa controlador, entidades, projéteis, efeitos, restos e entrada. O
  próximo run recebe apenas input humano.
- A demo não persiste run, recorde, conquista ou progresso. Preferências de
  áudio são preservadas. Startup funciona sem áudio autorizado; depois do gesto,
  volume/mudo são respeitados e a fonte musical não duplica.

### Verificação

- `npm run check`: aprovado;
- `npm test`: 5 arquivos, 42 testes nomeados, todos aprovados;
- Chrome headless Linux/HTTP: 45/45 asserções aprovadas, zero eventos graves de
  console e zero assets ausentes;
- startup, entrada manual, idle 120 s, reset da espera por interação, bloqueio do
  idle durante run, consumo da saída, `localStorage`, recuperação terminal e
  cinco ciclos demo/menu/jogador/menu foram cobertos;
- evidência: `evidencias/runtime-attract-20261025/browser-test.json` e sequência
  `01-demo-startup.png`, `01-demo-sequence-1..4.png`;
- na amostra final da sequência (14 s de simulação): 3 inimigos derrotados,
  6 almas depositadas e jogador em rota elevada/descida de retorno.

Automação e observação de canvas foram feitas no Chrome headless; a sequência
usa avanço controlado do fixed-step dentro da página, não é vídeo em tempo real.
Não houve playtest humano, touch físico, troca manual de aba, avaliação auditiva,
outro SO/navegador ou build portátil.

### Preservação e arquivos

Checkpoint prévio:
`evidencias/recovery/BoyPunk-Web-pre-attract-mode-20261025.tar.gz`, SHA-256
`09e1fd50936108b260649b4b014c6085f75cd34cb0c0d312a133abcb4cac8a6d`.
Os 457 arquivos de releases/portátil mantiveram hashes idênticos. Não houve
release, publicação, distribuição nem fase 2.

Código/UI: `src/demo.js`, `src/main.js`, `src/core.js`, `src/config.js`,
`index.html`, `styles.css`. Teste/build futuro: `tests/demo.test.mjs`,
`tools/browser-test.mjs`, `tools/build-portable.mjs`, `package.json`. Documentos:
`README.md`, `CONTINUIDADE_BOYPUNK_WEB.md` e este relatório.

Limitação do controlador: lógica local reativa, específica para a geometria
atual; pode sofrer dano, falhar uma rota e morrer. A recuperação impede reset em
rajada e devolve ao menu após falha persistente.

Abrir o jogo de desenvolvimento atual:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```

## Marco de vitória e progressão — 2026-10-25

### Comportamento anterior

A fase já vencia ao depositar a meta, mas o estado mudava diretamente para a
tela “Distrito salvo!”, sem pausa visual, estatísticas finais ou save de níveis.
O tempo de simulação existente já excluía pausa. Áudio tinha troca segura de
faixas; attract mode já isolava seus runs. Player e altar já estavam em 4/4 e a
meta autoritativa já era 15; esses valores não foram alterados.

### Entrega

- Commit de vitória único em `victoryPresentation`, com bloqueio imediato de
  dano, combate, input e objetivo e resumo final imutável.
- Resposta ciano contida do altar por 0,85 s no fixed-step existente; 0,18 s com
  reduced motion. Depois, tela “Distrito Neon concluído!” com tempo ativo,
  15/15, vida e altar finais.
- Ações “Jogar novamente” e “Menu”; Enter e Esc têm rotas explícitas, toque usa
  os botões existentes e Space mantido não aciona a tela.
- Menu compacto mostra Distrito Neon disponível/concluído e Fábrica de Sucata
  bloqueada/desbloqueada, sempre “em desenvolvimento”. Nenhuma fase 2 foi criada.

### Save e identificadores

- armazenamento: `boypunk-web-progression-v1`;
- schema v1: `version`, `completedLevels`, `unlockedLevels`;
- IDs: `district-neon` e `scrap-factory`;
- vitória real completa o primeiro e desbloqueia o segundo;
- catálogo mantém `scrap-factory.available = false`, independente do unlock;
- operação repetida é idempotente; demo, preview `?test=1` e falha não salvam;
- bloqueio/quota mantém progressão em sessão com aviso; JSON malformado é
  ignorado com segurança; versão futura não é sobrescrita; chaves alheias e save
  de áudio permanecem separados.

### Verificação separada

**Estática:** `npm run check` aprovado; valores confirmados: player 4/4, altar
4/4, meta 15.

**Automatizada:** 54 testes nomeados em 6 arquivos. Cobertura de terminal único,
valores congelados, pausa, precedência jogador→altar→vitória, reduced motion,
limpeza, schema/reload/idempotência, storage indisponível/malformado/futuro e
vitória real de demo sem progressão.

**Browser/runtime:** Chrome headless HTTP aprovou 58/58 asserções, sem recurso
ausente ou console grave. A UI real mostrou 00:03.2, 15/15, 4/4 e 4/4; unlock
persistiu após reload. Três ciclos adicionais mantiveram tempos próprios,
retries 4/4 limpos e zero fonte musical duplicada. Capturas:
`evidencias/runtime-victory-progression-20261025/08-victory-altar-response.png`
e `09-victory-screen.png`; relatório completo `browser-test.json` na mesma pasta.

**Pendente humano:** avaliação estética/auditiva, toque físico, mobile real,
outro navegador e Windows/macOS. A resposta do altar usa renderer/CSS atuais;
não foi criada nova arte específica de vitória.

### Preservação e continuidade

Checkpoint:
`evidencias/recovery/BoyPunk-Web-pre-victory-progression-20261025.tar.gz`, SHA-256
`23c893a55432ffb215df7f0c32a03e75c21dadc6b996dc9a7a6d0bc38052e2af`.
Releases e portátil permaneceram preservados; nenhum pacote ou publicação foi
gerado. Créditos e avisos de terceiros não mudaram.

Integração da futura Fábrica de Sucata: reutilizar `scrap-factory`, manter unlock
como requisito e disponibilidade como flag separada, registrar conclusão pelo
mesmo store e adicionar migração somente se o schema precisar mudar.

Abrir o desenvolvimento atual:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```

## Marco Fábrica de Sucata — 2026-10-25

### Resultado entregue

`scrap-factory` é agora um segundo nível jogável sobre o runtime compartilhado.
O Distrito Neon continua intacto com meta 15; player e altar continuam exatamente
4/4. A Fábrica também usa 15 e 4/4, com arena compacta industrial, cinco almas
colocadas, retorno ao altar, rota alta opcional e encontros limitados a quatro
inimigos/dez projéteis. O attract mode continua somente no Distrito.

A prensa única segue `Idle → Warning → Closing → Recovery`: 4,0 s de observação
inicial, depois 2,8/1,25/0,65/1,35 s. Warning usa tremor e chevrons, não apenas
cor. Apenas Closing causa um dano por ciclo, usando a mesma invulnerabilidade;
altar e inimigos são imunes. Posição e hitbox visível: `x=218`, largura 44,
altura 16, `y=128→208`.

### Progressão e navegação

O schema permanece `{ version: 1, completedLevels, unlockedLevels }` na chave
`boypunk-web-progression-v1`. O catálogo agora marca `scrap-factory.available`
como true sem confundir isso com unlock. Concluir Distrito habilita menu e
“Entrar na Fábrica”; retry reinicia o nível corrente. A conclusão da Fábrica é
salva de forma idempotente, sem terceiro nível. Demo/preview/derrota continuam
sem prêmio.

Vitória e derrota usam o título e objetivo do nível atual. A vitória da Fábrica
mostra estatísticas congeladas e oculta próximo nível; Game Over mostra Fábrica,
motivo e 15 como meta. Lifecycle comum limpa a prensa e resíduos em retry/menu.

### Preservação e arquivos

Checkpoint: `evidencias/recovery/BoyPunk-Web-pre-scrap-factory-20261025.tar.gz`,
SHA-256 `ac43186df687757d8a9d47f960feff47c76d40d8bc8bdde831be6fdd9dc23464`.
Não há Git funcional. Releases e portátil foram apenas aferidos, não gerados.

Alterados: `src/level-data.js`, `src/core.js`, `src/renderer.js`,
`src/progression.js`, `src/demo.js`, `src/main.js`, `index.html`, `styles.css`,
`README.md`, `package.json`, testes de core/progressão, `tools/browser-test.mjs`
e documentos. Novos: `tests/levels.test.mjs`,
`tools/factory-model-evidence.mjs` e `PASSAGEM_FABRICA_PARA_ANTIGRAVITY.md`.

### Evidência honesta

- `npm run check`: aprovado.
- `npm test`: 7 arquivos, 65 testes nomeados, todos aprovados.
- A automação determinística usa movimento real para cruzar a prensa, salto duplo
  real para alcançar `player.y=144` e depois `y=80`, e movimento real até sofrer
  exatamente um contato da prensa. Também cobre fases, warning sem dano,
  pausa/reset, altar/inimigos imunes, retry, vitória, save e regressão do Distrito.
- `evidencias/runtime-scrap-factory-20261025/model-sequence.json` contém 12
  amostras com tempo de simulação, entrada e snapshots; foi gerado por
  `tools/factory-model-evidence.mjs` e está identificado como runtime de modelo,
  não como browser.
- Browser nesta rodada: não executado até a página. Chrome caiu no bootstrap do
  Crashpad por sandbox (`setsockopt: Operation not permitted`) e GeckoDriver foi
  recusado pelo confinamento Snap. A suíte de browser foi preparada, mas seus
  novos resultados/capturas não são alegados como aprovados.
- Pendentes: playtest humano, touch físico, avaliação audiovisual/acessibilidade
  e substituição dos gráficos protótipo pela Antigravity.

Integração visual futura deve preservar retângulos, pivô da cabeça móvel,
chevrons/forma do Warning, ordem de camadas e contrato do fixed-step descritos em
`PASSAGEM_FABRICA_PARA_ANTIGRAVITY.md`.

Abrir a versão de desenvolvimento:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```

## Entrega: Câmara de Energia e Bola de Pulso — 2026-10-26

### Resultado

Foi integrada uma arena bônus reutilizável ao runtime atual, sem segundo loop e
sem reconstruir a campanha. A qualificação é calculada exclusivamente do resumo
congelado de uma vitória elegível: 50 pela vitória, +25 por vida ≥75% e +25 por
altar ≥75%, com limite inclusivo de 75. Não qualificados mantêm a vitória normal;
demo e preview normal não entram no bônus nem salvam recompensas.

A entrega v1 da Câmara dura 20 s ativos, tem 30 almas com IDs únicos, vão com
retorno seguro e zero combate/dano. Pausa e página oculta não gastam tempo. Sua
rota automatizada por inputs reais, sem teleporte, coletava 30/30 em ~10,9 s;
esse baseline foi substituído pela revisão v2 registrada mais abaixo. A
apresentação atual é propositalmente provisória; contratos de arte e coordenadas estão em
`PASSAGEM_BONUS_PARA_ANTIGRAVITY.md`.

Pontuação: 10 por alma, +50 por 30/30, máximo 350. O save
`boypunk-web-progression-v1` continua na versão 1 e agora aceita o campo opcional
`bonusBestScores`. Saves v1 antigos migram em memória para `{}`. O total é
derivado; só uma melhora grava e concede a diferença positiva. Resultado igual,
pior, zero ou skip não apaga recorde. Falha de storage conserva a sessão e aviso.

O resultado oferece Fábrica somente depois do Distrito e quando disponível,
replay da campanha de origem e menu. Depois da Fábrica não existe botão/rota de
terceiro nível. Entradas mantidas são consumidas nas transições, e cinco ciclos
bônus/campanha/menu confirmam limpeza de entidades, tiros, efeitos e timers.

A Bola de Pulso conserva os números e colisões existentes: corpo 8×8, origem,
330 px/s, vida/range, dano, cooldown e ataque de 0,18 s. Foram adicionados apenas
arco laranja sincronizado, núcleo ciano/branco dentro do colisor, trilha curta e
`pulseImpact` em parede/inimigo confirmado. Efeitos são limitados, sem dano,
shake obrigatório ou áudio novo/duplicado, e têm redução para `reducedMotion`.

### Revisão da arte da Fábrica

Confirmados no fonte os dois assets Antigravity (`fabrica-sucata.png` 1365×768
RGB e `factory-platformtiles.png` 128×128 RGBA), seleção pelo tema, fallback,
camadas e cabeça da prensa derivada do retângulo físico 44×16. Não foi encontrado
bloqueio na carga/renderização por inspeção/testes; nenhuma arte, hitbox, fase,
IA, dano ou timing da Fábrica foi alterado.

### Arquivos alterados nesta entrega

- novos: `src/bonus.js`, `tests/bonus.test.mjs`, `tests/bonus-ui.test.mjs` e
  `PASSAGEM_BONUS_PARA_ANTIGRAVITY.md`;
- gameplay/dados: `src/config.js`, `src/level-data.js`, `src/core.js`;
- persistência/UI/render: `src/progression.js`, `src/input.js`, `src/main.js`,
  `src/renderer.js`, `index.html`, `styles.css`;
- verificação/build futuro: `tests/core.test.mjs`,
  `tests/progression.test.mjs`, `tools/build-portable.mjs`, `package.json`;
- documentos: `README.md`, `CONTINUIDADE_BOYPUNK_WEB.md` e este relatório.

### Verificação real e limitações

- **Automatizada/estática:** `npm run check` aprovado; `npm test` aprovado em 9
  arquivos, 81 testes nomeados. Inclui qualificação, isolamento, 30 almas,
  pontuação, save/erros, timeout, pausa, queda, rota física, ciclos e projétil.
- **Assets/fábrica:** formatos/dimensões conferidos; regressões de ambos os níveis,
  prensa, animação, demo, dano e progressão aprovadas na suíte.
- **Browser:** pendente nesta rodada. O bind local devolveu `listen EPERM`, Chrome
  falhou antes da página por Crashpad/sandbox e Firefox Snap recusou execução.
  Nenhuma captura nova ou travessia de browser é alegada.
- **Humano pendente:** vitória normal completa por controle humano, ritmo/clareza
  da Câmara, touch físico, áudio, acessibilidade visual e outros SOs/navegadores.

Os arquivos históricos em `releases/` e `dist-portable/JOGAR.html` foram
preservados; não houve build portátil, pacote ou publicação.

## Revisão de dificuldade da Câmara de Energia — layout v2 — 2026-10-26

### Achados confirmados

A baixa dificuldade anterior vinha da composição: 10/30 almas estavam em uma
sequência extensa no piso, e quase todas as demais formavam varreduras
horizontais contínuas. A rota física automatizada de ~10,9 s era evidência dessa
margem, não medição humana.

Não foi encontrada coleta inflada. Cada alma usa o AABB exato 15×16 e a coleta
chama `overlaps(player, soul)`; contato apenas na borda não coleta. O bob de ±2
px só afeta o desenho. Coleta durante subida através de plataforma `oneWay` é
coerente com a colisão existente. A caixa âmbar 19×20 é uma moldura visual
intencional para distinguir a alma bônus e aumentar legibilidade, não debug ou
representação do AABB.

### Revisão implementada

- 30 almas preservadas em 8 acessíveis, 14 intermediárias e 8 avançadas;
- somente quatro almas no piso;
- quatro faixas elevadas quebradas em ilhas de 80–112 px, com lacunas de 32–48
  px e alternância de direção a cada mudança de altura;
- quatro almas na faixa baixa, 14 divididas entre as duas intermediárias e oito
  na faixa avançada;
- spawn, vão de 48 px, retorno seguro, 20 s, física, colisor, velocidade, saltos,
  raio de coleta, relógio e pontuação inalterados;
- aviso transitório deslocado da faixa superior para y=247..263. O HUD termina
  em y=46 e a moldura da alma superior começa em y=54.

A definição é compartilhada pela qualificação real e por `?bonus-preview=1`;
não há cópia de arena. Nenhuma alteração foi feita em campanha, Fábrica/prensa,
attract mode, áudio ou Bola de Pulso.

### Rota reproduzível e tempo

O teste percorre: piso L→R; faixa baixa R→L; intermediária 1 L→R;
intermediária 2 R→L; avançada L→R. A cada frame de 1/120 s, envia esquerda ou
direita até tolerância horizontal de 4 px, salta quando o próximo alvo está mais
de 6 px acima, usa o segundo salto perto do ápice quando necessário e neutraliza
o eixo até pousar após coleta aérea.

Resultado determinístico: 30/30, 350 pontos, **15,275 s**, 6 comandos de salto
(2 duplos), 618 frames à esquerda, 963 à direita, 252 neutros e zero quedas. Uma
variação agressiva, sem estabilizar pousos, mediu **13,708 s**. O alvo de 16–18 s
ficou ligeiramente acima do percurso conservador; decidiu-se manter folgas de
pouso e todos os parâmetros do jogador, em vez de fabricar tempo com física ou
saltos injustos. Nenhum desses números é alegado como playtest humano.

### Compatibilidade, arquivos e proteção

Scoring/save continuam idênticos: 10 por alma, +50 por 30/30, máximo 350 por
nível, melhor resultado por origem e somente diferença positiva. O campo v1
`bonusBestScores` não mudou, não houve migração e recordes existentes não são
zerados pela troca de layout. Preview segue inelegível e não persistente.

Recovery criado antes da edição:
`evidencias/recovery/BoyPunk-Web-pre-energy-chamber-layout-v2-20261026.tar.gz`
(SHA-256 `d5d0b51eed129842e016187be469772f6df815abc4b1a144545c8aaa8c57da97`).

Arquivos alterados nesta revisão:

- `src/level-data.js`: plataformas, posições e metadados 8/14/8;
- `src/renderer.js`: aviso bônus fora da rota superior;
- `tests/bonus.test.mjs`: distribuição, AABB e rota física v2;
- `tests/bonus-ui.test.mjs`: contrato de foco/visibilidade da arena;
- `README.md`, `CONTINUIDADE_BOYPUNK_WEB.md`,
  `PASSAGEM_BONUS_PARA_ANTIGRAVITY.md` e este relatório.

### Verificação e limitações

- `npm test`: aprovado, 9 arquivos/85 testes nomeados. Inclui regressões dos dois
  níveis, prensa, demo, progressão/save, projétil, limpeza e fluxo bônus.
- `npm run check`: aprovado.
- ZIPs históricos 0.2.0, 0.2.1 e 0.2.2 conferidos pelos sidecars SHA-256: `OK`.
  `dist-portable/JOGAR.html` permaneceu com SHA-256
  `4a66e2d5a0161c3e81e2a20be41dc2b05792476541e6ed77d070573128c1a671`.
- Browser: `./abrir-bonus.sh --no-open` foi executado, porém a sandbox recusou o
  servidor com `listen EPERM 127.0.0.1`. Não há nova captura nem travessia em
  browser alegada.
- Pendente humano: validar sensação de 20 s, leitura das trocas de faixa, touch,
  foco/visibilidade real e refinamento artístico provisório.

Abrir a prévia direta (sem progresso nem recorde):

```bash
/home/flow/Projetos/BoyPunk-Web/abrir-bonus.sh
```

## Sistema de Power-ups: Rajada Dupla (Fase 2B) — 2026-10-28 (Antigravity / Pair programming)

### Ponto de Recuperação e Preservação
Checkpoint gerado antes das modificações de assunção:
`evidencias/recovery/BoyPunk-Web-pre-phase2b-takeover-20261028.tar.gz`
(SHA-256 `ed3c73d53b61cc85ad014fea7c5c4246a96af9d5e3dcbb2fbe8d51b467257678`).

Preservados estritamente: patrol-shooter em campanha, física de colisão da Fase 1, seletor de dificuldade, layout v2 da Câmara de Energia / canhão (−1 s), controles touch móveis sem distorção e esquema de saves.

### Entregas Técnicas e Artísticas
1. **Lógica e Contrato de Gameplay (`POWER_UPS["double-burst"]`):**
   - 10 segundos de efeito ativo.
   - 2 projéteis por ataque aceito com atraso de 0,12 s entre eles.
   - Cadência de ataque de 0,34 s e stats do projétil Bola de Pulso (330 px/s, 8×8, swept-AABB) 100% conservadas.
   - Recoleta restaura para 10 s sem empilhamento.
   - Spawn garantido único na campanha após a introdução (`depositadas + carregadas >= 4`), com 12 s de vida útil para pickup não coletado.
   - Posições determinísticas: Distrito `(180, 160)` e Fábrica `(372, 160)`.
   - Limpeza em morte, vitória, menu, restart e troca de cena, estendida para efeitos temporários de coleta (`powerUpCollect`).
2. **Arte Pixel-Art do Cartucho de Energia Cyberpunk (16×16 RGBA):**
   - 4 frames com ciclo idle: `assets/images/world/powerup-double-burst-idle-000..003.png`.
   - Chassi de grafite usinado, acentos ciano neon e duplo núcleo de plasma âmbar legível.
   - Alinhamento de base Y=15 repousando perfeitamente sobre a superfície física das plataformas (Y=16).
   - Flutuação sutil de 1,5 px com sombra de contato projetada na plataforma (desligada em `reducedMotion`).
3. **Apresentação e HUD Polido:**
   - Resposta visual de coleta em `drawEffects`: choque radial gradiente âmbar/ciano, duplo feixe de fagulhas radiantes e texto `×2`.
   - Painel HUD compacto de 136×18 px no topo esquerdo com mini-ícone de 10×10 px, texto localizado (`Rajada Dupla ×2  {remaining}s`), medidor de duração (2 px) e sinalização crítica quando `remaining <= 2.5s`.
   - Sem layout jumps: banner de aviso rebaixado para `y = 73` quando ativo e restaurado para `y = 51` na expiração.

### Validação
- `npm run check`: Aprovado sem erros.
- `npm test`: **210 testes aprovados em 24 arquivos (zero falhas)**.
- Validação determinística em Chrome headless via CDP (`tools/record-powerup-evidence.mjs`) com 10/10 cenários fotografados em `evidencias/art/powerups/`.
- Evidências gráficas: `double-burst-contact-sheet.png`, `double-burst-cartridge-idle-loop.gif`, `double-burst-before-after-comparison.png`.
