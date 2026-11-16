"""
Сквозные тесты исправлений по итогам технического ревью (14.11.2026):
R01 соцвход, R02 жизненный цикл Stripe, R05 свежесть Telegram, R09 серверный
Premium для share-ссылок, R11 срок жизни сессий, R12 rate limit логина,
R13 verified email Google, R14 upsert свайпов, R15 мультивыбор специальностей.

Запуск (сервер НЕ нужен — FastAPI TestClient + моки провайдеров):
    python3 -m unittest test_fixes -v
"""
import hashlib
import hmac
import json
import os
import sys
import time
import types
import unittest
import uuid
from datetime import datetime, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_fixes.db")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import social_auth  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


def _fake_stripe_module():
    """Минимальный фейковый stripe: Webhook.construct_event + Subscription."""
    mod = types.ModuleType("stripe")

    class Webhook:
        @staticmethod
        def construct_event(body, sig, secret):
            if sig != "good-sig":
                raise ValueError("bad signature")
            return json.loads(body)

    class Subscription:
        @staticmethod
        def retrieve(sub_id):
            return {
                "id": sub_id,
                "current_period_end": int(time.time()) + 31 * 86400,
                "customer": "cus_test_123",
                "metadata": {"user_id": "1"},
            }

    mod.Webhook = Webhook
    mod.Subscription = Subscription
    return mod


class FixesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"
        os.environ["STRIPE_PRICE_ID"] = "price_fake"
        sys.modules["stripe"] = _fake_stripe_module()
        import main  # импорт после мока stripe
        cls.main = main
        cls.client = TestClient(main.app)
        cls.run_id = uuid.uuid4().hex[:8]

    def _guest(self):
        r = self.client.post("/users", json={
            "guestId": "guest-" + self.run_id + "-" + uuid.uuid4().hex[:6],
            "lang": "ru",
            "profile": {"gpa": 3.8, "major": "Computer Science", "majors": ["Computer Science", "Data Science"]},
        })
        assert r.status_code == 200, r.text
        return r.json()

    def _auth_headers(self, token):
        return {"Authorization": "Bearer " + token}

    # ------------------------------------------------------------ R01: соцвход
    def test_social_login_new_user_with_email(self):
        """Google-вход нового пользователя: isRegistered=true, профиль
        читается по Bearer без X-Guest-Token (главный баг ревью R01)."""
        email = "google-" + self.run_id + "@example.com"
        orig = social_auth.verify
        social_auth.verify = lambda provider, payload: {
            "provider_user_id": "g-" + self.run_id, "email": email,
        }
        try:
            r = self.client.post("/auth/social", json={
                "provider": "google", "token": "x", "lang": "ru",
            })
            self.assertEqual(r.status_code, 200, r.text)
            user = r.json()
            self.assertTrue(user["sessionToken"])
            self.assertTrue(user["isRegistered"])  # email подтверждён провайдером
            # Профиль по Bearer — БЕЗ гостевого заголовка
            r2 = self.client.get(f"/users/{user['id']}",
                                 headers=self._auth_headers(user["sessionToken"]))
            self.assertEqual(r2.status_code, 200, r2.text)
        finally:
            social_auth.verify = orig

    def test_social_login_telegram_guest_with_session(self):
        """Telegram не даёт email: пользователь остаётся гостем, но серверная
        сессия работает — Bearer достаточен, X-Guest-Token не нужен."""
        orig = social_auth.verify
        social_auth.verify = lambda provider, payload: {
            "provider_user_id": "tg-" + self.run_id, "email": None,
        }
        try:
            r = self.client.post("/auth/social", json={
                "provider": "telegram", "telegramData": {"id": 1}, "lang": "ru",
            })
            self.assertEqual(r.status_code, 200, r.text)
            user = r.json()
            self.assertFalse(user["isRegistered"])
            r2 = self.client.get(f"/users/{user['id']}",
                                 headers=self._auth_headers(user["sessionToken"]))
            self.assertEqual(r2.status_code, 200, r2.text)
        finally:
            social_auth.verify = orig

    def test_social_login_unverified_google_email(self):
        """R13: неподтверждённый email Google не привязывается — аккаунт
        остаётся гостем (нет автосвязывания с чужим аккаунтом по email)."""
        orig = social_auth.verify
        seen = {}

        def fake_verify(provider, payload):
            seen["provider"] = provider
            return {"provider_user_id": "gu-" + self.run_id, "email": None}

        social_auth.verify = fake_verify
        try:
            r = self.client.post("/auth/social", json={
                "provider": "google", "token": "x", "lang": "ru",
            })
            self.assertEqual(r.status_code, 200, r.text)
            self.assertFalse(r.json()["isRegistered"])
        finally:
            social_auth.verify = orig

    # ------------------------------------------------------------ R05: Telegram
    def _tg_payload(self, auth_date, bot_token="123:test"):
        data = {"id": 42, "auth_date": auth_date, "username": "tester"}
        dcs = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
        secret = hashlib.sha256(bot_token.encode()).digest()
        data["hash"] = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()
        return data, bot_token

    def test_telegram_fresh_payload_accepted(self):
        data, token = self._tg_payload(int(time.time()))
        result = social_auth.verify_telegram(data, token)
        self.assertEqual(result["provider_user_id"], "42")

    def test_telegram_old_payload_rejected(self):
        """Подписанный payload 1970 года больше не принимается (replay)."""
        data, token = self._tg_payload(1)
        with self.assertRaises(social_auth.SocialVerifyError):
            social_auth.verify_telegram(data, token)

    def test_telegram_future_payload_rejected(self):
        data, token = self._tg_payload(int(time.time()) + 3600)
        with self.assertRaises(social_auth.SocialVerifyError):
            social_auth.verify_telegram(data, token)

    # ------------------------------------------------------------ R14: свайпы
    def test_swipe_upsert_like_then_dislike(self):
        guest = self._guest()
        gid = guest["guestId"]
        uid = guest["id"]
        h = {"X-Guest-Token": gid}
        r = self.client.post(f"/users/{uid}/swipes", headers=h,
                             json={"universityId": 1, "liked": True})
        self.assertEqual(r.status_code, 200, r.text)
        # Повторный свайп того же вуза — обновление, не новая запись
        r = self.client.post(f"/users/{uid}/swipes", headers=h,
                             json={"universityId": 1, "liked": False})
        self.assertEqual(r.status_code, 200, r.text)
        matches = self.client.get(f"/users/{uid}/matches", headers=h).json()
        self.assertEqual(matches, [], "like -> dislike должен убрать вуз из Matches")
        from database import SessionLocal
        from models import Swipe
        db = SessionLocal()
        count = db.query(Swipe).filter_by(user_id=uid, university_id=1).count()
        db.close()
        self.assertEqual(count, 1, "пара (user, university) должна быть одна")

    # ------------------------------------------------------------ R15: majors
    def test_majors_multiselect_persisted(self):
        guest = self._guest()
        gid, uid = guest["guestId"], guest["id"]
        r = self.client.get(f"/users/{uid}", headers={"X-Guest-Token": gid})
        profile = r.json()["profile"]
        self.assertEqual(profile["major"], "Computer Science")
        self.assertIn("Data Science", profile["majors"])

    # ------------------------------------------------------------ R09: share
    def test_share_link_requires_premium(self):
        guest = self._guest()
        uid, gid = guest["id"], guest["guestId"]
        h = {"X-Guest-Token": gid}
        r = self.client.post(f"/users/{uid}/share", headers=h)
        self.assertEqual(r.status_code, 402, "создание ссылки без Premium — 402 paywall")

        os.environ["ADMITLY_DEMO_PREMIUM"] = "1"
        try:
            r = self.client.post(f"/users/{uid}/entitlement", headers=h,
                                 json={"plan": "premium"})
            self.assertEqual(r.status_code, 200, r.text)
            r = self.client.post(f"/users/{uid}/share", headers=h)
            self.assertEqual(r.status_code, 200, r.text)
            token = r.json()["token"]
            # Публичное чтение работает без входа
            r = self.client.get(f"/share/{token}")
            self.assertEqual(r.status_code, 200, r.text)
        finally:
            del os.environ["ADMITLY_DEMO_PREMIUM"]

    # ------------------------------------------------------------ R11: сессии
    def test_session_expiry_and_revoke_all(self):
        email = "expire-" + self.run_id + "@example.com"
        r = self.client.post("/auth/register", json={
            "email": email, "password": "secret123", "lang": "ru",
        })
        user = r.json()
        token = user["sessionToken"]
        h = self._auth_headers(token)
        self.assertEqual(self.client.get(f"/users/{user['id']}", headers=h).status_code, 200)

        # Протухшая сессия отклоняется
        from database import SessionLocal
        from models import AuthSession
        db = SessionLocal()
        sess = db.query(AuthSession).filter_by(token=token).first()
        sess.expires_at = datetime.utcnow() - timedelta(seconds=1)
        db.commit()
        db.close()
        self.assertEqual(self.client.get(f"/users/{user['id']}", headers=h).status_code, 401)

        # Новая сессия + отзыв всех
        r = self.client.post("/auth/login", json={"email": email, "password": "secret123"})
        token2 = r.json()["sessionToken"]
        h2 = self._auth_headers(token2)
        r = self.client.delete(f"/users/{user['id']}/sessions", headers=h2)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.client.get(f"/users/{user['id']}", headers=h2).status_code, 401)

    # ------------------------------------------------------------ R12: rate limit
    def test_login_rate_limit(self):
        email = "brute-" + self.run_id + "@example.com"
        codes = []
        for _ in range(12):
            r = self.client.post("/auth/login", json={"email": email, "password": "wrong"})
            codes.append(r.status_code)
        self.assertIn(429, codes, "перебор паролей должен упереться в 429")
        self.assertEqual(codes[-1], 429)

    # ------------------------------------------------------------ R02: Stripe
    def _webhook(self, event):
        return self.client.post("/payments/webhook", data=json.dumps(event),
                                headers={"Content-Type": "application/json",
                                         "stripe-signature": "good-sig"})

    def test_stripe_full_lifecycle(self):
        guest = self._guest()
        uid, gid = guest["id"], guest["guestId"]
        sub_id = "sub_" + self.run_id

        # 1) checkout.session.completed — premium + сохранённая подписка
        ev1 = {"id": "evt_1_" + self.run_id, "type": "checkout.session.completed",
               "data": {"object": {"client_reference_id": str(uid),
                                   "subscription": sub_id, "customer": "cus_x"}}}
        r = self._webhook(ev1)
        self.assertEqual(r.status_code, 200, r.text)
        billing = self.client.get(f"/users/{uid}/billing",
                                  headers={"X-Guest-Token": gid}).json()
        self.assertTrue(billing["is_premium"])
        self.assertIsNotNone(billing["active_until"])

        # 2) повтор того же события — идемпотентно, дата не двигается
        first_until = billing["active_until"]
        r = self._webhook(ev1)
        self.assertEqual(r.status_code, 200, r.text)
        billing = self.client.get(f"/users/{uid}/billing",
                                  headers={"X-Guest-Token": gid}).json()
        self.assertEqual(billing["active_until"], first_until,
                         "повторный вебхук не должен сдвигать active_until")

        # 3) invoice.paid (продление) — находим пользователя ПОДПИСКОЙ,
        #    без user_id в событии
        new_end = int(time.time()) + 62 * 86400
        ev2 = {"id": "evt_2_" + self.run_id, "type": "invoice.paid",
               "data": {"object": {"subscription": sub_id,
                                   "lines": {"data": [{"period": {"end": new_end}}]}}}}
        r = self._webhook(ev2)
        self.assertEqual(r.status_code, 200, r.text)
        billing = self.client.get(f"/users/{uid}/billing",
                                  headers={"X-Guest-Token": gid}).json()
        self.assertTrue(billing["is_premium"], "продление должно сохранять premium")

        # 4) customer.subscription.deleted — план free
        ev3 = {"id": "evt_3_" + self.run_id, "type": "customer.subscription.deleted",
               "data": {"object": {"id": sub_id, "status": "canceled"}}}
        r = self._webhook(ev3)
        self.assertEqual(r.status_code, 200, r.text)
        billing = self.client.get(f"/users/{uid}/billing",
                                  headers={"X-Guest-Token": gid}).json()
        self.assertFalse(billing["is_premium"], "отмена подписки должна отключать premium")

    def test_stripe_checkout_without_period_is_retriable(self):
        """Если Stripe не отдал период — 502, чтобы событие доставилось
        повторно (а не «30 дней от сейчас» молча)."""
        guest = self._guest()
        ev = {"id": "evt_np_" + self.run_id, "type": "checkout.session.completed",
              "data": {"object": {"client_reference_id": str(guest["id"]),
                                  "subscription": None}}}
        r = self._webhook(ev)
        self.assertEqual(r.status_code, 502)


if __name__ == "__main__":
    unittest.main(verbosity=2)
