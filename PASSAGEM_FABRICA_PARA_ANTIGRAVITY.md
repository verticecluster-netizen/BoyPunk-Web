# Passagem da Fábrica de Sucata para Antigravity

Data técnica: 2026-10-25  
Nível: **Fábrica de Sucata**  
ID estável: `scrap-factory`  
Viewport lógico: **480 × 270**

## Estado entregue

O nível é um protótipo jogável integrado ao runtime comum. Usa a mesma física,
colisão, câmera fixa, HUD, altar, almas, inimigos, animações, áudio e fluxo
terminal do Distrito Neon. A camada industrial e a prensa são deliberadamente
gráficos de Canvas identificados como **PROTÓTIPO**; não são arte final.

Valores preservados: jogador 4/4, altar 4/4 e objetivo 15 almas. A entrada fica
na área segura esquerda, ao lado do altar. Há cinco almas posicionadas e os
inimigos continuam fornecendo almas sem limite finito, de modo que dano/queda de
uma recompensa não cria softlock.

## Layout e coordenadas

Sistema de origem: `(0,0)` no canto superior esquerdo; `x` cresce para a direita,
`y` para baixo. Retângulos são `{ x, y, largura, altura }` em pixels lógicos.

| Superfície | Retângulo | Tipo |
|---|---:|---|
| Piso | `-16, 240, 512, 32` | sólido |
| Teto | `-16, 0, 512, 16` | mão única |
| Parede esquerda | `0, 16, 16, 224` | sólida |
| Parede direita | `464, 16, 16, 224` | sólida |
| Baixa esquerda | `16, 176, 112, 16` | mão única |
| Baixa direita | `352, 176, 112, 16` | mão única |
| Média esquerda | `112, 112, 98, 16` | mão única |
| Média direita | `270, 112, 98, 16` | mão única |
| Alta opcional esquerda | `32, 64, 96, 16` | mão única |
| Alta opcional direita | `352, 64, 112, 16` | mão única |

- Player: `92, 208`, colisor compartilhado `22 × 32`.
- Altar: `40, 192, 32, 48`.
- Almas colocadas: `(82,148)`, `(154,84)`, `(310,84)`, `(404,148)`, `(302,216)`.
- Perseguidores: `(384,208)`, `(32,208)`, `(150,80)`, `(310,80)`.
- Atiradores: `(400,144)`, `(32,144)`, `(304,88)`.

Os degraus verticais da rota são 64, 64 e 48 px. A sequência foi percorrida pela
física real com salto duplo: piso → plataforma baixa direita (`player.y=144`) →
plataforma média direita (`player.y=80`). Não deslocar pisos sem repetir esse
teste com o colisor atual e velocidades de `src/config.js`.

## Prensa industrial

Definição autoritativa em `src/level-data.js`:

| Propriedade | Valor |
|---|---:|
| ID | `scrap-press-01` |
| X / largura | `218 / 44` |
| Altura da cabeça | `16` |
| Y recolhida | `128` |
| Y fechada | `208` |
| Dano | `1` |
| Observação inicial segura | `4,00 s` |
| Idle dos ciclos seguintes | `2,80 s` |
| Warning | `1,25 s` |
| Closing | `0,65 s` |
| Recovery | `1,35 s` |

Contrato funcional:

- ciclo obrigatório `Idle → Warning → Closing → Recovery` no fixed-step;
- a cabeça visível e a hitbox usam exatamente `x, y, 44, 16`;
- somente `Closing` é perigoso; Warning e Recovery nunca causam dano;
- um mesmo ciclo pode causar no máximo um contato no player e ainda respeita a
  invulnerabilidade compartilhada de 0,9 s;
- altar e inimigos são imunes. Essa decisão evita recompensas automáticas e
  mantém o tratamento de derrota exatamente uma vez sob controle do combate;
- pausa congela fase/Y; retry recria `idle`, ciclo zero e Y 128;
- não existem `setInterval`, loop ou listener próprios da prensa.

Requisitos visuais para substituição: manter leitura de cabeça `44 × 16`, curso
vertical 80 px, chevrons ou outra forma/movimento inequívoco no Warning, estado
ativo distinto em Closing e folga visual nos espaços seguros laterais. Cor
sozinha não pode comunicar perigo. A arte não deve cobrir HUD nem alterar o
colisor. Reduced motion remove o tremor, mas preserva os chevrons.

## Encontros e limites

Abertura sem spawn: 5,5 s. Máximo global: quatro inimigos e dez projéteis. Fases
por almas recuperadas: `observacao` (0), `separacao` (4), `compactacao` (8) e
`expedicao` (12). O desafio vem da separação espacial e da prensa, não de dano
maior: IA, velocidade, dano, projéteis e colisores dos arquétipos não mudaram.

## Assets e camadas

Reutilizados sem alteração:

- player e todas as animações mapeadas;
- perseguidor e animações de combate/derrota;
- torreta, balas, almas e sete estágios do altar;
- tiles/background herdados, fonte Pixelify Sans, SFX e música de batalha;
- HUD, efeitos de depósito, dano, derrota e vitória.

Ordem do mundo: background compartilhado → atmosfera industrial Canvas →
plataformas → altar/almas/inimigos/projéteis → player → prensa → efeitos → HUD.
A prensa fica à frente do player para comunicar sobreposição física. A camada de
debug desenha a mesma caixa da cabeça móvel.

Protótipos a substituir/refinar: tonalização marrom, vigas, tubos, faixas do piso,
coloração dos decks e o conjunto completo da prensa/pistão/placa. Não há novos
PNGs; por isso não existe origem/pivô de bitmap novo. Se forem criados sprites,
ancorar a cabeça no topo esquerdo da hitbox e manter o frame dentro de `44 × 16`
ou fornecer offset explícito no renderer.

## Progressão e integração

`scrap-factory` está `available: true`, mas só inicia se também estiver
desbloqueada. Vitória em `district-neon` desbloqueia e oferece “Entrar na
Fábrica”; vitória na Fábrica grava sua conclusão sem inventar terceiro nível.
Retry chama o nível atual. O attract mode continua forçado a `district-neon`.

Pontos de extensão compartilhados:

- definição/layout: `src/level-data.js`;
- simulação, prensa e seleção do nível: `src/core.js`;
- desenho industrial/prensa: `src/renderer.js`;
- catálogo/save: `src/progression.js`;
- navegação/telas: `src/main.js` e `index.html`.

## Verificação e limitações

- `npm run check`: aprovado.
- `npm test`: 65 testes nomeados em 7 arquivos, todos aprovados.
- Testes novos percorrem a rota por movimento/salto real, a travessia segura, a
  aproximação real até o contato da prensa, todas as fases, pausa, reset,
  imunidade do altar/inimigos, objetivo, retry, progressão e demo no Distrito.
- Sequência temporal reproduzível do fixed-step: 12 amostras em
  `evidencias/runtime-scrap-factory-20261025/model-sequence.json`, geradas por
  `node tools/factory-model-evidence.mjs`. Ela é explicitamente evidência de
  modelo, não gravação de browser.
- O Chrome headless disponível falhou antes da página por restrição de sandbox do
  Crashpad (`setsockopt: Operation not permitted`); GeckoDriver também foi
  bloqueado pelo confinamento Snap. Portanto, as novas capturas `10–12` previstas
  pelo teste de browser não foram produzidas nesta rodada.
- Pendente: playtest humano visual/auditivo, toque físico, leitura de warning com
  diferentes perfis de daltonismo e validação final após substituir a arte.

Captura disponível nesta rodada: nenhuma nova captura confiável da Fábrica, por
limitação do browser headless acima. Evidências antigas do Distrito permanecem em
`evidencias/` e não devem ser apresentadas como imagem da Fábrica.

---

## Entrega do Tratamento Visual e Artístico da Fábrica de Sucata (2026-10-26) — Antigravity

### 1. Ponto de Recuperação e Preservação

Antes de qualquer modificação nos fontes ou nos assets, foi gerado e validado um checkpoint completo:
- **Arquivo:** `evidencias/recovery/BoyPunk-Web-pre-scrap-factory-art-20261025.tar.gz`
- **SHA-256:** `0fbeffceaa40a32240b9ae4db899a6bf82e70e9a7852e67305d7b5f39695d3dc` (armazenado no sidecar `.sha256`).
- Todos os pacotes em `releases/`, os arquivos de distribuição `dist-portable/JOGAR.html`, as mecânicas, hitboxes, parâmetros de dano, rotas e progressão foram estritamente preservados.

---

### 2. Assets Visuais Criados e Mapeamentos

1. **Fundo do Cenário Interior (`assets/images/world/fabrica-sucata.png`):**
   - **Dimensões:** 1365 × 768 pixels, PNG.
   - **Conceito & Hierarquia:** Galpão de fundição e prensa pesada com grandes treliças em arco de aço grafite (`#181a24`, `#222638`), maquinário industrial estático em silhueta de baixo contraste, fornalha de fundição distante com fulgor térmico âmbar contido (`#c44e18`, `#e8782a`), luminárias pontuais ciano (`#2ec8d4`) nas colunas estruturais e clerestório envidraçado no topo revelando o horizonte noturno violeta de BoyPunk.
   - **Luminância Controlada:** Calibrada em valores médios/baixos (10% a 50%) para manter o jogador, projéteis, almas (`#37e6ee`), inimigos e o altar como os focos de maior contraste visual do quadro.
   - **Mapeamento em `src/assets.js`:** Registrado na chave `world.background.factory`.

2. **Tileset Industrial (`assets/images/world/factory-platformtiles.png`):**
   - **Dimensões:** 128 × 128 pixels RGBA.
   - **Conteúdo dos Módulos:**
     - `(0, 0)`: Passadiço perfurado de chapas de aço naval com ranhuras de drenagem e borda superior ciano de segurança (`#2ec8d4`) com brilho especular (`#c8faff`) para plataformas *one-way*.
     - `(16, 0)`: Placas de blindagem industrial em grafite chanfrado com rebites perimetrais e faixa superior de perigo em âmbar quente (`#ff8522`) para solo e blocos sólidos.
   - **Mapeamento em `src/assets.js`:** Registrado na chave `world.tiles.factory`.

---

### 3. Substituição e Renderização da Prensa Hidráulica

O bloco protótipo provisório e o texto `"PRENSA // PROTÓTIPO"` foram completamente substituídos por uma montagem mecânica hidráulica legível em `src/renderer.js`, com geometria 100% acoplada ao estado físico real (`idle`, `warning`, `closing`, `recovery`):

1. **Pórtico Superior Fixo (`x = 208..272`, `y = 14..24`):** Viga mestra pesada em aço grafite com rebites de ancoragem e consoles angulares de fixação no teto.
2. **Cilindro Hidráulico Central (`x = 228..252`, `y = 24..106`):** Corpo cilíndrico usinado com gradiente de sombreamento volumétrico, linhas de alta pressão trançadas com conexões em latão e manômetro analógico/digital de pressão (mostrador ciano em repouso, âmbar pulsante em aviso, vermelho em pico de impacto e vapor/ventilação em recuperação).
3. **Colunas de Guia Retificadas:** Duas hastes verticais de precisão cromadas (`x = 214..217` e `x = 263..266`) ancoradas do pórtico ao leito de impacto inferior.
4. **Haste Telescópica do Pistão (`x = 234..246`):** Coluna cilíndrica de aço cromado polido conectando a base do cilindro ao cabeçote móvel com yokes de articulação.
5. **Cabeçote Móvel da Prensa (`x = 218`, `y = headY`, `44 × 16` px):**
   - Coincidência pixel-a-pixel exata com a hitbox de dano de 44 × 16 px.
   - Sapatas deslizantes laterais conectadas às guias de precisão.
   - Padrão de perigo industrial em listras diagonais grafite e âmbar.
   - **Indicação de Perigo por Forma:** Setas direcionais triangulares de aviso (`▼ ▼ ▼`) gravadas no cabeçote e balizas laterais de alerta.
   - **Jatos de Alívio de Pressão:** Emissão de vapor lateral durante a fase de aviso (`warning`).
   - **Face de Impacto Incandescente:** Placa inferior de tungstênio com linha de atrito incandescente em vermelho escarlate (`#ff3624`) e núcleo em amarelo claro (`#fff0c0`) ativada exclusivamente durante a descida rápida (`closing`).
   - Respeito à preferência de acessibilidade `reducedMotion` (mantém aviso e cor legíveis com pulso estático suavizado).
6. **Leito de Impacto e Guias no Solo (`y = 238..244`):**
   - Bloco maciço de impacto em grafite reforçado com parafusos de ancoragem nos cantos e faixas perimetrais de perigo no piso.
   - Projeção de linhas verticais pontilhadas de contenção e perigo no vão de esmagamento durante a fase de aviso.

---

### 4. Integração do Cenário e Plataformas

- **Passadiços e Plataformas Flutuantes:** Acentos de borda ciano de alto contraste com consoles e mãos-francesas industriais em treliça desenhadas abaixo das plataformas suspensas (`y = 112` e `y = 176`), eliminando a sensação de plataformas flutuantes mágicas.
- **Paredes e Solo:** Módulos de blindagem pesada rebitada nas paredes laterais (`x <= 16` e `x >= 464`) e piso do galpão com reflexo de piso metálico polido (`globalAlpha ~ 0.12`).
- **Gradiente Atmosférico Industrial:** Substituído o overlay marrom genérico do protótipo por gradiente vertical composto por luz difusa de clerestório violeta no topo, névoa atmosférica neutra e reflexo quente contido da fornalha na base.

---

### 5. Evidências de Runtime em Navegador Real (`evidencias/art/`)

Utilizando o Chrome headless Linux com flags adequadas de sandbox (`--no-sandbox`, `--disable-dev-shm-usage`, `--headless=new`) e o protocolo CDP via `tools/record-factory-evidence.mjs` e `tools/create-factory-comparisons.py`:

- `evidencias/art/scrap_factory_overview.png`: Visão geral estática e limpa do nível Fábrica de Sucata em sua apresentação artística final.
- `evidencias/art/scrap_factory_collision_alignment.png`: Verificação técnica com sobreposição das caixas de colisão de gameplay, comprovando alinhamento de 100% das superfícies transitáveis, paredes e cabeçote da prensa com as geometrias de colisão.
- `evidencias/art/scrap_factory_gameplay.png`: Ação em tempo real com jogador, chaser em locomoção, torreta atiradora com telegrafia laser, almas ciano luminescentes e o altar de contenção.
- `evidencias/art/press_phase_idle.png`: Estado `idle` da prensa com cabeçote recolhido em `y = 138` (vão livre seguro de 80 px).
- `evidencias/art/press_phase_warning.png`: Estado `warning` exibindo balizas de perigo, jatos de vapor, setas direcionais e linhas pontilhadas de projeção da área perigosa no solo.
- `evidencias/art/press_phase_closing.png`: Estado `closing` mostrando pistão estendido, face inferior incandescente de impacto e manômetro em pressão máxima.
- `evidencias/art/press_phase_recovery.png`: Estado `recovery` mostrando retração ascendente e despressurização.
- `evidencias/art/scrap_factory_victory.png`: Tela de vitória no nível Fábrica de Sucata com resumo completo das estatísticas de jogo e legibilidade impecável da interface.
- `evidencias/art/scrap_factory_before_after_comparison.png`: Painel comparativo antes/depois lado a lado entre o protótipo com a caixa provisória da prensa e a entrega artística final integrada.
- `evidencias/art/scrap_factory_press_states_comparison.png`: Painel comparativo em 4 colunas detalhando os 4 estados operacionais da prensa hidráulica.

---

### 6. Validação e Testes Automatizados

- `npm run check`: **Aprovado** (todos os 19 arquivos JS/MJS e o script `iniciar-jogo.sh` íntegros).
- `npm test`: **Aprovado** (65 testes em 7 suítes passaram com 100% de sucesso).
- Todas as asserções de gameplay, dano da prensa, rota segura, temporizações de ciclo (`2.8s`, `1.25s`, `0.65s`, `1.35s`), imunidade de altar/inimigos e progressão permanecem intocadas e válidas.

---

### 7. Como Iniciar a Versão de Desenvolvimento

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```
Ou alternativamente via servidor Node:
```bash
npm run dev
```
