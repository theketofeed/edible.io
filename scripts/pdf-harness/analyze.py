import re, io, sys
from PIL import Image

path = sys.argv[1]
data = open(path, "rb").read()

streams = []
for m in re.finditer(rb'/Filter\s*/DCTDecode[^>]*>>\s*stream\r?\n', data):
    start = m.end()
    end = data.find(b'endstream', start)
    if end == -1: continue
    try:
        im = Image.open(io.BytesIO(data[start:end])).convert("RGB")
        streams.append(im)
    except Exception as e:
        print("decode fail:", e)

DPI = 192
MARGIN = 96
def ink_profile(im):
    g = im.convert("L"); px = g.load(); w, h = im.size
    rows = [sum(1 for x in range(0, w, 2) if px[x, y] < 235) * 2 for y in range(h)]
    cols = [sum(1 for y in range(0, h, 2) if px[x, y] < 235) * 2 for x in range(w)]
    return rows, cols

print(f"pages: {len(streams)}")
for idx, im in enumerate(streams):
    w, h = im.size
    rows, cols = ink_profile(im)
    nz_rows = [y for y, v in enumerate(rows) if v > 3]
    nz_cols = [x for x, v in enumerate(cols) if v > 4]
    top = nz_rows[0] if nz_rows else -1
    bot = nz_rows[-1] if nz_rows else -1
    left = nz_cols[0] if nz_cols else -1
    right = nz_cols[-1] if nz_cols else -1
    print(f"PAGE {idx+1}: {w}x{h}px  bbox top={top} bottom={bot} left={left} right={right}")
    print(f"  margins: LEFT_SAFE={left>=MARGIN-6} RIGHT_SAFE={right<=w-MARGIN+6} TOP_CLIP={top<=MARGIN-6} BOTTOM_CLIP={bot>=h-MARGIN+6}")

    px = im.load()
    bands = []
    step = 40
    for y0 in range(MARGIN, h - MARGIN, step):
        sat = 0; n = 0
        for y in range(y0, min(y0 + step, h - MARGIN)):
            for x in range(MARGIN, w - MARGIN, 4):
                r, g, b = px[x, y]
                if max(r, g, b) - min(r, g, b) > 40 and max(r, g, b) > 90:
                    sat += 1
                n += 1
        bands.append((y0, 100.0 * sat / n if n else 0))
    photo_rows = [y0 for y0, p in bands if p >= 5.0]
    if photo_rows:
        span = max(photo_rows) + step - min(photo_rows)
        avg = sum(p for _, p in bands if _ >= min(photo_rows) and _ <= max(photo_rows) + step) / max(1, len([b for b in bands if b[0] >= min(photo_rows) and b[0] <= max(photo_rows) + step]))
        print(f"  PHOTO: likely ({len(photo_rows)} bands, span ~{span}px, avg sat {avg:.1f}%) rows {min(photo_rows)}-{max(photo_rows)+step}")
    else:
        if bands:
            maxp = max(p for _, p in bands)
        else:
            maxp = 0.0
        print(f"  PHOTO: none (max saturation band {maxp:.1f}%)")