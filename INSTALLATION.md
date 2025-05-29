# Installation Guide

## macOS Installation

### Security Warning Fix

When you first download and run JSON Prettier on macOS, you may see a security warning:

> "JSON Prettier.app is damaged and can't be opened. You should move it to the Trash."

This is normal for apps that aren't signed with an Apple Developer Certificate. To run the app:

**Method 1: System Settings (may not work on latest macOS)**

1. Go to **System Settings → Privacy & Security**
2. Find "JSON Prettier.app was blocked" message
3. Click **"Open Anyway"**

**Method 2: Terminal (Recommended - works for all versions)**

1. Open **Terminal**
2. Run the following command (replace path with actual app location):

```bash
sudo xattr -rd com.apple.quarantine "/Applications/JSON Prettier.app"
```

3. Enter your password when prompted

**Note**: For Apple Silicon Macs with arm64 version, Method 2 (Terminal) is currently the only reliable way to run the app.

This only needs to be done once. After that, the app will run normally.

## Windows Installation

Download the `.msi` installer and run it. Windows Defender may show a warning - click "More info" → "Run anyway".

## Linux Installation

Download the `.AppImage` file:

1. Make it executable: `chmod +x JSON-Prettier_*.AppImage`
2. Run: `./JSON-Prettier_*.AppImage`

Or install via package manager if available.

---

**Why this happens**: We're an open-source project and don't have an Apple Developer Certificate ($99/year). The app is completely safe - you can verify the source code on GitHub.
