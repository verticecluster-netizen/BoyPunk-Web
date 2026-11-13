# Relatório de integração — profundidade decorativa do Distrito Neon

**Data da retomada:** 2026-11-05  
**Projeto:** `/home/flow/Projetos/BoyPunk-Web`  
**Fonte modular:** `0.4.2`  
**Status:** **implementado com validação visual pendente**

## Escopo e estado recuperado

A retomada não reiniciou a implementação. O estado interrompido já continha:

- as chaves opcionais `world.background.district.far`, `mid` e `near` em `src/assets.js`;
- as três camadas copiadas para `assets/images/world/distrito-neon-parallax/`;
- estado, suavização, limites, recorte com overscan, fallback e composição em `src/renderer.js`;
- o teste novo `tests/district-parallax.test.mjs`;
- um checkpoint anterior à integração em `docs/checkpoints/parallax-distrito-neon-2026-11-04-v1/`.

O diretório `.git/` está vazio nesta montagem, portanto status, branch e diff contra um índice não estão disponíveis. Nenhum `git reset`, `git clean`, checkout ou restauração global foi executado. Não há `AGENTS.md` aplicável ao projeto.

`src/core.js` e `src/level-data.js` não foram alterados nesta integração/retomada.

## Assets e manifesto

Foi integrado somente o conjunto aprovado de três camadas. O conjunto alternativo granular de quatro camadas não é carregado, evitando duplicação.

| Camada ativa | Dimensão | SHA-256 ativo e entrega |
| --- | --- | --- |
| `distrito-neon-far.png` | 1672×941 | `18492027405ed0f64d70ccc2ffc05b166c36907c8281324f11cb5dbeb7e77371` |
| `distrito-neon-mid.png` | 1672×941 | `dc65d227bce7a77ed214c6306c3cf8680d8b704911abbcd55ee4dbcf9edb17f7` |
| `distrito-neon-near.png` | 1672×941 | `e4afd2896815e1d26b215e768b5f7824bf96d08381688a0fe77cc7d1b5bc03bc` |

Os hashes dos arquivos ativos correspondem exatamente a `art-deliveries/antigravity/distrito-neon-parallax-v1/documentation/delivery-manifest.json` e às cópias em `layers/`.

## Implementação preservada e concluída

- O efeito é restrito ao tema `neon-district`; Fábrica de Sucata e Câmara de Energia continuam usando seus fundos e passes próprios.
- A ordem é `far → mid → near`, antes de atmosfera, mundo, plataformas, entidades, tiros e HUD.
- A arena lógica permanece fixa em `480×270`. Não foi introduzida câmera, transformação de mundo ou mudança de física.
- A referência decorativa é a posição horizontal do jogador; no coop, usa o centro médio estável dos jogadores existentes. Apenas o recorte das camadas de fundo muda.
- Amplitudes lógicas: `far ±3 px`, `mid ±6 px`, `near 0 px`; suavização exponencial com taxa `6`.
- O recorte dinâmico reserva 24 pixels de fonte por lado (`sw=1624`, `sh=913,5`, `sy=13,75`). Mesmo nos extremos, `sx` permanece dentro da fonte: aproximadamente `13,85..34,15` em `far`, `3,7..44,3` em `mid` e `24` em `near`.
- Em movimento reduzido ou sem referência de jogador, a recomposição é estática e usa cover central sem overscan: `sx=0`, `sy=0,25`, `sw=1672`, `sh=940,5`.
- Pausa congela o estado; retry, regressão do relógio e troca de fase neutralizam os deslocamentos.
- Se qualquer camada estiver ausente, tiver dimensões incompatíveis ou falhar no desenho, o renderer usa o fundo original opaco completo. Uma falha de desenho desativa novas tentativas naquela instância, evitando exceções repetidas.
- O `screenShake` continua aplicado somente ao passe de mundo; o fundo decorativo e o HUD não recebem essa translação.

## Diagnóstico das falhas reproduzidas

### `1672 !== 940.5`

O rastreamento completo apontou `tests/district-parallax.test.mjs:164`. O mock registra a chamada como:

```text
["drawImage", image, sx, sy, sw, sh, dx, dy, dw, dh]
```

A asserção lia o índice `[4]`, que é `sw=1672`, mas comparava com a altura esperada `sh=940,5`. Não havia erro no cover do renderer. O teste foi corrigido para verificar explicitamente:

- `[4]`: `sw=1672`;
- `[5]`: `sh=940,5`;
- `[3]`: `sy=0,25`.

Não se trocou o esperado pelo recebido; largura, altura e coordenada do recorte agora são verificadas separadamente.

### `Cannot read properties of undefined (reading 'disabled')`

O rastreamento completo apontou `Renderer.districtParallaxAssets`, chamado pelo teste legado em `tests/renderer.test.mjs:495`. O objeto indefinido era `renderer.districtParallax`, não uma imagem.

O teste criava `Object.create(Renderer.prototype)` e chamava `drawBackground`, pulando o construtor. O estado `districtParallax` é obrigatório e corretamente inicializado pelo construtor no caminho de produção. O mock foi corrigido para usar `new Renderer(canvas, images, { renderScale: 1 })`.

Não foi adicionado optional chaining, estado implícito ou guard no código de produção para esconder a inicialização inválida.

## Arquivos da tarefa

### Já alterados pela execução interrompida

- `src/assets.js`
- `src/renderer.js`
- novos `assets/images/world/distrito-neon-parallax/distrito-neon-{far,mid,near}.png`
- novo `tests/district-parallax.test.mjs`

### Alterados nesta retomada

- `tests/district-parallax.test.mjs`
- `tests/renderer.test.mjs`
- `docs/CONTINUIDADE_MECANICAS_AVANCADAS.md`
- novo `docs/art/RELATORIO_INTEGRACAO_PARALLAX_DISTRITO_NEON.md`
- novo checkpoint `docs/checkpoints/parallax-distrito-neon-2026-11-05-v2-pre-correcao/`

Além de corrigir as duas falhas, o teste direcionado passou a provar que somente três camadas são registradas e que os recortes nos dois extremos permanecem integralmente dentro das fontes sem `repeat-x`.

## Backups e checkpoints

- **Backup/checkpoint original anterior à integração:** `docs/checkpoints/parallax-distrito-neon-2026-11-04-v1/`.
- **Checkpoint versionado do estado interrompido, anterior às correções:** `docs/checkpoints/parallax-distrito-neon-2026-11-05-v2-pre-correcao/`.
- O `v2` contém `README.md` e `MANIFESTO.sha256`; `sha256sum -c MANIFESTO.sha256` aprovou os cinco arquivos preservados.
- Nenhum backup anterior foi sobrescrito.

## Validação automatizada

### Reprodução antes das correções

- `node tests/district-parallax.test.mjs`: 5 aprovados, 1 falho, 0 ignorados.
- `node tests/renderer.test.mjs`: 13 aprovados, 1 falho, 0 ignorados.
- `npm test`: 28 arquivos aprovados, 2 falhos, 0 ignorados.

### Depois das correções

- Direcionados (`district-parallax`, `renderer`, `bonus-chamber-renderer`, `levels`): **35 aprovados, 0 falhos, 0 ignorados**.
- `npm run check`: **aprovado**.
- `npm test`: **30 arquivos/subtestes aprovados, 0 falhos, 0 cancelados, 0 ignorados**.
- Contagem das declarações `test(...)` nos fontes: **305**.

Os testes cobrem hashes/dimensões, carregamento opcional, ausência do conjunto duplicado, ordem, cover estático, overscan, limites dos dois extremos, suavização, coop, pausa, retry, troca de ambiente, movimento reduzido, fallback por ausência/falha e preservação dos caminhos de Fábrica/Câmara.

## Validação visual e limitações

Não foi possível aprovar visualmente o gameplay nesta sessão:

- `npm run dev` tentou iniciar o endereço canônico, mas o sandbox recusou o bind em `127.0.0.1:47831` com `listen EPERM`;
- Chrome headless caiu antes de abrir a página porque o sandbox recusou o socket interno do Crashpad (`setsockopt: Operation not permitted`);
- Firefox headless instalado via Snap recusou iniciar sem o serviço AppArmor apropriado.

Logo, permanecem pendentes em navegador real:

- Distrito Neon em escalas 1 e 2;
- movimento entre os extremos, bordas vazias, duplicação estrutural e tremulação;
- confirmação visual de que plataformas, personagens e HUD não se deslocam com o efeito;
- pausa, derrota, tentar novamente e movimento reduzido;
- inspeção visual da Fábrica de Sucata e Câmara de Energia;
- console e painel de requisições dos assets.

Os testes automatizados aprovados não são apresentados como aprovação visual. Nenhum servidor ou navegador da tarefa ficou ativo, e os perfis/scripts temporários criados na tentativa foram removidos.

## Reversão restrita a esta tarefa

Como Git não está disponível nesta montagem, a reversão deve usar somente os checkpoints desta integração:

1. preservar o estado atual (o `v2` já contém o código interrompido, mas não as correções/documentação finais);
2. copiar de `docs/checkpoints/parallax-distrito-neon-2026-11-04-v1/` apenas `src/assets.js`, `src/renderer.js` e `docs/CONTINUIDADE_MECANICAS_AVANCADAS.md` para os caminhos correspondentes;
3. mover para uma pasta de backup, sem apagar, `tests/district-parallax.test.mjs`, `assets/images/world/distrito-neon-parallax/`, este relatório e o checkpoint `v2`;
4. restaurar `tests/renderer.test.mjs` somente se for necessário desfazer a correção do mock; sua versão anterior está no checkpoint `v2`;
5. executar `npm run check` e `npm test`.

Esse procedimento não toca `src/core.js`, `src/level-data.js`, outras fases, releases ou trabalhos não relacionados.

## Como iniciar

```bash
cd /home/flow/Projetos/BoyPunk-Web
npm run dev
```

URL canônica:

```text
http://127.0.0.1:47831/
```

Ao final desta retomada, `./iniciar-jogo.sh --status` informa que o jogo **não está ativo**.

