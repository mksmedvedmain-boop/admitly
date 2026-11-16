"""
Проверка scoring.py без FastAPI/SQLAlchemy — чистые dataclass-заглушки, как в
исходной версии. Запуск: python3 test_scoring.py
"""
from dataclasses import dataclass, field
from typing import Optional

import scoring


@dataclass
class FakeTestEntry:
    taken: bool = False
    score: float = 0


@dataclass
class FakeTests:
    SAT: FakeTestEntry = field(default_factory=lambda: FakeTestEntry(True, 1350))
    ACT: FakeTestEntry = field(default_factory=lambda: FakeTestEntry(False, 30))
    IELTS: FakeTestEntry = field(default_factory=lambda: FakeTestEntry(False, 7))
    TOEFL: FakeTestEntry = field(default_factory=lambda: FakeTestEntry(False, 90))


@dataclass
class FakeProfile:
    gpa: float = 3.6
    tests: FakeTests = field(default_factory=FakeTests)
    size: Optional[str] = None
    setting: Optional[str] = None
    climate: Optional[str] = None
    research: int = 3
    budget: int = 40000
    needs_aid: Optional[bool] = None
    # native_lang/home_country нужны для language fit и intl-aware aid fit
    # (scoring.language_fit / match_score). None = «не указан» -> нейтрально.
    native_lang: Optional[str] = None
    home_country: Optional[str] = None
    # major/majors — для program_strength (сила программ по направлению).
    major: Optional[str] = "Computer Science"
    majors: Optional[list] = None
    degree_level: str = "bachelor"


@dataclass
class FakeUni:
    id: int
    cs: int
    acceptance: float
    gpa25: float
    gpa75: float
    sat25: int
    sat75: int
    setting: str
    climate: str
    cost: int
    research: int
    size: str = "Medium"
    aid_level: str = "Medium"
    aid_merit: bool = False
    aid_note: str = ""
    # country/home-country нужны для language fit и intl-aware aid fit
    # (см. scoring.language_fit / match_score). По умолчанию — США, чтобы
    # существующие тесты (все вузы одной страны) не меняли поведение.
    country: str = "United States"
    # Новые поля каталога (server-side scoring). tuition=None -> cost,
    # living=None -> 15000, strengths=None -> фолбэк на cs (как uniData()=null
    # на фронте), aid_type по умолчанию merit (нейтральный тип помощи).
    tuition: Optional[int] = None
    living: Optional[int] = None
    aid_type: str = "merit"
    strengths: Optional[list] = None
    teach_langs: Optional[list] = None


results = []


def check(label, condition):
    results.append((label, condition))
    mark = "OK  " if condition else "FAIL"
    print(f"[{mark}] {label}")


# ---------------------------------------------------------------- academic_strength
print("\n=== academic_strength ===")

weak = FakeProfile(gpa=2.5, tests=FakeTests(SAT=FakeTestEntry(True, 950)))
strong = FakeProfile(gpa=4.0, tests=FakeTests(SAT=FakeTestEntry(True, 1580)))
no_tests = FakeProfile(gpa=3.5, tests=FakeTests(SAT=FakeTestEntry(False, 1350)))
both_tests = FakeProfile(gpa=3.5, tests=FakeTests(SAT=FakeTestEntry(True, 1350), ACT=FakeTestEntry(True, 30)))

s_weak = scoring.academic_strength(weak)
s_strong = scoring.academic_strength(strong)
s_none = scoring.academic_strength(no_tests)
s_both = scoring.academic_strength(both_tests)

print(f"weak SAT profile        -> {s_weak}/100")
print(f"strong SAT profile      -> {s_strong}/100")
print(f"GPA only, no test taken -> {s_none}/100")
print(f"SAT + ACT both taken    -> {s_both}/100")

check("weak profile scores low (<30)", s_weak < 30)
check("strong profile scores high (>90)", s_strong > 90)
check("strong beats weak", s_strong > s_weak)
check("no test taken still returns a valid GPA-only score", 0 <= s_none <= 100)

# IELTS must never affect academic_strength
ielts_only = FakeProfile(gpa=3.5, tests=FakeTests(SAT=FakeTestEntry(False, 0), IELTS=FakeTestEntry(True, 9)))
check("IELTS alone doesn't change the score vs no test at all", scoring.academic_strength(ielts_only) == s_none)

# ---------------------------------------------------------------- english_proficiency_level
print("\n=== english_proficiency_level ===")
p_strong_en = FakeProfile(tests=FakeTests(IELTS=FakeTestEntry(True, 8)))
p_low_en = FakeProfile(tests=FakeTests(IELTS=FakeTestEntry(True, 5.5)))
p_no_ielts = FakeProfile(tests=FakeTests(IELTS=FakeTestEntry(False, 7)))

check("IELTS 8 -> strong", scoring.english_proficiency_level(p_strong_en) == "strong")
check("IELTS 5.5 -> low", scoring.english_proficiency_level(p_low_en) == "low")
check("no IELTS taken -> None", scoring.english_proficiency_level(p_no_ielts) is None)

# ---------------------------------------------------------------- match_score
print("\n=== match_score ===")

user = FakeProfile(setting="Coastal", climate="Warm", budget=35000, research=4)

mit = FakeUni(1, cs=98, acceptance=0.04, gpa25=3.63, gpa75=3.98, sat25=1430, sat75=1580,
              setting="Urban", climate="Cold", cost=57900, research=5)
ucsd = FakeUni(2, cs=96, acceptance=0.24, gpa25=3.53, gpa75=3.88, sat25=1350, sat75=1500,
               setting="Coastal", climate="Warm", cost=34000, research=4)
asu = FakeUni(6, cs=75, acceptance=0.88, gpa25=3.21, gpa75=3.56, sat25=1100, sat75=1250,
              setting="Suburban", climate="Warm", cost=29000, research=3)

m_mit = scoring.match_score(mit, user)
m_ucsd = scoring.match_score(ucsd, user)
m_asu = scoring.match_score(asu, user)

print(f"MIT match for a Coastal/Warm/$35k user  -> {m_mit}%")
print(f"UCSD match for the same user            -> {m_ucsd}%  (Coastal+Warm+fits budget)")
print(f"ASU match for the same user             -> {m_asu}%")

check("all scores stay within [15, 99]", all(15 <= s <= 99 for s in (m_mit, m_ucsd, m_asu)))
check("UCSD (matches setting+climate+budget) beats MIT", m_ucsd > m_mit)

cheap_similar = FakeUni(99, cs=96, acceptance=0.24, gpa25=3.53, gpa75=3.88, sat25=1350, sat75=1500,
                         setting="Coastal", climate="Warm", cost=20000, research=4)
check("a cheaper university with the same profile scores >= the pricier one",
      scoring.match_score(cheap_similar, user) >= m_ucsd)

neutral_user = FakeProfile()
check("neutral user (no prefs) still gets a valid score", 15 <= scoring.match_score(ucsd, neutral_user) <= 99)

# Помощь: полный цикл (aid_type) вместо коэффициентов «надёжности».
generous = FakeUni(100, cs=90, acceptance=0.20, gpa25=3.5, gpa75=3.9, sat25=1300, sat75=1500,
                    setting="Urban", climate="Cold", cost=50000, research=4, aid_type="full")
stingy = FakeUni(101, cs=90, acceptance=0.20, gpa25=3.5, gpa75=3.9, sat25=1300, sat75=1500,
                  setting="Urban", climate="Cold", cost=50000, research=4, aid_type="low")
wants_aid = FakeProfile(needs_aid=True)

check("when aid matters, generous-aid school scores higher",
      scoring.match_score(generous, wants_aid) > scoring.match_score(stingy, wants_aid))
check("aid availability is reflected through the cost verdict, not a magic coefficient",
      scoring.cost_info(generous, wants_aid)["aid_max"] > scoring.cost_info(stingy, wants_aid)["aid_max"])

# «Meets full need» + note «limited for internationals» + студент-иностранец:
# помощи нет (eligible=False), вуз не получает баллов за недоступную помощь.
limited_intl = FakeUni(102, cs=90, acceptance=0.05, gpa25=3.5, gpa75=3.9, sat25=1300, sat75=1500,
                       setting="Urban", climate="Cold", cost=50000, research=4, aid_type="full",
                       aid_note="Meets 100% of need; aid limited for international students")
intl_student = FakeProfile(needs_aid=True, home_country="Russia")
domestic_student = FakeProfile(needs_aid=True, home_country="United States")
check("limited-for-internationals aid is not granted to international students",
      scoring.cost_info(limited_intl, intl_student)["aid_max"] == 0)
check("the same school still offers aid to domestic students",
      scoring.cost_info(limited_intl, domestic_student)["aid_max"] > 0)

# Языковые тесты (TOEFL/DET) не меняют академическую оценку — R03.
p_no_toefl = FakeProfile(gpa=4.0, tests=FakeTests(SAT=FakeTestEntry(True, 1400)))
p_toefl = FakeProfile(gpa=4.0, tests=FakeTests(SAT=FakeTestEntry(True, 1400), TOEFL=FakeTestEntry(True, 60)))
check("TOEFL doesn't change admission_reality", scoring.admission_reality(ucsd, p_no_toefl) == scoring.admission_reality(ucsd, p_toefl))
check("TOEFL doesn't change academic_strength", scoring.academic_strength(p_no_toefl) == scoring.academic_strength(p_toefl))

# Языки конкретной программы важнее языка страны — R16.
intl_english_program = FakeUni(103, cs=80, acceptance=0.2, gpa25=3.3, gpa75=3.7, sat25=1200, sat75=1400,
                               setting="Urban", climate="Warm", cost=40000, research=4,
                               country="Saudi Arabia", teach_langs=["en"])
ru_student = FakeProfile(native_lang="ru")
check("teach_langs override beats country default (English program in a non-English country)",
      scoring.language_fit(intl_english_program, ru_student) == scoring.language_fit(ucsd, ru_student))

# ---------------------------------------------------------------- admission_reality
print("\n=== admission_reality (percentile-band model) ===")

weak_student = FakeProfile(gpa=3.0, tests=FakeTests(SAT=FakeTestEntry(True, 1100)))
strong_student = FakeProfile(gpa=4.0, tests=FakeTests(SAT=FakeTestEntry(True, 1590)))
mid_student = FakeProfile(gpa=3.7, tests=FakeTests(SAT=FakeTestEntry(True, 1500)))

r1 = scoring.admission_reality(mit, weak_student)     # ниже gpa25/sat25 MIT -> Reach
r2 = scoring.admission_reality(mit, strong_student)   # выше gpa75/sat75, но acceptance<10% -> Reach
r3 = scoring.admission_reality(ucsd, mid_student)     # внутри [25;75] при приёме 24% -> Target
r4 = scoring.admission_reality(asu, strong_student)   # выше диапазона ASU, acceptance>=15% -> Likely

print(f"MIT for a below-25th-percentile student -> {r1}")
print(f"MIT for an above-75th-percentile student (4% acceptance) -> {r2}")
print(f"UCSD (24% acceptance) for a within-the-middle-50% student -> {r3}")
print(f"ASU for a strong student (88% acceptance, above ASU's range) -> {r4}")

check("below 25th percentile -> Reach", r1 == "Reach")
check("below 10% acceptance is a Reach even for a perfect applicant", r2 == "Reach")
check("within the middle 50% -> Target", r3 == "Target")
check("above the range at a non-ultra-selective school -> Likely", r4 == "Likely")
r5 = scoring.admission_reality(ucsd, strong_student)
check("above the range at a 10-25% acceptance school is capped at Target", r5 == "Target")
check("admission_reality only ever returns one of the 3 valid labels",
      all(r in ("Reach", "Target", "Likely") for r in (r1, r2, r3, r4)))

# a strong GPA doesn't overrule a weak test score (weaker signal wins)
mixed_student = FakeProfile(gpa=4.0, tests=FakeTests(SAT=FakeTestEntry(True, 1000)))
check("strong GPA + weak SAT is judged by the weaker (SAT) signal",
      scoring.admission_reality(mit, mixed_student) == "Reach")

# ---------------------------------------------------------------- match_breakdown / why
print("\n=== match_breakdown / why_this_university ===")

rows = scoring.match_breakdown(ucsd, user)
codes = [r["code"] for r in rows]
check("breakdown includes all 6 categories of the unified formula",
      set(codes) == {"program_fit", "cost_fit", "chance_fit", "research_fit", "prefs_fit", "lang_fit"})
check("every breakdown row carries its weight", all("weight" in r and r["weight"] > 0 for r in rows))

reasons = scoring.why_this_university(ucsd, user)
check("why_this_university returns 1-5 structured reasons", 1 <= len(reasons) <= 5)
check("every reason has a code and a params dict", all("code" in r and "params" in r for r in reasons))

# ---------------------------------------------------------------- summary
print("\n=== SUMMARY ===")
passed = sum(1 for _, ok in results if ok)
total = len(results)
print(f"{passed}/{total} checks passed")
if passed != total:
    print("FAILED CHECKS:")
    for label, ok in results:
        if not ok:
            print(" -", label)
    raise SystemExit(1)
