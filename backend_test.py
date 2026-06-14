"""
BIBI Cars Email/OTP Testing Suite
==================================
Tests team-lead email-OTP, customer email verification, and customer 2FA methods.
"""
import requests
import sys
import time
from datetime import datetime
from pymongo import MongoClient

# Configuration
BASE_URL = "https://bibi-car-final.preview.emergentagent.com"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

# Test credentials
ADMIN_EMAIL = "admin@bibi.cars"
ADMIN_PASSWORD = "BibiAdmin#2026Secure"
TEAMLEAD_EMAIL = "teamlead@bibi.cars"
TEAMLEAD_PASSWORD = "BibiTeamLead#2026Secure"

class EmailOtpTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.mongo_client = MongoClient(MONGO_URL)
        self.db = self.mongo_client[DB_NAME]
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.teamlead_challenge = None

    def run_test(self, name, func):
        """Run a single test"""
        self.tests_run += 1
        print(f"\n{'='*60}")
        print(f"🔍 Test {self.tests_run}: {name}")
        print(f"{'='*60}")
        try:
            func()
            self.tests_passed += 1
            print(f"✅ PASSED: {name}")
            return True
        except AssertionError as e:
            print(f"❌ FAILED: {name}")
            print(f"   Error: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ ERROR: {name}")
            print(f"   Exception: {str(e)}")
            return False

    def test_admin_login(self):
        """Test admin login to get token"""
        print("→ Logging in as admin...")
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.status_code}"
        data = response.json()
        assert "access_token" in data, "No access token in response"
        self.admin_token = data["access_token"]
        print(f"   ✓ Admin logged in, token: {self.admin_token[:20]}...")

    def test_teamlead_login_challenge(self):
        """Test team-lead login returns email-OTP challenge"""
        print("→ Attempting team-lead login...")
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"email": TEAMLEAD_EMAIL, "password": TEAMLEAD_PASSWORD}
        )
        assert response.status_code == 200, f"Team-lead login failed: {response.status_code}"
        data = response.json()
        print(f"   Response: {data}")
        
        # Should return challenge, not direct token
        assert "__challenge" in data or "challenge" in data, "Expected challenge response"
        challenge_data = data.get("__challenge") or data
        assert challenge_data.get("challenge") == "email_otp", f"Expected email_otp challenge, got {challenge_data.get('challenge')}"
        assert "challenge_token" in challenge_data, "No challenge_token in response"
        
        self.teamlead_challenge = challenge_data
        print(f"   ✓ Challenge received: {challenge_data.get('challenge')}")
        print(f"   ✓ Challenge token: {challenge_data.get('challenge_token')[:20]}...")

    def test_otp_in_mongo(self):
        """Test OTP code exists in MongoDB"""
        print("→ Checking MongoDB for OTP code...")
        time.sleep(1)  # Give backend time to write
        
        # Check auth_email_otp collection
        otp_doc = self.db.auth_email_otp.find_one(
            {"user_email": TEAMLEAD_EMAIL, "status": "pending"},
            sort=[("created_at", -1)]
        )
        assert otp_doc is not None, "No OTP document found in MongoDB"
        assert "code" in otp_doc, "No code field in OTP document"
        assert len(otp_doc["code"]) == 6, f"Code should be 6 digits, got {len(otp_doc['code'])}"
        
        print(f"   ✓ OTP found in MongoDB: {otp_doc['code']}")
        print(f"   ✓ Challenge token: {otp_doc.get('challenge_token', '')[:20]}...")
        print(f"   ✓ Recipient: {otp_doc.get('recipient_email')}")
        return otp_doc["code"]

    def test_otp_email_dispatch(self):
        """Test email_outbox record exists"""
        print("→ Checking email_outbox for dispatch record...")
        time.sleep(1)
        
        email_doc = self.db.email_outbox.find_one(
            {"event": "staff_login_otp"},
            sort=[("created_at", -1)]
        )
        assert email_doc is not None, "No email_outbox record found"
        assert email_doc.get("status") in ("sent", "queued", "failed"), f"Unexpected status: {email_doc.get('status')}"
        
        print(f"   ✓ Email record found")
        print(f"   ✓ Status: {email_doc.get('status')}")
        print(f"   ✓ To: {email_doc.get('to')}")
        print(f"   ✓ Provider: {email_doc.get('provider')}")

    def test_admin_pending_otps(self):
        """Test admin can view pending OTPs"""
        print("→ Fetching pending OTPs via admin API...")
        assert self.admin_token, "Admin token not set"
        
        response = requests.get(
            f"{self.base_url}/api/admin/security/pending-otps",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Failed to fetch pending OTPs: {response.status_code}"
        data = response.json()
        assert "data" in data, "No data field in response"
        assert len(data["data"]) > 0, "No pending OTPs found"
        
        latest = data["data"][0]
        print(f"   ✓ Found {len(data['data'])} pending OTP(s)")
        print(f"   ✓ Latest code: {latest.get('code')}")
        print(f"   ✓ User: {latest.get('user_email')}")

    def test_otp_verify(self):
        """Test OTP verification completes login"""
        print("→ Verifying OTP code...")
        assert self.teamlead_challenge, "No challenge token available"
        
        # Get code from MongoDB
        otp_doc = self.db.auth_email_otp.find_one(
            {"challenge_token": self.teamlead_challenge["challenge_token"]},
            sort=[("created_at", -1)]
        )
        assert otp_doc, "OTP document not found"
        code = otp_doc["code"]
        
        response = requests.post(
            f"{self.base_url}/api/auth/email-otp/verify",
            json={
                "challenge_token": self.teamlead_challenge["challenge_token"],
                "code": code
            }
        )
        assert response.status_code == 200, f"OTP verification failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "access_token" in data, "No access token after verification"
        
        print(f"   ✓ OTP verified successfully")
        print(f"   ✓ Access token received: {data['access_token'][:20]}...")

    def test_admin_otp_config(self):
        """Test admin can view/update OTP recipient config"""
        print("→ Testing OTP recipient config...")
        assert self.admin_token, "Admin token not set"
        
        # GET current config
        response = requests.get(
            f"{self.base_url}/api/admin/security/team-lead-otp-config",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get config: {response.status_code}"
        data = response.json()
        print(f"   ✓ Current recipient: {data.get('recipient_email')}")
        
        # PUT update (set to same value to avoid changing production config)
        current_recipient = data.get("recipient_email") or "nname.dao@gmail.com"
        response = requests.put(
            f"{self.base_url}/api/admin/security/team-lead-otp-config",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"recipient_email": current_recipient}
        )
        assert response.status_code == 200, f"Failed to update config: {response.status_code}"
        print(f"   ✓ Config update successful")

    def test_customer_registration_verification(self):
        """Test customer email verification flow"""
        print("→ Testing customer registration + email verification...")
        
        # Generate unique email
        test_email = f"test_{int(time.time())}@example.com"
        test_name = "Test User"
        test_password = "TestPass123!"
        
        # Step 1: Register
        print(f"   → Registering customer: {test_email}")
        response = requests.post(
            f"{self.base_url}/api/customer-auth/register",
            json={
                "email": test_email,
                "password": test_password,
                "name": test_name,
                "customerId": ""
            }
        )
        assert response.status_code == 200, f"Registration failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("requiresVerification") == True, "Expected requiresVerification=true"
        print(f"   ✓ Registration successful, verification required")
        
        # Step 2: Get code from email_outbox (code is hashed in customer_email_verifications)
        time.sleep(1)
        print(f"   → Fetching verification code from email_outbox...")
        import re
        email_doc = self.db.email_outbox.find_one(
            {"event": "customer_email_verify", "to": test_email},
            sort=[("created_at", -1)]
        )
        assert email_doc is not None, "No email_outbox record found"
        
        # Extract 6-digit code from email text/html
        text = email_doc.get("text", "")
        html = email_doc.get("html", "")
        code_match = re.search(r'\b(\d{6})\b', text + html)
        assert code_match, "No 6-digit code found in email"
        code = code_match.group(1)
        print(f"   ✓ Verification code: {code}")
        
        # Step 3: Verify email
        print(f"   → Verifying email with code...")
        response = requests.post(
            f"{self.base_url}/api/customer-auth/verify-email",
            json={"email": test_email, "code": code}
        )
        assert response.status_code == 200, f"Verification failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "accessToken" in data or "sessionToken" in data, "No token in verification response"
        print(f"   ✓ Email verified, account active")

    def test_resend_health(self):
        """Test Resend integration health"""
        print("→ Testing Resend integration health...")
        assert self.admin_token, "Admin token not set"
        
        response = requests.get(
            f"{self.base_url}/api/admin/integrations/health",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        
        # Check if resend is present (it's a top-level key, not nested under integrations)
        assert "resend" in data, "Resend not found in health check"
        resend_status = data["resend"]
        assert resend_status.get("isEnabled") == True, "Resend is not enabled"
        print(f"   ✓ Resend integration present and enabled")
        print(f"   ✓ Status: {resend_status.get('status')}")
        print(f"   ✓ Last check: {resend_status.get('lastCheck')}")
        if resend_status.get("lastTestError"):
            print(f"   ⚠ Last test error (expected in sandbox): {resend_status.get('lastTestError')}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("\n" + "="*60)
        print("BIBI Cars Email/OTP Test Suite")
        print("="*60)
        print(f"Backend: {self.base_url}")
        print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test sequence
        tests = [
            ("Admin Login", self.test_admin_login),
            ("Team-Lead Login Challenge", self.test_teamlead_login_challenge),
            ("OTP in MongoDB", self.test_otp_in_mongo),
            ("Email Dispatch Record", self.test_otp_email_dispatch),
            ("Admin Pending OTPs View", self.test_admin_pending_otps),
            ("OTP Verification", self.test_otp_verify),
            ("Admin OTP Config", self.test_admin_otp_config),
            ("Customer Email Verification", self.test_customer_registration_verification),
            ("Resend Health Check", self.test_resend_health),
        ]
        
        for name, func in tests:
            self.run_test(name, func)
        
        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        print("="*60)
        
        return 0 if self.tests_passed == self.tests_run else 1

if __name__ == "__main__":
    tester = EmailOtpTester()
    sys.exit(tester.run_all_tests())
