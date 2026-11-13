# Passagem de Power-ups para Antigravity — Rajada Dupla

Data: 2026-10-28  
Fonte: BoyPunk-Web 0.2.6  
Estado: lógica funcional; apresentação provisória pronta para substituição

## Contrato implementado

O registro autoritativo é `POWER_UPS["double-burst"]`, nome público
**Rajada Dupla**. Uma coleta ativa exatamente dois projéteis por ataque aceito
durante 10 segundos de gameplay ativo. O primeiro sai imediatamente e o segundo
após 0,12 s pelo fixed-step existente. Recoleta restaura o restante para 10 s;
não acumula quantidade, dano nem duração.

Cada projétil continua 8×8, 330 px/s, vida de 1,25 s, mesmo dano/recompensa,
swept-AABB e bloqueio em sólidos da Bola de Pulso normal. O cooldown entre
ataques aceitos continua 0,34 s. O atraso pedido cabe nessa cadência e não foi
alterado. A direção da rajada é capturada na aceitação; a segunda boca é
calculada na posição corrente do jogador. Com oito tiros do jogador ativos, a
tentativa é descartada uma única vez e não fica como dívida.

Efeito, pickup e delay congelam com pause/aba oculta. Burst já aceito termina
mesmo se os 10 s expirarem. Morte, vitória, menu, restart, survival, bônus e
troca de cena removem efeito, pickup e fila. O estado é efêmero e não entra em
saves, recordes ou progressão.

## Spawn de campanha

O trigger único é `depositadas + carregadas >= 4`, primeira saída da fase
introdutória. O pickup vive 12 segundos ativos. Expiração resolve a tentativa
da run e nunca gera reposição repetida. Existe no máximo um pickup não coletado.

| Nível | Fase ao liberar | Placement ID | Corpo/posição | Apoio |
|---|---|---|---|---|
| Distrito Neon | `alerta` | `district-double-burst` | 16×16 em `(180,160)` | sólido `x=144..304`, topo `y=176` |
| Fábrica de Sucata | `separacao` | `factory-double-burst` | 16×16 em `(372,160)` | one-way `x=352..464`, topo `y=176` |

Ambas as rotas foram coletadas em simulação determinística pelo movimento e
salto reais (salto duplo no Distrito e salto simples na Fábrica). A validação
rejeita mundo/sólido, falta de apoio integral, altar, almas colocadas e corredor
da prensa. Não há mudança de geometria, objetivo ou budget de encontro.

Demo, survival, Câmara de Energia, preview do patrol-shooter e demais previews
não recebem pickup nem efeito. Não foi criado preview próprio, evitando uma
nova rota de progressão. Para inspeção em desenvolvimento, inicie campanha
normal, recupere quatro almas e colete a caixa no ponto acima; essa sessão usa
o estado efêmero normal e não exige alteração de save.

## Hooks de apresentação

- Mundo: `model.powerUpPickup` fornece `typeId`, `x`, `y`, `w`, `h` e
  `remaining`. O desenho atual é procedural/provisório: caixa 16×16, dois
  pulsos e texto `×2`; bob visual de 1,5 px é desligado em reduced motion e não
  altera o colisor.
- HUD: `model.activePowerUp = { id, remaining }`. A faixa mostra
  `Rajada Dupla ×2` e décimos de segundo vindos do modelo. Some no mesmo tick da
  expiração.
- Confirmação: evento `powerUpCollected`, notice localizado
  `powerup.doubleBurst.collected` e efeito `powerUpCollect` com `×2`. O áudio de
  coleta já existente é reutilizado; nenhum asset sonoro foi adicionado.
- Ataque: eventos `doubleBurstAccepted`, `playerShotEmitted` e
  `burstShotDropped` são diagnósticos de integração. Animação nunca cria tiro.

## Asset solicitado para substituir o provisório

Preferência: quatro frames PNG RGBA de 16×16 para
`powerUp.double-burst.idle.0..3`, mantendo canvas e origem top-left constantes.
A linha de apoio deve ser Y=15 (base lógica em Y=16), sem sombra opaca fora do
canvas. O símbolo precisa comunicar **dois disparos**, não apenas depender de
cor; preservar o `×2` ou dois núcleos legíveis. O renderer poderá amostrar os
frames pelo tempo de simulação, aproximadamente 8 fps, e espelhar nenhum deles.

Não deslocar o corpo 16×16 nem usar animação para coleta/combate. Uma arte maior
pode ser renderizada com origem documentada, mas gameplay continua no corpo
acima. HUD aceita um ícone de até 12×12 antes do texto, sem alterar o timer.

## Testes e limitações

`tests/powerups.test.mjs` cobre configuração, baseline de um tiro, dois tiros e
delay, cooldown, direção/origem, colisões independentes, expiração/refresh, os
dois spawns e rotas, cap, pause/aba oculta, lifecycle, modos excluídos e
renderer. Regressões de colisão, patrol-shooter, bônus, demo, core, i18n e
renderer também passaram na rodada focada.

A apresentação atual é honesta, funcional e acessível por texto, mas ainda não
tem arte dedicada nem avaliação humana de saliência contra os dois cenários.
Validar em hardware real: leitura do pickup, colisão visual com os pés, faixa
do HUD em PT/EN e clareza das duas Bolas de Pulso a 60/120 Hz.

Comando:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh --no-open
```

Abrir `http://127.0.0.1:47831/`; recuperar quatro almas no Distrito/Fábrica.
Teste automatizado isolado: `node --test tests/powerups.test.mjs`.

## Conclusão da Entrega — Assunção Antigravity (2026-10-28)

- **Estado:** 100% Concluído e Validado em Navegador Real.
- **Checkpoint:** `evidencias/recovery/BoyPunk-Web-pre-phase2b-takeover-20261028.tar.gz` (SHA-256 `ed3c73d53b61cc85ad014fea7c5c4246a96af9d5e3dcbb2fbe8d51b467257678`).
- **Assets Entregues:**
  - 4 frames 16×16 RGBA: `assets/images/world/powerup-double-burst-idle-000..003.png`.
  - Chassi de grafite usinado, acentos ciano neon e duplo núcleo de plasma âmbar.
  - Alinhamento de base Y=15 repousando perfeitamente sobre o topo do chão físico em Y=16 (mundo Y=176).
  - Flutuação sutil de 1,5 px com sombra de contato projetada na plataforma (desligada em `reducedMotion`).
- **Apresentação e HUD Polido:**
  - Resposta visual de coleta (`drawEffects`): onda de choque radial gradiente âmbar/ciano, duplo feixe de fagulhas radiantes e texto `×2`.
  - Painel HUD compacto: 136×18 px no topo esquerdo, ícone 10×10 px do cartucho com dois núcleos, texto localizado (`Rajada Dupla ×2  {remaining}s` / `Double Burst ×2  {remaining}s`), medidor de duração em barra (2 px) e sinalização de tempo crítico (`remaining <= 2.5s`).
  - Sem layout jumps: banner de aviso rebaixado para `y = 73` quando ativo e restaurado para `y = 51` na expiração.
- **Evidências Registradas em `evidencias/art/powerups/`:**
  - `01-district-pickup-appearance.png` & crop: pickup no Distrito Neon em `(180, 160)`.
  - `02-double-burst-collected-hud.png` & crop: coleta, choque visual e HUD ativo.
  - `03-double-burst-attack-two-shots.png` & crop: dois projéteis emitidos com atraso de 0,12 s.
  - `04-double-burst-hud-countdown.png` & crop: contagem regressiva e aviso low-time.
  - `05-double-burst-expired-normal.png`: expiração limpa e retorno a 1 tiro normal.
  - `06-factory-pickup-appearance.png` & crop: pickup na Fábrica de Sucata em `(372, 160)`.
  - `07-pickup-uncollected-expired.png`: pickup expira em 12 s sem respawn.
  - `08-pause-freeze-timers.png`: timers congelados em pausa.
  - `09-player-death-clears-powerup.png`: derrota do jogador limpando efeito e projéteis.
  - `10-narrow-viewport-hud.png`: leitura de HUD em tela mobile 640×360.
  - `double-burst-contact-sheet.png`, `double-burst-cartridge-idle-loop.gif`, `double-burst-before-after-comparison.png`.
- **Suíte de Testes:** 210 testes aprovados em 24 arquivos (`npm test`), `npm run check` 100% aprovado.
