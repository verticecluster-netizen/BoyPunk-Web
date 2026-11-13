# Guia de Estilo Unificado — BoyPunk! Web

**Versão:** 1.0.0  
**Data:** 2026-10-26  
**Resolução Lógica Alvo:** 480 × 270 pixels (Proporção 16:9)  
**Ambiente:** HTML5 Canvas 2D + Interface Web Acessível  

---

## 1. Princípios Fundamentais de Design (Diretriz Ilustrada 2D Cinematográfica)

1. **Estética 2D Ilustrada com Silhuetas Suaves:** O projeto evoluiu da restrição de voxel/pixel-art rígida para uma direção artística 2D ilustrada cinematográfica. Silhuetas arredondadas, armaduras articuladas, tubulações curvas e transições orgânicas de luz substituem degraus quadrados e chanfros de pixel.
2. **Separação Rígida entre Coordenadas Lógicas e Resolução de Renderização:**
   - O espaço de coordenadas do gameplay permanece estritamente fixo em **480 × 270 pixels lógicos**. Físicas, colliders (AABBs), distâncias de disparo, áreas de interação e proporções corporais permanecem idênticos.
   - O canvas de renderização física opera com backing buffer escalonado (`renderScale` configurável de 1× a 4×, padrão 2× com 960 × 540 pixels físicos) e `image-rendering: auto`, permitindo amostragem suave (bilinear) nas artes ilustradas sem degradar a integridade lógica.
3. **Identidade Cyberpunk / Retro-Arcade Refinada:** Fusão de iluminação neon cinematográfica com engenharia industrial crível: metal escovado, cerâmica marfim polida, juntas de borracha sintética, vidro fumê e óptica âmbar/ciano.
4. **Legibilidade e Contraste Máximos:** Ação ágil com leitura instantânea:
   - BoyPunk (jaqueta verde esmeralda, armadura grafite com aletas e visor ciano curvo).
   - Nilo (chassis de cerâmica marfim, juntas de grafite, óptica âmbar multifacetada e emissor de nanorreparo cilíndrico).
   - Inimigos com silhuetas funcionais agressivas (Chaser Droid com lente carmesim e mandíbula de aço temperado).
   - Projéteis com halo radial suave e núcleo denso de alta voltagem.
   - Cenários com perspectiva atmosférica, névoa gradiente e suportes estruturais tipo cantilever.
5. **Hierarquia em Camadas:** Fundos distantes com menor contraste e névoa atmosférica; plataformas com suportes industriais e sombras de contato; entidades ativas com destaques reflexivos direcionais.

---

## 2. Paleta Mestre Compartilhada (Master Palette)

A paleta mestre define a base cromática que unifica todas as 11 telas (S1 a S11):

| Token | Código HEX | Função Primária | Exemplo de Uso |
|:---|:---:|:---|:---|
| `--ink` | `#090711` | Preto profundo / Contorno externo | Contornos de sprites, sombras duras de UI |
| `--panel` | `rgba(14, 11, 28, 0.94)` | Fundo de painéis e modais | Janelas de menu, pausa, vitória e game over |
| `--dark-deep` | `#05040a` | Fundo absoluto | Camada mais distante de parallax, bordas do canvas |
| `--slate-dark` | `#19142b` | Superfícies secundárias | Estrutura de botões inativos, bases de concreto |
| `--orange` | `#ff7a28` | Ação primária / Energia quente | Logotipo BoyPunk!, jaqueta do herói, botões primários |
| `--cyan` | `#37e6ee` | Sinal elétrico / Coleção / Seguro | Almas coletáveis, projéteis aliados, foco ativo |
| `--violet` | `#ae62ff` | Sagrado / Cyberpunk / Molduras | Altar de almas, bordas de UI, acentos de neon |
| `--paper` | `#fff5dc` | Texto principal de alto contraste | Títulos, pontuações, textos de botões |
| `--amber` | `#ffb14a` | Alerta moderado / Valor bônus | Almas bônus, aviso de canhão, pontuação secundária |
| `--danger` | `#ff5f51` | Ameaça / Dano / Fechamento | Perseguidores, prensas fechando, alerta crítico |
| `--success` | `#38ef7d` | Conclusão / Desbloqueio | Badges de vitória, desbloqueio de fase |

---

## 3. Paletas de Destaque por Nível (Per-Level Accent Palettes)

### S3 — Nível 1: Distrito Neon (`distrito-neon`)
- **Atmosfera:** Metrópole cyberpunk chuvosa, noite fria com luzes de neon refletidas no asfalto molhado.
- **Tons Dominantes:**
  - Céu e Silhueta: Violeta profundo (`#2c1d50`) e anil urbano (`#130d21`).
  - Neon e Holofotes: Ciano elétrico (`#37e6ee`), Rosa choque (`#ff4f81`) e Violeta brilhante (`#ae62ff`).
  - Plataformas: Concreto escuro e asfalto (`#1f1a33`) com trilhas luminosas de neon ciano/laranja no topo.
  - Altar (Interface Energética Urbana): Terminal cyberpunk vertical de 32×48 px em liga de grafite polido (`#1c1d29`, `#2b2d3d`), cilindro de contenção de plasma transparente, barramentos de condução neon ciano (`#37e6ee`) e coroa com aletas angulares violeta (`#ae62ff`). O núcleo interno carrega em 7 estágios (0 a 6), crescendo de violeta sutil para ciano elétrico radiante. Micro-indicadores geométricos na base informam a integridade: 4-3 = matriz estável ciano; 2 = aviso âmbar; 1 = chevron de alerta crítico piscante.

### S4 — Nível 2: Fábrica de Sucata (`scrap-factory`)
- **Atmosfera:** Instalação industrial pesada, vapores quentes, maquinário titânico e poeira metálica.
- **Tons Dominantes:**
  - Estrutura: Aço grafite rebitado (`#24202e`), vigas de ferro fosco (`#3a334a`).
  - Iluminação Industrial: Âmbar de advertência (`#ff9b38`), amarelo lâmpada incandescente (`#f5b842`).
  - Perigos Ativos (Prensas): Cabeçote móvel com dentes de aço escovado e listras de aviso perigo (`#ff5f51`).
  - Resíduos e Sucata: Tons de ferrugem oxidada (`#8a4220`) e engrenagens desgastadas.
  - Altar (Carcaça Industrial Rebitada): Estrutura de contenção mecânica pesada de 32×48 px com placas de aço blindado rebitado (`#262b36`, `#3d4659`), colunas de sustentação de ferro forjado, câmara de vácuo termomecânica com filamentos de arco voltaico âmbar (`#ff9b38`, `#ffd280`) e faixas de advertência industrial. 7 estágios de ignição por almas e display analógico de integridade mecânica.

### S5 — Bônus: Câmara de Energia (`energy-chamber`)
- **Atmosfera:** Núcleo de contenção de alta tensão, bobinas supercondutoras e fluxo de plasma livre.
- **Tons Dominantes:**
  - Fundo do Núcleo: Preto absoluto com linhas de condução elétricas (`#07050f`).
  - Plasma e Condutores: Ciano puro de supercondução (`#37e6ee`) e Violeta de ressonância (`#8338ec`).
  - Canhão de Energia: Carcaça de liga cerâmica escura com lente de disparo âmbar (`#ffb14a`) telegrafando feixe luminoso.
  - Almas de Alta Energia: Centelhas verdes/âmbar de 10 pontos pulsando com cadência de 120 Hz.

---

## 4. Regras de Contorno e Iluminação (Outlines & Lighting)

1. **Entidades Vivas e Dinâmicas (Player, Inimigos, Projéteis, Almas):**
   - Contorno de **1 pixel sólido escuro** (`#090711` ou sombra matizada).
   - Impede que personagens se mesclem visualmente com texturas ricas de fundo.
2. **Superfícies de Plataforma e Cenário:**
   - **Borda superior:** Destaque (highlight) de 1 pixel luminoso para demarcar com exatidão matemática onde o colisor do jogador repousa (`y` do chão).
   - **Bordas laterais e inferiores:** Sombra escura de 1 pixel, comunicando solidez.
3. **Direção da Luz Principal:**
   - Zenital superior suave, com leve inclinação frontal-esquerda (highlights na borda superior-esquerda de cada sprite).
4. **Molduras de UI e Caixas de Diálogo:**
   - Borda externa de **2 pixels sólidos** (`var(--violet)` ou `var(--cyan)`).
   - Sombra dura retrô deslocada (hard pixel shadow): deslocamento sem desfoque (blur 0px) de `4px 4px` a `7px 7px` com cor escura semitransparente (`rgba(7, 5, 15, 0.86)`).

---

## 5. Arquitetura de Renderização e Escala de Sprites (Dual Coordinate System)

- **Espaço de Coordenadas Lógicas:** **480 × 270 pixels**. Mantém de forma estrita e invariante todas as leis de física, gravidade, colliders (AABBs), distâncias de pulo, alcance de projéteis e posicionamento de elementos interativos. Nenhuma física é alterada pela resolução visual.
- **Backing Canvas de Alta Resolução:**
  - O buffer gráfico de renderização escala dinamicamente via `renderScale`:
    - `1.0×`: 480 × 270 (modo retro de baixa densidade).
    - `1.5×`: 720 × 405 (dispositivos móveis de tela pequena `< 640px`).
    - `2.0×` (Padrão Desktop / Retina): 960 × 540 (slice ilustrado cinematográfico nítido).
    - Até `4.0×` (suporte 4K ultra-nítido).
  - O transform `ctx.scale(renderScale, renderScale)` alinha todas as operações lógicas com o buffer físico, eliminando arredondamentos de sub-pixel e sem duplicar escala de CSS.
  - CSS do canvas: `image-rendering: auto;` permitindo amostragem suave (linear/bilinear) em ativos ilustrados, enquanto ativos legados mantêm fidelidade visual durante o período de transição.
- **Dimensões e Proporções dos Sprites Ilustrados 2×:**
  - **Personagens (BoyPunk / Nilo):**
    - Legado: 64 × 96 px (renderizado a 64 × 96 na tela lógica, com AABB 22 × 32).
    - Ilustrado: **128 × 192 px** (exatamente o dobro da resolução nominal). Centro do corpo em `x=32`, pés em `y=126`, linhas inferiores `128..191` transparentes. Quando desenhado com `drawImage(img, renderX, drawY, 64, 96)` em contexto com `renderScale=2`, mapeia pixel a pixel no buffer físico sem perda de fidelidade.
  - **Altar (Interface Energética Urbana):**
    - Legado: 32 × 48 px.
    - Ilustrado: **64 × 96 px** (detalhes anatômicos de duto de contenção curvo, aletas de cobre e plasma ciano).
  - **Inimigo Chaser Droid:**
    - Legado: 16 × 32 px.
    - Ilustrado: **32 × 64 px** (lente monocular carmesim esférica, mandíbula de aço rebitada e articulações mecânicas).
  - **Projéteis (Pulso e Bala Inimiga):**
    - Legado: 8 × 8 px.
    - Ilustrado: **16 × 16 px** (núcleo elipsoidal denso e halo de dispersão suave).
- **Dimensões Chave dos AABBs Físicos (Inalterados):**
  - **Jogador:** `22 px` (largura) × `32 px` (altura).
  - **Inimigo Chaser (Caveira):** `16 px` × `32 px`.
  - **Inimigo Shooter (Torreta):** `32 px` × `32 px`.
  - **Almas Coletáveis:** `15 px` × `16 px`.
  - **Projétil Pulso:** `8 px` × `8 px`.
  - **Prensa Industrial:** Cabeçote `44 px` × `16 px`.
  - **Canhão Bônus (`energy-cannon-01`):** Base física `{ x: 452, y: 208, w: 12, h: 24 }`.

---

## 6. Hierarquia Tipográfica em 480 × 270 (UI Typography)

A interface em 480 × 270 pixels opera em uma escala delicada onde cada pixel de texto impacta o equilíbrio espacial. A tipografia utiliza a fonte proprietária embutida **Pixelify Sans**:

| Nível / Uso | Tamanho | Estilo / Caixa | Espaçamento | Cor Típica |
|:---|:---:|:---:|:---:|:---|
| **Display / Logotipo Hero (S1, S2)** | `28px` – `36px` | Bold / Mista | Normal | Laranja (`#ff7a28`) com Ciano (`#37e6ee`) |
| **Título de Painel (H2)** | `16px` – `20px` | Bold / Mista | Normal | Creme (`#fff5dc`) ou Dourado |
| **Sub-seções de Painel (H3)** | `12px` – `14px` | Bold / Mista | Normal | Ciano (`#37e6ee`) ou Âmbar (`#ffb14a`) |
| **Eyebrow / Sub-cabeçalho** | `8px` – `9px` | Bold / MAIÚSCULAS | `1.5px` tracking | Violeta (`#ae62ff`) ou Ciano (`#37e6ee`) |
| **Texto de Botões** | `10px` – `12px` | Semibold / Mista | `0.5px` | Creme (`#fff5dc`) no idle, `#090711` no primário |
| **Estatísticas / Números de Destaque** | `12px` – `14px` | Bold | Normal | Ciano (`#37e6ee`) ou Âmbar (`#ffb14a`) |
| **Texto Corrido / Descrições** | `9px` – `10px` | Regular / Mista | Normal | Creme suave (`#fff5dc`) |
| **Legenda / Dicas / Fine Print** | `7px` – `8px` | Regular / Mista | Normal | Lavanda acinzentado (`#a393bf`) |
| **HUD em Jogo (Canvas 2D)** | `9px` | Bold / MAIÚSCULAS | Normal | Conforme papel funcional (HP, Souls, Altar) |

### 6.1 Regras de Estabilidade do Layout da HUD (Anti-Jumping)
1. **Faixas Verticais Estáveis:** Avisos e banners centrais (`drawHudBanner`) utilizam uma posição vertical previsível e estável (`y = 51`), sem sofrer deslocamento brusco quando habilidades (como a Cura de Nilo) ou power-ups (como a Rajada Dupla) ativam ou expiram.
2. **Painel de Almas Hierarquizado:**
   - **Carga (Esquerda):** Quantidade carregada pelo jogador em tempo real, acompanhada de micro-ícone de alma em ciano elétrico (`#37e6ee`).
   - **Depósito (Direita):** Almas depositadas no altar em relação à meta (`X/15`) em âmbar quente (`#ffb14a`).
   - **Barra de Progresso do Altar:** Barra de energia segmentada em estilo arcade retrô com chanfro escuro e preenchimento progressivo em ciano emissivo.
3. **Preservação de Painéis Modais:** Painéis temporários de status (Rajada Dupla, Cura de Nilo) posicionam-se como cartões complementares empilhados com espaçamento fixo na lateral esquerda, sem alterar a geometria ou posição dos painéis mestres superiores.

### 6.2 Contrato de Screen-Space e Menus Responsivos

1. **Passe autoritativo separado:** HUD, números, barras e avisos são desenhados
   depois do passe do mundo, já fora do `translate` de screen shake. Efeitos de
   dano podem mover o mundo, mas nunca a interface autoritativa.
2. **Quadro determinístico:** antes de desenhar, o renderer restaura transform
   identidade, alpha 1, composição `source-over` e limpa o backing buffer físico
   completo. O transform lógico é então aplicado uma única vez.
3. **Slots fixos:** Double Burst ocupa `(8,51)` e Cura de Nilo `(8,73)`. Avisos
   usam a faixa `x=152..472`, `y=51`; ativar ou expirar um estado não move outro.
4. **Sem zoom de página:** legibilidade DOM é resolvida por `clamp()`, larguras
   máximas responsivas, espaçamento e rolagem interna. Não usar `zoom`, transform
   global, mudança de 480×270 ou aumento de `renderScale` para corrigir menus.
5. **Dimensões de referência:** menu até 640 CSS px; pausa 400 px; vitória 580
   px; derrota 500 px; resultado bônus 560 px. Todos permanecem limitados à
   largura disponível.
6. **Altura curta:** painéis podem rolar verticalmente com
   `overscroll-behavior: contain`; o `body` permanece sem scroll durante o jogo.
   Ações e seletores interativos mantêm aproximadamente 44 CSS px mesmo em
   landscape baixo.

---

## 7. Estilos de Botões, Foco e Interação

1. **Botão Padrão (`button`):**
   - Fundo: `rgba(20, 16, 38, 0.9)`.
   - Borda: `2px solid #ae62ff`.
   - Texto: `#fff5dc`.
   - Sombra dura retrô: `3px 3px 0 #090711`.
2. **Botão Primário (`button.primary`):**
   - Fundo: Gradiente linear de `135deg, #ff7a28, #ff9b38`.
   - Borda: `2px solid #fff5dc`.
   - Texto: `#090711` (alto contraste preto sobre laranja brilhante).
   - Sombra dura e brilho contido: `4px 4px 0 #090711, 0 0 12px rgba(255, 122, 40, 0.4)`.
3. **Estado de Foco Teclado / Gamepad (`:focus-visible`):**
   - Contorno de foco: `2px dashed #37e6ee` com `outline-offset: 3px`.
   - Destaque: `transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #090711, 0 0 10px #37e6ee;`.
4. **Estado Hover (`:hover`):**
   - Clareamento imediato do fundo, transição de borda para `--cyan` (`#37e6ee`).
5. **Estado Pressionado (`:active`):**
   - Deslocamento de `translate(2px, 2px)` reduzindo a sombra dura a `1px 1px 0`, dando resposta tátil de clique mecânico.
6. **Controles Touch Móveis (`.touch-controls button`):**
   - Área mínima garantida: `>= 44 × 44 pixels CSS` (conforme norma WCAG / mobile).
   - `touch-action: none;` absoluto para evitar gestos acidentais do navegador.

---

## 8. Convenções de Feedback e Efeitos Visuais (VFX & Timing)

1. **Disparo da Bola de Pulso:**
   - Muzzle flash sutil de 2 frames (ciano `#37e6ee` e branco) na boca da arma.
   - Trilha translúcida de no máximo 6 amostras (0,12s).
2. **Impacto e Acerto de Projétil (`hit` / `pulseImpact`):**
   - Resposta cinética localizada com 4 a 6 centelhas angulares em ciano/âmbar de curta duração (`0,18s`).
   - Indicador de dano aplicado conciso ("-1") subindo 8 px com contorno escuro nítido, sem oclusão de inimigos ou rotas.
3. **Dano Sofrido pelo Jogador (`damage`):**
   - Impacto localizado em vermelho perigo (`#ff5f6d`), vinheta periférica sutil de 1 frame e cintilação de invulnerabilidade nítida (16 Hz) sem flash branco total na tela.
4. **Cura Bem-Sucedida (`heal`):**
   - Indicador numérico "+1" em verde menta (`#2ee6a8`) com anel expansivo de nano-reparo (`nilo.heal.0..3`) e partículas ascendentes suaves, sem tremer a tela.
5. **Coleta de Alma (`collect` / `bonusCollect`):**
   - Flash de absorção concêntrico de `0,15s` com anel ciano rápido e indicador flutuante "+1" ou "+10", desaparecendo suavemente sem cobrir projéteis.
6. **Depósito no Altar (`deposit`):**
   - Feixe colunar de energia vertical conectando a câmara de contenção à coroa do altar (`0,45s`), acompanhado de pulso luminoso na base e confirmação "+N" em âmbar/ouro sobre o altar.
7. **Canhão Robótico Bônus:**
   - Telegrafia de mira travada: `0.8s` (com retículo 11×11 ativado quando `charge > 0.85`).
   - Muzzle flash estelar em `(448, 220)` durante os primeiros `0.09s` da recuperação.
   - Recuo mecânico suave de até 3,5 px durante os primeiros `0.26s` da recuperação.
   - Recuperação total e resfriamento térmico: `2.4s`.
   - Penalidade de impacto: popup flutuante **"−1 s"** subindo 12 px em 0,6s; proteção contra dano repetido de `0.8s`.
8. **Prensa Industrial:**
   - Aviso luminoso: balizas de advertência e linha de perigo vertical de `1.0s`.
   - Fechamento: golpe descendente de `0.5s` com rastro incandescente.
   - Retração e alívio com vapor: retorno suave de `1.2s`.
9. **Transições de Telas e Modais:**
   - Fade suave de backdrop (0,15s) acompanhado de leve entrada de escala do painel central (0,98 para 1,0).

---

## 9. Diretrizes de Acessibilidade e Movimento Reduzido (Reduced Motion)

Quando `reducedMotion = true` (via preferência do sistema operacional `prefers-reduced-motion: reduce` ou configuração manual):
- **Screen Shake:** Completamente desativado (amplitude = 0 px).
- **Flashes de Dano:** Substituídos por borda de destaque avermelhada no HUD e no personagem, sem piscar branco total na tela.
- **Trilha de Projéteis:** Reduzida para apenas 2 amostras rápidas (0,07s).
- **Canhão Bônus:** Desativa deslocamento de recuo mecânico e oscilações rápidas do laser; atenua flash de boca.
- **Transições de Tela:** Exibição imediata sem animações de translação ou zoom.
- **Partículas de Impacto e Vapor:** Desativadas ou limitadas a marcadores estáticos simples.

---

## 10. Matriz de Telas S1–S11 e Papéis Visuais

| ID | Nome da Tela | Identificador DOM / Estado | Objetivo Visual & Identidade |
|:---|:---|:---|:---|
| **S1** | Tela de Título / Abertura | `#loading` / Inicialização | Título hero com gradiente de alta energia, barra de progresso em neon ciano e introdução ao universo. |
| **S2** | Menu Principal | `#screen-menu` (`state: menu`) | Painel centralizado com profundidade retro-arcade, logotipo icônico, botões primários destacados, status dos níveis e instruções de controle limpas. |
| **S3** | Distrito Neon (Nível 1) | `state: playing`, level: `distrito-neon` | Cidade cyberpunk chuvosa noturna, silhuetas de arranha-céus, plataformas de asfalto/concreto com neon ciano e altar violeta ancestral. |
| **S4** | Fábrica de Sucata (Nível 2) | `state: playing`, level: `scrap-factory` | Instalação industrial pesada, aço grafite, prensas mecânicas monumentais, luzes de advertência âmbar e consoles estruturais. |
| **S5** | Câmara de Energia (Bônus) | `state: bonusPlaying` | Arena vertical de alta tensão, 30 almas energéticas, vãos escalonados seguros e canhão robótico industrial na parede leste. |
| **S6** | Tela de Pausa | `#screen-paused` (`state: paused`) | Modal translúcido com moldura violeta, congelamento limpo de simulação e opções diretas de retomada ou saída. |
| **S7** | Tela de Vitória / Resultados | `#screen-victory` (`state: victory`) | Celebração da vitória, badges de saúde de BoyPunk e integridade do altar, exibição de recordes e convite à fase bônus. |
| **S8** | Tela de Derrota / Game Over | `#screen-defeat` (`state: defeat`) | Painel dramático com iluminação vermelha de alerta, motivo da derrota em destaque, estatísticas da tentativa e botão de retry. |
| **S9** | Resultado da Fase Bônus | `#screen-bonus-complete` (`state: bonusComplete`) | Quadro de honra com total de almas coletadas (x/30), pontuação conquistada, tempo restante e bônus perfeito. |
| **S10** | HUD em Jogo e Controles Touch | `#game` (Canvas HUD) + `.touch-controls` | HUD superior de alto contraste (vida, altar, almas, tempo) sem obstruir rota jogável; botões touch `>= 44px` ergonômicos. |
| **S11** | Modo Demonstração / Attract | `#demo-overlay` (`director.active`) | Banner estilizado retrô flutuante convidando à interação para abrir o menu, rodando no Distrito Neon sem concessão de pontuação. |

---

## 11. Diretrizes de Materiais, Iluminação e Pipeline de Ativos Ilustrados 2D

### 11.1 Resposta dos Materiais (Material Response)
1. **Metal Grafite Escovado (Capacete e Armadura de BoyPunk):** Tom base `#252733` com reflexos metálicos suaves `#4e5366` e destaques direcionais zenitais `#8a92aa`. Sem chanfros ou dentes de serra.
2. **Cerâmica Marfim Polida (Chassis de Nilo):** Placas suaves de cerâmica técnica `#f0eee8` com sombras suaves de contato `#c8c4bc` e contorno mecânico escovado `#363640`.
3. **Ótica e Visores de Vidro Luminescente:**
   - Visor de BoyPunk: Curvatura suave com núcleo ciano elétrico radiante (`#37e6ee`) e reflexo em gradiente suave.
   - Ótica de Nilo: Lentes âmbar multifacetadas (`#ffb14a`) com halo circular difuso.
   - Lente Chaser Droid: Lente monocular esférica carmesim (`#ff3355`) telegrafando perigo imediato.
4. **Borracha Sintética e Fiações Industriais:** Mangueiras curvas com nervuras sutis conectando aletas do altar e articulações dos andróides em cinza escuro aveludado (`#15141c`).
5. **Cobre e Latão de Dissipação Térmica:** Aletas e dissipadores do altar em tom de liga de cobre polido (`#b86a3d` / `#df8e5a`).

### 11.2 Regras de Iluminação Cinematográfica
- **Luz Primária (Key Light):** Zenital suave inclinada 15° à esquerda, criando sombras de contato naturais sob pés, beiradas de plataformas e a base do altar.
- **Reflexo de Neon Seletivo:** As cores de assinatura (ciano no Distrito Neon, âmbar na Fábrica) são refletidas suavemente apenas em bordas metálicas e superfícies vitrificadas, sem bloom genérico na tela inteira.
- **Perspectiva Atmosférica:** Elementos de fundo possuem contraste contido e névoa gradiente vertical de azul anil a violeta escuro, separando o plano jogável com clareza.
- **Partículas Suaves:** Poeira de aterrissagem desenhada como puffs antialiased circulares concêntricos com alpha decrescente, sem pixels quadrados ou artefatos de grade.

### 11.3 Convenção de Nomenclatura e Namespace de Ativos
Todos os novos ativos ilustrados 2× residem em diretórios dedicados e são registrados sob o prefixo `.illustrated` no manifesto de ativos:
- Personagem BoyPunk: `assets/images/characters/boypunk-illustrated/playeranim-{state}-{index}.png` (128×192) → chave `player.illustrated.{state}.{index}`
- Personagem Nilo: `assets/images/characters/nilo-illustrated/nilo-{state}-{index}.png` (128×192) → chave `nilo.illustrated.{state}.{index}`
- Altar Distrito Neon: `assets/images/world/altar-distrito-neon-illustrated-{index}.png` (64×96) → chave `altar.distrito-neon.illustrated.{index}`
- Inimigo Chaser: `assets/images/enemies/chaser-illustrated/enemycaveira-{state}-{index}.png` (32×64) → chave `chaser.illustrated.{state}.{index}`
- Inimigo Patrol Shooter: `assets/images/enemies/patrol-shooter-illustrated/enemypatrolshooter-{state}-{index}.png` (64×64) → chave `patrolShooter.illustrated.{state}.{index}`
- Projéteis: `assets/images/projectiles/pulse-ball-illustrated.png` (16×16) → chave `bullet.illustrated`
- Projétil Inimigo: `assets/images/projectiles/enemy-bullet-illustrated.png` (16×16) → chave `enemy.bullet.illustrated`
- Fallback Transparente: Quando `renderScale == 1` ou em caso de ausência de ativo ilustrado, o renderizador faz fallback transparente e imediato para a chave legada canonical sem interrupção de fluxo.

### 11.4 Especificação Anatômica e Cinemática do Taco de Beisebol (BoyPunk)
1. **Silhueta e Construção Física do Taco:**
   - **Pomo Terminal (End Knob):** Diâmetro de 3,5 px (7 px a 2×), disco achatado em titânio grafite escuro (`#1a1e29`) com chanfro de retenção.
   - **Empunhadura Texturizada (Grip):** Fita antiderrapante em espiral de borracha sintética grafite escuro com espaçamento fino de 1,5 px, conferindo aderência tátil crível.
   - **Haste Cônica (Tapered Shaft):** Transição gradual de diâmetro (de 1,5 px na junção da empunhadura até 4,0 px na base do tambor), composta de liga de titânio escovado (`#4a5268`).
   - **Tambor de Impacto (Striking Barrel):** Cilindro robusto de 4,0 px de diâmetro (8 px a 2×) com extremidade em calota esférica suave.
   - **Acentos Subordinados:** Anéis de demarcação finos em ciano elétrico (`#37e6ee`) e laranja queimado (`#ff7a28`) estritamente integrados à carcaça mecânica. **Zero emissão de brilho mágico, feixe ou neon translúcido** — o taco lê perfeitamente como equipamento físico sólido mesmo sem iluminação de fundo.
2. **Biomecânica de Pegada e Articulação:**
   - **Idle:** Postura de rebatedor (*slugger ready*), taco apoiado no ombro direito com pegada relaxada na mão direita e punho esquerdo alinhado.
   - **Locomoção (Walk):** Taco empunhado junto à coxa em ângulo dinâmico descendente (~35°), acompanhando a contra-rotação pélvica da caminhada com passos plantados.
   - **Ataque (Attack1):** Sequência biomecânica completa: F0 Preparação com torção de quadril para trás → F1 Avanço e aceleração de braços → F2 Impacto total com tambor alinhado ao centro do colisor melee (`player.x + 33`) → F3 Desaceleração e giro de recuperação.
   - **Salto e Queda:** Joelhos flexionados para absorção de impacto, taco firme e empunhado para cima em prontidão combativa.

### 11.5 Especificação Mecânica do Patrol Shooter Ilustrado
1. **Chassis e Blindagem Industrial:**
   - Corpo quadrúpede/bípede industrial pesado em chapa de liga de aço rebitada de 64×64 RGBA (32×32 lógico).
   - Lente focal de mira ótica retangular ambarina (`#ff9b38` / `#ffd280`) na face frontal.
   - Canhão frontal cilíndrico de 18 px de comprimento com barramentos laterais de resfriamento e bocal de saída reforçado.
2. **Ciclos Operacionais:**
   - `patrol` (8 frames): Passadas pesadas e cadenciadas com suspensão hidráulica amortecida.
   - `aim` (4 frames): Trava dos atuadores inferiores, recalibragem do visor ótico e retração de 2 px preparando o disparo.
   - `fire` (1 frame): Flash de boca energético e recuo mecânico imediato de 3 px absorvido pelo amortecedor traseiro.
   - `recovery` (4 frames): Exaustão de calor, retorno hidráulico e estabilização de mira para reinício do ciclo.


