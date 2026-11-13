# Handoff Visual e Técnico de Efeitos — Distrito Neon Premium (`distrito-neon-premium-v1`)

## 1. Identificação, Raiz e Versionamento
- **Raiz do projeto:** `/home/flow/Projetos/BoyPunk-Web`
- **Versão verificada:** `0.4.2`
- **Diretório exclusivo da entrega:** `art-deliveries/antigravity/distrito-neon-premium-v1/`
- **Status:** Candidatos produzidos e revisados em prévias (material não integrado ao jogo; código e assets de runtime intactos).

---

## 2. Inventário de Decisões Pré-Produção

| Efeito | Implementação Atual no Jogo | Necessidade | Entrega Proposta em `distrito-neon-premium-v1` | Ação Recomendada na Futura Integração |
| :--- | :--- | :--- | :--- | :--- |
| **Foreground Decorativo** | Fundo próximo decorativo existente (`distrito-neon-near.png` em `1672×941`) desenhado sob a atmosfera e antes das plataformas. Não há camada à frente do mundo. | Adicionar profundidade imediata com moldura industrial em cantos verificados sem ocluir rotas, pickups, plataformas ou combate. | `foreground/foreground-distrito-neon.png` (480×270 RGBA estático, 2.406 bytes). | Adicionar passe de desenho pós-entidades ou antes do HUD authoritative. |
| **Chuva Cyberpunk** | Procedural via Canvas 2D (`drawCyberpunkRain`, 65 linhas rotativas a cada frame). | Oferecer alternativa texturizada contínua de 3 planos com repetição vertical sem costura para fidelidade pixel-art e economia de processamento em dispositivos fracos. | `weather/rain-far.png`, `weather/rain-mid.png`, `weather/rain-near.png` (480×270 RGBA contínuas) e `weather/rain-splash.png` (24×8). | Substituir ou complementar o laço procedural `drawCyberpunkRain` no renderer. Não sobrepor cegamente. |
| **Muzzle Flashes** | Procedural vetorial em `drawPlayer` (arcos de bloom e retângulos estáticos de cor laranja/ciano). | Substituir desenho geométrico por pixel-art com identidade visual autêntica dos protagonistas: plasma ciano/laranja para BoyPunk; pulso verde/violeta para Nilo. | `combat/muzzle-boypunk.png` (128×32, 4 frames) e `combat/muzzle-nilo.png` (128×32, 4 frames). | Substituir o bloco procedural de `drawPlayer` por consumo de sprite-sheet ancorado na arma. |
| **Faíscas de Impacto e Coleta** | Procedural em `drawEffects` (arcos trigonométricos e retângulos dinâmicos). | Aumentar legibilidade do impacto e feedback imediato de colisão/coleta. | `combat/hit-spark.png` (64×16, 4 frames) e `combat/pickup-spark.png` (48×16, 3 frames). | Integrar na pilha de efeitos de `drawEffects` para impactos em inimigo/parede e coleta de alma/power-up. |

---

## 3. Especificações Técnicas dos Assets

### 3.1. Foreground Decorativo
- **Arquivo:** `foreground/foreground-distrito-neon.png`
- **Dimensões:** `480 × 270` pixels (RGBA 8-bit).
- **Tamanho:** `2.406` bytes | **Memória decodificada:** `518.400` bytes (506,25 KiB).
- **SHA-256:** `c245c5398e874b6f46eaa6ad6a2b94b083b197e6cb8e78d5d55436b4f6c0d84d`
- **Composição:** Vigas metálicas e cantoneiras no topo esquerdo (`x: 0..85, y: 0..16`), feixes de cabos catenários suspensos com indicadores discretos, duto de ventilação no topo direito com tarja de aviso seletiva (`x: 400..480, y: 0..18`) e drenos periféricos discretos nos cantos inferiores (`x: 0..14` e `x: 466..480` em `y: 256..270`). A arena central (`x: 20..460, y: 20..250`) permanece 100% transparente (`alpha=0`).
- **Opacidade sugerida:** Alpha incorporado já calibrado; opacidade global de `0.92` a `1.0` no renderer.
- **Ordem de desenho:** Imediatamente após entidades/projéteis e antes do HUD, ou antes dos projéteis caso se deseje que os tiros passem visualmente por cima das vigas superiores.

### 3.2. Clima / Chuva Texturizada (Weather)
- **Formatos:** PNG RGBA de repetição vertical comprovada (`480 × 270`).
- `weather/rain-far.png` (3.542 bytes, SHA-256: `709c7f73cc780638a5d24b4b71eec4726ec904bb5e9c84ad3919fcee4f77373f`):
  - Camada de fundo: 120 traços finos, velocidade sugerida `480 px/s`, deriva horizontal `60 px/s`, opacidade global `0.40`. Desenhar logo acima do background.
- `weather/rain-mid.png` (3.929 bytes, SHA-256: `8c057ddbe75ead882fa3df02012b7b023c23019a2e217a68014a9f7006309c75`):
  - Camada média: 75 traços intermediários ciano/violeta, velocidade `650 px/s`, deriva horizontal `80 px/s`, opacidade global `0.65`. Desenhar antes das plataformas/entidades.
- `weather/rain-near.png` (5.505 bytes, SHA-256: `4e3035cbb95c2900d7723ec333015241c2b895f2ce76b7b5b43d4e7bc3e12a96`):
  - Camada frontal: 32 traços velozes espaçados com centro branco, velocidade `850 px/s`, deriva horizontal `110 px/s`, opacidade global `0.80`. Desenhar após entidades.
- `weather/rain-splash.png` (140 bytes, SHA-256: `e77a62884ba67d943d6c857a37acdda3f52381ead9d4c7362eb106ca4194fbff`):
  - Sheet horizontal `24 × 8` (3 células de `8 × 8`), âncora local no contato do solo `(4, 7)`. Duração por frame: `40 ms` (sem loop).

### 3.3. Efeitos de Combate (Combat VFX)
- `combat/muzzle-boypunk.png` (284 bytes, SHA-256: `30058f1c9fed413ebfde92cac45775cde27079f6d8e3b30c897036a5d1568c06`):
  - Sheet horizontal `128 × 32` (4 frames de `32 × 32`).
  - Âncora local de cada célula: `(6, 16)`. Alinha com `forward: 27, y: 16` de BoyPunk.
  - Identidade: Descarga de rifle de plasma (núcleo branco incandescente, arco de plasma ciano `#2ee6ff` e confinamento magnético laranja `#ff7a28`).
  - Duração: 4 frames a `50 ms` cada = `200 ms` no total (sem loop).
- `combat/muzzle-nilo.png` (273 bytes, SHA-256: `3de64697dc493bcbae8aaa4b3bbe1b75fdf9856405254f8eb92feb5a09f3606f`):
  - Sheet horizontal `128 × 32` (4 frames de `32 × 32`).
  - Âncora local de cada célula: `(6, 16)`. Alinha com `forward: 21, y: 12` de Nilo.
  - Identidade: Canhão de pulso gravitacional (núcleo branco puro, frente esmeralda `#2ee6a8` e lâminas harmônicas ressonantes violeta `#ae62ff`).
  - Duração: 4 frames a `50 ms` cada = `200 ms` no total (sem loop).
- `combat/hit-spark.png` (228 bytes, SHA-256: `4d6c8a2aac5fcd52c0742a9534144db46438c1fb5d26cc65f93fca2ee11b9755`):
  - Sheet horizontal `64 × 16` (4 frames de `16 × 16`).
  - Âncora local no centro: `(8, 8)`.
  - Duração: 4 frames a `40 ms` cada = `160 ms` no total (sem loop).
- `combat/pickup-spark.png` (205 bytes, SHA-256: `f2172e3752ef8fcd5ad0b5954e9a3a1bfd61e2b76f6351c3ce73ee0e5f1a68fa`):
  - Sheet horizontal `48 × 16` (3 frames de `16 × 16`).
  - Âncora local no centro: `(8, 8)`.
  - Duração: 3 frames a `45 ms` cada = `135 ms` no total (sem loop).

---

## 4. Custos e Pegada de Memória

| Conjunto | Tamanho em Disco (PNG) | Memória RGBA Decodificada | Impacto no Desempenho |
| :--- | :---: | :---: | :--- |
| **Foreground Estático** | `2.406 bytes` (~2,35 KiB) | `518.400 bytes` (0,49 MiB) | Único `drawImage` em 480×270 por frame. Custo de fill-rate nulo na área transparente (93% do canvas). |
| **Chuva Texturizada (3 planos + splash)** | `13.116 bytes` (~12,81 KiB) | `1.555.968 bytes` (1,48 MiB) | Substitui o laço de 65 strokes vetoriais por 3 blits `drawPattern` / `drawImage`. Menor custo de CPU. |
| **Combat Sprite-sheets (4 arquivos)** | `990 bytes` (~0,97 KiB) | `39.936 bytes` (0,04 MiB) | Instantâneo e desprezível. Instanciado somente durante disparo/impacto. |
| **TOTAL DO PACOTE** | **`16.512 bytes` (16,12 KiB)** | **`2.114.304 bytes` (2,02 MiB)** | Extremamente leve e otimizado para navegadores e mobile. |

---

## 5. Instruções Técnicas para Futura Integração (Codex)

1. **Manifesto (`src/assets.js`):**
   - Proposta de chaves de runtime:
     - `world.foreground.district`: `assets/images/world/foreground-distrito-neon.png`
     - `weather.district.rain.far`: `assets/images/weather/rain-far.png`
     - `weather.district.rain.mid`: `assets/images/weather/rain-mid.png`
     - `weather.district.rain.near`: `assets/images/weather/rain-near.png`
     - `weather.district.rain.splash`: `assets/images/weather/rain-splash.png`
     - `combat.muzzle.boypunk`: `assets/images/combat/muzzle-boypunk.png`
     - `combat.muzzle.nilo`: `assets/images/combat/muzzle-nilo.png`
     - `combat.hit.spark`: `assets/images/combat/hit-spark.png`
     - `combat.pickup.spark`: `assets/images/combat/pickup-spark.png`
2. **Eventos e Parâmetros:**
   - Consumir `player.attackTimer` e `player.facing` para disparar os muzzles.
   - Espelhamento de muzzle flash via `ctx.scale(-1, 1)` com pivot no ponto de ancoragem `(weaponAnchor.x, weaponAnchor.y)`.
   - Limpeza estrita de instâncias de faíscas ao atingir a duração de vida designada (máximo 160 ms).
3. **Movimento Reduzido (`reducedMotion`):**
   - Quando `model.reducedMotion` estiver ativo: desativar ou reduzir as camadas de chuva frontal e média; manter apenas feedback estático discreto de muzzle e faíscas sem trepidação de tela.

