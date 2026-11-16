"""
Серверная проверка токенов соцвхода (Google / Яндекс / Telegram).

Раньше связка «аккаунт провайдера → user.id» жила в localStorage браузера
(completeSocialLogin в app.js) — её можно подделать, и это не вход, а
косметика. Теперь фронт присылает токен провайдера, а ЭТОТ модуль проверяет
его у провайдера, и связка хранится в таблице social_accounts БД.

Проверки:
  Google   — access_token дергает официальный userinfo.googleapis.com
             (Google сам валидирует токен; email берём только если
             email_verified=true — иначе автопривязки по email не будет).
  Яндекс   — access_token дергает login.yandex.ru/info (официальный способ
             из документации Яндекс ID).
  Telegram — Login Widget присылает data с полем hash: HMAC-SHA256 от
             data_check_string с секретом = sha256(токен бота). Проверяем
             сами (токен бота в env TELEGRAM_BOT_TOKEN, на фронт не отдаётся)
             плюс свежесть auth_date (не старше 24 часов, не «из будущего»).

Зависимости — только stdlib (urllib), чтобы не тянуть SDK ради двух запросов.
"""
import hashlib
import hmac
import json
import os
import time
import urllib.parse
import urllib.request

TIMEOUT = 10  # секунд на запрос к провайдеру

# Свежесть Telegram Login Widget: auth_date не старше 24 часов, будущее —
# не дальше 5 минут (поправка на рассинхрон часов). Без этой проверки
# корректно подписанный payload 1970 года принимался бы бесконечно —
# это replay-вектор (R05 технического ревью от 14.11.2026).
TELEGRAM_AUTH_MAX_AGE = 24 * 60 * 60
TELEGRAM_CLOCK_SKEW = 5 * 60


class SocialVerifyError(Exception):
    """Токен не прошёл проверку. message — безопасен для показа пользователю."""


def _http_get_json(url: str, headers: dict = None) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "Admitly/1.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode("utf-8"))


# ---------------------------------------------------------------- Google
def verify_google(access_token: str) -> dict:
    """access_token (Google Identity Services, scope openid email profile)
    -> {provider_user_id, email}.

    Проверка НА СЕРВЕРЕ: дергаем официальный эндпоинт userinfo.googleapis.com
    с этим токеном — Google сам валидирует его и возвращает стабильный id
    (sub) и email. Фронт доступ к токену после этого не сохраняет: связка
    хранится в social_accounts, а не в localStorage."""
    if not access_token:
        raise SocialVerifyError("Пустой токен Google")
    try:
        info = _http_get_json(
            "https://userinfo.googleapis.com/v2/userinfo",
            headers={"Authorization": "Bearer " + access_token},
        )
    except Exception:
        raise SocialVerifyError("Не удалось проверить токен Google — попробуй ещё раз")
    sub = info.get("sub") or info.get("id")
    if not sub:
        raise SocialVerifyError("Токен Google недействителен")
    # Автопривязка email к существующему аккаунту — только для ПОДТВЕРЖДЁННОГО
    # Google адреса. Неподтверждённый email провайдер может отдавать по
    # разным причинам; считать его доказательством владения аккаунтом
    # нельзя. email_verified приходит как bool или строка "true"/"false".
    email = info.get("email") or None
    verified = info.get("email_verified")
    if email and not (verified is True or (isinstance(verified, str) and verified.lower() == "true")):
        email = None
    return {
        "provider_user_id": str(sub),
        "email": email,
    }


# ---------------------------------------------------------------- Яндекс
def verify_yandex(access_token: str) -> dict:
    """access_token (Яндекс ID) -> {provider_user_id, email}.

    Официальный способ: GET login.yandex.ru/info с заголовком
    Authorization: OAuth <token>. Отдаёт id пользователя и default_email."""
    if not access_token:
        raise SocialVerifyError("Пустой токен Яндекса")
    try:
        info = _http_get_json(
            "https://login.yandex.ru/info?format=json",
            headers={"Authorization": "OAuth " + access_token},
        )
    except Exception:
        raise SocialVerifyError("Не удалось проверить токен Яндекса — попробуй ещё раз")
    if not info.get("id"):
        raise SocialVerifyError("Токен Яндекса недействителен")
    return {
        "provider_user_id": str(info["id"]),
        "email": info.get("default_email") or None,
    }


# ---------------------------------------------------------------- Telegram
def verify_telegram(data: dict, bot_token: str) -> dict:
    """Payload Telegram Login Widget -> {provider_user_id, email=None}.

    Виджет присылает поля (id, first_name, auth_date, hash, ...). Подлинность
    доказывается hash = HMAC-SHA256(data_check_string, sha256(bot_token)).
    Без токена бота проверка невозможна — SocialVerifyError."""
    if not bot_token:
        raise SocialVerifyError("Вход через Telegram не настроен на сервере")
    if not isinstance(data, dict) or not data.get("id") or not data.get("hash"):
        raise SocialVerifyError("Неполный ответ Telegram Login Widget")
    received_hash = str(data["hash"])
    # data_check_string: все поля КРОМЕ hash, отсортированные по алфавиту,
    # «ключ=значение», разделённые переносом строки — как в документации.
    dcs = "\n".join(
        f"{k}={v}" for k, v in sorted(data.items())
        if k != "hash" and isinstance(v, (str, int, float))
    )
    secret_key = hashlib.sha256(bot_token.encode("utf-8")).digest()
    expected = hmac.new(secret_key, dcs.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(received_hash, expected):
        raise SocialVerifyError("Подпись Telegram не совпала — данные подделаны или повреждены")

    # Свежесть payload: подпись защищает от подделки, но НЕ от повтора —
    # старый валидный payload можно слать бесконечно. auth_date (unix-время
    # авторизации) не должен быть старше 24 часов и «из будущего» дальше
    # TELEGRAM_CLOCK_SKEW секунд.
    try:
        auth_date = int(data["auth_date"])
    except (KeyError, TypeError, ValueError):
        raise SocialVerifyError("В ответе Telegram нет времени авторизации (auth_date)")
    now = int(time.time())
    if now - auth_date > TELEGRAM_AUTH_MAX_AGE:
        raise SocialVerifyError("Данные входа Telegram устарели — войди заново")
    if auth_date - now > TELEGRAM_CLOCK_SKEW:
        raise SocialVerifyError("Время авторизации Telegram в будущем — проверь часы устройства")

    return {
        "provider_user_id": str(data["id"]),
        "email": None,  # Telegram email не даёт
    }


# ---------------------------------------------------------------- диспетчер
def verify(provider: str, payload) -> dict:
    """provider + payload запроса -> {provider_user_id, email}.

    Проверяет токен у соответствующего провайдера. Все ошибки —
    SocialVerifyError с сообщением, которое можно показать пользователю."""
    if provider == "google":
        return verify_google(payload.get("token") or "")
    if provider == "yandex":
        return verify_yandex(payload.get("token") or "")
    if provider == "telegram":
        return verify_telegram(payload.get("telegram_data") or {}, os.environ.get("TELEGRAM_BOT_TOKEN", ""))
    raise SocialVerifyError("Неизвестный провайдер входа")
