# Deployment Guide

How to prepare a machine for a LoTTERY ceremony. The goal is a clean, verifiable environment where the only software running is the browser and the single HTML file.

## What You Need

- A USB stick (8 GB or more) with TAILS installed
- A laptop with internet access
- The URL where `index.html` and `SHA256SUMS` are published (e.g., the GitHub Pages site or a GitHub release)

## Step 1: Prepare TAILS (ahead of time)

[TAILS](https://tails.net) is a Linux distribution that boots from a USB stick into a clean, amnesic environment. Nothing is saved to disk. Every boot starts fresh.

1. On any computer, go to [tails.net/install](https://tails.net/install/)
2. Download the TAILS USB image and follow the installation instructions for your OS
3. Write the image to the USB stick using the recommended tool (Etcher, GNOME Disks, or `dd`)
4. Verify the download — TAILS provides its own verification mechanism on the download page
5. Test that the ceremony laptop can boot from this USB stick

TAILS supports UEFI Secure Boot on most machines. On some newer systems you may need to disable Secure Boot in BIOS — re-enable it after the ceremony.

## Step 2: Boot into TAILS

1. Insert the TAILS USB stick
2. Restart the laptop and enter the boot menu (usually F12, F2, or Esc — varies by manufacturer)
3. Select the USB stick as the boot device
4. TAILS will start and present a welcome screen — click "Start Tails"

## Step 3: Connect to the Network

1. Connect to Wi-Fi or plug in an Ethernet cable
2. TAILS routes traffic through Tor by default

You need the network for two things: downloading the ceremony file and fetching the remote seed during the ceremony. Both happen through Tor.

## Step 4: Download and Verify the Ceremony File

Inside Tor Browser, download `index.html` and `SHA256SUMS` from the published URL.

Then open a terminal (Applications → Utilities → Terminal) and verify:

```bash
cd ~/Tor\ Browser/
shasum -a 256 -c SHA256SUMS
```

If GPG signatures are available:

```bash
gpg --verify SHA256SUMS.asc SHA256SUMS
```

This is the key step: by downloading inside TAILS, you are acquiring the file through Tor (protecting against network-level MITM) on a clean OS (protecting against local tampering). The SHA256SUMS verification confirms the file is byte-identical to what was published.

## Step 5: Open the Ceremony File

Double-click `index.html` in the file manager, or type in the Tor Browser address bar:

```
file:///home/amnesia/Tor Browser/index.html
```

The application checks for Web Crypto API availability on load. If it shows an error, ensure you're using TAILS 6.0 or later.

## Step 6: Run the Ceremony

1. **Generate** the local seed (automatic, one click)
2. **Fetch** the remote seed (one network request to random.org — you can disconnect after this)
3. **Set the range** (Min / Max) and whether repeats are allowed
4. A person from the audience **speaks a number** — enter it
5. **Reveal** and **verify** seeds
6. **Draw** numbers

QR codes on screen should be visible to the audience. Encourage observers to photograph them — these are their cryptographic receipts.

## Step 7: After the Ceremony

1. Export the log file (toolbar → Export Log) — save it to a USB stick or upload it
2. Shut down TAILS — it erases everything from RAM
3. Publish the log file alongside the ceremony results
4. Anyone can verify by opening their own copy of the tool and using Replay mode with the exported log

## Quick Checklist

- [ ] TAILS USB stick prepared and tested on the ceremony laptop
- [ ] Published URL for `index.html` and `SHA256SUMS` confirmed
- [ ] Internet access available at the ceremony venue (Wi-Fi or Ethernet)
- [ ] Projector connected and working
- [ ] Observers briefed: photograph the QR codes

## Without TAILS

If TAILS is not an option (e.g., managed hardware that cannot boot from USB), the ceremony can run in any modern browser. The security trade-off is that you are trusting the host OS. In this case:

1. Use a freshly installed or known-clean machine
2. Download and verify `index.html` against SHA256SUMS
3. Disconnect from the network after the random.org fetch
4. Document publicly that TAILS was not used and why
