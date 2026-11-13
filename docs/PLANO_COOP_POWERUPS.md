# Plano do próximo lote — coop local e power-ups

**Base observada:** código modular 0.4.2 em 2026-11-05  
**Natureza:** documentação e especificação; respawn/rebalanceamento não implementados neste lote

## Funcionamento atual do coop

| Tema | Comportamento real |
| --- | --- |
| Entrada | Somente preview local em `http://127.0.0.1:47831/?coop-preview=1`; não há botão na campanha normal. Exige HTTP em localhost/127.0.0.1. |
| Fase | Apenas Distrito Neon, dificuldade normal, objetivo de 15 almas e altar com 4 PV. Fábrica, bônus, survival, saves e progressão ficam fora. |
| Personagens | P1 é BoyPunk; P2 é Nilo. `model.player` permanece alias de P1 e `model.players` contém os dois. |
| Layouts | P1 teclado + P2 controle, ou P1 controle + P2 controle. O navegador precisa expor cada pad pela Gamepad API; pads genéricos exigem perfil completo. |
| Teclado | A/D ou setas movem; W/seta acima/Espaço pulam; J/X/F atacam; E deposita; Q usa habilidade; Esc pausa. No layout de dois controles, teclado não move/ataca jogadores, mas continua na UI. |
| Controle padrão | Analógico/D-pad move; botão inferior pula/confirma; esquerdo ataca; superior deposita; ombro mapeado usa habilidade; direito cancela; Start pausa. |
| Vida/morte | Cada jogador começa com 4 PV. Não há colisão entre jogadores, incapacitação temporária, revive ou ressurreição. Em zero, fica inativo até retry, perde poderes/tiros e derruba uma vez as almas na última posição segura. |
| Almas/altar | Carga é individual; depósito e meta são compartilhados. Uma alma percorre jogadores vivos em ordem estável e usa `break` após a primeira coleta, portanto não duplica no mesmo tick. |
| Projéteis | Tiros guardam `sourceId`; os dois jogadores compartilham o teto histórico de oito tiros ativos. Tiro do jogador testa sólidos/inimigos, não outros jogadores: não há fogo amigo. Tiro inimigo escolhe o primeiro impacto entre sólidos, jogadores vivos e altar. |
| Alvos inimigos | Chaser busca o jogador vivo mais próximo. Shooter fixa o alvo vivo mais próximo ao iniciar o aviso; empate usa ID. |
| Vitória/derrota | Vitória com 15 almas depositadas. Derrota se altar chega a zero ou ambos ficam inativos. Derrota tem precedência em empate terminal. |
| Lifecycle | Qualquer pad atribuído/Esc pausa. Aba oculta congela e limpa held. Desconexão pausa e bloqueia continuar até reatribuição deliberada. Retry recria a run sem reload e mantém assignments conectados. |

## Poderes e objetivos reais

| Personagem | Habilidade/pickup | Efeito | Alvo | Duração | Recarga | Acumulação | Interação com aliado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BoyPunk | Bola de Pulso (ataque base, não pickup) | 1 projétil aceito; dano/cap existentes | inimigos | projétil 1,25 s | 0,34 s entre ataques aceitos | não acumula comando; cap compartilhado no coop | sem fogo amigo |
| Nilo | Bola de Pulso (ataque base) | mesmo projétil; âncora própria | inimigos | 1,25 s | 0,408 s (multiplicador 1,20) | igual ao ataque base | sem fogo amigo |
| Nilo | Cura Própria (habilidade) | +1 PV, limitado ao máximo | somente Nilo | instantânea | começa indisponível; 20 s de simulação para ficar pronta e 20 s após uso | não armazena cargas; em vida máxima o uso falha e continua pronto | não cura BoyPunk |
| Qualquer personagem de campanha solo | Tiro Rápido (pickup temporário) | cooldown de ataque ×0,5 | coletor | 10 s | sem recarga própria | recoleta restaura 10 s; não soma potência/duração | não compartilhado; desativado no coop atual |
| Qualquer personagem de campanha solo | Vida (pickup de suporte) | +1 PV com clamp | coletor | instantânea | nenhuma | pickup atual é consumido mesmo em vida máxima | não compartilhado; desativado no coop atual |
| Qualquer personagem de campanha solo | Escudo (pickup de suporte) | ignora um impacto e então expira | coletor | até o próximo impacto/reset | nenhuma | booleano: sempre 1 carga, recoleta não empilha | não protege aliado; desativado no coop atual |
| Qualquer personagem de campanha solo | Rajada Dupla (pickup temporário) | dois projéteis por ataque; segundo após 0,12 s | coletor | 10 s | preserva cooldown normal do personagem | recoleta restaura 10 s; independente de Tiro Rápido | não compartilhado; explicitamente desativado no coop atual |
| Ambos no coop | Alma/depósito (objetivo, não poder) | carga individual e progresso de altar compartilhado | primeiro coletor / altar | durante a run | nenhuma | cada alma é removida uma vez | almas derrubadas podem ser recuperadas pelo sobrevivente |

Tiro Rápido, Vida e Escudo nascem uma vez no início de cada campanha normal, em posições fixas. Rajada Dupla é uma tentativa separada: libera após quatro almas recuperadas e fora da primeira fase, vive 12 s e resolve o spawn da run mesmo se expirar. Pausa/aba oculta congelam relógios de simulação. Morte, vitória, menu, retry, bônus, survival e troca de cena limpam os temporários.

## Pendências exatas

- Power-ups estão desativados em `CoopGameModel.powerUpsAllowed()`; por isso ainda não existe coleta atômica de pickup entre P1/P2, estado de TR/RD/escudo integrado por jogador ou respawn.
- `withPlayerContext` e campos `activePowerUp/pendingPlayerShots/ability` já dão base de ownership, mas não constituem feature pronta.
- O cap de oito projéteis é global; precisa de playtest com duas pessoas, sem alteração antecipada.
- Não há revive e este plano não propõe um.
- Não houve teste com dois controles físicos neste lote.

## Especificação do próximo lote pequeno

1. Manter somente coop local na mesma máquina e os dois layouts atuais; nenhum multiplayer online.
2. Guardar temporários, cargas e relógios no jogador proprietário. Objetivo/altar e almas depositadas continuam compartilhados; cargas transportadas continuam individuais.
3. Atualizar temporizadores exclusivamente no fixed-step de simulação. Pausa, aba oculta, lobby e resultado não avançam cooldown nem respawn.
4. Implementar um registro por `spawnId` com estados `disponível → coletado/expirado → aguardando → disponível`. Nunca criar uma nova instância enquanto a anterior existir; retry recria o registro uma vez.
5. Coleta atômica: obter todos os jogadores vivos elegíveis que sobrepõem o pickup no tick; escolher a menor distância entre centros no início do tick; em empate exato, menor slot (P1). Aplicar uma vez e remover uma vez.
6. Vida/cargas máximas: jogador com vida máxima não é elegível à Vida; jogador já protegido não é elegível ao Escudo. Se outro jogador sobreposto for elegível, ele recebe. Se ninguém for elegível, o pickup permanece. TR/RD ativos continuam elegíveis e apenas renovam o relógio.
7. Retry limpa efeitos, filas de rajada, contadores de respawn e entidades antes de semear exatamente uma instância por spawn autorizado.
8. Não respawnar almas, drops de inimigos, metas, objetivos, recompensas de progressão nem a Rajada Dupla roteirizada sem decisão posterior explícita.

## Intervalos candidatos para playtest

Valores abaixo não foram implementados nem balanceados:

| Tipo | Candidato | Justificativa |
| --- | ---: | --- |
| Vida | 18 s após coleta elegível | suporte frequente, mas condicionado a alguém abaixo do máximo; evita consumo inútil |
| Escudo | 24 s após consumo da carga | nega um impacto completo, portanto deve ser menos frequente que cura |
| Tiro Rápido | 22 s após fim/coleta | efeito dura 10 s; o ciclo limita uptime teórico e cria janela sem bônus |
| Rajada Dupla | sem respawn automático | hoje é recompensa roteirizada única. Se um lote futuro decidir incluí-la no pool coop, começar playtest em 30 s, sem sobrepor a instância roteirizada |

Os três pickups flutuantes de suporte devem reaparecer somente em spawns explicitamente autorizados. Expiração sem coleta deve iniciar o mesmo intervalo, sem multiplicar entidades.

## Inventário breve das fases

| Fase/recurso | Situação |
| --- | --- |
| Distrito Neon | fase de campanha implementada; preview coop implementado; parallax decorativo ativo |
| Fábrica de Sucata | fase de campanha implementada; coop não suportado |
| Câmara de Energia | fase bônus implementada; não é fase coop nem recebe power-ups |
| `world.background.cyberlab` | asset registrado/preparado, sem `LEVELS` consumidor; não é fase implementada |
| `distrito-neon-premium-v1` | não existe no workspace atual |

Próximo passo concreto: implementar somente coleta atômica e respawn dos três pickups flutuantes no preview coop, atrás da rota de desenvolvimento existente, com testes determinísticos antes de qualquer balanceamento humano.
