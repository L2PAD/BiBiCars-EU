"""
BIBI Cars CRM - Backend API Testing
Testing newly merged endpoints:
1. Admin login
2. Lead file attachments (upload, list, download, delete)
3. Customer invitation & self-registration flow
4. Customer account management (set-password, account info)
"""

import requests
import sys
import json
import base64
from datetime import datetime

class BIBIBackendTester:
    def __init__(self, base_url="https://bibi-car-final.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []
        
    def log(self, message, level="INFO"):
        """Log a message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
    
    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)
        
        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart
                    test_headers.pop('Content-Type', None)
                    response = requests.post(url, files=files, headers=test_headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)
            else:
                self.log(f"Unsupported method: {method}", "ERROR")
                self.tests_failed += 1
                self.failed_tests.append({"test": name, "error": f"Unsupported method: {method}"})
                return False, {}
            
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - {name} - Status: {response.status_code}", "SUCCESS")
            else:
                self.tests_failed += 1
                error_detail = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_body = response.json()
                    error_detail += f" - {json.dumps(error_body)}"
                except:
                    error_detail += f" - {response.text[:200]}"
                self.log(f"❌ FAILED - {name} - {error_detail}", "ERROR")
                self.failed_tests.append({"test": name, "error": error_detail})
            
            try:
                return success, response.json() if response.text else {}
            except:
                return success, {}
                
        except Exception as e:
            self.tests_failed += 1
            error_msg = str(e)
            self.log(f"❌ FAILED - {name} - Exception: {error_msg}", "ERROR")
            self.failed_tests.append({"test": name, "error": error_msg})
            return False, {}
    
    def test_admin_login(self):
        """Test admin login and get access token"""
        self.log("=" * 60)
        self.log("TEST SUITE: Admin Authentication")
        self.log("=" * 60)
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/api/auth/login",
            200,
            data={"email": "admin@bibi.cars", "password": "BibiAdmin#2026Secure"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log(f"✓ Admin token acquired: {self.token[:20]}...", "SUCCESS")
            return True
        else:
            self.log("✗ Failed to get admin token - cannot proceed with authenticated tests", "ERROR")
            return False
    
    def get_or_create_lead(self):
        """Get an existing lead or create a test lead"""
        self.log("\n" + "=" * 60)
        self.log("SETUP: Getting or creating test lead")
        self.log("=" * 60)
        
        # Try to get existing leads
        success, response = self.run_test(
            "List Leads",
            "GET",
            "/api/leads?limit=1",
            200
        )
        
        if success and response.get('items') and len(response['items']) > 0:
            lead_id = response['items'][0]['id']
            self.log(f"✓ Using existing lead: {lead_id}", "SUCCESS")
            return lead_id
        
        # Create a new test lead
        test_lead_data = {
            "name": "Test Lead for File Attachments",
            "email": f"test_lead_{int(datetime.now().timestamp())}@example.com",
            "phone": "+1234567890",
            "source": "api_test",
            "status": "new"
        }
        
        success, response = self.run_test(
            "Create Test Lead",
            "POST",
            "/api/leads",
            201,
            data=test_lead_data
        )
        
        if success and response.get('id'):
            lead_id = response['id']
            self.log(f"✓ Created test lead: {lead_id}", "SUCCESS")
            return lead_id
        
        self.log("✗ Failed to get or create lead", "ERROR")
        return None
    
    def test_lead_files(self, lead_id):
        """Test lead file attachment endpoints"""
        self.log("\n" + "=" * 60)
        self.log("TEST SUITE: Lead File Attachments")
        self.log("=" * 60)
        
        # Create a small test file (base64 encoded)
        test_content = "This is a test file for lead attachments"
        test_data_url = f"data:text/plain;base64,{base64.b64encode(test_content.encode()).decode()}"
        
        # 1. Upload a file
        upload_data = {
            "name": "test_document.txt",
            "mime": "text/plain",
            "data_url": test_data_url,
            "size": len(test_content)
        }
        
        success, response = self.run_test(
            "Upload Lead File",
            "POST",
            f"/api/leads/{lead_id}/files",
            200,
            data=upload_data
        )
        
        file_id = None
        if success and response.get('file', {}).get('id'):
            file_id = response['file']['id']
            self.log(f"✓ File uploaded with ID: {file_id}", "SUCCESS")
        else:
            self.log("✗ Failed to upload file", "ERROR")
            return
        
        # 2. List files
        success, response = self.run_test(
            "List Lead Files",
            "GET",
            f"/api/leads/{lead_id}/files",
            200
        )
        
        if success:
            file_count = len(response.get('items', []))
            self.log(f"✓ Found {file_count} file(s) for lead", "SUCCESS")
        
        # 3. Download file
        if file_id:
            success, response = self.run_test(
                "Download Lead File",
                "GET",
                f"/api/leads/{lead_id}/files/{file_id}/download",
                200
            )
            
            if success and response.get('data_url'):
                self.log("✓ File download successful", "SUCCESS")
        
        # 4. Delete file
        if file_id:
            success, response = self.run_test(
                "Delete Lead File",
                "DELETE",
                f"/api/leads/{lead_id}/files/{file_id}",
                200
            )
            
            if success:
                self.log("✓ File deleted successfully", "SUCCESS")
    
    def get_or_create_customer(self):
        """Get an existing customer or create a test customer"""
        self.log("\n" + "=" * 60)
        self.log("SETUP: Getting or creating test customer")
        self.log("=" * 60)
        
        # Try to get existing customers
        success, response = self.run_test(
            "List Customers",
            "GET",
            "/api/customers?limit=1",
            200
        )
        
        if success and response.get('items') and len(response['items']) > 0:
            customer_id = response['items'][0]['id']
            self.log(f"✓ Using existing customer: {customer_id}", "SUCCESS")
            return customer_id
        
        # Create a new test customer
        test_customer_data = {
            "name": "Test Customer for Invite",
            "email": f"test_customer_{int(datetime.now().timestamp())}@example.com",
            "phone": "+1234567890"
        }
        
        success, response = self.run_test(
            "Create Test Customer",
            "POST",
            "/api/customers",
            201,
            data=test_customer_data
        )
        
        if success and response.get('id'):
            customer_id = response['id']
            self.log(f"✓ Created test customer: {customer_id}", "SUCCESS")
            return customer_id
        
        self.log("✗ Failed to get or create customer", "ERROR")
        return None
    
    def test_customer_invite_flow(self, customer_id):
        """Test customer invitation and registration flow"""
        self.log("\n" + "=" * 60)
        self.log("TEST SUITE: Customer Invitation & Registration")
        self.log("=" * 60)
        
        # 1. Generate invite
        success, response = self.run_test(
            "Generate Customer Invite",
            "POST",
            f"/api/customers/{customer_id}/invite",
            200,
            data={}
        )
        
        invite_token = None
        if success and response.get('token'):
            invite_token = response['token']
            self.log(f"✓ Invite generated with token: {invite_token[:20]}...", "SUCCESS")
        else:
            self.log("✗ Failed to generate invite", "ERROR")
            return
        
        # 2. Validate invite token
        if invite_token:
            success, response = self.run_test(
                "Validate Invite Token",
                "GET",
                f"/api/customer-auth/validate-invite?token={invite_token}",
                200
            )
            
            if success and response.get('valid'):
                self.log("✓ Invite token is valid", "SUCCESS")
            else:
                self.log("✗ Invite token validation failed", "ERROR")
        
        # 3. Accept invite (set password)
        if invite_token:
            accept_data = {
                "token": invite_token,
                "password": "TestPassword123!"
            }
            
            success, response = self.run_test(
                "Accept Invite (Set Password)",
                "POST",
                "/api/customer-auth/accept-invite",
                200,
                data=accept_data
            )
            
            if success:
                self.log("✓ Invite accepted and password set", "SUCCESS")
    
    def test_customer_account_management(self, customer_id):
        """Test customer account management endpoints"""
        self.log("\n" + "=" * 60)
        self.log("TEST SUITE: Customer Account Management")
        self.log("=" * 60)
        
        # 1. Set password (admin action)
        password_data = {
            "password": "NewTestPassword123!"
        }
        
        success, response = self.run_test(
            "Set Customer Password (Admin)",
            "POST",
            f"/api/customers/{customer_id}/set-password",
            200,
            data=password_data
        )
        
        if success:
            self.log("✓ Password set successfully by admin", "SUCCESS")
        
        # 2. Get account info
        success, response = self.run_test(
            "Get Customer Account Info",
            "GET",
            f"/api/customers/{customer_id}/account",
            200
        )
        
        if success:
            state = response.get('state', 'unknown')
            has_password = response.get('hasPassword', False)
            self.log(f"✓ Account info retrieved - State: {state}, Has Password: {has_password}", "SUCCESS")
    
    def test_auth_enforcement(self):
        """Test that endpoints require authentication"""
        self.log("\n" + "=" * 60)
        self.log("TEST SUITE: Authentication Enforcement")
        self.log("=" * 60)
        
        # Save current token
        saved_token = self.token
        self.token = None
        
        # Test that protected endpoints return 401 without token
        success, response = self.run_test(
            "Lead Files Without Auth (Should Fail)",
            "GET",
            "/api/leads/test-lead-id/files",
            401
        )
        
        # Restore token
        self.token = saved_token
    
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "=" * 60)
        self.log("TEST SUMMARY")
        self.log("=" * 60)
        self.log(f"Total Tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed} ✅")
        self.log(f"Failed: {self.tests_failed} ❌")
        
        if self.tests_failed > 0:
            self.log("\nFailed Tests:")
            for failed in self.failed_tests:
                self.log(f"  - {failed['test']}: {failed['error']}", "ERROR")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"\nSuccess Rate: {success_rate:.1f}%")
        self.log("=" * 60)
        
        return 0 if self.tests_failed == 0 else 1

def main():
    tester = BIBIBackendTester()
    
    # 1. Test admin login
    if not tester.test_admin_login():
        tester.log("Cannot proceed without admin authentication", "ERROR")
        return tester.print_summary()
    
    # 2. Test lead file attachments
    lead_id = tester.get_or_create_lead()
    if lead_id:
        tester.test_lead_files(lead_id)
    else:
        tester.log("Skipping lead file tests - no lead available", "WARNING")
    
    # 3. Test customer invite flow
    customer_id = tester.get_or_create_customer()
    if customer_id:
        tester.test_customer_invite_flow(customer_id)
        tester.test_customer_account_management(customer_id)
    else:
        tester.log("Skipping customer tests - no customer available", "WARNING")
    
    # 4. Test auth enforcement
    tester.test_auth_enforcement()
    
    # Print summary and exit
    return tester.print_summary()

if __name__ == "__main__":
    sys.exit(main())
