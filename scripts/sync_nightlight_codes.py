#!/usr/bin/env python3
"""Sincroniza códigos mostrados públicamente por NightLight, sin afirmar confirmación oficial.
No modifica data/codigos.json ni las fuentes existentes de SanLean.
"""
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

URL = "https://nightlight.gg/codes"
OUTPUT = Path("data/codigos-nightlight.json")
CODE = re.compile(r"^[A-Z][A-Z0-9_-]{2,63}$")
BOUNDARIES = (
    ("Active Time Limited DBD Codes", "active"),
    ("DBD Codes that Never Expire", "permanent"),
    ("Expired Codes", "expired"),
)
IGNORE = {"NEW", "DBD", "N/A", "COPY", "CODE", "ACTIVE", "SHOW", "LOGIN"}


def extracted_strings(html):
    soup = BeautifulSoup(html, "html.parser")
    for element in soup(["script", "style", "noscript", "svg", "header", "footer"]):
        element.decompose()
    root = soup.find("main") or soup
    return [re.sub(r"\s+", " ", value).strip() for value in root.stripped_strings]


def expiry_date(text, now):
    match = re.search(r"Expires?:\s*(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{2,4}))?", text, re.I)
    if not match:
        return None
    months = {name.lower(): i for i, name in enumerate(
        ("January", "February", "March", "April", "May", "June",
         "July", "August", "September", "October", "November", "December"), 1)}
    month = months.get(match.group(2).lower())
    if month is None:
        return None
    year_text = match.group(3)
    year = int(year_text) if year_text else now.year
    if year < 100:
        year += 2000
    try:
        return datetime(year, month, int(match.group(1)), 23, 59, 59, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
    except ValueError:
        return None


def parse_visible(html):
    lines = extracted_strings(html)
    boundaries = []
    for needle, status in BOUNDARIES:
        matches = [i for i, value in enumerate(lines) if needle.lower() in value.lower()]
        if not matches:
            raise ValueError("Falta la sección NightLight: " + needle)
        boundaries.append((matches[0], status))
    boundaries.sort()
    today = datetime.now(timezone.utc)
    codes = {}
    for section_index, (start, category) in enumerate(boundaries):
        end = boundaries[section_index + 1][0] if section_index + 1 < len(boundaries) else len(lines)
        if category == "expired":
            for i in range(start + 1, end):
                if "Frequently Asked Questions" in lines[i]:
                    end = i
                    break
        segment = lines[start + 1:end]
        for i, word in enumerate(segment):
            if not CODE.fullmatch(word) or word in IGNORE:
                continue
            context = " ".join(segment[i + 1:i + 5])
            if category == "expired":
                valid = bool(re.search(r"\bExpired\b", context, re.I))
            else:
                valid = bool(re.search(r"\bExpires?\s*:", context, re.I))
            if not valid:
                continue
            reward = segment[i - 1] if i else ""
            if not reward or reward.lower().startswith(("expires", "added", "copy code")):
                reward = "Consultá la recompensa en NightLight."
            date = expiry_date(context, today) if category == "active" else None
            if category == "active" and date is None:
                # Conservador: mantener la categoría temporal, sin inventar una fecha.
                expiry_policy = "unknown"
            elif category == "permanent":
                expiry_policy = "never"
            else:
                expiry_policy = "dated" if date else "unknown"
            codes[word] = {
                "code": word,
                "reward": reward,
                "status": "expired" if category == "expired" else "active",
                "official": False,
                "confidence": "COMMUNITY_VERIFIED",
                "source": "nightlight",
                "sourceType": "nightlight",
                "sourceUrl": URL,
                "expiryPolicy": expiry_policy,
                "expiresAt": date,
                "detectedAt": today.isoformat().replace("+00:00", "Z"),
                "publishedAt": today.isoformat().replace("+00:00", "Z"),
            }
    if len(codes) < 10 or not any(c["expiryPolicy"] == "never" for c in codes.values()):
        raise ValueError(f"Lectura incompleta de NightLight: {len(codes)} códigos; se conserva el catálogo anterior")
    return {"schemaVersion": 1, "updatedAt": today.isoformat().replace("+00:00", "Z"),
            "source": URL, "codes": list(codes.values())}



def parse_stream(html):
    """Extrae el catálogo completo del JSON serializado de React Router.

    NightLight muestra sólo una página de la lista, pero entrega todos los registros
    en el loaderData público. Nunca se interpreta el JavaScript ni se ejecuta código.
    """
    soup = BeautifulSoup(html, "html.parser")
    needle = "window.__reactRouterContext.streamController.enqueue("
    now = datetime.now(timezone.utc)
    stamp = now.isoformat().replace("+00:00", "Z")
    decoder = json.JSONDecoder()
    for tag in soup.find_all("script"):
        text = tag.string or tag.get_text() or ""
        start = text.find(needle)
        if start < 0:
            continue
        try:
            payload, _ = decoder.raw_decode(text[start + len(needle):])
            values = json.loads(payload)
            if not isinstance(values, list):
                continue
            i = values.index("codes")
            rows = values[i + 1]
            if not isinstance(rows, list):
                continue
            codes = {}
            for ref in rows:
                if type(ref) is not int or not 0 <= ref < len(values):
                    continue
                item = values[ref]
                if not isinstance(item, dict):
                    continue
                record = {}
                for key_ref, value_ref in item.items():
                    if not isinstance(key_ref, str) or not re.fullmatch(r"_\d+", key_ref):
                        continue
                    key_pos = int(key_ref[1:])
                    if not 0 <= key_pos < len(values) or not isinstance(values[key_pos], str):
                        continue
                    key = values[key_pos]
                    if type(value_ref) is int:
                        value = values[value_ref] if 0 <= value_ref < len(values) else None
                    else:
                        value = value_ref
                    record[key] = value
                code = record.get("code")
                if not isinstance(code, str) or not CODE.fullmatch(code):
                    continue
                title = record.get("title")
                reward = re.sub(r"\s+", " ", title).strip()[:300] if isinstance(title, str) else ""
                created = record.get("created_at")
                published = created if isinstance(created, str) and re.fullmatch(
                    r"\d{4}-\d{2}-\d{2}T[\d:.]+Z", created) else stamp
                expires = record.get("expires_at")
                if not isinstance(expires, str) or not re.fullmatch(
                    r"\d{4}-\d{2}-\d{2}T[\d:.]+Z", expires):
                    expires = None
                expired = record.get("expired") is True
                no_expiry = record.get("no_expiry") is True
                codes[code] = {
                    "code": code,
                    "reward": reward or "Consultá la recompensa en NightLight.",
                    "status": "expired" if expired else "active",
                    "official": False,
                    "confidence": "COMMUNITY_VERIFIED",
                    "source": "nightlight",
                    "sourceType": "nightlight",
                    "sourceUrl": URL,
                    "expiryPolicy": "never" if no_expiry and not expired else "dated" if expires else "unknown",
                    "expiresAt": expires,
                    "detectedAt": stamp,
                    "publishedAt": published,
                }
            if len(codes) >= 20 and sum(c["expiryPolicy"] == "never" for c in codes.values()) >= 5:
                return {
                    "schemaVersion": 1,
                    "updatedAt": stamp,
                    "source": URL,
                    "extractionMode": "react-router-stream",
                    "codes": list(codes.values()),
                }
        except (TypeError, ValueError, IndexError, KeyError):
            continue
    return None


def parse(html):
    all_codes = parse_stream(html)
    if all_codes is not None:
        return all_codes
    fallback = parse_visible(html)
    fallback["extractionMode"] = "visible-html"
    return fallback

def main():
    request = Request(URL, headers={"User-Agent": "SanLeanCodes/1.0 (+https://sanlean.com.ar/codigos/)", "Accept": "text/html"})
    with urlopen(request, timeout=25) as response:
        html = response.read(4_000_000).decode("utf-8", errors="replace")
    catalog = parse(html)
    if OUTPUT.exists():
        try:
            old_count = len(json.loads(OUTPUT.read_text(encoding="utf-8")).get("codes", []))
            if old_count > 30 and len(catalog["codes"]) < old_count * 0.6:
                raise ValueError(f"NightLight devolvió {len(catalog['codes'])} códigos frente a {old_count} anteriores; se protege el catálogo")
        except (OSError, json.JSONDecodeError):
            pass
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
            old = {entry["code"]: entry for entry in previous.get("codes", [])}
            for entry in catalog["codes"]:
                if entry["code"] in old:
                    entry["detectedAt"] = old[entry["code"]].get("detectedAt", entry["detectedAt"])
                    if catalog.get("extractionMode") != "react-router-stream":
                        entry["publishedAt"] = old[entry["code"]].get("publishedAt", entry["publishedAt"])
            previous_codes = {entry["code"]: {k: v for k, v in entry.items() if k != "detectedAt"} for entry in previous.get("codes", [])}
            current_codes = {entry["code"]: {k: v for k, v in entry.items() if k != "detectedAt"} for entry in catalog["codes"]}
            if previous_codes == current_codes:
                print("NightLight: sin cambios; catálogo conservado")
                return
        except (OSError, ValueError, KeyError, TypeError):
            pass
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=OUTPUT.parent, delete=False) as out:
        json.dump(catalog, out, ensure_ascii=False, indent=2)
        out.write("\n")
        tmp = out.name
    os.replace(tmp, OUTPUT)
    print(f"NightLight: {len(catalog['codes'])} códigos sincronizados")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Sincronización detenida sin sobrescribir el catálogo: {error}", file=sys.stderr)
        raise
