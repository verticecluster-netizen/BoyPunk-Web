# Passagem do Atirador de Patrulha para Antigravity

Data: 2026-10-28  
Fonte: BoyPunk! Web 0.2.6  
Escopo original: Fase 2A sem power-ups; ativação final registrada abaixo

## Status final após revisão Codex — 2026-10-28

- Arte aprovada para integração: 17 frames dedicados 32×32 RGBA, articulação,
  chão, pivô e boca verificados. O gerador reproduziu hashes idênticos.
- Campanha ativada: `campaignEnabled: true`. Survival e demo continuam `false`.
- O sprite de fire recebeu persistência visual de 0,08 s após tiro real para
  não desaparecer entre quadros de 60 Hz; o estado lógico continua 1/120 s.
- Substituição final: 1/2 dos ranged elegíveis em `confronto`, `reta-final`,
  `compactacao` e `expedicao`; sem aumento de custo, budget, caps ou eventos.
- `npm run check` e 23/23 arquivos de `npm test` aprovados. Browser Codex
  pendente por `listen EPERM`; evidências Antigravity revisadas como staged.

O restante deste documento preserva o contrato e o histórico pré-arte.

## Identidade e status

- Identificador novo e estável: `kind: "patrol-shooter"`.
- O `kind: "shooter"` existente continua sendo a torreta montada, imóvel, com
  colisor 24×24. Campanha, sobrevivência e demo continuam usando essa unidade.
- O novo inimigo é uma variante móvel distinta. A lógica está completa e
  testada, porém `campaignEnabled`, `survivalEnabled` e `demoEnabled` estão
  `false` em `BALANCE.encounter.patrolShooter`.
- Motivo do gate: não existe ciclo de locomoção compatível no acervo. A pose
  `ready` não é deslizada para simular caminhada. O preview mostra o colisor
  durante a patrulha e reutiliza a torreta somente quando ela para para mirar,
  disparar e recuperar.

## Máquina de estados

`patrol → aim → fire → recovery → patrol`

| Estado | Movimento | Duração/saída | Apresentação atual |
|---|---|---|---|
| `patrol` | 34 px/s, gravidade e `moveBody`; reverte antes de borda/parede | mínimo 0,75 s; depois exige jogador no alcance e LOS livre | somente colisor no preview debug; arte pendente |
| `aim` | parado | 0,90 s; alvo travado ao entrar | `turret.ready.0`, linha tracejada e moldura crescente |
| `fire` | parado | 1/120 s; uma tentativa | compromisso sem novo lock de mira |
| `recovery` | parado | 1,25 s | `turret.shooting.0..3` nos 0,28 s iniciais, depois `ready` |

O alvo selecionado é somente o jogador. O ponto fica travado no começo de
`aim`, então o jogador tem 0,90 s para sair da trajetória. O aviso nunca causa
dano. A LOS é testada contra a mesma geometria sólida que bloqueia projéteis,
antes do aviso e novamente no fogo. Plataforma `oneWay` permanece atravessável
para o projétil, como no contrato existente.

Se caps, intervalo global de 0,72 s ou LOS negarem o tiro, a unidade entra em
`recovery`; não guarda tiro nem produz rajada posterior. O projétil nasce na
boca, causa no máximo um dano pelo swept-AABB compartilhado e pode acertar o
altar somente se este interceptar a trajetória travada para o jogador.

## Configuração autoritativa

Tudo está centralizado em `src/config.js`, sem override duplicado:

| Parâmetro | Valor | Unidade/nota |
|---|---:|---|
| colisor | 16×32 | px; origem física no canto superior esquerdo |
| velocidade de patrulha | 34 | px/s; 22,7% dos 150 px/s do jogador |
| folga de borda | 3 | px |
| patrulha mínima | 0,75 | s |
| aviso/mira | 0,90 | s |
| compromisso de fogo | 1/120 | s |
| recuperação | 1,25 | s |
| alcance | 210 | px |
| projétil | 118 | px/s, igual à torreta fixa |
| boca | centro X ±10; Y +13 | px no mundo, conforme `facing` |
| custo de encontro | 2 | igual à torreta fixa |
| ranged ativos | 2 | teto compartilhado futuro |
| substituição futura | 1 a cada 2 | somente slots ranged tardios elegíveis |

A dificuldade não multiplica esses valores. Ela continua alterando os budgets,
caps e intervalos já existentes uma única vez. O dano permanece 1; vida
jogador/altar e impactos para derrota continuam 6/6 no fácil, 4/4 no normal e
3/3 no difícil.

## Rotas e futura ativação

Não houve alteração de geometria. Cada rota declara os limites do `x` do
colisor e é validada por apoio contínuo, sólidos, mundo e ocupação no spawn.

| Nível | Slot | Spawn | Faixa X do colisor |
|---|---|---:|---:|
| Distrito Neon | `district-ground-left` | 64,208 | 24..184 |
| Distrito Neon | `district-upper-left` | 40,80 | 16..160 |
| Distrito Neon | `district-upper-right` | 400,80 | 304..448 |
| Fábrica de Sucata | `factory-ground-right` | 384,208 | 280..448 |
| Fábrica de Sucata | `factory-mid-left` | 150,80 | 112..194 |
| Fábrica de Sucata | `factory-mid-right` | 304,80 | 270..352 |

Quando a arte for aprovada e `campaignEnabled` for deliberadamente ligado, a
seleção determinística substituirá um de cada dois spawns ranged elegíveis, sem
aumentar contagem, custo ou caps. Fases elegíveis: `confronto`, `reta-final`,
`compactacao` e `expedicao`; as janelas introdutórias ficam intactas. Survival
e demo seguem excluídos até validação própria.

## Contrato de arte solicitado

Arte existente compatível enquanto parado:

- `enemytorreta-ready-000.png`: 32×32;
- `enemytorreta-shooting-000..003.png`: 32×32;
- `enemytorreta-created-000..004.png`: 16×32, implantação;
- `enemytorreta-out-000..004.png`: 16×32, retração, ainda não registrada no
  manifesto.

`created/out` são transformação vertical de torreta, não caminhada. Para ativar
a campanha, entregar um ciclo de locomoção mecânica coerente — este inimigo não
deve virar humanoide. Sugestão de contrato:

- `enemytorreta-patrol-000..007.png`, PNG RGBA transparente, 32×32;
- orientação canônica para a esquerda; o runtime espelha para a direita;
- oito frames em loop, desenhados a 12 fps sem deslocar a raiz dentro do canvas;
- pés/esteira/apoio na linha Y=32 e pivô físico em X=16, Y=32;
- colisor 16×32 centralizado: o sprite é desenhado em `body.x - 8, body.y`;
- boca canônica esquerda em X=6, Y=13; espelhada direita em X=26, Y=13;
- silhueta e contato com o piso estáveis em todos os frames, sem antecipação que
  ultrapasse o colisor nas bordas;
- opcional: um frame de frenagem/assentamento que possa preceder `ready`, sem
  alterar o momento lógico em que a mira trava.

Hooks já prontos: `enemy.phase`, `enemy.animTime`, `enemy.facing`,
`enemy.recoilTime`, `enemy.aimX/Y` e a linha/moldura de warning em
`Renderer.drawEnemies`. O relógio de animação só zera na troca de estado e não
controla disparos.

## Preview e validação

Iniciar a fonte:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh --no-open
```

Abrir:

`http://127.0.0.1:47831/?patrol-shooter-preview=1`

O preview só é aceito em HTTP local, força o overlay existente, bloqueia spawns
normais e desliga progressão e qualificação do bônus. Nenhuma regra do canhão
da Câmara foi tocada.

Testes automatizados: `tests/patrol-shooter.test.mjs` cobre rotas, spawn,
reversão, apoio, estados, lock, LOS, bloqueio, tiro único, caps, warning sem
dano, pausa, remoção, restart, dificuldades e isolamento de modos.
`tests/renderer.test.mjs` garante que a pose estática não desliza e que o aviso
usa a âncora correta quando parado. A regressão de colisão da Fase 1 permanece
na suíte integral.

Limitação anterior: o bind havia falhado por concorrência de sandbox (`listen EPERM 127.0.0.1:47831`), deixando a observação em browser pendente. Nesta rodada de arte, o servidor local ativo foi reutilizado com sucesso na porta 47831 e validado por Chrome headless com CDP.

## Conclusão da Arte e Animação por Antigravity (2026-10-28)

### 1. Assets Entregues e Origens
- Gerador local determinístico: `tools/build-patrol-shooter-sprites.py`.
- 17 quadros de animação em `assets/images/enemies/`:
  * Patrulha: `enemypatrolshooter-patrol-000..007.png` (8 frames, 32×32 RGBA).
  * Compatibilidade: `enemytorreta-patrol-000..007.png` (8 frames, 32×32 RGBA).
  * Mira telegrafada: `enemypatrolshooter-aim-000..003.png` (4 frames, 32×32 RGBA).
  * Disparo: `enemypatrolshooter-fire-000.png` (1 frame, 32×32 RGBA).
  * Recuperação e resfriamento: `enemypatrolshooter-recovery-000..003.png` (4 frames, 32×32 RGBA).
- Todos os arquivos possuem fundos transparentes, contornos pretos sólidos de 1 pixel (`#000000`), paleta mestre grafite com detalhes ciano e laranja, e hashes SHA-256 estritamente únicos entre si.

### 2. Dimensões, Âncoras e Mapeamentos
- **Canvas:** 32 × 32 pixels RGBA.
- **Colisor físico:** 16 × 32 pixels (`BALANCE.encounter.patrolShooter.width / height`).
- **Pivô e Alinhamento:** Centralizado no canvas; corpo renderizado em `(enemy.x + enemy.w / 2 - 16, enemy.y)` com pés alinhados na linha `Y = 31` (solo físico `Y = 32`).
- **Orientação canônica:** Voltado para a esquerda (`facing < 0`, sem espelhamento). Quando voltado para a direita (`facing > 0`), o renderer inverte horizontalmente via matriz (`scale(-1, 1)`).
- **Âncora da boca da arma:** Posição local exata em `(6, 13)` na orientação canônica esquerda, alinhando-se matematicamente com o projétil disparado pelo núcleo de gameplay em `enemy.x + enemy.w / 2 + enemy.facing * 10, enemy.y + 13`.

### 3. Contagem de Quadros, Cadência e Estados
- `patrol`: 8 frames a 12 fps em loop contínuo, cobrindo contato alternado, amortecimento com flexão de joelho, passagem com folga do piso e extensão de perna. Cadência calibrada para a velocidade autoritativa de 34 px/s sem deslizar.
- `aim`: 4 frames a 4,44 fps (duração 0,90 s) demonstrando travamento da postura, ativação do sensor óptico ciano e pré-carga de capacitores na mira.
- `fire`: 1 frame instantâneo (1/120 s) com flash de plasma ciano/branco e recuo mecânico.
- `recovery`: 4 frames a 14,28 fps cobrindo os 0,28 s de recuo mecânico seguidos de dissipação térmica e restabilização da postura.

### 4. Alterações no Renderer
- `src/renderer.js`:
  * Adicionado import de `PATROL_SHOOTER_ANIMATIONS`.
  * `Renderer.drawEnemies` atualizado para resolver `patrolShooter.patrol.*` (ou `turret.patrol.*`), `patrolShooter.aim.*`, `patrolShooter.fire.0` e `patrolShooter.recovery.*`.
  * Se nenhum quadro de caminhada for encontrado (como nos mocks unitários de torreta isolada), preserva-se o comportamento seguro de desenhar apenas o colisor de debug sem deslizar frames estáticos.
  * O feixe de aviso e a caixa de travamento são renderizados a partir da âncora real do cano em `(muzzleX, muzzleY)`.

### 5. Validação em Browser e Testes
- Suíte automatizada: `npm run check` aprovado e `npm test` aprovado em **187 testes (zero falhas)**.
- Testes dedicados em `tests/assets.test.mjs` confirmam integridade de dimensões e hashes de todas as animações.
- Testes em `tests/renderer.test.mjs` confirmam avanço de quadros no relógio do jogo e espelhamento correto.
- Teste determinístico CDP em browser Chrome headless (`tools/record-patrol-shooter-evidence.mjs`):
  * 194 amostras de animação capturadas no renderer confirmando avanço dos 8 frames a 12 fps.
  * Caminhada observada em ambos os sentidos (facing -1 e facing 1 com reversões estáveis).
  * Aviso telegrafado e retículo travados durante 0,90 s sem causar dano.
  * Disparo e recuo executados com sucesso.
  * Pausa congela o relógio e a posição; reinício zera a cena sem tiros residuais.

### 6. Flags de Ativação Inalteradas
- `BALANCE.encounter.patrolShooter.campaignEnabled = false`.
- `BALANCE.encounter.patrolShooter.survivalEnabled = false`.
- `BALANCE.encounter.patrolShooter.demoEnabled = false`.
- As regras de ativação e de substituição permanecem sob controle do Codex.

### 7. Evidências e Próxima Ação
- Evidências salvas em `evidencias/art/patrol-shooter/`:
  * `folha-de-contato-animacao.png`
  * `comparacao-native.png`
  * `comparacao-enlarged-4x.png`
  * `animacao-patrol-shooter.gif` / `animacao-patrol-shooter.webp`
  * Screenshots de runtime e crops do browser nos 5 estados.
- **Comando de visualização:**
  ```bash
  /home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh --no-open
  ```
  Abrir: `http://127.0.0.1:47831/?patrol-shooter-preview=1`
- **Ação solicitada ao Codex:** concluída na revisão registrada no topo deste
  documento; `campaignEnabled: true` após regressões e auditoria.
