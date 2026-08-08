
    tell application "Mail"
        activate
        set newEmail to make new outgoing message with properties {subject:"Test Subject", content:"Test Body", visible:true}
        tell newEmail
            make new to recipient at end of to recipients with properties {address:"zakiahmad@ntpc.co.in"}
            tell content
                make new attachment with properties {file name:POSIX file "/Users/zakiahmad/Documents/Good_Morning_Bulletin_2026-05-31.html"} at after the last paragraph
            end tell
        end tell
    end tell
    