#!/usr/bin/env python3
"""
Precise Q56 extraction focusing on the integral expression
"""
import os
import sys
from pdf2image import convert_from_path
import base64
from io import BytesIO
from google import generativeai as genai

PDF_PATH = "/Users/apple/Downloads/CETPAPERS/03-KCET-Board-Exam-Maths-16-06-2022-M1.pdf"
API_KEY = "AIzaSyCuFj4MCIL_AoQDf0HAoqtQGPdbL5WoCw8"

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash-exp',
                              generation_config={
                                  'temperature': 0.0  # Most deterministic
                              })

print("Converting PDF page 6...")
images = convert_from_path(PDF_PATH, first_page=6, last_page=6, dpi=300)
img = images[0]

# Convert to base64
buffered = BytesIO()
img.save(buffered, format="PNG")
img_base64 = base64.b64encode(buffered.getvalue()).decode()

prompt = """Look at question 56 on this page.

CRITICAL: Focus ONLY on the integral expression (the part after "If" and before the "=" sign).

What is in the NUMERATOR of the integral?
- Is it just "dx" (meaning 1)?
- Or is it "x² + b"?
- Or something else?

Respond with ONLY the complete integral expression in LaTeX format.
For example: \\int \\frac{dx}{(x+2)(x^2+1)}
Or: \\int \\frac{x^2+b}{(x+2)(x^2+1)} dx

Be absolutely precise about what appears in the numerator."""

response = model.generate_content([
    prompt,
    {
        'mime_type': 'image/png',
        'data': img_base64
    }
])

print("\n" + "="*60)
print("ORIGINAL Q56 INTEGRAL EXPRESSION:")
print("="*60)
print(response.text.strip())
print("="*60)
