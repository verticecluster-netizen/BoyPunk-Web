# Relatório — Mecânicas avançadas

**Data:** 2026-11-04  
**Projeto:** `/home/flow/Projetos/BoyPunk-Web`  
**Fonte modular:** `0.4.2`

## Resumo da entrega

- **HP do Chaser:** implementado e validado por testes automatizados.
- **Máquina patrol/chase:** implementada e validada por testes automatizados.
- **Profundidade do Distrito Neon:** camadas atmosféricas implementadas e validadas por testes automatizados. Não é parallax de câmera.
- **Parallax real:** pendente de câmera móvel e assets separados, conforme `docs/art/PARALLAX_DISTRITO_NEON_HANDOFF.md`.

Nenhum asset, release, standalone, ZIP ou dependência foi criado/alterado. Nenhum commit ou publicação foi realizado.

## Estado inicial recuperado

- `package.json` e `src/version.js` identificam a fonte modular como `0.4.2`.
- `.git/` existe, mas está vazio nesta montagem. Branch, commit, status e diferenças contra um índice não são verificáveis; a árvore não foi declarada limpa.
- Não há `AGENTS.md` aplicável; `.agents/` e `.codex/` estão vazios.
- Não existia `docs/CONTINUIDADE_MECANICAS_AVANCADAS.md`, implementação nominal destas etapas ou relatório correspondente.
- O travamento anterior não foi reproduzido. Não existe evidência para afirmar OOM.
- BoyPunk e Nilo, sprites ilustrados, derrota animada do Chaser, Distrito Neon, Fábrica de Sucata, Câmara de Energia, coop preview, Tiro Rápido e Rajada Dupla já estavam integrados e foram preservados.
- O Chaser anterior não tinha HP: melee e projétil chamavam `killEnemy` diretamente.
- A IA anterior perseguia continuamente o jogador vivo mais próximo a 52 px/s e usava `moveBody`, gravidade e salto sobre obstáculo.
- O renderer não possui câmera móvel. O mundo inteiro mede 480 × 270, igual ao viewport lógico, e o Distrito usa uma única imagem RGB achatada de 1672 × 941.

### Linha de base

- `npm run check`: aprovado.
- `npm test`: 28/28 arquivos aprovados.
- Casos nomeados no fonte: 283 declarações `test(...)`.
- Falhas preexistentes encontradas: nenhuma.

O resumo do Node mostrava 28 porque agrega cada arquivo isolado como um subteste. Esse número não foi confundido com a quantidade de casos nomeados.

## Checkpoints

### Pré-edição geral

- `evidencias/recovery/mecanicas-avancadas-pre-edicao-20261104/checkpoint.tar.gz`
- SHA-256: `a1b160e168b104f0b49fbbec2e143d55382485b0d0c70a1d891a2979c99a5b5f`
- Manifesto: `evidencias/recovery/mecanicas-avancadas-pre-edicao-20261104/MANIFESTO.sha256`
- Suplementos do estado original descobertos durante a regressão da demo:
  - `checkpoint-demo-original.tar.gz` — `bd645324f69d5373b1cfefc99974871084b28ee7038cd68067fcb8024f22c747`;
  - `checkpoint-demo-test-original.tar.gz` — `312ad79d5d58e1142ec241ccf218c4c0e9d44455d9937f18dddace7cdb93463a`.

### Pós-Etapa 1

- `evidencias/recovery/mecanicas-avancadas-etapa2-20261104/checkpoint-pos-etapa1.tar.gz`
- SHA-256: `f5e38843431c90b5074518accca5353178a7c8bca2df02f6d89958dd997d9f26`
- Coop suplementar: `checkpoint-coop-pos-etapa1.tar.gz` — `72fbf8d695ca0fa9cbea449cab14241e0daca167f4f799b604b2bc12d9ddb410`.

### Pós-Etapa 2

- `evidencias/recovery/mecanicas-avancadas-etapa3-20261104/checkpoint-pos-etapa2.tar.gz`
- SHA-256: `22985c26e8f0129a57a9ef1f1f17caeff4a9134d90bb0f60c51693be70525a15`

## Etapa 1 — HP e feedback de dano

### Antes

- Qualquer ataque válido derrotava qualquer inimigo imediatamente.
- Projéteis do jogador não carregavam um campo explícito de dano.
- A guarda do melee era efetivamente “uma vez por run”, suficiente apenas porque o alvo morria no primeiro contato.

### Agora

- Cada Chaser nasce com `maxHp = 3` e `hp = 3`.
- Somente `kind: "chaser"` recebe HP. Shooters e patrol-shooters mantêm a derrota imediata anterior.
- Bola de Pulso declara `damage = 1`; melee usa `meleeDamage = 1`.
- `damageEnemy` subtrai o valor real recebido, inclusive valores maiores que 1.
- O Chaser é removido somente em `hp <= 0`.
- A guarda `removed` mantém morte, kill, drop, visual e `enemyDefeated` idempotentes.
- O projétil continua sendo consumido na resolução swept-AABB existente. Uma colisão consumida não repete dano.
- Duas balas distintas podem causar dois danos. No caso de Rajada Dupla, o primeiro Chaser vivo absorve os dois tiros e impede atravessamento até morrer.
- `hurtFlash` dura **0,14 s de simulação**, reinicia a cada dano, não adiciona invulnerabilidade, knockback ou hitstop e desenha contorno vermelho discreto.
- A guarda de melee passou a usar o ID do ataque aceito, evitando repetição em ticks da mesma janela e permitindo dano em ataques posteriores.
- Instâncias coop receberam o mesmo contador de ataque.
- Feedback Canvas usa `save/restore`.

### Preservado

- Dano de contato do Chaser e dano ao altar.
- Swept-AABB, precedência de parede, consumo de projétil e animação de morte.
- Pausa, retry, derrota e limpeza de visuais.
- Tiro Rápido reduz somente cooldown; Rajada Dupla cria somente o segundo tiro; ambos continuam combináveis.

## Etapa 2 — Máquina de estados do Chaser

### Estados e transições

- Constantes: `patrol` e `chase`.
- Estado por instância: `aiState`.
- Entra em chase quando a distância entre centros é `<= 150 px` lógicos.
- Retorna a patrol quando a distância é `>= 180 px` lógicos.
- Entre 150 e 180, preserva o estado atual. Essa histerese evita alternância na fronteira.
- Comparações usam a tolerância numérica existente `EPSILON` para respeitar exatamente os limites.

### Patrol

- Velocidade pretendida: `52 × 0,6 = 31,2 px/s` em campanha.
- Raio máximo: ±56 px do ponto de spawn.
- Os limites são reduzidos por sondas nos dois pés contra a geometria real e recebem margem de frenagem de 2 px.
- Ao alcançar limite/borda, inverte direção.
- Ao colidir horizontalmente em patrol, zera a velocidade, inverte direção e usa cooldown de 0,18 s para evitar oscilação.
- Não há pathfinding, voo, teleporte ou movimento direto de posição.

### Chase

- Velocidade máxima de campanha preservada: `52 px/s`.
- Aceleração: `420 px/s²`, aplicada como `aceleração × dt`.
- Movimento continua passando por `moveBody`, plataformas, paredes e gravidade.
- Salto atual foi preservado para alvo acima e obstáculo horizontal.
- Survival preserva o multiplicador de velocidade anterior; nenhum novo máximo foi introduzido.

### Alvos e altar

- Jogador morto/inativo ou inexistente não é perseguido.
- Sem alvo vivo, a instância volta a patrol.
- Coop preserva a política já existente: jogador vivo mais próximo por distância euclidiana, com desempate estável por ID.
- A prioridade anterior não mudou: o movimento é orientado ao jogador; o altar só recebe dano se o Chaser o sobrepõe fisicamente e há partida/alvo vivo válido.

### Demo

A demo usa física e combate reais. Com Chasers mais resistentes e inimigos distantes patrulhando, sua janela determinística de cobertura passou de 18 s (linha de base) para 19 s após HP e para 22 s após a IA. O controlador só solicita tiro quando o cooldown autoritativo terminou e usa alcance visual de combate de 180 px; dano e cadência do jogo não foram alterados.

## Etapa 3 — Distrito Neon

### Diagnóstico de câmera e arte

- Não existe câmera móvel ou offset autoritativo.
- O screen shake é temporário e não é uma câmera.
- O background é uma única imagem achatada.
- Portanto, fatores de 0,2×/0,5× não produziriam parallax útil, e duplicar/recortar a imagem criaria prédios fantasmas.

### Implementado

- Background principal preservado.
- Três planos atmosféricos discretos de névoa ciano/violeta, quatro bancos por plano.
- Movimento lento calculado por tempo de simulação; `reducedMotion` mantém posições estáticas.
- Chuva, scanners e névoa congelam com `model.elapsed` durante pausa.
- O passe ocorre atrás de plataformas, personagens, tiros, almas, perigos e HUD.
- Sem canvases, imagens, gradientes ou arrays novos por frame.
- Alpha, filtro e composição são isolados com `save/restore`.
- O passe novo é restrito a `neon-district`; Fábrica e Câmara não foram alteradas.

Esse resultado é **camada atmosférica em câmera fixa**, não parallax de câmera. O handoff de arte especifica os planos `far`, `mid` e `near`, alinhamento e dependência futura de câmera.

## Arquivos alterados

### Código

- `src/config.js`
- `src/core.js`
- `src/renderer.js`
- `src/main.js`
- `src/demo.js`
- `src/coop.js`

### Testes

- novo `tests/chaser.test.mjs`
- `tests/core.test.mjs`
- `tests/powerups.test.mjs`
- `tests/demo.test.mjs`
- `tests/renderer.test.mjs`
- `tests/visual-effects.test.mjs`

### Documentação e evidências

- novo `docs/CONTINUIDADE_MECANICAS_AVANCADAS.md`
- novo `docs/RELATORIO_MECANICAS_AVANCADAS.md`
- novo `docs/art/PARALLAX_DISTRITO_NEON_HANDOFF.md`
- checkpoints e manifestos listados acima
- `evidencias/mecanicas-avancadas-final/firefox-distrito.png`

## Testes finais

- `npm run check`: **aprovado**.
- `npm test`: **29/29 arquivos aprovados**, zero falhas, cancelamentos ou skips.
- Casos nomeados no fonte: **298** (283 iniciais + 15 novos).

Cobertura nova/revisada inclui:

- 3/3, 2/3, 1/3 e morte em 0 HP;
- dano maior que 1;
- morte/drop/ponto/evento únicos;
- consumo único do projétil e Rajada Dupla com dois danos;
- expiração do hurtFlash por tempo de simulação;
- inimigos sem HP inalterados;
- patrol longe, entrada em 150, histerese, saída em 180;
- limites físicos, reversão e velocidade de 31,2/52 px/s;
- alvo inválido e coop determinístico;
- consistência da aceleração em 120 Hz e 60 Hz;
- névoa, reduced motion, `save/restore` e relógio congelado na pausa.

## Evidência de navegador e limitações

### Executado

- A fonte atual foi servida por HTTP local em `http://127.0.0.1:47831/`.
- Firefox headless, viewport 1280 × 720 e perfil isolado produziram `firefox-distrito.png`.
- A captura ocorreu na tela de boot, em 0%, antes do carregador sequencial assíncrono terminar. Ela comprova resposta HTTP e inicialização de HTML/JS, mas não prova gameplay.
- O Firefox restrito exibiu fallback de `localStorage` em memória; esse caminho já é previsto pelo projeto.

### Não executado/comprovado

- O Chrome CDP não criou `DevToolsActivePort` no sandbox.
- Não foi possível manter o servidor entre comandos sandboxados para concluir a automação integrada.
- Observação real de gameplay nesta sessão: **0 segundos**. Portanto, não há alegação de validação visual de HP, IA, controles, acumulação de efeitos ou três ambientações.
- Permanecem pendentes: playtest manual de BoyPunk/Nilo, movimento, salto, disparo, pausa, Chaser, altar, derrota/retry, power-ups separados/combinados e inspeção das três ambientações.
- Não foram testados Windows, celular, joystick físico nem offline.

Os perfis temporários foram removidos e nenhum servidor/navegador da tarefa permaneceu ativo. Não foi encerrado processo do usuário.

## Reversão

Para reverter somente a Etapa 3, extraia `checkpoint-pos-etapa2.tar.gz` na raiz e mova o novo handoff para fora do projeto.

Para retornar ao estado anterior a toda a tarefa:

1. extraia `checkpoint.tar.gz` na raiz;
2. extraia `checkpoint-demo-original.tar.gz` e `checkpoint-demo-test-original.tar.gz`;
3. mova para uma pasta de backup os arquivos novos `tests/chaser.test.mjs`, `docs/CONTINUIDADE_MECANICAS_AVANCADAS.md`, `docs/RELATORIO_MECANICAS_AVANCADAS.md` e `docs/art/PARALLAX_DISTRITO_NEON_HANDOFF.md`;
4. execute `npm run check` e `npm test`.

Esses passos restauram arquivos previstos sem usar Git indisponível e sem tocar assets, releases ou outros trabalhos do usuário.

## Como abrir a fonte atual

```bash
cd /home/flow/Projetos/BoyPunk-Web
npm run dev
```

URL:

```text
http://127.0.0.1:47831/
```

Encerrar o servidor iniciado pelo launcher:

```bash
./iniciar-jogo.sh --stop
```
