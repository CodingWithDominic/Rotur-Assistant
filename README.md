# Rotur Assistant
A versatile Chrome extension for the Rotur ecosystem that allows you to interact with most of Rotur with ease. Anytime, anywhere.

Features:
- Wallet
- Economic Stats (Calculator Included)
- Detailed Lookup
- Wiki
- Claw
- Easy Account Management
- Semi-Universal Account Switcher across select Rotur services

## Build Instructions
- Chrome: Download the repo, go to chrome://extensions, click "Load Unpacked", and then select the folder you got by downloading this repo. Make sure you have "Developer Mode" enabled in the top-right corner.
- Firefox: First, download the repo. Then, click the extension icon in the top-right corner. Click on "Discover Extensions" if necessary. Then click on the settings icon right under where the search bar is. Then click on "Debug Add-ons". From there, click "Load Temporary Add-on", and then click on the zip file you got by downloading this repo. Do not unzip the folder first.

### Miscellaneous links
- RoturGit counterpart of this repo: https://git.rotur.dev/Dominic/Rotur-Assistant
- Rotur Assistant (Chrome / Chromium): https://chromewebstore.google.com/detail/rotur-assistant/hpjnmifgongkndfhfobdeppffcgjhleh
- Rotur Assistant (Firefox): https://addons.mozilla.org/addon/rotur-assistant/

## Patch Notes

#1.0
- Initial release
#1.0.1
- Fixed a possible XSS vulnerability reported by furina. Turns out, .replace() only replaces the first instance of a charater, rather than all of them. I was also unaware of the .replaceAll() function at the time, which does what I initially thought .replace() did.
- Added support for pasting images into image pickers via shift + click, mainly to address an issue on some browsers / systems (such as firefox) where the extension would close once the file picker was open.
- Some wiki corrections
- Add more tooltips in some places

#1.1
- Fixed a bug where the send button would persist upon sharing a claw post. Turns out, I created a logical error while fixing another bug in 1.0.1 where having a blank post with an image attached would still upload the image to Milo's RoturCDN server, but would still abort the post due to the post being blank, effectively creating a way to waste Milo's server space.
- Claw's "Update in real time" option now only refreshes the feed when it receives a message from the claw websocket, rather than every 5 seconds.
- Added an option to scramble account tokens when uploading to sync.
- Added an option to export and import account rosters.
- Added a timer for when daily credits become available to claim, alongside an option to receive a system notification when they become available.
- The Themes app on the home screen has been replaced by a general settings app, with themes being moved to be a tab in the settings app.
- Added user notes, though Rotur Assistant uses its own notes system to get around needing a Rotur subscription. User notes are synced to your Google (or Firefox) Account. Due to sync limitations, you can only save notes on up to 100 users. You can manage your notes in the new settings app.
- Rmail reply chains now superscript the index in the chain, rather than reply chains being a lot of nesting of "(Re: (Re: ...))"
- Added image support (sort of) to Rmail. However, images sent via Rmail will only be visible by other Rotur Assistant users using version 1.1 or higher, due to the fact that Rotur Assistant uses special markdown.
- Added a notifications manager
- General Wallet app improvements, mainly caching the account balance and the sum balance, thus reducing load on the Rotur API (gets around potential rate limits too).
- Added account switcher support for <a href="https://git.rotur.dev" target="_blank" rel="noopener noreferrer">https://git.rotur.dev</a> (This would've been included in 1.0, but at the time, I couldn't figure out how to get it to work).<br>Mini-trivia: While testing the feature, I accidentally created a security hole with my Forgejo Rotur account, where logging into huopathrowaway on roturGIT would log into my main Forgejo account (Dominic). I did fix this issue on Rotur Assistant's side by having it clear your cookies on RoturGIT before performing the switch. I tried to remove the link, but I couldn't. I eventually gave up and told Mistium about it, and she helped me break the link.
- Gift data is now cached, meaning switching filters will no longer re-fetch the gift data. As compensation, a refresh button was added.
- Fixed some bugs regarding profile editing.
- Pressing "Shift" when clicking on the "Add account" button in the account manager will prompt you to add an account using a token, in case you forget your account or get locked out of it.
- Added a new danger zone section at the bottom of the profile editor. Only mess with stuff in there if you know what you are doing.
- When managing claw posts through the profile editor, you now interact on behalf of the account you are currently editing, rather than your current active account.
- Attempting to save a JSON object in the account key manager will attempt to save the value as an object, rather as a stringified object (if it fails to detect a potential object, then it will fall back to saving it as a string). This property only applies to keys in the "Other" category.
- Fixed a bug in the account key manager where copying a key that was a JSON object would instead copy a series of [object Object]s instead.
- Graceful handling in case the TOS gets updated and accounts have to re-accept.
- Similarly, graceful handling for any account whose email isn't verified (assuming it makes it past rotur.dev/auth without validating). This was added pretty much at the last minute right when 1.1 was being tested.
- Added more fill-in badges for systems that don't come with a badge, including futureproofing for 2 potential new Rotur 'system's (Fluoride and originChats).
- Removed and centralized a lot of redundant code.
- Fixed bugs in some places regarding Rotur accounts with spaces
- Several other small/minor bug fixes
