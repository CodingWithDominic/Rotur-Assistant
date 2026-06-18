# Rotur Assistant
A versatile Chrome extension for the Rotur ecosystem that allows you to interact with most of Rotur with ease. Anytime, anywhere.

## Features
## Features
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

## Miscellaneous links
## Miscellaneous links
- RoturGit counterpart of this repo: https://git.rotur.dev/Dominic/Rotur-Assistant
- Rotur Assistant (Chrome / Chromium): https://chromewebstore.google.com/detail/rotur-assistant/hpjnmifgongkndfhfobdeppffcgjhleh
- Rotur Assistant (Firefox): https://addons.mozilla.org/addon/rotur-assistant/

## Patch Notes

### 1.0
- Initial release

### 1.0.1
- Fixed a possible XSS vulnerability reported by furina. Turns out, .replace() only replaces the first instance of a charater, rather than all of them. I was also unaware of the .replaceAll() function at the time, which does what I initially thought .replace() did.
- Added support for pasting images into image pickers via shift + click, mainly to address an issue on some browsers / systems (such as firefox) where the extension would close once the file picker was open.
- Some wiki corrections
- Add more tooltips in some places

### 1.1
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

### 1.2
- Added an ICN Editor. No need to deal with the funkiness of OriginOS's one anymore.
- Added support for Rotur RPC
- Added a manager for cosmetics, as well as a manager for owned cosmetics on the profile editor.
- Added statuses to profiles in Lookup
- Made some of the &lt;hr&gt; lines throughout Rotur Assistant ignore the container's padding, allowing them to span the entire viewport of the extension end-to-end
- Fixed a bug with searching up profiles of users under the "PassNet" system that don't have any other badges.
- Fixed a bug with trying to change your system to "PassNet".
- Corrected a typo regarding Fluoride (I had it spelt as "Flouride" throughout Rotur Assistant and its entire codebase)
- Added the option to have Rotur Assistant display as a side panel instead of a pop-up. This allows Rotur Assistant to remain open for extended periods of time, even if you switch tabs or click outside its window. Thanks to <a href="lookup.html?user=darkdot">darkdot</a> for making me aware of its existence.
- Fixed a bug where Claw post search queries that returned only one result instead don't return anything at all, throwing an error in the console instead.
- Added account switcher support for <a href="https://authenticator.rotur.dev" target="_blank" rel="noopener noreferrer">https://authenticator.rotur.dev</a>.
- Added account switcher support for <a href="https://gate.rotur.dev" target="_blank" rel="noopener noreferrer">https://gate.rotur.dev</a>. This was added last minute before 1.2 rolled off the production line (its auth looping indefinitely was fixed during the final stages of Rotur Assistant 1.2's review process)
- Fixed a bug where buying an item on someone's profile wouldn't update the item count.
- Added a repost button on Claw posts on profiles.
- Also added an indicator on profiles on whether Claw posts are reposts or profile-only posts.
- Added the ability to pin and unpin claw posts to your profile
- Added the repost button to your own claw posts. Turns out, the API lets you repost your own posts. I assumed it was false, since other Claw clients just hide the repost button in favor of the delete button.
- Corrected some bad coding practices, including any issues that came up in devtools (such as label tags that weren't associated with form elements), as well as having the header and footer use their own dedicated HTML tags, rather than being just &lt;div&gt;s. In other words, I cleaned up some of the div-itis throughout Rotur Assistant.
- Added an option in settings that lets you choose your preferred CDN server. This is a failsafe in case Milo's CDN server stops working.
- Double-clicking on an account in the account manager will now trigger an account switch if you're on a supported site.
- Several wiki corrections, mainly to update any now-outdated information.
- Any inline images, such as the one in the daily credit notice, now display aligned to the middle, rather than aligned to the bottom.
- Added an option to show legacy notifications (the notifications found at https://api.rotur.dev/notifications as opposed to https://api.rotur.dev/notify/log), since thanks to orion, I found out that there are 2 notification endpoints, rather than one.
- Since the option to show legacy notifications created some room for it, there's now a refresh button for notifications now.
- Modified the layout of (non-legacy) notifications to prioritize emphasis more on the source, rather than the user associated with that source.
- Fixed some layout issues regarding quotes and really long words in Rmail titles.
- Added multiple-image support for images in Rmails, in response to orion adopting the same markdown Rotur Assistant use for its Rmail images.
- Rewrote lookup and the profile editor so that the HTML behind the entire card is not appended all at once, and instead appends based on a template in the HTML file, which should theoretically improve performance slightly.
- While I was at it, I added a section to the profile editor to view login history and manage blocked IPs
- Similar to the profile rewrite, since I feel that Rotur Assistant gets a bit of a bad rep for directly parsing strings as HTML when dealing with repetitive elements (such as claw posts), a lot of Rotur Assistant was rewritten to instead clone and use &lt;template&gt; tags. This should improve performance in some spots too. I debated doing this, since it would take a very long time, given the complexity of some of the repetitive elements (example being claw posts, and their many attributes, including replies and their attributes) I decided to go through with it after the discovery of &lt;template&gt; tags.
- Items are now cached.
- Made the footer a little less bloated.
- The sum cache will now account for the 0.25 credit bonus when claiming a daily credit while the owner account of the system of your active account is also on your roster.
- Added a breakdown section to the Wallet app, allowing you to see individual balances of all your added accounts. This will only be visible if you have more than one account added in the account manager.
- Added a warning and somewhat graceful support in case Rotur Assistant is given a sub-token, rather than the main token (Rotur Assistant is and will continue to be designed primarily around the main token).
- Revoking a gift no longer uses a workaround that requires an alt, since I found out about an endpoint that lets you cancel gifts (Before, it had an alt claim a gift, then send the amount back to your active account). This also means that revoking gifts no longer requires at least 2 accounts to be added on your roster.
- Updated kyrOS's badge to use a badge that better resembles its actual logo, rather than an improvised one, as per request by NubbinsRuz themselves.
- Added the ability to cancel friend requests.
- Moved Notifications to be in the "Social" category in the header
- Added an option to use circular PFPs across Rotur Assistant, for parity with most other Rotur services (including many official ones).
- Added the option to clear any cached data (mainly session storage data).
- Added basic customization to the app's layout on the home page.
- Several other small/minor tweaks and bug fixes.
<br>
- Overall, this update mainly focused on cleaning up a lot of "tech debt", fixing even more bugs, and correcting a lot of bad coding practices.