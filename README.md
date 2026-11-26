# Raindrop Quick Links

A one-click popup that shows one Raindrop folder (default: **Browser**) and all of its subfolders.
Links are loaded live from Raindrop each time you open the popup. Nothing is written to your browser bookmarks.

## Install (Chrome, Arc, Brave, Edge)
1. Download the latest zip from [Releases](https://github.com/ljci/Raindrop-in-Broswer/releases/latest) and unzip it somewhere permanent (e.g. Documents/raindrop-quick-links).
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the unzipped folder.
4. Pin the extension (puzzle icon > pin).

## Set up
1. In Raindrop: Settings > Integrations > For developers > **Create new app** (any name).
2. Open the app and click **Create test token**. Copy it.
3. Right-click the extension icon > **Options**. Paste the token, click **Load folders**, pick **Browser**, then **Save**.

## Use
- Click a link: opens in the current tab. Cmd/Ctrl-click or middle-click: new background tab.
- Type to filter. Arrow keys + Enter to open. Enter with no match searches all of Raindrop.
- Click a subfolder name to fold or unfold it (remembered).
- Shortcut: Alt+R (Option+R on Mac). Change it at `chrome://extensions/shortcuts`.
- To add, remove or reorder links, do it in Raindrop. The popup follows.

## What it stores
- Your token, chosen folder and which subfolders are folded: extension storage on this computer.
- The last loaded list: session storage, wiped when the browser closes (lets the popup draw instantly).
