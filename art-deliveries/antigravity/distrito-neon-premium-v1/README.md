# Pacote Candidato de Efeitos Visuais — Distrito Neon Premium (`distrito-neon-premium-v1`)

Entrega de arte, prévias e documentação técnica para enriquecimento visual do Distrito Neon no projeto **BoyPunk! Web** (`v0.4.2`).

> **AVISO IMPORTANTE:** Este pacote contém **exclusivamente arte candidata, prévias e especificações técnicas**. Nenhum arquivo de código (`src/`), teste (`tests/`), asset ativo (`assets/`) ou release do projeto foi modificado.

---

## Estrutura do Pacote

```
art-deliveries/antigravity/distrito-neon-premium-v1/
├── README.md
├── foreground/
│   └── foreground-distrito-neon.png      (480×270 RGBA estático, 2.406 bytes)
├── weather/
│   ├── rain-far.png                      (480×270 RGBA contínuo, 3.542 bytes)
│   ├── rain-mid.png                      (480×270 RGBA contínuo, 3.929 bytes)
│   ├── rain-near.png                     (480×270 RGBA contínuo, 5.505 bytes)
│   └── rain-splash.png                   (24×8 RGBA, 3 frames de 8×8, 140 bytes)
├── combat/
│   ├── muzzle-boypunk.png                (128×32 RGBA, 4 frames de 32×32, 284 bytes)
│   ├── muzzle-nilo.png                   (128×32 RGBA, 4 frames de 32×32, 273 bytes)
│   ├── hit-spark.png                     (64×16 RGBA, 4 frames de 16×16, 228 bytes)
│   └── pickup-spark.png                  (48×16 RGBA, 3 frames de 16×16, 205 bytes)
├── previews/
│   ├── 01-foreground-comparison.png
│   ├── 02-weather-layers-comparison.png
│   ├── 03-muzzle-flashes-and-anchors.png
│   ├── 04-full-combat-composite-480x270.png
│   ├── 05-full-combat-composite-scale2-960x540.png
│   ├── anim-muzzle-boypunk.gif
│   ├── anim-muzzle-nilo.gif
│   ├── anim-hit-spark.gif
│   └── anim-rain-loop.gif
└── documentation/
    ├── HANDOFF_VISUAL.md
    └── delivery-manifest.json
```

---

## Verificação e Prévias no Ubuntu

Para visualizar os comparativos e animações diretamente no ambiente local:

```bash
# Abrir todas as prévias estáticas e animadas no visualizador padrão do Ubuntu:
xdg-open art-deliveries/antigravity/distrito-neon-premium-v1/previews/04-full-combat-composite-480x270.png
xdg-open art-deliveries/antigravity/distrito-neon-premium-v1/previews/03-muzzle-flashes-and-anchors.png
xdg-open art-deliveries/antigravity/distrito-neon-premium-v1/previews/anim-muzzle-boypunk.gif
xdg-open art-deliveries/antigravity/distrito-neon-premium-v1/previews/anim-muzzle-nilo.gif
xdg-open art-deliveries/antigravity/distrito-neon-premium-v1/previews/anim-rain-loop.gif
```

Consulte `documentation/HANDOFF_VISUAL.md` para as diretrizes de integração futura.

