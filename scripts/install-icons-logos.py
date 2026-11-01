"""
SIM MADIN — Pasang icon.png + logo-madrasah.png ke semua aplikasi
==================================================================
- icon.png → 1024×1024 app icon untuk 4 mobile apps
- logo-madrasah.png → login page logo untuk 4 mobile apps + admin web
- adaptive-icon.png → generate dari icon (transparent bg)
- favicon → generate dari icon
"""

from PIL import Image, ImageDraw
import os
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__)).replace("/scripts", "")
UPLOAD_DIR = os.path.join(ROOT, "upload")

# Source files
ICON_SRC = os.path.join(UPLOAD_DIR, "icon.png")
LOGO_SRC = os.path.join(UPLOAD_DIR, "logo-madrasah.png")

APPS = ["mobile-wali", "mobile-bendahara", "mobile-guru", "mobile-kepala"]

# Target sizes
ICON_SIZE = 1024
ADAPTIVE_SIZE = 1024
FAVICON_SIZE = 48
LOGO_LOGIN_SIZE = 200  # Logo di login screen mobile (200×200 approx)
LOGO_ADMIN_SIZE = 192   # Logo di admin web sidebar

def main():
    print("=" * 60)
    print("SIM MADIN — Pasang Icon + Logo ke Semua Aplikasi")
    print("=" * 60)
    print()

    # Verify source files exist
    if not os.path.exists(ICON_SRC):
        print(f"❌ Source icon not found: {ICON_SRC}")
        return
    if not os.path.exists(LOGO_SRC):
        print(f"❌ Source logo not found: {LOGO_SRC}")
        return

    # Load source images
    icon_src = Image.open(ICON_SRC).convert("RGBA")
    logo_src = Image.open(LOGO_SRC).convert("RGBA")
    print(f"Source icon: {icon_src.size[0]}x{icon_src.size[1]}")
    print(f"Source logo: {logo_src.size[0]}x{logo_src.size[1]}")
    print()

    # === 1. Process icon.png for all 4 mobile apps ===
    print("▸ Processing app icons for 4 mobile apps...")

    # Resize icon to 1024×1024 (pad if needed to maintain aspect ratio)
    icon_1024 = resize_with_padding(icon_src, ICON_SIZE, ICON_SIZE)

    # Create adaptive icon (transparent background, just the symbol)
    # Since icon.png has white background, we need to make it transparent
    adaptive_1024 = create_adaptive_icon(icon_src)

    # Create favicon (48×48)
    favicon = icon_1024.resize((FAVICON_SIZE, FAVICON_SIZE), Image.LANCZOS)

    for app in APPS:
        assets_dir = os.path.join(ROOT, "apps", app, "assets")
        os.makedirs(assets_dir, exist_ok=True)

        # Save icon.png
        icon_path = os.path.join(assets_dir, "icon.png")
        icon_1024.save(icon_path, "PNG")
        print(f"  ✓ {app}/assets/icon.png (1024×1024)")

        # Save adaptive-icon.png
        adaptive_path = os.path.join(assets_dir, "adaptive-icon.png")
        adaptive_1024.save(adaptive_path, "PNG")
        print(f"  ✓ {app}/assets/adaptive-icon.png (1024×1024)")

        # Save favicon
        favicon_path = os.path.join(assets_dir, "favicon.png")
        favicon.save(favicon_path, "PNG")
        print(f"  ✓ {app}/assets/favicon.png (48×48)")

        # Copy logo-madrasah.png to assets
        logo_path = os.path.join(assets_dir, "logo-madrasah.png")
        logo_resized = logo_src.copy()
        # Keep original size (login screen will scale it)
        logo_src.save(logo_path, "PNG")
        print(f"  ✓ {app}/assets/logo-madrasah.png ({logo_src.size[0]}x{logo_src.size[1]})")
        print()

    # === 2. Admin web logo ===
    print("▸ Processing admin web logo...")
    public_dir = os.path.join(ROOT, "public")
    os.makedirs(public_dir, exist_ok=True)

    # Save admin logo (original size, transparent)
    admin_logo_path = os.path.join(public_dir, "admin-logo.png")
    logo_src.save(admin_logo_path, "PNG")
    print(f"  ✓ public/admin-logo.png ({logo_src.size[0]}x{logo_src.size[1]})")

    # Save favicon for web
    web_favicon_path = os.path.join(public_dir, "favicon.png")
    favicon.save(web_favicon_path, "PNG")
    print(f"  ✓ public/favicon.png (48×48)")
    print()

    # === 3. Copy to download for preview ===
    download_dir = os.path.join(ROOT, "download")
    os.makedirs(download_dir, exist_ok=True)
    preview_path = os.path.join(download_dir, "logo-madrasah.png")
    logo_src.save(preview_path, "PNG")
    print(f"  ✓ download/logo-madrasah.png (preview)")

    # Create a combined preview
    preview_w = 3 * 300 + 4 * 20
    preview_h = 320
    preview = Image.new("RGBA", (preview_w, preview_h), (248, 250, 252, 255))
    
    # Icon preview (on colored bg to show how it looks as app icon)
    icon_preview = icon_1024.resize((280, 280), Image.LANCZOS)
    preview.paste(icon_preview, (20, 20), icon_preview if icon_preview.mode == "RGBA" else None)
    
    # Logo preview (transparent bg)
    logo_preview = logo_src.resize((280, 280), Image.LANCZOS)
    # Paste on white bg for visibility
    white_bg = Image.new("RGBA", (280, 280), (255, 255, 255, 255))
    white_bg.alpha_composite(logo_preview)
    preview.paste(white_bg, (320, 20))
    
    # Adaptive icon preview
    adaptive_preview = adaptive_1024.resize((280, 280), Image.LANCZOS)
    preview.paste(adaptive_preview, (620, 20), adaptive_preview if adaptive_preview.mode == "RGBA" else None)
    
    preview_save = os.path.join(download_dir, "icon-logo-preview.png")
    preview.save(preview_save, "PNG")
    print(f"  ✓ download/icon-logo-preview.png (combined preview)")
    print()

    print("=" * 60)
    print("✅ All icons + logos installed!")
    print("=" * 60)
    print()
    print("Summary:")
    print(f"  - icon.png (1024×1024) → 4 apps × (icon + adaptive + favicon)")
    print(f"  - logo-madrasah.png (800×796) → 4 apps assets + public/admin-logo.png")
    print()
    print("Next: Update login screens to display logo-madrasah.png")


def resize_with_padding(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Resize image to fit within target dimensions, padding with white if needed."""
    # Calculate aspect ratio
    src_w, src_h = img.size
    src_ratio = src_w / src_h
    target_ratio = target_w / target_h

    if src_ratio > target_ratio:
        # Source is wider — fit to width
        new_w = target_w
        new_h = int(target_w / src_ratio)
    else:
        # Source is taller — fit to height
        new_h = target_h
        new_w = int(target_h * src_ratio)

    # Resize
    resized = img.resize((new_w, new_h), Image.LANCZOS)

    # Create canvas with white background
    canvas = Image.new("RGBA", (target_w, target_h), (255, 255, 255, 255))

    # Center the image
    offset_x = (target_w - new_w) // 2
    offset_y = (target_h - new_h) // 2
    canvas.alpha_composite(resized, (offset_x, offset_y))

    return canvas


def create_adaptive_icon(icon_src: Image.Image) -> Image.Image:
    """
    Create adaptive icon from source icon.
    Since icon.png has white background, we:
    1. Resize to 1024×1024
    2. Make white pixels transparent
    3. Center with 25% padding for Android safe zone
    """
    # Resize to 1024
    icon_resized = resize_with_padding(icon_src, ICON_SIZE, ICON_SIZE)
    
    # Convert to RGBA
    icon_rgba = icon_resized.convert("RGBA")
    
    # Make near-white pixels transparent (threshold-based)
    data = icon_rgba.getdata()
    new_data = []
    for item in data:
        r, g, b, a = item
        # If pixel is very close to white, make it transparent
        if r > 240 and g > 240 and b > 240:
            new_data.append((r, g, b, 0))  # transparent
        else:
            new_data.append((r, g, b, a))  # keep as-is
    icon_rgba.putdata(new_data)
    
    # Create adaptive icon canvas with proper safe zone (25% padding)
    canvas = Image.new("RGBA", (ADAPTIVE_SIZE, ADAPTIVE_SIZE), (0, 0, 0, 0))
    
    # Scale symbol to 66% of canvas (Android safe zone)
    symbol_size = int(ADAPTIVE_SIZE * 0.66)
    symbol = icon_rgba.resize((symbol_size, symbol_size), Image.LANCZOS)
    
    # Center
    offset = (ADAPTIVE_SIZE - symbol_size) // 2
    canvas.alpha_composite(symbol, (offset, offset))
    
    return canvas


if __name__ == "__main__":
    main()
