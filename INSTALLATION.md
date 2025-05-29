# Installation Guide

## macOS Installation

### Security Warning Fix

When you first download and run JSON Prettier on macOS, you may see a security warning:

> "Apple could not verify JSON Prettier.app is free of malware..."

This is normal for apps that aren't signed with an Apple Developer Certificate. To run the app:

**Method 1: System Settings**

1. Go to **System Settings → Privacy & Security**
2. Find "JSON Prettier.app was blocked" message
3. Click **"Open Anyway"**

**Method 2: Right-click**

1. Right-click on the app
2. Select **"Open"**
3. Click **"Open"** in the dialog

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
