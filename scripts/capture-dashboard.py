#!/usr/bin/env python3
"""
Capture dashboard screenshot for Spineline landing page CTA section.
"""

from playwright.sync_api import sync_playwright
import os

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'dashboard.png')

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Create a larger viewport for a nice dashboard view
        context = browser.new_context(
            viewport={'width': 1400, 'height': 900},
            device_scale_factor=2  # Retina quality
        )
        page = context.new_page()

        # Navigate to login page first
        print("Opening login page - please log in...")
        page.goto('http://localhost:3000/login')

        # Wait for user to log in and reach the dashboard
        print("Waiting for you to log in and reach /home...")
        page.wait_for_url('**/home', timeout=120000)  # Wait up to 2 minutes

        print("Logged in! Waiting for dashboard to load...")
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)  # Extra time for data to load

        # Hide only the bottom tools panel, not the sidebar
        page.evaluate('''
            const floatingElements = document.querySelectorAll('[class*="fixed"]');
            floatingElements.forEach(el => {
                // Only hide elements at the bottom of the screen (tools panel)
                const rect = el.getBoundingClientRect();
                if (rect.bottom > window.innerHeight - 200 && rect.left > 100) {
                    el.style.display = 'none';
                }
            });
        ''')

        # Take full page screenshot including sidebar
        print(f"Capturing screenshot to {OUTPUT_PATH}...")
        page.screenshot(
            path=OUTPUT_PATH,
            clip={
                'x': 0,
                'y': 0,
                'width': 1400,
                'height': 800
            }
        )

        print(f"Dashboard screenshot saved to {OUTPUT_PATH}")
        browser.close()

if __name__ == '__main__':
    main()
