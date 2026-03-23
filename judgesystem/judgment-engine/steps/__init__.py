#coding: utf-8

"""
steps/ - Step-based processing modules

- step0_prepare: Document preparation (HTML fetch, link extract, PDF download, OCR)
- step1_transcribe: Transcription processing
- step2_ocr: OCR processing (Gemini API calls)
- step3_judge: Requirement judgment
"""

from steps.step0_prepare import BidJudgementSan
