"""
Серверная проверка токенов соцвхода (Google / Яндекс / Telegram).

Раньше связка «аккаунт провайдера → user.id» жила в localStorage браузера
(completeSocialLogin в app.js) — её можно подделать, и это не вход, а
косметика. Теперь фронт присылает токен провайдера, а ЭТОТ модуль проверяет
его у провайдера, и связка хранится в таблице social_accounts БД.

Проверки:
  Google   — id_token (JWT) валидируется эндпоинтом Google
             oauth2.googleapis.com/tokeninfo (Google сам проверяет подпись;
             мы дополнительно сверяем издателя и срок).
  Яндекс   — access_token дергает login.yandex.ru/info (официальный способ
             из документации Яндекс ID).
  Telegram — Login Widget присылает data с полем hash: HMAC-SHA256 от
             data_check_string с секретом = sha256(токен бота). Проверяем
             сами (токен бота в env TELEGRAM_BOT_TOKEN, на фронт не отдаётся).

Зависимости — только stdlib (urllib), чтобы не тянуть SDK ради двух запросов.
"""
import hashlib
import hmac
import json
import os
import urllib.parse
import urllib.request

TIMEOUT = 10  # секунд на запрос к провайдеру


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
    return {
        "provider_user_id": str(sub),
        "email": info.get("email") or None,
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
