# Continuidade — Mecânicas avançadas

## Recuperação do estado real — 2026-11-04

- Raiz verificada: `/home/flow/Projetos/BoyPunk-Web`.
- Fonte modular atual: `0.4.2` (`package.json`, `src/version.js` e relatório de estado de 2026-11-04).
- O diretório `.git/` está montado vazio; branch, commit e diferenças contra o índice não são verificáveis. Nenhuma limpeza, reset, checkout ou stash foi executado.
- Não há `AGENTS.md` aplicável. `.agents/` e `.codex/` estão vazios.
- Não foi encontrada implementação anterior destas etapas nem um documento de continuidade específico desta tarefa.
- Personagens BoyPunk/Nilo, sprites ilustrados, animações do Chaser, câmera/render atual, dano, projéteis, câmera fixa e três ambientações foram inspecionados no código presente.
- Contrato anterior: qualquer acerto do jogador chamava `killEnemy` diretamente; o Chaser não tinha HP nem feedback próprio de dano. Projéteis do jogador não declaravam dano explícito.
- Linha de base: `npm run check` aprovado; `npm test` aprovado em 28 arquivos. Há 283 declarações `test(...)` nos fontes; a saída padrão do Node agrega cada arquivo como um subteste, portanto 28 não é a quantidade de casos nomeados.
- Falhas preexistentes: nenhuma nos checks executados. O travamento anterior não foi reproduzido e sua causa permanece não comprovada; não há evidência suficiente para atribuí-lo a OOM.

## Checkpoint pré-edição

- Arquivo: `evidencias/recovery/mecanicas-avancadas-pre-edicao-20261104/checkpoint.tar.gz`.
- SHA-256: `a1b160e168b104f0b49fbbec2e143d55382485b0d0c70a1d891a2979c99a5b5f`.
- Manifesto por arquivo: `evidencias/recovery/mecanicas-avancadas-pre-edicao-20261104/MANIFESTO.sha256`.
- O arquivo contém somente código, testes e `package.json` previstos para alteração; nenhum asset ativo foi copiado ou modificado.

## Estado das etapas

### Etapa 1 — HP e feedback do Chaser

- Estado: concluída e validada por testes automatizados.
- Implementado:
  - Chaser nasce com `maxHp = 3` e `hp = 3`; nenhum outro arquétipo recebeu HP.
  - Bola de Pulso e melee carregam dano autoritativo unitário; `damageEnemy` respeita valores maiores que 1.
  - Projétil continua consumido pela colisão existente. Duas balas distintas causam dois danos; colisão já consumida não repete dano.
  - Chaser só chama a derrota quando `hp <= 0`; guarda de `removed` mantém morte, ponto, drop e evento únicos.
  - `hurtFlash` explícito dura 0,14 s de simulação, não concede invulnerabilidade e é desenhado como contorno vermelho discreto com `save/restore`.
  - A guarda de melee agora usa o ID do ataque aceito, permitindo novos golpes em ataques posteriores sem repetir dano a cada tick da mesma janela.
  - Tiro Rápido e Rajada Dupla continuam independentes. O teste de rajada agora confirma dois danos no mesmo Chaser vivo, sem atravessá-lo.
  - A demo preserva dano e cooldown reais; seu controlador só solicita novo tiro após o cooldown autoritativo e usa alcance autônomo de 180 px. O teste recebeu 19 s, em vez de 18 s, para concluir o mesmo ciclo diante dos novos HP.
- Arquivos alterados nesta etapa: `src/config.js`, `src/core.js`, `src/renderer.js`, `src/main.js`, `src/demo.js`, `tests/core.test.mjs`, `tests/powerups.test.mjs`, `tests/demo.test.mjs` e novo `tests/chaser.test.mjs`.
- Checkpoints suplementares de arquivos descobertos durante a regressão da demo:
  - `checkpoint-demo-original.tar.gz` (`bd645324f69d5373b1cfefc99974871084b28ee7038cd68067fcb8024f22c747`);
  - `checkpoint-demo-test-original.tar.gz` (`312ad79d5d58e1142ec241ccf218c4c0e9d44455d9937f18dddace7cdb93463a`).
- Testes executados:
  - `node --test tests/chaser.test.mjs`: aprovado;
  - testes isolados de `core` e `demo`: aprovados após correções localizadas;
  - `npm run check`: aprovado;
  - `npm test`: 29/29 arquivos aprovados, zero falhas;
  - contagem fonte atual: 291 declarações `test(...)` (283 anteriores + 8 novas).
- Pendências da etapa: validação em navegador fica para a validação final integrada.
- Próximo passo exato: inspecionar alvo, geometria e movimento atuais; implementar a máquina `patrol/chase` do Chaser com histerese 150/180 e testes dedicados, sem iniciar a Etapa 3.

### Etapa 2 — patrol/chase

- Estado: concluída e validada por testes automatizados.
- Implementado:
  - constantes de estado `patrol` e `chase` e um campo `aiState` por instância;
  - entrada em chase a `<= 150` px lógicos e retorno a patrol a `>= 180` px, com tolerância numérica de `EPSILON`; entre esses valores o estado é preservado;
  - patrulha a 60% de 52 px/s (`31,2 px/s`) e chase no máximo anterior de `52 px/s` em campanha;
  - suavização pela aceleração existente, agora nomeada `420 px/s²`, multiplicada pelo `dt` de simulação;
  - área horizontal de até ±56 px do spawn, reduzida por sondas dos dois pés sobre a geometria real e com margem de frenagem de 2 px;
  - reversão em borda/limite e, em bloqueio sólido durante patrol, cooldown de direção de 0,18 s; chase preserva o salto atual sobre obstáculo e quando o alvo está acima;
  - nenhuma posição é interpolada ou teleportada: todo deslocamento continua passando por `moveBody`, gravidade e colisões existentes;
  - sem alvo vivo, chase termina e patrol continua. No coop, `selectLivingPlayer` já escolhia o vivo mais próximo por distância e desempate de ID; essa política foi preservada e coberta;
  - a prioridade anterior do altar foi preservada: movimento continua orientado ao jogador vivo, enquanto dano ao altar ocorre somente por sobreposição física, sem nova prioridade ou pathfinding;
  - `meleeAttackId` foi adicionado às instâncias coop para impedir repetição do mesmo contato durante a janela de um único ataque.
- Arquivos alterados nesta etapa: `src/config.js`, `src/core.js`, `src/coop.js`, `tests/chaser.test.mjs`, `tests/demo.test.mjs` e este documento.
- Checkpoint pós-Etapa 1: `evidencias/recovery/mecanicas-avancadas-etapa2-20261104/checkpoint-pos-etapa1.tar.gz`, SHA-256 `f5e38843431c90b5074518accca5353178a7c8bca2df02f6d89958dd997d9f26`.
- Checkpoint suplementar de coop: `checkpoint-coop-pos-etapa1.tar.gz`, SHA-256 `72fbf8d695ca0fa9cbea449cab14241e0daca167f4f799b604b2bc12d9ddb410`.
- Testes executados:
  - `tests/chaser.test.mjs` isolado: aprovado (14 casos nomeados no arquivo);
  - `tests/demo.test.mjs` isolado: aprovado; a janela determinística passou de 19 s para 22 s porque inimigos fora de 150 px agora patrulham em vez de atravessar todo o mapa;
  - `npm run check`: aprovado;
  - `npm test`: 29/29 arquivos, zero falhas;
  - contagem fonte atual: 297 declarações `test(...)`.
- Pendências da etapa: observação visual e controles reais ficam para a validação final integrada.
- Próximo passo exato: confirmar definitivamente câmera/transformação/assets do Distrito Neon e decidir entre parallax, atmosfera discreta ou handoff de arte antes de editar a Etapa 3.

### Etapa 3 — profundidade visual do Distrito Neon

- Estado: camadas atmosféricas implementadas e validadas por testes automatizados; parallax real não implementado por ausência de câmera móvel e arte separada.
- Diagnóstico:
  - viewport e mundo lógico são fixos em `480 × 270`;
  - não existe `camera.x/y`, scroll ou transformação de câmera; somente screen shake temporário;
  - `distrito-neon.png` é uma composição RGB achatada de `1672 × 941`.
- Implementado:
  - o background principal permanece inalterado;
  - três planos discretos de névoa ciano/violeta são desenhados somente no tema `neon-district`, atrás de plataformas, entidades, tiros e HUD;
  - cada plano usa quatro bancos calculados, sem criar canvas, imagem, gradiente ou array no loop;
  - `save/restore` isola alpha, filtro e composição;
  - névoa, chuva e scanners do Distrito recebem `model.elapsed` durante uma partida e congelam na pausa;
  - `reducedMotion` mantém a névoa estática;
  - Fábrica de Sucata e Câmara de Energia não entram no novo passe.
- Handoff para arte/câmera futuras: `docs/art/PARALLAX_DISTRITO_NEON_HANDOFF.md`.
- Arquivos alterados nesta etapa: `src/renderer.js`, `tests/renderer.test.mjs`, `tests/visual-effects.test.mjs`, novo handoff e este documento.
- Checkpoint pós-Etapa 2: `evidencias/recovery/mecanicas-avancadas-etapa3-20261104/checkpoint-pos-etapa2.tar.gz`, SHA-256 `22985c26e8f0129a57a9ef1f1f17caeff4a9134d90bb0f60c51693be70525a15`.
- Testes executados:
  - `tests/visual-effects.test.mjs` isolado: aprovado;
  - `tests/renderer.test.mjs` isolado: aprovado;
  - `npm run check`: aprovado;
  - `npm test`: 29/29 arquivos, zero falhas;
  - contagem fonte final: 298 declarações `test(...)`.
- Pendência: parallax de câmera real depende de câmera móvel e das três camadas de arte descritas no handoff.

## Validação final integrada

- `npm run check`: aprovado após os últimos ajustes de preservação.
- `npm test`: 29/29 arquivos aprovados, zero falhas; 298 casos nomeados no fonte.
- Tentativa Chrome CDP: indisponível no sandbox (`DevToolsActivePort` não foi criado).
- Tentativa Firefox headless com perfil isolado: produziu `evidencias/mecanicas-avancadas-final/firefox-distrito.png` (1280 × 720), mas a captura ocorreu no boot, antes do carregador assíncrono sair de 0%. Ela comprova somente carregamento HTTP inicial, não gameplay.
- A captura mostrou fallback em memória de `localStorage` no Firefox restrito. Não houve evidência de asset ausente ou exceção de gameplay porque a partida não chegou a ser observada.
- Perfis temporários e processos de navegador/servidor iniciados pela tarefa foram removidos/encerrados; `./iniciar-jogo.sh --status` informa que o jogo não está ativo.
- Validação manual pendente: BoyPunk/Nilo em jogo, controles, pausa, HP/transições do Chaser, derrota/retry/altar, power-ups e inspeção das três ambientações. Não foram testados Windows, celular, joystick físico nem offline.
- Próximo passo exato: abrir `http://127.0.0.1:47831/` via `npm run dev`, executar o roteiro manual acima e observar alguns minutos de gameplay; não repetir a implementação nem os checkpoints.

## Retomada da integração do parallax decorativo — 2026-11-05

### Estado recuperado

- A execução interrompida já havia integrado o conjunto aprovado de três camadas em `src/assets.js` e `src/renderer.js`, copiado os três PNGs para `assets/images/world/distrito-neon-parallax/` e criado `tests/district-parallax.test.mjs`.
- Os três PNGs ativos medem `1672 × 941` e seus SHA-256 correspondem exatamente ao `delivery-manifest.json`. O conjunto granular alternativo de quatro camadas não foi registrado nem copiado para o manifesto ativo.
- `docs/checkpoints/parallax-distrito-neon-2026-11-04-v1/` preserva o estado anterior à integração.
- Novo checkpoint do estado interrompido, anterior às correções desta retomada: `docs/checkpoints/parallax-distrito-neon-2026-11-05-v2-pre-correcao/`, com hashes em `MANIFESTO.sha256`. Ele é deliberadamente distinto do backup `v1`.

### Falhas reproduzidas e causa confirmada

- `1672 !== 940.5`: o mock registra `drawImage` como `["drawImage", image, sx, sy, sw, sh, dx, dy, dw, dh]`; a asserção lia o índice de `sw` como se fosse `sh`. A implementação já calculava o cover central correto (`sx=0`, `sy=0,25`, `sw=1672`, `sh=940,5`). O teste agora nomeia e verifica separadamente `sw`, `sh` e `sy`.
- `Cannot read properties of undefined (reading 'disabled')`: o objeto indefinido era `renderer.districtParallax`. Um teste legado construía o renderer com `Object.create(Renderer.prototype)`, pulando o construtor que inicializa esse estado obrigatório. O teste agora usa `new Renderer(...)`; nenhum guard foi adicionado ao código de produção.

### Estado salvo antes das validações longas

- Testes direcionados aprovados: `district-parallax` (7), `renderer` (14), `bonus-chamber-renderer` (4) e `levels` (10): **35 aprovados, 0 falhos, 0 ignorados**.
- Cobertura adicional confirma que os recortes dos extremos permanecem dentro das fontes e que somente o conjunto de três camadas está no manifesto.
- Próximo passo exato: executar `npm run check`, depois `npm test`, e por fim uma única sessão curta de navegador para escalas 1 e 2, extremos, pausa/retry, movimento reduzido, preservação das outras fases, console e assets. Encerrar somente o servidor e navegador temporários iniciados nesta retomada.

### Resultado final da retomada

- `npm run check`: aprovado.
- `npm test`: 30 arquivos/subtestes aprovados, 0 falhos, 0 cancelados e 0 ignorados; 305 declarações `test(...)` nos fontes.
- A validação visual não pôde ser concluída: bind do servidor recusado com `EPERM`, Chrome bloqueado no socket do Crashpad e Firefox/Snap bloqueado pela ausência de AppArmor. Não foi produzida evidência visual válida.
- Nenhum servidor/navegador permaneceu ativo e os artefatos temporários das tentativas foram removidos.
- Relatório completo: `docs/art/RELATORIO_INTEGRACAO_PARALLAX_DISTRITO_NEON.md`.
- Status real: **implementado com validação visual pendente**.
- Próximo passo exato: em um ambiente com navegador funcional, executar `npm run dev`, abrir `http://127.0.0.1:47831/` e cumprir o roteiro visual registrado no relatório; não refazer a integração nem alterar os contratos já validados.

## Lote HUD compacta e navegação — 2026-11-05

### Estado recuperado e checkpoint

- Nenhum `AGENTS.md` aplicável; `.git/` continua vazio e nenhum comando de reset/clean/restauração global foi usado.
- Linha de base deste lote: `npm run check` aprovado; `npm test` com 30/30 arquivos aprovados, zero falhas/ignorados.
- Checkpoint pré-edição legível: `docs/checkpoints/hud-navegacao-2026-11-05-pre-edicao-v1/`, com `MANIFESTO.sha256`. É distinto dos backups originais e checkpoints do parallax.
- O lote não tocou em assets, releases, geometria, física, IA/HP, dano/cadência, saves ou progressão.

### Implementação concluída

- HUD: TR, RD, escudo e cura agora ficam na terceira linha do painel superior, dentro de `y≤45`, com abreviações textuais, tempo/carga real e owner por painel no coop.
- Avisos de pickup usam o slot único já existente por 1,0 s; controles iniciais saíram da faixa inferior e permanecem acessíveis na pausa.
- Navegação: removido o atalho global divergente de Enter; mouse, teclado e gamepad convergem no clique canônico com estados permitidos, foco padrão e trava até keyup.
- Campos interativos preservam suas próprias teclas; setas/Enter funcionam sem clique prévio no canvas.
- O preview coop recebeu navegação de UI pelos pads atribuídos, sem alterar suas regras de gameplay.
- Testes novos/atualizados cobrem confirmação única, ausência de resíduo, equivalência de fontes, HUD com quatro efeitos/dois jogadores e expiração sem mutar gameplay.

### Validação e pendência

- Direcionados finais: 8/8 arquivos aprovados.
- `npm run check`: aprovado.
- `npm test`: 31/31 arquivos aprovados, 0 falhos, 0 cancelados, 0 ignorados; o executor agrega arquivos como subtestes de nível superior.
- Chrome falhou antes do CDP (`Operation not permitted`, sem `DevToolsActivePort`). Firefox/Snap recusou iniciar sem AppArmor. Nenhuma segurança foi desativada e não há evidência visual válida deste lote.
- O launcher chegou a informar reutilização do servidor em `http://127.0.0.1:47831/`, mas a verificação final `./iniciar-jogo.sh --status` informou inativo. Não assumir servidor ativo na retomada.

### Continuação exata

1. Executar o roteiro manual de `docs/RELATORIO_HUD_NAVEGACAO.md` para Distrito/Fábrica em 1×/2×, pausa, retry, vitória, bônus, movimento reduzido e controles reais.
2. Não reabrir HUD/parallax sem regressão observada.
3. Próximo lote de código: somente coleta atômica e respawn dos três pickups flutuantes no preview coop, seguindo `docs/PLANO_COOP_POWERUPS.md`; não respawnar almas/objetivos/progressão nem adicionar revive/online.

## Lote Sobrevivência + sons por personagem — 2026-11-05

### Etapa A salva

- Linha de base: `npm run check` e 31/31 arquivos aprovados.
- O escopo planejado foi atualizado pela implementação real: Sobrevivência contém quatro pickups (inclui RD), não três; campanha e preview coop de campanha continuam preservados.
- Solo respeita personagem selecionado. Coop local de Sobrevivência está acessível no menu via `?coop-survival=1`, com P1 BoyPunk/P2 Nilo e os layouts já existentes.
- Coleta é atômica e individual; empate alterna preferência por spawn; vida cheia/escudo cheio preservam pickup.
- Respawns por simulação: Cura 18 s, TR 22 s, Escudo 24 s, RD 30 s. Pausa congela; retry/mudança limpam estado.
- Barreira da Etapa A: direcionados 55/55 casos internos; `npm run check` aprovado; `npm test` 32/32 arquivos, zero falhas/ignorados.
- Checkpoint de retomada antes do áudio: `docs/checkpoints/survival-powerups-audio-2026-11-05-v2-pos-etapa-a-pre-audio/` com manifesto.

### Etapa B implementada

- `playerShotEmitted` identifica source/character/rajada e é o único gatilho dos novos sons de jogador.
- BoyPunk usa plasma curto/agudo; Nilo usa energia grave/encorpada. Política: uma voz por projétil confirmado, inclusive os dois projéteis de RD.
- Barramento de efeitos respeita volume/mute; ruído é reutilizado e determinístico; máximo de oito vozes; fallback antigo preservado.
- Direcionados de áudio/gameplay: 48/48 casos internos aprovados.
- A primeira suíte integral expôs uma expectativa legada do aviso do altar: ela lia somente o envelope, mas o mixer novo separa ganho global e envelope. O teste agora verifica o produto efetivo, preservando 0,0275; não houve alteração sonora para satisfazer o teste.
- Validação final: `npm run check` aprovado; `npm test` 33/33 arquivos, 0 falhos, 0 cancelados e 0 ignorados.
- Execução final sem isolamento: 322/322 casos internos aprovados, 0 falhos, 0 cancelados e 0 ignorados.
- Estado final preservado em `docs/checkpoints/survival-powerups-audio-2026-11-05-v3-final-validado/`, com manifesto SHA-256.
- Relatórios finais com a contagem comprovada preservados em `v4-final-relatado/`; checkpoints anteriores não foram sobrescritos.

### Próximo passo exato

1. Em ambiente com bind/navegador permitidos, cumprir os roteiros dos dois relatórios: intervalos/owner/HUD em solo e coop, depois escuta BoyPunk/Nilo/TR/RD e inspeção do console.
2. Playtestar os intervalos 18/22/24/30 s antes de qualquer rebalanceamento.
3. Não reabrir parallax, arte, física, IA, saves, campanha ou bônus sem regressão observada; não implementar online.

O bind atual falhou com `listen EPERM` e nenhum servidor ficou ativo. Não usar flags inseguras nem assumir validação visual/auditiva.
