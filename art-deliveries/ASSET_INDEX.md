# Índice de assets e entregas de arte

**Inventário:** 2026-11-04  
**Raiz:** `/home/flow/Projetos/BoyPunk-Web`  
**Fonte:** `0.4.2`

## 1. Assets ativos

### Ambientes

| Ambiente | Papel | Chave do manifesto | Caminho ativo | Estado |
|---|---|---|---|---|
| Distrito Neon | campanha 1 | `world.background` / `world.tiles` | `assets/images/world/distrito-neon.png` / `platformtiles.png` | integrado de `refino-fases-v1` |
| Fábrica de Sucata | campanha 2 | `world.background.factory` / `world.tiles.factory` | `assets/images/world/fabrica-sucata.png` / `factory-platformtiles.png` | integrado de `refino-fases-v1` |
| Câmara de Energia | ambiente bônus | `world.background.bonus` / `world.tiles.bonus` | `assets/images/world/camara-energia.png` / `energy-platformtiles.png` | integrado de `refino-fases-v1` |
| Cyber Lab | arte opcional sem nível | `world.background.cyberlab` / `world.tiles.cyberlab` | `assets/images/world/cyber-lab.png` / `cyber-lab-platformtiles.png` | registrado e pré-carregado; ativação pendente |

Cyber Lab não está em `LEVEL_CATALOG`, não tem geometria, progressão nem seleção em `src/renderer.js`. O fato de seus arquivos estarem em `assets/` e no manifesto não o transforma em uma quarta fase.

Demais conjuntos ativos do mundo ficam em `assets/images/world/`: altar base, variantes de altar do Distrito/Fábrica, almas de campanha, almas bônus, almas Cyber, Rajada Dupla e textura legada. `assets/images/world-original/` é acervo histórico, não o caminho principal do manifesto.

### Personagens

| Personagem | ID técnico | Clássico ativo | Ilustrado ativo | Retrato / VFX |
|---|---|---|---|---|
| BoyPunk (P1) | `boypunk`, namespace `player.*` | `assets/images/player-helmet/` | `assets/images/characters/boypunk-illustrated/` | retrato e bala clássica em `player-helmet/`; bala ilustrada em `boypunk-illustrated/` |
| Nilo (P2) | `support`, namespace `nilo.*` | `assets/images/characters/nilo/` | `assets/images/characters/nilo-illustrated/` | retrato e quatro frames do VFX `heal` em `characters/nilo/` |

`assets/images/player/` e `assets/images/player-original/` são conjuntos legados preservados; o manifesto atual aponta BoyPunk clássico para `player-helmet/`. Nilo cai para `player.*` somente se um frame `nilo.*` estiver indisponível. Em escala maior que 1, o renderer tenta primeiro os namespaces `*.illustrated.*` e depois o clássico.

### Outros assets

- Inimigos ativos: `assets/images/enemies/`; variantes ilustradas em `assets/images/enemies/chaser-illustrated/` e `assets/images/enemies/patrol-shooter-illustrated/`.
- Áudio: `assets/audio/`.
- Fontes: `assets/fonts/`.
- Nenhum desses caminhos foi alterado por esta organização.

## 2. Manifesto e empacotamento

`src/assets.js` é a lista autoritativa de recursos carregados. Os mapeamentos relevantes são:

- BoyPunk: `player.<state>.<frame>` → `assets/images/player-helmet/playeranim-<state>-NNN.png`.
- BoyPunk ilustrado: `player.illustrated.<state>.<frame>` → `assets/images/characters/boypunk-illustrated/playeranim-<state>-NNN.png`.
- Nilo: `nilo.<state>.<frame>` → `assets/images/characters/nilo/nilo-<state>-NNN.png`.
- Nilo ilustrado: `nilo.illustrated.<state>.<frame>` → `assets/images/characters/nilo-illustrated/nilo-<state>-NNN.png`.
- Retratos: `player.portrait.0` e `nilo.portrait.0`.
- Ambientes: as oito chaves de background/tiles da tabela anterior.

`tools/build-portable.mjs` incorpora as URLs do `ASSET_MANIFEST` e caminhos de assets encontrados em HTML/CSS. `tools/build-release.mjs` copia recursivamente `assets`, `src`, `tools`, `tests`, `packaging` e `docs`, além dos arquivos principais. `art-deliveries/` não entra no release por esse script. Nenhum pacote foi regenerado nesta organização.

## 3. Índice de entregas

| Localização | Responsável | Conteúdo | Estado real | Relatório | Backup |
|---|---|---|---|---|---|
| `antigravity/refino-fases-v1/` | Antigravity | 3 backgrounds, 3 tilesets, 21 previews e manifesto | **integrado**; o manifesto original ainda diz `staged-for-review`, superado pelo relatório Codex | `codex/integrations/20261104T161846-0300-refino-fases-v1/RELATORIO_INTEGRACAO.md` | `codex/backups/20261104T161846-0300-refino-fases-v1/` |
| `antigravity/personagens-v1/boypunk/classic/` | Antigravity | 4 `idle` + 4 `walk`, 64×96 RGBA | candidato tecnicamente compatível e revisado estaticamente; **não integrado** | ausente | ausente |
| `codex/integrations/20261104T161846-0300-refino-fases-v1/` | Codex | relatório, hashes e capturas das três ambientações | concluído e verificado no navegador | no próprio diretório | aponta para o backup homônimo |
| `codex/backups/20261104T161846-0300-refino-fases-v1/` | Codex | seis assets anteriores de cenário | backup verificado | `backup-metadata.json` | é o próprio backup |
| `assets/images/world/cyber-lab*.png` + `docs/art/CYBER_LAB_ART_HANDOFF.md` + `evidencias/art/cyber-lab/` | pacote histórico, atribuição registrada no handoff | background, tileset e seis previews | arte registrada/revisada; ativação de runtime **pendente** | `docs/art/CYBER_LAB_ART_HANDOFF.md` | checkpoints históricos em `evidencias/recovery/`; sem backup dedicado em `art-deliveries/codex/backups/` |
| entrega `nilo-idle-v*` | — | — | **não localizada** | — | — |

Os tilesets preservados em `refino-fases-v1/documentation/pass1-candidates-preserved/` são duplicatas byte a byte dos tilesets finais e ativos. Os três backgrounds da primeira passagem têm hashes diferentes dos finais. Essa distinção foi feita por conteúdo, não pelo nome.

## 4. Classificação do acervo

### Referências e fontes geradas

- `references/characters/boypunk/boypunk-visual-board-v1.jpeg`: direção de armadura clara, metal escuro, ciano e laranja; contém poses/ações não suportadas e não é sprite sheet pronta.
- `references/characters/boypunk/boypunk-idle-source-v1.png`: quatro poses grandes de idle em uma única imagem-fonte; requer extração e adaptação.
- `references/characters/nilo/nilo-visual-board-v1.jpeg`: direção grafite, verde e violeta, arma distinta e rosto negro parcialmente exposto; não é sprite sheet pronta.
- `references/characters/nilo/nilo-idle-source-v1.png`: quatro poses grandes de Nilo; requer extração, limpeza e adaptação.
- `references/environments/`: 17 conceitos/pranchas de ambientes e uma composição de gameplay do Distrito Neon.
- O raw `bg_distrito_neon_candidate_raw_1793815853722.jpg` citado no manifesto de `refino-fases-v1` não foi localizado no projeto.

As pranchas podem orientar silhueta, material e paleta, mas ações “correr” e “agachar” nelas não fazem parte do contrato atual.

### Candidatos preparados para runtime

- `antigravity/refino-fases-v1/world/`: seis candidatos agora integrados; mantidos como entrega imutável.
- `antigravity/refino-fases-v1/documentation/pass1-candidates-preserved/`: primeiras passagens preservadas; não usar como seleção silenciosa.
- `antigravity/personagens-v1/boypunk/classic/`: oito candidatos pendentes. Todos têm 64×96 RGBA, região inferior transparente e corpo compatível com o pivô X=16/linha de chão Y=64. Nenhum hash coincide com os oito frames ativos correspondentes.

### Prévias

- Estáticas da entrega integrada: `antigravity/refino-fases-v1/previews/`.
- Estáticas de integração: `codex/integrations/20261104T161846-0300-refino-fases-v1/evidencias/`.
- Estáticas de Cyber Lab: `evidencias/art/cyber-lab/`.
- Animações ativas de Nilo: `evidencias/art/nilo/*.gif` e `*.webp`.
- Outras animações técnicas existentes: `evidencias/art/` para chaser, canhão, power-up e derrota do player.
- `personagens-v1` não possui preview animado próprio; continuidade de `idle`/`walk` continua pendente.

### Backups

- Backup rastreável desta integração de ambientes: `codex/backups/20261104T161846-0300-refino-fases-v1/`.
- Checkpoints históricos existem em `evidencias/recovery/`, mas não substituem o backup dedicado de uma futura integração de personagens.

## 5. Cópias realizadas nesta organização

Todos os destinos abaixo foram criados por cópia, com o original preservado. O registro completo, com SHA-256 e motivo individual, está em `ORGANIZACAO_MANIFESTO.json`.

### BoyPunk

| Origem | Destino | SHA-256 |
|---|---|---|
| `Boypunkplayer1.jpeg` | `references/characters/boypunk/boypunk-visual-board-v1.jpeg` | `85c899a852577ac7db5640df12e4b611687eb8b3c07df6c953d6ad18859a99b8` |
| `references/personagens/boypunk-reference-v1.jpeg.png` | `references/characters/boypunk/boypunk-idle-source-v1.png` | `4e2392c7d9a2c6dae3d597a3d5df1188ae400be71d31d6710d0700b312d3a217` |

### Nilo

| Origem | Destino | SHA-256 |
|---|---|---|
| `Boypunkplayer2.jpeg` | `references/characters/nilo/nilo-visual-board-v1.jpeg` | `425353089c3353e3434f84bf37f9c42ddf5358b63ed1c9a13abe68929d8f7ab2` |
| arquivo legado cujo nome contém `nilo-idle-source-v1.png`, duas quebras de linha e `4..png` | `references/characters/nilo/nilo-idle-source-v1.png` | `32d6007300211146fe10758769fa9046d46271621e9fcfb60b54fb2dc80e884b` |

### Ambientes

| Origem resumida | Destino | SHA-256 |
|---|---|---|
| `docs/art/references/boypunk-neon-reference.png` | `references/environments/boypunk-neon-gameplay-reference-v1.png` | `7730bef1c4edacff84fd42331fd0014a1deb94aeb5c6c7588ef5802cf28a0e4b` |
| `WhatsApp … 20.27.00.jpeg` | `references/environments/environment-overview-cyberpunk-pack-v1.jpeg` | `013ef11fdd4ba30282c350cdc11b21ff20f8293ee3e9dbd6fbdae3d081808c62` |
| `WhatsApp … 20.27.00 (1).jpeg` | `references/environments/cyber-lab-ai-core-v1.jpeg` | `53032288783cc854be22d9352208d9c8e707c85bd900fd2ae7bc307ddadda13e` |
| `WhatsApp … 20.27.00 (2).jpeg` | `references/environments/cyber-lab-server-room-v1.jpeg` | `f081fdeb36071a69013edc07e382aa7ac65016a3a5d6a72edfba6085b92f7211` |
| `WhatsApp … 20.27.00 (3).jpeg` | `references/environments/cyber-lab-robotics-workshop-v1.jpeg` | `2d5b574b0987402667a8d20064873b8be9f95be41c6c566fd57f2f1581b3f3a8` |
| `WhatsApp … 20.27.00 (4).jpeg` | `references/environments/neon-industrial-city-v1.jpeg` | `0e576800ea439f3091b903ef7b48ac47ee18a5cbcc29018f6f9b3d03eb0d9c31` |
| `WhatsApp … 20.27.00 (5).jpeg` | `references/environments/cyber-lab-security-core-v1.jpeg` | `13261300d4e1b3cc1156fede40368b4fdf9311b018bb5d2d29aebd7911b6f5e7` |
| `WhatsApp … 20.27.01.jpeg` | `references/environments/energy-core-facility-v1.jpeg` | `98fc84fa4f2f9d8c7784f94fc377d9aa90bbde27341ebc6912257e071b1c887d` |
| `WhatsApp … 20.27.01 (1).jpeg` | `references/environments/orbital-observatory-v1.jpeg` | `75e4b35d4f7c6594ddf14a92d9c4f2e231e91b302b280bbef728162eec5ec5f9` |
| `WhatsApp … 20.27.01 (2).jpeg` | `references/environments/planetary-outpost-v1.jpeg` | `30869a7ad2df12748863e7dc81889aaa44a5fe761c0adbbfdd52762002fe7fa0` |
| `WhatsApp … 20.27.01 (3).jpeg` | `references/environments/corporate-neon-tower-v1.jpeg` | `f59c13d1c83c601ed0b7ac29b8f2bef1b124c2e7d0779db8c128658e0ce1a9b2` |
| `WhatsApp … 20.27.01 (4).jpeg` | `references/environments/virtual-test-zone-v1.jpeg` | `585afcece8662d3e9f9e1389d84b40b63cc7bcd469870ffa7d125571623d3913` |
| `WhatsApp … 20.27.02.jpeg` | `references/environments/neon-city-platforms-v1.jpeg` | `0254b5769e728f93bcd3fabd549a07390a4629f97e4ff25f4b4c7c2be3d5c4f7` |
| `WhatsApp … 20.27.02 (1).jpeg` | `references/environments/orbital-lab-v1.jpeg` | `b2283ba3598407b01b6139698497df0c30514989fbee712c657a1ac1cb9a0c39` |
| `WhatsApp … 20.27.02 (2).jpeg` | `references/environments/scrap-factory-red-v1.jpeg` | `b97eeca5fad34856c1ccc50d32bf22bf551fe53e172ae7e3bc81b531c1df9192` |
| `WhatsApp … 20.27.02 (3).jpeg` | `references/environments/arctic-tech-base-v1.jpeg` | `e2ef962411d7b8fe7c0c52a6bde1f00e7cf40f5397964749a37c66fcf5d7b898` |
| `WhatsApp … 20.27.02 (4).jpeg` | `references/environments/skull-neon-district-v1.jpeg` | `5fa0bab989ef84f6f175615db264ebd8c8867fcbdb25a3b80d5434ed6b647f65` |
| `WhatsApp … 20.27.02 (5).jpeg` | `references/environments/underwater-cyber-lab-v1.jpeg` | `5e98f4e4e7f4c589920e930be976e257f6102339bba2f0dadf4db60b60989666` |

Nenhuma das 22 origens tinha hash duplicado entre si. A extensão foi preservada conforme a codificação real: JPEG permaneceu `.jpeg`; os PNGs de origem com nomes confusos foram copiados para nomes terminados em `.png`, sem conversão.

## 6. Ausências e ambiguidades

- `references/html/`: não criado; nenhum dos HTMLs dentro do projeto foi classificado como referência gráfica. `index.html` é runtime, `tools/animation-viewer.html` é ferramenta e `BoyPunk-Studio-v0.4.0.html` é standalone histórico.
- Os oito HTMLs externos citados na auditoria anterior não estão dentro do escopo de busca desta organização e não foram copiados nem executados.
- `boypunk-idle-source-v1.png` não existia com esse nome exato; a cópia organizada deriva do PNG legado `boypunk-reference-v1.jpeg.png`, confirmado visualmente como quatro poses de BoyPunk.
- O arquivo-fonte de Nilo tinha nome malformado. O original foi preservado e a cópia organizada recebeu o nome esperado.
- `personagens-v1` não tem README, manifesto, illustrated, portrait, Nilo, previews ou documentação.
- Não há pacote independente de Cyber Lab sob `art-deliveries/`; seu material está disperso entre runtime, handoff e evidências e não foi movido para evitar quebrar referências anteriores.

## 7. Próximo lote recomendado

Solicitar ao Antigravity um pacote versionado novo, sem tocar em `personagens-v1`, começando por BoyPunk clássico completo:

`art-deliveries/antigravity/personagens-v2/boypunk/classic/`

O lote deve conter os 21 frames contratuais, retrato 32×32, README, manifesto SHA-256, folha de pivôs e loops de `idle` a 5 fps e `walk` a 12 fps nos dois facings. Os oito candidatos existentes podem ser reapresentados somente depois de receberem preview animado e comparação 480×270. Após aprovação desse lote, produzir o conjunto ilustrado de BoyPunk e repetir o mesmo fluxo para Nilo, mantendo rosto negro reconhecível, grafite, verde/violeta e arma visualmente distinta.

## 8. Integridade desta organização

Antes das cópias foram registrados 985 arquivos preexistentes protegidos, cobrindo `assets/`, `src/`, testes, ferramentas, configurações, docs existentes, entregas, backups, releases, `dist-portable` e `studio-builds`.

- 984/984 caminhos convencionais passaram na conferência SHA-256 posterior.
- O arquivo legado de Nilo com duas quebras de linha no nome não pode ser relido pelo formato textual do `sha256sum`; foi verificado separadamente por leitura binária e permaneceu com SHA-256 `32d6007300211146fe10758769fa9046d46271621e9fcfb60b54fb2dc80e884b`.
- Divergências em arquivos protegidos: zero.
- Novos arquivos de referência: 22, todos idênticos às origens registradas.
- Alterações em `assets/`, código, testes, configurações ou pacotes existentes: zero.

Não se alega validação Git. A tarefa não repetiu a suíte completa porque não alterou runtime; a integridade foi comprovada por conteúdo.
