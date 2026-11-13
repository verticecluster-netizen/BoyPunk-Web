# Handoff Técnico de Arte e Renderização — Parallax do Distrito Neon (`distrito-neon-parallax-v1`)

## 1. Raiz, Versão e Documentos Verificados
- **Raiz canônica do projeto:** `/home/flow/Projetos/BoyPunk-Web`
- **Versão verificada no código-fonte (`package.json` e `src/version.js`):** `0.4.2`
- **Status de `AGENTS.md`:** Verificado que não existe arquivo `AGENTS.md` na raiz do projeto nem nos diretórios pais; `.agents/` e `.codex/` estão vazios.
- **Documentos inspecionados:**
  - `docs/art/PARALLAX_DISTRITO_NEON_HANDOFF.md`
  - `docs/art/AUDITORIA_GRAFICA_TODAS_AS_FASES.md`
  - `docs/RELATORIO_MECANICAS_AVANCADAS.md`
  - `docs/CONTINUIDADE_MECANICAS_AVANCADAS.md`
  - `RELATORIO_ESTADO_BOYPUNK_CODEX.md`
  - `CONTINUIDADE_BOYPUNK_WEB.md`
- **Código e assets inspecionados (somente leitura):**
  - `src/renderer.js` (`render`, `drawBackground`, `drawNeonAtmosphericLayers`, `drawCyberpunkRain`, `drawSweepingLaserGrid`, `drawAltarReactiveLighting`)
  - `src/assets.js` (`ASSET_MANIFEST`, chave `world.background` -> `assets/images/world/distrito-neon.png`)
  - `src/level-data.js` (`WORLD = { width: 480, height: 270 }`, geometria de `district-neon`)
  - `src/config.js`
  - `assets/images/world/distrito-neon.png` (`1672 × 941`, `RGB` opaco, `460.337 bytes`, SHA-256 `9e5abba5381ce8a729b507ffbc31d75c62d8873bf0bec9b6dbabec866435ceca`)

---

## 2. Situação Real da Câmera e do Renderer (`src/renderer.js`)
1. **Resolução lógica e escalas:**
   - Mundo lógico e viewport têm exatamente a mesma dimensão: **`480 × 270`** (`16:9`).
   - Escalas físicas suportadas (`this.renderScale`): `1×` (`480 × 270`, `imageSmoothingEnabled = false`), `1.5×` (`720 × 405`), `2×` (`960 × 540` padrão desktop, `imageSmoothingEnabled = true`, `imageSmoothingQuality = "high"`), até `4×`.
2. **Recorte (`cover` crop) atual de `drawBackground` (`src/renderer.js`, linhas 130–145):**
   - Como `assets/images/world/distrito-neon.png` mede **`1672 × 941`** (`sourceRatio = 1.776833 < targetRatio = 1.777778`), o renderer calcula:
     - `sx = 0`
     - `sy = 0.25`
     - `sw = 1672`
     - `sh = 940.5`
     - Desenho em destino lógico: `ctx.drawImage(background, 0, 0.25, 1672, 940.5, 0, 0, 480, 270)`.
3. **Ausência de câmera móvel:**
   - **A arena é fixa (`480 × 270`).** Não existe `camera.x`, `camera.y`, scroll horizontal/vertical do mundo nem transformação persistente de câmera.
   - O único deslocamento em execução é o `this.screenShake` temporário aplicado exclusivamente sobre `this.drawWorld(ctx, model, now)` (linhas 95–99 de `src/renderer.js`), que não afeta `drawBackground` nem `drawHud`.
   - **Implicação direta:** As camadas entregues neste pacote são material de arte preparado para futura decisão de engenharia. **Elas não produzirão parallax de câmera enquanto a arena permanecer em câmera fixa sem um deslocamento horizontal definido no renderer.**

---

## 3. Inventário de Camadas Produzidas (`layers/`)

Para atender simultaneamente à decomposição granular de 4 planos (`sky`, `skyline`, `industrial`, `foreground`) e à nomenclatura de 3 planos documentada em `docs/art/PARALLAX_DISTRITO_NEON_HANDOFF.md` (`far`, `mid`, `near`, onde `far = sky + skyline`, `mid = industrial`, `near = foreground`), ambos os conjuntos são fornecidos com registro de pixels idêntico (`1672 × 941`):

### 3.1. Conjunto Granular de 4 Camadas (`1672 × 941`)

| Ordem (Fundo → Frente) | Arquivo | Dimensões | Canais / Alpha | Bytes | SHA-256 | Cobertura Opaca / Transparente |
| :---: | :--- | :---: | :---: | ---: | :--- | :--- |
| **1 (Fundo)** | `layers/distrito-neon-sky.png` | `1672 × 941` | `RGB` (Opaco) | `78642` | `006130e288f3013439aa5a23110a164eb1ce22b7dd965e2f3348f52cc60ad631` | `100.0%` opaco (`0.0%` transp.) |
| **2** | `layers/distrito-neon-skyline.png` | `1672 × 941` | `RGBA` (Alpha binário limpo) | `67656` | `c353e5e42a959e882beda3dca6819f91afe3680df0323378e0a728dfff2ed73f` | `22.41%` opaco / `77.59%` `alpha=0` |
| **3** | `layers/distrito-neon-industrial.png` | `1672 × 941` | `RGBA` (Alpha binário limpo) | `212125` | `dc65d227bce7a77ed214c6306c3cf8680d8b704911abbcd55ee4dbcf9edb17f7` | `57.88%` opaco / `42.12%` `alpha=0` |
| **4 (Frente do BG)** | `layers/distrito-neon-foreground.png` | `1672 × 941` | `RGBA` (Alpha binário limpo) | `257111` | `e4afd2896815e1d26b215e768b5f7824bf96d08381688a0fe77cc7d1b5bc03bc` | `43.26%` opaco / `56.74%` `alpha=0` |

### 3.2. Conjunto Equivalente de 3 Camadas (`docs/art/PARALLAX_DISTRITO_NEON_HANDOFF.md`)

| Ordem (Fundo → Frente) | Arquivo | Equivalência | Dimensões | Canais | Bytes | SHA-256 |
| :---: | :--- | :--- | :---: | :---: | ---: | :--- |
| **1 (Fundo)** | `layers/distrito-neon-far.png` | `sky` + `skyline` | `1672 × 941` | `RGB` (Opaco) | `118774` | `18492027405ed0f64d70ccc2ffc05b166c36907c8281324f11cb5dbeb7e77371` |
| **2 (Médio)** | `layers/distrito-neon-mid.png` | `industrial` | `1672 × 941` | `RGBA` | `212125` | `dc65d227bce7a77ed214c6306c3cf8680d8b704911abbcd55ee4dbcf9edb17f7` |
| **3 (Próximo)** | `layers/distrito-neon-near.png` | `foreground` | `1672 × 941` | `RGBA` | `257111` | `e4afd2896815e1d26b215e768b5f7824bf96d08381688a0fe77cc7d1b5bc03bc` |

---

## 4. Ordem de Desenho, Reconstrução de Áreas Ocluídas e Garantias de Qualidade
1. **Ordem de empilhamento (sempre atrás de plataformas, altar, entidades e HUD):**
   - Opção 4 planos: `distrito-neon-sky.png` → `distrito-neon-skyline.png` → `distrito-neon-industrial.png` → `distrito-neon-foreground.png`.
   - Opção 3 planos (handoff): `distrito-neon-far.png` → `distrito-neon-mid.png` → `distrito-neon-near.png`.
   - Após as camadas de imagem, o renderer deve manter o passe de escurecimento/gradiente atmosférico (`rgba(6, 5, 18, 0.38)` + gradiente vertical), `drawNeonAtmosphericLayers`, `drawCyberpunkRain`, `drawSweepingLaserGrid` e `drawAltarReactiveLighting`.
2. **Fidelidade em `offset = 0`:**
   - A composição empilhada das 4 camadas (ou das 3 camadas do handoff) em `offset = 0` reproduz `assets/images/world/distrito-neon.png` com **`RMSE = 0.000000`** (`0` pixels divergentes).
3. **Ausência de halos e arquitetura duplicada:**
   - Cada estrutura visível do cenário pertence a **um único plano de profundidade**.
   - Todas as camadas `RGBA` possuem transparência binária limpa na grade pixel-art (`0` pixels semitransparentes residuais de recorte).
4. **Reconstrução das áreas escondidas (inpainting estrutural):**
   - `distrito-neon-sky.png`: o céu noturno, as faixas de nuvens violetas e a neblina do horizonte foram reconstruídos continuamente por trás de todas as torres, pontes, cabos e tubulações.
   - `distrito-neon-skyline.png`: os corpos verticais dos arranha-céus distantes foram reconstruídos para baixo através dos cabos de suspensão, da ponte horizontal (`y = 364..416` em `1672×941`) e do topo dos silos intermediários até `y = 664`.
   - `distrito-neon-industrial.png` (`mid`): a ponte metálica suspensa (`y = 366..410`) e as massas industriais inferiores (`y >= 412`) foram reconstruídas lateralmente por trás das colunas treliçadas e tubulações de `foreground` (`near`).
   - `distrito-neon-foreground.png` (`near`): contém exclusivamente a moldura periférica próxima (tubulações e vigas treliçadas laterais com vãos internos `alpha=0`, dutos superiores direitos e reflexos úmidos na base inferior), mantendo toda a região central da arena `100%` transparente (`alpha=0`) e sem criar qualquer plataforma ou piso falso.

---

## 5. Cobertura Disponível, Limites de Deslocamento e Fatores Sugeridos
- **Aviso importante sobre repetição horizontal:** As bordas esquerda e direita possuem estruturas industriais assimétricas (colunas e tubulações de moldura). **As camadas NÃO são compatíveis com repetição horizontal infinita (`repeat-x`).**
- **Quando houver câmera móvel ou overscan horizontal controlado:**
  - Como as imagens medem `1672 × 941` (`3,483×` a largura lógica `480`), para deslocar camadas horizontalmente sem expor fora da borda `[0..1672]`, o renderer pode:
    1. Amostrar uma janela fonte com margem horizontal simétrica (ex.: `overscan_px = 48` a `96` px na imagem fonte, correspondente a `±14` a `±28` px lógicos), **ou**
    2. Desenhar cada camada com leve overscan horizontal no espaço lógico (ex.: `destX = -16 - offset_x`, `destW = 512`), mantendo o fallback `assets/images/world/distrito-neon.png` por baixo.
  - **Fatores de parallax recomendados (conforme `docs/art/PARALLAX_DISTRITO_NEON_HANDOFF.md`):**
    - Em 3 planos: `far = 0.2×`, `mid = 0.5×`, `near = 0.8×` (com gameplay, plataformas, colisões e altar sempre em `1.0×`).
    - Em 4 planos: `sky = 0.1×`, `skyline = 0.25×`, `industrial = 0.5×`, `foreground = 0.8×` (gameplay em `1.0×`).
  - **Limite seguro de deslocamento relativo entre planos (sem necessidade de `repeat-x`):** até **`±28 px` na imagem fonte (`±8 px` lógicos)** a reconstrução interna absorve qualquer deslocamento relativo entre `skyline`, `industrial` e `foreground` sem abrir lacunas nas treliças ou pontes.

---

## 6. Instruções de Integração Futura (Restritas ao Renderer / Codex)
1. Manter `assets/images/world/distrito-neon.png` (`world.background`) intacto como fallback obrigatório.
2. Registrar as camadas desejadas em `src/assets.js` como opcionais (`required: false`), por exemplo:
   - `world.background.neon.far` (`distrito-neon-far.png`), `world.background.neon.mid` (`distrito-neon-mid.png`), `world.background.neon.near` (`distrito-neon-near.png`), **ou** as 4 camadas (`sky`, `skyline`, `industrial`, `foreground`).
3. Em `Renderer.drawBackground(ctx, model, now)` (`src/renderer.js`), quando `isDistrict` for verdadeiro e todas as camadas opcionais estiverem carregadas, desenhá-las na ordem `far -> mid -> near` (ou `sky -> skyline -> industrial -> foreground`) usando a mesma função de recorte `cover` antes do escurecimento atmosférico `rgba(6, 5, 18, 0.38)`. Se qualquer camada opcional não estiver disponível, manter o `ctx.drawImage(background, ...)` atual.
4. Nunca aplicar fatores decorativos de parallax a plataformas, jogadores, inimigos, projéteis, almas, power-ups, altar ou HUD.

---

## 7. Prévias Produzidas (`previews/` — Todas Rotuladas como `PRÉVIA NÃO INTEGRADA`)
1. `previews/01-layers-decomposition-sheet.png` — Decomposição individual das camadas sobre *checkerboard* e sobre fundo escuro `#090714`.
2. `previews/02-full-composite-1672x941.png` — Composição completa em resolução nativa `1672 × 941`.
3. `previews/03-active-vs-candidate-comparison.png` — Comparativo lado a lado entre o fundo ativo e a composição candidata (`RMSE = 0.000000`).
4. `previews/04-logical-480x270-and-grayscale.png` — Prévia no tamanho lógico real do jogo (`480 × 270`) em cor, escala de cinza e com entidades/plataformas de gameplay.
5. `previews/05-zoomed-inspection-and-occlusion-reconstruction.png` — Inspeção ampliada das bordas alpha e das áreas reconstruídas atrás da ponte, cabos e treliças.
