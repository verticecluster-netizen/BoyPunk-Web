# Relatório de Otimização — candidato v0.5.1

Base funcional: BoyPunk! Web v0.5.0  
Escopo: Canvas 2D, JavaScript, memória, assets, partículas, colisões e áudio.  
Restrições preservadas: física, colisões, dano, IA, valores de Parallax, arte e assets.

## Resumo executivo

O trabalho remove alocações transitórias dos caminhos mais frequentes do update e do renderer, limita estruturas que antes podiam crescer durante a sessão, reduz trocas de estado do Canvas e garante reutilização de imagens, partículas e vozes de áudio.

As estimativas abaixo são derivadas da contagem de operações removidas e dos limites de estruturas. Não substituem uma captura de Performance/Memory em navegador real:

- cenas com muitos Chasers e projéteis: redução estimada de 15% a 35% no custo de CPU/GC do update;
- passagens de almas e projéteis no Canvas: redução estimada de 5% a 15% no custo do renderer em cenas carregadas;
- preloads repetidos na mesma sessão: eliminação de até 100% das decodificações duplicadas de imagens já carregadas;
- memória transitória: partículas de pouso limitadas a 200, textos de combate limitados a 30 e vozes HTMLAudio limitadas a 4 por SFX.

Os ganhos reais dependem do navegador, GPU, `renderScale`, número de entidades e frequência de efeitos.

## 1. `src/core.js` — Garbage Collection e update

- Snapshots `previous` de jogadores e inimigos passaram a reutilizar o mesmo objeto em vez de criar um objeto por entidade a cada tick.
- A hitbox de ataque corpo a corpo agora é um scratch object persistente do modelo.
- A limpeza de inimigos, projéteis, almas, power-ups, efeitos e visuais de derrota passou de `Array.filter()` para compactação in-place, preservando ordem.
- Contagens de projéteis ativos usam loops diretos, sem arrays intermediários.
- Trilhas de projéteis são compactadas in-place e reutilizam pontos expirados ou excedentes.
- O update de projéteis não cria mais arrays de alvos, colisões ou callbacks de ordenação por projétil. O impacto mínimo é selecionado durante a própria varredura, preservando prioridade de parede e ordem estável dos alvos.

Estimativa estrutural: cinco novos arrays por tick foram removidos da limpeza geral. Em cada projétil ativo também foram removidos `filter`, `slice`, lista de alvos, lista de colisões e `sort`.

## 2. `src/core.js` — distância e State Machine do Chaser

- A seleção do jogador vivo mais próximo passou de criação de lista + cópia + `sort()` + `Math.hypot()` para uma passagem linear com distância ao quadrado.
- A histerese de detecção compara `dx * dx + dy * dy` com os limiares ao quadrado.
- `Math.sqrt()` é executado somente quando há transição de estado e a distância precisa integrar o evento de diagnóstico.
- A checagem de existência de jogador vivo passou a ser feita sem criar arrays.

Com um jogador, cada Chaser deixa de criar a lista de candidatos e objetos de centro a cada frame. Em coop, o custo muda de ordenação `O(P log P)` para busca linear `O(P)`.

## 3. `src/renderer.js` — Garbage Collection, caches e memória

- Estados usados em `render()` e animações foram promovidos a `Set` constantes.
- Definições estáticas de lasers, poças, pistões e cores foram promovidas para constantes de módulo.
- O cálculo da referência do Parallax usa loop direto, sem `filter()` ou `reduce()`.
- As três imagens do Parallax são resolvidas uma vez e mantidas em cache pelo renderer.
- Resoluções de sprites por escala/prefixo/estado/frame são memoizadas; o cache é invalidado quando `renderScale` muda.
- Objetos de amostragem de animação só são construídos quando debug/instrumentação está ativo.
- `setRenderScale()` evita redimensionar o backing buffer quando a escala não mudou.
- `playerMotionHistory` é limpo na troca de `runId`, impedindo retenção de IDs de partidas anteriores.
- Filtros temporários dos indicadores de HUD foram substituídos por seleção direta por proprietário.

## 4. `src/renderer.js` — Canvas State e partículas

- Almas compartilham um único `save()`/`restore()` por passagem, em vez de um par por alma.
- Projéteis compartilham um único escopo de estado; composição aditiva e `shadowBlur` são resetados explicitamente.
- O fim de cada frame normaliza `globalAlpha`, `globalCompositeOperation`, `shadowBlur` e `filter`.
- Poeira de pouso é atualizada/desenhada uma única vez por frame, inclusive no coop.
- Partículas de pouso usam pool e limite máximo de 200 objetos.
- Textos flutuantes usam pool e limite máximo de 30 objetos.

Estimativa estrutural: para `N` almas, os pares de estado caem de `N` para 1. Para `N` projéteis, são removidos até dois pares de estado por projétil, mantendo um único par para a passagem inteira.

## 5. `src/assets.js` — imagens e Parallax

- O cache de drawables decodificados passou a durar toda a sessão e é isolado por função loader.
- URLs repetidas ou novos pedidos de boot reutilizam o mesmo `ImageBitmap`/canvas decodificado.
- Falhas não são armazenadas no cache, permitindo nova tentativa válida.
- `Image`, `ImageBitmap` e canvas de fallback continuam sendo criados apenas no preloader, nunca no loop de renderização ou em transições de gameplay.
- Parallax e sprites continuam referenciados pelo `Map` de imagens e pelo renderer, sem recarga por estado.

## 6. `src/audio.js` — Web Audio e SFX

- O `AudioContext`, barramento de efeitos, música procedural e buffer de ruído continuam memoizados.
- O buffer de ruído da arma é preparado uma única vez após o desbloqueio do contexto.
- A música procedural continua protegida por `bufferPromise`, evitando renderizações offline duplicadas.
- Música em arquivo continua armazenada em `music: Map`.
- SFX em HTMLAudio passaram a usar pools por nome, com até quatro vozes reutilizáveis por som; não é mais criado um novo elemento para cada reprodução.
- `AudioBufferSourceNode` e osciladores continuam efêmeros porque a Web Audio API não permite reiniciar esses nós depois de usados; seus buffers permanecem reutilizados.

## Validação

- Testes foram executados após cada etapa de alteração.
- `npm run check`: aprovado, sem erros.
- `npm test`: 36/36 arquivos aprovados, sem falhas.
- `node --test --test-isolation=none tests/*.test.mjs`: 348/348 testes aprovados, sem falhas, cancelamentos ou skips.
- O runner padrão desta versão do Node resume por arquivo; por isso a execução sem isolamento foi usada para confirmar a contagem detalhada.

