# Passagem da Câmara de Energia para Antigravity

Data técnica: 2026-10-26  
Arena: **Câmara de Energia**  
ID estável: `energy-chamber`  
Viewport lógico: **480 × 270**

## Estado funcional entregue

A arena bônus está integrada ao `GameModel`, fixed-step, renderer e controles já
existentes. Ela não é uma terceira campanha: nasce de uma vitória real
qualificada e preserva o nível/estatísticas de origem. Dura 20 segundos de tempo
ativo, contém 30 almas bônus identificadas individualmente e termina no tempo ou
na coleta completa. Não há altar, inimigos nem perigos de dano. A queda pelo vão
central retorna BoyPunk a `(18,208)` sem parar o relógio.

Valores da campanha preservados: jogador 4/4, altar 4/4 e objetivo 15. A arena
reutiliza exatamente o colisor `22 × 32`, aceleração, velocidade, gravidade,
salto, salto duplo e colisão da campanha.

## Geometria autoritativa

**Revisão de layout: v3, 2026-10-26 (Padrão Escalonado Alternado — Pattern Staggering).**
A v2 apresentava vãos em posições coincidentes ou próximas entre patamares adjacentes,
especialmente sobre o fosso do piso `[216..264]`, permitindo que quedas acidentais
precipitassem o jogador por múltiplos níveis em direção ao abismo e teletransporte de retorno.
A v3 estabelece um escalonamento alternado estrito (Padrão A nos patamares ímpares e Padrão B nos pares)
com desalinhamento de 96 px entre vãos verticais, blindagem total do fosso do piso e vãos de 48 a 64 px
com no mínimo 13 a 21 px de folga lateral em relação ao colisor `22 × 32`.

Retângulos usam origem superior esquerda `{ x, y, largura, altura }`:

| Superfície | Retângulo | Tipo | Função |
|---|---:|---|---|
| Piso esquerdo | `-16,240,232,32` | sólido | Base de apoio esquerda e limite de segurança |
| Piso direito | `264,240,232,32` | sólido | Base de apoio direita com o Canhão de Energia |
| Parede esquerda | `0,16,16,224` | sólida | Limite oeste da arena (bloqueio rígido) |
| Parede direita | `464,16,16,224` | sólida | Limite leste da arena (bloqueio rígido) |
| Patamar 1A (y=200) | `16,200,48,16` | mão única | Apoio inicial de subida à esquerda |
| Vão 1A (y=200) | `x: 64..112` (48 px) | vão | Passagem lateral esquerda (folga 13 px/lado) |
| Patamar 1B (y=200) | `112,200,256,16` | mão única | Plataforma central larga cobrindo o fosso do piso |
| Vão 1B (y=200) | `x: 368..416` (48 px) | vão | Passagem lateral direita (folga 13 px/lado) |
| Patamar 1C (y=200) | `416,200,48,16` | mão única | Apoio de subida à direita |
| Patamar 2A (y=160) | `16,160,192,16` | mão única | Apoio contínuo esquerdo (Padrão B) |
| Vão Central 2 (y=160) | `x: 208..272` (64 px) | vão | Passagem central ampla (desalinhada em 96 px) |
| Patamar 2B (y=160) | `272,160,192,16` | mão única | Apoio contínuo direito (Padrão B) |
| Patamar 3A (y=120) | `16,120,48,16` | mão única | Apoio esquerdo (Padrão A) |
| Vão 3A (y=120) | `x: 64..112` (48 px) | vão | Passagem lateral esquerda |
| Patamar 3B (y=120) | `112,120,256,16` | mão única | Plataforma central ampla |
| Vão 3B (y=120) | `x: 368..416` (48 px) | vão | Passagem lateral direita |
| Patamar 3C (y=120) | `416,120,48,16` | mão única | Apoio direito |
| Patamar 4A (y=80) | `16,80,192,16` | mão única | Patamar superior esquerdo (Padrão B) |
| Vão Central 4 (y=80) | `x: 208..272` (64 px) | vão | Passagem central superior |
| Patamar 4B (y=80) | `272,80,192,16` | mão única | Patamar superior direito |

O fosso do piso permanece em `x=216..264` (`w=48 px`). Com a plataforma central do Patamar 1
em `x=112..368`, o fosso fica coberto com 104 px de margem em ambos os lados, impossibilitando
quedas acidentais de andares superiores no abismo. Todos os vãos possuem folga lateral superior
à meta mínima de 8 px e todos os degraus de 40 px são superados com folga de 10,58 px por salto simples.

## Coletáveis

Cada posição recebe ID `bonus-soul-01` a `bonus-soul-30`, na ordem do array. O
campo `difficulty` é metadado de placement; todas continuam valendo 10 pontos.

- **8 acessíveis:** piso `(48,216)`, `(176,216)`, `(304,216)`, `(432,216)`;
  faixa baixa `(48,176)`, `(184,176)`, `(304,176)`, `(432,176)`;
- **14 intermediárias:** faixa y=136 `(32,136)`, `(88,136)`, `(172,136)`,
  `(228,136)`, `(284,136)`, `(340,136)`, `(420,136)`; faixa y=96
  `(48,96)`, `(116,96)`, `(188,96)`, `(244,96)`, `(300,96)`, `(372,96)`,
  `(432,96)`;
- **8 avançadas:** `(28,56)`, `(76,56)`, `(156,56)`, `(212,56)`,
  `(268,56)`, `(324,56)`, `(388,56)`, `(444,56)`.

A rota reproduzível do teste segue piso esquerda→direita, faixa baixa
direita→esquerda, intermediária 1 esquerda→direita, intermediária 2
direita→esquerda e avançada esquerda→direita. O controlador envia esquerda ou
direita até uma tolerância de 4 px, salta quando o alvo está ao menos 6 px
acima, usa o segundo salto perto do ápice quando necessário e neutraliza o eixo
até pousar depois de uma coleta aérea. Resultado determinístico final a 120 Hz,
com o canhão real ativo: **30/30, 350 pontos e 17,408 s**. Foram 622 frames à
esquerda, 965 à direita, 502 neutros e 11 pulsos de salto. O canhão produziu 5
avisos e 5 disparos; 4 colidiram primeiro com sólidos, nenhum atingiu BoyPunk e
a rodada terminou com 2,592 s. Isso é evidência automatizada de alcance e
evasão, não medição de dificuldade humana. Não se reduziram velocidade, salto,
coleta ou relógio para forçar o alvo de 16–18 s.

## Contrato do Canhão de Energia

- ID: `energy-cannon-01`; corpo visual `x=452, y=208, w=12, h=24`, encostado à
  parede direita e fora do corredor possível do colisor do jogador;
- boca: centro `(448,220)`; projétil legível `8 × 8`, velocidade `132 px/s` e
  vida máxima `3,6 s`;
- ciclo: espera segura inicial `2,8 s` → aviso/mira travada `0,8 s` → disparo →
  recuperação `2,4 s`; existe no máximo um projétil ativo;
- impacto válido: `−1 s`, relógio limitado a zero, proteção bônus de `0,8 s`,
  sem vida, almas, pontos ou knockback; o fim por zero é processado uma vez;
- projéteis usam a primeira colisão varrida com paredes/pisos sólidos, expiram
  fora da arena e são limpos no fim, skip, menu e restart;
- camada visual: corpo após plataformas e antes de entidades; aviso laranja
  tracejado, corpo de projétil laranja com núcleo claro, pequena faísca no sólido
  e popup `−1 s`. Sem bloom forte ou shake obrigatório; som sintetizado curto
  respeita volume/mudo.

O canhão de energia teve seu redesenho visual concluído por Antigravity em 2026-10-26,
sendo transformado em uma arma robótica industrial perfeitamente integrada ao universo cyberpunk
do jogo. Possui montagem rígida de ancoragem na parede leste (`x: 457..464`), mancal esférico
articulado em `(454, 220)`, carcaça blindada em grafite com arestas iluminadas, núcleo de plasma ciano
com pulso senoidal e sobrecarga térmica, cano escalonado com quebra-chamas e recuo retrátil,
telegrafia com feixe dinâmico e retículo de mira travada 11×11, além de flash estelar de disparo em `(448, 220)`.
Todas as regras de colisão física, origem e cadência foram rigorosamente mantidas.
Evidências disponíveis em `evidencias/art/canhao/`.

## HUD e áreas seguras

- faixa HUD: `x=8..472`, `y=7..46`;
- título e tempo: bloco esquerdo, início em `x=15`;
- contador e pontuação: bloco direito, início em `x=278`;
- aviso transitório: `x=88..392`, `y=247..263`;
- controles touch ocupam os cantos inferiores e o botão de pausa fica no canto
  superior direito da moldura HTML.

O HUD permanente termina em `y=46`; a moldura da alma mais alta começa em
`y=54`, mantendo 8 px livres. O aviso inicial foi movido para baixo justamente
para não cobrir a rota avançada e desaparece após 2,5 s. Não colocar arte de
alto contraste atrás do HUD. Coletáveis e plataformas devem permanecer legíveis
sem depender de bloom; a faixa inferior não possui texto permanente.

## Camadas visuais

Ordem consolidada:

1. fundo dedicado `world.background.bonus` (`assets/images/world/camara-energia.png`), com fallback para `world.background.factory` e `world.background`;
2. atmosfera calibrada da câmara (`drawEnergyChamberAtmosphere`), com iluminação radial suave do reator e conduítes verticais rente às paredes;
3. plataformas com tilesets modulares `world.tiles.bonus` (`assets/images/world/energy-platformtiles.png`), diferenciando mão única (trilhos supercondutores vazados com topo ciano) de sólidos (blindagem cerâmica pesada com contorno violeta/âmbar e fosso abissal com sinalização);
4. almas bônus com silhueta própria de diamante quântico `bonusSoul.0..3` (`assets/images/world/bonus-soul-000..003.png`), núcleo âmbar e moldura de contraste;
5. canhão robótico industrial na parede leste (`energy-cannon-01`), com telegrafia e animação mecânica;
6. Bola de Pulso, jogador e efeitos visuais;
7. HUD;
8. telas HTML de qualificação, pausa e resultado.

## Contratos de efeitos

### Almas bônus

Utilizam os sprites dedicados `bonusSoul.0..3` (com fallback automático para `soul.0..3`). Preservam corpo visual 15×16 e colisão AABB idêntica, sem raio extra. O bob de ±2 px é somente render e não move o AABB. A moldura âmbar 19×20 é intencional: diferencia bônus/campanha e ajuda a leitura sobre o fundo.

### Bola de Pulso

- corpo/collider: 8×8 em `(shot.x, shot.y)`;
- sprite existente: `player.bullet`;
- núcleo ciano 4×4 e centro claro 2×2 permanecem dentro do collider;
- trilha ciano: no máximo 6 amostras de 0,12 s; com movimento reduzido, 2
  amostras de 0,07 s;
- impacto: `pulseImpact`, 0,18 s, quatro partículas pequenas (duas com movimento
  reduzido), criado somente depois de colisão confirmada com parede ou inimigo;
- arco laranja: acompanha `player.attackTimer` e o facing dentro da animação real
  de 0,18 s.

Trilha, arco, núcleo adicional e faíscas não possuem hitbox, dano ou áudio
próprio. Velocidade 330 px/s, vida/range, origem, cooldown e dano não mudaram.

## Fluxo e arte HTML

“Bônus conquistado!” aparece sobre uma tela compacta por 1,35 s (0,35 s com
movimento reduzido), com botão focável **Pular bônus**. O resultado mostra almas,
pontuação da rodada, melhor salva e somente a diferença positiva como novos
pontos. Para a vitória do Distrito, pode oferecer a Fábrica; para a vitória da
Fábrica, essa ação fica ausente.

## Identidade Visual Concluída (Tier A — 2026-10-26)

A identidade visual completa da Câmara de Energia foi implementada e validada:
- **Fundo Dedicado:** `assets/images/world/camara-energia.png` (1365×768) com anel de plasma, bobinas e controle estrito de luminância (5% a 45%);
- **Tilesets de Energia:** `assets/images/world/energy-platformtiles.png` (128×128 RGBA) com distinção de forma/valor entre trilhos vazados supercondutores (mão única) e blindagem maciça (sólido);
- **Silhueta de Alma Bônus:** `assets/images/world/bonus-soul-000..003.png` (15×16 RGBA) com núcleo em diamante quântico solar/âmbar e centelhas orbitantes;
- **Atmosfera e Conduítes:** Conduítes verticais discretos nas paredes, gradiente abissal no fosso central (`x = 216..264`) e respeito integral ao modo `reducedMotion`;
- **Evidências Visuais:** Catálogo completo antes/depois (nativo 480×270 e 4x nearest-neighbor) em `evidencias/art/camara-energia/`.

## Prévia direta de desenvolvimento

`?bonus-preview=1` chama `GameModel.startBonusPreview()`, que por sua vez usa o
mesmo `startBonusArena({ preview: true })` da arena real. Não existe layout,
renderer, relógio ou lista de almas paralela. A faixa do HUD acrescenta
“PRÉVIA”; a tela final informa que nenhum recorde foi alterado.

A prévia fixa `progressionEligible=false` e
`bonusQualificationEligible=false`. Seu evento de conclusão também carrega
`progressionEligible=false`, portanto `ProgressionStore.recordBonusResult` não é
chamado. Recomeçar no pause ou no resultado cria outra prévia limpa; Menu chama
o lifecycle normal. Launcher: `./abrir-bonus.sh`, em
`http://127.0.0.1:47831/?bonus-preview=1`.

## Coesão Visual Holística e Polimento de Game Feel (S1 a S11)

Em 2026-10-26, foi executada a consolidação estética e mecânica de todo o ecossistema BoyPunk! Web:

### Resumo do Guia de Estilo ([`docs/GUIA_DE_ESTILO.md`](docs/GUIA_DE_ESTILO.md))
- **Paleta Mestre:** `--ink` (`#090711`), `--panel` (`rgba(14, 11, 28, 0.94)`), `--orange` (`#ff7a28`), `--cyan` (`#37e6ee`), `--violet` (`#ae62ff`), `--paper` (`#fff5dc`).
- **Paletas por Fase:**
  - *Distrito Neon:* Ciano `#37e6ee` e Laranja `#ff7a28`, reflexo molhado no asfalto.
  - *Fábrica de Sucata:* Grafite/aço `#161924`, âmbar `#ff8522`, aviso zebrado e fornalha industrial.
  - *Câmara de Energia:* Aço fosco `#151923`, ciano elétrico `#37e6ee`, laser de mira do canhão.
- **Tipografia:** Hierarquia estrita com `Pixelify Sans` (7px a 46px).
- **Outlines e Luz:** 1px sólido escuro para entidades móveis; luz zenital-esquerda; sombras sólidas de 3px a 6px nos painéis.
- **Alvos Touch:** Mínimo de 44px com feedback tátil ao pressionar (`scale(0.92)`).

### Tabela de Parâmetros de Movimento (Antes vs Depois)

| Parâmetro | Antes | Depois | Justificativa / Efeito |
|:---|:---:|:---:|:---|
| `maxSpeed` | 150 px/s | **150 px/s** | Preservado estritamente para manter todas as rotas válidas |
| `acceleration` | 1250 px/s² | **1250 px/s²** | Resposta horizontal ágil (~0.12 s para velocidade máxima) |
| `friction` | 1650 px/s² | **1650 px/s²** | Desaceleração limpa e estável (~0.09 s para parada total) |
| `gravity` | 950 px/s² | **950 px/s²** | Arco de salto previsível |
| `jumpSpeed` | 310 px/s | **310 px/s** | Ápice teórico 50.58 px (margem +10.58 px sobre patamar de 40 px) |
| `doubleJumpSpeed` | 285 px/s | **285 px/s** | Alcance vertical acumulado de 93.33 px |
| `variableJumpMinSpeed` | *N/D* | **140 px/s** | Novo: Permite micro-hops (~10.3 px) ao soltar o salto antecipadamente |
| `coyoteTime` | 0.09 s | **0.09 s** | 90 ms de tolerância na borda (~11 ticks a 120 Hz) |
| `jumpBuffer` | 0.12 s | **0.12 s** | 120 ms de pré-buffer de salto antes do pouso (~14 ticks) |
| `shotSpeed` | 330 px/s | **330 px/s** | Projétil rápido com rastro ciano e centelha de boca (muzzle flash) |

### Verificação Completa
- `npm run check`: 100% aprovado;
- teste nomeado integrado: **121 testes aprovados em 14 arquivos (0 falhas)**:
  - Inclui a nova suíte [`tests/movement.test.mjs`](tests/movement.test.mjs) cobrindo coyote time, jump buffer, salto variável, velocidade máxima e desaceleração por atrito.
- **Rotas físicas com entradas reais:**
  - Rota conservadora com canhão ativo: 30/30 almas e 350 pontos em **17,408 s** (margem de 2,592 s, cinco tiros evadidos);
  - Cenário determinístico com 1 impacto: 30/30 almas em **18,408 s** de relógio consumido (margem de 1,592 s);
  - Rota da Fábrica: Pousos estáveis em `y=144` e `y=80` plenamente alcançados.
- **Browser Headless real (CDP):**
  - Executado via Chrome DevTools Protocol (`node tools/server.mjs --browser-test`): **APROVADO**;
  - Capturas completas de S1 a S11 salvas em [`evidencias/audit/after/`](evidencias/audit/after/).
- **Distinção estrita de escopo de teste:**
  - *Automação:* Testes unitários com simulação determinística a 120 Hz e navegador Chrome headless via CDP em 1280x720.
  - *Limitações:* Não substitui playtesting humano com teclado físico ou testes em dispositivos móveis físicos reais (iOS/Android).

Comandos para inicialização:

```bash
# Iniciar o jogo completo (fluxo normal com campanha e vitória levando ao bônus):
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh

# Iniciar a prévia direta e isolada da Câmara de Energia:
/home/flow/Projetos/BoyPunk-Web/abrir-bonus.sh
```

