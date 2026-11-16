"""
Заполняет БД каталогом вузов из data/universities.json (330 записей).

Каталог собран из открытых источников: College Scorecard (США: приём, SAT,
стоимость), Wikipedia/Wikidata (годы основания, ссылки), сайты вузов. Для вузов
вне США GPA/SAT и стоимость — ориентировочные оценки (см. README.md).

Загрузка идёт как upsert по id: повторный запуск обновляет цифры существующих
вузов и добавляет новые, свайпы и пользователи не трогаются. Id 200 был дублем
Университета Окленда (id 48): свайпы по нему переносятся на 48, запись удаляется.

Запуск:  python3 seed_data.py
"""
import json
import os

from database import Base, engine, SessionLocal
import models

Base.metadata.create_all(bind=engine)

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "universities.json")
RETIRED_IDS = {200: 48}  # устаревший id -> id, на который переносим свайпы

FIELDS = (
    "name", "city", "country", "continent", "cost", "acceptance",
    "gpa25", "gpa75", "sat25", "sat75", "size", "setting", "climate",
    "research", "cs", "tags", "aid_level", "aid_merit", "aid_note",
    # Данные серверного скоринга (совпадают с unidata.js): tuition/living
    # отдельно, тип помощи, сила программ по 8 направлениям и языки обучения.
    "tuition", "living", "aid_type", "strengths", "teach_langs",
)


def _aid_type(row: dict) -> str:
    """aid в universities.json — это и есть тип помощи (full/gov/need/merit/
    low). Отдельная колонка называется aid_type, чтобы не путать с
    aid_level (High/Medium/Low) из старой схемы."""
    return row.get("aid") or ""


def _prep_row(row: dict) -> dict:
    row = dict(row)
    row["aid_type"] = _aid_type(row)
    # teach_langs отсутствует у большинства записей — None (фолбэк на язык
    # страны в scoring.language_fit), а не пустой список.
    row["teach_langs"] = row.get("teach_langs") or None
    return row


def load_universities():
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def seed():
    rows = load_universities()
    db = SessionLocal()
    try:
        # 1. Перенос свайпов с retired id и удаление дубля.
        for old_id, new_id in RETIRED_IDS.items():
            if db.get(models.University, old_id) is None:
                continue
            mine = {s.user_id for s in db.query(models.Swipe).filter(models.Swipe.university_id == new_id)}
            for s in db.query(models.Swipe).filter(models.Swipe.university_id == old_id).all():
                if s.user_id in mine:
                    db.delete(s)
                else:
                    s.university_id = new_id
            db.flush()
            db.delete(db.get(models.University, old_id))

        # 2. Upsert по id.
        added = updated = 0
        for row in rows:
            row = _prep_row(row)
            uni = db.get(models.University, row["id"])
            values = {k: row.get(k) for k in FIELDS}
            if uni is None:
                db.add(models.University(id=row["id"], **values))
                added += 1
            else:
                for k, v in values.items():
                    setattr(uni, k, v)
                updated += 1
        db.commit()
        print(f"Universities: {added} added, {updated} updated, total {len(rows)}.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
