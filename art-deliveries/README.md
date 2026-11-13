# Entregas e referências de arte — BoyPunk!

Este diretório separa referências, candidatos, integrações e backups sem alterar os caminhos de runtime em `assets/`.

## Base autoritativa

- Projeto: `/home/flow/Projetos/BoyPunk-Web`
- Fonte modular: versão `0.4.2`, confirmada em `package.json` e `src/version.js`
- Manifesto de runtime: `src/assets.js`
- Contratos visuais: `docs/art/AUDITORIA_GRAFICA_TODAS_AS_FASES.md` e `docs/art/PLANO_PERSONAGENS_BOYPUNK_NILO.md`
- Não existe `AGENTS.md` aplicável nesta raiz.
- Esta cópia não possui histórico Git utilizável; integridade deve ser comprovada por hashes e relatórios.

## Mapa de pastas

| Pasta | Finalidade | Regra |
|---|---|---|
| `references/environments/` | Pranchas e conceitos visuais de ambientes | Referência somente; não é background pronto |
| `references/characters/boypunk/` | Direção visual e imagens-fonte de BoyPunk | Referência/fonte; não integrar diretamente |
| `references/characters/nilo/` | Direção visual e imagens-fonte de Nilo | Referência/fonte; não integrar diretamente |
| `references/personagens/` | Local legado preservado | Não renomear nem apagar; contém um nome de arquivo malformado registrado no índice |
| `references/html/` | Categoria reservada para HTMLs de referência confirmados | Ausente nesta data: nenhum HTML de referência foi encontrado dentro do projeto |
| `antigravity/<pacote-versionado>/` | Entregas produzidas pelo Antigravity | Cada pacote mantém seus próprios candidatos, previews e documentação |
| `codex/backups/<id>/` | Cópias de assets ativos anteriores a uma integração | Nunca reutilizar ou sobrescrever um ID |
| `codex/integrations/<id>/` | Relatório, hashes e evidências de uma integração | Estado efetivo é definido pelo relatório, não pelo nome da pasta |

O inventário humano está em `ASSET_INDEX.md`. O registro legível por máquina, incluindo todas as cópias desta organização, está em `ORGANIZACAO_MANIFESTO.json`.

## Classificação

- **Referência visual:** direção de forma, material, paleta ou composição; pode conter texto, poses inexistentes e mecânicas não suportadas.
- **Imagem-fonte gerada por IA:** material bruto que ainda exige recorte, transparência, escala, pivô e continuidade.
- **Candidato de runtime:** arquivo preparado para o contrato do renderer, mas ainda fora de `assets/`.
- **Asset ativo:** arquivo consumido por `src/assets.js` no caminho atual em `assets/`.
- **Preview:** composição estática ou animada de avaliação; nunca é fonte de runtime.
- **Backup:** cópia de reversão de um asset ativo anterior.
- **Integrado:** candidato cujo hash foi confirmado no destino ativo e documentado em relatório Codex.
- **Pendente:** material produzido, registrado ou revisado que ainda não tem integração comprovada.

Dimensão ou hash correto não implica aprovação visual. Da mesma forma, uma prancha de referência não é uma sprite sheet pronta.

## Estado resumido

- `antigravity/refino-fases-v1/`: seis assets de Distrito Neon, Fábrica de Sucata e Câmara de Energia integrados e verificados no navegador. Relatório em `codex/integrations/20261104T161846-0300-refino-fases-v1/` e backup em `codex/backups/20261104T161846-0300-refino-fases-v1/`.
- `antigravity/personagens-v1/boypunk/classic/`: oito candidatos de BoyPunk (`idle` e `walk`), tecnicamente compatíveis, não integrados e sem pacote documental completo.
- Cyber Lab: dois assets ativos opcionais registrados no manifesto, porém sem nível, geometria, progressão ou seleção no renderer. É arte pendente; não é quarta fase ativa.
- Não existe entrega `nilo-idle-v*`. Há uma imagem-fonte de quatro poses, agora também copiada para `references/characters/nilo/nilo-idle-source-v1.png`.

## Convenção para novas entregas de personagens

```text
art-deliveries/antigravity/<pacote-versionado>/
  boypunk/
    classic/
    illustrated/
    portraits/
  nilo/
    classic/
    illustrated/
    portraits/
  previews/
  documentation/
  README.md
```

Criar somente os subdiretórios que receberem arquivos naquele lote. Não mover entregas antigas para adequá-las retroativamente.

Cada pacote deve incluir:

- versão da fonte e data;
- lista de arquivos e SHA-256;
- dimensões, canais e limites alpha;
- estado/frame e ordem numérica;
- pivô, linha de chão e origem visual da arma;
- preview estático na resolução lógica e loops animados nas cadências reais;
- resultado de revisão técnica e visual;
- declaração explícita de que nenhum arquivo está integrado até existir relatório Codex.

## Convenção para cenários

```text
art-deliveries/antigravity/<pacote-versionado>/
  world/
  previews/
  documentation/
  README.md
```

Manter os nomes finais separados de primeiras passagens e registrar o alvo de manifesto/caminho de runtime. Não mover `refino-fases-v1`, pois seu relatório e seus hashes já apontam para a estrutura existente.

## Caminhos ativos não devem ser reorganizados

Os assets consumidos pelo jogo continuam em `assets/`. Empacotamento portátil usa `ASSET_MANIFEST` e caminhos encontrados em HTML/CSS; releases copiam recursivamente `assets`, `src`, `tools`, `tests`, `packaging` e `docs`. Mover assets ativos exigiria mudanças de código e invalidaria builds, portanto está fora desta organização.

## Desfazer somente esta organização

Esta execução fez apenas cópias para as três novas categorias de `references/` e criou quatro documentos. Os originais não foram movidos. Para desfazer, remova somente os destinos listados em `ORGANIZACAO_MANIFESTO.json`, após confirmar que seus hashes ainda coincidem com `sha256`, e então remova apenas diretórios que tenham ficado vazios. Não tocar em `references/personagens/`, `antigravity/`, `codex/` ou `assets/`.
