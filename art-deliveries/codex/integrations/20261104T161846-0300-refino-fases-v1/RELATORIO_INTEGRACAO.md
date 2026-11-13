# Relatório de integração de arte de ambientes

## Resultado

Integração identificada por `20261104T161846-0300-refino-fases-v1`.

- Raiz canônica verificada: `/home/flow/Projetos/BoyPunk-Web`.
- Versão real do fonte: `0.4.2`, confirmada em `package.json` e `src/version.js`.
- Entrega selecionada: `art-deliveries/antigravity/refino-fases-v1/`.
- Assets ativos atualizados: **sim, exatamente os seis PNGs autorizados**.
- Nova arte confirmada no navegador: **sim**, nas escalas 1 e 2, com hashes HTTP conferidos.
- Código, testes e configuração alterados: **não**.
- Personagens e Cyber Lab integrados: **não**.
- Standalones, `dist-portable`, `studio-builds`, ZIPs e releases alterados: **não**.
- Publicação, commit ou push: **não realizados**.

Não há `AGENTS.md` aplicável nesta raiz nem em `/home/flow/Projetos`. A árvore também não contém metadados Git utilizáveis (`git` informa que não é um repositório), portanto a preservação foi comprovada por uma linha de base própria de hashes, e não por `git diff`.

## Verificação da entrega

Os seis arquivos finais existem como arquivos regulares, não são links simbólicos e seus caminhos canônicos permanecem dentro da entrega selecionada. Os hashes reais coincidem tanto com os valores fornecidos quanto com `documentation/delivery-manifest.json`. Nenhum arquivo de `documentation/pass1-candidates-preserved/`, `personagens-v1/`, Cyber Lab, preview ou saída bruta de geração foi integrado.

Todos os PNGs foram integralmente decodificados antes e depois da substituição. Os backgrounds são RGB opacos e não contêm legenda de preview, HUD, marca-d'água ou checkerboard. Os três tilesets são RGBA com transparência real.

O contrato foi reconfirmado no fonte atual:

- mundo lógico de 480 × 270;
- background desenhado por recorte central do tipo `cover`;
- célula de plataforma one-way em `(sx=0, sy=0, sw=16, sh=16)`;
- célula de plataforma sólida em `(sx=16, sy=0, sw=16, sh=16)`;
- escala 1 usa o caminho clássico, com smoothing desligado;
- escala 2 usa o caminho ilustrado quando disponível, com smoothing `high`;
- backgrounds e tiles desta integração são compartilhados pelos dois caminhos;
- preenchimentos, destaques, extremidades e suportes procedurais continuam sendo compostos pelo renderer existente.

Nos três tilesets, as duas células amostradas possuem conteúdo; toda a região não utilizada (`x >= 32` ou `y >= 16`) tem alfa zero. A repetição horizontal foi inspecionada em composição e no navegador. A diferença normalizada entre as bordas repetidas ficou entre 0,0126 e 0,0385, sem fenda ou vazamento visível sob a filtragem existente. Nenhum candidato foi redimensionado, repintado ou reparado.

## Mapeamento e hashes

Origem comum: `art-deliveries/antigravity/refino-fases-v1/world/`  
Destino comum: `assets/images/world/`

| Arquivo | SHA-256 anterior | SHA-256 integrado | Dimensões | Bytes antes → depois |
|---|---|---|---:|---:|
| `distrito-neon.png` | `6c39ce5b9056a4a71974b82f705f39bbb5e7b81b751f4d405213313ce166428b` | `9e5abba5381ce8a729b507ffbc31d75c62d8873bf0bec9b6dbabec866435ceca` | 1672 × 941 | 2.245.076 → 460.337 |
| `fabrica-sucata.png` | `df59ccbc98d6b33ddd90501658f19b969d095daf271d7c4f7b8fbf7f231722fb` | `68c91c21884b96d37713537356db9f9e5fa2e07ef1d9e5576b7e185d5c909b70` | 1365 × 768 | 1.256.695 → 1.103.992 |
| `camara-energia.png` | `62a3e5412b500e3443c5b52cc8c0f7b38660837356af16ee37f71a0e277d5e84` | `8bc080cef0afb2a7a58c5fdba665dc5fddc94c02ba66db5bc04783376bf3d1fc` | 1365 × 768 | 1.511.112 → 1.283.230 |
| `platformtiles.png` | `fbf9f8f0f9a1c3d45db383cda09fbcb65820303c7a4afa31a02298106ab4d585` | `11cfd732d97b53e1aa2371a0602080aadea5e9b96e24296e1123b9d427a1e843` | 128 × 128 | 420 → 518 |
| `factory-platformtiles.png` | `e0388907f4639fd892620d1d457358987e36e51e0daebddc347dc2e7616ba861` | `996c490fb5db2ff23916013646d33c4842bf52122253eab61f8533191cd61b54` | 128 × 128 | 598 → 571 |
| `energy-platformtiles.png` | `08672a16e057839b6e9f5b73ac8d6b0974e8a03786bcc83298edac34d1fa1c59` | `5a1943b461bac4f39818819f514ecee0fb797a320a4e386fd12fbcf01e7d80df` | 128 × 128 | 721 → 530 |

O mapeamento é homônimo em todos os seis casos: cada origem acima foi instalada no destino de mesmo nome. As chaves de manifesto e os caminhos de runtime permaneceram inalterados.

## Backup verificado

Backup exclusivo:

`/home/flow/Projetos/BoyPunk-Web/art-deliveries/codex/backups/20261104T161846-0300-refino-fases-v1/`

Os seis originais foram **copiados**, nunca movidos. Cada cópia foi comparada byte a byte e teve o SHA-256 reconferido antes da primeira substituição. `backup-metadata.json` registra raiz, versão, identificador, caminhos, hashes, dimensões e tamanhos. Nenhum backup anterior foi sobrescrito.

A instalação foi preparada como lote, mas executada em seis substituições atômicas individuais no mesmo diretório. Antes das trocas houve uma segunda conferência dos hashes ativos contra a linha de base. Não ocorreu falha parcial nem foi necessária reversão.

## Testes automatizados e integridade

### Linha de base

- `npm run check`: aprovado, código de saída 0.
- `npm test`: aprovado, 28 arquivos de teste, 28 aprovados e 0 falhas.

### Depois da integração

- `npm run check`: aprovado, código de saída 0.
- `npm test`: aprovado, 28 arquivos de teste, 28 aprovados e 0 falhas.
- Decodificação integral dos seis destinos: aprovada.
- Hash dos seis destinos contra a entrega final: aprovado.

O arquivo `baseline-protected.sha256` contém 917 arquivos protegidos de fontes, testes, ferramentas, configurações, documentação, demais assets, personagens, Cyber Lab, `dist-portable`, `studio-builds` e releases. A conferência posterior aprovou 917/917 sem divergências; o detalhamento está em `post-protected-verification.log`. Os seis PNGs deliberadamente substituídos foram registrados separadamente em `baseline-active-and-candidates.sha256`.

As correções independentes de Tiro Rápido e Rajada Dupla, assim como física, colisões, geometria, dano, IA, ondas, hazards, controles, progressão, duração do bônus, render scale, smoothing e seleção de assets não foram modificadas.

## Validação no navegador

A validação usou o fonte canônico servido por `tools/server.mjs` em uma porta efêmera de `127.0.0.1`. O endpoint de saúde confirmou:

- aplicação `boypunk-web-local-v1`;
- versão `0.4.2`;
- raiz `/home/flow/Projetos/BoyPunk-Web`.

O Chrome headless foi iniciado sem `--no-sandbox`, com viewport 1280 × 720, DPR 1 e perfis temporários separados das preferências e saves do usuário. O cache foi desativado e os URLs receberam identificador exclusivo. Ao final, navegador, perfis e servidor efêmero foram encerrados; nenhuma instância do BoyPunk ficou ativa.

Para cada uma das escalas 1 e 2, os seis URLs responderam HTTP 200. O navegador baixou os bytes, calculou SHA-256 igual ao candidato final e executou `Image.decode()` com sucesso. Não houve:

- falhas registradas pelo carregador de assets;
- erro HTTP;
- erro de console;
- exceção JavaScript;
- falha de rede não cancelada.

As recargas/trocas de cena cancelaram requisições de `menu-music.webm` com `net::ERR_ABORTED` e `canceled=true`; são cancelamentos normais de mídia, não falhas HTTP ou de asset gráfico.

O smoke test curto no caminho ilustrado confirmou:

- movimento: `x=18` para `x=69,6146`;
- salto: `y=208` para `y=175,6389`, com trajetória ascendente;
- ataque: projéteis ativos de 0 para 1;
- estado final durante o teste: `playing`.

### Inspeção visual efetivamente realizada

- Distrito Neon: recorte central correto, plataformas sem lacunas, personagem e almas legíveis contra o fundo mais escuro; tiro/efeito de ataque permanece distinguível das luzes ciano.
- Fábrica de Sucata: enquadramento correto; prensa central real preservada e claramente separada da decoração; fase de aviso exercitada pelo modo de teste, com faixa de perigo, chevrons e sinalização visíveis; plataformas contínuas.
- Câmara de Energia: altar, protagonista e 30 almas permanecem distinguíveis; plataformas e vãos preservam a leitura; os contornos retangulares laranja das almas continuam presentes porque são uma sobreposição do renderer existente, não pixels gravados no novo background ou no tileset.
- Escala 1: backing store 480 × 270, smoothing desligado.
- Escala 2: backing store 960 × 540, smoothing ligado em qualidade `high`.

Capturas representativas:

- `evidencias/distrito-neon-runtime-scale-1.png`
- `evidencias/distrito-neon-runtime-scale-2.png`
- `evidencias/fabrica-sucata-runtime-scale-1.png`
- `evidencias/fabrica-sucata-runtime-scale-2.png`
- `evidencias/camara-energia-runtime-scale-1.png`
- `evidencias/camara-energia-runtime-scale-2.png`

Os dados completos de saúde, hashes HTTP, dimensões, renderização, eventos de rede e smoke test estão em `evidencias/browser-validation.json`.

## Limitações

Esta validação confirma boot, carregamento real, renderização das três ambientações nos caminhos clássico e ilustrado e um smoke test curto de movimento/salto/ataque no Linux/Chrome headless. Ela não constitui teste integral da campanha, sessão prolongada, desempenho sustentado, Windows, dispositivo móvel, offline ou todos os estados temporais de partículas e hazards. Nenhuma dessas coberturas não executadas é reivindicada.

Não há pendência bloqueadora observada para esta integração. Uma sessão manual prolongada em hardware-alvo continua sendo uma verificação adicional recomendável, não uma condição de correção do lote.

## Reversão exata

Só reverta se os seis destinos ainda tiverem os hashes integrados acima. O procedimento abaixo interrompe antes de sobrescrever qualquer divergência concorrente e restaura cada arquivo por troca atômica individual:

```bash
cd /home/flow/Projetos/BoyPunk-Web

boypunk_backup='art-deliveries/codex/backups/20261104T161846-0300-refino-fases-v1'
boypunk_dest='assets/images/world'
boypunk_id='20261104T161846-0300-refino-fases-v1'
boypunk_files=(distrito-neon.png fabrica-sucata.png camara-energia.png platformtiles.png factory-platformtiles.png energy-platformtiles.png)
declare -A boypunk_integrated=(
  [distrito-neon.png]='9e5abba5381ce8a729b507ffbc31d75c62d8873bf0bec9b6dbabec866435ceca'
  [fabrica-sucata.png]='68c91c21884b96d37713537356db9f9e5fa2e07ef1d9e5576b7e185d5c909b70'
  [camara-energia.png]='8bc080cef0afb2a7a58c5fdba665dc5fddc94c02ba66db5bc04783376bf3d1fc'
  [platformtiles.png]='11cfd732d97b53e1aa2371a0602080aadea5e9b96e24296e1123b9d427a1e843'
  [factory-platformtiles.png]='996c490fb5db2ff23916013646d33c4842bf52122253eab61f8533191cd61b54'
  [energy-platformtiles.png]='5a1943b461bac4f39818819f514ecee0fb797a320a4e386fd12fbcf01e7d80df'
)

for boypunk_file in "${boypunk_files[@]}"; do
  boypunk_actual="$(sha256sum "$boypunk_dest/$boypunk_file" | cut -d' ' -f1)"
  [[ "$boypunk_actual" == "${boypunk_integrated[$boypunk_file]}" ]] || {
    echo "Conflito em $boypunk_file; nada foi restaurado."
    exit 1
  }
done

for boypunk_file in "${boypunk_files[@]}"; do
  boypunk_tmp="$boypunk_dest/.${boypunk_file}.rollback-${boypunk_id}.tmp"
  cp --preserve=all "$boypunk_backup/$boypunk_file" "$boypunk_tmp"
  mv -f "$boypunk_tmp" "$boypunk_dest/$boypunk_file"
done

sha256sum "$boypunk_dest"/{distrito-neon.png,fabrica-sucata.png,camara-energia.png,platformtiles.png,factory-platformtiles.png,energy-platformtiles.png}
npm run check
npm test
```

Os hashes restaurados esperados são os seis valores da coluna “SHA-256 anterior”. Após uma reversão, este relatório e as evidências devem ser mantidos como histórico; a reversão não exige apagar candidatos ou backups.

## Como abrir o fonte atual

```bash
cd /home/flow/Projetos/BoyPunk-Web
./iniciar-jogo.sh --no-open
```

URL: `http://127.0.0.1:47831/`

O comando serve o fonte atual; não deve ser substituído por um HTML standalone antigo de Downloads.

## Status final

**Integração concluída e verificada no navegador.**
