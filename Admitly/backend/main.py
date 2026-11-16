import json
import os
import time
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import List

import secrets

from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

import models
import schemas
import scoring
import auth
import entitlements
import payments
import placements
import social_auth  # noqa: F401 — проверка токенов соцвхода (роут /auth/social)
from database import Base, engine, get_db
import migrations
import seed_data

Base.metadata.create_all(bind=engine)  # новые таблицы (create_all не трогает существующие)
migrations.apply(engine)               # версионированные изменения СХЕМЫ существующих таблиц
seed_data.seed()


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _valid_email(email: str) -> bool:
    import re
    return bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email))


# ---------------------------------------------------------------- sessions / access control
def _bearer_token(request: Request) -> str:
    authz = request.headers.get("authorization", "")
    if authz.startswith("Bearer "):
        return authz[len("Bearer "):].strip()
    return ""


SESSION_TTL_DAYS = 30


def _issue_session(db: Session, user_id: int) -> str:
    """Создаёт серверную сессию (срок жизни 30 дней), возвращает токен."""
    token = secrets.token_urlsafe(32)
    db.add(models.AuthSession(
        token=token,
        user_id=user_id,
        expires_at=datetime.utcnow() + timedelta(days=SESSION_TTL_DAYS),
    ))
    return token


def _guest_token(request: Request) -> str:
    return (request.headers.get("x-guest-token") or "").strip() if request else ""


def _session_user(db: Session, request: Request) -> models.User | None:
    """Пользователь по валидной (не протухшей) серверной сессии, иначе None."""
    token = _bearer_token(request)
    if not token:
        return None
    sess = (
        db.query(models.AuthSession)
        .filter(models.AuthSession.token == token)
        .first()
    )
    if not sess:
        return None
    if sess.expires_at is not None and sess.expires_at <= datetime.utcnow():
        db.delete(sess)  # протухшая сессия недействительна — убираем сразу
        db.commit()
        return None
    return db.get(models.User, sess.user_id)


def _require_access(db: Session, user_id: int, request: Request) -> models.User:
    """
    Контроль доступа к персональным данным. Два способа подтвердить, что ты —
    этот пользователь:

    1. Валидная серверная сессия из Authorization: Bearer. Работает для
       ЛЮБОГО пользователя — зарегистрированного и «гостя с соцвходом».
       Раньше соцвход создавал пользователя с is_guest=True, но фронт после
       входа переставал слать X-Guest-Token (оставался только Bearer) — и
       backend отвечал 401 на каждый запрос профиля. Теперь Bearer-сессия
       достаточно: гостевой статус и способ входа разделены.
    2. Гостевой секрет: заголовок X-Guest-Token с guestId самого гостя.
       Знание числового id или чужого guestId доступ не даёт.

    Сессии живут 30 дней (expires_at) и отзываются все сразу через
    DELETE /users/{id}/sessions.
    """
    user = _session_user(db, request)
    if user is not None and user.id == user_id:
        return user
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if not user.is_guest:
        raise HTTPException(401, "Нужно войти заново")
    presented = _guest_token(request)
    # compare_digest не принимает не-ASCII строки: кодируем в байты,
    # чтобы кривой заголовок давал 401, а не 500.
    try:
        ok = secrets.compare_digest(
            presented.encode("utf-8"), (user.guest_token or "").encode("utf-8")
        )
    except Exception:
        ok = False
    if not presented or not ok:
        raise HTTPException(401, "Нужно войти заново")
    return user


app = FastAPI(title="Admitly API")

# Фронтенд живёт на другом origin, поэтому нужен CORS. Список разрешённых адресов
# задаётся переменной ADMITLY_CORS_ORIGINS через запятую (в проде укажите домен
# фронтенда). Без переменной разрешены все origin: удобно локально, в проде не нужно.
# Авторизация идёт через заголовок Authorization, а не cookie, поэтому
# allow_credentials не включаем.
_origins = [o.strip() for o in os.environ.get("ADMITLY_CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Deck-Fallback"],  # без этого браузер не отдаст заголовок фронтенду
)


# ---------------------------------------------------------------- profile <-> User helpers
def _db_from_list(value):
    """Массив предпочтений -> строка для колонки VARCHAR (JSON). Пустой -> None."""
    if isinstance(value, (list, tuple)):
        return json.dumps(list(value)) if value else None
    return value  # легаси: одиночная строка


def _list_from_db(value):
    """Колонка VARCHAR -> массив предпочтений. Понимает три варианта:
    None -> [], JSON-массив (новый формат), одиночная строка (легаси) -> [value]."""
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return list(value)
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return parsed
    except (ValueError, TypeError):
        pass
    return [value]


def _profile_from_user(user: models.User) -> schemas.Profile:
    # Клампим значения из БД к диапазонам слайдеров онбординга (schemas.Profile):
    # старая запись с мусорным budget/gpa не должна ронять ручку 500-й.
    gpa = min(max(user.gpa if user.gpa is not None else 3.6, 2.0), 4.0)
    research = min(max(user.research if user.research is not None else 3, 1), 5)
    budget = min(max(user.budget if user.budget is not None else 40000, 0), 200000)
    return schemas.Profile(
        gpa=gpa,
        tests=schemas.Tests.model_validate(user.tests or {}),
        major=user.major,
        majors=_list_from_db(user.majors) if user.majors else ([user.major] if user.major else []),
        degree_level=user.degree_level,
        size=_list_from_db(user.size),
        setting=_list_from_db(user.setting),
        climate=_list_from_db(user.climate),
        research=research,
        budget=budget,
        needs_aid=user.needs_aid,
        continents=user.continents or [],
        countries=user.countries or [],
        home_country=user.home_country or "",
        native_lang=user.native_lang or "",
    )


def _apply_profile_to_user(user: models.User, profile: schemas.Profile) -> None:
    user.gpa = profile.gpa
    user.tests = profile.tests.model_dump()
    # Мультивыбор специальностей: majors — полный список, major — первая
    # выбранная (обратная совместимость клиентов, которые знают только major).
    majors = [m for m in (profile.majors or []) if isinstance(m, str) and m.strip()]
    if not majors and profile.major:
        majors = [profile.major]
    user.majors = majors or None
    user.major = majors[0] if majors else profile.major
    user.degree_level = profile.degree_level
    user.size = _db_from_list(profile.size)
    user.setting = _db_from_list(profile.setting)
    user.climate = _db_from_list(profile.climate)
    user.home_country = profile.home_country or ""
    user.native_lang = profile.native_lang or ""
    user.research = profile.research
    user.budget = profile.budget
    user.needs_aid = profile.needs_aid
    user.continents = profile.continents
    user.countries = profile.countries


def _user_out(user: models.User, session_token: str = None) -> schemas.UserOut:
    return schemas.UserOut(
        id=user.id,
        guest_id=user.guest_token,
        is_registered=not user.is_guest,
        email=user.email,
        lang=user.lang,
        profile=_profile_from_user(user),
        session_token=session_token,
        is_premium=entitlements.is_premium(user),
    )


def _uni_out(uni: models.University, cls=schemas.UniversityOut, **extra) -> schemas.UniversityOut:
    return cls(
        id=uni.id, name=uni.name, city=uni.city, country=uni.country, continent=uni.continent,
        cost=uni.cost, acceptance=uni.acceptance,
        gpa25=uni.gpa25, gpa75=uni.gpa75, sat25=uni.sat25, sat75=uni.sat75,
        size=uni.size, setting=uni.setting, climate=uni.climate,
        research=uni.research, cs=uni.cs, tags=uni.tags or [],
        aid=schemas.AidInfo(level=uni.aid_level, merit=uni.aid_merit, note=uni.aid_note),
        **extra,
    )


def _match_out(uni: models.University, profile: schemas.Profile) -> schemas.UniversityMatchOut:
    return _uni_out(
        uni, cls=schemas.UniversityMatchOut,
        match_score=scoring.match_score(uni, profile),
        admission_reality=scoring.admission_reality(uni, profile),
    )


# ---------------------------------------------------------------- users / guest sessions
@app.post("/users", response_model=schemas.UserOut)
def create_or_update_guest(payload: schemas.UserCreate, db: Session = Depends(get_db), request: Request = None):
    """
    Онбординг без обязательной регистрации — эквивалент saveGuestSession() на фронте.
    Если guest_id уже есть в БД — обновляем профиль существующего гостя (например,
    он прошёл онбординг заново или поменял фильтры на Discover). Если нет — создаём
    нового пользователя с этим guest_id (или генерируем новый, если не передан).
    """
    user = None
    token_taken = False
    if payload.guest_id:
        found = db.query(models.User).filter(models.User.guest_token == payload.guest_id).first()
        if found and not found.is_guest:
            # Апдейт профиля зарегистрированного аккаунта по одному guestId — это
            # смена чужих данных без предъявления сессии: требуем токен.
            try:
                _require_access(db, found.id, request)
                user = found
            except HTTPException:
                # Но не ломаем клиенту вход: guestId из localStorage мог
                # «прилипнуть» к аккаунту после регистрации и последующего
                # выхода. Раньше здесь был голый 401 — и выйти в гостевой
                # режим без логина было невозможно. Чужой аккаунт не трогаем,
                # а молча заводим НОВУЮ гостевую сессию: клиент подхватит
                # свежий guestId из ответа (state.guestId = user.guestId).
                token_taken = True
        else:
            user = found  # обычный гость или ничего — апдейт/создание как раньше

    if not user:
        # Новый гость: если старый токен принадлежит аккаунту — генерим новый.
        user = models.User(
            guest_token=(str(uuid.uuid4()) if token_taken else (payload.guest_id or str(uuid.uuid4()))),
            is_guest=True,
        )
        db.add(user)

    user.lang = payload.lang
    _apply_profile_to_user(user, payload.profile)

    db.commit()
    db.refresh(user)
    return _user_out(user)


@app.post("/users/{user_id}/register", response_model=schemas.UserOut)
def register_email(user_id: int, payload: schemas.RegisterEmail, db: Session = Depends(get_db), request: Request = None):
    """«Мягкая» регистрация: гость оставляет email, чтобы не потерять список Matches
    (тот же user.id, is_guest становится False — как isRegistered=true на фронте).
    Пароль не задаёт — для входа потом нужно до-регистрироваться через /auth/register
    с тем же email (guest-данные при этом «усыновятся», если передать guestId)."""
    user = _require_access(db, user_id, request)
    email = _normalize_email(payload.email)
    if not _valid_email(email):
        raise HTTPException(400, "Введи корректный email")
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing and existing.id != user.id:
        raise HTTPException(400, "Этот email уже привязан к другому аккаунту")
    user.email = email
    user.is_guest = False
    db.commit()
    db.refresh(user)
    return _user_out(user)


@app.post("/auth/register", response_model=schemas.UserOut)
def auth_register(payload: schemas.AuthRegister, db: Session = Depends(get_db)):
    """
    Настоящая регистрация с паролем. Контракт фронтенда (submitAuthForm →
    apiAuthRegister): {email, password, lang, guestId} → UserOut — тот же объект,
    что отдают /users и /users/{id}. Пароль хранится только как PBKDF2-хеш
    (auth.py), в ответе его никогда нет.

    Ключевой сценарий: guestId передаётся при регистрации с онбординга/гостя —
    тогда email+пароль привязываются к уже существующему user, и весь прогресс
    (профиль, свайпы, Matches) сохраняется. Без guestId создаётся новый user
    с дефолтным профилем.
    """
    email = _normalize_email(payload.email)
    if not _valid_email(email):
        raise HTTPException(400, "Введи корректный email")
    if len(payload.password) < 6:
        raise HTTPException(400, "Пароль — минимум 6 символов")

    existing = db.query(models.User).filter(models.User.email == email).first()

    # «Усыновление» гостя: регистрируемся поверх текущей гостевой сессии.
    guest = None
    if payload.guest_id:
        guest = (
            db.query(models.User)
            .filter(models.User.guest_token == payload.guest_id)
            .first()
        )

    if existing and existing.password_hash:
        # Аккаунт с паролем уже есть — email занят. Ошибка намеренно не
        # раскрывает, есть ли у аккаунта пароль.
        raise HTTPException(400, "Этот email уже привязан к другому аккаунту")

    if guest and guest.password_hash:
        # Гостевая сессия уже привязана к аккаунту с паролем: регистрация с
        # новым email перезаписала бы этот аккаунт. Не допускаем.
        raise HTTPException(400, "Эта сессия уже привязана к аккаунту — войди")

    if existing:
        # Аккаунт существует, но без пароля — это «мягкая» email-регистрация.
        # Установить пароль можно только доказав владение гостевой сессией
        # этого же аккаунта (guestId): иначе любой, кто знает email, смог бы
        # захватить аккаунт вместе со списком Matches.
        if not guest or guest.id != existing.id:
            raise HTTPException(400, "Этот email уже привязан к другому аккаунту")
        user = existing
    elif guest:
        user = guest
    else:
        user = models.User(
            guest_token=payload.guest_id or str(uuid.uuid4()),
            is_guest=True,
        )
        db.add(user)

    user.email = email
    user.password_hash = auth.hash_password(payload.password)
    user.is_guest = False
    if payload.lang in ("ru", "en"):
        user.lang = payload.lang
    db.flush()  # присваиваем id новой записи до выдачи сессии
    token = _issue_session(db, user.id)
    db.commit()
    db.refresh(user)
    return _user_out(user, session_token=token)


# ---------------------------------------------------------------- rate limiting (login)
# Защита от перебора паролей: до LOGIN_MAX_FAILURES неудачных попыток за
# LOGIN_WINDOW_SECONDS с одного источника (IP) по одному email. Счётчики в
# памяти процесса — для одного инстанса на Render этого достаточно; при
# горизонтальном масштабировании переносим в Redis/таблицу.
LOGIN_MAX_FAILURES = 10
LOGIN_WINDOW_SECONDS = 15 * 60
_login_failures: dict = defaultdict(list)  # key: (ip, email) -> [timestamps]


def _client_ip(request: Request) -> str:
    # Render проксирует запросы: реальный адрес клиента в X-Forwarded-For.
    fwd = request.headers.get("x-forwarded-for", "") if request else ""
    return (fwd.split(",")[0].strip() or (request.client.host if request and request.client else "unknown"))


def _login_blocked(request: Request, email: str) -> bool:
    now = time.monotonic()
    key = (_client_ip(request), email)
    recent = [ts for ts in _login_failures[key] if now - ts < LOGIN_WINDOW_SECONDS]
    _login_failures[key] = recent
    return len(recent) >= LOGIN_MAX_FAILURES


def _record_login_failure(request: Request, email: str) -> None:
    _login_failures[(_client_ip(request), email)].append(time.monotonic())


@app.post("/auth/login", response_model=schemas.UserOut)
def auth_login(payload: schemas.AuthLogin, db: Session = Depends(get_db), request: Request = None):
    """
    Вход по email+паролю → UserOut. Фронт (submitAuthForm) дальше зовёт
    GET /users/{id} и грузит сессию как после создания пользователя.
    Защита от перебора: после 10 неудачных попыток за 15 минут с одного
    источника по этому email — 429 без подсказки, что угадано.
    """
    email = _normalize_email(payload.email)
    if _login_blocked(request, email):
        raise HTTPException(429, "Слишком много попыток входа — попробуй позже")
    user = db.query(models.User).filter(models.User.email == email).first()
    if (
        not user
        or not user.password_hash
        or not auth.verify_password(payload.password, user.password_hash)
    ):
        _record_login_failure(request, email)
        # Одна и та же ошибка и на «нет такого email», и на «неверный пароль» —
        # не раскрываем, существует ли аккаунт.
        raise HTTPException(401, "Неверный email или пароль")
    token = _issue_session(db, user.id)
    db.commit()
    return _user_out(user, session_token=token)


@app.post("/auth/logout")
def auth_logout(db: Session = Depends(get_db), request: Request = None):
    """Удаляет текущую сессию (по Bearer-токену). Идемпотентно: нет токена —
    всё равно 200."""
    token = _bearer_token(request)
    if token:
        db.query(models.AuthSession).filter(models.AuthSession.token == token).delete()
        db.commit()
    return {"ok": True}


@app.delete("/users/{user_id}/sessions")
def revoke_all_sessions(user_id: int, db: Session = Depends(get_db), request: Request = None):
    """Отзывает ВСЕ сессии пользователя (выход со всех устройств) — например,
    при подозрении на утечку токена. Требует владения аккаунтом: гость —
    своим guestId, вошедший — действующей сессией (она тоже будет удалена)."""
    _require_access(db, user_id, request)
    deleted = db.query(models.AuthSession).filter(models.AuthSession.user_id == user_id).delete()
    db.commit()
    return {"ok": True, "deleted": deleted}


@app.post("/auth/social", response_model=schemas.UserOut)
def auth_social(payload: schemas.SocialLogin, db: Session = Depends(get_db)):
    """Вход через Google/Яндекс/Telegram — с серверной проверкой токена.

    Фронт присылает токен провайдера, social_auth.verify() проверяет его у
    провайдера (Google tokeninfo / Яндекс login.yandex.ru/info / Telegram
    HMAC), и связка «аккаунт провайдера → user» хранится в таблице
    social_accounts — не в localStorage.

    Повторный вход по той же соц-кнопке находит эту связку и выдаёт сессию.
    Первый вход «усыновляет» текущую гостевую сессию (guest_id) — профиль и
    свайпы сохраняются; если email от провайдера совпал с существующим
    аккаунтом, привязываемся к нему (email подтверждён самим провайдером)."""
    import social_auth

    try:
        verified = social_auth.verify(payload.provider, payload.model_dump())
    except social_auth.SocialVerifyError as e:
        # Токен не прошёл проверку — 401 с сообщением, которое можно показать
        # пользователю (не 500: это ожидаемая ошибка, а не сбой сервера).
        raise HTTPException(401, str(e))
    provider_user_id = verified["provider_user_id"]
    email = verified.get("email")

    # 1) Уже есть привязка этого аккаунта провайдера — просто вход.
    link = (
        db.query(models.SocialAccount)
        .filter(
            models.SocialAccount.provider == payload.provider,
            models.SocialAccount.provider_user_id == provider_user_id,
        )
        .first()
    )

    user = None
    if link:
        user = db.get(models.User, link.user_id)
        if not user:
            db.delete(link)  # битая ссылка на удалённого пользователя
            db.commit()
            link = None

    # 2) Email от провайдера совпал с существующим аккаунтом — связываем.
    if user is None and email:
        by_email = db.query(models.User).filter(models.User.email == email).first()
        if by_email:
            user = by_email

    # 3) Новый пользователь: «усыновляем» гостя или создаём запись.
    if user is None and payload.guest_id:
        guest = db.query(models.User).filter(models.User.guest_token == payload.guest_id).first()
        if guest and not guest.password_hash:
            user = guest
    if user is None:
        user = models.User(guest_token=payload.guest_id or str(uuid.uuid4()), is_guest=True)
        db.add(user)
        db.flush()

    if email and not user.email:
        user.email = email
    # Регистрационный статус отделён от способа входа: провайдер подтвердил
    # email — аккаунт считается зарегистрированным (isRegistered=true на
    # фронте). Telegram email не даёт — такой пользователь остаётся «гостём
    # с соцвходом», НО с серверной сессией: _require_access пускает по
    # Bearer-токену независимо от гостевого статуса, поэтому профиль,
    # свайпы и Matches работают без X-Guest-Token.
    user.is_guest = not bool(user.email)
    if payload.lang in ("ru", "en"):
        user.lang = payload.lang

    if not link:
        db.add(models.SocialAccount(
            provider=payload.provider,
            provider_user_id=provider_user_id,
            user_id=user.id,
            email=email,
        ))

    token = _issue_session(db, user.id)
    db.commit()
    db.refresh(user)
    return _user_out(user, session_token=token)


@app.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), request: Request = None):
    user = _require_access(db, user_id, request)
    return _user_out(user)


# ---------------------------------------------------------------- universities / deck
@app.get("/universities", response_model=List[schemas.UniversityMatchOut])
def list_universities(user_id: int, response: Response, db: Session = Depends(get_db), request: Request = None):
    """
    Эквивалент buildDeck() на фронте: фильтрует по profile.continents/countries
    пользователя (их меняют через POST /users, включая toggle на Discover-экране),
    откатывается к полному списку если фильтр даёт пустой результат, исключает уже
    свайпнутые вузы (liked и disliked) и сортирует по Match Score по убыванию.
    """
    user = _require_access(db, user_id, request)
    profile = _profile_from_user(user)

    pool = db.query(models.University).all()
    fallback = False
    if profile.continents or profile.countries:
        filtered = [
            u for u in pool
            if (not profile.continents or u.continent in profile.continents)
            and (not profile.countries or u.country in profile.countries)
        ]
        if filtered:
            pool = filtered
        else:
            fallback = True  # фильтр ничего не нашёл: показываем всё и сообщаем фронтенду
    response.headers["X-Deck-Fallback"] = "true" if fallback else "false"

    already_swiped = {s.university_id for s in user.swipes}
    pool = [u for u in pool if u.id not in already_swiped]

    results = [_match_out(u, profile) for u in pool]
    results.sort(key=lambda x: x.match_score, reverse=True)
    return results


@app.get("/universities/{uni_id}", response_model=schemas.UniversityMatchOut)
def get_university(uni_id: int, user_id: int, db: Session = Depends(get_db), request: Request = None):
    """Один вуз с Match Score и Admission Reality для этого пользователя (фолбэк findUni())."""
    user = _require_access(db, user_id, request)
    uni = db.get(models.University, uni_id)
    if not uni:
        raise HTTPException(404, "University not found")
    return _match_out(uni, _profile_from_user(user))


@app.get("/universities/{uni_id}/why", response_model=schemas.WhyOut)
def why_this_university(uni_id: int, user_id: int, db: Session = Depends(get_db), request: Request = None):
    user = _require_access(db, user_id, request)
    uni = db.get(models.University, uni_id)
    if not uni:
        raise HTTPException(404, "Not found")
    profile = _profile_from_user(user)
    return schemas.WhyOut(
        reasons=scoring.why_this_university(uni, profile),
        breakdown=scoring.match_breakdown(uni, profile),
    )


# ---------------------------------------------------------------- swipes
@app.post("/users/{user_id}/swipes")
def record_swipe(user_id: int, payload: schemas.SwipeCreate, db: Session = Depends(get_db), request: Request = None):
    """
    Записывает Like/Dislike — ТЕКУЩЕЕ решение пользователя по вузу (implicit
    feedback для фазы 2 (ML) — не событие истории). Пара (user, university)
    уникальна: повторный свайп обновляет liked (upsert), поэтому like →
    dislike честно убирает вуз из Matches, а история не раздувается дублями.
    """
    user = _require_access(db, user_id, request)
    uni = db.get(models.University, payload.university_id)
    if not uni:
        raise HTTPException(404, "University not found")

    swipe = (
        db.query(models.Swipe)
        .filter(
            models.Swipe.user_id == user_id,
            models.Swipe.university_id == payload.university_id,
        )
        .first()
    )
    if swipe:
        swipe.liked = payload.liked
    else:
        db.add(models.Swipe(user_id=user_id, university_id=payload.university_id, liked=payload.liked))
    db.commit()
    return {"status": "recorded"}


@app.delete("/users/{user_id}/swipes/{university_id}")
def delete_swipe(user_id: int, university_id: int, db: Session = Depends(get_db), request: Request = None):
    """
    Отменяет свайп по конкретному вузу — нужно для кнопки "Save"/"In Matches" на
    странице вуза (toggleLike на фронте): если вуз уже лайкнут, повторное нажатие
    должно убрать его из Matches, а не просто дописать ещё один свайп поверх.
    После удаления вуз снова может появиться в /universities (уже не в already_swiped).
    """
    _require_access(db, user_id, request)
    deleted = db.query(models.Swipe).filter(
        models.Swipe.user_id == user_id, models.Swipe.university_id == university_id
    ).delete()
    db.commit()
    return {"status": "deleted", "count": deleted}


# ---------------------------------------------------------------- matches
@app.get("/users/{user_id}/matches", response_model=List[schemas.UniversityMatchOut])
def get_matches(user_id: int, db: Session = Depends(get_db), request: Request = None):
    user = _require_access(db, user_id, request)
    profile = _profile_from_user(user)

    liked_ids = [s.university_id for s in user.swipes if s.liked]
    unis = db.query(models.University).filter(models.University.id.in_(liked_ids)).all()

    results = [_match_out(u, profile) for u in unis]
    results.sort(key=lambda x: x.match_score, reverse=True)
    return results


# ---------------------------------------------------------------- University DNA
@app.get("/users/{user_id}/dna", response_model=schemas.DNAOut)
def get_dna(user_id: int, db: Session = Depends(get_db), request: Request = None):
    """Эквивалент computeDNA() на фронте — тот же радар-чарт "University DNA"."""
    user = _require_access(db, user_id, request)

    liked_ids = [s.university_id for s in user.swipes if s.liked]
    liked = db.query(models.University).filter(models.University.id.in_(liked_ids)).all()

    if not liked:
        return schemas.DNAOut(cs=50, coastal=50, research=50, urban=50, cost_sensitive=50, warm=50, based_on_swipes=0)

    n = len(liked)
    settings = Counter(u.setting for u in liked)
    climates = Counter(u.climate for u in liked)

    return schemas.DNAOut(
        cs=round(sum(u.cs for u in liked) / n),
        coastal=round(100 * settings.get("Coastal", 0) / n),
        research=round(sum(u.research for u in liked) / n * 20),
        urban=round(100 * settings.get("Urban", 0) / n),
        cost_sensitive=round(100 - min(100, (sum(u.cost for u in liked) / n) / 700)),
        warm=round(100 * climates.get("Warm", 0) / n),
        based_on_swipes=n,
    )


# ---------------------------------------------------------------- premium / partners
@app.post("/users/{user_id}/entitlement", response_model=schemas.UserOut)
def set_entitlement(user_id: int, payload: schemas.EntitlementUpdate, db: Session = Depends(get_db), request: Request = None):
    """
    ДЕМО: переключает план без оплаты. Работает только если задана переменная
    окружения ADMITLY_DEMO_PREMIUM=1; в проде её быть не должно, иначе любой
    пользователь выдаст себе премиум сам. Когда появится платёжный провайдер,
    план должен выставляться его вебхуком, а эта ручка удаляется.
    """
    if os.environ.get("ADMITLY_DEMO_PREMIUM") != "1":
        raise HTTPException(403, "Demo premium is disabled")
    user = _require_access(db, user_id, request)
    if payload.plan not in ("free", "premium"):
        raise HTTPException(400, "plan must be 'free' or 'premium'")
    if user.entitlement is None:
        user.entitlement = models.Entitlement(plan=payload.plan)
    else:
        user.entitlement.plan = payload.plan
        user.entitlement.active_until = None
    db.commit()
    db.refresh(user)
    return _user_out(user)


# ---------------------------------------------------------------- payments (Stripe)
@app.get("/payments/config")
def payments_config():
    """Публичный конфиг оплаты: {stripe: bool, demo: bool}. Фронт по нему
    решает, какую кнопку рисовать — «Оформить Premium» (реальная оплата),
    демо-активацию или честную плашку «оплата ещё не подключена»."""
    return {
        "stripe": payments.configured(),
        "demo": os.environ.get("ADMITLY_DEMO_PREMIUM") == "1",
    }


@app.post("/payments/checkout-session", response_model=schemas.CheckoutSessionOut)
def payments_checkout(user_id: int, db: Session = Depends(get_db), request: Request = None):
    """Создаёт Stripe Checkout Session и отдаёт {url}. Фронт делает
    location.href = url — карту вводят на стороне Stripe (PCI-DSS нас не
    касается). Требует входа: чужой не оформит подписку за пользователя."""
    if not payments.configured():
        raise HTTPException(503, "Оплата ещё не подключена")
    user = _require_access(db, user_id, request)
    try:
        return payments.create_checkout_session(user.id, user.email)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(502, f"Stripe вернул ошибку: {e}")


def _stripe_event_user(db: Session, stripe, etype: str, obj: dict):
    """Ищет пользователя Admitly по событию Stripe. Порядок:
    1. user_id в metadata объекта / client_reference_id (checkout);
    2. сохранённая связь entitlement.stripe_subscription_id == id подписки;
    3. метаданные самой подписки (subscription_data.metadata.user_id) —
       дергаем подписку из Stripe только если первые два не сработали.
    None — событие к нам не относится (например, чужая подписка)."""
    meta = obj.get("metadata") or {}
    user_id_raw = obj.get("client_reference_id") or meta.get("user_id")
    if user_id_raw:
        try:
            return db.get(models.User, int(user_id_raw))
        except (TypeError, ValueError):
            pass
    sub_id = obj.get("subscription") or (obj.get("id") if etype.startswith("customer.subscription.") else None)
    if sub_id:
        ent = (
            db.query(models.Entitlement)
            .filter(models.Entitlement.stripe_subscription_id == sub_id)
            .first()
        )
        if ent:
            return db.get(models.User, ent.user_id)
        try:
            sub = stripe.Subscription.retrieve(sub_id)
            uid = (sub.get("metadata") or {}).get("user_id")
            if uid:
                return db.get(models.User, int(uid))
        except Exception:
            pass  # не смогли подтянуть подписку — событие обработает retry Stripe
    return None


def _stripe_period_end(obj: dict):
    """Конец оплаченного периода из объекта invoice: либо period_end самого
    инвойса, либо период первой строки (lines.data[0].period.end)."""
    for key in ("period_end", "current_period_end"):
        if obj.get(key):
            return datetime.utcfromtimestamp(int(obj[key]))
    line = ((obj.get("lines") or {}).get("data") or [{}])[0]
    period = (line or {}).get("period") or {}
    if period.get("end"):
        return datetime.utcfromtimestamp(int(period["end"]))
    return None


@app.post("/payments/webhook")
async def payments_webhook(request: Request, db: Session = Depends(get_db)):
    """Вебхук Stripe. Подпись проверяется секретом STRIPE_WEBHOOK_SECRET —
    подделать событие извне нельзя. Полный цикл подписки:

      checkout.session.completed       -> premium до конца периода, сохраняем
                                          customer_id/subscription_id
      invoice.paid / payment_succeeded -> продление: active_until из периода
                                          инвойса
      customer.subscription.updated    -> синхронизация срока подписки
      customer.subscription.deleted    -> план обратно free
      invoice.payment_failed           -> план обратно free

    Идемпотентность: обработанные event.id хранятся в stripe_events —
    повторная доставка события игнорируется (раньше повтор checkout-вебхука
    мог пересчитать active_until «30 дней от сейчас» и сдвигать дату).
    Ошибка запроса к Stripe (retrieve подписки) — 502, чтобы Stripe
    доставил событие повторно, а не молча выдавал премный наугад."""
    if not payments.configured():
        raise HTTPException(503, "Оплата не подключена")
    body = await request.body()
    stripe = payments._stripe()
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(body, sig, secret)
    except Exception:
        raise HTTPException(400, "Неверная подпись вебхука")

    etype = event.get("type", "")
    obj = event.get("data", {}).get("object", {})
    event_id = event.get("id") or ""

    if event_id and db.get(models.StripeEvent, event_id):
        return {"ok": True, "note": "duplicate event"}
    try:
        if event_id:
            db.add(models.StripeEvent(event_id=event_id, event_type=etype))
    except Exception:
        pass

    user = _stripe_event_user(db, stripe, etype, obj)
    if not user:
        db.commit()
        return {"ok": True, "note": "no matching user"}

    if user.entitlement is None:
        user.entitlement = models.Entitlement(plan="free")

    if etype == "checkout.session.completed":
        active_until = None
        sub_id = obj.get("subscription")
        if sub_id:
            try:
                sub = stripe.Subscription.retrieve(sub_id)
            except Exception as e:
                # Не смогли прочитать подписку — пусть Stripe доставит
                # событие заново, вместо гадания о сроке.
                raise HTTPException(502, f"Stripe retrieve failed: {e}")
            if sub.get("current_period_end"):
                active_until = datetime.utcfromtimestamp(int(sub["current_period_end"]))
            user.entitlement.stripe_subscription_id = sub_id
            user.entitlement.stripe_customer_id = obj.get("customer") or sub.get("customer")
        if active_until is None:
            active_until = _stripe_period_end(obj) or payments.period_end_from_event(event)
        if active_until is None:
            raise HTTPException(502, "Не удалось определить оплаченный период")
        user.entitlement.plan = "premium"
        user.entitlement.active_until = active_until
    elif etype in ("invoice.paid", "invoice.payment_succeeded"):
        # Продление подписки: срок — из периода инвойса, пользователь —
        # по сохранённой подписке (user_id в checkout-метаданных мог
        # уже не прийти с этим событием).
        period_end = _stripe_period_end(obj)
        if period_end:
            user.entitlement.plan = "premium"
            user.entitlement.active_until = period_end
    elif etype == "customer.subscription.updated":
        if user.entitlement.stripe_subscription_id is None and obj.get("id"):
            user.entitlement.stripe_subscription_id = obj["id"]
        status = obj.get("status")
        if status in ("active", "trialing"):
            user.entitlement.plan = "premium"
            if obj.get("current_period_end"):
                user.entitlement.active_until = datetime.utcfromtimestamp(int(obj["current_period_end"]))
        elif status in ("canceled", "unpaid", "past_due", "incomplete_expired"):
            user.entitlement.plan = "free"
            user.entitlement.active_until = None
    elif etype in ("customer.subscription.deleted", "invoice.payment_failed"):
        user.entitlement.plan = "free"
        user.entitlement.active_until = None
        if etype == "customer.subscription.deleted":
            user.entitlement.stripe_subscription_id = None

    db.commit()
    return {"ok": True}


@app.get("/users/{user_id}/billing")
def user_billing(user_id: int, db: Session = Depends(get_db), request: Request = None):
    """Статус подписки для страницы Premium: план, до какого числа оплачен."""
    user = _require_access(db, user_id, request)
    ent = user.entitlement
    return {
        "plan": (ent.plan if ent else "free"),
        "active_until": (ent.active_until.isoformat() if ent and ent.active_until else None),
        "is_premium": entitlements.is_premium(user),
    }


# ---------------------------------------------------------------- share links (Premium «Доступ для родителя»)
def _masked_owner(user: models.User) -> str:
    """Как подписан владелец ссылки на экране родителя: имя до @ + домен,
    сам адрес не светим целиком."""
    if user.email and "@" in user.email:
        name, _, domain = user.email.partition("@")
        shown = name[:1] + "***" if len(name) > 1 else name
        return f"{shown}@{domain}"
    return "Admitly"


@app.post("/users/{user_id}/share")
def create_share_link(user_id: int, db: Session = Depends(get_db), request: Request = None):
    """
    Выдаёт токен ссылки «только для чтения». Повторный вызов возвращает тот же
    токен (ссылка одна на аккаунт).

    Платная фича: создание ссылки требует АКТИВНОГО Premium (единый
    entitlement-механизм, 402 — фронт покажет paywall). Политика существующих
    ссылок: после окончания подписки ранее созданная ссылка продолжает
    работать (только для чтения) — родитель не теряет доступ внезапно;
    отзыв — DELETE /users/{id}/share в любой момент.
    """
    user = _require_access(db, user_id, request)
    if not entitlements.is_premium(user):
        raise HTTPException(402, "Доступ для родителя — функция Premium")
    existing = db.query(models.ShareLink).filter(models.ShareLink.user_id == user.id).first()
    if existing:
        return {"token": existing.token}
    token = secrets.token_urlsafe(24)
    db.add(models.ShareLink(token=token, user_id=user.id))
    db.commit()
    return {"token": token}


@app.delete("/users/{user_id}/share")
def revoke_share_link(user_id: int, db: Session = Depends(get_db), request: Request = None):
    """Отзывает ссылку: токен перестаёт работать сразу."""
    user = _require_access(db, user_id, request)
    db.query(models.ShareLink).filter(models.ShareLink.user_id == user.id).delete()
    db.commit()
    return {"ok": True}


@app.get("/share/{token}")
def get_shared_matches(token: str, db: Session = Depends(get_db)):
    """Публичная, только для чтения: список Matches владельца ссылки с шансами.
    Ровно то, что видит родитель/консультант по ссылке — без входа в аккаунт
    и без email в открытом виде."""
    link = db.query(models.ShareLink).filter(models.ShareLink.token == token).first()
    if not link:
        raise HTTPException(404, "Share link not found")
    user = db.get(models.User, link.user_id)
    if not user:
        raise HTTPException(404, "Share link not found")
    profile = _profile_from_user(user)
    matches = [
        _uni_out(sw.university, cls=schemas.UniversityMatchOut,
                 match_score=scoring.match_score(sw.university, profile),
                 admission_reality=scoring.admission_reality(sw.university, profile))
        for sw in user.swipes if sw.liked and sw.university
    ]
    matches.sort(key=lambda m: m.match_score, reverse=True)
    return {"owner": _masked_owner(user), "matches": matches}


@app.get("/placements/{slot}", response_model=List[schemas.PlacementOut])
def get_placements(slot: str, user_id: int, university_id: int = None, db: Session = Depends(get_db), request: Request = None):
    """Партнёрские блоки для слота. Пока партнёров нет, ответ пустой (см. placements.py)."""
    _require_access(db, user_id, request)
    return [
        schemas.PlacementOut(id=p["id"], name=p["name"], disclosure_label=p["disclosure_label"])
        for p in placements.for_slot(slot)
    ]


@app.get("/go/{partner_id}")
def go_partner(partner_id: str):
    """Редирект на партнёра. Ведёт только на адреса из placements.PARTNERS."""
    partner = placements.by_id(partner_id)
    if not partner:
        raise HTTPException(404, "Unknown partner")
    return RedirectResponse(partner["url"], status_code=302)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    """Проверка живости для хостинга: считает вузы в базе."""
    return {"status": "ok", "universities": db.query(models.University).count()}
