#!/usr/bin/env python3
"""
Direct Q56 extraction test from original PDF
Uses Gemini exp model with strict verbatim extraction
"""
import os
import sys
from pdf2image import convert_from_path
import base64
from io import BytesIO
from google import generativeai as genai

# Configuration
PDF_PATH = "/Users/apple/Downloads/CETPAPERS/03-KCET-Board-Exam-Maths-16-06-2022-M1.pdf"
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("ERROR: GEMINI_API_KEY not set")
    sys.exit(1)

genai.configure(api_key=API_KEY)

# Use the upgraded model
model = genai.GenerativeModel('gemini-2.0-flash-exp')

print("Converting PDF to images...")
images = convert_from_path(PDF_PATH, dpi=200)

print(f"PDF has {len(images)} pages")

# Q56 is likely on page 5-6 (questions typically ~10 per page, Q56 would be around page 6)
# Let's check pages 5, 6, 7
for page_num in [5, 6, 7]:
    if page_num > len(images):
        continue

    print(f"\n{'='*60}")
    print(f"Checking Page {page_num}")
    print('='*60)

    img = images[page_num - 1]

    # Convert to base64
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode()

    prompt = f"""You are extracting questions from a mathematics exam paper.

CRITICAL INSTRUCTIONS - VERBATIM EXTRACTION ONLY:
1. Look for question number 56 on this page
2. Extract the EXACT text as printed - DO NOT paraphrase, interpret, or modify
3. Copy mathematical expressions EXACTLY as they appear
4. If you see "dx" in the numerator, write "dx"
5. If you see "1" in the numerator, write "1"
6. If you see "x²+b" in the numerator, write "x²+b"
7. Pay special attention to what appears in fractions - numerator vs denominator

If question 56 is on this page, respond with:
FOUND: [exact question text with all mathematical notation]

If question 56 is NOT on this page, respond with:
NOT_FOUND

Be absolutely precise - this is for exam accuracy verification."""

    response = model.generate_content([
        prompt,
        {
            'mime_type': 'image/png',
            'data': img_base64
        }
    ])

    result = response.text.strip()
    print(result)

    if "FOUND:" in result:
        print(f"\n✅ Found Q56 on page {page_num}")
        print("\nExtracted text:")
        print(result.replace("FOUND:", "").strip())
        break
