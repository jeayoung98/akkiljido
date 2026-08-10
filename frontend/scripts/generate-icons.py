"""브랜드 캐릭터 로고(assets/akkiljido-logo.png)로 앱 아이콘/스플래시/파비콘을 다시 생성한다.
지금 assets/images/ 아래 있는 파일들은 전부 Expo 스캐폴딩 기본 이미지(파란 화살표)라서,
같은 파일명·크기를 유지한 채 내용만 실제 브랜드 로고로 교체한다.
"""
from PIL import Image, ImageOps

SRC = "assets/akkiljido-logo.png"
OUT_DIR = "assets/images"

# 앱 전역 색상 토큰(constants/Colors.ts)과 맞춘 값.
BG_MAIN = (252, 255, 253, 255)  # Colors.light.background #FCFFFD
BG_MUTED = (243, 248, 244, 255)  # Colors.light.cardMutedBackground #F3F8F4


def load_trimmed_logo():
    img = Image.open(SRC).convert("RGBA")
    bbox = img.getbbox()
    return img.crop(bbox)


def paste_centered(canvas: Image.Image, logo: Image.Image, target_w: int, target_h: int):
    """logo를 비율 유지한 채 target_w x target_h 안에 맞추고, canvas 중앙에 알파 합성한다."""
    resized = ImageOps.contain(logo, (target_w, target_h), Image.LANCZOS)
    x = (canvas.width - resized.width) // 2
    y = (canvas.height - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))


def make_icon(logo, size, bg_rgba, out_path, logo_ratio=0.72):
    canvas = Image.new("RGBA", (size, size), bg_rgba)
    paste_centered(canvas, logo, int(size * logo_ratio), int(size * logo_ratio))
    # 앱스토어/EAS 아이콘은 알파 채널이 있으면 안 되므로 불투명 RGB로 저장한다.
    canvas.convert("RGB").save(out_path)


def make_transparent(logo, size, out_path, logo_ratio=0.55):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    paste_centered(canvas, logo, int(size * logo_ratio), int(size * logo_ratio))
    canvas.save(out_path)


def make_flat_background(size, bg_rgba, out_path):
    Image.new("RGBA", (size, size), bg_rgba).save(out_path)


def make_monochrome(logo, size, out_path, logo_ratio=0.55):
    # 안드로이드 13+ 테마 아이콘용. 로고의 알파를 그대로 마스크로 써서 흰색 실루엣만 남긴다.
    resized = ImageOps.contain(logo, (int(size * logo_ratio), int(size * logo_ratio)), Image.LANCZOS)
    alpha = resized.split()[-1]
    white_silhouette = Image.new("RGBA", resized.size, (255, 255, 255, 0))
    white_silhouette.putalpha(alpha)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - resized.width) // 2
    y = (size - resized.height) // 2
    canvas.alpha_composite(white_silhouette, (x, y))
    canvas.save(out_path)


def make_favicon(logo, size, out_path):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    paste_centered(canvas, logo, int(size * 0.92), int(size * 0.92))
    canvas.save(out_path)


logo = load_trimmed_logo()

# 1. 메인 앱 아이콘 (iOS/EAS 빌드·QR 다운로드 페이지에 표시되는 아이콘) — 1024x1024, 불투명.
make_icon(logo, 1024, BG_MUTED, f"{OUT_DIR}/icon.png")

# 2. 안드로이드 어댑티브 아이콘 전경 — 투명 배경, 안전영역(마스크로 잘려도 안 잘리는 중앙 원) 고려해 축소.
make_transparent(logo, 512, f"{OUT_DIR}/android-icon-foreground.png", logo_ratio=0.55)

# 3. 안드로이드 어댑티브 아이콘 배경 — 로고 없이 브랜드 색 단색 판.
make_flat_background(512, BG_MUTED, f"{OUT_DIR}/android-icon-background.png")

# 4. 안드로이드 13+ 테마(모노크롬) 아이콘 — 흰색 실루엣.
make_monochrome(logo, 432, f"{OUT_DIR}/android-icon-monochrome.png", logo_ratio=0.55)

# 5. 웹 파비콘 — 작아서 여백 최소화.
make_favicon(logo, 48, f"{OUT_DIR}/favicon.png")

# 6. 스플래시 화면 로고 — expo-splash-screen이 backgroundColor 위에 contain으로 얹으므로 투명 배경.
make_transparent(logo, 1024, f"{OUT_DIR}/splash-icon.png", logo_ratio=0.42)

print("done")
