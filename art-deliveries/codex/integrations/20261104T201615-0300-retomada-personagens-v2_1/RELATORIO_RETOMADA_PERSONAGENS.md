# Relatório de retomada — personagens v2.1

Data: 2026-11-04  
Projeto canônico: `/home/flow/Projetos/BoyPunk-Web`  
Versão real: `0.4.2`  
Identificador da retomada: `20261104T201615-0300-retomada-personagens-v2_1`  
Integração anterior recuperada: `20261104T190547-0300-personagens-v2_1`  
Fonte exclusiva dos assets: `art-deliveries/antigravity/personagens-v2.1/`

## Resultado

**Integração concluída e verificada no navegador.**

No início desta retomada, os 86 destinos já correspondiam byte a byte aos candidatos v2.1. A substituição havia terminado antes da interrupção; portanto, esta retomada não reescreveu nenhum asset ativo.

Números finais:

> **86 de 86 já correspondiam a v2.1; 0 foram integrados nesta retomada; 0 permanecem pendentes ou em conflito.**

Não há histórico Git válido nesta cópia: `git rev-parse` informa que ela não é um repositório. Por isso, a classificação foi baseada em SHA-256 de candidato, destino e backup, não em status ou datas.

## Continuidade recuperada

Foram localizados e validados:

- revisão bloqueadora da v2:
  `art-deliveries/codex/reviews/20261104T182655-0300-personagens-v2-review/RELATORIO_REVISAO_PERSONAGENS_V2.md`;
- entrega corrigida:
  `art-deliveries/antigravity/personagens-v2.1/`;
- manifesto real:
  `art-deliveries/antigravity/personagens-v2.1/documentation/delivery-manifest.json`;
- lista explícita da primeira integração:
  `art-deliveries/codex/integrations/20261104T190547-0300-personagens-v2_1/PAIRS.tsv`;
- baseline protegido:
  `art-deliveries/codex/integrations/20261104T190547-0300-personagens-v2_1/BASELINE_PROTEGIDO.sha256`;
- backup original anterior à primeira substituição:
  `art-deliveries/codex/backups/20261104T190547-0300-personagens-v2_1/`.

Não existe `AGENTS.md` aplicável na raiz nem nos diretórios ancestrais do projeto.

## Revisão da v2.1

A revisão havia sido concluída antes da interrupção e foi recuperada sem repetir capturas válidas:

- 86 PNGs de runtime: 42 clássicos, 42 ilustrados e 2 retratos;
- nomes e contagens: `idle 4`, `walk 4`, `jump 1`, `fall 1`, `attack1 4`, `hurt 3`, `die 4`;
- 86/86 hashes e tamanhos conferem com o manifesto;
- 86/86 decodificam como PNG RGBA;
- clássicos 64×96, ilustrados 128×192 e retratos 32×32;
- zero pixels opacos abaixo de Y=64/Y=128;
- 43/43 arquivos de BoyPunk são idênticos byte a byte à entrega v2 aprovada;
- todos os 21 quadros clássicos e 21 ilustrados de Nilo possuem hashes únicos;
- o componente isolado de `nilo-hurt-001` foi removido nos dois modos;
- a transição `idle-003 → idle-000` de Nilo é distinta e tem variação compatível com as demais transições;
- tons de pele marrons foram preservados; a elevação de valor ocorreu na armadura grafite;
- Nilo ficou legível no Distrito Neon, Fábrica de Sucata e Câmara de Energia;
- as prévias agregadas possuem os sete estados, 50 amostras de 40 ms e espelhamento corrigido;
- a origem visual do tiro coincide com as âncoras reais nos dois sentidos.

A entrega v1/v2 não foi usada como fonte da integração. A comparação com v2 serviu somente para comprovar a preservação byte a byte do BoyPunk exigida pela revisão.

## Mapeamento confirmado no carregador

O mapa foi confirmado diretamente em `src/assets.js`:

| Fonte v2.1 | Destino ativo |
|---|---|
| `boypunk/classic/playeranim-*` | `assets/images/player-helmet/playeranim-*` |
| `boypunk/illustrated/playeranim-*` | `assets/images/characters/boypunk-illustrated/playeranim-*` |
| `boypunk/portraits/player-portrait-000.png` | `assets/images/player-helmet/player-portrait-000.png` |
| `nilo/classic/nilo-*` | `assets/images/characters/nilo/nilo-*` |
| `nilo/illustrated/nilo-*` | `assets/images/characters/nilo-illustrated/nilo-*` |
| `nilo/portraits/nilo-portrait-000.png` | `assets/images/characters/nilo/nilo-portrait-000.png` |

A lista dos 86 pares, com hashes antes/depois, está em `PAIRS.tsv`. Projéteis, `nilo-heal-000..003.png` e demais arquivos das pastas não pertencem à lista e permaneceram intactos.

## Classificação no início e estado final

| Personagem | Modo | Estado | Esperados | Já v2.1 no início | Integrados na retomada | Ausentes | Conflitantes | Final v2.1 |
|---|---|---|---:|---:|---:|---:|---:|---:|
| BoyPunk | clássico | idle | 4 | 4 | 0 | 0 | 0 | 4 |
| BoyPunk | clássico | walk | 4 | 4 | 0 | 0 | 0 | 4 |
| BoyPunk | clássico | jump | 1 | 1 | 0 | 0 | 0 | 1 |
| BoyPunk | clássico | fall | 1 | 1 | 0 | 0 | 0 | 1 |
| BoyPunk | clássico | attack1 | 4 | 4 | 0 | 0 | 0 | 4 |
| BoyPunk | clássico | hurt | 3 | 3 | 0 | 0 | 0 | 3 |
| BoyPunk | clássico | die | 4 | 4 | 0 | 0 | 0 | 4 |
| BoyPunk | ilustrado | idle | 4 | 4 | 0 | 0 | 0 | 4 |
| BoyPunk | ilustrado | walk | 4 | 4 | 0 | 0 | 0 | 4 |
| BoyPunk | ilustrado | jump | 1 | 1 | 0 | 0 | 0 | 1 |
| BoyPunk | ilustrado | fall | 1 | 1 | 0 | 0 | 0 | 1 |
| BoyPunk | ilustrado | attack1 | 4 | 4 | 0 | 0 | 0 | 4 |
| BoyPunk | ilustrado | hurt | 3 | 3 | 0 | 0 | 0 | 3 |
| BoyPunk | ilustrado | die | 4 | 4 | 0 | 0 | 0 | 4 |
| BoyPunk | retrato | portrait | 1 | 1 | 0 | 0 | 0 | 1 |
| Nilo | clássico | idle | 4 | 4 | 0 | 0 | 0 | 4 |
| Nilo | clássico | walk | 4 | 4 | 0 | 0 | 0 | 4 |
| Nilo | clássico | jump | 1 | 1 | 0 | 0 | 0 | 1 |
| Nilo | clássico | fall | 1 | 1 | 0 | 0 | 0 | 1 |
| Nilo | clássico | attack1 | 4 | 4 | 0 | 0 | 0 | 4 |
| Nilo | clássico | hurt | 3 | 3 | 0 | 0 | 0 | 3 |
| Nilo | clássico | die | 4 | 4 | 0 | 0 | 0 | 4 |
| Nilo | ilustrado | idle | 4 | 4 | 0 | 0 | 0 | 4 |
| Nilo | ilustrado | walk | 4 | 4 | 0 | 0 | 0 | 4 |
| Nilo | ilustrado | jump | 1 | 1 | 0 | 0 | 0 | 1 |
| Nilo | ilustrado | fall | 1 | 1 | 0 | 0 | 0 | 1 |
| Nilo | ilustrado | attack1 | 4 | 4 | 0 | 0 | 0 | 4 |
| Nilo | ilustrado | hurt | 3 | 3 | 0 | 0 | 0 | 3 |
| Nilo | ilustrado | die | 4 | 4 | 0 | 0 | 0 | 4 |
| Nilo | retrato | portrait | 1 | 1 | 0 | 0 | 0 | 1 |
| **Total** |  |  | **86** | **86** | **0** | **0** | **0** | **86** |

A classificação individual, inclusive candidato, destino, backup e checkpoint, está em `ESTADO_INICIAL.tsv`.

## Backups e checkpoint

### Backup original completo

`art-deliveries/codex/backups/20261104T190547-0300-personagens-v2_1/`

- 86/86 originais pré-integração presentes;
- 86/86 hashes coincidem com a coluna `destination_before_sha256` de `PAIRS.tsv`;
- metadados: `BACKUP_METADATA.json`;
- todos os destinos existiam antes da primeira integração.

Este backup permite reversão integral ao estado anterior à primeira substituição.

### Checkpoint desta retomada

`art-deliveries/codex/backups/20261104T201615-0300-retomada-personagens-v2_1-estado-retomada/`

- 86/86 arquivos presentes;
- 86/86 hashes coincidem com v2.1;
- representa exatamente o estado encontrado no início desta retomada;
- como nenhum destino foi escrito nesta retomada, “reverter a retomada” é uma operação sem efeito sobre o runtime.

Metadados: `CHECKPOINT_METADATA.json`.

## Checks automatizados

Executados após recuperar e validar o estado:

- `npm run check`: aprovado;
- `npm test`: aprovado, 28/28 arquivos, zero falhas;
- 86/86 destinos decodificados integralmente após a validação;
- 86/86 destinos ainda iguais aos candidatos;
- 488/488 hashes protegidos preservados.

Os hashes protegidos cobrem código, testes, ferramentas, configurações, assets fora da lista e cenários ativos. Não houve alteração de HUD, cenário, renderer, gameplay, configuração ou Cyber Lab nesta retomada.

## Validação no navegador

Foi reutilizado sem interrupção o servidor já ativo, verificado por `/__boypunk_health`:

- aplicação: `boypunk-web-local-v1`;
- raiz: `/home/flow/Projetos/BoyPunk-Web`;
- versão: `0.4.2`;
- URL: `http://127.0.0.1:47831/`.

O Chrome headless usou perfil temporário isolado, cache desativado e foi removido ao final. Os saves do usuário não foram lidos nem alterados.

Resultados:

- 86/86 URLs foram carregadas pelo jogo durante o boot;
- 86/86 foram buscadas novamente com `cache: no-store`, decodificadas no navegador e comparadas por SHA-256 e dimensões;
- zero divergências de asset;
- 84 amostras do renderer cobriram todos os 21 quadros de ambos os personagens em escala clássica e ilustrada;
- 4 amostras adicionais cobriram `attack1-002` para a esquerda nos dois personagens e duas escalas;
- `idle`, `walk`, `jump`, `fall`, `attack1`, `hurt` e `die` foram selecionados e observados;
- movimento e salto foram produzidos por atualizações reais do modelo com input; ataque por `attackPressed`; dano e derrota por `damagePlayer`;
- Nilo foi observado no Distrito Neon, Fábrica de Sucata e Câmara de Energia;
- demo entrou em `playing` com BoyPunk;
- coop entrou em `playing` com P1 BoyPunk e P2 Nilo, incluindo espelhamento do P2;
- zero erros de console;
- zero respostas HTTP ≥400;
- três requisições de mídia foram canceladas com `net::ERR_ABORTED` ao navegar entre as páginas de escala/demo/coop; não eram PNGs e não houve falha de asset.

O relatório bruto está em `evidencias/BROWSER_VALIDATION.json`.

### Retratos

Os dois PNGs de retrato foram carregados, tiveram hash conferido e decodificaram no navegador. Contudo, o código atual não os desenha: o HUD usa avatares construídos em HTML/CSS. A seleção de BoyPunk/Nilo foi observada, mas não é correto afirmar que os PNGs de retrato apareceram visualmente. Corrigir isso exigiria mudança de renderer/UI e ficou fora do escopo asset-only.

### Dano e derrota

Os asset keys e frames de `hurt` e `die` foram observados. Nas capturas, os sprites são parcialmente cobertos pelos VFX atuais de dano, respawn e derrota. Isso é comportamento existente do renderer, não falha de integração.

## Capturas reais

As 39 capturas foram geradas pelo jogo servido por HTTP, não são composições do pacote Antigravity.

Principais evidências:

- `evidencias/classic-nilo-jump.png`;
- `evidencias/illustrated-nilo-idle.png`;
- `evidencias/illustrated-boypunk-attack1-left.png`;
- `evidencias/illustrated-nilo-hurt.png`;
- `evidencias/illustrated-nilo-die.png`;
- `evidencias/cenario-district-neon-nilo.png`;
- `evidencias/cenario-scrap-factory-nilo.png`;
- `evidencias/cenario-camara-energia-nilo.png`;
- `evidencias/demo-boypunk.png`;
- `evidencias/coop-boypunk-nilo.png`.

A pasta contém também uma captura por personagem, escala e estado, além dos ataques espelhados.

## Reversão

### Retornar ao início desta retomada

Nenhuma alteração de runtime foi feita nesta retomada. Portanto, não há arquivo a restaurar para voltar ao estado encontrado no início. O checkpoint correspondente contém os mesmos bytes v2.1 atualmente ativos.

### Reversão integral anterior à primeira integração

Use somente o backup original completo. Antes de executar, confirme que deseja remover os personagens v2.1. O procedimento abaixo recusa sobrescrever qualquer destino cujo hash não seja mais o candidato registrado:

```bash
cd /home/flow/Projetos/BoyPunk-Web
node --input-type=module <<'NODE'
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const integration = "20261104T190547-0300-personagens-v2_1";
const pairs = fs.readFileSync(
  `art-deliveries/codex/integrations/${integration}/PAIRS.tsv`,
  "utf8"
).trim().split("\n").slice(1).map((line) => {
  const f = line.split("\t");
  return {
    destination: f[2],
    candidate: f[3],
    original: f[4],
    backup: path.join("art-deliveries/codex/backups", integration, f[2])
  };
});
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

for (const item of pairs) {
  if (!fs.existsSync(item.destination) || sha(item.destination) !== item.candidate) {
    throw new Error(`Conflito; nada foi restaurado: ${item.destination}`);
  }
  if (!fs.existsSync(item.backup) || sha(item.backup) !== item.original) {
    throw new Error(`Backup inválido; nada foi restaurado: ${item.backup}`);
  }
}
for (const item of pairs) {
  const temp = `${item.destination}.rollback-${integration}.tmp`;
  fs.copyFileSync(item.backup, temp);
  if (sha(temp) !== item.original) throw new Error(`Temporário divergente: ${temp}`);
  fs.renameSync(temp, item.destination);
}
console.log("86 originais restaurados e verificados.");
NODE
npm run check
npm test
```

A restauração é atômica por arquivo, não uma transação única de 86 arquivos. Não execute se houver qualquer conflito reportado.

## Como abrir a fonte atual

```bash
cd /home/flow/Projetos/BoyPunk-Web
npm run dev
xdg-open "http://127.0.0.1:47831/?scale=2"
```

- ilustrado: `http://127.0.0.1:47831/?scale=2`;
- clássico: `http://127.0.0.1:47831/?scale=1`.

O servidor já estava ativo e foi preservado. Nenhum standalone, ZIP, release, commit ou publicação foi gerado.

