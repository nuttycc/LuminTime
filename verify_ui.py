from playwright.sync_api import sync_playwright

def verify_settings_navigation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use custom args to allow extension pages if needed, but for simple HTML verify we can just load the file
        # However, since we are serving via http.server, we access localhost
        page = browser.new_page()

        try:
            # Navigate to popup
            page.goto("http://localhost:8000/popup.html")

            # Wait for content
            page.wait_for_selector(".navbar")

            # 1. Verify Home View has the Settings Button
            # The button has a tooltip "Settings"
            settings_btn = page.locator('.tooltip[data-tip="Settings"] button')
            if not settings_btn.is_visible():
                print("Settings button not found on Home View")
                return

            print("Settings button found")

            # Take screenshot of Home View with Settings button
            page.screenshot(path="verification_home.png")

            # 2. Click Settings Button
            settings_btn.click()

            # 3. Verify Navigation to Settings View
            # Check for "Settings" title in navbar
            page.wait_for_selector("div.navbar-center:has-text('Settings')")
            print("Navigated to Settings View")

            # 4. Verify Export/Import buttons
            export_btn = page.get_by_role("button", name="Export Data")
            import_btn = page.get_by_role("button", name="Import Data")

            if export_btn.is_visible() and import_btn.is_visible():
                print("Export and Import buttons are visible")
            else:
                print("Buttons missing")

            # Take screenshot of Settings View
            page.screenshot(path="verification_settings.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification_error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_settings_navigation()
