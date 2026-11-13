# Pacote de Personagens `personagens-v2.1` — Correção Pós-Revisão do Codex

## 1. Resumo Executivo
- **Caminho do pacote:** `/home/flow/Projetos/BoyPunk-Web/art-deliveries/antigravity/personagens-v2.1/`
- **Pacote anterior preservado:** `/home/flow/Projetos/BoyPunk-Web/art-deliveries/antigravity/personagens-v2/` (100% intacto)
- **Status:** **CONCLUÍDO** — todas as observações da revisão independente do Codex (`RELATORIO_REVISAO_PERSONAGENS_V2.md`) foram corrigidas e verificadas.

---

## 2. Correções Aplicadas em `personagens-v2.1`

1. **Legibilidade e Silhueta de Nilo (`nilo/classic/`, `nilo/illustrated/`, `nilo/portraits/`):**
   - Os planos metálicos da armadura grafite (capacete, tronco, perna frontal, perna traseira, botas e carabina de pulso) receberam separação tonal de titânio-grafite escovado (`S = #a8b6d2`, `G = #808eaa`, `g = #5c6884`) e acentos seletivos violeta/verde-esmeralda, garantindo leitura imediata sobre os fundos escuros de **Distrito Neon**, **Fábrica de Sucata** e **Câmara de Energia**, inclusive em `480 × 270`.
   - **Preservação rigorosa:** A identidade de homem negro e os tons de pele originais (`F/f/s/m`) foram preservados sem clareamento artificial; não foi adicionado halo luminoso uniforme.
   - **Diferenciação `jump` vs `fall` ampliada:** `nilo-jump-000` apresenta impulso ascendente (`head_y=26`/`52`, joelho frontal recolhido alto em `Y=57`/`114`) enquanto `nilo-fall-000` apresenta abertura ampla das pernas para pouso (`head_y=29`/`58`, perna traseira recolhida em `Y=56`/`112` e frontal estendida em `Y=60`/`120`).

2. **Remoção do Artefato Isolado em `nilo-hurt-001` (Clássico e Ilustrado):**
   - O componente verde isolado (`1 × 1` no clássico em `(22, 40)` e `4 × 4` no ilustrado em `(44..47, 80..83)`) que flutuava desconectado acima do cano da carabina foi removido.
   - As descargas de impacto em `nilo-hurt-001` agora são contíguas à superfície da armadura (ombreira e peitoral), confirmadas por análise de componentes conexos no canal alpha (`0` ilhas flutuantes de `1×1` ou `4×4`).

3. **Continuidade do Ciclo `idle` (`idle-000` .. `idle-003`) e Hashes Únicos de Nilo:**
   - Em `v2`, `nilo-idle-003` era idêntico a `nilo-idle-000`, gerando pausa dupla de `400ms` no fechamento do loop de `5 FPS`.
   - Em `v2.1`, `nilo-idle-003` foi redesenhado como quadro de transição ascendente (tronco e cabeça retornando ao eixo neutro enquanto a carabina/braços acompanham com inércia sutil de `1px` e ciclo nos capacitores verdes).
   - Todos os **21 quadros clássicos** e **21 quadros ilustrados** de Nilo possuem agora hashes `SHA-256` únicos (`21/21` únicos no clássico e `21/21` únicos no ilustrado).

4. **Preservação Integral dos Sprites Aprovados de BoyPunk:**
   - Os **43 PNGs de BoyPunk** (`21` clássicos, `21` ilustrados e `1` retrato) aprovados tecnicamente pelo Codex foram copiados byte a byte de `personagens-v2` sem alteração (`0/43` hashes alterados).

5. **Prévias Corrigidas (`previews/`):**
   - **Todos os 7 estados incluídos** (`idle`, `walk`, `jump`, `fall`, `attack1`, `hurt`, `die`) tanto nas prévias individuais quanto nas pranchas animadas gerais (`*-all-states-animated.gif` / `.webp`).
   - **Cadência e repetição reais de `src/animation.js`:** Nenhum atraso artificial (`600ms`) foi injetado dentro de `die` (`100ms`/quadro, `loop: false`). As prévias gerais amostram exatamente `animationFrame(entity, PLAYER_ANIMATIONS[state])` em relógio de tempo real (`dt = 40ms`).
   - **Marcadores de origem de tiro espelhados corrigidos:** Todas as células espelhadas (`Facing Left`) aplicam exatamente a transformação de `Renderer.drawPlayer` (`renderX = drawX - 32*s` com `ImageOps.mirror`) e `resolveWeaponAnchor`, posicionando a cruz vermelha exatamente sobre a boca do cano nos dois sentidos (`Right` e `Left`), comprovado em `previews/muzzle-and-mirror-verification-v2.1.png`.
   - **Comparação Antes/Depois de Nilo (`v2` vs `v2.1`):** Incluída em `previews/nilo-before-after-v2-vs-v2.1-all-3-environments.png`.

---

## 3. Mapeamento Correto para os Caminhos Ativos (`src/assets.js`)

Confirmado por leitura direta de `src/assets.js` (linhas 15–98 e 154–168):

| Arquivo no Pacote `personagens-v2.1` | Destino Ativo Real no Jogo (`src/assets.js`) |
| :--- | :--- |
| `boypunk/classic/playeranim-{estado}-{NNN}.png` | `assets/images/player-helmet/playeranim-{estado}-{NNN}.png` |
| `boypunk/illustrated/playeranim-{estado}-{NNN}.png` | `assets/images/characters/boypunk-illustrated/playeranim-{estado}-{NNN}.png` |
| `boypunk/portraits/player-portrait-000.png` | `assets/images/player-helmet/player-portrait-000.png` |
| `nilo/classic/nilo-{estado}-{NNN}.png` | `assets/images/characters/nilo/nilo-{estado}-{NNN}.png` |
| `nilo/illustrated/nilo-{estado}-{NNN}.png` | `assets/images/characters/nilo-illustrated/nilo-{estado}-{NNN}.png` |
| `nilo/portraits/nilo-portrait-000.png` | `assets/images/characters/nilo/nilo-portrait-000.png` |

*(Observação: projéteis `bulletcandymachine-*` e `nilo-heal-000..003.png` não fazem parte deste lote e devem ser preservados nos diretórios de destino.)*
