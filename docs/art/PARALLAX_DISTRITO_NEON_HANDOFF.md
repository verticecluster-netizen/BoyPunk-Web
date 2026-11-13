# Handoff de arte — Parallax real do Distrito Neon

## Estado técnico confirmado em 2026-11-04

- O mundo e o viewport têm a mesma resolução lógica: `480 × 270`.
- Não existe câmera móvel, `camera.x/y`, scroll de mundo ou transformação persistente de câmera no renderer.
- O único deslocamento visual do mundo é o screen shake temporário.
- `assets/images/world/distrito-neon.png` é uma composição RGB achatada de `1672 × 941`; céu, prédios e primeiro plano não estão disponíveis separadamente.
- Por isso, copiar, deslocar ou recortar automaticamente a imagem atual duplicaria arquitetura e produziria fantasmas. Essa operação não deve ser feita.

## Entrega de arte necessária

Produzir camadas com a mesma origem, enquadramento e dimensão de referência (`1672 × 941`), sem alterar a composição aprovada:

1. `distrito-neon-far.png`: céu e skyline distante; pode ser opaca.
2. `distrito-neon-mid.png`: arquitetura intermediária em RGBA transparente.
3. `distrito-neon-near.png`: elementos decorativos de primeiro plano em RGBA transparente, sem plataformas, perigos, altar ou qualquer geometria de gameplay.

Requisitos:

- pixels de registro idênticos entre as três imagens;
- transparência limpa, sem halos de recorte;
- nenhum prédio repetido em mais de um plano;
- margens horizontais estendidas conforme o deslocamento máximo futuro da câmera, ou bordas desenhadas para repetição sem emenda;
- manter contraste baixo atrás de jogadores, almas, tiros e perigos;
- preservar a imagem achatada atual como fallback e referência visual.

## Dependência de engenharia

Parallax de câmera só deve ser ativado quando houver uma câmera móvel real e um mundo maior que o viewport. Pela convenção recomendada, o renderer deslocará cada plano por `-camera.x × fator` (eixo do mundo no sentido oposto à câmera):

- plano distante: `0,2×`;
- arquitetura intermediária: `0,5×`;
- gameplay e colisões: transformação atual completa, equivalente a `1,0×`.

Plataformas, entidades, altar, projéteis, HUD e colisões nunca devem usar os fatores decorativos. Antes da integração, validar as extremidades da câmera para provar ausência de lacunas e manter o fallback achatado disponível.

## Solução presente

Enquanto câmera e camadas de arte não existem, o renderer preserva o fundo original e adiciona somente três planos discretos de névoa atmosférica calculada, atrás do gameplay. Isso não é parallax de câmera.
