"""
Match Score / Admission Reality / «Why this university».

Формула — единая с фронтендом (app.js: matchParts/computeMatch): те же
признаки, те же веса (направление 31, стоимость 25–40, шансы 13,
исследования 9, предпочтения 13, язык 9), тот же честный учёт финансовой
помощи. Серверная версия нужна эндпоинтам, которые считают скор без
браузера: сортировка колоды /universities, share-ссылка для родителя,
GET /universities/{id}. Изменять формулу нужно в ОБЕИХ местах
(здесь и в app.js) — до тех пор, пока фронт не начнёт брать скор с
сервера. Любое расхождение — баг: родитель по share-ссылке и владелец
на экране Matches должны видеть одинаковые проценты.

Модуль не импортирует SQLAlchemy/FastAPI напрямую (только для
type-checker'а) — это чистые функции над объектами с нужными полями
(duck typing), поэтому их можно тестировать без БД — см. test_scoring.py.
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
    # считается по academic-диапазону — ровно как toSATEquivalent() в JS.
    "IB":    {"min": 24, "max": 45, "academic_min": 24, "academic_max": 45},
    "EGE":   {"min": 100, "max": 310, "academic_min": 180, "academic_max": 300},
}

# Язык обучения вуза по стране — ТОЛЬКО фолбэк, когда у записи каталога нет
# явного списка teach_langs (многоязычные страны и англоязычные программы
# стран-исключений ошибаются при выводе «язык = язык страны»). Зеркало
# COUNTRY_TEACH_LANG в app.js.
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

# Порядок категорий направлений — как DIRS в app.js и strengths в
# universities.json (8 чисел по направлениям).
DIRS = ["cs", "eng", "math", "biz", "social", "health", "humanities", "law"]

# Специальность (значение с онбординга) -> категория направления.
# Зеркало MAJOR_CATEGORIES в app.js.
MAJOR_TO_DIR = {
    # cs
    "Computer Science": "cs", "Art & Artificial Intelligence": "cs",
    "Art & Artificial Intelligence / Machine Learning": "cs",
    "Art & Artificial Intelligence/ Machine Learning": "cs",
    "Art & Artificial Intelligence /Machine Learning": "cs",
    "Artificial Intelligence / Machine Learning": "cs", "Data Science": "cs",
    "Software Engineering": "cs", "Computer Engineering": "cs",
    "Cybersecurity": "cs", "Information Systems / IT": "cs", "Robotics": "cs",
    "Game Development": "cs", "Human-Computer Interaction": "cs",
    # eng
    "Mechanical Engineering": "eng", "Electrical Engineering": "eng",
    "Civil Engineering": "eng", "Chemical Engineering": "eng",
    "Aerospace Engineering": "eng", "Biomedical Engineering": "eng",
    "Industrial Engineering": "eng", "Environmental Engineering": "eng",
    # math
    "Mathematics": "math", "Statistics": "math", "Physics": "math",
    "Chemistry": "math", "Biology": "math", "Astronomy": "math",
    "Environmental Science": "math",
    # biz
    "Business Administration": "biz", "Economics": "biz", "Finance": "biz",
    "Accounting": "biz", "Marketing": "biz", "Business Analytics": "biz",
    "Entrepreneurship": "biz", "International Business": "biz",
    # social
    "Psychology": "social", "Political Science": "social", "Sociology": "social",
    "International Relations": "social", "Public Policy": "social",
    "Anthropology": "social",
    # health
    "Pre-Med / Biology": "health", "Neuroscience": "health",
    "Biotechnology": "health", "Public Health": "health", "Nursing": "health",
    # humanities
    "History": "humanities", "Philosophy": "humanities",
    "English Literature": "humanities", "Linguistics": "humanities",
    "Architecture": "humanities", "Graphic Design": "humanities",
    "Film Studies": "humanities", "Music": "humanities",
    # law
    "Pre-Law": "law", "Criminal Justice": "law",
}


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


def _teach_langs(u: University) -> list:
    """Языки обучения конкретной записи каталога; пусто — фолбэк на страну."""
    langs = getattr(u, "teach_langs", None)
    if isinstance(langs, (list, tuple)) and langs:
        return [str(x) for x in langs]
    return []


def language_fit(u: University, p: Profile) -> float:
    """Язык обучения вуза против родного языка/английского студента.
    Английский: родной или сданный тест с уверенным баллом -> 1; тест со слабым
    баллом -> 0.65; нет сигнала -> 0.5. Учёба на родном -> 1. Другой язык без
    подготовки -> 0.3 (барьер). Родной язык не указан -> нейтрально (0.55).
    Зеркало логики matchParts() в app.js."""
    langs = _teach_langs(u)
    if langs:
        # Явные языки программы: максимум по совпадению с родным/английским.
        best = 0.3
        for teach in langs:
            if teach == "en":
                if getattr(p, "native_lang", "") == "en":
                    best = max(best, 1.0)
                else:
                    taken = [k for k in ("IELTS", "TOEFL", "DET") if _entry_taken(_entry_tests(p.tests, k))]
                    good = any(
                        _entry_score(_entry_tests(p.tests, k)) >= _GOOD_ENGLISH[k] for k in taken
                    )
                    best = max(best, 1.0 if good else (0.65 if taken else 0.5))
            elif teach == (getattr(p, "native_lang", "") or None):
                best = max(best, 1.0)
        return best
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
    """0-100. Языковые тесты (IELTS/TOEFL/DET) сознательно исключены — это
    тесты на английский, а не на академическую силу профиля (см. комментарий
    в JS-версии)."""
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


def _user_dirs(p: Profile) -> list:
    """Направления, которые выбрал пользователь (мультивыбор специальностей).
    Нет majors — берём одну major; нет и её — считаем CS (дефолт онбординга)."""
    majors = getattr(p, "majors", None) or []
    if not majors and getattr(p, "major", None):
        majors = [p.major]
    dirs = []
    for m in majors:
        d = MAJOR_TO_DIR.get(m)
        if d and d not in dirs:
            dirs.append(d)
    return dirs or ["cs"]


def program_strength(u: University, p: Profile) -> int:
    """Сила вуза именно по направлениям пользователя: лучшее из выбранных.
    Нет данных strengths — фолбэк на общий cs (как uniData()=null на фронте)."""
    strengths = getattr(u, "strengths", None)
    if isinstance(strengths, (list, tuple)) and len(strengths) == len(DIRS):
        by_dir = dict(zip(DIRS, [int(s) for s in strengths]))
        return max(by_dir.get(d, 50) for d in _user_dirs(p))
    return getattr(u, "cs", 60) or 60


def _aid_note_limited_intl(u: University) -> bool:
    """note вуза явно говорит, что помощь ограничена для иностранцев."""
    note = (getattr(u, "aid_note", "") or "").lower()
    mentions_intl = ("иностранц" in note) or ("international" in note)
    if not mentions_intl:
        return False
    return any(w in note for w in (
        "limited", "almost no", "not available", "no aid", "only rare",
        "нет", "не да", "не доступ", "огранич",
    ))


def cost_info(u: University, p: Profile) -> dict:
    """Стоимость с учётом помощи — БЕЗ выдуманных вероятностей. Три вопроса
    разделены (раньше «надёжность» 0.8/0.45/0.3 смешивала шанс поступления,
    доступность помощи и её размер):

    1. ДОСТУПНОСТЬ (eligible): может ли студент этого происхождения вообще
       претендовать на помощь. gov-помощь — только гражданам страны вуза;
       need/full для иностранца — только если note вуза не говорит «limited
       for internationals». merit-стипендии обычно открыты всем.
    2. ПОКРЫТИЕ (aidMax, оценка): типичный максимум по ТИПУ помощи из
       каталога — это ориентир для фильтра «по карману ли», а не обещание.
       Точные суммы зависят от семьи/конкурса — проверяйте на сайте вуза.
    3. ВЕРДИКТ (verdict): да / только с помощью / нет.

    Зеркало costInfo() в app.js — менять синхронно."""
    tuition = getattr(u, "tuition", None)
    if tuition is None:
        tuition = getattr(u, "cost", 0) or 0
    living = getattr(u, "living", None)
    if living is None:
        living = 15000
    total = tuition + living
    aid_type = (getattr(u, "aid_type", None) or "").strip() or "merit"
    strength = academic_strength(p)
    budget = p.budget or 0
    domestic = bool(getattr(p, "home_country", "")) and p.home_country == u.country
    limited_intl = _aid_note_limited_intl(u)

    coverage = 0.0
    if aid_type == "full":
        coverage = 1.0        # покрывает подтверждённую нужду целиком
    elif aid_type == "gov":
        coverage = 1.0        # бюджетное место закрывает обучение
    elif aid_type == "need":
        coverage = 0.4        # типично 30–50% платы за обучение
    elif aid_type == "merit":
        coverage = 0.4 if strength >= 85 else (0.22 if strength >= 70 else 0.08)
    # "low" / неизвестный тип — помощи почти нет

    eligible = True
    if not domestic:
        if aid_type == "gov":
            eligible = False
        if aid_type in ("full", "need") and limited_intl:
            eligible = False
    # Бюджетное место по ЕГЭ для гражданина России — покрывает обучение целиком
    if domestic and u.country == "Russia" and aid_type == "gov":
        coverage = 1.0

    if aid_type in ("full", "need", "gov") and getattr(p, "needs_aid", None) is False:
        aid_max = 0  # помощь по нужде не запрашивается — не обещаем её
    else:
        aid_max = round(tuition * coverage) if eligible else 0

    net_best = max(0, total - aid_max)
    if total <= budget:
        verdict = "yes"
    elif aid_max > 0 and net_best <= budget:
        verdict = "aid"
    else:
        verdict = "no"
    return {
        "domestic": domestic,
        "tuition": tuition,
        "living": living,
        "total": total,
        "aid": aid_type,
        "aid_max": aid_max,
        "eligible": eligible,
        "limited_intl": limited_intl and not domestic,
        "net_best": net_best,
        "budget": budget,
        "verdict": verdict,
        "gap": max(0, net_best - budget),
        "over": max(0, total - budget),
    }


def match_parts(u: University, p: Profile) -> dict:
    """Компоненты Match Score (0..1 каждый). Зеркало matchParts() в app.js."""
    s = program_strength(u, p)
    program = max(0.0, min(1.0, (s - 45) / 50))
    c = cost_info(u, p)
    if c["verdict"] == "yes":
        cost = 1.0
    elif c["verdict"] == "aid":
        cost = 0.55
    else:
        cost = max(0.0, 0.3 * min(1.0, c["budget"] / max(c["net_best"], 1)))
    reality = admission_reality(u, p)
    chance = {"Likely": 1.0, "Target": 0.85}.get(reality, 0.3 if u.acceptance < 0.1 else 0.5)
    research = max(0.0, 1 - abs((u.research or 3) - p.research) / 4)
    prefs = None
    pp = []
    if _pref_list(p.setting):
        pp.append(1.0 if _pref_match(p.setting, u.setting) else 0.2)
    if _pref_list(p.climate):
        pp.append(1.0 if _pref_match(p.climate, u.climate) else 0.2)
    if _pref_list(p.size):
        pp.append(1.0 if _pref_match(p.size, u.size) else 0.3)
    if pp:
        prefs = sum(pp) / len(pp)
    lang = language_fit(u, p)
    return {
        "program": program, "cost": cost, "chance": chance,
        "research": research, "prefs": prefs, "lang": lang,
        "strength": s, "cost_info": c, "reality": reality,
    }


def match_weights_for(m: dict) -> dict:
    """Веса категорий. Чем меньше бюджет, тем важнее деньги: до $15k —
    стоимость весит 40 из 100, до $30k — 32, иначе 25. Излишек снимается с
    направления и исследований. Зеркало matchWeightsFor() в app.js."""
    budget = m["cost_info"]["budget"]
    cost_w = 40 if (budget and budget < 15000) else (32 if (budget and budget < 30000) else 25)
    w = {"program": 31, "cost": cost_w, "chance": 13, "research": 9, "prefs": 13, "lang": 9}
    extra = cost_w - 25
    w["program"] -= round(extra * 0.6)
    w["research"] -= round(extra * 0.4)
    if m["prefs"] is None:
        w["program"] += 7
        w["cost"] += 6
        m["prefs"] = 0.0
    return w


def match_score(u: University, p: Profile) -> int:
    """Единый Match Score (15–99). Совпадает с computeMatch() на фронте:
    родитель по share-ссылке и владелец на экране Matches видят одно число."""
    m = match_parts(u, p)
    w = match_weights_for(m)
    score = (
        m["program"] * w["program"] + m["cost"] * w["cost"]
        + m["chance"] * w["chance"] + m["research"] * w["research"]
        + (m["prefs"] or 0) * w["prefs"] + m["lang"] * w["lang"]
    )
    c = m["cost_info"]
    # Не по карману даже с помощью — вуз уходит вниз подборки, какой бы
    # сильной ни была программа.
    if c["verdict"] == "no":
        score *= 0.5 + 0.3 * min(1.0, c["budget"] / max(c["net_best"], 1))
    # KAUST — только магистратура/PhD
    if getattr(u, "id", None) == 193 and getattr(p, "degree_level", "") == "bachelor":
        score = min(score, 25)
    return int(max(15, min(99, round(score))))


def _to_sat_equivalent(test_key: str, score: float) -> float:
    """Нормализует академический тест (SAT/ACT/IB/ЕГЭ) на шкалу SAT 900-1600,
    той же min/max нормализацией, что и academic_strength. ЯЗЫКОВЫЕ тесты
    (IELTS/TOEFL/DET) сюда не передаются — они не измеряют академическую силу."""
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
    ege = _entry_tests(p.tests, "EGE")
    if getattr(u, "country", None) == "Russia" and _entry_taken(ege):
        # Same estimate as egeReality() in the UI, not a program cutoff.
        need = 290 if u.acceptance < 0.2 else 260
        score = _entry_score(ege)
        return "Likely" if score >= need + 8 else ("Target" if score >= need - 12 else "Reach")
    rank = {"below": 0, "within": 1, "above": 2}
    gpa_pos = "below" if p.gpa < u.gpa25 else ("above" if p.gpa > u.gpa75 else "within")

    academic_keys = [k for k in ("SAT", "ACT", "IB", "EGE") if getattr(p.tests, k, None) and getattr(p.tests, k).taken]
    test_pos = None
    if academic_keys:
        # Если сдано несколько академических тестов — берём тот, что выглядит
        # выгоднее (как студент подал бы свой лучший результат).
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
    # Сильная программа внутри вуза с широким приёмом (например, CS в Waterloo)
    # принимает строже, чем показывает общий процент: «Likely» там заменяем
    # на «Target».
    if u.acceptance < 0.6 and program_strength(u, p) >= 95:
        return "Target"
    return "Likely"


def match_breakdown(u: University, p: Profile) -> list[dict]:
    """Разбивка Match Score по категориям для UI (бар-чарт на карточке вуза).
    Категории совпадают с match_parts/match_weights_for."""
    m = match_parts(u, p)
    w = match_weights_for(m)
    rows = [
        {"code": "program_fit", "value": round(m["program"] * 100)},
        {"code": "cost_fit", "value": round(m["cost"] * 100)},
        {"code": "chance_fit", "value": round(m["chance"] * 100)},
        {"code": "research_fit", "value": round(m["research"] * 100)},
        {"code": "prefs_fit", "value": round((m["prefs"] or 0) * 100)},
        {"code": "lang_fit", "value": round(m["lang"] * 100)},
    ]
    # вес категории — чтобы фронт мог показать вклад в итоговый скор
    return [{**row, "weight": w[row["code"].replace("_fit", "")]} for row in rows]


def why_this_university(u: University, p: Profile) -> list[dict]:
    """
    Структурированные причины (code + params) вместо готового текста на одном
    языке — фронт переводит code по словарю STRINGS[lang]. Ключи code
    совпадают с ключами t('why_...') в JS-версии.
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
