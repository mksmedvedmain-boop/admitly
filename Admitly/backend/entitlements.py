"""
Единый примитив доступа: "у этого пользователя есть премиум, да/нет".

Каждая серверная платная операция начинается с `if not is_premium(user): raise
HTTPException(402, ...)` — один и тот же код 402 везде, чтобы фронт одним общим
обработчиком показывал paywall-модалку, а не писал проверку в каждом месте
руками. Так проверяются и создание share-ссылки (main.py), и серверные
заготовки платных отчётов. Локальные экспорт-ограничения (PDF/календарь) на
фронте — осознанный компромисс демо-версии: клиентский контроль не защита.

План выставляется вебхуком Stripe (payments.py / main.py): checkout включает
premium, invoice.paid продлевает, отмена/ошибка платежа отключает. Демо-ручка
POST /users/{id}/entitlement (включается переменной ADMITLY_DEMO_PREMIUM=1)
остаётся для локальных тестов.
"""
from datetime import datetime


def is_premium(user) -> bool:
    ent = user.entitlement
    if not ent or ent.plan == "free":
        return False
    if ent.active_until is None:
        return True
    return ent.active_until > datetime.utcnow()
