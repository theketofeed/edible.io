"""Generate a test JPEG for PDF image-rendering verification."""
from PIL import Image, ImageDraw
import os, sys

W, H = 940, 650
img = Image.new('RGB', (W, H))
px = img.load()

for y in range(H):
    for x in range(W):
        # Purple-to-pink gradient with some texture
        r = int(168 + 70 * (x / W))
        g = int(85  + 50 * (y / H) - 40 * (x / W))
        b = int(247 - 100 * (y / H))
        # Add a food-like orange center blob
        dx = (x - W * 0.5) / (W * 0.35)
        dy = (y - H * 0.5) / (H * 0.35)
        dist2 = dx * dx + dy * dy
        if dist2 < 1.0:
            t = max(0, 1 - dist2)
            r = int(r * (1 - t) + 220 * t)
            g = int(g * (1 - t) + 140 * t)
            b = int(b * (1 - t) + 50  * t)
        # Add some grid lines for detail
        if x % 60 < 2 or y % 60 < 2:
            r = min(255, r + 30)
            g = min(255, g + 30)
            b = min(255, b + 30)
        px[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))

out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'test-recipe.jpg')
img.save(out, 'JPEG', quality=90)
print(f'Wrote {W}x{H} test image to {out} ({os.path.getsize(out)} bytes)')
