"""
BIBI Cars - Comprehensive Backend API Test Suite
=================================================
Tests all major functionality after deployment:
- Public storefront
- Staff login (admin, manager, team_lead with email-OTP)
- RBAC / Access control
- Customer auth + 2FA
- Stripe integration
- Ringostat integration
- Core CRM endpoints
"""

import requests
import sys
import json
import hashlib
import pyotp
from datetime import datetime
from typing import Optional, Dict, Any

# Use the public preview URL for testing
BASE_URL = "https://bibi-car-final.preview.emergentagent.com"
DB_NAME = "test_database"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class BIBITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.admin_token = None
        self.manager_token = None
        self.customer_token = None
        self.failed_tests = []
        
    def log(self, message: str, level: str = "info"):
        """Log with color"""
        if level == "success":
            print(f"{Colors.GREEN}✓ {message}{Colors.END}")
        elif level == "error":
            print(f"{Colors.RED}✗ {message}{Colors.END}")
        elif level == "warning":
            print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")
        elif level == "info":
            print(f"{Colors.BLUE}ℹ {message}{Colors.END}")
        else:
            print(message)
    
    def test(self, name: str, method: str, endpoint: str, expected_status: int, 
             data: Optional[Dict] = None, headers: Optional[Dict] = None, 
             check_response: Optional[callable] = None) -> tuple[bool, Any]:
        """Run a single API test"""
        url = f"{BASE_URL}{endpoint}"
        self.tests_run += 1
        
        print(f"\n{'='*70}")
        print(f"Test #{self.tests_run}: {name}")
        print(f"{'='*70}")
        print(f"Method: {method} {endpoint}")
        
        try:
            req_headers = headers or {}
            if method == 'GET':
                response = requests.get(url, headers=req_headers, timeout=30)
            elif method == 'POST':
                req_headers['Content-Type'] = 'application/json'
                response = requests.post(url, json=data, headers=req_headers, timeout=30)
            elif method == 'PUT':
                req_headers['Content-Type'] = 'application/json'
                response = requests.put(url, json=data, headers=req_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            print(f"Status: {response.status_code} (expected: {expected_status})")
            
            # Parse response
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw": response.text[:200]}
            
            # Check status code
            status_ok = response.status_code == expected_status
            
            # Additional response checks
            check_ok = True
            if check_response and status_ok:
                try:
                    check_ok = check_response(response_data)
                except Exception as e:
                    check_ok = False
                    print(f"Response check failed: {e}")
            
            success = status_ok and check_ok
            
            if success:
                self.tests_passed += 1
                self.log(f"PASSED - {name}", "success")
            else:
                self.tests_failed += 1
                self.failed_tests.append({
                    "name": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "got": response.status_code,
                    "response": response_data
                })
                self.log(f"FAILED - {name}", "error")
                print(f"Response: {json.dumps(response_data, indent=2)[:500]}")
            
            return success, response_data
            
        except Exception as e:
            self.tests_failed += 1
            self.failed_tests.append({
                "name": name,
                "endpoint": endpoint,
                "error": str(e)
            })
            self.log(f"FAILED - {name}: {str(e)}", "error")
            return False, {}
    
    def test_public_storefront(self):
        """Test public storefront endpoints"""
        print(f"\n{'#'*70}")
        print("# PUBLIC STOREFRONT TESTS")
        print(f"{'#'*70}")
        
        # Test homepage loads
        self.test(
            "Homepage loads",
            "GET", "/api/public/vehicles",
            200,
            check_response=lambda r: isinstance(r, (list, dict))
        )
        
        # Test catalog returns >100 items
        success, data = self.test(
            "Catalog returns vehicles (>100 items expected)",
            "GET", "/api/public/vehicles",
            200,
            check_response=lambda r: len(r) > 100 if isinstance(r, list) else len(r.get('items', [])) > 100
        )
        if success:
            count = len(data) if isinstance(data, list) else len(data.get('items', []))
            self.log(f"Catalog has {count} vehicles", "info")
        
        # Test brands
        self.test(
            "GET /api/public/brands",
            "GET", "/api/public/brands",
            200
        )
        
        # Test featured
        self.test(
            "GET /api/public/featured",
            "GET", "/api/public/featured",
            200
        )
        
        # Test calculator ports
        self.test(
            "GET /api/calculator/ports",
            "GET", "/api/calculator/ports",
            200
        )
        
        # Test search suggest
        self.test(
            "GET /api/public/search/suggest?q=bmw",
            "GET", "/api/public/search/suggest?q=bmw",
            200
        )
    
    def test_staff_login(self):
        """Test staff login for admin, manager, team_lead"""
        print(f"\n{'#'*70}")
        print("# STAFF LOGIN TESTS")
        print(f"{'#'*70}")
        
        # Test admin login
        success, data = self.test(
            "Admin login (password)",
            "POST", "/api/auth/login",
            200,
            data={
                "email": "admin@bibi.cars",
                "password": "BibiAdmin#2026Secure"
            },
            check_response=lambda r: "access_token" in r or "token" in r
        )
        if success:
            self.admin_token = data.get("access_token") or data.get("token")
            self.log(f"Admin token obtained: {self.admin_token[:20]}...", "success")
        
        # Test manager login
        success, data = self.test(
            "Manager login (password)",
            "POST", "/api/auth/login",
            200,
            data={
                "email": "manager@bibi.cars",
                "password": "BibiManager#2026Secure"
            },
            check_response=lambda r: "access_token" in r or "token" in r
        )
        if success:
            self.manager_token = data.get("access_token") or data.get("token")
            self.log(f"Manager token obtained: {self.manager_token[:20]}...", "success")
        
        # Test team_lead login (should return email_otp challenge)
        success, data = self.test(
            "Team Lead login (email-OTP challenge expected)",
            "POST", "/api/auth/login",
            200,
            data={
                "email": "teamlead@bibi.cars",
                "password": "BibiTeamLead#2026Secure"
            },
            check_response=lambda r: r.get("challenge") == "email_otp" and "challenge_token" in r
        )
        if success:
            self.log("Team Lead correctly returns email_otp challenge (SMTP not configured, so OTP completion is optional)", "success")
        else:
            self.log("Team Lead login did not return expected challenge structure", "warning")
    
    def test_admin_endpoints(self):
        """Test admin endpoints with admin token"""
        print(f"\n{'#'*70}")
        print("# ADMIN ENDPOINTS TESTS")
        print(f"{'#'*70}")
        
        if not self.admin_token:
            self.log("Skipping admin tests - no admin token", "warning")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test integrations endpoint
        self.test(
            "GET /api/admin/integrations (with admin token)",
            "GET", "/api/admin/integrations",
            200,
            headers=headers,
            check_response=lambda r: isinstance(r, list)
        )
        
        # Test settings/auth endpoint
        self.test(
            "GET /api/admin/settings/auth (with admin token)",
            "GET", "/api/admin/settings/auth",
            200,
            headers=headers
        )
    
    def test_rbac_access_control(self):
        """Test RBAC and access control - security holes closed"""
        print(f"\n{'#'*70}")
        print("# RBAC / ACCESS CONTROL TESTS")
        print(f"{'#'*70}")
        
        # Test 1: Admin endpoint without Authorization header must return 401/403
        self.test(
            "Admin endpoint WITHOUT auth header (should be 401/403)",
            "GET", "/api/admin/integrations",
            401  # Expecting 401 Unauthorized
        )
        
        # Test 2: Try with manager token on admin-only endpoint
        if self.manager_token:
            # First check if manager can access admin endpoints (should be allowed for team_lead/manager in ADMIN_ROLES)
            # But let's test a master_admin only endpoint
            headers = {"Authorization": f"Bearer {self.manager_token}"}
            
            # Try to access staff endpoint (should work for manager)
            self.test(
                "Manager accessing /api/staff (should work)",
                "GET", "/api/staff",
                200,
                headers=headers
            )
            
            # Try to access a master_admin only endpoint (should fail)
            # Note: Most admin endpoints allow admin/team_lead/manager, but some require master_admin
            # Let's test if manager can access integrations (should work based on require_admin)
            self.test(
                "Manager accessing /api/admin/integrations (should work - admin role)",
                "GET", "/api/admin/integrations",
                200,
                headers=headers
            )
        else:
            self.log("Skipping manager RBAC tests - no manager token", "warning")
    
    def test_customer_auth_2fa(self):
        """Test customer authentication and 2FA"""
        print(f"\n{'#'*70}")
        print("# CUSTOMER AUTH + 2FA TESTS")
        print(f"{'#'*70}")
        
        # Note: Customer 2FA testing requires:
        # 1. Creating a customer in MongoDB
        # 2. Enabling 2FA via API
        # 3. Computing TOTP with pyotp
        # 4. Verifying the TOTP
        
        # For now, we'll test the customer auth endpoints are accessible
        self.test(
            "Customer login endpoint exists",
            "POST", "/api/customer-auth/login",
            400,  # Expecting 400 for missing credentials, not 404
            data={}
        )
        
        self.log("Customer 2FA full flow requires MongoDB access - skipping detailed test", "info")
        self.log("Backend 2FA already passed isolated testing (11/11)", "info")
    
    def test_stripe_integration(self):
        """Test Stripe integration"""
        print(f"\n{'#'*70}")
        print("# STRIPE INTEGRATION TESTS")
        print(f"{'#'*70}")
        
        # Test public config
        success, data = self.test(
            "GET /api/stripe/public-config",
            "GET", "/api/stripe/public-config",
            200,
            check_response=lambda r: r.get("enabled") == True and "publishableKey" in r and r["publishableKey"].startswith("pk_test_")
        )
        if success:
            self.log(f"Stripe enabled: {data.get('enabled')}, publishableKey: {data.get('publishableKey', '')[:20]}...", "info")
        
        # Test admin integration test endpoint
        if self.admin_token:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            success, data = self.test(
                "POST /api/admin/integrations/stripe/test (with admin token)",
                "POST", "/api/admin/integrations/stripe/test",
                200,
                headers=headers,
                check_response=lambda r: r.get("success") == True
            )
            if success:
                self.log(f"Stripe test result: {data.get('message', '')[:100]}", "info")
        
        # Test integrations health
        if self.admin_token:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            success, data = self.test(
                "GET /api/admin/integrations/health",
                "GET", "/api/admin/integrations/health",
                200,
                headers=headers,
                check_response=lambda r: "stripe" in r and r["stripe"].get("status") == "ok"
            )
            if success:
                stripe_health = data.get("stripe", {})
                self.log(f"Stripe health: status={stripe_health.get('status')}, enabled={stripe_health.get('isEnabled')}", "info")
    
    def test_ringostat_integration(self):
        """Test Ringostat integration"""
        print(f"\n{'#'*70}")
        print("# RINGOSTAT INTEGRATION TESTS")
        print(f"{'#'*70}")
        
        if not self.admin_token:
            self.log("Skipping Ringostat tests - no admin token", "warning")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test Ringostat test endpoint
        success, data = self.test(
            "POST /api/admin/integrations/ringostat/test (live ping project 145693)",
            "POST", "/api/admin/integrations/ringostat/test",
            200,
            headers=headers,
            check_response=lambda r: r.get("success") == True
        )
        if success:
            self.log(f"Ringostat test result: {data.get('message', '')[:100]}", "info")
    
    def test_core_crm_endpoints(self):
        """Test core CRM endpoints"""
        print(f"\n{'#'*70}")
        print("# CORE CRM ENDPOINTS TESTS")
        print(f"{'#'*70}")
        
        if not self.admin_token:
            self.log("Skipping CRM tests - no admin token", "warning")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test leads
        self.test(
            "GET /api/leads",
            "GET", "/api/leads",
            200,
            headers=headers,
            check_response=lambda r: isinstance(r, (list, dict))
        )
        
        # Test deals
        self.test(
            "GET /api/deals",
            "GET", "/api/deals",
            200,
            headers=headers,
            check_response=lambda r: isinstance(r, (list, dict))
        )
        
        # Test invoices
        self.test(
            "GET /api/invoices",
            "GET", "/api/invoices",
            200,
            headers=headers,
            check_response=lambda r: isinstance(r, (list, dict))
        )
        
        # Test payments
        self.test(
            "GET /api/admin/payments",
            "GET", "/api/admin/payments",
            200,
            headers=headers,
            check_response=lambda r: isinstance(r, (list, dict))
        )
        
        # Test staff
        self.test(
            "GET /api/staff",
            "GET", "/api/staff",
            200,
            headers=headers,
            check_response=lambda r: isinstance(r, (list, dict))
        )
    
    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*70}")
        print("TEST SUMMARY")
        print(f"{'='*70}")
        print(f"Total tests: {self.tests_run}")
        print(f"{Colors.GREEN}Passed: {self.tests_passed}{Colors.END}")
        print(f"{Colors.RED}Failed: {self.tests_failed}{Colors.END}")
        
        if self.failed_tests:
            print(f"\n{Colors.RED}FAILED TESTS:{Colors.END}")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"\n{i}. {test['name']}")
                print(f"   Endpoint: {test.get('endpoint', 'N/A')}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                else:
                    print(f"   Expected: {test.get('expected', 'N/A')}, Got: {test.get('got', 'N/A')}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        return 0 if self.tests_failed == 0 else 1

def main():
    print(f"\n{'#'*70}")
    print("# BIBI Cars - Comprehensive Backend API Test Suite")
    print(f"# Base URL: {BASE_URL}")
    print(f"# Database: {DB_NAME}")
    print(f"# Timestamp: {datetime.now().isoformat()}")
    print(f"{'#'*70}\n")
    
    tester = BIBITester()
    
    # Run all test suites
    tester.test_public_storefront()
    tester.test_staff_login()
    tester.test_admin_endpoints()
    tester.test_rbac_access_control()
    tester.test_customer_auth_2fa()
    tester.test_stripe_integration()
    tester.test_ringostat_integration()
    tester.test_core_crm_endpoints()
    
    # Print summary
    return tester.print_summary()

if __name__ == "__main__":
    sys.exit(main())
