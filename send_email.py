import os
import subprocess

def create_mail_draft():
    as_path = "/Users/zakiahmad/Documents/Antigravity/draft_email_2026_07_29.scpt"
    res = subprocess.run(["osascript", as_path], capture_output=True, text=True)
    if res.returncode == 0:
        print("Email successfully sent via Apple Mail to zakiahmad@ntpc.co.in and erzaki@gmail.com!")
    else:
        print("AppleScript error:", res.stderr)

if __name__ == "__main__":
    create_mail_draft()
