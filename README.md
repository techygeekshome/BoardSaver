# Board Saver for Pinterest

Save every image on a Pinterest board in one go, at the best quality Pinterest has. Board Saver skips the duplicates for you and hands you everything in a single ZIP file.

**Download and full guide:** https://techygeekshome.info/browser-extensions/board-saver/

![Board Saver results](https://techygeekshome.info/wp-content/uploads/2026/10/board-saver-results.jpg)

## What it does

- **Grabs the whole board**, including board sections, even on boards with thousands of pins. Sections become folders in the ZIP.
- **Full-size images**, not the shrunk-down copies Pinterest shows you.
- **Removes duplicates**: the same picture pinned twice, or a smaller copy of an image you already have. The biggest copy is kept.
- **You choose what goes in**: a preview grid with tick boxes and a minimum size filter.
- **One ZIP download**, numbered in board order, with an optional CSV of pin titles and links.
- **Video pins** can be included as MP4 files.

## Install

Pick the download for your browser from the [latest release](https://github.com/techygeekshome/BoardSaver/releases/latest).

| Browser | Download | Store listing |
|---|---|---|
| Chrome, Brave, Opera, Vivaldi | `BoardSaver-chrome.zip` | Not listed |
| Microsoft Edge | `BoardSaver-edge.zip` | Edge Add-ons, in review |
| Firefox | `BoardSaver-firefox.zip` | Firefox Add-ons, awaiting review |

`BoardSaver.zip` is the same package as the Chrome and Edge downloads.

### Chrome, Edge, Brave, Opera and Vivaldi

1. Unzip the download somewhere you'll keep it.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and pick the `board-saver` folder.

### Firefox

Board Saver is waiting for review on Firefox Add-ons, and that will be the easiest way to install it. Until then you can try it for the current session:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and pick `BoardSaver-firefox.zip`.

Firefox removes temporary add-ons when it closes. Needs Firefox 142 or newer.

### Build it yourself

The code in this repo is the Chromium version. `manifest.firefox.json` is the Firefox manifest. Run `./build.sh` to make every package in `dist/`.

## Use

1. Open a Pinterest board (or one section of it).
2. Click the Board Saver icon. It counts the pins as it finds them.
3. A results tab opens and downloads each image at full size, with duplicates already taken out.
4. Untick anything you don't want and click **Download ZIP**.

## Privacy

Everything runs inside your browser. Board Saver only talks to Pinterest to read the board and fetch the images. It has no account, no analytics and sends nothing anywhere else. The only thing it stores is your filter settings, on your own computer.

## Licence

GPL-3.0. Free for everyone, including commercial use.

Board Saver is an independent tool made by [TechyGeeksHome](https://techygeekshome.info). It is not affiliated with, endorsed by or connected to Pinterest. The images you save still belong to the people who made them.
