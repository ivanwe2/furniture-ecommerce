#!/usr/bin/env python3
"""
Derive the Настех wordmark webfont from Factor Expanded (Iconian Fonts).

Two things happen here, and both are deliberate:

1. **The dots are removed.** Every capital in Factor carries a small dot at its
   lower right — a lone "H" renders as "H·". The storefront sign shows those
   dots because the sign is set in this font, but the client wants the web
   wordmark without them, so the dot contour is stripped from each glyph.

2. **Only the six letters we use are kept** (H A C T E X — „НАСТЕХ" drawn with
   Latin look-alikes, as on the sign). Subsetting keeps the shipped file tiny
   and limits redistribution to the glyphs the mark actually needs.

LICENCE: Factor is free for non-commercial use; commercial use needs a licence
from iconian.com. Ivan was told and chose to proceed — see PROGRESS.md. This
script also makes the output a *modified* derivative, which is recorded here so
the provenance is never in doubt.

Usage (source TTF is NOT committed — download from dafont.com/factor.font):
    python3 -m venv .venv && .venv/bin/pip install fonttools brotli
    .venv/bin/python scripts/build-wordmark-font.py <factorexpand.ttf> <out.woff2>
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Subsetter, Options

LETTERS = "HACTEX"


def split_contours(value):
    """Split a RecordingPen trace into per-contour traces."""
    out, cur = [], []
    for op, args in value:
        cur.append((op, args))
        if op in ("closePath", "endPath"):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def bounds_of(contour, glyph_set):
    bp = BoundsPen(glyph_set)
    for op, args in contour:
        getattr(bp, op)(*args)
    return bp.bounds  # (xMin, yMin, xMax, yMax) or None


def main(src, dst):
    font = TTFont(src)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    glyf, hmtx = font["glyf"], font["hmtx"]

    for ch in LETTERS:
        name = cmap[ord(ch)]
        rec = RecordingPen()
        glyph_set[name].draw(rec)
        contours = split_contours(rec.value)

        boxes = [bounds_of(c, glyph_set) for c in contours]
        real = [(c, b) for c, b in zip(contours, boxes) if b]
        if not real:
            raise SystemExit(f"{ch}: no drawable contours")

        gx0 = min(b[0] for _, b in real)
        gx1 = max(b[2] for _, b in real)
        gy0 = min(b[1] for _, b in real)
        gy1 = max(b[3] for _, b in real)
        gw, gh = gx1 - gx0, gy1 - gy0

        # The dot: small in BOTH axes and sitting at the right-hand end. Guarding
        # on all three keeps a legitimate small stroke (or a counter) from being
        # mistaken for it.
        def is_dot(b):
            w, h = b[2] - b[0], b[3] - b[1]
            return w < gw * 0.22 and h < gh * 0.22 and b[0] > gx0 + gw * 0.7

        keep = [c for c, b in real if not is_dot(b)]
        dropped = len(real) - len(keep)
        if dropped != 1:
            raise SystemExit(
                f"{ch}: expected exactly 1 dot contour, found {dropped} "
                f"(of {len(real)}) — refusing to guess"
            )

        pen = TTGlyphPen(glyph_set)
        for c in keep:
            for op, args in c:
                getattr(pen, op)(*args)
        glyf[name] = pen.glyph()

        # Re-balance the advance: the dot lived inside the old advance width, so
        # keeping it would leave a hole after every letter. Mirror the left side
        # bearing on the right instead.
        nb = [bounds_of(c, glyph_set) for c in keep]
        new_x1 = max(b[2] for b in nb if b)
        lsb = hmtx[name][1]
        hmtx[name] = (int(new_x1 + lsb), lsb)
        print(f"  {ch}: contours {len(real)} -> {len(keep)}, advance -> {hmtx[name][0]}")

    opts = Options()
    opts.layout_features = []          # no GSUB/GPOS needed for six capitals
    opts.notdef_outline = True
    opts.desubroutinize = True
    sub = Subsetter(options=opts)
    sub.populate(text=LETTERS)
    sub.subset(font)

    font.flavor = "woff2"
    font.save(dst)
    print(f"wrote {dst}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
