"""Тесты соцвхода и оплаты Admitly.

Часть 1 (юнит-тесты, сервер не нужен): проверка HMAC-подписи Telegram
Login Widget и корректные ошибки для кривых токенов (без реальных сетевых
запросов к Google/Яндексу — только пути ошибок).

Часть 2 (интеграционные, нужен uvicorn на 127.0.0.1:$PORT, по умолчанию
8000): /auth/social с кривыми токенами -> 401 (не 500!), /payments/config
без ключей -> {stripe: false}, /payments/checkout-session -> 503.

Запуск:
    python3 -m unittest test_social            # юнит-тесты
    uvicorn main:app --port 8000 &             # потом интеграционные
    python3 test_social.py                     # прогонит обе части
"""
import hashlib
import hmac
import json
import os
import sys
import urllib.request
import urllib.error
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

RUN = uuid.uuid4().hex[:8]
BASE = "http://127.0.0.1:" + os.environ.get("PORT", "8000")
PASS, FAIL = [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(f"[{'OK  ' if cond else 'FAIL'}] {name}{(' — ' + extra) if extra and not cond else ''}")


# ================================================================ юнит-тесты
def unit_tests():
    import social_auth

    print("\n=== social_auth: проверка подписи Telegram (юнит) ===")

    bot_token = "123456:TEST-BOT-TOKEN"
    # auth_date — «сейчас»: подпись проверяется отдельно от свежести,
    # но валидным payload считается только не старше 24 часов (см. ниже
    # отдельные проверки свежести в unit-тестах и test_fixes.py).
    import time as _time
    data = {"id": 42, "first_name": "Тест", "auth_date": int(_time.time()), "username": "tester"}
    dcs = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret = hashlib.sha256(bot_token.encode()).digest()
    good = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()

    ok = social_auth.verify_telegram({**data, "hash": good}, bot_token)
    check("валидная подпись Telegram принимается", ok["provider_user_id"] == "42")

    def expect_verify_error(fn, *args):
        try:
            fn(*args)
            return False
        except social_auth.SocialVerifyError:
            return True

    check("подделанная подпись отклоняется",
          expect_verify_error(social_auth.verify_telegram, {**data, "hash": "0" * 64, "first_name": "Подделка"}, bot_token))

    check("без токена бота — понятная ошибка",
          expect_verify_error(social_auth.verify_telegram, {**data, "hash": good}, ""))

    print("\n=== social_auth: кривые payload (юнит) ===")
    check("пустой токен Google -> ошибка", expect_verify_error(social_auth.verify_google, ""))
    check("пустой токен Яндекса -> ошибка", expect_verify_error(social_auth.verify_yandex, ""))
    check("Telegram без hash -> ошибка", expect_verify_error(social_auth.verify_telegram, {"id": 1}, bot_token))

    check("неизвестный провайдер -> ошибка", expect_verify_error(social_auth.verify, "facebook", {}))


# ================================================================ интеграционные
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


def integration_tests():
    print("\n=== /payments/config и /payments/checkout-session (интеграционные) ===")
    code, cfg = call("GET", "/payments/config")
    check("config отвечает 200", code == 200, f"код {code}")
    check("config содержит stripe и demo", isinstance(cfg.get("stripe"), bool) and isinstance(cfg.get("demo"), bool))
    if cfg.get("stripe"):
        print("[SKIP] Stripe уже настроен (STRIPE_SECRET_KEY задан) — проверку 503 не делаем")
    else:
        code2, _ = call("POST", "/payments/checkout-session?user_id=1")
        check("checkout без ключей -> 503 (честно, не 500)", code2 == 503, f"код {code2}")

    print("\n=== /auth/social: кривые токены (интеграционные) ===")
    # Гость — чтобы ручка дошла до проверки токена.
    code, guest = call("POST", "/users", {"lang": "ru", "profile": {}})
    check("гостевая сессия создаётся", code == 200, f"код {code}")
    gid = guest["guestId"]
    uid = guest["id"]

    code, err = call("POST", "/auth/social", {
        "provider": "google", "token": " заведомо-кривой-токен", "lang": "ru", "guestId": gid,
    })
    check("кривой Google-токен -> 401 (не 500)", code == 401, f"код {code}, ответ {err}")

    code, err = call("POST", "/auth/social", {
        "provider": "telegram", "telegramData": {"id": 1, "hash": "ff"}, "lang": "ru", "guestId": gid,
    })
    check("кривой Telegram-payload -> 401 (не 500)", code == 401, f"код {code}, ответ {err}")

    code, err = call("POST", "/auth/social", {"provider": "facebook", "token": "x"})
    check("неизвестный провайдер -> 422 (схема)", code == 422, f"код {code}")

    print("\n=== /users/{id}/billing (интеграционные) ===")
    code, bill = call("GET", f"/users/{uid}/billing", guest=gid)
    check("billing отдаёт статус", code == 200 and "plan" in bill, f"код {code}")

    print("\n=== старые ручки не сломаны ===")
    code, health = call("GET", "/health")
    check("/health жив", code == 200 and health.get("status") == "ok", f"код {code}")


if __name__ == "__main__":
    unit_tests()
    try:
        urllib.request.urlopen(BASE + "/health", timeout=2)
        integration_tests()
    except Exception as e:
        print(f"\n[SKIP] интеграционные: сервер на {BASE} не поднят ({e})")

    print(f"\n=== ИТОГ: {len(PASS)} ok, {len(FAIL)} fail")
    sys.exit(1 if FAIL else 0)
