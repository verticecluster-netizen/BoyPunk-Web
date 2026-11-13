# Passagem de Personagens para Arte — Nilo

Data: 2026-10-28  
Fonte: BoyPunk-Web 0.2.6  
Estado: **Arte original de Nilo completamente produzida, validada e integrada**.

## 1. Identidade estável e estado de integração

- ID técnico preservado: `support`. Não renomear saves, testes ou lógica para
  `nilo`.
- Nome público oficial em pt-BR e en: **Nilo**.
- Namespace visual ativo: `nilo.{state}.{frame}`.
- Fallback preservado e testado: `player.{state}.{frame}`.
- `provisionalVisual: false` agora autoritativo após validação da folha completa
  dos 21 frames originais, folha de facings, testes unitários (230 aprovados) e
  evidências runtime em navegador real.
- O rótulo provisório `(PROV.)` foi removido do HUD do jogo.

O dispatcher visual consome `nilo.*` nativamente e o fallback continua ativo caso
algum frame seja removido. Todos os assets foram registrados em `src/assets.js` e
existem localmente em `assets/images/characters/nilo/`.

## 2. Mecânica verificada

| Atributo | BoyPunk (`boypunk`) | Nilo (`support`) |
|---|---:|---:|
| Colisor | 22×32 px | 22×32 px |
| Velocidade | 150 px/s | 150 px/s |
| Salto / salto aéreo | 310 / 285 px/s | 310 / 285 px/s |
| Vida fácil / normal / difícil | 6 / 4 / 3 | 6 / 4 / 3 |
| Projétil | 8×8, 330 px/s, vida 1,25 s | idêntico |
| Cooldown de ataque | 0,34 s | 0,408 s (`0,34 × 1,20`, uma vez) |
| Habilidade | nenhuma | Cura Própria |

Cura Própria restaura exatamente 1 PV, limitada à vida máxima. A recarga é de
20 segundos ativos e começa indisponível a cada nível/retry. Vida cheia ou
recarga em andamento não consome prontidão. Não cura altar, não ressuscita e
não muda invulnerabilidade ou knockback. Dano terminal é resolvido antes do
input de cura no mesmo tick.

A habilidade existe somente em campanha normal. Survival, demo e preview do
patrol-shooter fixam `boypunk`;
bônus preserva o personagem visual escolhido, mas define `ability = null`.
Pausa/aba oculta congelam a recarga. Derrota, vitória, menu e troca de cena
removem habilidade e feedback transitórios. Rajada Dupla continua produzindo
dois projéteis a 0,12 s e respeita 0,408 s para Nilo.

## 3. Entrada, seleção e persistência

- Teclado: `Q` (`KeyQ`).
- Touch: botão `✚`, 48×48 CSS px, ação lógica `ability`.
- Gamepad padrão: botão 4 (LB/L1).
- Gamepad genérico: ação `ability` remapeável; perfil antigo sem a propriedade
  recebe `null` sem invalidar os outros bindings.
- `consumeTransitionInput()` bloqueia bordas de ataque/cura mantidas durante a
  confirmação até a liberação física.
- Preferência: `boypunk-web-character-v1`, contendo `boypunk` ou `support`.
  Save antigo sem a chave, valor inválido ou storage inacessível cai para
  `boypunk` sem reescrever progresso ou outras preferências.
- Recarga, efeito e input pendente nunca são persistidos.

## 4. Contrato exato dos sprites

### Canvas, origem e chão

- Canvas obrigatório por frame: **64×96 RGBA**.
- Draw canônico à direita:
  - `drawX = player.x + player.w / 2 - 16` = `player.x - 5`;
  - `drawY = player.y + player.h - 64` = `player.y - 32`.
- Colisor relativo à origem canônica: `(x=5, y=32, w=22, h=32)`.
- Linha de chão do asset: pixels podem ocupar até **Y=63**; Y=64 é a fronteira
  física dos pés. Como `drawY = feetY - 64`, a linha 63 aparece em
  `feetY - 1`, sem penetrar a plataforma.
- Os frames atuais confirmados têm alpha em Y=36..63; as linhas 64..95 ficam
  transparentes. Preservar esse contrato, mesmo que o canvas pareça ter uma
  faixa inferior vazia.

### Facing e pivô

- A arte-fonte olha para a direita.
- `facing < 0` espelha horizontalmente.
- O corpo está ancorado em **X=16**, não no centro geométrico X=32 do canvas.
  O renderer compensa o facing esquerdo com `renderX = drawX - 32`, fazendo o
  espelho genérico equivaler a um pivô local em X=16. Não deslocar o corpo para
  o centro do canvas; ambos os facings devem continuar sobre o mesmo AABB.
- O alpha de idle/walk de referência ocupa aproximadamente X=6..26. Ataques
  podem estender o braço/arma até as bordas, mas tronco, quadril e pés devem
  conservar o pivô X=16.

### Mapeamento obrigatório — 21 frames

| Estado | Chaves | Frames | Velocidade | Loop |
|---|---|---:|---:|---|
| `idle` | `nilo.idle.0..3` | 4 | 5 fps | sim |
| `walk` | `nilo.walk.0..3` | 4 | 12 fps | sim |
| `jump` | `nilo.jump.0` | 1 | pose | não |
| `fall` | `nilo.fall.0` | 1 | pose | não |
| `attack1` | `nilo.attack1.0..3` | 4 | 22 fps | durante ataque |
| `hurt` | `nilo.hurt.0..2` | 3 | 12 fps | não |
| `die` | `nilo.die.0..3` | 4 | 10 fps | não |

Sugestão de arquivos: `assets/images/characters/nilo/nilo-{state}-{NNN}.png`.
Depois da entrega, registrar as 21 chaves opcionais em `src/assets.js`; tornar
somente `nilo.idle.0` obrigatório após validar a folha completa.

### Âncoras de arma existentes

Há dois contratos históricos distintos, ambos preservados nesta fase:

1. Flash visual do renderer, centro:
   - direita: `(player.x + player.w + 6, player.y + 16)` = `(x+28,y+16)`;
   - esquerda: `(player.x - 8, player.y + 16)`.
2. Projétil de gameplay, canto superior esquerdo 8×8:
   - direita: `(player.x + 54, player.y + 16)`;
   - esquerda: `(player.x - 10, player.y + 16)`.

O arco de ataque usa centro `player.centerX + facing×9`, `player.y+15`, raio
17. O art pass não deve alterar nenhuma dessas coordenadas. Desenhar o módulo
de antebraço coerente com o flash visual e manter extensões de ataque dentro do
canvas. A diferença histórica entre flash e nascimento do projétil deve ser
avaliada em uma revisão de combate separada, não escondida por deslocamento de
arte.

## 5. Direção artística original de Nilo

Nilo é um android curador **atompunk/nanopunk**, não uma recoloração de
BoyPunk. Requisitos:

- silhueta própria, ainda legível nas dimensões e pivôs acima;
- placas arredondadas em marfim fosco e grafite;
- visor âmbar, sem copiar o capacete de BoyPunk;
- reator circular compacto no tórax;
- ombros, cotovelos, quadris e joelhos mecanicamente articulados;
- módulo de nano-reparo integrado ao antebraço;
- acentos de reparo mint/cyan contidos, usados como função e não como banho de
  cor;
- passada com contato, passagem e extensão reais; não deslizar pose estática;
- `hurt` e `die` devem comunicar perda de energia mecânica, não anatomia humana
  genérica.

Não usar cruz médica como identidade principal da arte final. A cruz atual é
apenas marcador provisório e desaparece automaticamente quando frames
`nilo.*` são utilizados.

## 6. Cura, HUD e retrato

- Hook da cura: efeito `kind: "heal"`, origem no centro do colisor
  `(player.centerX, player.centerY)`, duração 0,75 s, texto `+1 VIDA`.
- Renderer atual: aura radial mint, círculo e partículas reduzidas/desligadas
  conforme `reducedMotion`. A animação do personagem não dispara nem controla a
  cura.
- Um VFX dedicado opcional pode usar 4 frames 32×32, centro `(16,16)`, chave
  sugerida `nilo.heal.0..3`; deve ser exclusivamente visual.
- HUD: nome `NILO (PROV.)`, painel de habilidade 136×18 em Y=51 ou Y=73 quando
  Rajada Dupla ocupa a primeira linha; o tempo vem do modelo.
- Retrato opcional para seleção: 32×32 RGBA, origem top-left, cabeça/reator
  legíveis e fundo transparente. A interface atual funciona sem retrato.

## 7. Validação atual e próxima tarefa

Automação relevante: `tests/characters.test.mjs`, `tests/renderer.test.mjs`,
`tests/powerups.test.mjs`, `tests/gamepad.test.mjs` e
`tests/mobile-controls.test.mjs`. A revisão adicionou cobertura de 6/4/3 por
dificuldade, preferência antiga/corrompida, cleanup terminal, configuração de
cura, borda de transição, foco e namespace/fallback visual.

As dez capturas existentes em `evidencias/art/characters/` comprovam a
integração anterior com o fallback BoyPunk; **não são prova de arte original de
Nilo** e antecedem a correção do pivô esquerdo.

## 7. Validação concluída e evidências finais

Todas as 5 etapas da encomenda foram rigorosamente executadas e validadas:

1. **Produção dos 21 frames originais:** gerados via `tools/build-nilo-sprites.py`,
   estritamente dentro de 64×96 RGBA, chão em Y=63, pivô X=16, estética
   atompunk/nanopunk (marfim/grafite/âmbar/mint), módulo de nano-reparo e reator
   circular.
2. **Folhas de contato e comparativos:** gerados em `evidencias/art/nilo/`:
   `folha-de-contato-nilo-21frames.png` (com overlay de colisor 22×32 e linha de
   chão), `folha-de-contato-ambos-facings.png` (provando alinhamento simétrico de
   ambos os facings), comparativos 1:1 nativo e 4× ampliado contra BoyPunk, e
   loops animados WebP/GIF de caminhada (12 fps), repouso (5 fps), ataque (22 fps)
   e VFX de cura (8 fps).
3. **Registro no manifesto e fallback seguro:** os 21 frames, o retrato 32×32 e os
   4 frames de VFX foram registrados em `src/assets.js` sob `nilo.*`. O fallback
   para `player.*` foi mantido e validado em `tests/renderer.test.mjs`.
4. **Validação em navegador real:** `tools/record-nilo-evidence.mjs` executou o
   jogo em Google Chrome headless real via CDP, capturando 11 capturas de tela de
   gameplay real (idle, walk, ataque, cura +1 VIDA, virada à esquerda, salto,
   queda, dano, derrota no piso e Fábrica).
5. **Integração definitiva:** `provisionalVisual: false` ativado em `src/config.js`,
   insígnia de cruz provisória desativada e rótulo `(PROV.)` removido do HUD.
   230 testes aprovados em 25 arquivos (`npm run check` e `npm test`).

Comandos:

```bash
npm run check
npm test
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh --no-open
```
