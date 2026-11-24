"""Интеграционный тест авторизации Admitly: /auth/register, /auth/login,
серверные сессии (Bearer), контроль доступа, защита от захвата аккаунта.

Запускается при поднятом uvicorn на 127.0.0.1:$PORT (по умолчанию 8000).
Реплицирует вызовы app.js (apiCreateUser -> apiPostSwipe -> apiAuthRegister ->
apiAuthLogin -> apiFetchUser/matches) и негативные сценарии безопасности.
"""
import json
import os
import uuid
import urllib.request
import urllib.error

RUN = uuid.uuid4().hex[:8]  # уникальные guestId/email на каждый прогон

BASE = "http://127.0.0.1:" + os.environ.get("PORT", "8000")
PASS, FAIL = [], []


def call(method, path, body=None, token=None, guest=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if guest:
        headers["X-Guest-Token"] = guest
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("OK  " if cond else "FAIL") + f" {name} {extra}")


# ================================================================ 1. Гость
st, guest = call("POST", "/users", {
    "guestId": "guest-abc-" + RUN,
    "lang": "ru",
    "profile": {"gpa": 3.9, "tests": {"SAT": {"taken": True, "score": 1480},
                                     "EGE": {"taken": True, "score": 290}},
                "major": "Computer Science", "degreeLevel": "bachelor",
                "size": ["Large"], "setting": ["Urban"],
                "continents": ["North America"], "homeCountry": "Russia"},
})
check("гость создан (новый формат профиля)", st == 200 and isinstance(guest.get("id"), int), guest)
uid = guest["id"]
check("guestId вернулся", guest.get("guestId") == "guest-abc-" + RUN)
check("isRegistered=false у гостя", guest.get("isRegistered") is False)
check("массивы профиля сохранились", guest["profile"]["size"] == ["Large"] and guest["profile"]["homeCountry"] == "Russia")
check("EGE сохранился", guest["profile"]["tests"]["EGE"]["score"] == 290)

st, noauth = call("POST", f"/users/{uid}/swipes", {"universityId": 7, "liked": True})
check("гость без X-Guest-Token -> 401", st == 401, noauth)
st, badguest = call("POST", f"/users/{uid}/swipes", {"universityId": 7, "liked": True}, guest="guest-abc-WRONG")
check("гость с чужим X-Guest-Token -> 401", st == 401, badguest)
for uni_id in (1, 3):
    st, _ = call("POST", f"/users/{uid}/swipes", {"universityId": uni_id, "liked": True}, guest="guest-abc-" + RUN)
    check(f"свайп вуза {uni_id} (гость со своим X-Guest-Token)", st == 200)

# ================================================================ 1.5. Исходная цепочка атаки
# Раньше: GET /users/{id} по числовому id отдавал профиль вместе с guestId,
# после чего профиль можно было менять, а email — привязывать через
# /users/{id}/register (захват аккаунта). Теперь без X-Guest-Token — отказ.
st, leak = call("GET", f"/users/{uid}")
check("чужой профиль гостя без секрета -> 401 (guestId не утекает)", st == 401 and "guestId" not in json.dumps(leak), leak)
st, hijack = call("POST", f"/users/{uid}/register", {"email": "hijack@" + RUN + ".example.com"})
check("привязка email к чужому гостю без секрета -> 401", st == 401, hijack)
st, weird = call("GET", f"/users/{uid}", guest="café-ß-token")
check("не-ASCII X-Guest-Token -> 401, не 500", st == 401, weird)

# ================================================================ 2. Регистрация поверх гостя
st, reg = call("POST", "/auth/register", {
    "email": "Test@" + RUN + ".example.com",  # нормализация регистра
    "password": "secret123",
    "lang": "ru",
    "guestId": "guest-abc-" + RUN,
})
check("регистрация 200", st == 200, reg)
check("email нормализован", reg.get("email") == "test@" + RUN + ".example.com", reg.get("email"))
check("тот же user.id (гость «усыновлён»)", reg.get("id") == uid)
check("isRegistered=true", reg.get("isRegistered") is True)
check("токен сессии выдан", bool(reg.get("sessionToken")), str(reg.get("sessionToken"))[:20])
check("пароля в ответе нет", "password" not in json.dumps(reg) and "passwordHash" not in json.dumps(reg))
TOKEN = reg.get("sessionToken")

st, matches = call("GET", f"/users/{uid}/matches", token=TOKEN)
check("matches сохранились после регистрации", st == 200 and len(matches) == 2, matches)
st, me = call("GET", f"/users/{uid}", token=TOKEN)
check("профиль сохранился (GPA 3.9)", st == 200 and me["profile"]["gpa"] == 3.9)

# ================================================================ 3. Контроль доступа
st, noauth = call("GET", f"/users/{uid}")
check("GET /users/{id} без токена -> 401", st == 401, noauth)
st, noauth = call("GET", f"/users/{uid}/matches")
check("GET matches без токена -> 401", st == 401, noauth)
st, noauth = call("POST", f"/users/{uid}/swipes", {"universityId": 5, "liked": True})
check("свайп без токена -> 401", st == 401, noauth)
st, noauth = call("GET", f"/users/{uid}/dna")
check("DNA без токена -> 401", st == 401, noauth)
st, bad = call("GET", f"/users/{uid}", token="not-a-real-token")
check("чужой/битый токен -> 401", st == 401, bad)
# Снимок аккаунта ДО неавторизованного запроса — сравним после, чтобы доказать,
# что фолбэк на новую гостевую сессию ничего в аккаунте не трогает.
st, before = call("GET", f"/users/{uid}", token=TOKEN)
check("снимок аккаунта до фолбэка", st == 200, before)
st, upd = call("POST", "/users", {"guestId": "guest-abc-" + RUN, "lang": "ru", "profile": {"gpa": 2.0}})
# Сценарий «вышел из аккаунта, но localStorage помнит старый guestId»:
# раньше 401 ломал вход на сайт («без регистрации не пускает»). Теперь
# возвращаем НОВУЮ гостевую сессию, а аккаунт не трогаем.
check("POST /users без токена: новый guestId, не аккаунт",
     st == 200 and upd["guestId"] != "guest-abc-" + RUN and upd["isRegistered"] is False, upd)
check("фолбэк создал ОТДЕЛЬНУЮ запись (другой числовой id)",
     st == 200 and upd["id"] != uid and upd["id"] is not None, upd)
# Аккаунт не повреждён: email, isRegistered и профиль прежние ДО любого
# авторизованного апдейта (профиль остаётся GPA 3.9, а не 2.0 из фолбэка).
st, after = call("GET", f"/users/{uid}", token=TOKEN)
check("аккаунт не тронут фолбэком (email/флаг/профиль)",
     st == 200 and after["email"] == before["email"] and after["isRegistered"] is True
     and after["profile"]["gpa"] == 3.9, after)
st, upd2 = call("POST", "/users", {"guestId": "guest-abc-" + RUN, "lang": "ru", "profile": {"gpa": 3.9}}, token=TOKEN)
check("POST /users с токеном -> 200 (апдейт аккаунта)", st == 200 and upd2["id"] == uid and upd2["guestId"] == "guest-abc-" + RUN, upd2)

# ================================================================ 4. Логин
st, login = call("POST", "/auth/login", {"email": "test@" + RUN + ".example.com", "password": "secret123"})
check("логин верный пароль", st == 200 and login.get("id") == uid and bool(login.get("sessionToken")))
TOKEN2 = login.get("sessionToken")
check("новая сессия = новый токен", TOKEN2 and TOKEN2 != TOKEN)
st, login2 = call("POST", "/auth/login", {"email": "TEST@" + RUN + ".example.com", "password": "secret123"})
check("логин email в любом регистре", st == 200 and login2.get("id") == uid and login2["email"] == "test@" + RUN + ".example.com")

st, err = call("POST", "/auth/login", {"email": "test@" + RUN + ".example.com", "password": "wrong999"})
check("неверный пароль -> 401", st == 401, err)
check("401 не раскрывает, есть ли аккаунт", err.get("detail") == "Неверный email или пароль")
st, err = call("POST", "/auth/login", {"email": "nobody@" + RUN + ".example.com", "password": "whatever"})
check("несуществующий email -> 401 той же ошибкой", st == 401 and err["detail"] == "Неверный email или пароль")

# ================================================================ 5. Защита от захвата аккаунта
st, err = call("POST", "/auth/register", {"email": "test@" + RUN + ".example.com", "password": "another1"})
check("дубль email (без guestId) -> 400", st == 400, err)
st, err = call("POST", "/auth/register", {"email": "test@" + RUN + ".example.com", "password": "another1", "guestId": "guest-abc-" + RUN})
check("дубль email даже со своим guestId -> 400", st == 400, err)
st, err = call("POST", "/auth/register", {"email": "other@" + RUN + ".example.com", "password": "hacker1", "guestId": "guest-abc-" + RUN})
check("регистрация нового email поверх сессии с паролем -> 400 (нет перезаписи)", st == 400, err)
st, still = call("POST", "/auth/login", {"email": "test@" + RUN + ".example.com", "password": "secret123"})
check("старый пароль не перезаписан", st == 200 and still.get("id") == uid)

# валидация
st, err = call("POST", "/auth/register", {"email": "not-an-email", "password": "secret123"})
check("кривой email -> 400", st == 400, err)
st, err = call("POST", "/auth/register", {"email": "short@" + RUN + ".example.com", "password": "123"})
check("пароль < 6 символов -> 400", st == 400, err)

# ================================================================ 6. Апгрейд «мягкой» регистрации
st, g2 = call("POST", "/users", {"guestId": "guest-two-" + RUN, "lang": "ru", "profile": {}})
uid2 = g2["id"]
st, soft = call("POST", f"/users/{uid2}/register", {"email": "soft@" + RUN + ".example.com"}, guest="guest-two-" + RUN)
check("мягкая регистрация прошла", st == 200 and soft["isRegistered"] is True, soft)
st, err = call("POST", "/auth/register", {"email": "soft@" + RUN + ".example.com", "password": "upgrade1"})
check("до-регистрация БЕЗ guestId -> 400 (нельзя захватить email)", st == 400, err)
st, err = call("POST", "/auth/register", {"email": "soft@" + RUN + ".example.com", "password": "upgrade1", "guestId": "guest-abc-" + RUN})
check("до-регистрация с ЧУЖИМ guestId -> 400", st == 400, err)
st, up = call("POST", "/auth/register", {"email": "soft@" + RUN + ".example.com", "password": "upgrade1", "guestId": "guest-two-" + RUN})
check("до-регистрация со своим guestId -> 200", st == 200 and up.get("id") == uid2, up)
st, login3 = call("POST", "/auth/login", {"email": "soft@" + RUN + ".example.com", "password": "upgrade1"})
check("логин после апгрейда", st == 200 and login3.get("id") == uid2)

# ================================================================ 7. Регистрация без guestId
st, fresh = call("POST", "/auth/register", {"email": "fresh@" + RUN + ".example.com", "password": "fresh123", "lang": "en"})
check("регистрация без guestId -> новый user", st == 200 and fresh["id"] not in (uid, uid2))
check("lang применился", fresh.get("lang") == "en")

# ================================================================ 8. Выход
st, out = call("POST", "/auth/logout", token=TOKEN2)
check("logout -> 200", st == 200, out)
st, dead = call("GET", f"/users/{uid}", token=TOKEN2)
check("токен после logout мёртв", st == 401, dead)
st, alive = call("GET", f"/users/{uid}", token=TOKEN)
check("первый токен всё ещё жив (отдельные сессии)", st == 200)

# ================================================================ 9. Хеш в БД
from database import engine
from sqlalchemy import text
with engine.connect() as con:
    row = con.execute(text("SELECT password_hash FROM users WHERE id=:id"), {"id": uid}).fetchone()
engine.dispose()
h = row[0] if row else ""
check("пароль хранится как pbkdf2_sha256", h.startswith("pbkdf2_sha256$"), h[:40])
check("plaintext пароля в БД отсутствует", "secret123" not in h)

print()
print(f"ИТОГ: {len(PASS)} ok, {len(FAIL)} fail")
if FAIL:
    print("FAILURES:", *FAIL, sep="\n")
    raise SystemExit(1)
