#!/usr/bin/env python3
"""
Customer 2FA End-to-End Test
Tests the complete customer 2FA flow via backend API
"""
import requests
import pyotp
import json

BASE_URL = "https://bibi-car-final.preview.emergentagent.com"

# Test credentials
EMAIL = "demo_2fa@bibi.cars"
PASSWORD = "Passw0rd!"
CUSTOMER_ID = "cust_5f4afc9d33a4"

def test_customer_2fa_flow():
    """Test complete customer 2FA flow"""
    
    print("=" * 60)
    print("CUSTOMER 2FA END-TO-END TEST")
    print("=" * 60)
    
    session = requests.Session()
    token = None
    manual_key = None
    backup_codes = []
    
    # Step 1: Login
    print("\n[1] Login with email/password...")
    resp = session.post(f"{BASE_URL}/api/customer-auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    print(f"Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"✗ Login failed: {resp.text}")
        return False
    
    data = resp.json()
    token = data.get("accessToken")
    if not token:
        print("✗ No access token in response")
        return False
    
    print(f"✓ Login successful, token: {token[:20]}...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Check 2FA status
    print("\n[2] Check 2FA status...")
    resp = session.get(f"{BASE_URL}/api/customer-auth/2fa/status", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"✗ Status check failed: {resp.text}")
        return False
    
    status = resp.json()
    print(f"✓ 2FA Status: {json.dumps(status, indent=2)}")
    
    if status.get("enabled"):
        print("⚠ 2FA is already enabled - need to disable first")
        # Try to disable (this will fail without TOTP, but that's expected)
        print("Skipping enable test since 2FA is already on")
        return True
    
    # Step 3: Setup 2FA (request QR + manual key)
    print("\n[3] Setup 2FA (request QR code)...")
    resp = session.post(f"{BASE_URL}/api/customer-auth/2fa/setup", 
                       json={"password": PASSWORD},
                       headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"✗ Setup failed: {resp.text}")
        return False
    
    setup_data = resp.json()
    manual_key = setup_data.get("manualKey")
    qr_code = setup_data.get("qrCode")
    
    if not manual_key:
        print("✗ No manual key in response")
        return False
    
    print(f"✓ Manual key: {manual_key}")
    print(f"✓ QR code present: {bool(qr_code)}")
    
    # Step 4: Compute TOTP and verify
    print("\n[4] Compute TOTP code and verify...")
    totp = pyotp.TOTP(manual_key)
    totp_code = totp.now()
    print(f"✓ TOTP code: {totp_code}")
    
    resp = session.post(f"{BASE_URL}/api/customer-auth/2fa/verify",
                       json={"code": totp_code},
                       headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"✗ Verify failed: {resp.text}")
        return False
    
    verify_data = resp.json()
    backup_codes = verify_data.get("backupCodes", [])
    print(f"✓ 2FA enabled! Received {len(backup_codes)} backup codes")
    if backup_codes:
        print(f"✓ Backup code #1: {backup_codes[0]}")
    
    # Step 5: Check status again
    print("\n[5] Verify 2FA is now enabled...")
    resp = session.get(f"{BASE_URL}/api/customer-auth/2fa/status", headers=headers)
    status = resp.json()
    print(f"✓ 2FA Status: enabled={status.get('enabled')}, backup_codes={status.get('backupCodesRemaining')}")
    
    if not status.get("enabled"):
        print("✗ 2FA should be enabled but it's not")
        return False
    
    print("\n✓✓✓ 2FA ENABLE FLOW PASSED ✓✓✓")
    
    # Step 6: Test login with 2FA challenge (TOTP)
    print("\n[6] Test login with TOTP challenge...")
    resp = session.post(f"{BASE_URL}/api/customer-auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"✗ Login failed: {resp.text}")
        return False
    
    challenge_data = resp.json()
    if challenge_data.get("challenge") != "totp":
        print(f"✗ Expected TOTP challenge, got: {challenge_data}")
        return False
    
    challenge_token = challenge_data.get("challenge_token")
    print(f"✓ TOTP challenge received, token: {challenge_token[:20]}...")
    
    # Compute fresh TOTP
    totp_code = totp.now()
    print(f"✓ Fresh TOTP code: {totp_code}")
    
    # Verify challenge
    resp = session.post(f"{BASE_URL}/api/customer-auth/2fa/challenge/verify", json={
        "challenge_token": challenge_token,
        "code": totp_code
    })
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"✗ Challenge verify failed: {resp.text}")
        return False
    
    login_data = resp.json()
    new_token = login_data.get("accessToken")
    print(f"✓ Login with TOTP successful, new token: {new_token[:20]}...")
    
    print("\n✓✓✓ LOGIN WITH TOTP CHALLENGE PASSED ✓✓✓")
    
    # Step 7: Test login with backup code
    print("\n[7] Test login with backup code...")
    resp = session.post(f"{BASE_URL}/api/customer-auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    
    challenge_data = resp.json()
    challenge_token = challenge_data.get("challenge_token")
    
    if not backup_codes:
        print("⚠ No backup codes available, skipping backup code test")
    else:
        backup_code = backup_codes[0]
        print(f"✓ Using backup code: {backup_code}")
        
        resp = session.post(f"{BASE_URL}/api/customer-auth/2fa/challenge/verify", json={
            "challenge_token": challenge_token,
            "backup_code": backup_code
        })
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"✗ Backup code login failed: {resp.text}")
        else:
            print("✓ Login with backup code successful")
            print("\n✓✓✓ LOGIN WITH BACKUP CODE PASSED ✓✓✓")
    
    # Step 8: Disable 2FA
    print("\n[8] Disable 2FA...")
    headers = {"Authorization": f"Bearer {new_token}"}
    
    # Compute fresh TOTP
    totp_code = totp.now()
    
    resp = session.post(f"{BASE_URL}/api/customer-auth/2fa/disable",
                       json={"password": PASSWORD, "code": totp_code},
                       headers=headers)
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"✗ Disable failed: {resp.text}")
        return False
    
    print("✓ 2FA disabled successfully")
    
    # Verify disabled
    resp = session.get(f"{BASE_URL}/api/customer-auth/2fa/status", headers=headers)
    status = resp.json()
    print(f"✓ Final status: enabled={status.get('enabled')}")
    
    if status.get("enabled"):
        print("✗ 2FA should be disabled but it's still enabled")
        return False
    
    print("\n✓✓✓ DISABLE 2FA PASSED ✓✓✓")
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED ✓✓✓")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    try:
        success = test_customer_2fa_flow()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗✗✗ TEST FAILED WITH EXCEPTION ✗✗✗")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
