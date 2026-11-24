#!/usr/bin/env python3
"""Генерирует frontend/unidata.js из backend/data/universities.json.

unidata.js — фронтовый справочник вузов: его ждёт app.js (подключается в
index.html раньше app.js). Всё, что нужно фронту, уже есть в
data/universities.json (фото кампусов, описания RU/EN, плюсы/минусы,
сильные стороны по 8 направлениям), поэтому файл не хранят в репозитории
руками — его собирают этим скриптом.

Запуск (из корня проекта):
    python3 tools/make_unidata.py

Форматы структур выведены из использования в app.js:
  UNIVERSITIES      — массив карточек вузов (плоские поля + aid{level,merit,note})
  UNI_EXTRA         — {id: {website, desc, desc_ru}}
  UNI_DESC_RU       — {id: desc_ru}
  UNI_FACTS         — {id: {founded, students, type, wiki, wiki_ru}}
  UNI_PHOTO_EXTRA   — {id: photo}
  UNI_DATA          — {id: [tuition, living, aid, strengths_csv, tag_ru, tag_en,
                      pros_ru, pros_en, con_ru, con_en, aidnote_ru, aidnote_en]}
  TOTAL_UNIVERSITIES_COUNT, REAL_CONTINENT_COUNTS, REAL_COUNTRIES_BY_CONTINENT
"""
import argparse
import datetime
import json
import os
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "backend", "data", "universities.json")
META = os.path.join(ROOT, "backend", "data", "catalog_meta.json")
DST = os.path.join(ROOT, "frontend", "unidata.js")

FIELDS = ("name", "city", "country", "continent", "cost", "acceptance",
          "gpa25", "gpa75", "sat25", "sat75", "size", "setting", "climate",
          "research", "cs", "tags", "aid_level", "aid_merit", "aid_note")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the generated catalog is stale")
    args = parser.parse_args()
    with open(SRC, encoding="utf-8") as f:
        rows = json.load(f)
    seen = set()
    for row in rows:
        uid = row["id"]
        if uid in seen:
            raise SystemExit(f"Duplicate university id: {uid}")
        seen.add(uid)
        for field in ("photo", "website"):
            url = urlparse(row.get(field, ""))
            if url.scheme not in ("https", "http") or not url.hostname:
                raise SystemExit(f"University {uid}: missing or invalid {field} URL")

    unis, extra, desc_ru, facts, photos, data = [], {}, {}, {}, {}, {}
    for u in rows:
        uid = u["id"]
        unis.append({
            "id": uid, "name": u["name"], "city": u["city"],
            "country": u["country"], "continent": u["continent"],
            "cost": u["cost"], "acceptance": u["acceptance"],
            "gpa25": u["gpa25"], "gpa75": u["gpa75"],
            "sat25": u["sat25"], "sat75": u["sat75"],
            "size": u["size"], "setting": u["setting"], "climate": u["climate"],
            "research": u["research"], "cs": u["cs"], "tags": u["tags"],
            "photo": u.get("photo", ""), "website": u.get("website", ""),
            "desc": u.get("desc_en", ""), "desc_ru": u.get("desc_ru", ""),
            "aid": {"level": u["aid_level"], "merit": u["aid_merit"], "note": u["aid_note"]},
        })
        extra[uid] = {"website": u.get("website", ""), "desc": u.get("desc_en", ""),
                     "desc_ru": u.get("desc_ru", ""), "teach_langs": u.get("teach_langs", [])}
        desc_ru[uid] = u.get("desc_ru", "")
        facts[uid] = {"founded": u.get("founded"), "students": u.get("students"),
                     "type": u.get("type"), "wiki": u.get("wiki"), "wiki_ru": u.get("wiki_ru")}
        if u.get("photo"):
            photos[uid] = u["photo"]
        data[uid] = [
            u.get("tuition", 0), u.get("living", 0), u.get("aid", ""),
            ",".join(str(int(s)) for s in u.get("strengths", [])),
            u.get("tag_ru", ""), u.get("tag_en", ""),
            u.get("pros_ru", []), u.get("pros_en", []),
            u.get("con_ru", ""), u.get("con_en", ""),
            u.get("aidnote_ru", ""), u.get("aidnote_en", ""),
        ]

    continent_counts = {}
    countries = {}
    for u in rows:
        continent_counts[u["continent"]] = continent_counts.get(u["continent"], 0) + 1
        countries.setdefault(u["continent"], [])
        if u["country"] not in countries[u["continent"]]:
            countries[u["continent"]].append(u["country"])

    # Checkout time is not the data update date. Keep verification separate.
    with open(META, encoding="utf-8") as f:
        updated = json.load(f).get("updated_at")
    if updated:
        updated = datetime.date.fromisoformat(updated).isoformat()

    js = (
        "/* Сгенерировано tools/make_unidata.py из backend/data/universities.json.\n"
        "   Не редактировать руками — правь universities.json и перегенерируй:\n"
        "   python3 tools/make_unidata.py */\n\n"
        # Дата последнего изменения/сверки данных каталога — фронт показывает
        # бейдж «Каталог обновлён: …» (см. catalogUpdatedLabel).
        "const CATALOG_UPDATED = " + json.dumps(updated) + ";\n\n"
        "const UNIVERSITIES = " + json.dumps(unis, ensure_ascii=False, separators=(",", ":")) + ";\n\n"
        "const UNI_EXTRA = " + json.dumps(extra, ensure_ascii=False, separators=(",", ":")) + ";\n\n"
        "const UNI_DESC_RU = " + json.dumps(desc_ru, ensure_ascii=False, separators=(",", ":")) + ";\n\n"
        "const UNI_FACTS = " + json.dumps(facts, ensure_ascii=False, separators=(",", ":")) + ";\n\n"
        "const UNI_PHOTO_EXTRA = " + json.dumps(photos, ensure_ascii=False, separators=(",", ":")) + ";\n\n"
        "const UNI_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n\n"
        "const TOTAL_UNIVERSITIES_COUNT = " + str(len(rows)) + ";\n\n"
        "const REAL_CONTINENT_COUNTS = " + json.dumps(continent_counts, separators=(",", ":")) + ";\n\n"
        "const REAL_COUNTRIES_BY_CONTINENT = " + json.dumps(countries, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    if args.check:
        with open(DST, encoding="utf-8") as f:
            if js != f.read():
                raise SystemExit("Catalog is stale: run python3 tools/make_unidata.py")
        print(f"Catalog matches: {len(rows)} universities")
        return
    os.makedirs(os.path.dirname(DST), exist_ok=True)
    with open(DST, "w", encoding="utf-8") as f:
        f.write(js)
    print("unidata.js: %d вузов, %s байт" % (len(rows), os.path.getsize(DST)))


if __name__ == "__main__":
    main()
