# Pacote de Refino de Cenários (`refino-fases-v1`) — BoyPunk! Web (`0.4.2`)

> **Status da Entrega:** `Assets staged for review. Runtime integration has not been performed.`
> **Escopo de Escrita:** Exclusivamente `/home/flow/Projetos/BoyPunk-Web/art-deliveries/antigravity/refino-fases-v1/`. Nenhum arquivo de código (`src/*`), teste (`tests/*`), asset ativo (`assets/images/*`), pacote do Cyber Lab ou release standalone foi modificado.

---

## 1. Contratos de Projeto Verificados (`0.4.2`)

A inspeção direta de `src/config.js`, `src/assets.js`, `src/renderer.js`, `src/level-data.js`, `docs/art/AUDITORIA_GRAFICA_TODAS_AS_FASES.md` e `docs/art/CYBER_LAB_ART_HANDOFF.md` confirmou os seguintes contratos técnicos em vigor:

- **Versão do código-fonte:** `0.4.2` (`GAME_META.version` em `src/config.js` e `package.json`).
- **Auditoria gráfica (`docs/art/AUDITORIA_GRAFICA_TODAS_AS_FASES.md`):** Documento completo de 434 linhas com 6 capturas reais de navegador em `evidencias/auditoria-grafica-2026-11-04/`.
- **Mapeamento de Fases e Chaves de Manifesto (`src/assets.js` & `src/renderer.js`):**
  1. **Distrito Neon** (`id: "district-neon"`, `theme: "district-neon"`):
     - Background: chave `world.background` (`assets/images/world/distrito-neon.png`, resolução nativa `1672 × 941`).
     - Tileset: chave `world.tiles` (`assets/images/world/platformtiles.png`, `128 × 128` RGBA).
  2. **Fábrica de Sucata** (`id: "scrap-factory"`, `theme: "scrap-factory"`):
     - Background: chave `world.background.factory` (`assets/images/world/fabrica-sucata.png`, resolução nativa `1365 × 768`).
     - Tileset: chave `world.tiles.factory` (`assets/images/world/factory-platformtiles.png`, `128 × 128` RGBA).
  3. **Câmara de Energia — Fase Bônus** (`id: "energy-chamber"`, `theme: "energy-chamber"`):
     - Background: chave `world.background.bonus` (`assets/images/world/camara-energia.png`, resolução nativa `1365 × 768`).
     - Tileset: chave `world.tiles.bonus` (`assets/images/world/energy-platformtiles.png`, `128 × 128` RGBA).
- **Comportamento de Crop e Escala do `Renderer.drawBackground` (`src/renderer.js`):**
  - Mundo lógico fixo em `480 × 270` (`16:9`, `1.7777...`).
  - `drawBackground` calcula recorte centralizado em proporção `16:9` sobre a imagem nativa (`sw = 1672, sh = 940.5, sy = 0.25` para imagens `1672 × 941`; `sw = 1365, sh = 767.8125, sy = 0.09375` para imagens `1365 × 768`) e desenha em `(0, 0, 480, 270)`.
  - No modo **Clássico** (`renderScale = 1`, `canvas` `480 × 270`), `ctx.imageSmoothingEnabled = false` (amostragem *nearest-neighbor*).
  - No modo **Ilustrado** (`renderScale = 2`, `canvas` `960 × 540`), `ctx.imageSmoothingEnabled = true` e `ctx.imageSmoothingQuality = "high"`.
- **Contrato de Amostragem de Tilesets (`Renderer.drawPlatforms`):**
  - Folha PNG RGBA de `128 × 128` px.
  - **Tile One-Way (`platform.oneWay === true`):** amostrado em `sx = 0, sy = 0, sw = 16, sh = 16`, repetido em grade de `16 × 16` e recortado (`ctx.clip()`) pela altura da plataforma (`h = 12`).
  - **Tile Sólido (`platform.oneWay === false`):** amostrado em `sx = 16, sy = 0, sw = 16, sh = 16`, repetido em grade de `16 × 16` sobre o piso (`y = 240, h = 30`) e paredes laterais (`x = 0..16` e `x = 464..480, h = 270`).
  - **Sobreposições procedurais do `Renderer`:** preenchimento escuro semitransparente sob os tiles, filetes superiores luminosos de `1 px` (ciano em plataformas *one-way*) ou `2 px` (âmbar/violeta em plataformas sólidas), chanfros inferiores e reflexos de piso.

---

## 2. Problemas Diagnosticados nos Cenários Atuais

Com base na auditoria gráfica (`docs/art/AUDITORIA_GRAFICA_TODAS_AS_FASES.md`) e na inspeção direta em `480 × 270`:

1. **Distrito Neon (`assets/images/world/distrito-neon.png` + `platformtiles.png`):**
   - **Falsas plataformas no background:** Passarelas metálicas iluminadas em laranja/âmbar (`y ≈ 116` e `y ≈ 184`) e uma ponte central horizontal competiam diretamente com as plataformas reais (`y = 96, 146, 182`).
   - **Saturação excessiva no plano médio:** Janelas magenta/ciano de alto contraste e reflexos verticais intensos no piso disputavam atenção com projéteis (`#ff4f81` / `#37e6ee`), almas coletáveis e o Altar.
   - **Tileset raso:** `platformtiles.png` possuía apenas `4` cores sem chanfro superior/inferior nem transparência na base da viga *one-way* (`h = 12`).
2. **Fábrica de Sucata (`assets/images/world/fabrica-sucata.png` + `factory-platformtiles.png`):**
   - **Oito tiras verticais de neon ciano saturado nos pilares:** Competiam diretamente com almas ciano (`soul.cyber`), projéteis do jogador e filetes das passarelas.
   - **Falso degrau de esteira à esquerda (`x ≈ 288..604, y ≈ 592..686` nativo):** Criava a ilusão de plataforma pisável acima do piso real (`y = 240`) ao lado do Altar (`x = 40, y = 192`).
   - **Eixo central poluído atrás da prensa (`x = 218..262`):** Estruturas de fundo reduziam o contraste da prensa hidráulica (`scrap-press-01`) e de seus chevrons de aviso.
   - **Repetição estroboscópica no tileset:** `factory-platformtiles.png` usava listras diagonais de alto contraste na célula *one-way* e rebites claros saltados na célula sólida, gerando efeito "zíper" ao repetir no piso (`480 × 30`).
3. **Câmara de Energia (`assets/images/world/camara-energia.png` + `energy-platformtiles.png`):**
   - **Textos e números queimados no background:** O arco superior exibia o título `"Câmara de Energia"` logo atrás do painel central do HUD (`x = 144..348, y = 7..45`), além de placas `"HIGH VOLTAGE"`, `"DANGER"`, `"REACTOR ACTIVE"`, números `"101 029"` e glifos verticais laranjas.
   - **Núcleo central chapado e cilindros laterais estourados:** O grande oval central era preenchido por ciano chapado de alta luminância que ofuscava as `30` almas bônus e o feixe de mira do Canhão Bônus (`x = 448, y = 220`).
   - **Tileset excessivamente ruidoso:** `energy-platformtiles.png` tinha grade interna brilhante que poluia as `10` plataformas *one-way* e as paredes laterais.

---

## 3. Escolhas de Direção de Arte por Ambiente (2º Passe Finalizado)

Os candidatos do 1º passe foram preservados integralmente em `documentation/pass1-candidates-preserved/` antes da aplicação do 2º passe visual:

1. **Distrito Neon (`world/distrito-neon.png` & `world/platformtiles.png`):**
   - **Background (`1672 × 941` RGB):** Construído a partir de nova base conceitual gerada por IA (`bg_distrito_neon_candidate_raw_1793815853722.jpg`) submetida a pipeline determinístico de pixel-art em Python (`Pillow`) na metade da resolução (`836 × 470`) e escalada `2×` via *nearest-neighbor* para `1672 × 941`. No 2º passe, todas as barras horizontais ciano no plano médio que podiam simular plataformas foram eliminadas; adicionaram-se janelas distantes em pixel-art no horizonte, neblina atmosférica violeta/azul-noturna para separar primeiro plano e fundo, pontos focais âmbar/ciano nos pórticos laterais e reflexos horizontais sutis de chuva no piso escuro.
   - **Tileset (`128 × 128` RGBA):** Metal industrial úmido com borda superior ciano (`sx = 0`, *one-way*) e transparência alfa genuína nas linhas inferiores (`y = 12..15`) para encaixe limpo em plataformas de `12 px` de altura; bloco sólido (`sx = 16`) em aço escuro com soleira âmbar e cursos de blindagem escalonados de baixo contraste.
2. **Fábrica de Sucata (`world/fabrica-sucata.png` & `world/factory-platformtiles.png`):**
   - **Background (`1365 × 768` RGB):** Refinado por edição raster e *overpainting* pixel-art em Python (`Pillow`) sobre o background do projeto. No 2º passe: (a) removidas todas as `8` tiras verticais de neon ciano e seus halos nos pilares internos e externos, substituídas por vigas de aço escuro com pequenos indicadores industriais âmbar/ciano; (b) removida a falsa esteira/degrau inferior esquerdo (`x = 288..604, y = 592..686`), substituída por sucata metálica pixel-art escura amostrada da própria cena; (c) escurecido suavemente o vão central (`x = 624..741, y = 340..515`) para destacar a prensa `scrap-press-01`; (d) enriquecido o brilho quente da fornalha inferior central; e (e) acalmadas as janelas superiores atrás do HUD.
   - **Tileset (`128 × 128` RGBA):** Aço forjado pesado com fuligem e pátina discreta de ferrugem, substituindo as diagonais estridentes por treliça industrial de baixo contraste (`sx = 0`) e placas blindadas sem efeito "zíper" (`sx = 16`).
3. **Câmara de Energia (`world/camara-energia.png` & `world/energy-platformtiles.png`):**
   - **Background (`1365 × 768` RGB):** Refinado por edição raster e *overpainting* pixel-art em Python (`Pillow`). No 2º passe: (a) removidos `100%` dos textos, números e glifos queimados na imagem (`Câmara de Energia`, `HIGH VOLTAGE`, `DANGER`, `REACTOR ACTIVE`, `101 029` e glifos verticais laranjas); (b) substituído o oval central chapado por uma câmara de contenção magnética profunda com anéis harmônicos suaves que preservam contraste máximo para as `30` almas bônus; (c) reduzido o brilho dos cilindros ciano à direita e escurecido o painel atrás do Canhão Bônus (`x = 448, y = 220`).
   - **Tileset (`128 × 128` RGBA):** Estrutura de contenção escura com canais de fibra óptica rebaixados em ciano/violeta de baixo contraste (`sx = 0` e `sx = 16`).

---

## 4. Especificações Exatas dos Arquivos Entregues

### 4.1. Candidatos Finais de Cenário (`world/`)

| Arquivo Relativo | Chave Alvo (`src/assets.js`) | Destino em Produção (Futuro) | Dimensões | Modo de Cor | Tamanho (Bytes) | Memória RGBA Decodificada | SHA-256 |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `world/distrito-neon.png` | `world.background` | `assets/images/world/distrito-neon.png` | `1672 × 941` | `RGB` (opaco) | `460.337` | `6.293.408 B` (`6,00 MB`) | `9e5abba5381ce8a729b507ffbc31d75c62d8873bf0bec9b6dbabec866435ceca` |
| `world/fabrica-sucata.png` | `world.background.factory` | `assets/images/world/fabrica-sucata.png` | `1365 × 768` | `RGB` (opaco) | `1.103.992` | `4.193.280 B` (`4,00 MB`) | `68c91c21884b96d37713537356db9f9e5fa2e07ef1d9e5576b7e185d5c909b70` |
| `world/camara-energia.png` | `world.background.bonus` | `assets/images/world/camara-energia.png` | `1365 × 768` | `RGB` (opaco) | `1.283.230` | `4.193.280 B` (`4,00 MB`) | `8bc080cef0afb2a7a58c5fdba665dc5fddc94c02ba66db5bc04783376bf3d1fc` |
| `world/platformtiles.png` | `world.tiles` | `assets/images/world/platformtiles.png` | `128 × 128` | `RGBA` (`15.904` px `alpha=0`) | `518` | `65.536 B` (`0,06 MB`) | `11cfd732d97b53e1aa2371a0602080aadea5e9b96e24296e1123b9d427a1e843` |
| `world/factory-platformtiles.png` | `world.tiles.factory` | `assets/images/world/factory-platformtiles.png` | `128 × 128` | `RGBA` (`15.904` px `alpha=0`) | `571` | `65.536 B` (`0,06 MB`) | `996c490fb5db2ff23916013646d33c4842bf52122253eab61f8533191cd61b54` |
| `world/energy-platformtiles.png` | `world.tiles.bonus` | `assets/images/world/energy-platformtiles.png` | `128 × 128` | `RGBA` (`15.904` px `alpha=0`) | `530` | `65.536 B` (`0,06 MB`) | `5a1943b461bac4f39818819f514ecee0fb797a320a4e386fd12fbcf01e7d80df` |

- **Orçamento Total dos 6 Candidatos (`world/`):** `2.849.178 bytes` (`2,72 MB` em disco) / `14.876.576 bytes` (`14,19 MB` em memória RGBA decodificada — idêntico ao orçamento de pixels dos assets ativos correspondentes).

---

## 5. Layout de Coordenadas dos Tilesets (`128 × 128` RGBA)

Todos os três tilesets (`world/platformtiles.png`, `world/factory-platformtiles.png`, `world/energy-platformtiles.png`) obedecem exatamente ao contrato de `Renderer.drawPlatforms`:

- `sx = 0..15, sy = 0..15` (`16 × 16` px): **Tile One-Way** (`platform.oneWay === true`).
  - `y = 0..1`: Trilho superior iluminado + chanfro especular.
  - `y = 2..11`: Corpo estrutural da passarela/viga (visível dentro do `clip` de `h = 12`).
  - `y = 12..15`: Transição inferior com transparência alfa real (`alpha = 0` em `y = 14..15`).
- `sx = 16..31, sy = 0..15` (`16 × 16` px): **Tile Sólido** (`platform.oneWay === false`).
  - `y = 0..1`: Soleira reforçada de piso/parede.
  - `y = 2..15`: Cursos horizontais de blindagem escalonados (`16 × 16` *seamless* nos eixos X e Y).
- `x = 32..127` ou `y = 16..127`: Região não amostrada mantida `100%` transparente (`RGBA(0, 0, 0, 0)`).

---

## 6. Prévias e Folhas de Comparação (`previews/`)

Foram geradas `21` folhas de inspeção em `previews/` (`7` por ambiente):

### Distrito Neon
1. `previews/distrito-neon-bg-480x270.png` — Background puro na resolução lógica `480 × 270` após crop/filtragem do jogo.
2. `previews/distrito-neon-bg-480x270-grayscale.png` — Inspeção de valores e hierarquia tonal em escala de cinza (`480 × 270`).
3. `previews/distrito-neon-platform-strips.png` — Zoom `4×` *nearest-neighbor* sobre *checkerboard* (exclusivo da prévia) + tiras repetidas *one-way* e sólidas (`480 × 270`).
4. `previews/distrito-neon-composite-classic-1x.png` — Composite `480 × 270` (modo Clássico `1×`) com geometria real de `src/level-data.js`, BoyPunk, Nilo, inimigos, projéteis, almas, power-up, Altar e HUD.
5. `previews/distrito-neon-composite-illustrated-2x.png` — Composite `960 × 540` (modo Ilustrado `2×`) com sprites `*.illustrated` e suavização de alta qualidade.
6. `previews/distrito-neon-classic-vs-illustrated.png` — Comparação lado a lado Clássico (`1×`) vs. Ilustrado (`2×`) (`960 × 300`).
7. `previews/distrito-neon-before-after.png` — Comparação Antes (ativo atual) vs. Depois (`refino-fases-v1`) com enquadramento e posicionamentos idênticos (`960 × 576`).

### Fábrica de Sucata
8. `previews/fabrica-sucata-bg-480x270.png` (`480 × 270`)
9. `previews/fabrica-sucata-bg-480x270-grayscale.png` (`480 × 270`)
10. `previews/fabrica-sucata-platform-strips.png` (`480 × 270`)
11. `previews/fabrica-sucata-composite-classic-1x.png` (`480 × 270` — inclui prensa hidráulica central `scrap-press-01` em `x = 218, w = 44` e Altar em `x = 40, y = 192`)
12. `previews/fabrica-sucata-composite-illustrated-2x.png` (`960 × 540`)
13. `previews/fabrica-sucata-classic-vs-illustrated.png` (`960 × 300`)
14. `previews/fabrica-sucata-before-after.png` (`960 × 576`)

### Câmara de Energia (Fase Bônus)
15. `previews/camara-energia-bg-480x270.png` (`480 × 270`)
16. `previews/camara-energia-bg-480x270-grayscale.png` (`480 × 270`)
17. `previews/camara-energia-platform-strips.png` (`480 × 270`)
18. `previews/camara-energia-composite-classic-1x.png` (`480 × 270` — inclui as `30` almas bônus nas coordenadas exatas de `bonusSoulPositions`, fosso central `x = 216..264` e Canhão Bônus em `448, 220` com laser de mira)
19. `previews/camara-energia-composite-illustrated-2x.png` (`960 × 540`)
20. `previews/camara-energia-classic-vs-illustrated.png` (`960 × 300`)
21. `previews/camara-energia-before-after.png` (`960 × 576`)

---

## 7. Notas de Legibilidade, Limitações Registradas e Passos de Integração Futura

- **Validação de Legibilidade:** Nos composites `1×` (`480 × 270`), `2×` (`960 × 540`) e em escala de cinza, o background permanece na faixa de valor médio-escuro, garantindo separação imediata para BoyPunk, Nilo, Chaser, Patrol Shooter, Turret, projéteis, almas, power-ups, Altar, prensa da fábrica, Canhão Bônus e HUD.
- **Registro Honesto de Proveniência e Limitação de Ferramenta:** Durante a geração de conceitos base via subagente `image-generator`, a API atingiu limite de cota (`429 Too Many Requests: RESOURCE_EXHAUSTED`) após gerar a base de `Distrito Neon` (`bg_distrito_neon_candidate_raw_1793815853722.jpg`). Conforme a diretriz de contingência do projeto, `world/distrito-neon.png` utilizou a nova base gerada + refinamento pixel-art em Python (`Pillow`), enquanto `world/fabrica-sucata.png` e `world/camara-energia.png` foram produzidos por edição raster determinística e *overpainting* pixel-art em Python (`Pillow`) diretamente sobre os backgrounds do projeto, e os `3` tilesets foram desenhados pixel a pixel em Python (`Pillow`).
- **Como Integrar Futuramente (Quando Autorizado):**
  1. Fazer backup dos `6` arquivos atuais de `assets/images/world/`.
  2. Copiar os `6` arquivos de `art-deliveries/antigravity/refino-fases-v1/world/*.png` para `assets/images/world/` mantendo os mesmos nomes de arquivo (nenhuma alteração em `src/assets.js` ou `src/renderer.js` é necessária, pois as chaves e dimensões nativas são idênticas).
  3. Executar `npm test` para validar o carregamento e o contrato de manifesto.

---
**Assets staged for review. Runtime integration has not been performed.**

