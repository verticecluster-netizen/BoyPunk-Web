# Relatório — combate no modo bônus

Data: 2026-11-05  
Fonte modular: 0.4.2  
Arena: Câmara de Energia (`energy-chamber`)

## Resultado e limite da aprovação

O combate técnico foi integrado à Câmara sem mudar sua geometria, duração de
20 segundos, conjunto de 30 almas, pontuação máxima de 350, canhão, campanha,
Sobrevivência ou progressão. A rodada continua concluindo por todas as almas,
tempo, morte ou saída; derrotar inimigos nunca é requisito.

A implementação e os contratos automatizados estão aprovados. A dificuldade
não está aprovada por playtest humano: Chrome headless foi bloqueado pelo
Crashpad do sandbox e Firefox/Snap não produziu a captura solicitada.

## Regras anteriores e alteração autorizada

Antes deste lote, o bônus não tinha inimigos móveis, dano de combate normal ou
power-ups elegíveis. O canhão já produzia projéteis, mas seu impacto retirava
exatamente 1 segundo, concedia 0,8 s de proteção própria e não alterava vida,
almas, pontos ou velocidade. Ataques do protagonista podiam ser animados pelo
loop comum, porém `powerUpsAllowed`, `updateEnemies` e `applyDamage` excluíam o
estado `bonusPlaying`; portanto não havia combate completo.

Agora o bônus reutiliza ataque, Bola de Pulso, dano, escudo, invulnerabilidade,
Chaser e pickups compartilhados. O canhão preserva integralmente seu contrato
temporal independente. A queda no fosso continua retornando o jogador a
`(18,208)` sem perda de vida e sem parar o relógio.

## Inimigos, limites e spawn

Foi escolhido somente o Chaser existente. É o inimigo móvel compatível com
plataformas de mão única, salto e perseguição já usados na campanha; preserva
3 HP e não acrescenta projéteis ao canhão. Atiradores foram excluídos deste
primeiro balanceamento para não somar simultaneamente quantidade de inimigos e
densidade de tiros. Os dois Chasers surgem em alturas diferentes e mudam entre
patrulha e perseguição, oferecendo pressão móvel sem transformar a rodada em
onda de extermínio.

Valores centralizados em `BONUS_COMBAT_RULES`, em `src/bonus.js`:

| Entrada | Início candidato | Mínimo de tempo restante | Aviso | Pontos candidatos |
| --- | ---: | ---: | ---: | --- |
| Chaser 1 | 3,4 s decorridos | 12 s | 0,75 s | piso direito `(336,208)`; patamar 1 esquerdo `(144,168)`; patamar 2 direito `(368,128)` |
| Chaser 2 | 10 s decorridos | 6,5 s | 0,8 s | patamar 2 esquerdo `(120,128)`; patamar 3 central `(272,88)`; patamar 4 esquerdo `(104,48)`; patamar 4 direito `(352,48)` |

Há no máximo dois inimigos móveis simultâneos e somente duas entradas por
rodada; não existe onda, reposição por abate ou agenda ilimitada. O segundo
spawn é adiado se o jogador estiver com 1 HP sem escudo. Penalidades do canhão
podem reduzir o tempo restante abaixo do mínimo e cancelar a entrada tardia.

Cada ponto é revalidado antes do aviso e no fim do aviso. O corpo 16×32 deve ter
apoio nas duas bordas, ficar fora de sólidos, inimigos, pickups e canhão, manter
104 px do centro do jogador e 10 px de margem das almas. Se qualquer condição
falhar, a tentativa aguarda 0,35 s e procura outra posição; nenhuma posição
inválida é forçada. Chaser que cair além do mundo é removido sem reposição nem
drop, em vez de permanecer preso fora da arena. O aviso é um retângulo tracejado e anel laranja no mundo,
sem ocupar a HUD.

## Ataque, dano, morte e objetivo

- BoyPunk conserva cooldown de 0,34 s; Nilo, 0,408 s. Dano, alcance, velocidade
  de tiro e cap de oito projéteis não mudaram.
- Teclado J/X/F, botão esquerdo sobre o Canvas, touch e botão 2 do gamepad
  convergem para a mesma ação `attack`. O evento de cada projétil preserva o
  personagem real e aciona o som próprio de BoyPunk ou Nilo.
- Chaser conserva 3 HP, dano de contato 1, cooldown de ataque e IA globais.
- Escudo absorve um impacto. Dano aceito concede os 0,9 s de
  invulnerabilidade já existentes. O canhão mantém sua proteção separada de
  0,8 s e sua penalidade exclusivamente temporal.
- Vida zero conclui o bônus com razão `death`, preservando almas e pontuação já
  obtidas. Não apaga a vitória da campanha nem cria penalidade persistente.
- `killEnemy` só gera alma quando `gameMode === "campaign"`; abates no bônus e
  na Sobrevivência não criam almas de objetivo.
- Coletar 30 almas continua encerrando imediatamente, ainda que haja inimigos.
  Nenhum teste ou regra exige eliminar todos.

Ao completar, morrer, esgotar o tempo, pular, voltar ao menu ou iniciar outra
run, o modelo limpa inimigos, projéteis, avisos/agendas, pickups, respawns,
efeitos temporários, escudo, Tiro Rápido, Rajada Dupla e tiros pendentes. O
evento `bonusComplete` e a gravação do resultado continuam protegidos contra
duplicação. A campanha seguinte nasce pelo fluxo existente e não recebe estado
de combate do bônus.

## Pickups e temporizadores

O sistema compartilhado foi validado antes do combate. Foi corrigido um defeito
de apresentação: pickups funcionais da Sobrevivência eram ocultados pelo
renderer fora da campanha. O renderer agora desenha a lista compartilhada nos
modos elegíveis. Checkpoint dessa etapa:
`evidencias/recovery/BoyPunk-Web-shared-pickups-render-20261105.tar.gz`.

Na Câmara, nenhum pickup aparece imediatamente:

| Pickup | Posição | Primeira oportunidade | Respawn após coleta |
| --- | --- | ---: | ---: |
| Tiro Rápido | `(132,180)`, 20×20 | 2,2 s | 6 s |
| Cura | `(112,140)`, 20×20 | 5,8 s | 5 s |
| Escudo | `(320,100)`, 20×20 | 8 s | 5,5 s |
| Rajada Dupla | `(344,64)`, 16×16 | 10,5 s | 5 s |

Os relógios usam somente `dt` de simulação e congelam em pausa/aba oculta. Cura
em vida cheia e Escudo já carregado permanecem no mundo; TR/RD renovam seus 10
segundos e continuam independentes/combináveis. A coleta é atômica. O bônus é
solo: não existe rota cooperativa da Câmara; o coop local atual pertence à
campanha preview e à Sobrevivência, portanto não foi ampliado artificialmente.

## Arquivos alterados e checkpoints

Código: `src/bonus.js`, `src/core.js`, `src/renderer.js`, `src/main.js` e
`src/i18n.js`.

Testes: `tests/bonus-combat.test.mjs` (novo), `tests/bonus.test.mjs`,
`tests/bonus-ui.test.mjs`, `tests/bonus-cannon-renderer.test.mjs`,
`tests/powerups.test.mjs` e `tests/visual-effects.test.mjs`.

Documentação: este relatório, `CONTINUIDADE_BOYPUNK_WEB.md` e
`docs/STATUS_IMPLEMENTACOES_BOYPUNK.md`.

Checkpoint final do combate:
`evidencias/recovery/BoyPunk-Web-bonus-combat-20261105.tar.gz`.
O workspace possui `.git/` vazio, então branch, commit e árvore limpa não podem
ser registrados; os checkpoints são arquivos-fonte recuperáveis, não commits.
Nenhum Studio, portátil ou release foi regenerado.

## Testes executados

Linha de base anterior: `npm run check` aprovado e `npm test` com 33/33 arquivos.

Estado final:

- direcionados de pickups compartilhados: 3/3 arquivos aprovados;
- `tests/bonus-combat.test.mjs`: 8 casos internos aprovados;
- rotas determinísticas: 30/30 almas com combate e também com uma penalidade
  manual de 1 segundo do canhão;
- `npm run check`: aprovado;
- `npm test`: 34/34 arquivos aprovados, zero falhas, cancelamentos ou ignorados.

A cobertura inclui entrada segura, adiamento durante aviso, limite e finitude,
3 HP, teclado/mouse/gamepad, Nilo e evento de som, TR/RD, Cura, Escudo,
invulnerabilidade, respawn, pausa, independência dos abates, morte, timeout,
conclusão, cleanup e evento terminal único. Testes de coop existentes continuam
verdes, mas não representam coop no bônus.

Tentativas de navegador:

- Chrome headless: bloqueado antes da página por Crashpad,
  `setsockopt: Operation not permitted`;
- Firefox headless: processo encerrou com código 0, porém não criou a captura;
- nenhuma imagem foi aceita como evidência e não houve alegação de aprovação
  visual, auditiva, de controle físico ou de dificuldade.

## Roteiro manual de dificuldade

1. Executar `npm run dev` e abrir
   `http://127.0.0.1:47831/?bonus-preview=1`.
2. Jogar uma rodada sem atacar: confirmar 3,4 s de orientação/aviso, máximo de
   dois Chasers, ausência de spawn em cima do jogador e possibilidade de manter
   foco nas almas.
3. Repetir atacando com J/X/F, clique esquerdo e gamepad; testar BoyPunk e Nilo,
   ouvir os dois timbres e confirmar 3 impactos por Chaser.
4. Coletar TR e RD separadamente e juntos; observar cooldown, segundo tiro de
   0,12 s e cap. Coletar Cura após dano e Escudo antes do contato.
5. Permanecer sobre um aviso para fazê-lo cancelar; liberar a área e confirmar
   nova tentativa segura. Verificar que nenhuma alma fica bloqueada.
6. Pausar durante aviso, respawn e efeitos ativos; todos os relógios devem
   congelar. Retomar sem duplicar entidade.
7. Completar 30 almas sem matar todos; depois matar ambos e confirmar que o
   contador de almas não sobe por abate.
8. Testar morte, timeout, conclusão, replay, menu e continuação à Fábrica;
   observar uma única tela/recompensa e nenhuma entidade residual.
9. Repetir em 1×/2×, movimento reduzido, tela pequena e com dispositivo físico.
10. Registrar tempo médio, mortes, almas faltantes e pontos de dano inevitável.
    Só então aprovar ou recalibrar os valores centralizados.

## Conclusão

Implementação técnica: concluída e validada automaticamente.  
Aprovação de balanceamento/dificuldade: pendente de playtest humano.
