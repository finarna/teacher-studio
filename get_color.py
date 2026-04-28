from PIL import Image

try:
    img = Image.open("public/landing/features/4.png")
    img = img.convert("RGB")
    color = img.getpixel((img.width // 2, 10))
    print(f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}")
except Exception as e:
    print(f"Error: {e}")
