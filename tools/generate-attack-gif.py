from PIL import Image

f0 = Image.open('assets/images/enemies/enemycaveira-attack-000.png')
f1 = Image.open('assets/images/enemies/enemycaveira-attack-001.png')
f2 = Image.open('evidencias/test_refined_impact.png')
f3 = Image.open('assets/images/enemies/enemycaveira-attack-003.png')

scale = 6
frames = [f.resize((16 * scale, 32 * scale), Image.NEAREST) for f in [f0, f1, f2, f3]]

# 22 FPS is ~45 ms per frame
frames[0].save(
    'evidencias/art/chaser_attack_animation_preview.gif',
    save_all=True,
    append_images=frames[1:],
    duration=[45, 45, 45, 45],
    loop=0
)
print("Saved attack animation GIF: evidencias/art/chaser_attack_animation_preview.gif")
