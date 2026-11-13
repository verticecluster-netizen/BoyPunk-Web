# Continuidade — BoyPunk! Web 0.4.2

## Entrega de Avaliação Studio — 2026-11-06

- Build gerada para avaliação da equipe do Studio: `BoyPunk-Web-v0.4.2-studio-review-20261106-193000`.
- Artefato gerado: `releases/studio-review/BoyPunk-Web-v0.4.2-studio-review-20261106-193000.zip` (14.353.572 bytes / 13,69 MiB, SHA-256 `d7ede7ce78ea41122125f730928ed34372c5c2f5d19bd858be16d5f9839c277e`).
- Conteúdo do pacote:
  - `JOGAR.html` autocontido (8.283.180 bytes) para teste offline imediato sem dependências;
  - Pasta `WEB/` com os fontes modulares e scripts para execução em servidor local (`tools/server.mjs`);
  - `LEIA_PRIMEIRO.md` com instruções de execução e mapeamento de controles;
  - `DOCUMENTACAO/ROTEIRO_TESTES_STUDIO.md` com 5 baterias de testes focadas em movimentação A/D, combate, menus, coop e power-ups;
  - `DOCUMENTACAO/FORMULARIO_FEEDBACK.csv` para registro padronizado de problemas e impressões;
  - `DOCUMENTACAO/RELATORIO_TECNICO.md` com escopo, hashes e evidências de validação;
  - `MANIFESTO.sha256` cobrindo todos os 426 arquivos distribuídos.
- Validação técnica: extração completa em diretório temporário, validação de integridade 426/426 via SHA-256, teste de inicialização do servidor local em porta isolada (`health.json` HTTP 200). Automação prévia aprovada (`npm run check` OK, `npm test` 35 arquivos / 348 testes aprovados).
- Jogabilidade, código e assets originais preservados sem alteração.

## Fonte 0.4.2 — prioridade horizontal A/D — 2026-11-05

- Causa confirmada: o rastreamento físico preservava A/← e D/→, mas direções
  opostas eram publicadas juntas. O modelo calculava `right - left = 0`, então
  A → D aplicava atrito em vez de inverter a velocidade.
- O input agora ordena fontes físicas no primeiro pressionamento válido: a
  última direção vence, soltá-la retoma a anterior ainda mantida e repeat não
  muda prioridade. Soltar A não cancela ArrowLeft.
- O modelo consome o eixo resolvido `-1/0/1`, preservando fallback booleano,
  aceleração, atrito, velocidade, salto e colisões. Mouse continua somente como
  ataque e não participa do deslocamento nem substitui `facing`.
- Blur, documento oculto e transições eliminam prioridade antiga; repeat órfão
  não restaura tecla. Gamepad neutro não bloqueia teclado autorizado e os slots
  coop permanecem isolados, sem mudança de deadzone.
- Validação: regressão inicialmente vermelha; direcionados 92/92; `npm run
  check` aprovado; `npm test` 36/36 arquivos; execução interna 348/348. Chrome,
  Firefox/Geckodriver ficaram bloqueados pelo sandbox/Crashpad/Snap, portanto o
  teclado físico e o game feel permanecem manuais.
- Backup: `BoyPunk-Web-pre-correcao-movimento-ad-20261105-v1.tar.gz` (SHA-256
  `d044201485673ea9eaac1df57b4096301abeba72ab1952b85a91e23f8744f96f`).
  Checkpoint final: `BoyPunk-Web-correcao-movimento-ad-20261105-v2-final.tar.gz`.
  Relatório: `docs/RELATORIO_CORRECAO_MOVIMENTO_AD.md`. Nenhum release gerado.

## Fonte 0.4.2 — controles, power-ups e feedback — 2026-11-05

- Ataque no Canvas agora exige mouse primário, `button === 0` e bit esquerdo
  em `buttons`; direito não dispara e o contexto normal não foi bloqueado.
  Não existe segundo ataque por `click`. Início/retomada continuam protegidos
  pelo estado observado na captura.
- Input rastreia teclas físicas: alternativas simultâneas não se cancelam ao
  soltar só uma, `keyup` aceito não se perde após troca de foco e blur/
  visibilidade/pointercancel limpam tudo. A/←, D/→, W/↑/Espaço, J/X/F, E, Q e
  Esc permanecem os comandos; S não é movimento vertical.
- Campanha deixou de consumir Cura cheia/Escudo já carregado. Eventos de
  coleta têm tipo e coletor válidos. A matriz real cobre campanha, bônus,
  Sobrevivência solo/coop, preview coop, demo e preview do atirador.
- O `undefined` do bônus vinha da leitura de `.text` em uma notice por chave
  i18n da Rajada Dupla. Todos os HUDs agora resolvem a notice e rejeitam payload
  inválido. `BLOQUEADO` agrupa impactos próximos por proprietário, dura no
  máximo 0,34 s e não altera colisão/dano.
- Cruz verde é Cura pickup; Nilo usa habilidade separada, agora identificada
  por `HAB`/`HAB8.0`/`HAB✓`. RD compartilhada reutiliza o asset ×2.
- Factory Overlord permanece arte decorativa sem entidade/HP/dano/vitória. A
  barra falsa ligada ao progresso do altar foi desativada e só aceita
  `bossActive + bossHealth + bossMaxHealth`; esse contrato não existe no jogo
  atual, portanto a barra não aparece.
- Strings relatadas estão corretas no fonte. Eyebrows, loading, banners e
  `BLOQUEADO` receberam fonte de sistema legível; `/75` continua autoritativo.
- Validação: direcionados 180/180 internos; suíte completa 341/341 internos;
  `npm run check` aprovado; `npm test` 35/35 arquivos. Navegador bloqueado por socket/Snap/Crashpad; mouse físico,
  áudio, joystick e game feel continuam manuais.
- Relatório: `docs/RELATORIO_CORRECOES_CONTROLES_POWERUPS.md`. Checkpoints:
  `BoyPunk-Web-pre-correcoes-controles-powerups-20261105-v1.tar.gz` e
  `BoyPunk-Web-correcoes-controles-powerups-20261105-v2-final.tar.gz`. Nenhum
  release/Studio foi gerado.

## Fonte 0.4.2 — combate finito na Câmara de Energia — 2026-11-05

- A restrição antiga de bônus sem inimigos foi substituída pela autorização de
  combate. A Câmara preserva 20 s, 30 almas, 350 pontos máximos, canhão e fluxo
  de campanha; abates não são objetivo e não soltam almas.
- Dois Chasers de 3 HP no máximo entram por agendas finitas: primeiro a partir
  de 3,4 s, segundo a partir de 10 s. Há aviso no mundo, distância mínima de
  104 px, validação de apoio/sólidos/almas/pickups e adiamento sem fallback
  inseguro. Nenhum atirador novo foi somado ao canhão.
- Dano normal, Escudo e 0,9 s de invulnerabilidade funcionam no bônus. Morte
  encerra somente a rodada com o progresso parcial; conclusão nunca exige
  eliminar inimigos. Cleanup remove inimigos, projéteis, agendas e temporários.
- Cura, Escudo, Tiro Rápido e Rajada Dupla usam o registro compartilhado, entram
  em 2,2/5,8/8/10,5 s e respawnam em 6/5/5,5/5 s. Pausa congela tudo. O renderer
  também deixou de ocultar pickups funcionais da Sobrevivência.
- Ataque do bônus usa J/X/F, touch, botão 2 do gamepad e clique esquerdo no
  Canvas; BoyPunk/Nilo preservam cadência, âncora e som. O bônus continua solo;
  não há suporte cooperativo oculto a ativar.
- Validação: direcionados aprovados; `npm run check` aprovado; `npm test` 34/34
  arquivos, zero falhas. Rotas determinísticas completaram 30/30 sob combate e
  com uma penalidade do canhão. Browser ficou bloqueado por Crashpad/Snap;
  dificuldade e controles físicos permanecem pendentes de playtest.
- Checkpoints: `evidencias/recovery/BoyPunk-Web-shared-pickups-render-20261105.tar.gz`
  e `evidencias/recovery/BoyPunk-Web-bonus-combat-20261105.tar.gz`.
  Relatório: `docs/RELATORIO_COMBATE_BONUS.md`. Nenhum release/Studio foi gerado.

## Studio 0.4.2 — correção desacoplada empacotada — 2026-10-29

- A correção permanece presente e coberta: sem efeitos = cadência base/1 tiro;
  Rapid Fire = cadência ×0,5/1 tiro; Double Burst = cadência base/2 tiros;
  ambos = cadência ×0,5/2 tiros. BoyPunk usa 0,34/0,17 s e Nilo
  0,408/0,204 s. O segundo tiro continua após 0,12 s; duração de cada efeito,
  cap, ownership e cleanup permanecem independentes.
- A gravação de desenvolvimento fornecida confirma somente os dois personagens,
  conclusão de fase, transições de bônus e retorno ao menu. Não foi usada como
  prova de power-ups simultâneos, operação offline ou dispositivo físico.
- Metadados sincronizados para 0.4.2 pelo processo existente em `package.json`,
  `src/version.js`, teste de prontidão e README. Gameplay e artwork não foram
  alterados nesta embalagem. Todos os Studios anteriores foram preservados.
- Validação: focados 3/3; `npm run check` aprovado; `npm test` 28/28 arquivos,
  zero falhas. O verificador compilou o script inline e encontrou 17 módulos e
  242 recursos como data URLs, sem dependência externa obrigatória.
- Studio: `studio-builds/BoyPunk-Studio-v0.4.2.html`, 8.732.735 bytes,
  SHA-256 `93c1c0263c68d56cde16f8a64da8b5667bd487080a89c8175cae765b8759a349`.
  A cópia `/tmp/BoyPunk-Studio-v0.4.2.html` é byte a byte idêntica.
- Runtime `file://` não foi aprovado neste ambiente: Chromium não criou
  `DevToolsActivePort`; Firefox headless não concluiu nem produziu captura. A
  validação manual de carregamento, áudio, controles, power-ups e retry continua
  obrigatória em navegador real.
- Limites conhecidos: Factory Overlord continua sendo somente apresentação
  visual, sem combate autoritativo; lodo e pistões decorativos não são hazards
  de combate implementados. A prensa industrial existente é a exceção jogável.

Comandos:

```bash
xdg-open /home/flow/Projetos/BoyPunk-Web/studio-builds/BoyPunk-Studio-v0.4.2.html
xdg-open /home/flow/Projetos/BoyPunk-Web/studio-builds
```

## Fonte pós-Studio 0.4.1 — Rapid Fire desacoplado — 2026-10-29

- Checkpoint:
  `evidencias/recovery/BoyPunk-Web-pre-rapid-double-decoupling-20261029.tar.gz`
  (108.208.528 bytes), SHA-256
  `5d20a4ce3d2b4fd12bad372137782838a7621546a5865ac5ffe045ac3c96b6de`.
- Causa confirmada: `player.rapidFire` reduzia cooldown e também satisfazia a
  condição genérica que criava o Double Burst. Agora `rapidFireActive` modifica
  somente a cadência e `doubleBurstActive` exige ID `double-burst` e relógio
  positivo para criar o segundo tiro.
- Matriz aprovada para BoyPunk/Nilo: nenhum = base/1; Rapid = base×0,5/1;
  Double = base/2; ambos = base×0,5/2. Cooldowns: BoyPunk 0,34/0,17 s; Nilo
  0,408/0,204 s. Durações independentes de 10 s; segundo tiro em 0,12 s.
- Permanecem 8×8, 330 px/s, vida 1,25 s, cap 8, direção da aceitação, origem
  corrente na segunda emissão, anchors por personagem e descarte sem dívida.
  Uma fila aceita conclui após expiração, mas morte/terminal/retry/cena a limpa.
- Coop-preview continua com power-ups desativados; ownership e cleanup por slot
  foram cobertos. Nenhuma rota pública cooperativa foi ativada.
- Validação: regressão vermelha reproduzida; focados 3/3; `npm run check`
  aprovado; `npm test` 28/28. Browser staged bloqueado por `listen EPERM
  127.0.0.1`; verificação física/ordinária permanece manual.
- Alterados somente `src/core.js`, `tests/powerups.test.mjs`,
  `tests/coop.test.mjs` e documentação/evidência. Artwork, renderer/HUD,
  `src/coop.js`, input, áudio e demais gameplay não foram tocados.
- Nenhum HTML foi regenerado. O Studio v0.4.1 existente (SHA-256
  `330cc48b705208a5b96288051888cb163b6abc6bf8cb2c239aec94fcdf836be2`)
  **antecede esta correção**.

Comando de desenvolvimento:

```bash
cd /home/flow/Projetos/BoyPunk-Web && npm run dev
```

## Fonte 0.4.1 — estabilização do HUD do chefe e Studio — 2026-10-29

- Checkpoint prévio:
  `evidencias/recovery/BoyPunk-Web-pre-boss-hud-menu-stabilization-20261029.tar.gz`
  (107.799.870 bytes), SHA-256
  `14bd7418cad795c1e5e4a96b58960c01d1b886596583d0fd6f9e3759e34a55c1`.
- A tarefa HUD/menu anterior estava concluída e foi preservada. A causa nova era
  geométrica: a barra Canvas do Factory Overlord `(135,6,210×22)` cobria o
  painel de almas `(136,7,220×38)`. Ela agora usa uma faixa dedicada
  `(152,51,320×22)`; avisos essenciais descem temporariamente para `y=77`.
- Limpeza integral do backing buffer, HUD em screen-space, isolamento do shake,
  renderScale e espaço lógico 480×270 permanecem inalterados. Não houve evidência
  de passe HUD duplicado nem vazamento de transform; o shell DOM do chefe nunca é
  ativado e não participa da imagem corrente.
- Rapid Fire e Shield têm indicadores separados em `y=95` e `y=117`; Double
  Burst continua em `y=51` e Cura em `y=73`. Health atualiza a vida com clamp.
  Os três pickups novos agora renderizam independentemente do pickup legado.
- Auditoria de escopo: Double Burst, Rapid Fire, Health, Shield e a prensa são
  gameplay real. O Factory Overlord é apenas apresentação visual, sem entidade,
  HP/dano/vitória autoritativos. Lodo e pistões adicionais também são decoração.
  Rapid Fire possui defeito de gameplay pendente: além da meia cadência, aciona
  o segundo tiro de Double Burst. Nenhum gameplay protegido foi alterado;
  `src/core.js` e `src/coop.js` mantêm os hashes do checkpoint.
- Validação: focados 3/3; `npm run check` aprovado; `npm test` 28/28 arquivos,
  zero falhas. A suíte cobre os dois níveis, bônus, pausa, derrota/retry, cinco
  ciclos de restart, mobile/touch e coop-preview. Chrome/CDP e o teste portátil
  ficaram bloqueados por Crashpad/ausência de `DevToolsActivePort`; Firefox
  abriu o HTML via `file://`, mas a captura automática ocorreu no preload 0%.
  Runtime standalone completo permanece pendente, sem alegação de áudio,
  controles ou dispositivo físico.
- Studio final:
  `studio-builds/BoyPunk-Studio-v0.4.1.html`, 8.732.599 bytes, SHA-256
  `330cc48b705208a5b96288051888cb163b6abc6bf8cb2c239aec94fcdf836be2`.
  Contém 18 módulos e 242 assets embutidos, zero dependências externas; cópia
  isolada idêntica em `/tmp/BoyPunk-Studio-v0.4.1.html`.
- Evidências: `evidencias/ui/hud-menu-stabilization/`.

Comandos:

```bash
cd /home/flow/Projetos/BoyPunk-Web && npm run dev
xdg-open /home/flow/Projetos/BoyPunk-Web/studio-builds/BoyPunk-Studio-v0.4.1.html
xdg-open /home/flow/Projetos/BoyPunk-Web/studio-builds
```

## Fonte 0.2.8 — HUD estável, menus responsivos e Studio — 2026-10-29

- Checkpoint prévio: `evidencias/recovery/BoyPunk-Web-pre-hud-menu-stabilization-20261029.tar.gz`
  (103 MiB, 1.002 entradas), SHA-256
  `ac6c0376281305305c98412b18ffec37ed8a0379261563da97b26e89c4877cb6`.
  Dependências, releases, builds gerados e recuperações anteriores foram
  excluídos. Releases e Studios 0.2.3–0.2.7 foram preservados.
- Causa confirmada no código: screen shake envolvia `drawWorld`, que também
  desenhava a HUD; além disso, o backing buffer físico não era explicitamente
  limpo. A gravação isoladamente não foi usada como prova. Não foi encontrada
  duplicação de Canvas/DOM nem efeito cromático aplicado ao texto autoritativo.
- `Renderer.render` agora normaliza transform/alpha/composição, limpa a dimensão
  física total e separa fundo, mundo com shake e HUD estável. Testes verificam
  `clearRect(0,0,960,540)` no padrão 2×, pilha `save/restore` balanceada e HUD sem
  herdar `translate`.
- Slots: Double Burst `(8,51)`, Cura `(8,73)` e avisos na faixa fixa
  `x=152..472`, `y=51`. Saúde, integridade do altar, carga, depósito/meta, tempo,
  score e P1/P2 continuam imediatos e sem alteração de simulação.
- CSS preserva 480×270 e renderScale ilustrado. Menu principal, pausa, vitória,
  derrota, transição/resultado bônus receberam largura, tipografia e espaçamento
  responsivos; painéis têm scroll contido e ações têm mínimo de 44 CSS px.
- Baseline: `npm run check` e 26/26 arquivos de teste aprovados. Após a mudança:
  `npm run check` e 27/27 arquivos aprovados, incluindo regressões de renderer e
  layout. `src/core.js` e `src/coop.js` não foram editados.
- Studio gerado pela fonte modular:
  `studio-builds/BoyPunk-Studio-v0.2.8.html`, 8.631.554 bytes, SHA-256
  `f9411c79ed68a1bce2c206c02177f9fc18650cb5fa3ed639a7ee1edd2b676fbb`.
  Cópia isolada idêntica em `/tmp/boypunk-studio-0.2.8-pO7y7F/`.
- Limitação de browser desta sessão: HTTP local falhou com `listen EPERM`;
  Chrome file:// encerrou com Crashpad `setsockopt EPERM`; Firefox headless ficou
  preso e não produziu captura. O artefato está gerado e verificado estaticamente,
  mas o runtime standalone e os viewports desktop/tablet/telefone permanecem
  pendentes em navegador real e dispositivo físico.

Comandos:

```bash
cd /home/flow/Projetos/BoyPunk-Web
./iniciar-jogo.sh --no-open
xdg-open /home/flow/Projetos/BoyPunk-Web/studio-builds/BoyPunk-Studio-v0.2.8.html
xdg-open /home/flow/Projetos/BoyPunk-Web/studio-builds
```

## Fase 4D — Polimento Biomecânico de Personagens, Taco de Beisebol e Coesão de Inimigos — 2026-10-29

Foi concluída a integração do taco de beisebol com silhueta e cinemática biomecânica em BoyPunk, a locomoção articulada independente de BoyPunk e Nilo, e a elevação de coesão visual dos inimigos (Chaser Droid e Patrol Shooter ilustrado a 2×).

1. **Taco de Beisebol de BoyPunk:**
   - Geometria física crível: pomo de retenção usinado, empunhadura espiralada em borracha sintética, cone de transição em titânio e tambor de impacto com calota esférica. Acentos ciano e laranja subordinados à estrutura física. Zero brilho mágico ou glow translúcido.
   - Presença visual sólida e sem cortes em `idle` (apoiado no ombro), `walk` (empunhado junto ao quadril em ângulo dinâmico), `jump`/`fall` (empunhado pronto para rebater), `attack1` (swing de 4 etapas com arco biomecânico) e `die` (repouso no chão).
   - Auditoria de coordenadas de impacto: no ápice do ataque (F2), o tambor atinge `player.x + 33`, alinhado com 0px de erro ao centro geométrico do colisor melee de `src/core.js` (`[player.x + 20 .. player.x + 46]`). Discrepância com o projétil físico (`player.x + 54`) documentada para alinhamento futuro por Codex em [PASSAGEM_TACO_ANIMACOES_PARA_CODEX.md](file:///home/flow/Projetos/BoyPunk-Web/PASSAGEM_TACO_ANIMACOES_PARA_CODEX.md).
2. **Locomoção Biomecânica de Nilo Android (Sem Tacos):**
   - Identidade preservada: armadura cerâmica marfim polida (`#f0eee8`), juntas de grafite, óptica frontal âmbar e emissor de nanorreparo no antebraço direito.
   - Fases biomecânicas completas: apoio de calcanhar, passagem com folga de joelho, contra-rotação pélvica e extensão.
3. **Coesão de Inimigos:**
   - Chaser Droid Ilustrado (18 quadros, 32×64): lente esférica carmesim, mordida com mandíbula cinética e pernas mecânicas com transferência de peso.
   - Patrol Shooter Ilustrado 2× (17 quadros, 64×64): chassis pesado rebitado com `patrol` (8 quadros), `aim` (4 quadros), `fire` (1 quadro com recuo mecânico e flash de boca) e `recovery` (4 quadros com exaustão de calor).
4. **Validação e Evidências:**
   - Testes automatizados: **250 testes em 26 suítes aprovados com 100% de sucesso** (`npm run check && npm test`).
   - 15 evidências visuais geradas em `evidencias/art/character-motion-bat-polish/`.
   - Checkpoint: `evidencias/recovery/BoyPunk-Web-pre-bat-and-character-motion-polish-20261029.tar.gz` (SHA-256 `dcdfa1051c6edd18945fdb316463f0a7f889d1f955115f1998c9cc873277c371`).

---

## Fase 4C — Atualização Cinematográfica e Arte Ilustrada 2D (Slice Distrito Neon) — 2026-10-29

Foi implementada com sucesso a evolução artística de BoyPunk! Web em direção a uma estética 2D ilustrada cinematográfica com silhuetas suaves, materiais críveis e profundidade visual natural, superando a rigidez de blocos voxel e a obrigatoriedade de nearest-neighbor para todas as camadas visuais.

1. **Arquitetura de Renderização e Escalonamento Lógico-para-Render:**
   - Resolução lógica de gameplay preservada rigorosamente em **480 × 270** (zero impacto em física, colisores AABB, alcances e IA).
   - Buffer gráfico físico desacoplado via `renderScale` (clamp 1× a 4×, padrão 2× gerando backing canvas de 960 × 540 e 1.5× em telas móveis compactas).
   - `ctx.scale(renderScale, renderScale)` e `image-rendering: auto` com interpolação bilinear nos ativos ilustrados.
   - Parâmetro URL `?scale=` para ajuste e inspeção.
2. **Ativos Ilustrados 2× do Slice Distrito Neon:**
   - BoyPunk (128 × 192 RGBA, 21 frames): silhueta anatômica fluida, capacete grafite polido, visor ciano curvo e ombreiras em titânio.
   - Nilo Android (128 × 192 RGBA, 21 frames): chassis em placas de cerâmica marfim, ótica âmbar e emissor cilíndrico de nanorreparo.
   - Altar Distrito Neon (64 × 96 RGBA, 7 frames): duto curvo de plasma ciano, aletas de cobre e LEDs in-world de integridade.
   - Chaser Droid (32 × 64 RGBA, 18 frames): lente monocular esférica carmesim, mandíbula de aço temperado e pernas mecânicas articuladas.
   - Projéteis Ilustrados (16 × 16 RGBA): pulso do jogador e bala inimiga com gradiente radial suave.
   - Registro não-obstrutivo em `src/assets.js` sob o namespace `.illustrated` com fallback transparente para ativos legados.
3. **Cenário e Efeitos Refinados:**
   - Névoa atmosférica de fundo em gradiente vertical azul anil a violeta no Distrito Neon.
   - Suportes mecânicos tipo cantilever em aço escovado e sombras suaves de contato para plataformas elevadas.
   - Partículas suaves: poeira de aterrissagem desenhada com puffs circulares antialiased (`ctx.arc`) e decaimento alfa progressivo.
4. **Validação, Evidências e Pranchas:**
   - Suíte de Testes: **250 testes em 26 suítes aprovados com 100% de sucesso** (`npm run check && npm test`).
   - Evidências em navegador real (8 screenshots em `evidencias/art/illustrated-neon-upgrade/01..08`).
   - 6 pranchas comparativas completas cobrindo BoyPunk, Nilo, Altar, Chaser, Projéteis e o comparativo direto de gameplay com zoom 2.5× nos detalhes.
   - Checkpoint: `evidencias/recovery/BoyPunk-Web-pre-illustrated-upgrade-20261029.tar.gz` (SHA-256 `03e5b0c4c3885e44d3ec20e3e58cb42a589543738a460e8af36798222498f907`).

---

## Fase 4B — Atualização Focada de Qualidade Visual e Apresentação — 2026-10-28

Foi aplicada uma atualização completa de qualidade visual focada na coesão do mundo, legibilidade de gameplay e clareza do HUD, preservando rigorosamente as mecânicas, física, IA, contratos de colisão, esquemas de save e a prévia cooperativa isolada (`?coop-preview=1`).

1. **Altar por Nível e LEDs de Integridade:**
   - Distrito Neon: terminal urbano de ancoragem com barramentos neon violeta, núcleo de plasma ciano em vidro blindado e LEDs de status (`altar.distrito-neon.0..6`).
   - Fábrica de Sucata: carcaça industrial em chapa naval rebitada, chanfros de alerta âmbar, fornalha térmica e manômetro analógico (`altar.scrap-factory.0..6`).
   - 4 LEDs in-world na base do altar indicam a vida restante em tempo real; em 1 PV crítico, emite sinal de alerta pixelado `!` e aura vermelha. Pulso vertical e anel de ressonância no depósito.
2. **Almas Cibernéticas Refinadas:**
   - Almas de campanha (`soul.cyber.0..3`) refinadas como núcleo de plasma ciano de alta energia com halo violeta, partículas e contorno escuro 1px garantindo contraste imediato. Almas bônus preservadas.
3. **HUD Arcade e Hierarquia:**
   - Painel 2 reorganizado com separação clara de `CARGA X` (esquerda) e `ALTAR X/15` (direita).
   - Barra de progresso segmentada estilo arcade em 15 passos com divisórias nítidas de 1px.
   - Banners de notificação estabilizados nas faixas seguras designadas (`y=51` e `y=73`).
4. **Feedback Numérico Conciso de Combate e Objetivos:**
   - Acerto em inimigo: `-1` âmbar suave + centelha de impacto.
   - Dano ao jogador: `-1` coral suave.
   - Nanoreparo de Nilo: `+1` ciano/esmeralda + anel curativo.
   - Coleta de alma: `+1` ciano. Depósito no altar: `+N` na coluna de energia.
   - Penalidade de canhão bônus: mantido rigorosamente o `−1 s` existente.
5. **Validação & Evidências:**
   - 247 testes aprovados em 26 suítes (`npm run check && npm test`).
   - 14 capturas headless em tempo real via Chrome CDP e 5 pranchas comparativas (contact sheets) geradas em `evidencias/art/polimento-global/`.
   - Checkpoint: `evidencias/recovery/BoyPunk-Web-pre-visual-quality-upgrade-20261028.tar.gz`, SHA-256 `aff0446812efc2f9a0b6332169b0f673ccc368f3c7c52d67d1eeb13c911a80db`.

---

## Fase 4A — prévia cooperativa local isolada — 2026-10-28

Foi adicionada a rota localhost-only `?coop-preview=1` para Distrito Neon normal,
com BoyPunk P1 e Nilo P2. A campanha normal, o studio HTML 0.2.7, releases,
progressão, bônus, survival, demo, balanceamento e saves permanecem intactos.

`CoopGameModel` compartilha um único mundo/fixed-step e guarda dois estados de
jogador. `CoopGamepadRouter` fornece layouts teclado+pad e dois pads com
ownership exclusivo por botão deliberado, sem persistir índices. Combat,
targeting vivo/travado, owner de projétil, almas individuais, depósito comum,
derrota parcial com drop, cura própria de Nilo e terminais únicos foram
implementados. Rajada Dupla fica explicitamente excluída desta prévia.

Há lobby, HUD P1/P2, pausa global, bloqueio por desconexão, reatribuição e retry
sem reload. Testes finais: `npm run check` aprovado e 26/26 arquivos de
`npm test` aprovados. O sandbox bloqueou socket local; browser e controles
físicos permanecem pendentes. Detalhes em `PASSAGEM_COOP_PARA_CODEX.md`.

Checkpoint: `evidencias/recovery/BoyPunk-Web-pre-phase4a-coop-preview-20261028.tar.gz`,
SHA-256 `f2c57242c89df73360c398b961fa51d4eac065531e695f59e4c7dd0bfebf0a53`.

---

## Fonte 0.2.7 — revisão final e HTML de estúdio — 2026-10-28

A revisão preservou integralmente o gameplay 0.2.6 pós-Nilo e não encontrou
defeito release-blocking. Baseline e final passam em `npm run check` e 25/25
arquivos de `npm test`; a rodada focada passou em 5/5. A única mudança de fonte
funcional é o identificador de entrega 0.2.7; o verificador do estúdio agora usa
`GAME_VERSION` em vez de um nome 0.2.6 fixo.

O relato de playtest fornecido pelo usuário, e não reproduzido por esta revisão,
confirma Nilo com arte/nome corretos, normal 4/4, movimento/salto/ataque nos dois
sentidos e Cura Própria de +1 após recarga.

Artefato: `studio-builds/BoyPunk-Studio-v0.2.7.html`, 8.417.200 bytes,
SHA-256 `ab77f0de9724b1ff053adbc04708e28361a19941038c891f2c9bd3e546156503`.
A cópia isolada teve hash idêntico e passou no verificador: 17 módulos e 138
assets incorporados, sem dependências externas obrigatórias. Chrome e Firefox
foram bloqueados pelo sandbox deste ambiente; logo a entrega está **gerada;
validação runtime standalone pendente**. Builds 0.2.3–0.2.6 permanecem intactos.

Checkpoint: `evidencias/recovery/BoyPunk-Web-pre-final-studio-integration-20261028.tar.gz`,
SHA-256 `ca76d0bfae8d2218772cf3c543d8455b227e2ae471cce24a9ffe7c710f626d4c`.

---

## Fonte 0.2.6 — Fase 3B: Arte Original e Animação de Nilo Integradas — 2026-10-28

A arte original e animação completa de **Nilo** (ID técnico estável `support`),
android curador atompunk/nanopunk, foi integralmente produzida, validada e
integrada ao jogo, eliminando em definitivo a dependência de aparência provisória
e insígnia de cruz médica.

1. **Design Original e Anatomia:**
   - Placas de blindagem arredondadas em marfim quente (`#f4eee2`, `#fffdf8`).
   - Chassis mecânico interno em grafite escuro (`#303644`, `#181c26`) com contorno
     preto nítido 1px e juntas articuladas visíveis (ombros, cotovelos, lombar, bacia,
     joelhos e tornozelos).
   - Cabeçote robótico próprio com aleta occipital de resfriamento e visor de sensores
     em âmbar quente (`#ffb428`, `#eb7c12`), distinto do capacete cinza/ciano de BoyPunk.
   - Reator atômico / nanite circular no tórax com emissão contida mint/ciano (`#2ee6a8`).
   - Cilindro dorsal de fluido nanite e módulo de nano-reparo integrado ao antebraço.
2. **Contrato Rigoroso e Cinemática:**
   - Todos os 21 frames gerados em 64×96 RGBA, chão na linha Y=63 e linhas 64..95 transparentes.
   - Corpo centrado em X=16; AABB 22×32 rigorosamente mantido.
   - Simetria bilateral perfeita nos dois facings (`renderX = drawX - 32` à esquerda).
   - Locomoção bipedal articulada (`walk.0..3`) com passadas reais, vão livre do joelho
     a Y=60 e oscilação de peso.
   - Bocal de nano-reparo no antebraço alinhado ao flash de cano do renderer em
     `(drawX + 33, drawY + 48)`.
3. **Integração e Código:**
   - 21 frames + retrato 32×32 + 4 frames de VFX de cura registrados em `src/assets.js`.
   - `provisionalVisual: false` ativado em `src/config.js`; rótulo `(PROV.)` removido do HUD.
   - Fallback defensivo `player.*` preservado.
   - 230 testes aprovados em 25 arquivos (`npm run check` e `npm test`).
4. **Evidências e Navegador Real:**
   - Ponto de recuperação: `evidencias/recovery/BoyPunk-Web-pre-nilo-art-integration-20261028.tar.gz`
     (SHA-256: `d1ce2703b4ce7955b291ca725cb9ee55c52a49af108735ab9315790856e8cd05`).
   - 11 capturas runtime via Chrome headless CDP em `evidencias/art/nilo/`.
   - Loops animados WebP de caminhada (12 fps), idle (5 fps), ataque (22 fps) e cura (8 fps).
   - Folhas de contato dos 21 frames e teste de ambos os facings.

---

## Fonte 0.2.6 — Fase 3A revisada: preparação de Nilo — 2026-10-28

A implementação Antigravity de seleção e Cura Própria foi confirmada e
preservada. O ID técnico continua `support`; o nome público provisório agora é
**Nilo**. BoyPunk permanece baseline. Nilo mantém movimento, saltos, colisor
22×32, projétil e vida 6/4/3 conforme fácil/normal/difícil; somente o cooldown
é `0,34×1,20 = 0,408 s`, aplicado uma vez.

Lacunas corrigidas: a cura usa `healAmount` do catálogo autoritativo; derrota,
vitória, menu e cenas descartam habilidade/efeito transitórios; preferência foi
centralizada e testada contra save antigo, valor corrompido e storage bloqueado.
Input Q/touch/LB/remapeável, bloqueio de borda em transição, pausa/foco,
isolamento de modos e Rajada Dupla permaneceram funcionais. O preview do
patrol-shooter agora fixa `boypunk`, corrigindo a herança possível de `support`
de uma run anterior.

O renderer agora seleciona `nilo.{state}.{frame}` com fallback explícito para
`player.*`, sem duplicar gameplay nem registrar arquivos inexistentes. Uma
auditoria dos PNGs encontrou o corpo ancorado em X=16 dentro do canvas 64×96;
o espelhamento antigo usava X=32 e deslocava o visual esquerdo 32 px do
colisor. `renderX` foi compensado somente no facing esquerdo. Física, AABB,
flash e origem dos projéteis não mudaram.

`PASSAGEM_PERSONAGENS_PARA_ARTE.md` substitui o contrato genérico anterior e
define a encomenda original: android curador atompunk/nanopunk, armadura
arredondada marfim/grafite, visor âmbar, reator circular, juntas articuladas,
módulo de nano-reparo e acentos mint/cyan contidos. A aparência atual continua
honestamente provisória; nenhuma arte original de Nilo foi criada nesta fase.

Checkpoint: `evidencias/recovery/BoyPunk-Web-pre-phase3a-nilo-review-20261028.tar.gz`
(`a70531b33e4a356996912a2b40fe562045c05f8f4f32f30c26c80f82fe400509`).
Validação final: `npm run check` aprovado e 25/25 arquivos de `npm test`
aprovados. Browser não observado porque o servidor correto retornou
`listen EPERM 127.0.0.1:47831`; evidências anteriores são fallback staged/real
da integração anterior, não da arte de Nilo nem da correção atual de facing.

---

## Fonte 0.2.6 — Fase 3A: Seleção de Personagens e Habilidade Suporte (Cura Própria) — 2026-10-28

Foi implementado o catálogo autoritativo de personagens com identificadores estáveis `boypunk` e `support` (nome provisório "Suporte"), ambos desbloqueados desde o início.
O protagonista baseline `boypunk` preserva 100% dos seus atributos (cooldown 0,34 s, vida 3 ou 4 por dificuldade, colisor 22×32, projéteis 8×8 a 330 px/s e velocidade 150 px/s).
O perfil `support` preserva exatamente o mesmo colisor, mobilidade, projéteis e vida máxima, mas possui cadência normal multiplicada por 1,20 (0,408 s) e ganha uma habilidade ativa de auto-cura:
- Restaura exatamente 1 PV, limitado ao teto da dificuldade (`playerMaxLife`).
- Tempo de recarga de 20 segundos de gameplay ativo, iniciando descarregada no início do nível e no retry.
- Tentativas em vida cheia ou em recarga não consomem carga nem alteram o estado.
- Dano terminal no mesmo tick precede a cura, prevenindo cura após a morte.
- Pausa e aba oculta congelam a contagem de recarga.
- Rajada Dupla opera normalmente com ambos os personagens, respeitando o cooldown individual de cada um.
- Seleção e cura ativas exclusivamente na campanha (`district-neon` e `scrap-factory`). Bônus preserva personagem e desativa cura; Sobrevivência e Demonstração são restritas ao `boypunk`.

Entrada e Controles:
- Ação lógica abstrata `ability` mapeada para Q no teclado (`KeyQ`), botão 4 (LB / L1) no gamepad e botão virtual `✚` (área >= 44×44 CSS px) no touch móvel.
- Assistente de remapeamento de controle atualizado; perfis antigos salvos validados com fallback defensivo.
- `consumeTransitionInput()` absorve confirmação de menu e impede ativações acidentais na largada.
- Preferência persistida sob a chave `boypunk-web-character-v1` com fallback seguro para `boypunk`.

Apresentação e HUD:
- Menu com seletor estilizado em neon cyberpunk e resumo tático/tradeoff traduzido em pt-BR e en.
- Suporte provisório com insígnia de ombro `✚` em esmeralda `#2ee6a8` e aura sutil, com etiqueta honesta "SUPORTE (PROV.)".
- Medidor compacto no HUD abaixo do painel de vida (`Y=73` com Rajada Dupla, `Y=51` sem), sem colidir com Altar, Almas ou power-ups. Deslocamento dinâmico da faixa de avisos (`bannerY`).
- Efeito procedural `heal` (aura radial e `+1 VIDA`), respeitando `prefers-reduced-motion`.
- Contrato de arte formalizado em `PASSAGEM_PERSONAGENS_PARA_ARTE.md`.

Evidências e Validação:
- Checkpoint pré-implementação: `evidencias/recovery/BoyPunk-Web-pre-phase3a-characters-20261028.tar.gz` (`c23b6028c8b8dc49411243f29d023d8013c43222e8bb544175fb6aa75f53341c`).
- `npm run check` 100% limpo; `npm test` com 224/224 testes aprovados em 25 arquivos (14 testes novos dedicados em `tests/characters.test.mjs`).
- 10 evidências de navegador real Chrome CDP gravadas em `evidencias/art/characters/` com `tools/record-character-evidence.mjs`.

---

## Fonte 0.2.6 — Fase 2B: Rajada Dupla — 2026-10-28

Foi adicionado um registro mínimo e extensível `POWER_UPS`, inicialmente com
`double-burst` / **Rajada Dupla**. A coleta concede 10 s ativos, dois projéteis
por ataque aceito e 0,12 s entre eles, preservando o cooldown de 0,34 s e todos
os dados da Bola de Pulso. A direção é capturada na aceitação; o segundo tiro
usa a boca na posição corrente. Recoleta restaura 10 s sem stacking. Cap cheio
descarta a tentativa sem acumular dívida.

Há um único spawn por campanha ao recuperar quatro almas: Distrito
`(180,160)` na fase `alerta`; Fábrica `(372,160)` em `separacao`. O pickup
16×16 permanece 12 s ativos, tem apoio validado e não reaparece após expirar.
Demo, survival, bônus e previews ficam excluídos. Pause/aba oculta congelam os
relógios; morte, vitória, menu, restart e cenas limpam todo estado efêmero, que
não entra em saves ou progressão.

O visual provisório procedural mostra dois núcleos e `×2`; HUD localizado
mostra `Rajada Dupla ×2` e o tempo real. O handoff de arte e contrato 16×16 está
em `PASSAGEM_POWERUPS_PARA_ANTIGRAVITY.md`. Checkpoint pré-implementação:
`evidencias/recovery/BoyPunk-Web-pre-phase2b-double-burst-20261028.tar.gz`
(`80bbd55cddce3d8cbb967866de3c6adcce658fa19be06318ee1355393ac20e3b`).

Validação: `npm run check` aprovado e 24/24 arquivos de `npm test` aprovados.
Os 14 cenários novos cobrem baseline, burst/delay/cooldown, direção/origem,
colisão, refresh, rotas reais dos dois pickups, cap, pause/hidden, lifecycle,
modos excluídos e apresentação. Browser não observado: bind direto retornou
`EPERM`; nenhum ajuste de porta ou segurança foi feito.

---

## Fonte 0.2.6 — ativação de campanha do patrol-shooter — 2026-10-28

A entrega visual de Antigravity foi auditada: 17 frames dedicados 32×32 RGBA,
contato de pés em Y=31, colisor 16×32, pivô estável e boca canônica `(6,13)`.
Os oito quadros de patrulha têm articulação alternada real; o gerador foi
reexecutado e reproduziu hashes idênticos. Os aliases `turret.patrol` pertencem
ao fallback da variante móvel; a torreta fixa continua usando somente
`ready/shooting` e permanece imóvel.

Foi corrigida uma lacuna de apresentação: o estado lógico de fogo de 1/120 s
podia ocorrer entre quadros a 60 Hz. Um latch exclusivamente visual conserva o
frame `patrolShooter.fire.0` por 0,08 s somente após tiro bem-sucedido. Gameplay,
emissor, colisor, warning 0,90 s, recovery 1,25 s, dano e cadência não mudaram;
cap ou LOS negados não mostram flash.

Flags finais: campanha `true`, survival `false`, demo `false`. O diretor alterna
uma torreta fixa e uma móvel nos slots ranged de `confronto`, `reta-final`,
`compactacao` e `expedicao`, mantendo aprendizado, custos, budgets, caps e
contagem de eventos. Falha de rota cai para uma única torreta fixa.

Validação final: `npm run check` e 23/23 arquivos de `npm test` aprovados.
Browser próprio pendente por `listen EPERM`; as evidências Antigravity foram
revisadas separadamente e são staged. Checkpoint pré-ativação:
`evidencias/recovery/BoyPunk-Web-pre-patrol-campaign-activation-20261028.tar.gz`
(`0fb027e76a5a37f941238136fe188b6ae08e7f0913f696de2a77ed8091bc0d30`).

---

## Fonte 0.2.6 — Fase 2A: atirador de patrulha — 2026-10-28

O `shooter` existente foi confirmado como torreta montada e continua imóvel em
campanha, sobrevivência e demo. Foi implementada a variante distinta
`patrol-shooter`, com patrulha apoiada, reversão em bordas/paredes, estados
`patrol/aim/fire/recovery`, mira travada, LOS em sólidos, boca real, uma tentativa
por evento e recuperação segura quando caps ou cadência negam o tiro.

A configuração autoritativa usa 34 px/s, 3 px de folga, 0,75 s de patrulha
mínima, 0,90 s de aviso, 1/120 s de fogo, 1,25 s de recuperação, 210 px de
alcance e projétil de 118 px/s. Dano, saúde, budgets, caps, contagens e tuning da
Fase 1 não mudaram. Rotas apoiadas foram declaradas nos dois níveis, mas a
campanha permanece desativada: não existem frames válidos de locomoção. Os
flags de campanha, survival e demo estão `false`; o preview local isolado é
`?patrol-shooter-preview=1`.

`PASSAGEM_ATIRADOR_PARA_ANTIGRAVITY.md` contém dimensões, pivô, boca, nomes e
frames solicitados. A torreta `ready/shooting` só é reutilizada quando a unidade
está parada; nenhuma pose estática é deslizada. Checkpoint pré-fase:
`evidencias/recovery/BoyPunk-Web-pre-phase2a-patrol-shooter-20261028.tar.gz`
(`af04b59e3ddc50d07abd8a885c31bf802db5564abb2889ac4a5b75ff256718bc`).

Validação final: `npm run check` e 23/23 arquivos de `npm test` aprovados. Uma
falha intermediária do renderer foi reproduzida e corrigida antes do resultado
final. Browser não observado: o bind correto retornou `EPERM`; o checklist e o
comando de preview constam na passagem para Antigravity.

---

## Fonte 0.2.6 — colisão de abertura e pressão da campanha — 2026-10-28

A árvore modular corrente permanece `0.2.6`; releases, portáteis, arte,
`src/renderer.js`, CSS, áudio e HTML gerado não foram modificados. Checkpoint:
`evidencias/recovery/BoyPunk-Web-pre-phase1-collision-balance-20261028.tar.gz`
(`d9eb71fdfab79deebede9352c0bc09bc17b2bbc899194690b5abdfc2795a73bf`).

Foi reproduzido por entradas normais, a partir do spawn, um snag nas duas
aberturas de 64 px ao lado do platô central do Distrito. A resolução horizontal
usava o `y` anterior e zerava a velocidade embora, dentro do mesmo passo de
1/120 s, o colisor 22×32 saísse acima do platô antes de entrar lateralmente. O
colisor ficava 0,01 px fora da borda e, ao soltar a direção, caía ao piso. A
correção em `moveBody` compara os instantes normalizados de saída vertical e
entrada lateral, ignorando apenas o contato lateral que ainda não ocorreu.
Geometria, paredes, faces inferiores, plataformas de mão única e projéteis
continuam sólidos conforme seus contratos.

O ajuste de dificuldade alterou somente intervalos pós-introdução. Distrito:
2,90→2,70 s, 2,55→2,30 s e 2,30→2,05 s. Fábrica: 3,20→3,00 s,
2,95→2,65 s e 2,75→2,45 s. Aberturas seguras, primeiras fases, velocidades,
dano, cooldowns, spawns e limites não mudaram. Fácil/normal/difícil continuam
aplicando 1,25×/1,00×/0,75× uma única vez, com saúde jogador/altar 6/6, 4/4 e
3/3. A simulação equivalente elevou a média ativa pós-introdução no normal de
1,36–1,68 para 1,44–1,88 no Distrito e de 1,24–1,42 para 1,30–1,58 na Fábrica.

Validação final: `npm run check` aprovado e 22/22 arquivos de `npm test`
aprovados. O teste novo falhava antes e agora cobre travessia espelhada por
inputs, timesteps de 1/120 a 0,05 s, parede, face inferior, pouso e descida.
Runtime atual não foi observado: bind direto retornou `EPERM` e Chrome não criou
`DevToolsActivePort`. Abrir fora do sandbox com:
`/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh`.

---

## Build Oficial Definitiva v0.2.5 — 2026-10-26

`package.json`, `src/version.js`, o menu e o teste de prontidão usam agora a
versão autoritativa **`0.2.5`**. Esta consolidação preserva gameplay, física,
colisões, níveis, pontuação, saves e arte, reunindo no artefato definitivo:

- i18n centralizado pt-BR/en e persistência de idioma isolada;
- polimento Tier A final de S6–S9;
- carregador iOS/WebKit sequencial, com timeout, captura de falhas por asset,
  continuidade para opcionais e mensagem visível para falha obrigatória;
- `AudioContext` e reprodução adiados para gesto (`pointerdown`, `touchstart` ou
  teclado), sem fetch ou decode de áudio durante o preload;
- liberação progressiva das strings Base64 de imagens no standalone.

Artefato oficial:

`studio-builds/BoyPunk-Studio-v0.2.5.html`

- 8.405.761 bytes;
- SHA-256 `dca2ff695c3e3ac097a5608bfe30924dfe94f20c6fc1286eaca4d701645ddacc`;
- 17 módulos inline e 83 recursos únicos incorporados;
- compilação inline, completude do manifesto e ausência de dependências externas
  aprovadas por `node tools/verify-studio-build.mjs`;
- `npm run check` aprovado e 166/166 testes declarados aprovados em 20 arquivos.

Os builds 0.2.3/0.2.4, `dist-portable/` e releases históricas permanecem
preservados. Teste físico em iPhone/WebKit segue pendente; Chrome/Firefox
headless foram bloqueados pelo ambiente por `EPERM`/Snap-AppArmor.

## Portátil de estúdio 0.2.3 — 2026-10-26

`package.json` e o menu agora usam a versão `0.2.3`. O pipeline portátil gerou
`studio-builds/BoyPunk-Studio-v0.2.3.html` (6.339.746 bytes; SHA-256
`d54d24f88e1248d5c673e64b09c40e51c4d6e2ab7e5588b3bc02202f1020f62c`).
É um único HTML com 16 módulos, incluindo gamepad, CSS, 77 data URLs, fonte,
imagens e áudio. Uma cópia em pasta `/tmp` teve hash idêntico e passou inspeção
estática de completude, ausência de referências externas e compilação inline.

Runtime `file://` permanece pendente: Chrome/CDP não criou
`DevToolsActivePort`, Chrome direto falhou em Crashpad/`setsockopt` com `EPERM` e
Firefox Snap recusou iniciar sem AppArmor/snapd. Assim, não se declara navegação,
áudio ou gameplay observados no artefato. Fonte modular: `npm run check` e
146/146 testes aprovados. Releases anteriores e portátil histórico preservados;
nenhum ZIP foi criado.

## Gamepad e arquitetura de entrada — 2026-10-26

A fonte do marco de gamepad era `0.2.3-studio.20261026`. `src/gamepad.js` acrescenta
detecção/polling da Gamepad API, mapa standard, perfis genéricos guiados,
dead-zone, eixos/inversão, feedback ao vivo, propriedade explícita do jogador 1
e persistência em `boypunk-web-gamepad-v1`. `src/input.js` agora aceita
provedores associados a slots sem alterar o snapshot consumido pela simulação.
Nenhum segundo jogador/personagem ou loop foi criado.

Menus e gameplay consomem somente o controle selecionado. Conexão prévia/tardia,
desconexão, `null`, reuso de índice, held inputs, foco, visibilidade, demo e
transições possuem tratamento. A desconexão ativa pausa gameplay e limpa ações;
teclado/toque permanecem disponíveis. O menu Opções oferece toda a configuração
em português e informa que a API precisa expor o hardware.

Transferência de saves passa ao formato v2 e inclui somente progressão, áudio e
controle. Formato v1 continua importável sem apagar o perfil novo; schema da
progressão e recordes não mudou. Checkpoint:
`evidencias/recovery/BoyPunk-Web-pre-gamepad-20261026.tar.gz`
(`936f0a695293f239d853513ad6b054aa67785aa6d5ed414fdb9e917c45391ba2`).

Automação corrente: `npm run check` e **146/146 testes** aprovados; gamepads são
mocks, não hardware real. Os launchers normal e bônus falharam antes do browser
porque o sandbox recusou o listener `127.0.0.1:47831` com `EPERM`; o status final
não encontrou servidor ativo. Controle físico segue pendente. Releases e
portátil histórico foram preservados.

## Prontidão de estúdio — 2026-10-26

A fonte naquele marco identificava-se como `0.2.2-studio.20261026` a partir de
`src/version.js`; o menu e health dinâmico consumiam essa mesma constante. Save
transfer naquele marco permanecia restrito às duas chaves BoyPunk e usava rótulos totalmente
em português. Importação inválida não escreve nem aplica preferências; merge e
falhas de storage seguem úteis na sessão.

Touch ganhou instrução visível própria, alvo de 44 px também no volume e teste
com três ponteiros simultâneos. Todas as ações essenciais de menu, opções, pausa,
retry, skip e resultados possuem botão. Foi corrigido um resíduo do retorno da
Câmara ao menu: `levelId`, jogador, altar e tempo são normalizados, além da
limpeza já existente de entidades, projéteis, efeitos e canhão.

Fluxos integrados novos cobrem qualificação, não qualificação, skip, Distrito →
bônus → Fábrica, Fábrica → bônus → menu e pausa/retomada. Os launchers normal e
da prévia falharam por `EPERM` no bind loopback obrigatório; o status final não
encontrou servidor ativo. Não houve migração real ou teste físico Android/iOS.
Checklist, comandos e passos exatos de migração estão no topo de
`RETOMADA_BOYPUNK.md` e em `README.md`.

Validação corrente: `npm run check` e **129/129 testes nomeados** aprovados. A
rota automatizada compartilhada completou 30/30 em 17,408 s; isso não substitui
playtest humano nem observação desta revisão em navegador.

Checkpoint: `evidencias/recovery/BoyPunk-Web-pre-studio-readiness-20261026.tar.gz`
(`3f24bdbb93a4d928812c454436548faefd3149d522bdee376c10a3c85f533595`).
Releases e portátil existente foram preservados; não houve build/publicação.

## Marco de 2026-10-26 — vãos, canhão, mobile e origem estável

O estado atual preserva Distrito Neon, Fábrica de Sucata, arte da fábrica,
valores 4/4, meta 15, demo, progressão e releases. A Câmara usa layout v3 com
vãos alternados de 48/64 px e clipping visual exato; a causa da falha de descida
foi a combinação entre folga curta, resolução horizontal antes da vertical,
tolerância de pouso de 3 px e tiles que extrapolavam larguras não alinhadas.
Existe teste que sobe desde o spawn por inputs reais e desce pelo vão superior,
além de descidas nos dois sentidos em todos os patamares.

O canhão tem ciclo espera 2,8 s → mira travada 0,8 s → tiro → recuperação 2,4 s,
um projétil 8×8 a 132 px/s, proteção 0,8 s e penalidade exclusiva de 1 segundo.
Não causa vida, knockback, perda de alma/pontos nem shake. A rota medida por
`tools/measure-bonus-route.mjs` completou 30/30 em 17,408 s com cinco disparos
evadidos. Menu está centralizado e rolável; touch suporta múltiplos ponteiros,
cancelamento/foco/visibilidade e liberação correta depois de transições, com
alvos mínimos de 44 CSS px. Teste físico em celular continua pendente.

Launchers compartilham `configuracao-servidor.sh` (`127.0.0.1:47831`) e a prévia
mantém `?bonus-preview=1` e isolamento. O servidor confirma raiz canônica antes
de reuso e não escolhe fallback/encerra ocupante da porta. O bind foi tentado,
mas o sandbox retornou `EPERM`; não há listener ou conflito observado. Migração
real do browser segue pendente. Opções exporta/importa apenas
`boypunk-web-progression-v1` e `boypunk-web-audio-v1`; recordes e progresso são
mesclados sem redução. Passos completos estão em `RETOMADA_BOYPUNK.md`.

Checkpoint: `evidencias/recovery/BoyPunk-Web-pre-stable-origin-20261026.tar.gz`
(`5e75555769cae8b1ffd7d77ca5573b7187729e7edadbe9b69fba476e5539e591`).
Validação: `npm run check` e 121/121 testes nomeados aprovados. Releases e
portáteis existentes não foram regenerados.

Atualizado em 2026-10-22. Projeto: `/home/flow/Projetos/BoyPunk-Web`.

## Ponto de recuperação

Antes desta rodada foi preservado:

`/home/flow/Projetos/Backups/BoyPunk-Web/BoyPunk-Web-v0.1.0-pre-musica-fase1-20261022.tar.gz`

SHA-256: `3f123095b47a696dc71161499aefa6d7d242e061ef4d8b557f3e1c4df134a45d`.
O arquivo foi reaberto/listado e contém 102 entradas.

Antes desta rodada de combate foi preservado:

`/home/flow/Projetos/Backups/BoyPunk-Web/BoyPunk-Web-v0.2.0-pre-combate-20261022.tar.gz`

SHA-256: `dafe9c9b0b2a4ea2bcfff612a6734c10ea05a83e25e321a8dbdb04973bfbdc3c`.
O tar foi validado por listagem. O diretório não é um repositório Git; a pasta
preexistente `releases/BoyPunk-Web-v0.2.0 (2)` foi preservada.

## Estado funcional

A fase 1 continua independente do Construct. Menu, opções, créditos, arena,
movimento, salto duplo, ataque, inimigos, projéteis, coleta, depósito, HUD, pausa,
vitória, derrota e reinício estão funcionais nos formatos HTTP e portátil.

Meta oficial: **15 almas depositadas**, definida uma única vez em
`src/config.js`. HTML, HUD, condição de vitória, automação e documentação usam
essa fonte. “18” observado em captura anterior era quantidade carregada/estado de
teste, não regra de vitória.

## Alterações da versão 0.2.0

### Áudio

- música do menu preservada;
- música antiga da partida removida do manifesto;
- `src/music.js` cria “Pulso do Distrito”: 130 BPM, 16 compassos, 29,538 s, Ré
  menor, progressões Dm–Bb–F–C e Dm–Bb–C–A;
- arranjo com kick, snare, hats, baixo duplo, acordes e lead, quatro seções;
- renderização offline, cache do buffer, fade de troca e uma fonte ativa;
- volume/mudo afetam menu, partida e efeitos sem bloquear o jogo em falha;
- pico automatizado: −4,95 dBFS; avaliação auditiva humana segue pendente.

### Ritmo e justiça

- início seguro de 4,5 s e quatro estágios: aprendizado, alerta, confronto e reta
  final;
- orçamento máximo 2/4/5/6 por estágio; perseguidor custa 1 e atirador custa 2;
- limites de 5 inimigos, 12 projéteis e 4 projéteis inimigos no estágio final;
- intervalo global mínimo de 0,72 s entre tiros inimigos;
- atiradores continuam travando a mira antes do tiro e recuperando depois;
- perseguidor não atravessa colisores e salta quando alvo/obstáculo exige;
- efeitos visuais e avisos para acerto, dano, coleta, depósito, progressão e vitória.

### HUD e entrada

- HUD separa `CARREGADAS` e `DEPOSITADAS 0/15`;
- vida e integridade do altar permanecem visíveis;
- `E / botão E` aparece junto ao altar quando há algo a depositar;
- repetição automática de Enter não inicia tela seguinte;
- blur/visibilidade continuam limpando teclas e toques e pausando a partida.

### Portátil

- `npm run build:portable` gera `dist-portable/JOGAR.html` automaticamente;
- módulos, CSS, dados, imagens, fonte e áudios ficam incorporados;
- não há importação, CDN, fetch de arquivo local, localhost ou service worker;
- `npm run build:release` monta pacote versionado com jogo, fontes e documentos.

## Testes desta rodada

- `npm run check`: aprovado;
- `npm test`: 20/20 aprovados;
- HTTP em Chrome headless Linux: aprovado em `http://127.0.0.1:45235/`;
- Chrome validou teclado, movimento, salto duplo, pausa/retomada, cinco derrotas
  por contato, cinco cliques em Tentar novamente, Menu e nova partida;
- perda de foco limpou teclas presas, pausou e retomou sem movimento residual;
- testes de lógica cobrem tiros nos dois sentidos contra alvo parado/em movimento,
  parede, alta velocidade, altura incorreta, dano, invulnerabilidade, pausa,
  derrotas separadas, impactos simultâneos e cinco ciclos de morte/reinício;
- console sem exceções, rejeições ou avisos severos, e todos os recursos HTTP
  foram carregados;
- tentativa de iniciar servidor destacado pelo `iniciar-jogo.sh` neste shell
  gerenciado falhou em `bind` com `EPERM`; o servidor HTTP do teste, iniciado
  pelo runner autorizado, funcionou. Nenhum outro processo foi encerrado.
- `JOGAR.html` extraído do ZIP v0.2.1 abriu por `file://` em Chrome e repetiu os
  mesmos testes. Rastreamento registrou 52 recursos incorporados e zero URLs
  HTTP/HTTPS/localhost/internet.

Não houve audição humana, playtest humano completo, aparelho móvel físico,
Windows, macOS ou outro navegador. Não declarar esses itens como validados.

## Pacote compartilhável

Artefato validado nesta árvore:

`/home/flow/Projetos/BoyPunk-Web/releases/BoyPunk-Web-v0.2.0.zip`

O ZIP v0.2.0 e sua pasta duplicada foram preservados. Correção atual:

`/home/flow/Projetos/BoyPunk-Web/releases/BoyPunk-Web-v0.2.1.zip`

Tamanho aproximado: 6,1 MiB. O checksum exato é mantido no arquivo
`BoyPunk-Web-v0.2.1.zip.sha256`, ao lado do ZIP.
Foi extraído numa pasta temporária fora do projeto e o destinatário abre
`BoyPunk-Web-v0.2.1/JOGAR.html`. O pacote tem fonte em `FONTES/` e instruções em
`LEIA-ME.txt`/`DOCUMENTACAO/`. Para desenvolver: instalar Node.js, entrar em
`FONTES/`, executar `npm test`/`npm run check` e `npm run dev`; para rebuild,
`npm run build:portable` e `npm run build:release`.

O destinatário extrai o ZIP e abre `BoyPunk-Web-v0.2.0/JOGAR.html`. O diretório
solicitado `/home/flow/Distribuicoes/BoyPunk/` estava fora da raiz gravável desta
sessão e devolveu `Read-only file system`; o arquivo não foi falsamente declarado
como copiado. Fora do ambiente restrito, a cópia é:

```bash
mkdir -p /home/flow/Distribuicoes/BoyPunk
cp /home/flow/Projetos/BoyPunk-Web/releases/BoyPunk-Web-v0.2.0.zip* /home/flow/Distribuicoes/BoyPunk/
```

## Republicação de equipe — 0.2.2

Republicação do pacote portátil e documentos para teste de equipe, sem alteração
de gameplay. Release: `releases/BoyPunk-Web-v0.2.2.zip`; abrir
`BoyPunk-Web-v0.2.2/JOGAR.html` após extrair. O relatório incluído separa
automação de avaliação humana. A condição terminal do altar é distinta e
automatizada, mas a clareza de sua apresentação ainda aguarda feedback humano.
Build/check e 20 testes de lógica passaram. O ZIP foi extraído em `/tmp`; `unzip
-t` passou. A automação Chrome falhou antes de abrir o arquivo (`DevToolsActivePort`
ausente) e a captura headless Firefox não concluiu no sandbox, então não afirmar
teste navegador/file:// da 0.2.2. A validação file:// completa mais recente é a
0.2.1. Os ZIPs 0.2.0 e 0.2.1 foram preservados.

## Combate, dano e fim de partida — 0.2.1

- O dano ao jogador e ao altar converge em `applyDamage`. Registro de causa, IDs,
  vida anterior/posterior e retângulos (limitado a 200 entradas), log e overlay
  só são ativados com `?debug=1` (ou no harness `?test=1`).
- O motivo terminal é decidido uma vez ao fim do passo de simulação. Se ambos
  zerarem no mesmo passo, o personagem tem prioridade e a mensagem fica
  “Você foi derrotado”; altar isolado mostra “Altar destruído”.
- Contato do perseguidor agora tem pose curta e efeito “GOLPE”. Projéteis têm
  IDs/facção, colisão varrida relativa aos alvos móveis, parede primeiro em
  empate e feedback de bloqueio. A varredura evita atravessar alvos rápidos.
- Disparo acima/abaixo do alvo não acerta artificialmente. Na reprodução de
  teclado, um disparo alto cruzava o colisor da plataforma central e era
  corretamente bloqueado; o teste passou a exigir o feedback visual, enquanto
  o teste lógico confirma acerto alinhado nos dois sentidos.
- O relato de travamento não foi reproduzido no fluxo HTTP atual. Foi removida a
  finalização imediata dentro de cada chamada de dano para tornar a resolução
  terminal única e previsível. Cinco mortes por colisão e reinícios por botão
  passaram no Chrome. Isso é correção estrutural relacionada, não prova de que
  era o único gatilho do relato original.
- Altar e personagem agora exibem razões distintas. Nenhum dano é aplicado
  durante pausa ou após a transição terminal; invulnerabilidade permanece ativa.

### Causas dos três relatos

1. **Game Over/reinício:** não foi possível reproduzir o travamento relatado. A
   implementação possuía finalização de alvo dentro da rotina de dano, antes da
   resolução terminal comum; isso podia interromper o processamento do mesmo
   passo e foi centralizado. Regressão no navegador: cinco ciclos funcionais.
2. **Vida sem ataque visível:** confirmado no código: o perseguidor aplicava dano
   por sobreposição/cooldown, mas seu desenho permanecia na animação de andar.
   Agora há pose de ataque e aviso de golpe; diagnóstico registra colisão e
   origem do dano.
3. **Tiro que não acertava:** reprodução mostrou o ponto de saída no quadro de
   ataque já dentro do colisor da plataforma; o projétil era removido sem
   explicação visual. Agora a parede bloqueia a primeira colisão com feedback e
   a trajetória é varrida. Tiro desalinhado em altura continua errando.

## Próxima continuação

1. Ouvir a música com fones e caixa, ajustando apenas ganhos se necessário.
2. Fazer três partidas humanas e registrar duração, mortes, depósito e dano no altar.
3. Testar toque num aparelho real e área segura.
4. Consolidar licenças dos recursos herdados antes de distribuição pública.
5. Refinar a fase 1 com os resultados; a fase 2 permanece fora desta versão.

Inicialização normal:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```

## Câmara de Energia e Bola de Pulso — 2026-10-26

### Retomada e proteção

- Não há Git funcional nesta raiz nem `AGENTS.md` aplicável.
- Checkpoint antes da primeira edição da rodada:
  `evidencias/recovery/BoyPunk-Web-pre-energy-chamber-20261026.tar.gz`, SHA-256
  `dfb95cc052a1d0797834bc47b997cc5f4ceba3d30bbf6d8d8c72f9be1be85a7a`.
- A execução foi interrompida por limite de uso; antes de retomar foi preservado
  o estado parcial em
  `evidencias/recovery/BoyPunk-Web-partial-energy-chamber-20261026.tar.gz`,
  SHA-256
  `51440c5ad242772fab478e82c9a1f64dcf72cc3e564001b99e78efdd670bb9cd`.
- `releases/` e `dist-portable/JOGAR.html` não foram gerados nem editados.

### Revisão da Fábrica

Os assets entregues pela Antigravity existem e carregam pelos nomes atuais:
`fabrica-sucata.png` (1365×768 RGB) e `factory-platformtiles.png` (128×128
RGBA). `src/assets.js` registra `world.background.factory` e
`world.tiles.factory`; `src/renderer.js` seleciona ambos pelo tema
`scrap-factory`. A cabeça visual continua derivada de `press.x/y/w/headHeight`
e coincide com o colisor 44×16. Os testes de Distrito, Fábrica, prensa,
progressão, demo, animações e combate permaneceram aprovados. Nenhum bloqueio
confirmado da integração visual exigiu correção.

### Qualificação e arena

- A função pura em `src/bonus.js` calcula 50 pontos pela vitória, +25 para vida
  restante ≥75% do máximo e +25 para altar ≥75% do máximo. O limiar inclusivo é
  75; os máximos vêm do snapshot congelado da vitória.
- Apenas vitória humana com `progressionEligible` pode enfileirar o bônus. Demo
  e fluxo normal de teste/preview permanecem inelegíveis.
- A apresentação de vitória termina em `bonusTransition` somente quando
  qualificada. A tela “Bônus conquistado!” dura 1,35 s (0,35 s com movimento
  reduzido), tem skip focável e consome entrada mantida antes de iniciar.
- `energy-chamber` reutiliza `GameModel.update`, `updatePlayer`, `moveBody`,
  salto duplo, input, renderer e fixed-step. Não existe segundo loop.
- São 20 s ativos, 30 almas `bonus-soul-01..30`, sem altar/inimigos/dano. Queda
  retorna a `(18,208)` e o cronômetro segue. Pausa e página oculta congelam o
  tempo ativo.
- Na entrega v1, a rota real por inputs coletava 30/30 em ~10,9 s. Esse dado foi
  preservado como baseline histórico e foi substituído pelo layout v2 descrito
  abaixo e em `PASSAGEM_BONUS_PARA_ANTIGRAVITY.md`.

### Pontuação, save e navegação

- 10 pontos por alma e +50 em 30/30; máximo 350 por campanha de origem.
- O esquema permanece `version: 1` e aceita saves anteriores sem o novo campo.
  Novo campo: `bonusBestScores: Record<levelId, 0..350>`; `totalBonusPoints` é
  sempre derivado da soma dos melhores.
- `recordBonusResult` altera/grava uma vez apenas quando a rodada supera o melhor
  anterior. Retorna `newlyEarned = novo - anterior`; igual, pior, zero ou skip
  retorna zero e não apaga/regrava o recorde.
- Falha/indisponibilidade de storage mantém os melhores em memória e apresenta
  aviso. Versão futura incompatível continua protegida de sobrescrita;
  preferências de áudio não mudaram.
- Resultado oferece próxima campanha apenas quando origem é Distrito e Fábrica
  está desbloqueada/disponível, replay da campanha de origem e menu. Fábrica não
  cria rota para terceiro nível.
- Saída, replay, menu e novo run limpam entidades, tiros, trilhas, efeitos,
  temporizadores e estado bônus. Cinco ciclos repetidos são cobertos.

### Bola de Pulso

O projétil existente conserva corpo/colisor 8×8, origem, 330 px/s, vida/range,
cooldown, dano e varredura. O renderer acrescenta núcleo ciano/branco dentro do
8×8, trilha ciano de até 6 amostras por 0,12 s (2/0,07 s em movimento reduzido)
e arco laranja sincronizado ao `attackTimer`/facing. `pulseImpact` dura 0,18 s e
só nasce após colisão confirmada com parede/inimigo. Tudo é decorativo e usa o
limite global de 36 efeitos; não foi adicionado shake ou áudio duplicado.

### Verificação separada

- Estática: `npm run check` aprovado.
- Modelo/unidade: `npm test` aprovado, 9 arquivos e 81 testes nomeados. Cobertura
  focal: limites/ratios e snapshot congelado; entrada automática/skip/não
  qualificação; demo/preview; IDs, 0/29/30 almas e 350 pontos; timeout, pausa,
  queda, salto duplo, rota real; recordes/diferença/save falho; navegação estática,
  cinco ciclos; Bola de Pulso sem alteração de corpo/velocidade/dano e impacto
  somente por colisão.
- Browser: não concluído nesta sandbox. O servidor HTTP foi bloqueado com
  `listen EPERM`; Chrome falhou no confinamento Crashpad/sandbox e Firefox Snap
  recusou execução. Não há captura ou aprovação de browser nova.
- Pendente humano: vitória integral por controle humano até a qualificação,
  leitura/ritmo da arena, toque físico, áudio subjetivo, movimento reduzido em
  navegador, mobile/Windows/macOS.

### Entrada direta de desenvolvimento — 2026-10-26

- URL: `?bonus-preview=1`; launcher: `abrir-bonus.sh`.
- A entrada chama o mesmo `startBonusArena` por `startBonusPreview`, mantendo 20
  s, 30 almas, física, renderer, controles, pausa e resultados reais.
- Flags de recompensa/progressão ficam falsas e o handler final apenas apresenta
  o resultado; não chama o save. Restart repete a prévia e Menu limpa o modo.
- `abrir-bonus.sh` delega criação/reuso/health check ao `iniciar-jogo.sh`, lê a
  porta validada e abre a URL direta; aceita `--no-open`, `--status` e `--stop`.
- `npm run check` e `npm test` aprovados após as mudanças atuais: 9 arquivos, 85 testes
  nomeados. O launcher real foi executado, mas o sandbox recusou o bind local com
  `listen EPERM`; o estado PID obsoleto foi limpo por `abrir-bonus.sh --stop`.
  Assim, abertura visual no browser segue não comprovada nesta sessão.

Abrir a fonte atual:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```

## Câmara de Energia — revisão de layout v2 — 2026-10-26

### Proteção e diagnóstico

- Recovery anterior à revisão:
  `evidencias/recovery/BoyPunk-Web-pre-energy-chamber-layout-v2-20261026.tar.gz`,
  SHA-256 `d5d0b51eed129842e016187be469772f6df815abc4b1a144545c8aaa8c57da97`.
- A v1 era fácil por desenho, não por falha de colisão: dez almas formavam uma
  sequência no piso e as demais ocupavam prateleiras horizontais longas. O AABB
  real da alma já era exatamente 15×16, sem raio oculto; o bob visual não movia
  a colisão. Saltar através de uma plataforma de mão única pode coletar uma alma
  sobre ela e continua sendo comportamento normal.
- A moldura âmbar 19×20 é um marcador intencional de alma bônus/acessibilidade,
  não uma hitbox nem debug. O overlay de colisão real segue exclusivo de
  `?debug=1`.

### Layout v2 e rota

- O piso caiu de 10 para 4 almas. A arena agora alterna cinco passagens:
  piso esquerda→direita; faixa baixa direita→esquerda; duas intermediárias em
  sentidos opostos; faixa avançada esquerda→direita.
- As quatro faixas elevadas são ilhas de mão única com apoios de 80–112 px e
  lacunas de 32–48 px. Não há movimento, aleatoriedade, dano ou salto de borda
  obrigatório. Spawn, vão central e retorno seguro não mudaram.
- Distribuição autoritativa: 8 `accessible`, 14 `intermediate`, 8 `advanced`;
  todas mantêm o mesmo valor. Coordenadas completas estão em
  `PASSAGEM_BONUS_PARA_ANTIGRAVITY.md`.
- Rota conservadora por inputs reais, fixed-step 120 Hz e sem teleporte:
  30/30, 350 pontos, 15,275 s, 6 saltos (2 duplos), zero quedas. Ela neutraliza
  o eixo só até estabilizar pousos aéreos. Uma variação agressiva mediu
  13,708 s. São evidências automatizadas de alcance, não playtest humano. O alvo
  de 16–18 s não foi forçado por alterações de física ou colisão.
- HUD permanente termina em y=46; a moldura da alma superior começa em y=54.
  O aviso transitório foi movido para y=247..263 para não encobrir a rota alta.

### Compatibilidade e verificação

- Duração 20 s, 30 IDs, 10 pontos/alma, bônus de 50, máximo 350, best por nível,
  diferença positiva, esquema v1, pausa/foco, queda segura e preview isolado não
  mudaram. Saves existentes não são resetados pela revisão de geometria.
- `npm test`: 9 arquivos, 85 testes nomeados aprovados. O foco novo confirma
  8/14/8, AABB 15×16 sem coleta na borda, unicidade, rota completa e o contrato
  de foco/visibilidade de `bonusPlaying`.
- `npm run check`: aprovado. Sidecars SHA-256 dos ZIPs 0.2.0/0.2.1/0.2.2:
  todos `OK`; `dist-portable/JOGAR.html` continua com SHA-256
  `4a66e2d5a0161c3e81e2a20be41dc2b05792476541e6ed77d070573128c1a671`.
- Browser: `./abrir-bonus.sh --no-open` foi executado, mas a sandbox bloqueou
  `listen` em `127.0.0.1` com `EPERM`. Não há captura ou playtest humano novo.

Abrir diretamente a prévia real e não persistente:

```bash
/home/flow/Projetos/BoyPunk-Web/abrir-bonus.sh
```

## Integração do attract mode funcional — 2026-10-25

### Retomada e recuperação

- A integração de derrota entregue em 24/10 já estava completa e não precisou
  de correção: a animação do jogador chega ao Game Over, inimigo derrotado deixa
  de causar dano no mesmo tick, e retry cria execução limpa. A regressão de
  navegador voltou a cobrir derrota do jogador/altar, simultânea e cinco retries.
- Jogador permanece com início/máximo **4/4** e altar com integridade
  início/máximo **4/4**. Nenhum valor foi incrementado novamente.
- Esta raiz continua sem Git utilizável e sem `AGENTS.md` aplicável. Antes das
  edições foi criado e reaberto o checkpoint
  `evidencias/recovery/BoyPunk-Web-pre-attract-mode-20261025.tar.gz`, SHA-256
  `09e1fd50936108b260649b4b014c6085f75cd34cb0c0d312a133abcb4cac8a6d`,
  com 397 entradas. Releases e portátil foram excluídos do tar para evitar
  duplicação e seus 457 arquivos foram comparados por SHA-256 antes/depois:
  nenhum mudou.

### Comportamento implementado

- A demonstração começa automaticamente depois da carga, silenciosa enquanto o
  navegador ainda não autorizou áudio. Há botão acessível **Assistir
  demonstração** e entrada após 120 s de inatividade apenas no menu visível.
  Interações reais reiniciam o relógio; gameplay, pausa, opções, créditos e
  telas terminais não contam tempo de menu.
- Enter, Espaço, Esc e clique/toque deliberado saem para o menu. A ação é
  consumida, repetição de tecla mantida é bloqueada até `keyup`, e entradas do
  jogador são limpas em toda transição.
- `src/demo.js` fornece RNG local reproduzível, relógio de inatividade,
  controlador por rotas e diretor de recuperação. O controlador usa somente o
  `GameModel.update` existente: move, salta/dá salto duplo, ataca, coleta,
  retorna e deposita, e salta diante de projétil aproximando quando viável.
- Derrota, vitória, 24 s sem progresso ou 90 s de tentativa iniciam uma nova
  execução isolada após 2,4 s. Três falhas consecutivas sem depósito devolvem ao
  menu. Não há teleporte, invulnerabilidade, serviço externo ou segundo loop.
- Sair elimina controle demo e `goToMenu()` limpa inimigos, tiros, almas,
  efeitos e restos. O único armazenamento existente continua sendo a preferência
  de áudio; a demo não escreve progresso/recorde/conquista/estado de run.
- Página oculta suspende fixed-step e relógio de menu; retomada zera acumulador e
  referência de tempo. A mesma instância de áudio troca battle/menu sem fonte
  duplicada e falha de áudio continua não bloqueante.
- A apresentação mantém Canvas lógico 480×270, renderer/assets/HUD compartilhados
  e acrescenta faixa compacta “DEMONSTRAÇÃO — Enter / Espaço ou toque para abrir
  o menu”.

### Arquivos alterados

- `src/demo.js` (novo), `src/main.js`, `src/core.js`, `src/config.js`;
- `index.html`, `styles.css`, `package.json`;
- `tests/demo.test.mjs` (novo), `tools/browser-test.mjs`,
  `tools/build-portable.mjs`;
- `README.md`, `CONTINUIDADE_BOYPUNK_WEB.md` e
  `RELATORIO_BOYPUNK_WEB_PARA_CHATGPT.md`.

### Verificação e evidência

- `npm run check`: aprovado.
- `npm test`: 5/5 arquivos e 42 testes nomeados aprovados. Os seis testes novos
  cobrem semente, relógio controlável de 120 s, jogo autônomo real no modelo,
  derrota/vitória/duração/estagnação, falha persistente/limpeza e cinco ciclos
  demo → menu → jogador → menu.
- Chrome headless HTTP: **45/45 asserções** aprovadas em
  `evidencias/runtime-attract-20261025/browser-test.json`, sem erro/warning grave
  ou recurso faltante. Cobriu startup silencioso, botão manual, limite idle,
  reset por interação, não entrada durante run, consumo de Space mantido,
  saída por ponteiro/toque/Esc, isolamento de `localStorage`, cinco ciclos e toda a
  regressão anterior de combate/animação/áudio.
- Sequência timestamped real do canvas:
  `01-demo-startup.png` e `01-demo-sequence-1..4.png`. No último ponto (14 s de
  fixed-step acumulado), o controlador já tinha 3 abates e 6 almas depositadas;
  as imagens foram abertas e inspecionadas. É uma sequência acelerada dentro da
  página Chrome, não uma gravação em tempo real nem playtest humano.
- O hash dos 457 arquivos em `releases/` e `dist-portable/` permaneceu idêntico.
  Nenhum build, pacote ou publicação foi gerado.

### Limitações honestas

O controlador é reativo e baseado na geometria atual da fase 1. Não planeja
trajetórias ótimas, pode receber dano e pode morrer; a primeira tentativa da
simulação focal depositou 11/15 antes da derrota, e a recuperação ocorreu como
projetado. Não se promete vitória. A visibilidade foi coberta pela lógica com
relógio controlado e pelo caminho `visibilitychange`, mas não houve troca manual
de aba; também não houve playtest humano, aparelho touch físico, avaliação
auditiva, outro navegador ou Windows/macOS.

Abrir o fonte atual:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```

## Protótipo jogável da Fábrica de Sucata — 2026-10-25

### Proteção e arquitetura encontrada

- Não há Git funcional nem `AGENTS.md` aplicável nesta raiz. Foi criado o
  checkpoint `evidencias/recovery/BoyPunk-Web-pre-scrap-factory-20261025.tar.gz`
  (SHA-256 `ac43186df687757d8a9d47f960feff47c76d40d8bc8bdde831be6fdd9dc23464`,
  449 entradas) antes da edição.
- A arquitetura era um único `GameModel`, renderer e fixed-step com geometria
  global. Ela foi estendida por definições de nível; não existe segundo loop nem
  cópia do jogo.
- Distrito Neon, objetivo 15, player 4/4, altar 4/4, assets/animações, preferências
  e modo demonstração foram preservados. A demo é explicitamente iniciada com
  `district-neon`, mesmo se a última partida humana foi na Fábrica.

### Nível e prensa

- `src/level-data.js` agora expõe `district-neon` e `scrap-factory`. A Fábrica
  possui zona segura junto ao altar, cinco almas colocadas, plataformas em três
  alturas, duas rotas de retorno e rota alta opcional. Saltos físicos reais
  confirmam piso → baixa direita → média direita.
- Encontros reutilizam os arquétipos atuais. Abertura 5,5 s, máximo quatro
  inimigos/dez projéteis e quatro estágios por progresso; nenhum dano, IA,
  velocidade ou colisor de personagem foi aumentado.
- Uma prensa em `(218,128)`, cabeça `44×16`, fecha até `y=208`. Ciclo:
  observação inicial 4,0 s; Idle 2,8 s; Warning 1,25 s; Closing 0,65 s; Recovery
  1,35 s. Só Closing dá um dano por ciclo e respeita invulnerabilidade. Altar e
  inimigos são imunes. Pausa e restart usam o relógio/limpeza comuns.
- A aparência industrial e a prensa são desenho Canvas identificado como
  protótipo. Contrato integral para arte: `PASSAGEM_FABRICA_PARA_ANTIGRAVITY.md`.

### Progressão, telas e ciclo de vida

- `scrap-factory` mantém o ID e save v1 compatível; agora tem `available: true`,
  ainda separado de `unlocked`. O menu só habilita o botão quando ambos são
  verdadeiros.
- Vitória no Distrito oferece continuidade direta para a Fábrica. Vitória na
  Fábrica grava sua conclusão idempotente e não cria terceiro nível.
- Retry usa `model.levelId`. Vitória e Game Over mostram nome/objetivo/valores do
  nível atual; a Fábrica não exibe cartão de próxima fase inexistente.
- Saída/retry/menu recriam ou removem prensas, entidades, efeitos e callbacks pelo
  lifecycle existente. Música continua com uma fonte e preferências intactas.

### Verificação separada

- Estática: `npm run check` aprovado.
- Automatizada: `npm test` aprovou 7/7 arquivos e 65 testes nomeados. Cobertura
  nova: seleção/retry, geometria, movimento e salto duplo reais, travessia segura,
  contato real com a prensa, fases/janelas de dano, pausa/reset, imunidades,
  vitória 15/15, save da Fábrica e isolamento do attract mode.
- Runtime: o Chrome encerrou antes de carregar a página por restrição do Crashpad
  do ambiente (`setsockopt: Operation not permitted`); Firefox/GeckoDriver Snap
  também não pôde fornecer automação/captura confiável. Não se inventou resultado
  de navegador. `tools/browser-test.mjs` foi ampliado para o fluxo Distrito →
  Fábrica, rotas, prensa, vitória, derrota, retry e reload, mas essa versão ainda
  requer execução em ambiente com Chrome funcional.
- Pendente humano: sensação do timing, leitura do warning, acabamento visual,
  áudio subjetivo, touch físico e plataformas/SOs adicionais.
- Evidência temporal do fixed-step: 12 amostras em
  `evidencias/runtime-scrap-factory-20261025/model-sequence.json`; gerador
  reproduzível `tools/factory-model-evidence.mjs`. Não é rotulada como browser.

Arquivos principais: `src/level-data.js`, `src/core.js`, `src/renderer.js`,
`src/progression.js`, `src/demo.js`, `src/main.js`, `index.html`, `styles.css`,
`tests/levels.test.mjs`, testes existentes, `tools/browser-test.mjs`,
`tools/factory-model-evidence.mjs`, `package.json`, `README.md`,
este documento, relatório e passagem Antigravity. Nenhum pacote/release foi
gerado.

Abrir a fonte atual:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```

Encerramento:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh --stop
```

## Investigação da derrota no canto inferior direito (pós-0.2.2)

Reprodução controlada no `GameModel` com diagnóstico ligado: vida do jogador
iniciada em 2, jogador no canto inferior direito e atirador em `(24,144)`. A
torre tinha travado a mira na posição anterior do jogador no piso central
(`aim=(190,224)`); ao fugir para o canto, cada projétil percorreu de `(32,152)`
com velocidade aproximada `(107.95,47.66) px/s` e levou cerca de `1.558 s` até
colidir pela primeira vez com o altar em `(200,226.18)`. O projétil tem AABB 8×8;
o altar ocupa `x=208..240, y=192..240`. O corpo do tiro visual é 8×8 (sprite
16×16 reduzido), com halo desenhado um pouco maior.

O trecho válido passa abaixo da plataforma sólida `x=144..304, y=176..192`:
quando chega ao início horizontal dela, o topo do projétil já está abaixo de
`y=192`. Em contraste, um tiro da mesma torre mirando diretamente o canto é
bloqueado nessa plataforma antes de atingir jogador ou altar. A telemetria da
torre é apenas apresentação: nenhum dano ocorre no estado `telegraph`; o dano
só acontece após criar projétil e encontrar o primeiro alvo pela varredura.
Um tiro é marcado removido antes da aplicação de dano e cada um retirou um ponto
do altar, respeitando 1,2 s de invulnerabilidade. Três tiros válidos resultaram
em `Altar destruído`, altar 0 e personagem ainda com 2. Não foi encontrada
entidade removida/fora de tela/de outra execução causando dano.

Melhorias locais ainda sem release: o impacto agora pisca a moldura do altar,
vida 1 mostra aviso persistente “ALTAR EM PERIGO — 1 IMPACTO PARA CAIR”, o aviso
tem alarme sintetizado em Web Audio sujeito a volume/mudo, e o menu/início
explicam que perder vida ou altar encerra a partida. O registro debug inclui
origem, início e fim da trajetória, fração de impacto, tempo de voo, vetor,
IDs e áreas de colisão. Os ZIPs 0.2.0, 0.2.1 e 0.2.2 continuam preservados; o
0.2.2 não contém estes ajustes. Não gerar/distribuir uma nova release antes de
validar e empacotar explicitamente a próxima versão.

Verificações após a mudança: `npm run check`, 24/24 testes de lógica e Chrome
headless via HTTP em `http://127.0.0.1:38211/` (22/22 asserções, sem recursos
faltantes nem eventos graves de console). O novo teste de modelo usa as rotinas
reais de spawn, telegraph, projétil varrido e dano; não atribui diretamente o
estado terminal. A captura automatizada Chrome cobre fluxos gerais, não capturou
visualmente o cenário fatal específico. Vida 2 foi estado inicial reproduzido;
a origem desse dano anterior no relato do usuário continua desconhecida.

## Atualização Visual Cyberpunk — Fase 1 e Inimigos (2026-10-22)

Ponto de recuperação antes da atualização visual:
`/home/flow/Projetos/Backups/BoyPunk-Web/BoyPunk-Web-v0.2.1-pre-art-upgrade-20261022.tar.gz`
SHA-256: `5472be2c612bb3d4a50ab2bf391cf161e6f391719506dd868d9a66e677424701`.

Backups de assets originais criados:
- `assets/images/enemies-original/` (21 arquivos)
- `assets/images/world-original/` (14 arquivos)

### Resumo das Modificações:
1. **Perseguidor (`chaser` / `enemycaveira`):** Substituído o placeholder cinza por droid de combate bipedal ágil com carcaça de grafite, visor âmbar linear e condutor ciano torácico. 5 estados completos implementados (`idle`, `walk`, `jump`, `attack`, `dead`) em 16×32 px.
2. **Atirador (`shooter` / `enemytorreta`):** Substituída torreta estilo gumball por sentinela robótica pesada blindada com visor âmbar e canhão de partículas. Implementados `ready`, sequência de disparo em 4 fases (`shooting-000` a `shooting-003`) com recuo mecânico e resfriamento, e sequências de pod retrátil (`created`, `out`).
3. **Projétil Inimigo (`enemy.bullet` / `enemybalabasic`):** Esfera de plasma cinético com casca magnética laranja e halo violeta em 16×16 px (hitbox 8×8).
4. **Cenário do Distrito Neon:** Fundo industrial com skyline noturno em camadas e baixo contraste. Tileset `platformtiles.png` redesenhado com painéis metálicos e rebites industriais. Faixas luminosas neon em ciano (plataformas unidirecionais) e laranja (plataformas sólidas). Passagem de reflexo suave de piso molhado no deque inferior (`y >= 240`). Viewport 480×270 px rigorosamente preservado.
5. **Cobertura de Arquétipos:** Inimigos voadores e rastejantes e modo demo foram catalogados como ausentes no código funcional e devidamente documentados em `PASSAGEM_VISUAL_PARA_CODEX.md`.
6. **Validação:** `npm run check` (aprovado), `npm test` (24/24 aprovados), teste de navegador real via Chrome headless (`tools/browser-test.mjs`, APROVADO). Evidências geradas em `evidencias/art/`.

## Correção da Locomoção e Ciclo de Andar dos Inimigos (2026-10-22)

Defeito relatado: Inimigos moviam-se deslizando como sprites estáticos sem ciclo de passada visível.

### Causas Raiz Identificadas:
1. `enemycaveira-walk` continha apenas um único quadro estático (`enemycaveira-walk-000.png`) herdado do protótipo.
2. `src/assets.js` registrava um único frame `chaser.walk`.
3. `src/renderer.js` buscava `chaser.walk` estaticamente sem calcular índices de animação.
4. `src/core.js` não mantinha tempo de locomoção acumulado no perseguidor.

### Correções Implementadas:
1. **Novo Ciclo de Locomoção (8 quadros @ 12 FPS):** `enemycaveira-walk-000.png` a `007.png` cobrindo contato alternado, recuo mecânico com depressão de 1px nos quadros 1 e 5, apoio médio, extensão de passada e estabilização da lâmina.
2. **Ciclo de Repouso (2 quadros @ 3 FPS):** `enemycaveira-iddle-000.png` e `001.png` com pulso do sensor ótico.
3. **Mapeamento em `src/assets.js`:** Adicionado `chaserFrames("walk", 8)` e `chaser.idle.0..1`.
4. **Tempo de Animação em `src/core.js`:** `enemy.animTime` acumula `dt` proporcionalmente à velocidade de solo (`Math.abs(enemy.vx) > 4`), preservando continuidade sem estalos ao virar de direção.
5. **Renderizador `src/renderer.js`:**
   - Adicionado `CHASER_ANIMATIONS` com 8 quadros e velocidade 12 FPS.
   - Sincronização estrita com o relógio de simulação (`model.elapsed`), pausando cineticamente quando a partida é pausada e operando de forma idêntica em monitores de 60Hz, 120Hz ou 144Hz.
   - Fases de recuo da torreta vinculadas ao `phaseTime` de recuperação (4 fases em 0,28 s).
6. **Validação:** `npm run check` e `npm test` (24/24) aprovados. Gravação em tempo real no Chrome headless via HTTP gerada em `evidencias/art/in_game_gameplay_locomotion.gif` e folha de contato rotulada em `evidencias/art/chaser_locomotion_contact_sheet.png`.

## Auditoria técnica de animação — 2026-10-23

Ponto de recuperação antes das correções:
`/home/flow/Projetos/Backups/BoyPunk-Web/BoyPunk-Web-pre-enemy-animation-debug-20261023.tar.gz`
SHA-256: `ae8a3b53145a90dae732514f7e6c0b1285b13649e7ce8fc89aa3b91925781a1`.
Contém fontes, assets recentes, releases e `dist-portable`. Nenhum release ou
`dist-portable/JOGAR.html` foi modificado nesta rodada.

### Auditoria

O relato de pose congelada não foi reproduzido no snapshot atual. O servidor
Chrome testado serviu esta pasta via HTTP com `Cache-Control: no-store`, todos os
assets carregaram, e o renderer registrou os frames realmente desenhados. O
perseguidor tem 8 poses walk distintas de 16×32, e o player 4 poses walk distintas
de 64×96. A folha de contato mostra mudanças articuladas de pernas/braços, não
apenas hash diferente. A causa original do relato permanece sem confirmação;
cache ou versão antiga é hipótese, não conclusão.

A integração tinha relógios inconsistentes: o perseguidor acumulava tempo de
locomoção condicionado a velocidade/chão, outros estados dependiam do relógio de
renderização, e o player também escolhia quadros pelo tempo global. Isso dava
fase arbitrária em transições e divergência entre estados; foi corrigido, mas
não é evidência suficiente para dizer que isso sozinho congelava a caminhada.

### Correções e arquivos

- `src/animation.js`: definições compartilhadas, seleção de estados por movimento
  e clock por entidade, zerado somente ao entrar em outro estado;
- `src/core.js`: player e chaser avançam com o delta da simulação; pausa congela,
  retomada continua, remoção encerra a entidade, reinício cria estado limpo;
- `src/renderer.js`: seleção baseada no clock local, mantendo facing, escala,
  origens e apresentação/tempo de ataques. Fallback para assets singulares
  `chaser.attack` e `chaser.jump` corrigido;
- `src/main.js`: amostragem de estado/frame/arquivo/facing/tempo e ID somente em
  modo de teste/debug;
- `tools/build-portable.mjs`: novo módulo incluído na lista de build para uso
  futuro; o build portátil não foi executado;
- `tools/browser-test.mjs`, `tools/server.mjs`: regressão de navegador com duas
  instâncias de perseguidor, sentidos opostos, relógios distintos e pausa;
- `tests/animation.test.mjs`: estados, taxas, transições, independência dos clocks,
  pause/resume e reinício.

Não se alteraram IA, velocidade, dano, saúde, colisão, objetivos nem balanceamento.
O ataque visual do jogador reproduz quatro frames a 22 fps dentro da janela
existente de 0,18 s; lógica/cooldown continuam iguais.

### Evidência/testes

- `npm run check`: aprovado; `npm test`: aprovado (testes novos e de gameplay);
- Chrome headless Linux via HTTP em `http://127.0.0.1:33905/`: 27/27 asserções
  aprovadas, incluindo assets, movimento/salto/ataque, player e chaser em ambas as
  direções, clocks independentes, pausa, áudio e cinco ciclos Game Over/restart.
  Sem erros, rejeições ou warnings severos;
- capturas timestamped em
  `evidencias/runtime-animation-20261023-complete/locomotion-2026-10-23T03-21-59.788Z-01.png`
  e `...-02.png`; amostras em `browser-test.json`. São capturas reais do jogo com
  diagnóstico visível, não gravação de vídeo;
- tentativas intermediárias tiveram `bind EPERM` e uma fixture inicial de browser
  alterou a posição de tiro; ambas foram corrigidas antes da execução completa
  aprovada. Sem playtest humano/frame-a-frame, outro navegador, Windows, macOS ou
  dispositivo móvel.

### Entrega de Direção de Arte e Biomecânica (2026-10-23) — Antigravity

- **Ponto de recuperação desta rodada:**
  `/home/flow/Projetos/Backups/BoyPunk-Web/BoyPunk-Web-checkpoint-art-director-20261023123145.tar.gz`
  SHA-256: `4d9c2be4976d17eff2266f6d791c6678d4f504379eacc61f6bb75de8fd9bfdaf`.

- **Perseguidor Humanoide (`enemycaveira` / `chaser`) — Concluído:**
  - **Construção:** Cabeça e pescoço articulados com viseira âmbar virada à direita, peitoral com reator ciano ativo, cintura estreita com pistões expostos, pelve mecânica com encaixe de quadris e braços com lâmina de choque e contrabalanço com sombreamento de profundidade. Joelheiras e articulações mecânicas com chanfros de placa e fendas escuras, sem brilhos fluorescentes supérfluos.
  - **Caminhada (8 quadros a 12 FPS):** Ciclo biomecânico completo (contato, absorção com depressão de 1px, passagem com joelho flexionado e pé erguido a 5px do solo, impulsão e alcance para ambos os lados). Eliminada a duplicidade anterior dos quadros 5==1, 6==2 e 7==3 e o tronco congelado.
  - **Ataque (4 índices a 22 FPS):** Integração completa na janela de 0,18 s,
    mas a auditoria posterior constatou que `attack-001` e `attack-002` são PNGs
    byte a byte idênticos. A pose de impacto distinta descrita originalmente não
    foi entregue de fato.
  - **Salto e Repouso:** Pose aérea com joelhos flexionados à frente e postura de guarda rebaixada.
  - **Integração:** `src/animation.js` e `src/assets.js` atualizados com contrato transparente para fallback.

- **Evidências Visuais e Comparativos:**
  - `evidencias/art/chaser_before_after_comparison.png`: Comparativo 4× direto das 8 poses antigas contra as novas.
  - `evidencias/art/chaser_locomotion_contact_sheet.png`: Folha de contato de passada com marcação de solo `y=31`.
  - `evidencias/art/chaser_attack_contact_sheet.png`: Folha de contato dos 4 quadros de ataque.
  - `evidencias/art/chaser_contact_sheet.png`: Folha de estados completa.
  - `evidencias/art/gameplay_preview.png` e `gameplay_action.png`: Capturas em tempo real no Chrome headless demonstrando alinhamento estrito em ambos os sentidos e golpe ativo.

- **Testes e Conformidade:**
  - `npm run check`: Aprovado (100%).
  - `npm test`: 28/28 testes aprovados (100%).
  - `node tools/server.mjs --root . --browser-test`: 27/27 asserções aprovadas no Chrome headless.
  - Releases e `dist-portable/JOGAR.html` preservados intactos.

Comando para abrir a versão atual do fonte, não o artefato portátil antigo:
`/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh`.

## Auditoria de retomada — 2026-10-23

### Recuperação e fonte de verdade

- Esta raiz não é um checkout Git utilizável: `.git` não contém metadados e
  `git status` retorna “not a git repository”. Nenhuma alteração local pôde ser
  classificada ou restaurada por Git.
- Antes das edições foi criado e validado o checkpoint
  `evidencias/recovery/BoyPunk-Web-pre-resume-audit-20261023.tar.gz`, com SHA-256
  no sidecar homônimo. Ele inclui a fonte, assets, evidências, portátil e releases
  encontrados, sem descartar trabalho existente.
- O desenvolvimento atual deve ser aberto por `iniciar-jogo.sh`. O launcher usa
  porta livre, valida PID/raiz/`health.json`, reutiliza apenas a instância deste
  projeto e serve com `Cache-Control: no-store`. Não havia servidor válido ativo
  no início/fim desta auditoria.

### Estado comprovado

| Área | Estado | Evidência atual |
|---|---|---|
| Player: idle/walk/attack/hurt | Implementado e verificado | 4/4/4/3 frames mapeados; walk com 4 PNGs únicos; clock local e testes de estado |
| Player: jump/fall | Parcial | 1 frame em cada estado |
| Player: death | Parcial | 3 PNGs 64×32 existem, mas não há estado de morte no seletor e os demais frames são 64×96 |
| Chaser: idle/walk | Implementado e verificado | 2/8 frames; 8 PNGs walk únicos; 12 fps; runtime Chrome de 15:09 e regressão atual |
| Chaser: attack | Implementado e verificado | 4 poses distintas e únicas (104px diff entre 001 e 002); clock 22 fps; verificado em runtime Chrome |
| Chaser: jump/dead | Parcial | 1 pose de salto; 1 pose de morte não exibida porque a entidade é removida imediatamente |
| Shooter | Implementado, visualmente incompleto | ready 1 e shooting 4 em uso; created 5 registrados sem estado; out 5 presentes e não registrados |
| Projétil inimigo | Implementado e verificado | 1 frame 16×16; colisão varrida e dano cobertos por testes |
| Vida/altar | Implementado e verificado no valor atual | início=máximo=4 para jogador e altar, conforme alvo absoluto autorizado em 2026-10-24 |
| Feedback do altar | Implementado e verificado por automação | flash/texto de dano, faixa persistente em 1 HP, som de alerta, motivo terminal próprio |
| Áudio | Implementado e verificado | menu, gameplay procedural, SFX, volume/mudo e uma fonte procedural ativa no último runtime Chrome |
| Controles | Implementado e verificado | teclado, toque, pausa, retomada e limpeza de entrada ao perder foco |
| Modo autônomo/attract | Não implementado | nenhuma rotina, estado ou temporizador correspondente existe na fonte |
| Distribuição | Desatualizada | `dist-portable` e releases 0.2.0, 0.2.1 e 0.2.2 antecedem código/assets de animação de 23/10 |

O pedido histórico não foi inferido como incremento. Em 2026-10-24 foi recebido
o alvo absoluto explícito 4/4, aplicado uma única vez em `src/config.js` e
propagado por `startRun`, HUD, instrução do menu e testes.

### Correção técnica e validação desta retomada

- Não foi encontrado defeito remanescente de mapeamento, seleção de estado ou
  reset contínuo dos timers. `src/animation.js`, `src/core.js`, `src/assets.js` e
  `src/renderer.js` usam os assets e clocks locais entregues anteriormente.
- `tests/assets.test.mjs` foi adicionado para validar o contrato entre definições,
  manifesto, arquivos PNG, dimensões e unicidade das caminhadas. O teste de
  animação agora comprova que os quatro índices de ataque são alcançáveis dentro
  da taxa configurada. Nenhuma IA, velocidade, dano, colisão ou timing mudou.
- `npm run check`: aprovado. `npm test`: 3 grupos de arquivo aprovados. Execução
  direta dos arquivos: 32/32 testes nomeados aprovados (3 assets, 5 animação e
  24 gameplay).
- A evidência corrente está em `evidencias/runtime-health4-20261024/`: Chrome
  HTTP aprovou 29/29 asserções, sem asset ausente ou evento severo de console.
  O relatório registra quatro frames/asset keys do ataque, cinco retries com
  restauração 4/4 e instrução/HUD com os novos máximos.
- Testes de modelo cobrem movimento, ataque, dano, coleta, depósito, vitória,
  derrotas separadas, pausa, reinício e limites do encontro. O runtime Chrome
  cobre movimento, salto, ataque, pausa/retomada, perda de foco, derrota, menu,
  reinício e áudio. Não houve playtest humano/auditivo, mobile ou outro SO.

### Resolução da Correção Visual do Ataque — 2026-10-23 (Antigravity)

- **Ponto de recuperação antes da edição:**
  - `evidencias/recovery/enemycaveira-attack-002-original.png` (SHA-256 `2f1a65b2168286ae60ff01592ca950a76b0312a17701cc02f8958665a2d43673`);
  - `evidencias/recovery/BoyPunk-Web-pre-attack002-correction-20261023.tar.gz` (SHA-256 `9b09188d2ffd7e8d90a38502e9c6aee9715c1d53c2c512705b45e3d208b365f7`).
- **Arquivo corrigido:**
  `assets/images/enemies/enemycaveira-attack-002.png`
  SHA-256: `f0d5c84e77704c415b89a757be9b22ea8f551cd3957a0b0296c236763fb1774a`.
- **Anatomia & Biomecânica:**
  - Canvas 16×32 RGBA, fundo transparente, pés em `y = 31` (`(0, 31)` e `(9..13, 31)`), voltado para a direita.
  - 104 pixels distintos em relação ao quadro 001.
  - Ombro de ataque projetado à frente em 1px (`x=8, y=13`), cotovelo estendido em horizontalidade completa (`x=10, y=13`), punho travado (`x=11, y=14`) com lâmina em alcance máximo (`x=12..15`) e faíscas de impacto no plano alvo.
  - Braço traseiro chicoteado para trás/alto (`(0, 13)`) em contrabalanço cinético;
  - Joelho dianteiro flexionado absorvendo carga (`x=10, y=24`) sobre a bota plantada; perna traseira estendida em lunge de ancoragem com ponta em `(0, 31)`.
  - Paleta restrita a 15 cores oficiais BoyPunk (0 cores ilegais).
- **Validação e Testes:**
  - `npm run check`: Aprovado (100%);
  - `npm test`: 32/32 testes aprovados (100%), incluindo proteção de unicidade de `chaser.attack` em `tests/assets.test.mjs`;
  - Chrome headless HTTP (`node tools/server.mjs --root . --browser-test`): **APROVADO (27/27 asserções)**;
  - Inspeção de runtime com CDP (`tools/inspect-runtime-attack.mjs`): confirmado renderização de `assetKey: 'chaser.attack.2'` durante `attackFlash` em `animTime = 2/22`.
- **Evidências Visuais:**
  - `evidencias/art/chaser_attack_before_after_contact_sheet.png` (comparação completa antes/depois 1×, 4× e 6×);
  - `evidencias/art/chaser_attack_contact_sheet.png`;
  - `evidencias/art/chaser_attack_animation_preview.gif`;
  - `evidencias/art/runtime_attack_frame_0..3.png` e `evidencias/art/runtime_attack_chaser_crop.png`.
- **Limitações e Preservação:**
  - Releases e `dist-portable/JOGAR.html` preservados sem build;
  - Vida, dano, colisões, IA e balanceamento inalterados;
  - Nenhum outro personagem redesenhado. Próxima abertura do fonte: `/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh`.

## Integração de saúde 4/4 e revisão final de animação — 2026-10-24

### Recuperação

Antes das edições foi criado e validado
`evidencias/recovery/BoyPunk-Web-pre-health4-integration-20261024.tar.gz`
(SHA-256 `2fe3ecb7ece2b5047b3626bca1f78b7f45ecf8631d4c609af1543399a382cffb`).
O checkpoint inclui a nova arte de impacto de Antigravity, releases e portátil;
somente `.git` vazio e checkpoints anteriores em `evidencias/recovery/` foram
excluídos para evitar recursão. Os hashes de distribuição foram conferidos
antes/depois.

### Alterações

- `src/config.js`: `player.maxLife = 4` e `objective.altarMaxLife = 4`; meta de
  15 almas e todos os outros parâmetros de balanceamento permanecem iguais;
- `src/main.js` e `index.html`: instrução do menu recebe os dois máximos da mesma
  configuração; `startRun()` já inicializava jogador/altar desses valores;
- `tests/core.test.mjs`: dano, motivos de derrota e cinco ciclos de retry agora
  usam os máximos autoritativos e exigem explicitamente o alvo 4/4;
- `tools/browser-test.mjs`: exige 4/4 no início, retry e retorno do menu; exige
  quatro danos por derrota; valida os quatro frames e `assetKey` reais do ataque;
- `tools/inspect-runtime-attack.mjs`: corrigida a instrumentação que antes podia
  ler uma amostra anterior/avançar 60 ms. Agora pausa a simulação, aguarda render,
  exige frame e asset key correspondentes e limpa o perfil temporário.

Nenhuma IA, velocidade, hitbox, dano por impacto, invulnerabilidade, duração de
ataque, colisão ou objetivo foi modificada.

### Evidência separada

- **Estática:** os oito PNGs walk e os quatro attack são distintos por pixels;
  `attack-001`/`002` diferem em 104 pixels. Manifesto e renderer mapeiam os quatro
  índices a 22 fps.
- **Automatizada de modelo:** 32/32 testes nomeados aprovados. Jogador e altar
  chegam a zero em quatro danos, produzem respectivamente “Você foi derrotado” e
  “Altar destruído”, e um novo run/retry restaura ambos para 4/4.
- **Browser real HTTP:** 29/29 asserções aprovadas em Chrome, relatório em
  `evidencias/runtime-health4-20261024/browser-test.json`. Foram observados HUD
  com quatro indicadores legíveis, caminhada/facing, ataque 0–3 incluindo
  `chaser.attack.2`, pausa/retomada, derrota, menu, áudio e cinco retries 4/4.
- **Não observado manualmente:** não houve playtest humano/auditivo, mobile,
  Windows ou macOS. A derrota do altar e a vitória foram verificadas pelo modelo,
  não por interação humana no navegador nesta rodada.

### Arte ainda incompleta, sem falsa conclusão

- player jump e fall: um quadro cada; die: três PNGs 64×32 sem estado ativo;
- chaser jump: um quadro; dead: um quadro removido imediatamente pelo gameplay;
- torreta: ready/shooting em uso; created registrado mas sem estado; out presente
  e não registrado. Nenhuma dessas lacunas foi mascarada com bounce/stretch.

Não houve demo, nova fase, build portátil ou release. Para abrir a fonte atual:
`/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh`.

---

## Conclusão da Arte de Animação de Personagens — 2026-10-24 (Direção de Animação / Arte Técnica)

### Recuperação e Preservação

- **Tarball de recuperação antes da alteração:**
  `evidencias/recovery/BoyPunk-Web-pre-art-completion-20261024.tar.gz`
  (SHA-256 `3891f24468b6ccbb32df7779da525d1c6f1f2fb05ca091209181c0aa83de049c`).
- **Cópias originais preservadas:**
  - `evidencias/recovery/enemycaveira-dead-000-original.png` (SHA-256 `3331c2f70a5b89d9cb940336be8e4cbca1042c48b91d3094df7f8905689e5058`);
  - `evidencias/recovery/playeranim-die-000..002-original-64x32.png` com hashes SHA-256 arquivados.

### Resolução de Arte e Contratos Técnicos

1. **Derrota do Jogador (`player.die.0..3`):**
   - Corrigido o defeito estrutural de canvas 64×32: criados 4 quadros canônicos em **64×96 RGBA** com linha de solo estritamente ancorada em `y = 63` (`bbox max_y = 64`), eliminando o estiramento vertical 3× e o afundamento no deque.
   - Poses articuladas: `000` (recuo de impacto cinético com viseira ciano em clarão e afrouxamento da arma), `001` (colapso de centro de gravidade, flexão de joelho ao solo e arma tombando no ar), `002` (impacto contra o deque com ricochete cinético das pernas) e `003` (repouso inerte no piso com arma desprendida e viseira apagada).
   - Recorte de compatibilidade 64×32 preservado em `assets/images/player-helmet/compat-64x32/`.
2. **Derrota do Perseguidor (`chaser.dead.0..3`):**
   - Substituída a pose estática única por sequência de 4 quadros em **16×32 RGBA** mantendo a base em `y = 31` e a paleta de 15 cores: `000` (ruptura do reator com clarão ciano e glitch no visor âmbar), `001` (perda hidráulica, flexão de joelho ao solo e lâmina tocando o piso), `002` (colisão contra o deque e faíscas) e `003` (sucata inerte desativada, 100% alinhada à silhueta original).
3. **Estados Aéreos (`jump` / `fall`):**
   - Confirmada a excelência visual da distinção entre subida (`jump`) e descida com inclinação de 1 px (`fall`) no jogador (251 pixels de diferença), bem como o salto curto do perseguidor (`jump`). Mantidos intactos sem necessidade de alterações.
4. **Sequências da Torreta (`created` / `out`):**
   - 10 quadros existentes (5 de implantação e 5 de retração, 16×32) verificados como adequados à identidade grafite/neon; mantidos intactos, documentando para Codex o requisito de integração à máquina de estados.
5. **Locomoção e Ataques:**
   - Todos os ciclos ativos preservados: Player idle (4f), walk (4f), attack1 (4f), hurt (3f); Chaser idle (2f), walk (8f), attack (4f com impact 002 corrigido).

### Ferramentas, Visualizador e Testes

- **Scripts:**
  - `tools/build-player-die-sprites.py`: gerador determinístico das 4 poses do jogador.
  - `tools/build-chaser-sprites.py`: atualizado com a geração das 4 poses do chaser.
  - `tools/create-defeat-comparisons.py`: gerador de folhas de contato e GIFs de auditoria.
  - `tools/animation-viewer.html`: visualizador isolado em HTML/JS de desenvolvimento (zoom 2×–8×, linha de solo, espelhamento, controle de FPS).
  - `tools/test-animation-viewer.mjs`: teste em Chrome headless via CDP aprovado.
- **Evidências Visuais (`evidencias/art/`):**
  - `player_defeat_contact_sheet.png`, `player_defeat_before_after_contact_sheet.png`, `player_defeat_animation_preview.gif`.
  - `chaser_defeat_contact_sheet.png`, `chaser_defeat_before_after_contact_sheet.png`, `chaser_defeat_animation_preview.gif`.
  - `complete_character_animations_overview.png`, `animation_viewer_player_preview.png`, `animation_viewer_chaser_preview.png`.
- **Testes Automatizados:**
  - `npm run check`: APROVADO (100%).
  - `npm test`: 33/33 testes aprovados, incluindo unicidade e dimensões em `tests/assets.test.mjs`.
  - `node tools/server.mjs --root . --browser-test`: APROVADO (29/29 asserções de gameplay intactas).

### Preservações e Limitações

- Vida do jogador (4/4) e integridade do altar (4/4) estritamente preservadas.
- Nenhuma mecânica, IA, hitbox, áudio, objetivo ou fase foi modificada.
- Não foi implementado modo demo nem novos pacotes de release.
- A reprodução em tempo real das animações de morte (`die` e `dead`) depende da integração da máquina de estados por Codex. Para inspecionar visualmente em isolamento, utilize o visualizador dedicado.

Comando para abrir a partida de desenvolvimento:
`/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh`.
Visualizador isolado de animações:
`tools/animation-viewer.html`.

---

## Integração das derrotas no runtime — 2026-10-24

### Recuperação

Foi criado antes das edições o checkpoint
`evidencias/recovery/BoyPunk-Web-pre-defeat-integration-20261024.tar.gz`, SHA-256
`c0a66b8716551c97c5124b790cabd0a10d42468eec2db4f1f662890440dfc1c1`.
Não há Git nesta pasta e nenhum `AGENTS.md` foi localizado no projeto ou em seus
diretórios ancestrais aplicáveis.
Releases e `dist-portable/` foram excluídos do novo tar, aferidos à parte e
permaneceram byte a byte idênticos após o trabalho.

### Estado atual

- `player.die.0..3` está integrado a 10 fps, sem loop. Vida zero compromete a
  derrota uma vez, bloqueia controle/ataque/dano e mantém o canvas renderizando
  por 0,40 s antes do painel Game Over. A transição é dirigida pelo fixed-step,
  não por callback visual.
- `chaser.dead.0..3` está integrado a 12 fps, sem loop, numa entidade apenas
  visual por 1/3 s. O inimigo funcional é removido imediatamente de IA,
  colisões, ataque, bloqueio de tiros e contato. Recompensa e evento continuam
  imediatos e únicos.
- Há no máximo 8 visuais de derrota; expiram por tempo e são limpos em retry,
  novo run, saída ao menu e estado terminal.
- Player e altar continuam exatamente 4/4; meta continua 15. Altar destruído com
  jogador vivo mantém “Altar destruído” sem animação falsa do jogador. Se ambos
  zeram no mesmo contato, permanece a prioridade “Você foi derrotado”.
- Falhas de quadros opcionais seguram o último quadro válido e são informadas
  numa faixa visível. A carga final teve zero falhas.
- Os assets Antigravity foram apenas lidos/validados: player 64×96 com solo y=63
  e chaser 16×32 com solo y=31. Nenhum PNG, IA, velocidade, hitbox, ataque,
  dano, áudio, preferência ou objetivo foi modificado.

### Arquivos de código alterados

- `src/config.js`, `src/animation.js`, `src/core.js`, `src/renderer.js`,
  `src/main.js`;
- `index.html`, `styles.css`;
- `tests/animation.test.mjs`, `tests/core.test.mjs`, novo
  `tests/renderer.test.mjs`;
- `tools/browser-test.mjs`;
- este documento e `PASSAGEM_VISUAL_PARA_CODEX.md`.

### Validação

- `npm run check`: aprovado.
- `npm test`: 36 testes nomeados aprovados.
- Chrome headless HTTP: 35/35 asserções em `evidencias/browser-test.json`, com
  os quatro quadros reais de cada derrota observados em execução, altar fatal
  com player 4/4, simultâneo, pausa, Game Over, menu, retry, cinco ciclos sem
  resíduos e exatamente um evento/áudio terminal por ciclo.
- Capturas principais: `evidencias/03-chaser-defeat-animation.png`,
  `04-altar-defeat.png`, `05-simultaneous-player-defeat-animation.png`,
  `06-player-defeat-animation.png` e `07-gameover-1..5.png`.

Limites: automação Chrome headless Linux com overlays de debug; não houve
playtest humano/auditivo, mobile, Windows/macOS nem build de distribuição. As
releases e o portátil existentes foram preservados e não incluem esta integração.

Abrir a fonte atual:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```

## Vitória da fase 1 e progressão persistente — 2026-10-25

### Estado encontrado e preservação

- Vitória já era detectada quando o altar alcançava a meta, mas mudava
  imediatamente para uma tela genérica, sem resumo congelado ou progressão.
- `BALANCE.player.maxLife` e `BALANCE.objective.altarMaxLife` permanecem exatamente
  **4**. `BALANCE.objective.soulsGoal` permanece a fonte única da meta: **15**.
- Derrota do jogador, destruição do altar, chaser morto sem dano, retry limpo,
  música, assets e attract mode foram preservados. A precedência terminal válida
  continua: jogador derrotado, depois altar destruído, depois vitória por objetivo.
- Checkpoint anterior:
  `evidencias/recovery/BoyPunk-Web-pre-victory-progression-20261025.tar.gz`,
  SHA-256 `23c893a55432ffb215df7f0c32a03e75c21dadc6b996dc9a7a6d0bc38052e2af`,
  validado com 421 entradas. Os 457 arquivos de `releases/` e `dist-portable/`
  foram aferidos separadamente e não foram gerados nem editados.

### Vitória integrada

- A meta inicia `victoryPresentation` uma única vez. O resultado terminal recebe
  uma cópia congelada de nível, tempo ativo, 15/15 almas, vida, altar e abates.
- Combate, dano, projéteis, controle e novos depósitos param no tick terminal.
  O render loop existente continua mostrando o altar por 0,85 s; preferência de
  movimento reduzido encurta a resposta para 0,18 s. A transição não depende de
  áudio nem callback visual.
- A tela usa “Distrito Neon concluído!”, tempo `MM:SS.d`, almas/meta, vida/máximo
  e altar/máximo. “Jogar novamente” e “Menu” funcionam por ponteiro/toque;
  Enter reinicia e Esc volta ao menu. O canvas continua focado durante a
  transição, impedindo Space mantido de acionar botões.
- “Fábrica de Sucata desbloqueada — em desenvolvimento” aparece com estados
  visuais separados de desbloqueio e disponibilidade. Não existe rota para a
  fase ausente.

### Progressão

- Chave: `boypunk-web-progression-v1`.
- Esquema: `{ version: 1, completedLevels: string[], unlockedLevels: string[] }`.
- IDs estáveis: `district-neon` e `scrap-factory`.
- Catálogo separa `unlocked` de `available`; `scrap-factory` fica desbloqueada,
  porém `available: false`.
- Somente vitória real elegível grava. Demo, `?test=1`/preview, derrota e repetição
  idempotente não gravam. Falha de armazenamento mantém o desbloqueio na memória
  e mostra aviso de sessão; dado malformado não trava nem toca chaves alheias;
  versão futura incompatível não é sobrescrita. Preferência de áudio permanece
  no armazenamento anterior independente.

### Arquivos e integração futura

- Novo `src/progression.js`; alterados `src/config.js`, `src/core.js`,
  `src/main.js`, `src/renderer.js`, `index.html`, `styles.css`, `package.json`,
  `tools/build-portable.mjs` e `tools/browser-test.mjs`.
- Testes: `tests/core.test.mjs`, novo `tests/progression.test.mjs` e ajuste de
  `tests/demo.test.mjs`.
- Para a futura fase 2, manter o ID `scrap-factory`, implementar seu conteúdo e
  então mudar apenas sua definição de catálogo para `available: true` e conectar
  uma ação de nível. Não inferir disponibilidade a partir de desbloqueio e não
  alterar o esquema v1 sem migração explícita.

### Verificação

- Estática: `npm run check` aprovado.
- Automatizada: `npm test` aprovou 6/6 arquivos e 54 testes nomeados. Cobre coleta
  e depósito reais, commit único, resumo congelado, pausa fora do tempo,
  precedência, reduced motion, limpeza, esquema, idempotência, reload em memória,
  armazenamento bloqueado/malformado/incompatível e isolamento da demo.
- Runtime Chrome HTTP: **58/58 asserções**, zero asset ausente e zero evento grave
  de console. Verificou preview sem prêmio, vitória real, Space mantido, retry por
  Enter, Menu por toque, persistência após reload, três ciclos de vitória/retry,
  áudio sem fonte duplicada e toda a regressão anterior de derrota/attract mode.
- Evidências:
  `evidencias/runtime-victory-progression-20261025/browser-test.json`,
  `08-victory-altar-response.png` e `09-victory-screen.png`.
- Observação visual automatizada: menu e vitória sem overflow no viewport testado;
  botões 170×35 px e texto/valores legíveis. Não houve playtest humano, aparelho
  touch físico, outro navegador/SO ou avaliação auditiva.

Abrir o fonte atual:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```

## Tratamento Visual da Fábrica de Sucata — 2026-10-26 (Direção de Arte / Antigravity)

### Ponto de Recuperação e Preservação

Antes de qualquer modificação, foi gerado o checkpoint:
`evidencias/recovery/BoyPunk-Web-pre-scrap-factory-art-20261025.tar.gz`
(SHA-256 `0fbeffceaa40a32240b9ae4db899a6bf82e70e9a7852e67305d7b5f39695d3dc`).
Os pacotes em `releases/`, os arquivos de distribuição `dist-portable/JOGAR.html`, as mecânicas funcionais implementadas por Codex para o nível 2, as hitboxes, física, regras de dano, saúde 4/4 e meta de 15 almas foram estritamente preservadas.

### Resumo das Entregas Visuais

1. **Cenário Interior do Nível 2 (`assets/images/world/fabrica-sucata.png` — 1365 × 768 px):**
   - Galpão de fundição pesada com arcos treliçados de aço grafite (`#181a24`, `#222638`), maquinário em silhueta de baixo contraste, fornalha com calor térmico âmbar contido (`#c44e18`), luminárias ciano (`#2ec8d4`) e claraboia superior em clerestório com vista para o horizonte noturno violeta.
   - Luminância calibrada para priorizar contraste máximo dos jogadores, projéteis e almas.
2. **Tileset Industrial (`assets/images/world/factory-platformtiles.png` — 128 × 128 px):**
   - Módulo `(0, 0)` de chapas perfuradas de aço naval com ranhuras e borda superior ciano (`#2ec8d4`) com brilho especular (`#c8faff`) para plataformas *one-way*.
   - Módulo `(16, 0)` de blindagem pesada rebitada em grafite com listras de perigo em âmbar (`#ff8522`) para plataformas sólidas e colunas perimetrais.
3. **Engenharia e Renderização da Prensa Hidráulica (`src/renderer.js`):**
   - Substituído o bloco de texto provisório `"PRENSA // PROTÓTIPO"` por montagem mecânica de precisão: pórtico fixo superior, cilindro usinado com linhas de alta pressão e manômetro ativo, guias de precisão laterais cromadas, pistão telescópico de cromo polido, cabeçote móvel com padrão de perigo, setas direcionais gravadas (`▼ ▼ ▼`), balizas luminosas de alerta, jatos de alívio de vapor, linha de impacto incandescente (`#ff3624` / `#fff0c0`) durante descida (`closing`) e leito de impacto no piso com ancoragem e guias verticais pontilhadas projetadas durante o aviso (`warning`).
   - Coincidência dimensional exata (100% pixel-perfect) com a hitbox de 44 × 16 px.
   - Suporte completo a `reducedMotion`.
4. **Acabamento de Plataformas:**
   - Apoios estruturais e mãos-francesas em treliça desenhadas abaixo de plataformas suspensas.
   - Paredes perimetrais rebitadas e reflexo metálico suave sobre o piso térreo.
5. **Integração de Código:**
   - Registrados novos assets em `src/assets.js` (`world.background.factory` e `world.tiles.factory`).
   - `src/renderer.js` atualizado para direcionar renderização específica e modular para `scrap-factory`.
   - Adicionada ferramenta de registro de evidências `tools/record-factory-evidence.mjs` no script `check` de `package.json`.

### Validação e Evidências

- `npm run check`: **Aprovado** (19 scripts e launcher verificados).
- `npm test`: **Aprovado** (65/65 testes em 7 suítes).
- Capturas de navegador real em Chrome headless Linux com CDP armazenadas em `evidencias/art/`:
  - `scrap_factory_overview.png`: Nível limpo completo.
  - `scrap_factory_collision_alignment.png`: Sobreposição de caixas de colisão demonstrando alinhamento estrito.
  - `scrap_factory_gameplay.png`: Ação em tempo real com entidades ativas.
  - `press_phase_idle.png`, `press_phase_warning.png`, `press_phase_closing.png`, `press_phase_recovery.png`: Fases da prensa.
  - `scrap_factory_victory.png`: Resumo de vitória na Fábrica de Sucata.
  - `scrap_factory_before_after_comparison.png`: Painel comparativo antes/depois.
  - `scrap_factory_press_states_comparison.png`: Painel de comparação dos 4 estados da prensa.

Comando para abrir a versão de desenvolvimento:
```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```

## Sistema de Power-ups: Rajada Dupla (Fase 2B) — 2026-10-28 (Antigravity / Pair programming)

### Ponto de Recuperação e Preservação
Antes da assunção e modificações finais, foi gerado o checkpoint:
`evidencias/recovery/BoyPunk-Web-pre-phase2b-takeover-20261028.tar.gz`
(SHA-256 `ed3c73d53b61cc85ad014fea7c5c4246a96af9d5e3dcbb2fbe8d51b467257678`).
Todas as entregas da Fase 1, Fase 2A (patrol-shooter em campanha), bônus, sobrevivência, demo, controles mobile táteis e saves foram estritamente preservadas. Nenhum arquivo de distribuição foi regerado.

### Resumo das Entregas
1. **Mecânica Autoritativa de Rajada Dupla (`POWER_UPS["double-burst"]`):**
   - 10 segundos de jogabilidade ativa.
   - 2 projéteis por ataque aceito com intervalo de 0,12 s entre eles.
   - Cadência normal de ataque (0,34 s cooldown, 0,20 s melee) e stats do projétil Bola de Pulso (330 px/s, 8×8, dano 1, swept-AABB) 100% conservadas.
   - Recoleta restaura para 10 s sem empilhar.
   - 1 spawn único na campanha após a introdução (`depositadas + carregadas >= 4`), com 12 s de vida útil para o pickup não coletado.
   - Posicionamento em apoio sólido: Distrito Neon `(180, 160)` e Fábrica de Sucata `(372, 160)`.
   - Limpeza em transições e congelamento estrito em pausa.
2. **Arte Pixel-Art do Cartucho de Energia (16×16 RGBA):**
   - 4 frames com ciclo idle: `assets/images/world/powerup-double-burst-idle-000..003.png`.
   - Chassi de grafite usinado, acentos ciano neon e duplo núcleo de plasma âmbar.
   - Alinhamento de base Y=15 repousando perfeitamente sobre a superfície física das plataformas em Y=16.
   - Flutuação sutil de 1,5 px com sombra projetada na plataforma (suprimida em `reducedMotion`).
3. **Apresentação e HUD Polido:**
   - Resposta visual de coleta em `drawEffects`: choque radial gradiente âmbar/ciano, duplo feixe de fagulhas radiantes e texto `×2`.
   - Painel HUD compacto de 136×18 px no topo esquerdo com mini-ícone de 10×10 px, texto localizado (`Rajada Dupla ×2  {remaining}s`), medidor de duração (2 px) e sinalização crítica quando `remaining <= 2.5s`.
   - Sem layout jumps: banner de aviso rebaixado para `y = 73` quando ativo e restaurado para `y = 51` na expiração.

### Validação e Evidências
- `npm run check`: Aprovado sem erros.
- `npm test`: **210 testes aprovados em 24 arquivos (zero falhas)**.
- Inspeção real em Chrome headless via CDP (`tools/record-powerup-evidence.mjs`) com 10/10 cenários fotografados em `evidencias/art/powerups/`.
- Evidências gráficas: `double-burst-contact-sheet.png`, `double-burst-cartridge-idle-loop.gif`, `double-burst-before-after-comparison.png`.
## Continuidade — revisão de integração Phase 4D (2026-10-29)

A fonte 0.2.7 recebeu correções exclusivamente de integração. O primeiro
tiro continua imediato no tick de aceitação; cooldown, janela de ataque,
velocidade, dano, Rajada Dupla e ownership não mudaram. `CHARACTERS` agora
declara `weaponAnchor` por personagem: BoyPunk `{forward:27,y:16}` e Nilo
`{forward:21,y:12}`, ambos relativos ao centro/topo do collider. Flash e centro
do projétil compartilham essa âncora; o top-left 8×8 é centro menos 4.

`GameModel.resolvePlayerShotClearance` varre somente o pequeno trecho entre a
borda do jogador e a origem visual. Parede sólida vence desempate contra inimigo;
one-way continua permeável. O melee já existia em `updatePlayer` e permanece
26×20, ativo durante os 0,18 s e sem mudança de dano/regra.

O renderer passou a consumir Chaser e Patrol Shooter ilustrados em escala >1,
ancorados no pivô central e pé local y=32 sem alterar os PNGs. O fallback do
Patrol Shooter nunca usa a torreta fixa. P1/P2 continuam com estado independente.

Checkpoint: `evidencias/recovery/BoyPunk-Web-pre-phase4d-integration-review-20261029.tar.gz`
(`4682dd735dc313d9eddcc59d6e9834649e787fd3228a21307d2a526ba827c25c`).
Validação: `npm run check` e 26/26 arquivos de `npm test`. Browser não ficou
disponível nesta sessão; não confundir folhas de contato/capturas staged com
prova de movimento contínuo.

Execução normal: `./iniciar-jogo.sh --no-open` e
`http://127.0.0.1:47831/`. Prévia cooperativa isolada:
`http://127.0.0.1:47831/?coop-preview=1`.

