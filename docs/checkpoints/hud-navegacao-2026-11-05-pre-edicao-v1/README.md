# Checkpoint pré-edição — HUD e navegação

Este diretório preserva, em arquivos legíveis e sem sobrescrever backups anteriores, o estado encontrado antes do lote de HUD compacta e confirmação unificada de 2026-11-05.

- Não é o backup original da integração de parallax.
- Não é um commit Git: `.git/` está vazio e a raiz não é reconhecida como repositório.
- Contém somente arquivos existentes que eram candidatos a edição no início do lote.
- `tests/hud-navigation.test.mjs` e os relatórios novos não existiam no estado preservado.
- A reversão deve copiar apenas os arquivos necessários deste diretório, nunca aplicar reset/clean global.

Os hashes do conteúdo preservado estão em `MANIFESTO.sha256`.
