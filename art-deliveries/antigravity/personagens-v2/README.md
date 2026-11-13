# Pacote de Personagens `personagens-v2` — BoyPunk & Nilo

## 1. Resumo Executivo e Estado da Entrega
- **Caminho do pacote:** `/home/flow/Projetos/BoyPunk-Web/art-deliveries/antigravity/personagens-v2/`
- **Status:** **CONCLUÍDO (100% dos estados necessários em Classic, Illustrated e Portraits + Prévias Animadas e Estáticas)** — pronto para avaliação e integração pelo Codex.
- **Escopo de Segurança:** Nenhum arquivo de código (`src/*`), manifesto (`src/assets.js`), asset ativo (`assets/*`), cenário ou entrega anterior (`refino-fases-v1`, `personagens-v1`) foi alterado.

---

## 2. Inventário Completo por Personagem e Modo (86 PNGs Finais)

### BoyPunk (`boypunk/`) — Identidade AX-7 (Armadura Branca/Prateada, Estrutura Grafite, Luzes Ciano, Detalhes Laranja, Rifle de Plasma)
- **`boypunk/classic/` (21 quadros `64 × 96` RGBA, pivô `X = 16`, linha do chão `Y = 64`, `Y = 64..95` 100% transparente):**
  - `idle`: `playeranim-idle-000.png` .. `003.png` (4 quadros, 5 FPS) — aproveitados e validados a partir de `personagens-v1`.
  - `walk`: `playeranim-walk-000.png` .. `003.png` (4 quadros, 12 FPS) — ciclo de passada real em 4 fases com separação tonal entre perna frontal e traseira.
  - `jump`: `playeranim-jump-000.png` (1 quadro) — pose aérea de impulso (`max_y = 59`, sem pés colados em `Y = 63`).
  - `fall`: `playeranim-fall-000.png` (1 quadro) — pose aérea de descida (`max_y = 60`, sem pés colados em `Y = 63`).
  - `attack1`: `playeranim-attack1-000.png` .. `003.png` (4 quadros, 22 FPS) — recuo e disparo com boca do cano alinhada ao `weaponAnchor` real `(X = 43, Y = 48)`.
  - `hurt`: `playeranim-hurt-000.png` .. `002.png` (3 quadros, 12 FPS) — reação de dano e disrupção energética.
  - `die`: `playeranim-die-000.png` .. `003.png` (4 quadros, 10 FPS, `loop: false`) — perda de estabilidade, queda de joelhos e colapso horizontal no solo (`Y = 53..63`).
- **`boypunk/illustrated/` (21 quadros `128 × 192` RGBA, pivô `X = 32`, linha do chão `Y = 128`, boca do rifle em `(X = 86, Y = 96)`):**
  - Mesmos 21 arquivos (`playeranim-{idle,walk,jump,fall,attack1,hurt,die}-NNN.png`) desenhados em resolução `2x` (`128 × 192` RGBA).
- **`boypunk/portraits/` (1 quadro `32 × 32` RGBA):**
  - `player-portrait-000.png` (`32 × 32` RGBA) para HUD e seleção de personagem.

### Nilo (`nilo/`) — Especialista Tático (Homem Negro com Rosto Reconhecível, Armadura Grafite Escuro, Luzes Verdes/Violetas, Carabina de Pulso)
- **`nilo/classic/` (21 quadros `64 × 96` RGBA, pivô `X = 16`, linha do chão `Y = 64`, `Y = 64..95` 100% transparente):**
  - `idle`: `nilo-idle-000.png` .. `003.png` (4 quadros, 5 FPS) — respiração tática alerta e pulso no reator peitoral verde.
  - `walk`: `nilo-walk-000.png` .. `003.png` (4 quadros, 12 FPS) — ciclo de caminhada real em 4 fases com cruzamento de pernas e contraste entre perna frontal e traseira.
  - `jump`: `nilo-jump-000.png` (1 quadro) — pose aérea de salto (`max_y = 59`, acima de `Y = 63`).
  - `fall`: `nilo-fall-000.png` (1 quadro) — pose aérea de queda (`max_y = 60`, acima de `Y = 63`).
  - `attack1`: `nilo-attack1-000.png` .. `003.png` (4 quadros, 22 FPS) — disparo da carabina de pulso com boca do cano alinhada ao `weaponAnchor` real de Nilo `(X = 37, Y = 44)`.
  - `hurt`: `nilo-hurt-000.png` .. `002.png` (3 quadros, 12 FPS) — recuo por impacto com centelhas verde-esmeralda/violeta.
  - `die`: `nilo-die-000.png` .. `003.png` (4 quadros, 10 FPS, `loop: false`) — queda progressiva até repouso horizontal no chão (`Y = 53..63`).
- **`nilo/illustrated/` (21 quadros `128 × 192` RGBA, pivô `X = 32`, linha do chão `Y = 128`, boca da carabina em `(X = 74, Y = 88)`):**
  - Mesmos 21 arquivos (`nilo-{idle,walk,jump,fall,attack1,hurt,die}-NNN.png`) em acabamento ilustrado `2x` (`128 × 192` RGBA).
- **`nilo/portraits/` (1 quadro `32 × 32` RGBA):**
  - `nilo-portrait-000.png` (`32 × 32` RGBA) com capacete aberto grafite/violeta, visor verde-neon e rosto negro reconhecível.

---

## 3. Prévias Animadas, Pranchas de Contato e Comparações nos 3 Cenários (`previews/`)
- **Prévias Animadas Gerais (`.gif` e `.webp`):**
  - `previews/boypunk-all-states-animated.gif` / `.webp`
  - `previews/nilo-all-states-animated.gif` / `.webp`
- **Prévias Animadas Individuais por Estado e Modo (28 arquivos `.gif` com cadência real do jogo e ambos os lados Right/Left):**
  - `previews/boypunk-classic-{idle,walk,jump,fall,attack1,hurt,die}.gif`
  - `previews/boypunk-illustrated-{idle,walk,jump,fall,attack1,hurt,die}.gif`
  - `previews/nilo-classic-{idle,walk,jump,fall,attack1,hurt,die}.gif`
  - `previews/nilo-illustrated-{idle,walk,jump,fall,attack1,hurt,die}.gif`
- **Pranchas Técnicas de Contato (21 quadros + Retrato + Espelhamento + Pivô + Colisor + Origem do Tiro):**
  - `previews/boypunk-contact-sheet-classic-and-illustrated.png`
  - `previews/nilo-contact-sheet-classic-and-illustrated.png`
- **Comparações sobre os 3 Cenários Ativos Integrados (`Distrito Neon`, `Fábrica de Sucata`, `Câmara de Energia`):**
  - `previews/comparison-all-3-environments-classic-and-illustrated.png`
  - `previews/scene-distrito-neon-boypunk-and-nilo.png`
  - `previews/scene-fabrica-sucata-boypunk-and-nilo.png`
  - `previews/scene-camara-energia-boypunk-and-nilo.png`

---

## 4. Mapa Direto para Futura Integração pelo Codex (Sem Alterar Lógica)
- `boypunk/classic/*.png` -> `assets/images/characters/classic/`
- `boypunk/illustrated/*.png` -> `assets/images/characters/illustrated/`
- `boypunk/portraits/player-portrait-000.png` -> `assets/images/characters/portraits/player-portrait-000.png`
- `nilo/classic/*.png` -> `assets/images/characters/nilo/classic/`
- `nilo/illustrated/*.png` -> `assets/images/characters/nilo/illustrated/`
- `nilo/portraits/nilo-portrait-000.png` -> `assets/images/characters/nilo/portraits/nilo-portrait-000.png`
