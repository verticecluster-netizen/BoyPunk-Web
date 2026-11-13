# Revisão técnica e visual — `personagens-v2`

Data: 2026-11-04  
Projeto canônico: `/home/flow/Projetos/BoyPunk-Web`  
Versão verificada no código e em `package.json`: `0.4.2`  
Entrega revisada: `art-deliveries/antigravity/personagens-v2/`

## Decisão

**Bloqueado para integração nesta versão.**

A estrutura dos 86 candidatos é tecnicamente compatível com o contrato de arquivos do jogo, mas o pacote não passa como lote final por dois bloqueios:

1. O Nilo perde parte importante da silhueta do tronco, pernas e arma sobre os fundos escuros, sobretudo em 480 × 270. A prévia comparativa entregue mostra o problema no Distrito Neon e na Fábrica de Sucata, tanto no modo clássico quanto no ilustrado.
2. O mapa de destinos do `README.md` não corresponde aos caminhos carregados pelo código atual. Segui-lo criaria/copiaría arquivos para diretórios sem efeito no runtime.

Os candidatos não foram copiados para `assets/`. Esta decisão não reprova o BoyPunk isoladamente: seus quadros passam a revisão estrutural e mantêm boa leitura nos três cenários. O bloqueio é do pacote como lote de integração.

## Inventário independente

| Personagem | Clássico | Ilustrado | Retrato | Total |
|---|---:|---:|---:|---:|
| BoyPunk | 21 | 21 | 1 | 43 |
| Nilo | 21 | 21 | 1 | 43 |
| **Total** | **42** | **42** | **2** | **86** |

Estados encontrados em cada modo: `idle 4`, `walk 4`, `jump 1`, `fall 1`, `attack1 4`, `hurt 3`, `die 4`.

Além dos 86 PNGs de runtime, a entrega contém 38 arquivos de prévia, dos quais 6 são PNGs. Isso explica os 92 PNGs no pacote inteiro sem contradizer os 86 candidatos.

Manifesto real: `documentation/delivery-manifest.json`  
SHA-256 do manifesto: `81d112b76a0869e88d0c2b13b78c1ec25bbbf21d65afad8d9a2406407bae38f4`

## Validação estrutural

- 86/86 candidatos são arquivos regulares, sem links simbólicos.
- 86/86 foram decodificados integralmente como PNG.
- 42 clássicos: 64 × 96, RGBA.
- 42 ilustrados: 128 × 192, RGBA.
- 2 retratos: 32 × 32, RGBA.
- Todos possuem canal alpha real.
- Nenhum pixel opaco foi encontrado abaixo de `Y=64` nos clássicos ou de `Y=128` nos ilustrados.
- Todos os 86 nomes esperados existem; não há nome extra nem estado ausente.
- Hash e tamanho dos 86 candidatos conferem com o manifesto.
- Hash e tamanho das 38 prévias também conferem com o manifesto.
- As versões ilustradas não são simples ampliações nearest-neighbor: 0/21 quadros de cada personagem coincidem após redução. O RMSE normalizado médio foi 0,188809 no BoyPunk e 0,084246 no Nilo.
- Os 86 candidatos são diferentes dos 86 arquivos ativos correspondentes: 0/86 hashes iguais.

O renderer desenha os dois modos no mesmo retângulo lógico de 64 × 96. O ilustrado 128 × 192 é escolhido quando `renderScale > 1`, sem mudar pivô ou geometria. A linha dos pés e o pivô horizontal entregues são compatíveis com esse comportamento.

## Revisão visual

### Correspondência com as fontes

- **BoyPunk:** preserva armadura clara, estrutura grafite, luz ciano, detalhes laranja e rifle de plasma. A silhueta é uma simplificação pixel-art coerente com as fontes aprovadas.
- **Nilo:** preserva pele negra visível, capacete/visor, armadura grafite, acentos verdes e violetas e arma distinta da do BoyPunk. O retrato deixa a identidade racial legível, embora o rosto em 32 × 32 seja bastante abstrato.
- Nenhum quadro mostra troca de personagem, deformação gerativa evidente do rosto ou substituição acidental da arma entre quadros.

Fontes comparadas:

- `art-deliveries/references/characters/boypunk/boypunk-visual-board-v1.jpeg`
- `art-deliveries/references/characters/boypunk/boypunk-idle-source-v1.png`
- `art-deliveries/references/characters/nilo/nilo-visual-board-v1.jpeg`
- `art-deliveries/references/characters/nilo/nilo-idle-source-v1.png`

### Movimento e estados

- As caminhadas dos dois personagens têm troca real de apoio das pernas nos quatro quadros. Braços e arma se deslocam de forma contida, coerente com a empunhadura de duas mãos; não são quatro cópias estáticas.
- `jump` e `fall` são poses distintas em ambos os modos, mas a diferença é sutil no Nilo clássico e deve ser preservada/aumentada numa revisão, sem alterar o contrato de um quadro por estado.
- `hurt` e `die` são visualmente distintos. A derrota progride de pé para o chão e termina em pose horizontal.
- Não foi observada mudança de modelo da arma durante caminhada ou ataque. Os flashes do ataque variam sem deformar o corpo principal da arma.

### Quadros idênticos e cadência

Foram encontrados seis grupos de conteúdo repetido:

- BoyPunk clássico: `hurt-000` = `die-000`.
- BoyPunk ilustrado: `hurt-000` = `hurt-002` = `die-000`.
- Nilo clássico: `hurt-000` = `hurt-002`; `idle-000` = `idle-003`.
- Nilo ilustrado: `hurt-000` = `hurt-002`; `idle-000` = `idle-003`.

O padrão A–B–A em `hurt` e o primeiro quadro de `die` reaproveitando a pose de dano são transições plausíveis, não corrupção. Já a repetição `idle-003` → `idle-000` do Nilo produz dois intervalos consecutivos iguais no fechamento do loop de 5 fps; deve ser confirmada como pausa intencional.

### Problemas visuais

1. **Contraste do Nilo:** a massa grafite fica próxima demais dos valores dos cenários. Visor e detalhes verdes continuam visíveis, mas pernas, tronco e parte da carabina somem em áreas escuras. É o bloqueio visual principal.
2. **Artefato em `nilo-hurt-001`:** existe um componente alpha verde isolado do corpo, de 1 × 1 no clássico e 4 × 4 no ilustrado. Visualmente parece um quadrado flutuante; falta confirmar se é partícula intencional. A escala entre os modos também não é equivalente.
3. **Salto/queda do Nilo:** são tecnicamente diferentes, porém a leitura rápida em 480 × 270 é marginal.
4. **Prévia “all-states”:** os GIF/WebP com esse nome mostram somente `idle`, `walk`, `attack1`, `hurt` e `die`; `jump` e `fall` aparecem apenas nas prévias individuais e pranchas.
5. **Cadência da prévia agregada:** os GIFs “all-states” usam 12 quadros com atraso uniforme de 8 centésimos, portanto não reproduzem simultaneamente os 5/12/22/12/10 fps escritos nos rótulos. As prévias individuais são a fonte temporal adequada.
6. **Prancha de espelhamento:** nas células ilustradas `attack1-002 (L)`, a cruz vermelha da prancha permanece à direita enquanto o cano aponta à esquerda. Essa sobreposição não representa a transformação real do renderer.

## Origem do tiro e espelhamento

Contrato verificado no código:

| Personagem | Clássico local | Ilustrado local | Âncora lógica |
|---|---:|---:|---:|
| BoyPunk | (43, 48) | (86, 96) | centro +27, Y +16 |
| Nilo | (37, 44) | (74, 88) | centro +21, Y +12 |

Nos quatro quadros `attack1-002`, o pixel da âncora é opaco e pertence à região do cano/flash. O projétil de 8 × 8 nasce centralizado nessa âncora. Aplicando exatamente o redimensionamento e o espelhamento de `renderer.js`, a origem acompanha o cano nos dois sentidos. A evidência independente está em:

`evidencias/muzzle-alignment-runtime-review.png`

Assim, o **asset passa o alinhamento de tiro**; a falha está na sobreposição da prancha entregue, não no cálculo do runtime.

## Mapeamento correto para os caminhos ativos

Este é o mapa obtido de `src/assets.js`, não o mapa do README da entrega:

| Candidato | Destino ativo real |
|---|---|
| `personagens-v2/boypunk/classic/playeranim-{estado}-{NNN}.png` | `assets/images/player-helmet/playeranim-{estado}-{NNN}.png` |
| `personagens-v2/boypunk/illustrated/playeranim-{estado}-{NNN}.png` | `assets/images/characters/boypunk-illustrated/playeranim-{estado}-{NNN}.png` |
| `personagens-v2/boypunk/portraits/player-portrait-000.png` | `assets/images/player-helmet/player-portrait-000.png` |
| `personagens-v2/nilo/classic/nilo-{estado}-{NNN}.png` | `assets/images/characters/nilo/nilo-{estado}-{NNN}.png` |
| `personagens-v2/nilo/illustrated/nilo-{estado}-{NNN}.png` | `assets/images/characters/nilo-illustrated/nilo-{estado}-{NNN}.png` |
| `personagens-v2/nilo/portraits/nilo-portrait-000.png` | `assets/images/characters/nilo/nilo-portrait-000.png` |

Os estados e índices são exatamente os do inventário. Não fazem parte deste lote nem devem ser substituídos por glob:

- projéteis clássico e ilustrado do BoyPunk;
- `nilo-heal-000..003.png`;
- áudio, efeitos ou qualquer outro personagem.

## Prévias revisadas e evidências novas

Foram examinados antes de gerar material adicional:

- 28 GIFs individuais por estado (14 por personagem);
- 2 GIFs e 2 WebPs agregados;
- 2 pranchas de contato;
- 3 cenas por ambiente;
- 1 comparação geral nos três ambientes.

A página `PREVIAS_PERSONAGENS_V2.html` reúne os GIFs individuais existentes, inclusive salto e queda. Foram criadas somente seis pranchas de revisão em `evidencias/`: quatro inventários de quadros, uma comparação dos retratos e uma validação de origem do tiro. Nenhum arquivo da entrega Antigravity foi refeito ou sobrescrito.

Após gerar este relatório, foram reconferidos 507 hashes de `assets/`, `src/`, `tests/`, arquivos de pacote/configuração e da própria entrega `personagens-v2`: todos permaneceram idênticos ao baseline. Os 86 destinos ativos continuam diferentes dos 86 candidatos, confirmando que não houve integração acidental.

Comando para abrir as prévias dos dois personagens:

```bash
xdg-open "/home/flow/Projetos/BoyPunk-Web/art-deliveries/codex/reviews/20261104T182655-0300-personagens-v2-review/PREVIAS_PERSONAGENS_V2.html"
```

## Limitações

- A revisão visual usou os PNGs, GIFs, WebPs, pranchas e composições de cenário da entrega. Como os candidatos não foram integrados, não houve validação em uma sessão real do jogo.
- As cenas entregues são composições estáticas; não comprovam colisão, transição de estado, cache, desempenho ou comportamento prolongado.
- A origem de tiro foi validada matematicamente e numa composição que reproduz as transformações do renderer, não disparando no runtime.
- Não foram executados testes completos do jogo porque nenhum arquivo de runtime, código, teste ou configuração foi alterado.

## Próximo passo recomendado

Solicitar ao Antigravity um `personagens-v2.1` limitado a:

1. elevar a separação de valor/contorno do Nilo em tronco, pernas e carabina nos dois modos, conferindo em 480 × 270 nos três cenários;
2. confirmar ou remover o quadrado isolado de `hurt-001`;
3. confirmar a pausa dupla do `idle` do Nilo;
4. corrigir os destinos documentados e as prévias agregadas/espelhadas;
5. manter nomes, dimensões, pivôs, linhas do chão, contagem de quadros e âncoras já aprovados.

Depois disso, repetir somente a revisão diferencial do Nilo e das prévias corrigidas. A integração continua proibida até nova aprovação explícita.
