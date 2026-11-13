# Plano de personagens — BoyPunk e Nilo

**Raiz canônica:** `/home/flow/Projetos/BoyPunk-Web`  
**Versão verificada:** `0.4.2`  
**Escopo:** contrato e sequência de produção; nenhuma integração de personagem foi realizada nesta organização.

## 1. Estado atual

BoyPunk e Nilo já possuem conjuntos ativos completos nos caminhos consumidos por `src/assets.js`. O material novo em `art-deliveries/antigravity/personagens-v1/` não substitui esses conjuntos: contém somente oito candidatos clássicos de BoyPunk (`idle` e `walk`) e não possui manifesto, previews animados ou aprovação de integração.

Referências organizadas:

- BoyPunk: `art-deliveries/references/characters/boypunk/`
- Nilo: `art-deliveries/references/characters/nilo/`

As pranchas de referência incluem ações como corrida e agachamento. Elas são direção visual, não autorização para criar estados novos. O runtime suporta somente os estados listados neste documento.

## 2. Contrato técnico autoritativo

### Estados, ordem e cadência

| Estado | Frames | Ordem | Cadência | Loop |
|---|---:|---|---:|---|
| `idle` | 4 | `000..003` | 5 fps | sim |
| `walk` | 4 | `000..003` | 12 fps | sim |
| `jump` | 1 | `000` | pose | não |
| `fall` | 1 | `000` | pose | não |
| `attack1` | 4 | `000..003` | 22 fps | durante o ataque |
| `hurt` | 3 | `000..002` | 12 fps | enquanto há dano visual |
| `die` | 4 | `000..003` | 10 fps | não |

Prioridade do dispatcher: `die` → `attack1` → `hurt` → `jump/fall` → `walk` → `idle`.

Não produzir `run`, `crouch`, recarga, troca de arma ou outros estados sem mudança de contrato previamente autorizada.

### Canvas, pivô e chão

- Clássico: `64×96 RGBA` por frame.
- Ilustrado: `128×192 RGBA` por frame.
- Colisor lógico comum: `22×32`.
- Desenho lógico: `64×96` em `drawX = x + w/2 - 16`, `drawY = y + h - 64`.
- Pivô corporal lógico: `X=16`, não o centro geométrico do canvas.
- Facing canônico olha para a direita. Facing esquerdo é espelhado pelo renderer, com compensação `renderX = drawX - 32`.
- Em poses apoiadas, a fronteira física do chão é Y=64 no clássico; o último pixel de contato fica em Y=63. No ilustrado, a equivalência é a fronteira Y=128, normalmente com contato até Y=127.
- Não fazer auto-trim, recentralização ou deslocamento do tronco/quadril entre frames.

O contrato de chão é específico da pose: `jump` e `fall` podem manter os pés acima da fronteira; quadros intermediários/finais de `die` podem deitar a silhueta e mudar sua ocupação. Não se deve forçar pés no chão em poses aéreas ou de derrota, nem impor as mesmas coordenadas de alpha ao clássico e ao ilustrado.

Envelopes máximos observados no conjunto ativo, incluindo extensões de ataque e morte:

| Conjunto | União alpha aproximada |
|---|---|
| BoyPunk clássico | X `0..61`, Y `36..63` |
| BoyPunk ilustrado | X `12..93`, Y `40..127` |
| Nilo clássico | X `5..47`, Y `35..63` |
| Nilo ilustrado | X `12..88`, Y `40..127` |

Esses limites não são metas de preenchimento; são margens máximas de compatibilidade.

### Arma, disparo e espelhamento

`CHARACTERS.weaponAnchor` usa o centro do muzzle relativo ao colisor. Com `w=22`:

| Personagem | Centro do muzzle à direita | Centro à esquerda | Top-left do projétil 8×8 à direita | Top-left à esquerda |
|---|---|---|---|---|
| BoyPunk (`boypunk`) | `(x+38, y+16)` | `(x-16, y+16)` | `(x+34, y+12)` | `(x-20, y+12)` |
| Nilo (`support`) | `(x+32, y+12)` | `(x-10, y+12)` | `(x+28, y+8)` | `(x-14, y+8)` |

A boca visual da arma no frame `attack1.2` deve convergir para essa âncora nos dois facings. A diferença de arma entre os protagonistas é somente visual nesta etapa: não mudar dano, alcance, velocidade, cadência, quantidade ou comportamento dos projéteis.

### Retratos e fallbacks

- Retrato ativo de BoyPunk: `assets/images/player-helmet/player-portrait-000.png`, `32×32 RGBA`.
- Retrato ativo de Nilo: `assets/images/characters/nilo/nilo-portrait-000.png`, `32×32 RGBA`.
- Não existem retratos ilustrados separados no manifesto; a interface usa os retratos ativos.
- Nilo usa `fallbackSpritePrefix: "player"`: se um frame `nilo.*` faltar, o renderer pode cair para BoyPunk.
- Em `renderScale > 1`, o renderer tenta `player.illustrated.*` / `nilo.illustrated.*`; se não encontrar, cai para o namespace clássico.
- O VFX `nilo.heal.0..3` tem quatro frames `32×32`; é efeito visual separado, não estado do corpo.

## 3. Inventário de BoyPunk

Ativos: clássico em `assets/images/player-helmet/`; ilustrado em `assets/images/characters/boypunk-illustrated/`.

| Estado | Requerido | Disponível | Validado tecnicamente | Revisado visualmente | Integrado | Pendência |
|---|---:|---|---|---|---|---|
| `idle` | C4 + I4 | ativos C4/I4; candidatos C4 em `personagens-v1` | ativos: sim; candidatos: sim em dimensão, RGBA, pivô e chão | ativos: sim; candidatos: revisão estática sim, movimento não | ativos: sim; candidatos: não | gerar loop 5 fps e comparação em runtime antes de decidir |
| `walk` | C4 + I4 | ativos C4/I4; candidatos C4 em `personagens-v1` | ativos: sim; candidatos: sim em dimensão, RGBA, pivô e chão | ativos: sim; candidatos: revisão estática sim, passada não | ativos: sim; candidatos: não | validar contato/passagem/extensão a 12 fps e ambos facings |
| `jump` | C1 + I1 | ativos C1/I1 | sim | sim, com evidências existentes | sim | nova direção ainda não produzida |
| `fall` | C1 + I1 | ativos C1/I1 | sim | sim, com evidências existentes | sim | nova direção ainda não produzida |
| `attack1` | C4 + I4 | ativos C4/I4 | sim | sim, incluindo muzzle atual | sim | nova direção deve respeitar âncora e timing de 22 fps |
| `hurt` | C3 + I3 | ativos C3/I3 | sim | sim | sim | nova direção ainda não produzida |
| `die` | C4 + I4 | ativos C4/I4 | sim | sim; pose final horizontal é intencional | sim | nova direção ainda não produzida |
| retrato | 1 × 32×32 | ativo clássico 1 | sim | sim | sim | produzir variante somente dentro de pacote completo |

Os oito candidatos de `personagens-v1` têm 64×96 RGBA e alpha entre aproximadamente X=7..31 e Y=34..63. Seus hashes diferem dos ativos. A compatibilidade estática não prova continuidade temporal; por isso permanecem candidatos.

Direção futura: armadura clara, metal escuro, iluminação ciano e acentos laranja; preservar a leitura da silhueta, o pivô X=16 e a arma dentro do envelope de ataque.

## 4. Inventário de Nilo

Ativos: clássico em `assets/images/characters/nilo/`; ilustrado em `assets/images/characters/nilo-illustrated/`.

| Estado | Requerido | Disponível | Validado tecnicamente | Revisado visualmente | Integrado | Pendência |
|---|---:|---|---|---|---|---|
| `idle` | C4 + I4 | ativos C4/I4; imagem-fonte com 4 poses | ativos: sim; fonte 2172×724: não é runtime | ativos: sim; fonte: revisão conceitual sim | ativos: sim; fonte: não | extrair/redesenhar, limpar alpha e adaptar ao contrato sem cortar automaticamente |
| `walk` | C4 + I4 | ativos C4/I4 | sim | sim, inclusive loop existente | sim | nova direção ainda não produzida |
| `jump` | C1 + I1 | ativos C1/I1 | sim | sim | sim | nova direção ainda não produzida |
| `fall` | C1 + I1 | ativos C1/I1 | sim | sim | sim | nova direção ainda não produzida |
| `attack1` | C4 + I4 | ativos C4/I4 | sim | sim, com loop e runtime existentes | sim | nova arma visual deve alinhar ao muzzle de Nilo |
| `hurt` | C3 + I3 | ativos C3/I3 | sim | sim | sim | nova direção ainda não produzida |
| `die` | C4 + I4 | ativos C4/I4 | sim | sim; pose horizontal final é intencional | sim | nova direção ainda não produzida |
| retrato | 1 × 32×32 | ativo clássico 1 | sim | sim | sim | atualizar apenas junto ao redesign aprovado |
| `heal` VFX | 4 × 32×32 | ativo clássico 4 | sim | sim, loop existente | sim | não é necessário redesenhar no primeiro lote |

Não foi encontrada entrega `nilo-idle-v*`. `references/characters/nilo/nilo-idle-source-v1.png` é uma cópia corretamente nomeada da imagem-fonte legada, não uma folha recortada nem um candidato pronto.

Direção futura: Nilo é um homem negro com rosto reconhecível nas dimensões efetivas, armadura grafite, luz verde/violeta e arma visualmente distinta. Manter diferenciação por forma e cor, sem transformar Nilo em recoloração de BoyPunk e sem alterar sua mecânica `support`.

## 5. Continuidade visual comum

Toda revisão deve ser julgada primeiro em 480×270:

- protagonistas e inimigos precisam de silhuetas separáveis do cenário;
- plataformas devem continuar claramente navegáveis, mesmo com backgrounds detalhados;
- decoração não pode simular coletável, plataforma, porta ou perigo inexistente;
- altar, almas, power-ups, tiros e avisos de hazard devem dominar localmente o contraste;
- ciano de cenário não pode apagar tiros ciano; usar valor, contorno, núcleo claro e ritmo para separá-los;
- Fábrica preserva sinalização da prensa real; elementos industriais decorativos não devem competir com ela;
- Câmara de Energia preserva leitura das almas, do fosso e do canhão;
- materiais e paleta variam por ambiente, mas a hierarquia de gameplay é comum.

Preservar `renderScale` e filtragem atuais: escala 1 sem smoothing; escalas maiores com smoothing `high`. Uma arte que só funciona ampliada em nearest-neighbor não está aprovada para este renderer.

## 6. Requisitos para imagens geradas por IA

Uma geração não é entrega de runtime. Antes de ser candidata, precisa de:

1. recorte deliberado por frame, sem texto, borda de prancha ou elementos vizinhos;
2. transparência genuína verificada pixel a pixel;
3. ajuste de escala para 64×96 ou 128×192 sem mera deformação;
4. pivô corporal e linha de chão conforme a pose;
5. continuidade de volume, arma, iluminação e identidade entre quadros;
6. folga para espelhamento e muzzle;
7. folha estática com overlay de pivô/colisor;
8. preview animado na cadência real e nos dois facings;
9. composição em 480×270 nos três ambientes ativos;
10. manifesto com hashes, dimensões e estado de revisão.

Uma prancha grande com quatro personagens lado a lado não é uma sprite sheet pronta e não deve ser dividida automaticamente sem revisão de anatomia e continuidade.

## 7. Próxima entrega recomendada ao Antigravity

Criar um novo pacote, preservando `personagens-v1`:

```text
art-deliveries/antigravity/personagens-v2/
  boypunk/
    classic/
    portraits/
  previews/
  documentation/
  README.md
```

Primeiro lote:

- 21 frames clássicos completos de BoyPunk 64×96 RGBA;
- retrato 32×32;
- reutilizar os oito candidatos `idle`/`walk` somente se sobreviverem à validação animada;
- loops de idle 5 fps, walk 12 fps, attack 22 fps e die 10 fps;
- folha de ambos facings com pivô X=16, chão Y=64, colisor e muzzle;
- três composições 480×270: Distrito, Fábrica e Câmara;
- README e `documentation/delivery-manifest.json` com SHA-256.

Após aprovação técnica e visual desse lote, produzir `boypunk/illustrated/`. Em seguida abrir um pacote/lote equivalente para Nilo, começando pela adaptação da imagem-fonte organizada e sem substituir os ativos até existir backup, relatório e validação no navegador.

## 8. Critério de promoção para `assets/`

Um conjunto só pode ser integrado quando estiver completo para o escopo declarado, tiver hashes estáveis, alpha/pivôs válidos, previews animados aprovados e comparação real em 480×270. A integração deve ser uma tarefa separada, com backup dedicado dos destinos ativos, checagem pré/pós e rollback. Nenhum arquivo foi promovido nesta execução.
