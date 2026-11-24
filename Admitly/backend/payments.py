"""
Оплата Admitly Premium через Stripe Checkout.

Дизайн модуля:
  - «Честное поведение без ключей»: если STRIPE_SECRET_KEY не задан (или
    библиотека stripe не установлена), /payments/config честно говорит
    {stripe: false}, а /payments/checkout-session отвечает 503 с понятным
    сообщением — никаких фейковых кнопок «Купить», которые ничего не делают.
  - Ключи передаются через env (Render → Environment), в коде их нет:
      STRIPE_SECRET_KEY   — sk_test_... / sk_live_...
      STRIPE_PRICE_ID     — price_... (продукт «Admitly Premium» в панели Stripe)
      STRIPE_WEBHOOK_SECRET — whsec_... (подпись вебхуков)
      FRONTEND_URL         — https://домен-фронта (success/cancel страницы)
  - Библиотека stripe импортируется ЛЕНИВО: без ключей приложение работает,
    и requirements можно ставить без stripe (но он добавлен в requirements.txt).

Поток:
  1. POST /payments/checkout-session (требует входа) -> {url} — Stripe-hosted
     страница оплаты. Фронт делает location.href = url. user_id кладётся и в
     client_reference_id сессии, и в subscription_data.metadata — тогда
     события ПРОДЛЕНИЯ (invoice.paid) находят пользователя по самой подписке,
     даже если в событии нет метаданных чекаута.
  2. Stripe присылает вебхук POST /payments/webhook:
       checkout.session.completed       -> Entitlement.plan = premium,
                                           active_until = конец периода,
                                           сохраняются customer/subscription id
       invoice.paid / payment_succeeded -> продление: active_until из периода
       customer.subscription.updated    -> синхронизация срока/статуса
       customer.subscription.deleted    -> plan = free (подписка отменена)
       invoice.payment_failed           -> plan = free (оплата не прошла)
  3. Отмена подписки в любой момент: у пользователя план возвращается в free.
"""
import os
from datetime import datetime

PROVIDER = "stripe"


def configured() -> bool:
    """Do not offer checkout unless the app can also handle the webhook."""
    required = ("STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "STRIPE_WEBHOOK_SECRET", "FRONTEND_URL")
    if not all(os.environ.get(name, "").strip() for name in required):
        return False
    try:
        import stripe  # noqa: F401
        return True
    except ImportError:
        return False


def _stripe():
    """Импорт библиотеки по требованию + ключ из env. RuntimeError, если нет."""
    try:
        import stripe
    except ImportError:
        raise RuntimeError("Библиотека stripe не установлена: pip install stripe")
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    return stripe


def create_checkout_session(user_id: int, email: str = None) -> dict:
    """Создаёт Stripe Checkout Session для годовой/месячной цены из
    STRIPE_PRICE_ID. Возвращает {url, session_id}. RuntimeError — если
    что-то не настроено (вызывающий роут превратит её в 5xx/503)."""
    if not configured():
        raise RuntimeError("Оплата не настроена: задай STRIPE_SECRET_KEY")
    price_id = os.environ.get("STRIPE_PRICE_ID")
    if not price_id:
        raise RuntimeError("Оплата не настроена: задай STRIPE_PRICE_ID")
    frontend = os.environ["FRONTEND_URL"].rstrip("/")
    stripe = _stripe()
    params = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{frontend}/?payment=success",
        "cancel_url": f"{frontend}/?payment=cancel",
        # client_reference_id связывает сессию с пользователем Admitly: вебхук
        # по нему находит user и включает премиум. metadata дублирует то же.
        # subscription_data.metadata нужен ДЛЯ ПОДПИСКИ: события продления
        # (invoice.paid, customer.subscription.*) приходят без метаданных
        # чекаута — без этого поля вебхук не нашёл бы пользователя.
        "client_reference_id": str(user_id),
        "metadata": {"user_id": str(user_id)},
        "subscription_data": {"metadata": {"user_id": str(user_id)}},
    }
    if email:
        params["customer_email"] = email
    session = stripe.checkout.Session.create(**params)
    return {"url": session.url, "session_id": session.id}


def period_end_from_event(event: dict) -> datetime | None:
    """Конец оплаченного периода из события Stripe — для active_until.

    Возвращает None, если событие не несёт данных о периоде: вызывающий
    (main.py) обязан тогда ответить 5xx, чтобы Stripe доставил событие
    повторно. Раньше здесь был фолбэк «+30 дней от сейчас» — при повторной
    доставке события он СДВИГАЛ дату окончания подписки вперёд."""
    obj = event.get("data", {}).get("object", {})
    # checkout.session.completed с subscription: подтягиваем подписку отдельно
    # вызовом API (вебхук отдаёт только id) — делаем это в main.py, здесь
    # только разбор того, что уже есть в объекте.
    for key in ("current_period_end", "period_end"):
        if obj.get(key):
            return datetime.utcfromtimestamp(int(obj[key]))
    return None
