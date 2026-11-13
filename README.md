# BoyPunk! Web 0.4.2

Dois níveis jogáveis em HTML5 Canvas 2D e JavaScript próprio, sem editor,
runtime ou serviço do Construct 3. Distrito Neon mantém a arte consolidada; a
Fábrica de Sucata mantém o gameplay consolidado com a arte industrial integrada
da Antigravity.

## Jogar no computador de desenvolvimento

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh
```

O launcher usa o endereço estável `http://127.0.0.1:47831/`, valida que o
processo pertence a este projeto pela raiz canônica, reutiliza somente esse
servidor e nunca escolhe outra porta silenciosamente. O bind é restrito a
loopback; isso não equivale, isoladamente, a uma política completa de segurança.
Para encerrar:

```bash
/home/flow/Projetos/BoyPunk-Web/iniciar-jogo.sh --stop
```

Para abrir diretamente a Câmara de Energia em uma prévia de desenvolvimento:

```bash
/home/flow/Projetos/BoyPunk-Web/abrir-bonus.sh
```

Essa rota reutiliza o servidor do projeto e a arena real, mas não qualifica,
desbloqueia níveis, grava recordes nem concede pontos persistentes. O botão de
repetição reinicia a prévia; Menu retorna ao fluxo normal.

## Jogar a versão portátil

O build Studio corrente é
`studio-builds/BoyPunk-Studio-v0.4.2.html`; abra-o diretamente por duplo clique.
Ele consolida o marco visual 0.4.1 e a correção 0.4.2 que desacopla Rapid Fire
de Double Burst, mantendo HUD estável, menus responsivos, Nilo, Cura Própria,
i18n pt-BR/en e o carregador compatível com WebKit. A verificação estática
standalone passou; a execução `file://` ainda precisa ser validada pelo estúdio
em um navegador fora do sandbox, conforme `RETOMADA_BOYPUNK.md`.

O build gera `dist-portable/JOGAR.html`. Esse arquivo contém bundle JavaScript,
CSS, dados, imagens, fonte e áudios necessários. Após extrair o pacote de release,
o destinatário abre `JOGAR.html` por duplo clique; não precisa instalar Construct,
Node, Python nem iniciar localhost.

## Objetivo e controles

A única fonte da meta é `BALANCE.objective.soulsGoal` em `src/config.js`: **15
almas depositadas**. O HUD separa almas carregadas das depositadas e mostra vida,
integridade do altar e a instrução de depósito quando ela é aplicável. BoyPunk
começa com **4/4 de vida** e o altar com **4/4 de integridade**, definidos na
mesma configuração autoritativa.

- A/D ou ←/→: mover.
- W, seta para cima ou Espaço: salto e salto duplo.
- J, X, F ou botão esquerdo sobre o Canvas: atacar.
- E: depositar junto ao altar.
- Esc: pausar/retomar.
- Toque: controles simultâneos de movimento, salto, ataque, depósito e pausa.
- Controle padrão: analógico esquerdo ou D-pad move; botão inferior pula e
  confirma; botão esquerdo ataca; botão superior deposita; botão direito volta;
  Start/Menu pausa e retoma.

### Controles USB e genéricos

O jogo usa a Gamepad API nativa. Controles conectados antes da carga ou durante
a sessão aparecem em **Opções → Controle**. Quando não há preferência anterior,
pressione um botão deliberadamente para atribuir o dispositivo ao jogador 1.
Somente o controle selecionado fornece ações; outros dispositivos conectados
não são combinados com ele.

Controles com `mapping === "standard"` usam o mapa acima. Para dispositivos
genéricos ainda sem perfil, a ativação deliberada no menu abre automaticamente
o assistente em Opções. Também é possível selecionar o aparelho e executar
**Mapeamento guiado**: solte todos os
comandos antes de cada captura, configure os cinco botões, mova o eixo
ou D-pad nas quatro direções. A captura reconhece eixo ou botão sem inferir pela
marca. A mesma seção permite escolher/inverter eixos,
mapear direções quando um D-pad genérico aparece como botões, ajustar a zona
morta, ver botões/eixos ao vivo e restaurar padrões. O navegador
ou sistema operacional precisa expor o dispositivo; remapeamento não corrige
hardware ausente da Gamepad API.

A entrada é organizada por provedor e slot: teclado/toque e o controle
explicitamente atribuído alimentam o slot 1. Um futuro slot 2 pode anexar outro
provedor à mesma interface `InputController.snapshot(2)` e ser consumido no
mesmo fixed-step; não deve criar um segundo loop de simulação. Não há
multiplayer ou segundo personagem nesta versão.

## Modo demonstração

Após a carga inicial, o jogo entra numa demonstração autônoma da própria fase 1.
O mesmo modo pode ser aberto por **Assistir demonstração** no menu e começa após
120 segundos sem interação no menu principal. Enter, Espaço, Esc ou um
clique/toque deliberado encerra a demonstração e abre o menu. Uma ação
significativa do controle faz o mesmo, sem reaproveitar a pressão para iniciar a
partida.

O controle local usa a física, colisões, inimigos, dano, coleta e depósito da
partida normal, com semente fixa por tentativa. Derrota, vitória, estagnação ou
o limite de duração iniciam outra tentativa após uma pausa curta. A demonstração
não salva progresso; preferências de volume e mudo continuam preservadas.

## Vitória e progressão

Ao depositar as **15 almas** configuradas, a fase congela os valores finais,
mostra uma resposta breve do altar e abre o resumo “Distrito Neon concluído!”. O
tempo exibido conta somente gameplay ativo; pausa e apresentação final não entram
na medida. A tela informa almas, vida e integridade restantes e oferece jogar
novamente ou voltar ao menu.

Vitórias reais salvam a conclusão de `district-neon` e desbloqueiam
`scrap-factory`. A Fábrica de Sucata agora está **disponível** pelo menu e pelo
botão de continuidade da vitória; unlock e disponibilidade continuam sendo
estados separados. Sua conclusão também é salva, sem criar ou desbloquear uma
terceira fase. A progressão usa o registro versionado
`boypunk-web-progression-v1`; preferências de áudio permanecem em sua chave
independente. Demo, previews de teste e derrotas não concedem progresso.

Vitórias reais também avaliam uma qualificação congelada: 50 pontos pela
vitória, mais 25 se BoyPunk terminar com ao menos 75% da vida máxima e 25 se o
altar terminar com ao menos 75% da integridade máxima. Com 75 pontos ou mais,
uma transição acessível oferece a **Câmara de Energia**; pular nunca apaga um
recorde existente.

## Câmara de Energia

- arena bônus reutilizável de 20 segundos, sem inimigos, altar ou perigos de
  dano, com 30 almas bônus de IDs únicos;
- movimento, colisão, salto e salto duplo são os mesmos da campanha; quedas no
  vão central devolvem BoyPunk ao ponto seguro sem parar o cronômetro;
- pausa e página oculta não consomem tempo ativo;
- cada alma vale 10 pontos e coletar as 30 concede mais 50, para máximo de 350
  por nível de origem;
- o save v1 compatível ganhou `bonusBestScores`; o total é derivado dos melhores
  resultados por nível. Só a diferença positiva de um novo recorde conta como
  pontos novos;
- o resultado oferece continuar para a Fábrica quando ela existe e está
  desbloqueada, repetir a campanha de origem ou voltar ao menu. A conclusão da
  Fábrica nunca aponta para uma terceira fase inexistente.

O layout v3 distribui as 30 almas em 8 acessíveis, 14 intermediárias e 8
avançadas. Vãos alternados de 48/64 px evitam recaptura pela borda e quedas por
vários patamares. Um canhão fixo telegrafa e trava a mira antes de disparar; um
acerto tira exatamente 1 segundo, sem dano, knockback ou perda de pontos. A rota
automatizada com o canhão ativo completa 30/30 em 17,408 s, evadindo cinco
tiros; isso prova alcance pela física, não equivale a playtest humano. Pontuação
e saves da versão anterior continuam compatíveis.

As almas bônus são isoladas de almas carregadas/depositadas da campanha. Demo e
o fluxo normal em `?test=1` não qualificam nem gravam recompensas.

## Continuidade de saves ao mudar a porta

O menu **Opções** oferece **Exportar dados do jogo** e **Importar dados do jogo**. O JSON contém
somente `boypunk-web-progression-v1` (conclusões, desbloqueios e melhores bônus),
`boypunk-web-audio-v1` (volume/mudo) e `boypunk-web-gamepad-v1` (identidade
lógica selecionada, zona morta e perfis). A importação v2 valida o formato, une
conclusões/desbloqueios e conserva o maior recorde de cada fase; nunca lê ou
exporta armazenamento de outros sites. Arquivos de transferência v1 continuam
aceitos e não apagam preferências de controle. Como `localStorage` é separado por
origem, exporte no endereço antigo antes de importar em `127.0.0.1:47831`.

Passos exatos de migração e a situação da origem anterior estão em
`RETOMADA_BOYPUNK.md`. A migração só está concluída depois que níveis, pontos
bônus, volume, mudo e perfil de controle forem conferidos na nova origem.

## Informações para teste de estúdio

O menu mostra discretamente o identificador autoritativo da fonte atual:
`0.4.2`. Ao relatar um problema, use:

```text
Versão exibida no menu:
Sistema operacional:
Navegador e versão:
Passos para reproduzir:
1.
2.
3.
Resultado esperado:
Resultado observado:
Captura ou vídeo (opcional):
```

Checklist mobile manual, sempre em paisagem e sem expor o servidor à rede:

- abrir menu, Opções e voltar; confirmar rolagem em tela curta;
- mover enquanto salta e ataca com três toques;
- pausar, continuar, recomeçar e retornar ao menu;
- tentar novamente após derrota e confirmar a fase correta;
- pular bônus e navegar pelo resultado somente por toque;
- durante a Câmara, pausar, trocar de aba/aplicativo e retornar;
- verificar safe areas, ausência de scroll da página e alvos confortáveis;
- confirmar exportação/importação usando arquivo local de teste.

Emulação touch de navegador não substitui validação em aparelho Android/iOS.

Checklist manual de controle:

1. Conectar o controle, abrir o jogo e pressionar um botão para atribuí-lo.
2. Em Opções, selecionar o dispositivo e conferir botões/eixos ao vivo.
3. Testar movimento + salto + ataque simultâneos, depósito e pausa/retomada.
4. Navegar por menu, opções, vitória, derrota, bônus, retry e seleção de fase.
5. Desconectar durante a partida: confirmar ações limpas e pausa segura.
6. Reconectar, soltar todos os comandos, pressionar um botão e retomar.
7. Para controle genérico, mapear, recarregar a página e confirmar o perfil
   salvo. Registrar sistema, navegador e identificação exibida pelo navegador.

## Bola de Pulso

O ataque existente mantém origem, velocidade, alcance, cadência, dano, timing e
colisor. A apresentação agora acrescenta arco laranja curto sincronizado à
animação, núcleo ciano/branco dentro do corpo 8×8, trilha ciano curta e faíscas
pequenas somente em colisões confirmadas. Esses elementos são decorativos,
limitados por tempo/quantidade e reduzidos com a preferência de movimento
reduzido.

## Fábrica de Sucata — nível jogável com arte integrada

- arena industrial compacta com altar e spawn em zona segura à esquerda;
- meta de 15 almas, BoyPunk 4/4 e altar 4/4, vindos da configuração compartilhada;
- duas rotas de retorno e rota elevada opcional alcançável pelo salto duplo;
- combinações controladas dos perseguidores e atiradores existentes, limitadas a
  quatro inimigos e dez projéteis;
- uma prensa hidráulica em ciclo determinístico
  `Idle → Warning → Closing → Recovery` no mesmo relógio da simulação;
- o aviso combina tremor/chevrons descendentes e cor. Só `Closing` causa um dano
  por ciclo, respeita invulnerabilidade e nunca atinge altar ou inimigos;
- retry preserva o nível atual; vitória e derrota exibem o nome e os valores da
  Fábrica. O attract mode permanece deliberadamente no Distrito Neon.

Coordenadas, contratos visuais e histórico da integração artística estão em
`PASSAGEM_FABRICA_PARA_ANTIGRAVITY.md`.

## Fase 1 refinada

- janela inicial segura de 4,5 s;
- quatro estágios finitos de encontro ligados às almas recuperadas;
- orçamento por estágio, máximo de cinco inimigos e doze projéteis globais;
- perseguidor com física, paredes, plataformas e salto de obstáculo;
- atirador com mira travada, aviso, disparo evitável, recuperação e intervalo
  global entre tiros, preservando rotas de fuga;
- três almas posicionadas em plataformas para estimular movimento;
- feedback de acerto, dano, coleta, depósito, avanço e conclusão;
- tiros com varredura contínua, bloqueio por paredes e aviso visível de tiro
  bloqueado; perseguidor com pose/aviso de golpe por contato;
- reinício integral de entidades, temporizadores, efeitos, entrada e áudio.

## Animações de personagens

Player e perseguidor usam estados e relógios de animação locais por entidade,
avançados pelo delta da simulação. Pausa congela a pose; retomada continua o
ciclo; mudança de estado reinicia o relógio uma vez. O perseguidor usa 8 poses de
locomoção a 12 fps e 2 poses de repouso a 3 fps. O jogador usa 4 poses de andar
a 12 fps. Os sprites são espelhados para a esquerda sem alterar origem ou lógica
de arma/ataque. Diagnóstico de frames só é disponibilizado em `?test=1` ou
`?debug=1`.

O ataque do perseguidor está mapeado em 4 poses distintas a 22 fps; o novo
`attack-002` é a pose de impacto e sua seleção no renderer é coberta por teste de
navegador. O salto ainda tem um quadro. Não foi possível reproduzir o relato de pose
congelada no código atual via Chrome HTTP: o ciclo de oito quadros foi observado
em duas instâncias simultâneas. Uma versão antiga/cacheada não pode ser descartada
como causa do relato original.

## Correção de combate e fluxo terminal (0.2.1)

Dano agora passa por uma rotina única. Registro detalhado de partida, alvo,
origem, entidade/projétil, vida anterior/posterior e caixas de colisão só é
mantido/logado com `?debug=1`; sobreposição visual de colisores também fica
restrita a esse modo.
O encerramento é resolvido uma vez ao fim do passo de simulação: “Você foi
derrotado” para vida do personagem zerada e “Altar destruído” se o altar cair
com o personagem vivo. Tiros usam colisão varrida para não atravessar alvos;
parede válida tem prioridade e gera feedback “BLOQUEADO”.

Os testes reproduzem tiros nos dois sentidos, alvos em movimento, parede, altura
incompatível, dano por contato/projétil, invulnerabilidade, derrota de cada alvo,
danos simultâneos e cinco ciclos de derrota/reinício. Veja o relatório de testes.

## Empacotamento de equipe (0.2.2)

Esta versão republica o build portátil e os documentos de teste; não altera a
lógica do jogo. A distinção automática entre derrota do personagem e destruição
do altar foi exercitada, mas sua clareza visual/sonora ainda requer avaliação
humana durante uma partida.

Aviso de continuidade: a fonte de desenvolvimento contém as correções de animação
e a arte articulada entregues depois da geração da 0.2.2. Portanto,
`dist-portable/JOGAR.html` e todas as pastas/ZIPs em `releases/` estão preservados,
mas desatualizados em relação à fonte. Não os use para avaliar a animação atual.

## Música

A música do menu foi preservada. A partida usa **Pulso do Distrito**, composição
procedural original de 16 compassos, 130 BPM e 29,538 s por loop, com bateria,
baixo, acordes e motivo melódico em Ré menor. O buffer é sintetizado uma vez no
navegador e nunca cria mais de uma fonte ativa. Consulte
`docs/ANALISE-E-COMPOSICAO-MUSICAL.md` para medidas, parâmetros e limites.

## Desenvolvimento e build

Não há dependências npm externas.

```bash
cd /home/flow/Projetos/BoyPunk-Web
npm run check
npm test
npm run build:portable
npm run build:release
```

`tools/build-portable.mjs` concatena os módulos em ordem controlada e incorpora os
recursos em data URLs. `tools/build-release.mjs` monta a pasta compartilhável e o
ZIP sem `node_modules`, caches, backups ou dados privados. `JOGAR.html` é gerado;
não deve ser mantido manualmente como uma segunda implementação.

O fonte contém o modo demonstração atual, mas nenhum portátil ou pacote de
release foi regenerado nesta integração; os artefatos existentes continuam
preservados como versões históricas.

## Proveniência

Sprites, cenário, tiles, música do menu, efeitos e fonte vieram do projeto local
BoyPunk, conforme autorizado para esta migração. A fonte contém indicação interna
de SIL Open Font License 1.1, mas o projeto não trazia um arquivo de licença
separado. A comprovação dos demais recursos herdados continua pendente antes de
distribuição pública.

Créditos: Cluster Digital; OPJ STUDIO; GONZAGA PRODUÇÕES; B&T Company;
Desenvolvedor: Renan Santos.
