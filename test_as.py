import subprocess

def test():
    html_path = "/Users/zakiahmad/Documents/Good_Morning_Bulletin_2026-05-31.html"
    applescript = f"""
    tell application "Mail"
        activate
        set newEmail to make new outgoing message with properties {{subject:"Test Subject", content:"Test Body", visible:true}}
        tell newEmail
            make new to recipient at end of to recipients with properties {{address:"zakiahmad@ntpc.co.in"}}
            tell content
                make new attachment with properties {{file name:POSIX file "{html_path}"}} at after the last paragraph
            end tell
        end tell
    end tell
    """
    
    with open("/Users/zakiahmad/Documents/Antigravity/test_as.scpt", "w") as f:
        f.write(applescript)
        
    res = subprocess.run(["osascript", "/Users/zakiahmad/Documents/Antigravity/test_as.scpt"], capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)
    print("RC:", res.returncode)

if __name__ == "__main__":
    test()
