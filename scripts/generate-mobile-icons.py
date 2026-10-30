"""
Generate placeholder icon & adaptive icon PNG assets for the 4 mobile apps.
Each app gets its brand color background + initials text (S M = SIM MADIN).

Output: apps/mobile-<name>/assets/icon.png (1024x1024)
        apps/mobile-<name>/assets/adaptive-icon.png (1024x1024, with safe-zone padding)
        apps/mobile-<name>/assets/favicon.png (48x48)
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APPS = {
    "mobile-bendahara": {"color": "#7c3aed", "label": "B"},  # purple
    "mobile-guru":      {"color": "#ea580c", "label": "G"},  # orange
    "mobile-kepala":    {"color": "#2563eb", "label": "K"},  # blue
    "mobile-wali":      {"color": "#059669", "label": "W"},  # green
}

def load_font(size: int) -> ImageFont.FreeTypeFont:
    """Try to load a CJK-capable bold font; fall back to default if missing."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def draw_icon(size: int, bg_hex: str, label: str, padding_ratio: float = 0.0) -> Image.Image:
    """Draw a square icon: solid bg + large centered initial."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    bg = hex_to_rgb(bg_hex)
    # Rounded-rect background (with safe-zone padding for adaptive icon)
    pad = int(size * padding_ratio)
    radius = int(size * 0.22)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=bg + (255,),
    )

    # White circular "badge" for the letter
    badge_r = int(size * 0.30)
    cx = cy = size // 2
    draw.ellipse(
        [cx - badge_r, cy - badge_r, cx + badge_r, cy + badge_r],
        fill=(255, 255, 255, 255),
    )

    # Letter
    font = load_font(int(size * 0.32))
    text = label
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = cx - tw // 2 - bbox[0]
        ty = cy - th // 2 - bbox[1]
    except Exception:
        tw, th = font.getsize(text)
        tx = cx - tw // 2
        ty = cy - th // 2
    draw.text((tx, ty), text, fill=bg + (255,), font=font)

    return img

def main() -> None:
    print("Generating placeholder icons for 4 mobile apps...\n")
    for app_name, cfg in APPS.items():
        assets_dir = ROOT / "apps" / app_name / "assets"
        assets_dir.mkdir(parents=True, exist_ok=True)

        # icon.png — 1024x1024 standard launcher icon
        icon = draw_icon(1024, cfg["color"], cfg["label"])
        icon_path = assets_dir / "icon.png"
        icon.save(icon_path, "PNG")
        print(f"  {app_name}/assets/icon.png ({icon_path.stat().st_size // 1024} KB)")

        # adaptive-icon.png — 1024x1024 with safe-zone padding (EAS will crop to circle)
        adaptive = draw_icon(1024, cfg["color"], cfg["label"], padding_ratio=0.15)
        adaptive_path = assets_dir / "adaptive-icon.png"
        adaptive.save(adaptive_path, "PNG")
        print(f"  {app_name}/assets/adaptive-icon.png ({adaptive_path.stat().st_size // 1024} KB)")

        # favicon.png — 48x48 web favicon
        favicon = draw_icon(48, cfg["color"], cfg["label"])
        favicon_path = assets_dir / "favicon.png"
        favicon.save(favicon_path, "PNG")
        print(f"  {app_name}/assets/favicon.png ({favicon_path.stat().st_size} B)")
        print()

    print("Done. All 12 placeholder assets generated.")

if __name__ == "__main__":
    main()
