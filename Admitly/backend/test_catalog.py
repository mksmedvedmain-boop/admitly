"""Интеграционный тест каталога и новых ручек Admitly: колода, один вуз, заголовок
X-Deck-Fallback, контроль доступа, демо-премиум, партнёрские блоки, /go.

Запуск при поднятом uvicorn (ADMITLY_DEMO_PREMIUM=1 для проверки демо-ручки):
    python3 test_catalog.py
"""
import json, os, uuid, urllib.request, urllib.error

BASE = "http://127.0.0.1:" + os.environ.get("PORT", "8000")
RUN = uuid.uuid4().hex[:8]
PASS, FAIL = [], []


def call(method, path, body=None, token=None, guest=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if guest:
        headers["X-Guest-Token"] = guest
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers=headers, method=method)

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw[:1] in b"[{" else raw), r.headers
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw), e.headers
        except Exception:
            return e.code, raw, e.headers


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("OK  " if cond else "FAIL") + f" {name} {extra}")


st, user, _ = call("POST", "/users", {"guestId": "cat-" + RUN})
uid = user["id"]
check("гость создан, isPremium=false", st == 200 and user["isPremium"] is False)

st, deck, h = call("GET", f"/universities?user_id={uid}", guest="cat-" + RUN)
check("колода: 330 вузов", st == 200 and len(deck) == 330, len(deck))
ids = [u["id"] for u in deck]
check("колода: id уникальны, дубля 200 нет", len(set(ids)) == 330 and 200 not in ids)
check("колода: заголовок X-Deck-Fallback=false", h.get("X-Deck-Fallback") == "false")
st, ng, _ = call("GET", f"/universities?user_id={uid}")
check("колода гостя без X-Guest-Token -> 401", st == 401, ng)
check("CORS: X-Deck-Fallback в expose-headers", "x-deck-fallback" in (urllib.request.urlopen(urllib.request.Request(BASE + f"/universities?user_id={uid}", headers={"Origin": "https://x.example", "X-Guest-Token": "cat-" + RUN})).headers.get("Access-Control-Expose-Headers") or "").lower())
check("у каждого вуза есть matchScore и admissionReality",
      all("matchScore" in u and u["admissionReality"] in ("Reach", "Target", "Likely") for u in deck))

# фильтр без совпадений -> фолбэк
st, u2, _ = call("POST", "/users", {"guestId": "cat2-" + RUN, "profile": {"continents": ["af"], "countries": ["Narnia"]}})
st, deck2, h2 = call("GET", f"/universities?user_id={u2['id']}", guest="cat2-" + RUN)
check("пустой фильтр -> фолбэк на весь каталог + заголовок true", st == 200 and len(deck2) == 330 and h2.get("X-Deck-Fallback") == "true")

# один вуз
st, one, _ = call("GET", f"/universities/201?user_id={uid}", guest="cat-" + RUN)
check("GET /universities/201 -> Harvard", st == 200 and one["name"] == "Harvard University", one.get("name") if st == 200 else one)
st, nf, _ = call("GET", f"/universities/9999?user_id={uid}", guest="cat-" + RUN)
check("несуществующий вуз -> 404", st == 404)
st, nf, _ = call("GET", "/universities/201?user_id=999999")
check("несуществующий пользователь -> 404", st == 404)

# авторизация на колоде/why/вузе для зарегистрированного
st, reg, _ = call("POST", "/auth/register", {"email": f"cat-{RUN}@example.com", "password": "secret123", "guestId": "cat3-" + RUN})
tok = reg.get("sessionToken"); rid = reg["id"]
st, _, _ = call("GET", f"/universities?user_id={rid}")
check("колода зарегистрированного без токена -> 401", st == 401)
st, d, _ = call("GET", f"/universities?user_id={rid}", token=tok)
check("колода с токеном -> 200", st == 200 and len(d) == 330)
st, _, _ = call("GET", f"/universities/201/why?user_id={rid}")
check("why без токена -> 401", st == 401)
st, w, _ = call("GET", f"/universities/201/why?user_id={rid}", token=tok)
check("why с токеном -> 200", st == 200)
st, _, _ = call("GET", f"/universities/201?user_id={rid}")
check("вуз без токена -> 401", st == 401)

# демо-премиум
demo_on = os.environ.get("ADMITLY_DEMO_PREMIUM") == "1"
st, out, _ = call("POST", f"/users/{uid}/entitlement", {"plan": "premium"}, guest="cat-" + RUN)
if demo_on:
    check("демо-премиум включается", st == 200 and out["isPremium"] is True)
    st, out, _ = call("GET", f"/users/{uid}", guest="cat-" + RUN)
    check("isPremium сохранился в профиле", out["isPremium"] is True)
    st, out, _ = call("POST", f"/users/{uid}/entitlement", {"plan": "free"}, guest="cat-" + RUN)
    check("демо-премиум выключается", out["isPremium"] is False)
    st, out, _ = call("POST", f"/users/{uid}/entitlement", {"plan": "gold"}, guest="cat-" + RUN)
    check("кривой план -> 400", st == 400)
else:
    check("демо-премиум выключен без флага -> 403", st == 403)
st, _, _ = call("POST", f"/users/{rid}/entitlement", {"plan": "premium"})
check("чужой/без токена -> отказ", st in (401, 403))

# валидация профиля (диапазоны как у слайдеров онбординга)
st, v, _ = call("POST", "/users", {"guestId": "cat-val-" + RUN, "profile": {"budget": -1}})
check("отрицательный budget -> 422 (не даёт максимальный cost_fit)", st == 422)
st, v, _ = call("POST", "/users", {"guestId": "cat-val2-" + RUN, "profile": {"gpa": 9}})
check("GPA вне 2.0-4.0 -> 422", st == 422)
st, v, _ = call("POST", "/users", {"guestId": "cat-val3-" + RUN, "profile": {"research": 0}})
check("research вне 1-5 -> 422", st == 422)
st, v, _ = call("POST", "/users", {"guestId": "cat-val4-" + RUN, "profile": {"budget": 0, "gpa": 4.0}})
check("budget=0 (не важно) и GPA 4.0 -> 200", st == 200)

# партнёры
st, pl, _ = call("GET", f"/placements/admission_reality_low_score?user_id={uid}", guest="cat-" + RUN)
check("placements: пустой список по умолчанию", st == 200 and pl == [])
st, _, _ = call("GET", "/go/nope")
check("/go неизвестный партнёр -> 404 (нет open redirect)", st == 404)

print()
print(f"ИТОГ: {len(PASS)} ok, {len(FAIL)} fail")
if FAIL:
    print("FAILURES:", *FAIL, sep="\n")
    raise SystemExit(1)
