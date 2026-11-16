"""
Лёгкие версионированные миграции схемы (SQLite и PostgreSQL).

Раньше схема обслуживалась «на глазок»: create_all() для новых таблиц плюс
разрозненные ALTER TABLE в main.py только для SQLite. Для PostgreSQL
изменения колонок не применялись вовсе, а в комментариях обещался Alembic,
которого в репозитории не было. Это заменяет ту практику честным минимумом:

  - таблица schema_migrations хранит применённые версии;
  - каждый шаг ниже идемпотентен (повторный запуск ничего не ломает) и
    одинаково работает на SQLite и PostgreSQL;
  - шаги применяются по порядку при старте приложения (apply() из main.py),
    до обслуживания запросов.

Полноценный Alembic можно подключить позже поверх этого же списка —
нумерация версий совместима по духу (порядок важен, числа монотонны).
"""
import logging
from datetime import datetime, timedelta

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

log = logging.getLogger("admitly.migrations")

SESSION_TTL_DAYS = 30


def _columns(engine: Engine, table: str) -> list:
    return [c["name"] for c in inspect(engine).get_columns(table)]


def _table_exists(engine: Engine, table: str) -> bool:
    return inspect(engine).has_table(table)


def _add_column(engine: Engine, table: str, name: str, ddl_type: str) -> None:
    """ALTER TABLE ADD COLUMN, если колонки ещё нет. Работает на SQLite и PG."""
    if name in _columns(engine, table):
        return
    with engine.connect() as conn:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type}"))
        conn.commit()
    log.info("migration: added %s.%s", table, name)


def _m1_users_profile_columns(engine: Engine) -> None:
    """Колонки, которые раньше добавлялись вручную только для SQLite."""
    if not _table_exists(engine, "users"):
        return
    _add_column(engine, "users", "password_hash", "VARCHAR")
    _add_column(engine, "users", "home_country", "VARCHAR DEFAULT ''")
    _add_column(engine, "users", "native_lang", "VARCHAR DEFAULT ''")


def _m2_swipes_unique(engine: Engine) -> None:
    """Уникальность пары (user_id, university_id): дедуплицируем историю
    (оставляем самую позднюю запись пары) и создаём уникальный индекс."""
    if not _table_exists(engine, "swipes"):
        return
    with engine.connect() as conn:
        conn.execute(text(
            "DELETE FROM swipes WHERE id NOT IN "
            "(SELECT MAX(id) FROM swipes GROUP BY user_id, university_id)"
        ))
        conn.commit()
    index_name = "uq_swipes_user_university"
    existing = {i["name"] for i in inspect(engine).get_indexes("swipes")}
    if index_name not in existing:
        with engine.connect() as conn:
            conn.execute(text(
                f"CREATE UNIQUE INDEX {index_name} ON swipes (user_id, university_id)"
            ))
            conn.commit()


def _m3_auth_sessions_ttl(engine: Engine) -> None:
    """Срок жизни сессий: expires_at (30 дней от created_at для старых записей)."""
    if not _table_exists(engine, "auth_sessions"):
        return
    _add_column(engine, "auth_sessions", "expires_at", "DATETIME")
    with engine.connect() as conn:
        conn.execute(text(
            "UPDATE auth_sessions SET expires_at = created_at "
            f"+ INTERVAL '{SESSION_TTL_DAYS} days' WHERE expires_at IS NULL"
            if engine.dialect.name != "sqlite" else
            "UPDATE auth_sessions SET expires_at = datetime(created_at, "
            f"'+{SESSION_TTL_DAYS} days') WHERE expires_at IS NULL"
        ))
        conn.commit()


def _m4_entitlements_stripe(engine: Engine) -> None:
    """Связь подписки Stripe с пользователем (жизненный цикл продлений)."""
    if not _table_exists(engine, "entitlements"):
        return
    _add_column(engine, "entitlements", "stripe_customer_id", "VARCHAR")
    _add_column(engine, "entitlements", "stripe_subscription_id", "VARCHAR")


def _m5_universities_scoring_data(engine: Engine) -> None:
    """Данные каталога для серверного скоринга (tuition/living/aid_type/
    strengths/teach_langs). Значения заливает seed_data.seed() при старте —
    здесь только схема."""
    if not _table_exists(engine, "universities"):
        return
    _add_column(engine, "universities", "tuition", "INTEGER")
    _add_column(engine, "universities", "living", "INTEGER")
    _add_column(engine, "universities", "aid_type", "VARCHAR DEFAULT ''")
    _add_column(engine, "universities", "strengths", "JSON")
    _add_column(engine, "universities", "teach_langs", "JSON")


def _m6_users_majors(engine: Engine) -> None:
    """Мультивыбор специальностей (profile.majors на фронте)."""
    if not _table_exists(engine, "users"):
        return
    _add_column(engine, "users", "majors", "JSON")


MIGRATIONS = [
    (1, "users: password_hash/home_country/native_lang", _m1_users_profile_columns),
    (2, "swipes: уникальность пары user+university", _m2_swipes_unique),
    (3, "auth_sessions: срок жизни 30 дней", _m3_auth_sessions_ttl),
    (4, "entitlements: stripe_customer_id/subscription_id", _m4_entitlements_stripe),
    (5, "universities: данные для серверного скоринга", _m5_universities_scoring_data),
    (6, "users: majors (мультивыбор)", _m6_users_majors),
]


def apply(engine: Engine) -> None:
    """Применяет все неприменённые миграции по порядку."""
    inspector = inspect(engine)
    with engine.connect() as conn:
        if not inspector.has_table("schema_migrations"):
            conn.execute(text(
                "CREATE TABLE schema_migrations ("
                "version INTEGER PRIMARY KEY, applied_at DATETIME)"
            ))
            conn.commit()
        applied = {
            row[0] for row in conn.execute(text("SELECT version FROM schema_migrations"))
        }
        for version, label, fn in MIGRATIONS:
            if version in applied:
                continue
            fn(engine)
            conn.execute(text(
                "INSERT INTO schema_migrations (version, applied_at) VALUES "
                "(:v, :now)"
            ), {"v": version, "now": datetime.utcnow()})
            conn.commit()
            log.info("migration %s applied: %s", version, label)
