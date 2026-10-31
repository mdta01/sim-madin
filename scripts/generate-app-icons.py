"""
SIM MADIN — App Icon Generator (Konsep Desain)
================================================
Creates professional app icons for all 4 mobile apps + admin web logo.

Design concept:
- Symbol: Open book (kitab) with star accent — represents Islamic education
- Background: solid brand color per app
- Foreground: white symbol for maximum contrast
- Adaptive icon: symbol only (no background) with proper safe zone padding
- Favicon: simplified version for web

Icon sizes:
- icon.png: 1024×1024 (with background)
- adaptive-icon.png: 1024×1024 (transparent, symbol centered with 25% padding)
- favicon.png: 48×48
- admin-logo.png: 512×512 (transparent, for web)
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

ROOT = os.path.dirname(os.path.abspath(__file__)).replace("/scripts", "")
APPS = {
    "mobile-wali":      {"color": (5, 150, 105),   "label": "W"},   # Emerald #059669
    "mobile-bendahara": {"color": (124, 58, 237),  "label": "B"},   # Violet #7c3aed
    "mobile-guru":      {"color": (234, 88, 12),    "label": "G"},   # Orange #ea580c
    "mobile-kepala":    {"color": (37, 99, 235),    "label": "K"},   # Blue #2563eb
}

SIZE = 1024
SAFE_ZONE_RATIO = 0.62  # 62% of canvas is safe zone (center)


def load_font(size: int) -> ImageFont.FreeTypeFont:
    """Load a suitable font for icon text."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def draw_open_book(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int, color: tuple):
    """
    Draw an open book (kitab) symbol at center (cx, cy) with given size.
    The book is drawn as two pages meeting in the center, with a spine.
    """
    w = size  # width of the open book
    h = int(size * 0.7)  # height (slightly less than width)
    
    # Book pages — two trapezoids meeting at center spine
    left_page = [
        (cx - w // 2, cy - h // 2),        # top-left
        (cx - 4, cy - h // 2 + 10),          # top-center (slightly down)
        (cx - 4, cy + h // 2 - 10),          # bottom-center (slightly up)
        (cx - w // 2, cy + h // 2),          # bottom-left
    ]
    right_page = [
        (cx + 4, cy - h // 2 + 10),
        (cx + w // 2, cy - h // 2),
        (cx + w // 2, cy + h // 2),
        (cx + 4, cy + h // 2 - 10),
    ]
    
    # Draw pages (white fill)
    draw.polygon(left_page, fill=color)
    draw.polygon(right_page, fill=color)
    
    # Draw spine (slightly darker line in center)
    spine_color = tuple(min(255, c + 30) for c in color)
    draw.line([(cx, cy - h // 2 + 5), (cx, cy + h // 2 - 5)], 
              fill=spine_color, width=3)
    
    # Draw page lines (text lines on book — subtle detail)
    line_color = tuple(max(0, c - 40) for c in color)
    for i in range(3):
        y_offset = -h // 4 + i * (h // 6)
        # Left page lines
        x1 = cx - w // 2 + 30
        x2 = cx - 20
        draw.line([(x1, cy + y_offset), (x2, cy + y_offset)], 
                  fill=line_color, width=3)
        # Right page lines
        x1 = cx + 20
        x2 = cx + w // 2 - 30
        draw.line([(x1, cy + y_offset), (x2, cy + y_offset)], 
                  fill=line_color, width=3)


def draw_star(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int, color: tuple):
    """
    Draw a 5-pointed star at (cx, cy) with given size.
    Used as accent above the book — represents achievement/excellence.
    """
    points = []
    for i in range(10):
        angle = math.pi / 2 + i * math.pi / 5
        r = size if i % 2 == 0 else size * 0.4
        x = cx + r * math.cos(angle)
        y = cy - r * math.sin(angle)
        points.append((x, y))
    draw.polygon(points, fill=color)


def draw_crescent(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int, color: tuple):
    """
    Draw a crescent moon at (cx, cy) — Islamic symbol.
    """
    # Outer circle
    draw.ellipse(
        [cx - size, cy - size, cx + size, cy + size],
        fill=color
    )
    # Inner circle (cut-out) — slightly offset to create crescent
    offset = int(size * 0.35)
    # Use background color for cut-out
    # We'll handle this with a mask approach instead
    return


def draw_madin_logo(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int, 
                    bg_color: tuple, fg_color: tuple = (255, 255, 255)):
    """
    Draw the full SIM MADIN logo:
    - Open book (kitab) in the center
    - Star above the book
    - Clean, modern, minimal
    
    Args:
        cx, cy: center coordinates
        size: overall logo size (width of book)
        bg_color: background color (for cut-outs if needed)
        fg_color: foreground color (white by default)
    """
    # Star above book
    star_size = int(size * 0.15)
    star_cy = cy - int(size * 0.45)
    draw_star(draw, cx, star_cy, star_size, fg_color)
    
    # Open book
    draw_open_book(draw, cx, cy, size, fg_color)
    
    # Small accent dots on book pages (represents text/writing)
    dot_color = tuple(max(0, c - 60) for c in fg_color)
    for i in range(2):
        y = cy - int(size * 0.15) + i * int(size * 0.15)
        # Left page dots
        for j in range(2):
            x = cx - int(size * 0.25) + j * int(size * 0.1)
            r = int(size * 0.02)
            draw.ellipse([x - r, y - r, x + r, y + r], fill=dot_color)
        # Right page dots
        for j in range(2):
            x = cx + int(size * 0.15) + j * int(size * 0.1)
            r = int(size * 0.02)
            draw.ellipse([x - r, y - r, x + r, y + r], fill=dot_color)


def create_icon_png(app_name: str, color: tuple, label: str):
    """
    Create icon.png (1024×1024) with solid background + logo.
    """
    img = Image.new("RGBA", (SIZE, SIZE), color + (255,))
    draw = ImageDraw.Draw(img)
    
    cx = SIZE // 2
    cy = SIZE // 2 + 20  # slightly below center (star is above)
    logo_size = int(SIZE * SAFE_ZONE_RATIO * 0.8)
    
    # Draw logo (white book + star on colored background)
    draw_madin_logo(draw, cx, cy, logo_size, color, (255, 255, 255, 255))
    
    # Add subtle gradient overlay at bottom (for depth)
    gradient = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(gradient)
    for i in range(SIZE // 3):
        alpha = int(i * 0.15)
        g_draw.line([(0, SIZE - SIZE // 3 + i), (SIZE, SIZE - SIZE // 3 + i)], 
                    fill=(0, 0, 0, alpha))
    img = Image.alpha_composite(img, gradient)
    
    return img


def create_adaptive_icon_png(app_name: str, color: tuple, label: str):
    """
    Create adaptive-icon.png (1024×1024) — transparent background, symbol centered.
    Android will use backgroundColor from app.json for background.
    """
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))  # transparent
    draw = ImageDraw.Draw(img)
    
    cx = SIZE // 2
    cy = SIZE // 2
    # Adaptive icon safe zone: symbol should be within 66% of canvas
    # With 25% padding on each side, symbol is at ~50% of canvas
    logo_size = int(SIZE * 0.45)  # 45% of canvas
    
    # Draw logo (symbol colored to match brand, on transparent)
    # For adaptive icon, use the brand color for the symbol
    draw_madin_logo(draw, cx, cy, logo_size, (0, 0, 0, 0), color + (255,))
    
    return img


def create_favicon(app_name: str, color: tuple):
    """Create 48×48 favicon."""
    img = Image.new("RGBA", (48, 48), color + (255,))
    draw = ImageDraw.Draw(img)
    
    # Simplified: just a book symbol
    cx = 24
    cy = 24
    size = 28
    
    # Simple book (two rectangles)
    draw.polygon([
        (cx - size//2, cy - size//3),
        (cx - 1, cy - size//3 + 2),
        (cx - 1, cy + size//3 - 2),
        (cx - size//2, cy + size//3),
    ], fill=(255, 255, 255, 255))
    draw.polygon([
        (cx + 1, cy - size//3 + 2),
        (cx + size//2, cy - size//3),
        (cx + size//2, cy + size//3),
        (cx + 1, cy + size//3 - 2),
    ], fill=(255, 255, 255, 255))
    
    return img


def create_admin_logo():
    """
    Create admin web logo (512×512, transparent).
    Uses the primary brand color (violet #7c3aed) with white symbol.
    """
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))  # transparent
    draw = ImageDraw.Draw(img)
    
    cx = size // 2
    cy = size // 2
    logo_size = int(size * 0.6)
    
    # Draw with violet color symbol on transparent
    color = (124, 58, 237, 255)  # #7c3aed
    draw_madin_logo(draw, cx, cy, logo_size, (0, 0, 0, 0), color)
    
    return img


def main():
    print("=" * 60)
    print("SIM MADIN — App Icon Generator")
    print("=" * 60)
    print()
    print("Design concept: Open book (kitab) + star accent")
    print("  - Symbolizes Islamic education & achievement")
    print("  - Clean, modern, minimal design")
    print("  - White symbol on brand-colored background")
    print()
    
    for app_name, config in APPS.items():
        color = config["color"]
        label = config["label"]
        assets_dir = os.path.join(ROOT, "apps", app_name, "assets")
        os.makedirs(assets_dir, exist_ok=True)
        
        print(f"▸ {app_name} (color: #{color[0]:02x}{color[1]:02x}{color[2]:02x})")
        
        # icon.png (1024×1024 with background)
        icon = create_icon_png(app_name, color, label)
        icon_path = os.path.join(assets_dir, "icon.png")
        icon.save(icon_path, "PNG")
        print(f"  ✓ icon.png ({icon.size[0]}×{icon.size[1]})")
        
        # adaptive-icon.png (1024×1024 transparent)
        adaptive = create_adaptive_icon_png(app_name, color, label)
        adaptive_path = os.path.join(assets_dir, "adaptive-icon.png")
        adaptive.save(adaptive_path, "PNG")
        print(f"  ✓ adaptive-icon.png ({adaptive.size[0]}×{adaptive.size[1]})")
        
        # favicon.png (48×48)
        favicon = create_favicon(app_name, color)
        favicon_path = os.path.join(assets_dir, "favicon.png")
        favicon.save(favicon_path, "PNG")
        print(f"  ✓ favicon.png ({favicon.size[0]}×{favicon.size[1]})")
        print()
    
    # Admin web logo
    print("▸ Admin Web Logo")
    admin_logo = create_admin_logo()
    admin_path = os.path.join(ROOT, "public", "admin-logo.png")
    os.makedirs(os.path.dirname(admin_path), exist_ok=True)
    admin_logo.save(admin_path, "PNG")
    print(f"  ✓ admin-logo.png ({admin_logo.size[0]}×{admin_logo.size[1]}) — transparent")
    print()
    
    # Also save a preview of all 4 icons side by side
    print("▸ Creating preview image (all 4 icons + admin logo)...")
    preview_w = 5 * 256 + 6 * 20  # 5 icons, 256px each, 20px gap
    preview_h = 256 + 60
    preview = Image.new("RGBA", (preview_w, preview_h), (248, 250, 252, 255))
    preview_draw = ImageDraw.Draw(preview)
    
    icons_preview = []
    for app_name, config in APPS.items():
        icon = create_icon_png(app_name, config["color"], config["label"])
        icon_small = icon.resize((256, 256), Image.LANCZOS)
        icons_preview.append((icon_small, app_name))
    
    # Add admin logo
    admin_small = admin_logo.resize((256, 256), Image.LANCZOS)
    icons_preview.append((admin_small, "Admin Web"))
    
    x = 20
    for img, name in icons_preview:
        preview.paste(img, (x, 30), img if img.mode == "RGBA" else None)
        # Add label
        try:
            font = load_font(14)
        except:
            font = ImageFont.load_default()
        preview_draw.text((x + 50, 0), name, fill=(30, 41, 59, 255), font=font)
        x += 256 + 20
    
    preview_path = os.path.join(ROOT, "download", "icon-preview.png")
    os.makedirs(os.path.dirname(preview_path), exist_ok=True)
    preview.save(preview_path, "PNG")
    print(f"  ✓ Preview saved to download/icon-preview.png")
    print()
    
    print("=" * 60)
    print("✅ All icons generated successfully!")
    print("=" * 60)
    print()
    print("Files created:")
    print(f"  - 4× icon.png (1024×1024) — app icons")
    print(f"  - 4× adaptive-icon.png (1024×1024) — Android adaptive")
    print(f"  - 4× favicon.png (48×48) — web favicons")
    print(f"  - 1× admin-logo.png (512×512) — admin web logo")
    print(f"  - 1× icon-preview.png — preview of all icons")
    print()
    print("Design: Open book (kitab) + star = Islamic education + achievement")


if __name__ == "__main__":
    main()
