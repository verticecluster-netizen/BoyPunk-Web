# Status das implementações do BoyPunk!

**Conferência:** 2026-11-05  
**Raiz confirmada:** `/home/flow/Projetos/BoyPunk-Web`  
**Versão modular declarada:** `0.4.2`  
**Escopo:** verificação objetiva, sem correção de código ou substituição de assets

## Limites da recuperação

- Não existe `AGENTS.md` aplicável a esta raiz; os encontrados pertencem ao projeto vizinho `opj-studio-site`.
- `.git/` existe, mas está vazio. Git não reconhece esta raiz como repositório; autoria, ordem de commits e árvore limpa não podem ser provadas.
- A comparação posterior à conclusão usa conteúdo e SHA-256, não somente datas: os arquivos atuais de integração são byte a byte idênticos ao snapshot `art-deliveries/antigravity/integration-recovery/03-workspace-state-on-entry/`.
- Prompts e nomes de arquivos não foram tratados como prova de execução. Resultados runtime são atribuídos ao relatório JSON e às capturas que efetivamente existem.

## Mudanças posteriores identificadas

Depois do relatório de conclusão foram acrescentados:

1. `art-deliveries/antigravity/integration-recovery/`, com três estágios de checkpoint, `CHECKPOINT_MANIFEST.json`, `MANIFESTO.sha256` e `README.md`;
2. `evidencias/parallax-distrito-neon-2026-11-05/`, com prancha técnica, 13 capturas runtime e `runtime-validation-report.json`.

O conteúdo do pacote aponta para uma execução Antigravity (`/home/flow/.gemini/antigravity/.../validate_parallax_runtime.mjs`) e preserva o estado encontrado antes dessa execução. Isso é evidência forte da origem operacional, mas, sem Git ou log de auditoria externo, não permite provar autoria humana/processual nem afirmar que a interface mostrou exatamente um único arquivo alterado.

Não foi encontrada alteração posterior nos seguintes arquivos comparados com o snapshot:

- `src/assets.js`;
- `src/renderer.js`;
- `tests/district-parallax.test.mjs`;
- `tests/renderer.test.mjs`;
- `docs/CONTINUIDADE_MECANICAS_AVANCADAS.md`;
- `docs/art/RELATORIO_INTEGRACAO_PARALLAX_DISTRITO_NEON.md`;
- as três camadas ativas `far`, `mid` e `near`.

O `README.md` da recuperação ficou desatualizado: ainda lista a validação visual como próximo passo, embora o relatório runtime e as capturas tenham sido produzidos depois. Não há baseline anterior desse README para determinar se ele foi o arquivo indicado pela interface.

## Matriz de situação

| Recurso | Evidência | Situação | Pendência |
| --- | --- | --- | --- |
| Três fases jogáveis | **Código:** `LEVELS` contém `district-neon`, `scrap-factory` e `energy-chamber`. O renderer consome respectivamente `world.background`, `world.background.factory` e `world.background.bonus`, com tilesets próprios. **Visual posterior inspecionado:** capturas do Distrito, Fábrica e Câmara existem. | Confirmado por código; três cenários observados nas capturas posteriores. | Playtest humano curto sem overlay de debug. `world.background.cyberlab` está registrado, mas não pertence aos três `LEVELS` e não é fase consumida por esse fluxo. |
| Referências e candidatos de cenário | `refino-fases-v1` declara `runtimeIntegrationPerformed: false`, mas os seis hashes de fundos/tiles candidatos coincidem com os arquivos ativos atuais. | A entrega é a referência/candidata; as cópias em `assets/images/world/` são os assets ativos. | Manter a distinção documental; não inferir consumo a partir das prévias. |
| Profundidade do Distrito | **Código:** somente `far → mid → near` é registrado e desenhado; movimento decorativo limitado a `far ±3`, `mid ±6`, `near 0`, com overscan e suavização. **Teste atual:** suíte aprovada. **Runtime posterior:** camadas 1672×941 carregadas, `parallaxDisabled=false`, extremos e movimento rápido dentro dos limites. | Implementado e consumido pelo renderer na fase `neon-district`. Arena, mundo e HUD não recebem o deslocamento decorativo. | Observação humana prolongada para tremulação/legibilidade; as capturas atuais usam modo de teste/debug. |
| Fallback do Distrito | Fundo original `assets/images/world/distrito-neon.png` permanece obrigatório. Ausência, dimensão incompatível ou falha de desenho das camadas retorna ao cover do fundo original. | Confirmado por código e teste direcionado. | Nenhuma correção indicada nesta conferência. |
| Foreground do Distrito | `distrito-neon-near.png` corresponde ao `foreground` da entrega e é a terceira camada efetivamente desenhada. Hash ativo: `e4afd289...03bc`. | Asset ativo e consumido, não mera prévia. | Validação humana de oclusão nas bordas. |
| Chuva, muzzle flash e partículas | `drawCyberpunkRain`, névoa/grid, muzzle flash do jogador, carga do patrol-shooter, flash do canhão bônus, partículas de pouso e efeitos de combate permanecem no renderer. Há testes de chuva/reduced motion, telegraph/muzzle do patrol-shooter, canhão e partículas. | Existentes e chamados pelos caminhos atuais; não foram criados nesta conferência. | A captura runtime confirma aparência geral, mas não prova isoladamente todas as animações/cadências. |
| Chaser — HP/hurtFlash | `chaserMaxHp=3`; spawn recebe `maxHp/hp=3`; somente Chaser usa HP; `damageEnemy` reduz HP, aplica `hurtFlash=0,14 s` e só derrota em zero. Feedback é desenhado pelo renderer. | Confirmado por código e suíte atual. | Validação visual específica do flash de 0,14 s continua recomendada. |
| Chaser — patrol/chase | Estado inicial `patrol`; entrada em `chase ≤150 px`, saída `≥180 px`; patrulha a 60% de 52 px/s, raio 56 e aceleração 420 px/s². | Confirmado por código e suíte atual. | Playtest visual de transições em geometria real. |
| BoyPunk `personagens-v2.1` | 21 clássicos + 21 ilustrados + retrato comparados por SHA-256: **43/43 iguais** ao manifesto. Estados `idle`, `walk`, `jump`, `fall`, `attack1`, `hurt`, `die` completos. | Frames ativos e consumidos: clássico em 1×; ilustrado preferido quando `renderScale>1`. | Retrato é carregado, mas não há uso encontrado no renderer/UI. |
| Nilo `personagens-v2.1` | 21 clássicos + 21 ilustrados + retrato comparados por SHA-256: **43/43 iguais** ao manifesto. Todos os sete estados completos. | Frames ativos e consumidos pelo prefixo `nilo`; hashes confirmam v2.1, inclusive as correções de Nilo. | Retrato é carregado, mas não há uso encontrado. A captura chamada `scale2-left-nilo` registra `character: "boypunk"` no JSON e o HUD mostra BOYPUNK; portanto ela não prova seleção runtime de Nilo de forma inequívoca. |
| Fallbacks de personagem | Em escala >1, o resolver tenta ilustrado e depois clássico. Nilo declara `fallbackSpritePrefix: "player"`; se seu estado não carregar, pode mostrar BoyPunk. Também segura frame anterior e aceita chave legada. | Fallback funcional, porém capaz de mostrar outro personagem. Normalmente não é acionado porque os 84 frames ativos existem e correspondem à v2.1. | Confirmar se Nilo→BoyPunk é política visual desejada. `assets/images/player-original/`, `assets/images/player/` e `compat-64x32/` não estão no manifesto ativo e não são consumidos. |
| Retratos | `player.portrait.0` e `nilo.portrait.0` estão no manifesto e seus PNGs batem com v2.1. Busca no código encontra apenas o registro de assets. | Assets ativos no carregador, mas sem consumidor identificado. | Decidir uso em seleção/HUD ou retirar o carregamento em lote futuro; nenhuma alteração feita agora. |
| `distrito-neon-premium-v1` | Busca por diretório, arquivo e referência textual em todo o workspace não retornou resultados. | **Inexistente neste projeto.** Não é referência, candidato, asset ativo nem recurso do renderer. | Obter/definir a entrega antes de qualquer integração premium. |

## Validação atual

### Automação

Comandos executados sequencialmente:

```bash
npm run check
npm test
```

Resultados:

- `npm run check`: aprovado, sem erro de sintaxe nos arquivos e scripts enumerados pelo comando;
- `npm test`: `tests 30`, `suites 0`, `pass 30`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`.

O script usa `node --test tests/*.test.mjs`. Nesta configuração, o resumo apresentado conta os **30 arquivos de teste como subtestes de nível superior**. A quantidade estática de declarações `test(...)` no fonte não é usada aqui como total comprovado de casos executados.

### Observação visual

Foi inspecionado o material posterior em `evidencias/parallax-distrito-neon-2026-11-05/`:

- escalas 1× e 2×, esquerda/centro/direita;
- pausa, derrota e retry;
- movimento reduzido e coop;
- Fábrica de Sucata e Câmara de Energia.

O JSON registra `assetFailures: []`, zero erros de console, zero exceções de página e uma requisição de mídia cancelada (`net::ERR_ABORTED`, `canceled: true`). As imagens não exibem bordas vazias evidentes, repetição estrutural ou deslocamento do HUD. Como são capturas com overlay de debug, não equivalem a um playtest humano completo.

Uma nova sessão isolada não pôde ser produzida nesta conferência: o health check terminou com “BoyPunk! não está ativo” e Firefox/Snap foi bloqueado pela ausência de AppArmor. Nenhuma flag de desativação de segurança foi usada e nenhuma configuração do sistema foi alterada.

Roteiro manual curto:

1. iniciar o jogo e abrir Distrito Neon em `?scale=1` e `?scale=2`;
2. caminhar rapidamente entre as duas bordas, pausar, sofrer derrota e tentar novamente;
3. repetir com movimento reduzido e uma sessão coop com os jogadores separados;
4. abrir Fábrica e Câmara; confirmar fundos próprios;
5. verificar no console ausência de exceções e, na rede, sucesso de `distrito-neon-{far,mid,near}.png`;
6. selecionar BoyPunk e Nilo e observar os sete estados, principalmente `hurt`, `die` e a troca `jump/fall`.

## Próximo lote pequeno recomendado

Fechar somente o contrato visual de personagens:

1. decidir se os dois retratos v2.1 serão realmente exibidos;
2. decidir se o fallback Nilo→BoyPunk deve permanecer;
3. adicionar validação visual sem debug para BoyPunk/Nilo nos sete estados.

Não iniciar `distrito-neon-premium-v1` enquanto a entrega não existir e não repetir a integração de profundidade já confirmada.

## Inicialização

```bash
cd /home/flow/Projetos/BoyPunk-Web
npm run dev
```

URL canônica:

```text
http://127.0.0.1:47831/
```

Ao final desta conferência, `./iniciar-jogo.sh --status` informa que o servidor **não está ativo**.

## Atualização — HUD e confirmação de telas — 2026-11-05

Esta seção registra um lote de implementação posterior à conferência somente leitura acima; o histórico anterior foi preservado.

| Recurso | Evidência | Situação | Pendência |
| --- | --- | --- | --- |
| HUD de efeitos | `buildHudEffectIndicators` lê TR, RD, escudo e cura diretamente do modelo; testes cobrem quatro efeitos simultâneos, dois owners, expiração e ausência de mutação. Os cartões até `y=135` foram substituídos por linha dentro do painel que termina em `y=45`. | Implementado e confirmado por código/testes. | Aprovação visual 1×/2× com múltiplos efeitos. |
| Avisos de aquisição | `notice` continua sendo slot único, agora com 1,0 s para os quatro pickups; texto de RD não repete o tempo persistente. | Implementado; sem fila ilimitada. | Conferir legibilidade PT/EN no jogo. |
| Instruções | Faixa inferior permanente foi retirada; lembrete inicial usa a faixa de aviso até 7 s e a pausa mostra resumo localizado. | Implementado e testado estruturalmente. | Avaliar duração em playtest. |
| Confirmação de UI | Enter/Espaço e gamepad chamam o mesmo clique; ações validam o estado, foco padrão independe de clique/gamepad e `UiPressGate` bloqueia repeat/resíduo até keyup. | Implementado e coberto por testes. | Teste manual com mouse, teclado e joystick físico. |
| Coop atual | Preview somente no Distrito; P1 BoyPunk/P2 Nilo; teclado+pad ou dois pads; power-ups desativados; vida/carga por jogador e meta compartilhada; sem friendly fire/revive. | Documentado por código em `docs/PLANO_COOP_POWERUPS.md`; não reimplementado. | Próximo lote: coleta atômica e respawn dos pickups de suporte atrás da rota de preview. |
| Power-ups | TR 10 s, Vida +1, Escudo 1 impacto, RD 10 s/segundo tiro 0,12 s, Cura própria +1/20 s. TR e RD permanecem independentes. | Regras preservadas; somente apresentação mudou. | Respawn coop é especificação, não implementação. |
| Regressão geral | `npm run check` aprovado; `npm test`: 31 arquivos, 31 aprovados, 0 falhos, 0 ignorados. | Automação aprovada. | `tests 31` é agregação de arquivos, não contagem provada de casos internos. |
| Navegador | Chrome bloqueado pelo sandbox antes do CDP; Firefox/Snap bloqueado por AppArmor. Sem flags inseguras e sem captura válida. | Validação visual pendente. | Executar roteiro de `docs/RELATORIO_HUD_NAVEGACAO.md` em ambiente com navegador funcional. |

Checkpoint específico: `docs/checkpoints/hud-navegacao-2026-11-05-pre-edicao-v1/`. Relatório: `docs/RELATORIO_HUD_NAVEGACAO.md`.
