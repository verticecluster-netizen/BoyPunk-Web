# Relatório de Auditoria de Qualidade Visual e Game Feel

**Projeto:** BoyPunk! Web (`/home/flow/Projetos/BoyPunk-Web`)  
**Resolução Lógica:** 480 × 270 pixels  
**Ambiente:** Google Chrome Headless via Chrome DevTools Protocol (CDP)  
**Data:** 2026-10-26  

---

## 1. Metodologia de Inspeção

A auditoria foi realizada executando o jogo real em servidor local HTTP com `Cache-Control: no-store` através de automação determinística em [`tools/audit-screens-browser.mjs`](file:///home/flow/Projetos/BoyPunk-Web/tools/audit-screens-browser.mjs). Cada tela de S1 a S11 foi ativada, exercitada e capturada em arquivos PNG em [`evidencias/audit/`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/).

A avaliação utilizou seis eixos com notas de 0 a 10:
- **Visual Cohesion (VC):** Alinhamento à paleta mestre, fidelidade pixel-art e consistência visual.
- **Readability (RD):** Contraste figura-fundo, diferenciação de alvos e clareza de texto.
- **Hierarchy (HI):** Escala tipográfica, agrupamento de informações e proeminência de ações primárias.
- **Feedback (FB):** Resposta imediata a eventos (impacto, dano, coleta, menus).
- **Feel (FL):** Fluidez de locomoção, sensação de peso no salto, ritmo e responsividade.
- **Technical Health (TH):** Ausência de erros de console, frametime estável a 120 Hz, alvos touch >= 44px.

---

## 2. Matriz de Avaliação por Tela (S1 a S11)

| Tela | VC | RD | HI | FB | FL | TH | Média | Evidência Fotográfica |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **S1: Abertura / Inicialização** | 7.5 | 8.0 | 7.5 | 7.0 | - | 10.0 | **8.0** | [`evidencias/audit/S1-title.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/S1-title.png) |
| **S2: Menu Principal** | 8.5 | 8.5 | 8.0 | 8.0 | - | 10.0 | **8.6** | [`evidencias/audit/S2-menu.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/S2-menu.png) |
| **S3: Nível 1 — Distrito Neon** | 8.5 | 9.0 | 8.5 | 8.0 | 8.0 | 10.0 | **8.7** | [`evidencias/audit/S3-distrito-neon.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/S3-distrito-neon.png) |
| **S4: Nível 2 — Fábrica de Sucata** | 9.0 | 8.5 | 8.5 | 8.0 | 8.0 | 10.0 | **8.7** | [`evidencias/audit/S4-fabrica-sucata.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/S4-fabrica-sucata.png) |
| **S5: Bônus — Câmara de Energia** | 8.5 | 9.0 | 8.5 | 8.0 | 8.5 | 10.0 | **8.8** | [`evidencias/audit/S5-camara-energia.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/S5-camara-energia.png) |
| **S6: Tela de Pausa** | 7.5 | 8.5 | 7.5 | 7.5 | - | 10.0 | **8.2** | [`evidencias/audit/S6-pause.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/S6-pause.png) |
| **S7: Tela de Vitória** | 8.0 | 8.5 | 8.0 | 8.0 | - | 10.0 | **8.5** | [`evidencias/audit/S7-victory.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/S7-victory.png) |
| **S8: Tela de Derrota / Game Over** | 8.0 | 8.5 | 8.0 | 8.0 | - | 10.0 | **8.5** | [`evidencias/audit/S8-defeat.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/S8-defeat.png) |
| **S9: Resultado do Bônus** | 8.0 | 8.5 | 8.0 | 8.0 | - | 10.0 | **8.5** | [`evidencias/audit/S9-bonus-result.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/S9-bonus-result.png) |
| **S10: HUD em Jogo & Controles Touch** | 8.0 | 8.5 | 8.5 | 8.0 | 8.5 | 10.0 | **8.6** | [`evidencias/audit/S10-hud-touch.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/S10-hud-touch.png) |
| **S11: Modo Demonstração (Attract)** | 8.5 | 9.0 | 8.5 | 8.0 | 8.5 | 10.0 | **8.8** | [`evidencias/audit/S11-demo.png`](file:///home/flow/Projetos/BoyPunk-Web/evidencias/audit/S11-demo.png) |

---

## 3. Diagnóstico e Oportunidades Identificadas

1. **S1 & S2 (Abertura e Menu):**
   - O logotipo `BoyPunk!` tem bom peso visual, mas os botões de ação e cards de nível carecem de estados de foco e hover mais táteis e retro-iluminados.
   - O painel central pode receber a sombra pixelada retrô de 4px para destacar-se sobre o fundo animado.
2. **S10 (HUD e Controles Touch):**
   - As caixas de HUD no Canvas (`x=8` e `x=270`) funcionam bem, mas seus traços e divisores podem ser alinhados com mais rigor aos tokens de cor `--violet` (`#ae62ff`) e `--cyan` (`#37e6ee`).
   - Os controles touch atendem ao critério de 44px e funcionam com zero atraso, mas podem receber feedback tátil de clique (`:active` com leve deslocamento).
3. **S3 & S4 (Distrito Neon e Fábrica):**
   - A leitura do jogador sobre os fundos é excelente (contraste validado).
   - O feedback cinético de combate e locomoção pode ser enriquecido com micro-efeitos leves: pequenas partículas de poeira na aterrissagem (`landing dust`), centelhas nos impactos de projéteis e muzzle flash sutil no disparo.
4. **S5 (Câmara de Energia):**
   - O novo layout escalonado alternado v3 funciona com 100% de estabilidade.
   - A resposta de impacto do Canhão de Energia (−1s no relógio) ganha clareza com um indicador popup flutuante de `−1s` no ponto de impacto, reforçando a punição sem causar perda de vida.
5. **S6 a S9 (Modais de Pausa, Vitória, Derrota e Bônus):**
   - Compartilham a classe `.panel.outcome`, mas podem adotar uma linguagem mais uniforme com cantos bem definidos, botões primários destacados em gradiente Laranja/Âmbar e sombra pixelada `var(--ink)`.
6. **S11 (Modo Demonstração):**
   - O banner de rodapé é funcional e não bloqueia a visão, mas pode receber uma tipografia ainda mais integrada à moldura.

---

## 4. Lista Priorizada de Execução

### Tier A — Direção de Arte, UI, Layout e Feedbacks Visuais (Sem alteração na física)
- **A1:** Refinamento de S2 (Menu Principal) e S1 (Abertura) em `styles.css` e `index.html`: botões com sombra dura retrô, estados de foco acessível e badges polidos.
- **A2:** Polimento estético de S10 (HUD e Controles Touch): contraste refinado no Canvas 2D e feedback de clique nos botões touch.
- **A3:** Refinamento de S3 (Distrito Neon) e S4 (Fábrica de Sucata): adição de poeira de aterrissagem (landing dust), faíscas metálicas e flash sutil de disparo em `src/renderer.js`.
- **A4:** Refinamento de S5 (Câmara de Energia): indicador popup flutuante `−1s` ao sofrer impacto do canhão e brilho nas almas de alta energia.
- **A5:** Unificação estética dos painéis modais S6 (Pausa), S7 (Vitória), S8 (Derrota) e S9 (Resultado Bônus): layout consistente, tipografia e botões primários vibrantes.
- **A6:** Polimento de S11 (Modo Demonstração): letreiro com tipografia padronizada.

### Tier B — Game Feel e Parâmetros de Locomoção (Após conclusão e aprovação de Tier A)
- **B1:** Centralização documentada de parâmetros de movimento em `src/config.js` (`BALANCE.player`):
  - Calibração de jump buffer (antecipação do salto ao aterrissar).
  - Altura variável de salto por corte de velocidade ascendente na liberação de `Space` (preservando o ápice máximo exato de 50.58px e a física do salto duplo).
  - Aceleração e desaceleração terrestres aprimoradas mantendo velocidade horizontal terminal de 150 px/s.
- **B2:** Revalidação de todas as rotas físicas automatizadas com comparação honesta de tempos (Distrito, Fábrica e Câmara de Energia com 0 e 1 impacto de canhão).

### Tier C — Fora de Escopo / Manter Inalterado
- Adição de novos níveis ou campanhas (expressamente vedado pelas regras).
- Alteração da geometria de colisão ou do arquivo `src/level-data.js`.
- Modificação das regras de pontuação (teto de 350 pts no bônus, 15 almas na campanha).
