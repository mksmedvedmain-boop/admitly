"""
Match Score / Admission Reality / "Why this university" — портированы 1:1 из
unimatch-demo.html (функции academicStrength, matchScore, admissionReality,
buildWhyReasons, matchBreakdown в блоке <script>). Любое изменение формулы
должно вноситься в обоих местах одновременно, пока фронт не переехал на вызовы
этого бэкенда вместо локального пересчёта.

Как и раньше, модуль не импортирует SQLAlchemy/FastAPI напрямую (только для
type-checker'а) — это чистые функции над объектами с нужными полями (duck
typing), поэтому их можно тестировать без БД — см. test_scoring.py.
"""
from __future__ import annotations
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from models import University
    from schemas import Profile


TEST_RANGES = {
    "SAT":   {"academic_min": 900, "academic_max": 1600},
    "ACT":   {"academic_min": 18,  "academic_max": 36},
    "IELTS": {"academic_min": 5,   "academic_max": 9},
    # TOEFL/DET нужны только для language fit (уверенный английский:
    # IELTS 6.5+ / TOEFL 90+ / DET 110+); academic-диапазоны заданы по аналогии.
    "TOEFL": {"min": 0, "max": 120, "academic_min": 60, "academic_max": 120},
    "DET":   {"min": 10, "max": 160, "academic_min": 90, "academic_max": 160},
    # IB/EGE — академические тесты, как ACADEMIC_TESTS на фронте. SAT-эквивалент
    # считается по academic-диапазону — ровно как toSATEquivalent() в JS:
    # academicMin/academicMax -> 900-1600 SAT. Для IB academic-диапазон совпадает
    # с полным (24-45), для ЕГЭ академическая часть 180-300 из полной 100-310.
    "IB":    {"min": 24, "max": 45, "academic_min": 24, "academic_max": 45},
    "EGE":   {"min": 100, "max": 310, "academic_min": 180, "academic_max": 300},
}

# Язык обучения вуза по стране (без английского). Зеркало COUNTRY_TEACH_LANG в app.js.
COUNTRY_TEACH_LANG = {
    "Germany": "de", "Austria": "de", "Switzerland": "de", "France": "fr", "Italy": "it",
    "Spain": "es", "Russia": "ru", "Japan": "ja", "China": "zh", "Taiwan": "zh",
    "South Korea": "ko", "Brazil": "pt", "Argentina": "es", "Mexico": "es", "Chile": "es",
    "Czech Republic": "cs", "Poland": "pl", "Belgium": "nl", "Netherlands": "nl",
    "Sweden": "sv", "Denmark": "da", "Finland": "fi", "Israel": "he", "Egypt": "ar",
    "Saudi Arabia": "ar", "Indonesia": "id", "Vietnam": "vi",
}

# Уверенный английский: уровень, на котором учёба на английском идёт комфортно.
_GOOD_ENGLISH = {"IELTS": 6.5, "TOEFL": 90, "DET": 110}


def _entry_tests(tests, key: str):
    """Тест по ключу — dict или dataclass (FakeTests в тестах). None, если нет."""
    if tests is None:
        return None
    if hasattr(tests, "get"):
        return tests.get(key)
    return getattr(tests, key, None)


def _entry_taken(entry) -> bool:
    if entry is None:
        return False
    return entry.get("taken") if hasattr(entry, "get") else getattr(entry, "taken", False)


def _entry_score(entry):
    if entry is None:
        return 0
    return entry.get("score") if hasattr(entry, "get") else getattr(entry, "score", 0)


def language_fit(u: University, p: Profile) -> float:
    """Язык обучения вуза против родного языка/английского студента.
    Английский: родной или сданный тест с уверенным баллом -> 1; тест со слабым
    баллом -> 0.65; нет сигнала -> 0.5. Учёба на родном -> 1. Другой язык без
    подготовки -> 0.3 (барьер). Родной язык не указан -> нейтрально (0.55).
    Зеркало логики matchParts() в app.js."""
    teach = COUNTRY_TEACH_LANG.get(u.country, "en")
    if teach == "en":
        if p.native_lang == "en":
            return 1.0
        taken = [k for k in ("IELTS", "TOEFL", "DET") if _entry_taken(_entry_tests(p.tests, k))]
        if any(_entry_score(_entry_tests(p.tests, k)) >= _GOOD_ENGLISH[k] for k in taken):
            return 1.0
        return 0.65 if taken else 0.5
    if teach == (p.native_lang or None):
        return 1.0
    if p.native_lang:
        return 0.3
    return 0.55


def _pref_list(pref) -> list:
    """Предпочтение профиля -> список. Профиль эволюционировал: size/setting/
    climate были одиночными строками, теперь — мульти-выбор (массивы). Старые
    записи в БД могут быть строками — приводим всё к списку."""
    if pref is None:
        return []
    if isinstance(pref, (list, tuple)):
        return list(pref)
    return [pref]


def _pref_match(pref, value) -> bool:
    """Значение вуза входит в предпочтения пользователя."""
    return value in _pref_list(pref)


def academic_strength(p: Profile) -> int:
    """0-100. IELTS сознательно исключён — это тест на английский, а не на
    академическую силу профиля (см. комментарий в JS-версии)."""
    gpa_score = min(max((p.gpa - 2.0) / 2.0, 0), 1) * 100
    academic_keys = [k for k in ("SAT", "ACT", "IB", "EGE") if getattr(p.tests, k, None) and getattr(p.tests, k).taken]
    if not academic_keys:
        return round(gpa_score)
    total = 0.0
    for k in academic_keys:
        r = TEST_RANGES[k]
        score = getattr(p.tests, k).score
        norm = min(max((score - r["academic_min"]) / (r["academic_max"] - r["academic_min"]), 0), 1) * 100
        total += norm
    avg_test_score = total / len(academic_keys)
    return round(gpa_score * 0.5 + avg_test_score * 0.5)


def english_proficiency_level(p: Profile) -> Optional[str]:
    """Отдельная от academic_strength оценка английского — только по IELTS."""
    if not p.tests.IELTS.taken:
        return None
    score = p.tests.IELTS.score
    if score >= 7.5:
        return "strong"
    if score >= 6.5:
        return "good"
    return "low"


def match_score(u: University, p: Profile) -> int:
    score = 0.0

    # CS fit — 26%
    score += (u.cs / 100) * 26

    # Location fit (setting + climate) — 16%
    if not _pref_list(p.setting) and not _pref_list(p.climate):
        loc_fit = 0.6
    else:
        loc_fit = 0.0
        if _pref_list(p.setting) and _pref_match(p.setting, u.setting):
            loc_fit += 0.55
        if _pref_list(p.climate) and _pref_match(p.climate, u.climate):
            loc_fit += 0.45
    score += loc_fit * 16

    # Cost fit — 16%
    cost_ratio = (u.cost / p.budget) if p.budget else 1
    cost_fit = 1.0 if cost_ratio <= 1 else max(0.0, 1 - (cost_ratio - 1) * 0.8)
    score += cost_fit * 16

    # Research fit — 13%
    research_fit = max(0.0, 1 - abs(u.research - p.research) / 5)
    score += research_fit * 13

    # Size fit — 11%
    size_fit = (1.0 if _pref_match(p.size, u.size) else 0.4) if _pref_list(p.size) else 0.7
    score += size_fit * 11

    # Financial aid fit — 9% (только если студент явно отметил, что помощь важна).
    # ПРОИСХОЖДЕНИЕ: заявленный уровень помощи почти всегда относится к гражданам
    # страны вуза (Pell Grant, FAFSA и т.п.). Если студент international
    # (home_country ≠ страна вуза, или не указана) и note вуза явно говорит
    # «limited for internationals» — уровень снижается до Low, ДАЖЕ если вуз
    # заявляет High («Meets 100% need»). Раньше зеркало в app.js имело исключение
    # для High — убрано и здесь, и там.
    aid_fit = 0.7
    if p.needs_aid is True:
        aid_level = u.aid_level
        is_international = not (p.home_country and p.home_country == u.country)
        aid_note = (u.aid_note or "").lower()
        note_says_limited_intl = (
            ("иностранц" in aid_note or "international" in aid_note)
            and any(w in aid_note for w in ("limited", "almost no", "not available", "no aid", "only rare", "нет", "не да", "не доступ", "огранич"))
        )
        if is_international and note_says_limited_intl:
            aid_level = "Low"
        aid_fit = {"High": 1.0, "Medium": 0.6, "Low": 0.25}.get(aid_level, 0.5)
        if not is_international and aid_level != "Low":
            aid_fit = min(1.0, aid_fit + 0.15)
    score += aid_fit * 9

    # Language fit — 9%: язык обучения вуза против родного языка/английского.
    score += language_fit(u, p) * 9

    # 26+16+16+13+11+9+9 = 100 — без случайного слагаемого "для красоты чисел".
    return int(min(99, max(40, round(score))))


def _to_sat_equivalent(test_key: str, score: float) -> float:
    """Нормализует ACT (или сам SAT) на шкалу SAT 900-1600, той же min/max
    нормализацией, что и academic_strength — 30 ACT и ~1400 SAT эквивалентны
    везде в приложении, а не только здесь."""
    r = TEST_RANGES[test_key]
    norm = min(max((score - r["academic_min"]) / (r["academic_max"] - r["academic_min"]), 0), 1)
    return 900 + norm * 700



def admission_reality(u: University, p: Profile) -> str:
    """
    Common Data Set подход: сравниваем профиль абитуриента со средними 50%
    (25-й/75-й перцентиль GPA/SAT) поступившего класса конкретного вуза —
    а не с общим acceptance rate. SAT 25/75 для вузов США взяты из College Scorecard, GPA 25/75 и данные
    вузов вне США оценены по доле принятых (см. README).
    """
    rank = {"below": 0, "within": 1, "above": 2}
    gpa_pos = "below" if p.gpa < u.gpa25 else ("above" if p.gpa > u.gpa75 else "within")

    academic_keys = [k for k in ("SAT", "ACT", "IB", "EGE") if getattr(p.tests, k, None) and getattr(p.tests, k).taken]
    test_pos = None
    if academic_keys:
        # Если сдан и SAT, и ACT — берём тот, что выглядит выгоднее (как студент
        # подал бы в приёмную комиссию свой лучший результат).
        best = 0
        for k in academic_keys:
            sat_eq = _to_sat_equivalent(k, getattr(p.tests, k).score)
            pos = "below" if sat_eq < u.sat25 else ("above" if sat_eq > u.sat75 else "within")
            best = max(best, rank[pos])
        test_pos = best

    # Итоговая позиция — БОЛЕЕ СЛАБЫЙ из двух сигналов: 4.0 GPA не делает вуз
    # "Likely", если тестовый балл заметно ниже среднего диапазона поступивших.
    overall = min(rank[gpa_pos], test_pos) if test_pos is not None else rank[gpa_pos]

    # Вузы с приёмом ниже 10% это Reach для любого абитуриента: там отказывают
    # большинству сильных кандидатов, даже с идеальными баллами.
    if u.acceptance < 0.10:
        return "Reach"
    if overall == rank["below"]:
        return "Reach"
    # Приём 10-25%: попадание в диапазон поступивших даёт максимум Target, не Likely.
    if overall == rank["within"] or u.acceptance < 0.25:
        return "Target"
    return "Likely"


def match_breakdown(u: University, p: Profile) -> list[dict]:
    """Разбивка Match Score по категориям для UI (радар/бар-чарт на карточке вуза)."""
    if not _pref_list(p.setting) and not _pref_list(p.climate):
        loc_fit = 60
    else:
        loc_fit = (55 if _pref_list(p.setting) and _pref_match(p.setting, u.setting) else 0) + \
                  (45 if _pref_list(p.climate) and _pref_match(p.climate, u.climate) else 0)
    loc_fit = min(100, loc_fit)

    cost_ratio = (u.cost / p.budget) if p.budget else 1
    cost_fit = round((1 if cost_ratio <= 1 else max(0.0, 1 - (cost_ratio - 1) * 0.8)) * 100)
    research_fit = round(max(0.0, 1 - abs(u.research - p.research) / 5) * 100)

    rows = [
        {"code": "cs_fit", "value": u.cs},
        {"code": "location_fit", "value": loc_fit},
        {"code": "cost_fit", "value": cost_fit},
        {"code": "research_fit", "value": research_fit},
    ]
    if p.needs_aid is True:
        aid_fit = round({"High": 1.0, "Medium": 0.6, "Low": 0.25}.get(u.aid_level, 0.5) * 100)
        rows.append({"code": "aid_fit", "value": aid_fit})
    return rows


def why_this_university(u: University, p: Profile) -> list[dict]:
    """
    Структурированные причины (code + params) вместо готового текста на одном
    языке — фронт переводит code по словарю STRINGS[lang] (см. README, раздел
    про локализацию). Ключи code совпадают с ключами t('why_...') в JS-версии.
    """
    reasons = []
    if u.cs >= 90:
        reasons.append({"code": "why_cs", "params": {"value": u.cs}})
    if _pref_list(p.setting) and _pref_match(p.setting, u.setting):
        reasons.append({"code": "why_setting", "params": {"value": u.setting}})
    if _pref_list(p.climate) and _pref_match(p.climate, u.climate):
        reasons.append({"code": "why_climate", "params": {"value": u.climate}})
    if u.research >= 4:
        reasons.append({"code": "why_research", "params": {"value": u.research}})
    if u.cost <= p.budget:
        reasons.append({"code": "why_cost", "params": {}})
    if p.needs_aid is True and (u.aid_level == "High" or u.aid_merit):
        reasons.append({"code": "why_aid", "params": {"note": u.aid_note}})
    if len(reasons) < 3:
        reasons.append({"code": "why_generic", "params": {}})
    return reasons[:5]
