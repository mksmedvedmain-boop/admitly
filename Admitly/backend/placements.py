"""
Партнёрские блоки (см. MONETIZATION_SPEC.md). По умолчанию список пуст: реальных
партнёров пока нет, и показывать выдуманные рекламные места нельзя. Чтобы
подключить партнёра, добавьте запись в PARTNERS. Каждый блок обязан иметь
пометку о рекламе (disclosure_label), а переход идёт через /go/{id}, который
редиректит только на адреса из этого списка (защита от open redirect).
"""
PARTNERS = [
    # {
    #     "id": "example-test-prep",
    #     "name": "Название партнёра",
    #     "url": "https://partner.example/?utm_source=admitly",
    #     "slots": ["admission_reality_low_score"],
    #     "disclosure_label": "Реклама",
    # },
]


def for_slot(slot: str):
    return [p for p in PARTNERS if slot in p.get("slots", [])]


def by_id(partner_id: str):
    return next((p for p in PARTNERS if p["id"] == partner_id), None)
