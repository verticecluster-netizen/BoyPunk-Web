# Cyber Lab — Environment Art Package & Technical Handoff

**Projeto:** BoyPunk! — O Guardião das Almas  
**Escopo:** Pacote de arte de cenário candidato (*Cyber Lab*) + registro opcional no manifesto (`ASSET_MANIFEST`)  
**Status da campanha atual:** Inalterado (*Distrito Neon*, *Fábrica de Sucata* e *Câmara de Energia* preservados)

---

## 1. Versão da Fonte Verificada e Raiz Canônica do Projeto

- **Raiz canônica do projeto:** `/home/flow/Projetos/BoyPunk-Web`
- **Versão autoritativa da fonte:** `0.4.2`
  - Verificada em [`src/version.js`](file:///home/flow/Projetos/BoyPunk-Web/src/version.js) (`STUDIO_VERSION = "0.4.2"`, `STUDIO_VERSION_LABEL = "v0.4.2"`) e [`package.json`](file:///home/flow/Projetos/BoyPunk-Web/package.json) (`"version": "0.4.2"`).
- **Documentos de estado e continuidade verificados:**
  - `AGENTS.md`: ausente na árvore `/home/flow/Projetos/BoyPunk-Web` (confirmado em auditoria).
  - [`RELATORIO_ESTADO_BOYPUNK_CODEX.md`](file:///home/flow/Projetos/BoyPunk-Web/RELATORIO_ESTADO_BOYPUNK_CODEX.md)
  - [`CONTINUIDADE_BOYPUNK_WEB.md`](file:///home/flow/Projetos/BoyPunk-Web/CONTINUIDADE_BOYPUNK_WEB.md)
  - [`PASSAGEM_FABRICA_PARA_ANTIGRAVITY.md`](file:///home/flow/Projetos/BoyPunk-Web/PASSAGEM_FABRICA_PARA_ANTIGRAVITY.md)
  - [`PASSAGEM_BONUS_PARA_ANTIGRAVITY.md`](file:///home/flow/Projetos/BoyPunk-Web/PASSAGEM_BONUS_PARA_ANTIGRAVITY.md)
  - [`docs/GUIA_DE_ESTILO.md`](file:///home/flow/Projetos/BoyPunk-Web/docs/GUIA_DE_ESTILO.md)
- **Isolamento de workspace:** Nenhum arquivo fora de `/home/flow/Projetos/BoyPunk-Web` (como `/home/flow/Documentos/assets.js`) foi lido ou modificado como código do projeto.

---

## 2. Referências Realmente Inspecionadas

As **18 imagens locais** (`WhatsApp Image 2026-10-31 at 20.27.*.jpeg`) presentes na raiz `/home/flow/Projetos/BoyPunk-Web` foram inspecionadas diretamente e preservadas intactas (sem mover, renomear, sobrescrever ou registrar no manifesto de runtime):

| Papel na Tarefa | Arquivo Local Inspecionado | Conteúdo Verificado |
| :--- | :--- | :--- |
| **Referência primária de ambiente** | `WhatsApp Image 2026-10-31 at 20.27.00 (1).jpeg` | Laboratório subterrâneo de IA com câmara cilíndrica central contendo cérebro iluminado em ciano, tubulações superiores com anéis âmbar/laranja, passarelas metálicas e terminais laterais. |
| **Referência secundária de ambiente** | `WhatsApp Image 2026-10-31 at 20.27.00 (2).jpeg` | Corredor de servidores/data center cyberpunk com racks profundos em azul-marinho/violeta escuro, feixes verticais ciano e acentos âmbar nos rodapés e painéis. |
| **Prancha de visão geral (Overview)** | `WhatsApp Image 2026-10-31 at 20.27.00.jpeg` | Colagem/prancha de referência (*Cyberpunk Game Level Packs*) exibindo múltiplas cenas e folhas de sprites; tratada estritamente como quadro de referência visual, não como background de runtime. |
| **Referência de personagem** | `WhatsApp Image 2026-10-31 at 20.27.03.jpeg` | Folha de sprites de androide azul; inspecionada apenas para compreender a linguagem de iluminação das referências. **BoyPunk e Nilo foram integralmente preservados** sem qualquer redesign, troca de arma ou nova habilidade. |
| **Demais 14 arquivos de referência** | `20.27.01.jpeg`, `20.27.01 (1).jpeg`, `20.27.01 (2).jpeg`, `20.27.02.jpeg`, `20.27.02 (1).jpeg`, `20.27.02 (2).jpeg`, `20.27.03 (1).jpeg`, `20.27.03 (2).jpeg`, `20.27.04.jpeg`, `20.27.04 (1).jpeg`, `20.27.04 (2).jpeg`, `20.27.05.jpeg`, `20.27.05 (1).jpeg`, `20.27.05 (2).jpeg` | Inspecionados para confirmar o conteúdo de cada arquivo (cenários urbanos/industriais, plataformas modulares, armadilhas, itens e folhas de personagens de referência). Nenhum elemento de UI, texto falso, armadilha enganosa ou personagem externo foi copiado para o pacote. |

**Assets de runtime existentes inspecionados para calibração de estilo e contrato técnico:**
- Backgrounds (`1365 × 768`, RGB opaco): `assets/images/world/distrito-neon.png`, `assets/images/world/fabrica-sucata.png`, `assets/images/world/camara-energia.png`.
- Tilesets (`128 × 128`, RGBA transparente): `assets/images/world/platformtiles.png`, `assets/images/world/factory-platformtiles.png`, `assets/images/world/energy-platformtiles.png`.

---

## 3. Arquivos Gerados, Dimensões, Tamanhos e Status de Alpha

| Entregável | Caminho no Projeto | Dimensões | Modo de Cor / IHDR | Status de Alpha | Tamanho em Disco | SHA-256 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Deliverable A — Background** | [`assets/images/world/cyber-lab.png`](file:///home/flow/Projetos/BoyPunk-Web/assets/images/world/cyber-lab.png) | `1365 × 768` px | `RGB` (`colorType = 2`, 8-bit) | Opaco (sem canal alpha, idêntico aos 3 backgrounds existentes) | `1,187,212` bytes (`~1.13 MiB`) | `4ab83fa15666ab711761529f6a16ed6b95e4c2a21417eb45a9e919260a70f6f8` |
| **Deliverable B — Platform Tileset** | [`assets/images/world/cyber-lab-platformtiles.png`](file:///home/flow/Projetos/BoyPunk-Web/assets/images/world/cyber-lab-platformtiles.png) | `128 × 128` px | `RGBA` (`colorType = 6`, 8-bit) | Alpha genuíno (`alpha=0` em `15,884` px; `0 < alpha < 255` em `32` px; `alpha=255` em `468` px nas duas células `16×16` ativas) | `711` bytes (`0.69 KiB`) | `be31090be16a063efca267daeb617d2bf354a57ab97bb5300ba9800c08a3052b` |

### Direção de Arte e Legibilidade Aplicadas
- **Background (`cyber-lab.png`):**
  - Arquitetura em azul-marinho profundo (`#080c1c`) e violeta escuro (`#12132c`) com racks de servidores em perspectiva, cabos industriais com anéis âmbar e displays secundários sem qualquer texto legível, números ou elementos que imitem HUD.
  - Câmara central de IA posicionada como ponto focal atmosférico no plano de fundo, com luminância máxima controlada (`Y <= 198`) e contraste local suavizado para nunca competir com projéteis, almas cibernéticas, avisos de telegrafia ou os protagonistas BoyPunk e Nilo.
  - Faixas horizontais de circulação de plataformas (`y = 92..246` no espaço lógico `480 × 270`) e faixa superior de HUD (`y = 0..42`) mantidas visualmente calmas (`luminância média 29.8 / 255`).
  - Nenhuma superfície pintada sugere plataformas falsas, escadas, portas interativas ou perigos inexistentes na geometria real.

---

## 4. Contrato Exato de Amostragem do Tileset (`src/renderer.js`)

A inspeção de [`Renderer.drawPlatforms`](file:///home/flow/Projetos/BoyPunk-Web/src/renderer.js#L1496-L1664) confirmou o contrato exato de amostragem do motor:

1. **Seleção da textura por nível (`src/renderer.js`, linhas 1497–1501):**
   - `scrap-factory` -> `"world.tiles.factory"`
   - `energy-chamber` -> `"world.tiles.bonus"`
   - `distrito-neon` (default) -> `"world.tiles.neon"`
2. **Coordenadas de origem (`sx, sy, sw, sh`) no PNG `128 × 128` (`src/renderer.js`, linhas 1571–1575):**
   - O renderer recorta a área `(platform.x, platform.y, platform.w, platform.h)` com `ctx.clip()` e repete em malha (`x += 16`, `y += 16`) uma única célula `16 × 16` via:
     ```js
     ctx.drawImage(tiles, platform.oneWay ? 0 : 16, 0, 16, 16, x, y, 16, 16);
     ```
   - Portanto, **"Module 0" e "Module 16" são coordenadas em pixels (`sx = 0` e `sx = 16` com `sy = 0`, `sw = 16`, `sh = 16`)**, e **não** índices de grade (`16 × 16 = 256`):
     - **Plataforma One-Way (`platform.oneWay === true`):** `sx = 0, sy = 0, sw = 16, sh = 16` (x: `0..15`, y: `0..15`).
       - Desenhada como passarela tecnológica fina (`11 px` de altura estrutural visível + `5 px` inferiores `100%` transparentes `alpha = 0`), trilho superior ciano contido, treliça interna escura e parte inferior chanfrada que preserva claramente o plano de colisão no topo.
     - **Plataforma Sólida (`platform.oneWay === false`):** `sx = 16, sy = 0, sw = 16, sh = 16` (x: `16..31`, y: `0..15`).
       - Desenhada como bloco blindado `16 × 16` de metal escuro reforçado em azul-ardósia/violeta profundo, com detalhes de advertência âmbar/laranja contidos e costura horizontal/vertical perfeitamente contínua (`seamless`).
     - **Restante da folha (`x >= 32` ou `y >= 16`):** Não é amostrado pelo `Renderer`; mantido `100%` transparente (`RGBA(0, 0, 0, 0)`), exatamente como em `platformtiles.png`, `factory-platformtiles.png` e `energy-platformtiles.png`.
   - O renderer não amostra peças separadas de canto/esquerda/direita do PNG; a diferenciação de extremidades é feita proceduralmente pelo próprio `Renderer`.
3. **Sobreposições procedurais do `Renderer` complementadas pelo tileset (`src/renderer.js`, linhas 1510–1661):**
   - Antes do `drawImage`, o `Renderer` preenche um retângulo escuro de base (`fillRect`) sob a plataforma.
   - Após o `drawImage`, o `Renderer` desenha:
     - Linha superior de acento (`1 px` em one-way, `2 px` em sólida) com pontos especulares periódicos a cada `6 px`;
     - Suportes triangulares inferiores (`5 px` de altura) nas extremidades esquerda e direita de plataformas one-way com `w >= 48`;
     - Rebites e conduítes verticais em paredes sólidas altas (`h > 48`);
     - Gradiente de reflexo no piso principal (`y = 240..270`).
   - As duas células `16 × 16` de `cyber-lab-platformtiles.png` foram desenhadas para complementar essas sobreposições sem duplicá-las e sem vazar brilho entre as células `x = 0..15` e `x = 16..31`.

---

## 5. Chaves de Manifesto, Consumidores de Runtime e Custo de Preload

As duas chaves foram registradas em [`src/assets.js`](file:///home/flow/Projetos/BoyPunk-Web/src/assets.js#L16-L17) usando o helper existente `image(key, url, required = false)`:

```js
image("world.background.cyberlab", "assets/images/world/cyber-lab.png"),
image("world.tiles.cyberlab", "assets/images/world/cyber-lab-platformtiles.png"),
```

- **Assinatura e obrigatoriedade:** Ambas usam `required: false` (padrão do helper `image()`), portanto são **opcionais** e não bloqueiam o boot caso ausentes em ambientes parciais.
- **Consumidores de runtime atuais:** **Nenhum.** Como não existe nível Cyber Lab na campanha atual (`src/level-data.js` define apenas `distrito-neon`, `scrap-factory` e `energy-chamber`), nenhum módulo de runtime (`src/renderer.js`, `src/level-data.js`, `src/core.js`) referencia essas chaves ainda.
- **Comportamento de carregamento (`loadAssets()` em `src/assets.js`):**
  - `loadAssets()` realiza *eager preload* sequencial de todas as entradas de `ASSET_MANIFEST` no boot (o total de entradas do manifesto passou de `249` para `251`, e o total de imagens carregadas no `Map` `images` passou de `241` para `243`).
  - **Custo adicional em disco / transferência local:**
    - `cyber-lab.png`: `1,187,212` bytes (`~1.13 MiB`)
    - `cyber-lab-platformtiles.png`: `711` bytes (`0.69 KiB`)
    - **Total em disco:** `1,187,923` bytes (`~1.13 MiB`)
  - **Custo adicional de memória de imagem decodificada (`ImageBitmap` / RGBA 32-bit):**
    - `cyber-lab.png` (`1365 × 768 × 4`): `4,193,280` bytes (`~4.00 MiB`)
    - `cyber-lab-platformtiles.png` (`128 × 128 × 4`): `65,536` bytes (`64.00 KiB`)
    - **Total em RAM/VRAM decodificada:** `4,258,816` bytes (`~4.06 MiB`)

---

## 6. Arquivos Criados ou Modificados

### Arquivos de código e testes modificados
1. [`src/assets.js`](file:///home/flow/Projetos/BoyPunk-Web/src/assets.js#L14-L18) — registro opcional de `world.background.cyberlab` e `world.tiles.cyberlab` em `ASSET_MANIFEST`.
2. [`tests/assets.test.mjs`](file:///home/flow/Projetos/BoyPunk-Web/tests/assets.test.mjs#L156-L182) — adição de teste automatizado validando presença no manifesto, caminhos relativos, flag `required: false`, dimensões exatas (`1365×768` e `128×128`) e canais PNG (`colorType 2` RGB opaco no background e `colorType 6` RGBA no tileset).

### Novos assets de runtime criados
3. [`assets/images/world/cyber-lab.png`](file:///home/flow/Projetos/BoyPunk-Web/assets/images/world/cyber-lab.png)
4. [`assets/images/world/cyber-lab-platformtiles.png`](file:///home/flow/Projetos/BoyPunk-Web/assets/images/world/cyber-lab-platformtiles.png)

### Previews de controle de qualidade e documentação criados (fora do manifesto de runtime)
5. [`evidencias/art/cyber-lab/cyber-lab-bg-480x270.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-bg-480x270.png)
6. [`evidencias/art/cyber-lab/cyber-lab-bg-480x270-grayscale.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-bg-480x270-grayscale.png)
7. [`evidencias/art/cyber-lab/cyber-lab-tileset-nearest-8x.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-tileset-nearest-8x.png)
8. [`evidencias/art/cyber-lab/cyber-lab-platform-strips-preview.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-platform-strips-preview.png)
9. [`evidencias/art/cyber-lab/cyber-lab-composite-classic-1x.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-composite-classic-1x.png)
10. [`evidencias/art/cyber-lab/cyber-lab-composite-illustrated-2x.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-composite-illustrated-2x.png)
11. [`docs/art/CYBER_LAB_ART_HANDOFF.md`](file:///home/flow/Projetos/BoyPunk-Web/docs/art/CYBER_LAB_ART_HANDOFF.md)

*(Arquivos protegidos pelo escopo — `src/core.js`, `src/config.js`, `src/level-data.js`, `src/renderer.js` e os 18 arquivos `.jpeg` de referência — permaneceram 100% intocados).*

---

## 7. Caminhos dos Previews de Controle de Qualidade

Todos os previews foram gerados fora do manifesto de runtime em `/home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/` e rotulados explicitamente como **PREVIEW — NÃO É FASE JOGÁVEL**:

1. [`evidencias/art/cyber-lab/cyber-lab-bg-480x270.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-bg-480x270.png) (`480 × 270` px): Background reduzido para a resolução lógica exata do mundo do jogo.
2. [`evidencias/art/cyber-lab/cyber-lab-bg-480x270-grayscale.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-bg-480x270-grayscale.png) (`480 × 270` px): Verificação de contraste e hierarquia tonal em escala de cinza na resolução lógica.
3. [`evidencias/art/cyber-lab/cyber-lab-tileset-nearest-8x.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-tileset-nearest-8x.png) (`780 × 470` px): Prancha de inspeção com ampliação *nearest-neighbor* (`12×` nas células `sx=0` e `sx=16`, tiras `4×` demonstrando repetição horizontal sem costuras e visualização `2×` da folha `128 × 128` completa com regiões transparentes).
4. [`evidencias/art/cyber-lab/cyber-lab-platform-strips-preview.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-platform-strips-preview.png) (`480 × 270` px): Tiras repetidas de plataformas *one-way* e sólidas sobre o background com as sobreposições procedurais do `Renderer`.
5. [`evidencias/art/cyber-lab/cyber-lab-composite-classic-1x.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-composite-classic-1x.png) (`480 × 270` px): Composição de pré-visualização no caminho de renderização **clássico (`1×`)**, combinando background, plataformas, sprites reais de BoyPunk, Nilo, Perseguidor, Patrulheiro, Altar, Alma, Power-up e HUD simulado.
6. [`evidencias/art/cyber-lab/cyber-lab-composite-illustrated-2x.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/art/cyber-lab/cyber-lab-composite-illustrated-2x.png) (`960 × 540` px): Composição de pré-visualização no caminho de renderização **ilustrado (`2×`, `renderScale = 2`)**, utilizando os sprites `*.illustrated` de BoyPunk, Nilo e inimigos sobre o cenário Cyber Lab.

---

## 8. Verificações Executadas e Resultados Reais

1. **Checagem sintática (`npm run check`):**
   - Executado `npm run check` (validação `node --check` em todos os módulos `src/*.js`, `tools/*.mjs` e `bash -n` nos scripts `.sh`).
   - **Resultado:** Passou com código de saída `0` sem erros ou avisos.
2. **Suíte de testes automatizados (`npm test`):**
   - Executado `npm test` (`node --test tests/*.test.mjs`).
   - **Resultado:** `283` testes executados, `283` aprovados (`0` falhas), incluindo o novo teste de contrato para `world.background.cyberlab` e `world.tiles.cyberlab`.
3. **Validação binária de PNG e canal Alpha:**
   - Cabeçalhos IHDR verificados diretamente nos bytes dos arquivos:
     - `cyber-lab.png`: `1365 × 768`, `bitDepth = 8`, `colorType = 2` (RGB opaco).
     - `cyber-lab-platformtiles.png`: `128 × 128`, `bitDepth = 8`, `colorType = 6` (RGBA com transparência real).
4. **Verificação em navegador Headless Chrome (Linux local via CDP):**
   - Jogo iniciado sobre servidor HTTP loopback local com `?test=1` em Google Chrome Headless.
   - `loadAssets()` e `window.__BOYPUNK_TEST__.renderer.images` inspecionados em tempo de execução:
     - `totalImages`: `243`, `failures`: `0`, `bootAssetFailures`: `0`.
     - `world.background.cyberlab` decodificado como `ImageBitmap` (`1365 × 768`).
     - `world.tiles.cyberlab` decodificado como `ImageBitmap` (`128 × 128`).
     - As 3 fases existentes (`district-neon`, `scrap-factory` e `energy-chamber`) foram carregadas e renderizadas no Canvas sem qualquer erro de console (`0`), exceção de página (`0`) ou erro HTTP 404 (`0`).
5. **Declaração explícita do que NÃO foi testado:**
   - Não foram realizados testes em Windows, dispositivos móveis, modo offline (`file://`), playtest humano interativo ou perfilamento de FPS/heap de longa duração no navegador.

---

## 9. Limitações e Instruções para Integração Futura pelo Codex

### Limitações atuais (intencionais por escopo)
- Os assets `world.background.cyberlab` e `world.tiles.cyberlab` estão registrados no `ASSET_MANIFEST` e são pré-carregados no boot, mas **não estão conectados a nenhuma fase jogável** porque a criação ou substituição de nível estava fora do escopo desta tarefa.
- Os pacotes standalone/release (`dist/` ou `.zip`) não foram regenerados.

### Passo a passo para o Codex ativar o Cyber Lab em runtime quando autorizado
1. **`src/level-data.js`:**
   - Definir a nova fase (ex.: `id: "cyber-lab"`) em `LEVELS` com geometria de plataformas alinhada à grade de `16 px`, pontos de spawn, posição do Altar e configuração de ondas/inimigos, adicionando-a à `CAMPAIGN_LEVEL_ORDER` conforme o desenho de progressão desejado.
2. **`src/renderer.js`:**
   - Em `Renderer.drawBackground(ctx, model)` (próximo à linha `1240`), mapear `model.levelId === "cyber-lab"` para `"world.background.cyberlab"` e definir a paleta atmosférica correspondente (navy/violeta escuro com acentos ciano `#38d8ff` e âmbar `#ff9a2e`).
   - Em `Renderer.drawPlatforms(ctx, model, now)` (próximo à linha `1498`), mapear `model.levelId === "cyber-lab"` para `"world.tiles.cyberlab"` e ajustar as cores das sobreposições procedurais (linha de topo ciano `#3ce2ff` para *one-way* e âmbar `#ff9a2e` para plataformas sólidas).
   - Se desejado, adicionar variante dedicada de altar (`altar.cyberlab.*`) ou mapear para o conjunto visual apropriado em `drawAltar`.
3. **`src/config.js` / `src/progression.js` / `src/i18n.js`:**
   - Registrar chaves de tradução (`pt-BR`, `en-US`, `es-ES`), regras de desbloqueio e seleção de fase no menu.

---

## Status Final

- **Art generated and validated.**
- **Asset registration completed.**
- **Runtime activation pending** (no Cyber Lab level exists in the current campaign; existing levels *Distrito Neon*, *Fábrica de Sucata*, and *Câmara de Energia* remain unchanged).

