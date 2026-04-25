from __future__ import annotations

import base64
import re
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
import pytesseract
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pyzbar.pyzbar import decode as decode_qr

app = FastAPI(title="Document Vision Service", version="1.0.0")


def _read_image(file_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid or unsupported image file")
    return image


def _deskew(gray: np.ndarray) -> np.ndarray:
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    coords = np.column_stack(np.where(thresh > 0))

    if coords.size == 0:
        return gray

    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    h, w = gray.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(gray, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def preprocess_image(image: np.ndarray) -> np.ndarray:
    h, w = image.shape[:2]
    target_width = 1800
    if w < target_width:
        ratio = target_width / float(w)
        image = cv2.resize(image, (target_width, int(h * ratio)), interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    deskewed = _deskew(gray)

    sharpen_kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(deskewed, -1, sharpen_kernel)

    thresholded = cv2.adaptiveThreshold(
        sharpened,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        8,
    )

    return thresholded


def _xml_lookup(attrs: Dict[str, str], *keys: str) -> Optional[str]:
    lower_map = {str(k).lower(): str(v) for k, v in attrs.items()}
    for key in keys:
        value = lower_map.get(key.lower())
        if value:
            return value.strip()
    return None


def _parse_aadhaar_xml(payload: str) -> Optional[Dict[str, Optional[str]]]:
    if "<" not in payload or ">" not in payload:
        return None

    try:
        root = ET.fromstring(payload.strip())
    except ET.ParseError:
        return None

    attrs: Dict[str, str] = dict(root.attrib)
    for child in root.iter():
        if child is root:
            continue
        for key, value in child.attrib.items():
            attrs.setdefault(key, value)
        if child.text and child.text.strip():
            attrs.setdefault(child.tag, child.text.strip())

    address = _xml_lookup(attrs, "address")
    if not address:
        address_parts = [
            _xml_lookup(attrs, "house"),
            _xml_lookup(attrs, "street"),
            _xml_lookup(attrs, "lm"),
            _xml_lookup(attrs, "loc"),
            _xml_lookup(attrs, "vtc"),
            _xml_lookup(attrs, "dist"),
            _xml_lookup(attrs, "state"),
            _xml_lookup(attrs, "pc"),
        ]
        clean_parts = [part for part in address_parts if part]
        address = ", ".join(clean_parts) if clean_parts else None

    data = {
        "aadhaarNumber": _xml_lookup(attrs, "uid", "aadhaar", "aadhaarnumber"),
        "name": _xml_lookup(attrs, "name"),
        "dob": _xml_lookup(attrs, "dob", "yob"),
        "gender": _xml_lookup(attrs, "gender", "g"),
        "address": address,
    }

    if any(data.values()):
        return data

    return None


def _extract_qr_payloads(image: np.ndarray) -> List[str]:
    variants = [
        image,
        preprocess_image(image),
        cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE),
        cv2.rotate(image, cv2.ROTATE_180),
        cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE),
    ]

    payloads: List[str] = []
    for variant in variants:
        decoded = decode_qr(variant)
        for code in decoded:
            raw = code.data.decode("utf-8", errors="ignore").strip()
            if raw and raw not in payloads:
                payloads.append(raw)

    return payloads


def _ocr_confidence(image: np.ndarray, config: str) -> float:
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT, config=config, lang="eng")
    conf_values = []
    for conf in data.get("conf", []):
        try:
            val = float(conf)
        except (TypeError, ValueError):
            continue
        if val >= 0:
            conf_values.append(val)

    if not conf_values:
        return 0.0

    return round(sum(conf_values) / len(conf_values), 2)


def _normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _extract_aadhaar_number(text: str) -> Optional[str]:
    matches = re.findall(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", text)
    for match in matches:
        digits = re.sub(r"\D", "", match)
        if len(digits) == 12 and not digits.startswith(("0", "1")):
            return digits
    return None


def _extract_pan_number(text: str) -> Optional[str]:
    match = re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", text.upper())
    if match:
        return match.group(0)
    return None


def _extract_dob(text: str) -> Optional[str]:
    match = re.search(r"\b\d{2}[/-]\d{2}[/-]\d{4}\b", text)
    return match.group(0) if match else None


def _extract_gender(text: str) -> Optional[str]:
    upper = text.upper()
    if "FEMALE" in upper:
        return "Female"
    if "MALE" in upper:
        return "Male"
    if "OTHER" in upper:
        return "Other"
    return None


def _extract_name(text: str) -> Optional[str]:
    lines = [_normalize_space(line) for line in text.splitlines() if _normalize_space(line)]

    for i in range(len(lines) - 1):
        if re.search(r"DOB|DATE\s*OF\s*BIRTH|BIRTH", lines[i + 1], re.IGNORECASE):
            candidate = re.sub(r"[^A-Za-z\s]", "", lines[i]).strip()
            if len(candidate) >= 4:
                return candidate.title()

    for line in lines:
        match = re.search(r"(?:Name|नाम)\s*[:\-]?\s*(.+)$", line, re.IGNORECASE)
        if match:
            candidate = re.sub(r"[^A-Za-z\s]", "", match.group(1)).strip()
            if len(candidate) >= 4:
                return candidate.title()

    return None


def _extract_address(text: str) -> Optional[str]:
    one_line = _normalize_space(text.replace("\n", " "))
    match = re.search(r"(?:Address|पता)\s*[:\-]?\s*(.*?)(?=\b\d{6}\b|$)", one_line, re.IGNORECASE)
    if match:
        value = _normalize_space(match.group(1))
        if len(value) > 10:
            return value
    return None


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"success": True, "data": {"status": "ok"}}


@app.post("/process-qr")
async def process_qr(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        file_bytes = await file.read()
        image = _read_image(file_bytes)
        payloads = _extract_qr_payloads(image)

        for payload in payloads:
            parsed = _parse_aadhaar_xml(payload)
            if parsed:
                confidence = 0
                if parsed.get("aadhaarNumber"):
                    confidence += 45
                if parsed.get("name"):
                    confidence += 20
                if parsed.get("dob"):
                    confidence += 15
                if parsed.get("gender"):
                    confidence += 10
                if parsed.get("address"):
                    confidence += 10

                return {
                    "success": True,
                    "data": {
                        "qrFound": True,
                        "rawPayload": payload,
                        "extractedData": parsed,
                        "confidenceScore": min(100, confidence),
                        "message": "QR code detected and Aadhaar XML parsed",
                    },
                }

        return {
            "success": True,
            "data": {
                "qrFound": False,
                "rawPayload": None,
                "extractedData": None,
                "confidenceScore": 0,
                "message": "No readable Aadhaar QR data found",
            },
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"QR processing failed: {exc}") from exc


@app.post("/process-ocr")
async def process_ocr(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        file_bytes = await file.read()
        image = _read_image(file_bytes)
        processed = preprocess_image(image)

        whitelist = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/:-.,() "
        config = f"--psm 6 --oem 3 -c tessedit_char_whitelist={whitelist}"

        text = pytesseract.image_to_string(processed, lang="eng", config=config)
        text = text or ""

        extracted_data = {
            "aadhaarNumber": _extract_aadhaar_number(text),
            "panNumber": _extract_pan_number(text),
            "name": _extract_name(text),
            "dob": _extract_dob(text),
            "gender": _extract_gender(text),
            "address": _extract_address(text),
        }

        confidence = _ocr_confidence(processed, config)

        return {
            "success": True,
            "data": {
                "text": text,
                "extractedData": extracted_data,
                "confidenceScore": confidence,
                "message": "OCR extraction completed",
            },
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}") from exc


@app.post("/preprocess")
async def preprocess(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        file_bytes = await file.read()
        image = _read_image(file_bytes)
        processed = preprocess_image(image)

        ok, encoded = cv2.imencode(".png", processed)
        if not ok:
            raise ValueError("Could not encode processed image")

        b64_img = base64.b64encode(encoded.tobytes()).decode("utf-8")

        return {
            "success": True,
            "data": {
                "imageBase64": b64_img,
                "mimeType": "image/png",
                "message": "Image preprocessed successfully",
            },
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Preprocess failed: {exc}") from exc


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException) -> Any:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "message": str(exc.detail),
        },
    )
