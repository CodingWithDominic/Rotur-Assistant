import { sanitize, formatDate, openErrorPopup, openSuccessPopup, CreateEmptyPlaceholder, UploadImage } from "../index.js"

let rmail_sent_cache = ''
let rmail_inbox_cache = ''
let rmail_starred_cache = ''
let rmail_drafts_cache = ''
let rmail_archive_cache = ''
let rmail_trash_cache = ''
let all_cache = ''
let me_cache = ''
let ban_reason_cache = ''
let current_rmail = {}
let draftprogressid = ''
let replies_cache = []
let current_rmail_view = ''
let editinginprogress = false
let finished_inboxes = 0

const rmail_inbox_map =
{
    inbox: "receivedrmailslist",
    sent: "sentrmailslist",
    scheduled: "rmaildraftslist",
    drafts: "rmaildraftslist",
    archive: "rmailarchivelist",
    trash: "rmailtrashlist"
}
function RmailCapitalize(name) {
    try {
        return name.includes('@') ? name : name.replace(/^./, char => char.toUpperCase())
    } catch {
        return "Unknown User"
    }
}
function toSuperscript(text) {
    const map = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };
    return text.replace(/\d/g, (char) => map[char]);
}

function hasSuperscript(text) {
    const superscriptRegex = /[⁰¹²³⁴⁵⁶⁷⁸⁹]/;
    return superscriptRegex.test(text);
}

function incrementSuperscriptChain(text) {
    const toStandard = {
        '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
        '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
    };
    const toSuper = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };

    const superSequenceRegex = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;

    return text.replace(superSequenceRegex, (match) => {
        const standardNumStr = match.split('').map(char => toStandard[char]).join('');
        const incremented = parseInt(standardNumStr, 10) + 1;
        return incremented.toString().split('').map(char => toSuper[char]).join('');
    });
}

const config = {
    removeElements: ['iframe', 'script', 'style', 'object', 'embed', 'applet', 'meta', 'link', 'base', 'form'],
    removeAttributes: ['onload', 'onclick', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onkeydown', 'onchange', 'onsubmit', 'srcdoc', 'formaction']
}
const sanitizer = new Sanitizer(config)

const actionbarclasses = ['.rmailreply', '.rmaildelete', '.rmailarchive', '.rmailstar', '.rmailthreads', '.rmailreport', '.rmailmarkread', '.rmailedit2'] // A lot easier than setting their attributes one-by-one manually
const preferredcdn = await new Promise(resolve =>
    chrome.storage.local.get('preferredcdn', data => resolve(data.preferredcdn || "mistiums3"))
) ?? "mistiums3";

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].setHTML(
        `<h1>Rmail</h1>
        <hr class="full-size">
        <h3>You are not signed in! Please sign in using the <a href="accounts.html" style="text-decoration: underline;">account manager</a> to access this page.</h3>`,
        {sanitizer: sanitizer})
} else if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].setHTML(
        `<h1>Rmail</h1>
        <hr class="full-size">
        <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>`,
        {sanitizer: sanitizer}
    )
} else if (!navigator.onLine) {
    document.getElementsByClassName('container')[0].setHTML(
        `<h1>Rmail</h1>
        <hr class="full-size">
        <h3>A communication error has occurred. If you're sure it's not your connection, then this part of Rotur may be down right now.</h3>`,
    {sanitizer: sanitizer})
} else {
    // Functions
    function openDeletePopup(id) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].setHTML(`
            <div id="popup-header">
                <h1>Delete Rmail</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="popupdialogue">Move this rmail to the trash? While it will be gone from your feed, it won't be gone from the other person's feed.</p>
            <label title="Skips moving this Rmail to the trash and instead deletes it permanently" class='rmaildeleteforeveraltoption'>
                <input type="checkbox" id='permadeleteinstead'>
                Delete Forever Instead
            </label>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">Cancel</button>
                <button class="finaldelete" data-id='${id}'>Delete</button>
            </div>
        `, {sanitizer: sanitizer})
    }
    function openEditRmailPopup(id, title, body, is_encrypted, is_reply) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].setHTML(`
            <div id="popup-header">
                <h1>Edit Rmail</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <label class="editrmailpopuplabels">
                Title:
                <input type="text" id="editrmailtitle" placeholder="Subject">
            </label>
            <label for="editrmailbody" class="editrmailpopuplabels">Body:</label>
            <textarea id="editrmailbody" placeholder="Body"></textarea>
            <label class='rmaildeleteforeveraltoption'>
                <input type="checkbox" id='editencrypted'>
                Encrypted
            </label>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">Cancel</button>
                <button class="finaledit" data-id='${id}' data-is_reply="${is_reply ?? "false"}">Save</button>
            </div>
        `, {sanitizer: sanitizer})
        document.getElementById('editrmailtitle').value = title
        document.getElementById('editrmailbody').value = body
        document.getElementById('editencrypted').checked = is_encrypted
    }
    function openDiscardPopup(id) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].setHTML(`
            <div id="popup-header">
                <h1>Discard Draft</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="popupdialogue">Are you sure you want to discard this draft?</p>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">Cancel</button>
                <button class="finaldiscard" data-id='${id}'>Discard</button>
            </div>
        `, {sanitizer: sanitizer})
    }
    function openUndeletePopup(id) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].setHTML(`
            <div id="popup-header">
                <h1>Restore Rmail</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="popupdialogue">Restore this Rmail?</p>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">Cancel</button>
                <button class="finalundelete" data-id='${id}'>Restore</button>
            </div>
        `, {sanitizer: sanitizer})
    }
    function openPermaDeletePopup(id, is_reply) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].setHTML(`
            <div id="popup-header">
                <h1>${is_reply ? "Delete Reply" : "Perma-Delete Rmail"}</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="popupdialogue">${is_reply ? "Are you sure you want to delete this reply?" : "Are you sure you want to permanently delete this Rmail?"}</p>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">Cancel</button>
                <button class="finalpermadelete" data-id='${id}' data-is_reply="${is_reply ?? "false"}">Delete</button>
            </div>
        `, {sanitizer: sanitizer})
    }
    function openArchivePopup(id) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].setHTML(`
            <div id="popup-header">
                <h1>Archive Rmail</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="popupdialogue">Are you sure you want to archive this Rmail?</p>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">Cancel</button>
                <button class="finalarchive" data-id='${id}'>Archive</button>
            </div>
        `, {sanitizer: sanitizer})
    }
    function openUnarchivePopup(id) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].setHTML(`
            <div id="popup-header">
                <h1>Archive Rmail</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="popupdialogue">Are you sure you want to unarchive this Rmail?</p>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">Cancel</button>
                <button class="finalunarchive" data-id='${id}'>Unarchive</button>
            </div>
        `, {sanitizer: sanitizer})
    }
    function openMarkReadPopup(id) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].setHTML(`
            <div id="popup-header">
                <h1>Burn Warning</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="popupdialogue">This Rmail has "Burn after read" enabled. By default, Rotur Assistant doesn't tell the server you have read peoples' Rmails to avoid triggering burn after read. Are you sure you want to mark this Rmail as read anyways?</p>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">Cancel</button>
                <button class="finalmarkread" data-id='${id}'>Mark Read</button>
            </div>
        `, {sanitizer: sanitizer})
    }
    function openReportPopup(id) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].setHTML(`
            <div id="popup-header">
                <h1>Report Rmail</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="popupdialogue">Reason for report:</p>
            <textarea id="rmailreportfield" placeholder="Report Reason..."></textarea>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">Cancel</button>
                <button class="finalreport" data-id='${id}'>Submit</button>
            </div>
        `, {sanitizer: sanitizer})
    }
    function openThreadManagerPopup(users, owner) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].setHTML(`
            <div id="popup-header">
                <h1>Participants</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="popupdialogue">People who can see this Rmail thread</p>
            <ul id="rmailthreadpopuplist">
            </ul>
            <div class="rmailthreadadduserrow">
                <input type="text" placeholder="Add User..." id="rmailthreadadduserfield">
                <button id="finalrmailadduser" title="Add User to Rmail Thread">+</button>
            </div>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">Dismiss</button>
            </div>
        `, {sanitizer: sanitizer})
        if (users.length == 0) {
            document.getElementById('rmailthreadpopuplist').replaceChildren(CreateEmptyPlaceholder('No participants', true))
        } else {
            users.forEach(user => {
                const usercard = document.getElementById('threaduserentry').content.cloneNode(true)
                usercard.querySelector('li').dataset.user = user.username
                usercard.querySelector('a').href = `lookup.html?user=${RmailCapitalize(user.username)}`
                usercard.querySelector('p').textContent = (RmailCapitalize(user.username) + ((owner.toLowerCase() == user.username.toLowerCase()) ? " 👑" : ""))
                usercard.querySelector('img').src = `https://avatars.rotur.dev/${user.username}`
                usercard.querySelector('img').alt = RmailCapitalize(user.username)
                usercard.querySelector('button').dataset.user = user.username
                if ((owner.toLowerCase() != activeacc.name.toLowerCase()) || (user.username.toLowerCase() == activeacc.name.toLowerCase())) {
                    usercard.querySelector('button').remove()
                }
                document.getElementById('rmailthreadpopuplist').appendChild(usercard)
            })
        }
        if (owner.toLowerCase() != activeacc.name.toLowerCase()) {
            document.querySelector('.rmailthreadadduserrow')?.remove()
        }
    }
    function closePopup() {
        document.getElementById('overlay').style.display = 'none';
    }
    // Everything else
    function parseImages(content) {
        const regex = /\[RAIMG\](.*?)\[\/RAIMG\]/g;
        return Array.from(content.matchAll(regex), match => match[1]);
    }

    function parseImage2(content) {
        const regex = /\[RAIMG\][\s\S]*?\[\/RAIMG\]/g
        return content.replace(regex, "")
    }
    function AppendImages(body, attachments, imagetarget) {
        const images = parseImages(body)
        imagetarget.replaceChildren()
        if (images.length == 0) {
            imagetarget.style.display = 'none'
        } else {
            imagetarget.style.display = 'block'
            images.forEach(image => {
                const img = document.createElement('img')
                img.src = image
                const imgload = (e) => {
                    img.removeEventListener('load', imgload)
                    img.removeEventListener('error', imgerror)
                }
                const imgerror = (e) => {
                    e.target.src = 'https://i.postimg.cc/BZMMMNWw/RA-Error-Attachment.png'
                    img.removeEventListener('load', imgload)
                    img.removeEventListener('error', imgerror)
                }
                img.addEventListener('load', imgload)
                img.addEventListener('error', imgerror)
                imagetarget.appendChild(img)
            })
        }
        const images2 = attachments
        if (images2.length > 0) {
            imagetarget.style.display = 'block'
            try {
                images2.forEach(image => {
                    if (image.mime_type.startsWith('image/')) {
                        const img = document.createElement('img')
                        img.src = image.url
                        img.addEventListener('error', (e) => {
                            e.target.src = 'https://i.postimg.cc/BZMMMNWw/RA-Error-Attachment.png'
                        })
                        imagetarget.appendChild(img)
                    } else {
                        const download = document.createElement('a');
                        download.textContent = image.name;
                        download.download = image.name || 'download'; 
                        fetch(image.url)
                            .then(response => response.blob())
                            .then(blob => {
                                const blobUrl = URL.createObjectURL(blob);
                                download.href = blobUrl;
                            })
                            .catch(err => console.error('Error creating blob:', err));
                        imagetarget.appendChild(download);
                    }
                })
            } catch {
                images2.forEach(image => {
                    const img = document.createElement('img')
                    img.src = image
                    img.addEventListener('error', (e) => {
                        e.target.src = 'https://i.postimg.cc/BZMMMNWw/RA-Error-Attachment.png'
                    })
                    imagetarget.appendChild(img)
                })
            } 
        }
    }
    function ResetActionBar() {
        document.getElementById('rmailactionbarbuttons').replaceChildren(document.getElementById('actionbartemplate').content.cloneNode(true))
    }
    function RefreshTabsAndInboxes() {
        let sentamt = document.getElementById('sentrmailslist').childElementCount
        let receivedamt = document.getElementById('receivedrmailslist').childElementCount
        let starredamt = document.getElementById('rmailstarredlist').childElementCount
        let draftamt = document.getElementById('rmaildraftslist').childElementCount
        let archiveamt = document.getElementById('rmailarchivelist').childElementCount
        let trashamt = document.getElementById('rmailtrashlist').childElementCount

        if (!document.getElementById('sentrmailslist').querySelector('li')) {
            sentamt = 0
            document.getElementById('sentrmailslist').replaceChildren(CreateEmptyPlaceholder(`You have not sent any rmails yet.`, true))
            document.getElementById('sentrmailslist').style = 'border: none;'
        } else {
            document.getElementById('sentrmailslist').style = "border: 2px solid white;"
        }
        if (!document.getElementById('receivedrmailslist').querySelector('li')) {
            receivedamt = 0
            document.getElementById('receivedrmailslist').replaceChildren(CreateEmptyPlaceholder(`You have not received any rmails yet.`, true))
            document.getElementById('receivedrmailslist').style = 'border: none;'
        } else {
            document.getElementById('receivedrmailslist').style = 'border: 2px solid white;'
        }
        if (!document.getElementById('rmaildraftslist').querySelector('li')) {
            draftamt = 0
            document.getElementById('rmaildraftslist').replaceChildren(CreateEmptyPlaceholder(`You have no drafts right now.`, true))
            document.getElementById('rmaildraftslist').style = 'border: none;'
        } else {
            document.getElementById('rmaildraftslist').style = "border: 2px solid white;"
        }
        if (!document.getElementById('rmailstarredlist').querySelector('li')) {
            starredamt = 0
            document.getElementById('rmailstarredlist').replaceChildren(CreateEmptyPlaceholder(`You have not starred any rmails yet.`, true))
            document.getElementById('rmailstarredlist').style = 'border: none;'
        } else {
            document.getElementById('rmailstarredlist').style = 'border: 2px solid white;'
        }
        if (!document.getElementById('rmailarchivelist').querySelector('li')) {
            archiveamt = 0
            document.getElementById('rmailarchivelist').replaceChildren(CreateEmptyPlaceholder(`You have not archived any rmails yet.`, true))
            document.getElementById('rmailarchivelist').style = 'border: none;'
        } else {
            document.getElementById('rmailarchivelist').style = "border: 2px solid white;"
        }
        if (!document.getElementById('rmailtrashlist').querySelector('li')) {
            trashamt = 0
            document.getElementById('rmailtrashlist').replaceChildren(CreateEmptyPlaceholder(`The trash can is empty right now.`, true))
            document.getElementById('rmailtrashlist').style = 'border: none;'
        } else {
            document.getElementById('rmailtrashlist').style = 'border: 2px solid white;'
        }
        document.getElementById('rmail_sent').textContent = `Sent (${sentamt})`
        document.getElementById('rmail_received').textContent = `Received (${receivedamt})`
        document.getElementById('rmail_drafts').textContent = `Drafts (${draftamt})`
        document.getElementById('rmail_starred').textContent = `Starred (${starredamt})`
        document.getElementById('rmail_archive').textContent = `Archived (${archiveamt})`
        document.getElementById('rmail_trash').textContent = `Trash (${trashamt})`
    }
    function ActionBarWhitelist(classarray, origelement, isfeed) {
        actionbarclasses.forEach(btnclass => {
            if (!classarray.includes(btnclass)) {
                if (isfeed) {
                    origelement.querySelector(btnclass)?.remove()
                } else {
                    if (origelement.querySelector(btnclass)) {
                        origelement.querySelector(btnclass).style.display = 'none'
                    }
                }
            } else if (origelement.querySelector(btnclass)) {
                origelement.querySelector(btnclass).style.display = 'flex'
            }  
        })
    }
    function CreateRmailFeedCard(rmail) {
        const rmailcard = document.getElementById('rmailfeedcardtemplate').content.cloneNode(true)
        if (rmail.is_starred) {
            rmailcard.querySelector('.rmailstar').title = 'Unstar Rmail'
            rmailcard.querySelector('.rmailstar').className = 'rmailunstar'
        }
        if (rmail.is_read) {
            rmailcard.querySelector('.rmailmarkread').title = 'Mark Rmail as Unread'
            rmailcard.querySelector('.rmailmarkread').querySelector('img').src = '../images/misc_icons/invisible.png'
            rmailcard.querySelector('.rmailmarkread').className = 'rmailmarkunread'
        }
        rmailcard.querySelectorAll('[data-id]').forEach(card => {
            card.dataset.id = rmail.id
        })
        switch (rmail.mailbox) {
            case ('drafts'): {
                ActionBarWhitelist(['.rmailarchive', '.rmaildelete'], rmailcard, true)
                const neweditbutton = rmailcard.querySelector('.rmailarchive')
                neweditbutton.querySelector('img').src = "../images/misc_icons/edit.png"
                neweditbutton.className = 'rmailedit'
                neweditbutton.title = 'Edit Draft'

                rmailcard.querySelector('.rmaildelete').title = "Discard Draft"
                rmailcard.querySelector('.rmaildelete').className = "rmaildiscard"
                break;
            }
            case ('archive'): {
                rmailcard.querySelector('.rmailarchive').title = "Unarchive Rmail"
                rmailcard.querySelector('.rmailarchive').querySelector('img').src = "../images/misc_icons/unarchive.png"
                rmailcard.querySelector('.rmailarchive').className = "rmailunarchive"
                break;
            }
            case ('trash'): {
                rmailcard.querySelector('.rmailmarkread')?.remove()
                rmailcard.querySelector('.rmailmarkunread')?.remove()
                const permadelete = rmailcard.querySelector('.rmaildelete').cloneNode(true)
                rmailcard.querySelector('.rmaildelete').title = "Restore Rmail"
                rmailcard.querySelector('.rmaildelete').querySelector('img').src = "../images/misc_icons/undelete.png"
                rmailcard.querySelector('.rmaildelete').className = "rmailundelete"
                permadelete.className = 'rmailpermadelete'
                permadelete.title = 'Delete Rmail Permanently'
                rmailcard.querySelector('.rmailactionbuttons').appendChild(permadelete)
                break;
            }
        }
        rmailcard.querySelector('h2').textContent = RmailCapitalize(rmail.from.username || "Unknown User")
        rmailcard.querySelector('.authorpfp').src = `https://avatars.rotur.dev/${rmail.from.username || "Spectator"}`
        rmailcard.querySelector('.authorpfp').alt = RmailCapitalize(rmail.from.username || "Spectator")
        rmailcard.querySelector('.recipientpfp').src = `https://avatars.rotur.dev/${rmail.to.username || "Spectator"}`
        rmailcard.querySelector('.recipientpfp').alt = RmailCapitalize(rmail.to.username || "Spectator")
        rmailcard.querySelector('.rmailto').textContent = RmailCapitalize(rmail.to.username || "Unknown User")
        rmailcard.querySelector('.rmailpreviewbody').querySelector('h3').textContent = rmail.subject
        rmailcard.querySelector('.rmailpreviewtimestamp').textContent = ((rmail.burn_after_read ? `🔥• ` : ``) + formatDate(rmail.created_at))
        return rmailcard
    }
    function CreateRmailCard(maildata, flags) {
        if (!flags) {
            flags = {}
        }
        const rmailcard = document.getElementById('rmailcardtemplate').content.cloneNode(true)
        rmailcard.querySelector('.viewrmailauthorpfp').src = `https://avatars.rotur.dev/${maildata.from.username || "Spectator"}`
        rmailcard.querySelector('.viewrmailauthorpfp').alt = maildata.from.username || "Spectator"
        rmailcard.querySelector('.author_href').href = "lookup.html?user=" + (maildata.from.username || "Spectator")
        rmailcard.querySelector('.author_href2').href = "lookup.html?user=" + (maildata.from.username || "Spectator")
        if (flags.is_original) {
            current_rmail_view = maildata.id
            ResetActionBar()
            document.getElementById('rmailactionbarbuttons').querySelectorAll('[data-id]').forEach(card => {
                card.dataset.id = maildata.id
            })
            if (!ban_reason_cache) {
                document.getElementById('rmail_reply_receipient').placeholder = RmailCapitalize(maildata.from.username || "Unknown User")
                document.getElementById('rmail_reply_title').placeholder = ("Re: " + maildata.subject)
            }
            document.getElementById('viewrmailreply').dataset.rmailtitle = maildata.subject
            document.getElementById('viewrmailreply').dataset.rmailauthor = RmailCapitalize(maildata.from.username || "Unknown User")
            rmailcard.querySelector('.rmailreplyactionbar').remove()
            ActionBarWhitelist(['.rmailreply', ".rmailedit2", '.rmailstar', '.rmailthreads', '.rmailreport', '.rmailarchive', '.rmaildelete', '.rmailmarkread'], document.getElementById('rmailactionbarbuttons'))
            if (maildata.is_starred) {
                const unstarbtn = document.getElementById("viewrmailstar")
                unstarbtn.className = 'rmailunstar'
                unstarbtn.title = "Unstar Rmail"
                unstarbtn.id = "viewrmailunstar"
            }
            if (maildata.is_read) {
                const unreadbtn = document.getElementById("viewrmailmarkread")
                unreadbtn.className = 'rmailmarkunread'
                unreadbtn.title = "Mark Rmail as Unread"
                unreadbtn.id = "viewrmailunread"
                unreadbtn.querySelector('img').src = '../images/misc_icons/invisible.png'
            }
            document.getElementById('rmailreplyelements').style.display = 'block'
            switch (maildata.mailbox) {
                case ('drafts'): {
                    ActionBarWhitelist(['.rmailreply', '.rmaildelete'], document.getElementById('rmailactionbarbuttons'))
                    const neweditbutton = document.getElementById('viewrmailreply')
                    neweditbutton.id = 'viewrmailedit'
                    neweditbutton.setHTML(`<img src='../images/misc_icons/edit.png' width='24' height='24'>`, {sanitizer: sanitizer})
                    neweditbutton.className = 'rmailedit'
                    neweditbutton.title = 'Edit Draft'

                    const discardbtn = document.getElementById('viewrmaildelete')
                    discardbtn.title = "Discard Draft"
                    discardbtn.className = 'rmaildiscard'

                    document.getElementById('rmailreplyelements').style.display = 'none'
                    break;
                }
                case ('archive'): {
                    const unarchivebtn = document.getElementById("viewrmailarchive")
                    unarchivebtn.className = 'rmailunarchive'
                    unarchivebtn.title = "Unarchive Rmail"
                    unarchivebtn.querySelector('img').src = "../images/misc_icons/unarchive.png"
                    unarchivebtn.id = "viewrmailunarchive"
                    break;
                }
                case ('trash'): {
                    const undeletebtn = document.getElementById('viewrmailreport')
                    undeletebtn.className = 'rmailundelete'
                    undeletebtn.title = "Restore Rmail"
                    undeletebtn.querySelector('img').src = "../images/misc_icons/undelete.png"
                    undeletebtn.id = "viewrmailundelete"
                    
                    const permadeletebtn = document.getElementById('viewrmaildelete')
                    permadeletebtn.className = 'rmailpermadelete'
                    permadeletebtn.title = "Delete Rmail Permanently"
                    permadeletebtn.id = "viewrmailpermadelete"
                    break;
                }
            }
        } else {
            if (maildata.system && (maildata.system.action == "added" || maildata.system.action == "removed")) {
                rmailcard.replaceChildren(document.getElementById('replyactiontemplate').content.cloneNode(true))
                rmailcard.querySelector('li').dataset.id = maildata.id
                rmailcard.querySelector('.rmaildelete').dataset.id = maildata.id
                rmailcard.querySelector('.rmaildelete').dataset.is_reply = 'true'
                rmailcard.querySelector('.rmaildelete').style = 'margin-top: 0px;'
                rmailcard.querySelector('h3').style = 'padding-top: 5px; text-align: left;'
                rmailcard.querySelector('h3').setHTML(`${maildata.system.action == 'added' ? `&rarr; ` : `&larr; `} <a href="lookup.html?user=${maildata.system.actor}"><img src="https://avatars.rotur.dev/${maildata.system.actor}" alt="${RmailCapitalize(maildata.system.actor)}" width="24" height="24"> ${RmailCapitalize(maildata.system.actor)}</a> ${maildata.system.action} <a href="lookup.html?user=${maildata.system.target}"><img src="https://avatars.rotur.dev/${maildata.system.target}" alt="${RmailCapitalize(maildata.system.target)}" width="24" height="24"> ${RmailCapitalize(maildata.system.target)}</a> ${maildata.system.action == 'added' ? `to` : `from`} the thread.`, {sanitizer: sanitizer})
                rmailcard.querySelector('.viewrmailtimestamp').textContent = formatDate(maildata.created_at)
                return rmailcard;
            } else {
                ActionBarWhitelist(['.rmailmarkread', ".rmailedit2", '.rmailreply', '.rmailreport', '.rmaildelete'], rmailcard.querySelector('.rmailreplyactionbar'))
                rmailcard.querySelectorAll('[data-id]').forEach(card => {
                    card.dataset.id = maildata.id
                })
                rmailcard.querySelector('.rmaildelete').dataset.is_reply = 'true'
                rmailcard.querySelector('.rmailreply').dataset.rmailtitle = maildata.subject
                rmailcard.querySelector('.rmailreply').dataset.rmailauthor = RmailCapitalize(maildata.from.username || "Spectator")
                if (maildata.is_read) {
                    const unreadbtn = rmailcard.querySelector('.rmailmarkread')
                    unreadbtn.className = 'rmailmarkunread'
                    unreadbtn.title = "Mark Rmail as Unread"
                    unreadbtn.querySelector('img').src = '../images/misc_icons/invisible.png'
                }
            }
        }
        if (maildata.from.username.toLowerCase() != activeacc.name.toLowerCase()) {
            rmailcard.querySelector('.rmailedit2')?.remove()
            if (flags.is_original) {
                document.getElementById("viewrmailedit2").remove()
            }
        }
        rmailcard.querySelector('.author_href2').textContent = RmailCapitalize(maildata.from.username || "Unknown User")
        rmailcard.querySelector('.viewrmailtimestamp').textContent = ((maildata.burn_after_read ? `🔥• ` : ``) + formatDate(maildata.created_at))
        rmailcard.querySelector('.viewrmailtitletext').textContent = maildata.subject
        rmailcard.querySelector('.viewrmailrecipientpfp').src = `https://avatars.rotur.dev/${maildata.to.username || "Spectator"}`
        rmailcard.querySelector('.viewrmailrecipientpfp').alt = (maildata.to.username || "Spectator")
        rmailcard.querySelector('.recipient_href').href = "lookup.html?user=" + (maildata.to.username || "Spectator")
        rmailcard.querySelector('.viewrmailrecipient').textContent = RmailCapitalize(maildata.to.username || "Unknown User")
        rmailcard.querySelector('.viewrmailbodytext').innerText = maildata.body.includes('[RAIMG]') ? parseImage2(maildata.body) : maildata.body
        AppendImages(maildata.body, maildata.attachments, rmailcard.querySelector('.rmailimageplaceholder'))
        return rmailcard;
    }

const sent = []
const received = []
const drafts = []
const starred = []
const archived = []
const trash = []

    async function GetInbox(formdata) {
        rmail_inbox_cache = await fetch(`https://mail.rotur.dev/api/v1/mailboxes/inbox/rmails?per_page=99999999`, {
            headers: formdata
        }).then(res => res.json()).then(res => res.data).catch(err => {
            document.getElementsByClassName('container')[0].setHTML(
                `<h1>Rmail</h1>
                <hr class="full-size">
                <h3>A communication error has occurred. If you're sure it's not your connection, then this part of Rotur may be down right now.</h3>`,
            {sanitizer: sanitizer})
        })
        rmail_inbox_cache.forEach(rmail => {
            all_cache.push(rmail)
            received.push(CreateRmailFeedCard(rmail))
        })
        document.getElementById('rmail_received').textContent = `Received (${received.length})`
        if (received.length == 0) {
            document.getElementById('receivedrmailslist').replaceChildren(CreateEmptyPlaceholder(`You have not received any rmails yet.`, true))
            document.getElementById('receivedrmailslist').style = 'border: none;'
        } else {
            document.getElementById('receivedrmailslist').replaceChildren(...received)
            document.getElementById('receivedrmailslist').style = 'border: 2px solid white;'
        }
        finished_inboxes += 1
    }

    async function GetSent(formdata) {
        rmail_sent_cache = await fetch(`https://mail.rotur.dev/api/v1/mailboxes/sent/rmails?per_page=99999999`, {
            headers: formdata
        }).then(res => res.json()).then(res => res.data).catch(err => {
            document.getElementsByClassName('container')[0].setHTML(
                `<h1>Rmail</h1>
                <hr class="full-size">
                <h3>A communication error has occurred. If you're sure it's not your connection, then this part of Rotur may be down right now.</h3>`,
            {sanitizer: sanitizer})
        })
        rmail_sent_cache.forEach(rmail => {
            all_cache.push(rmail)
            sent.push(CreateRmailFeedCard(rmail))
        })
        document.getElementById('rmail_sent').textContent = `Sent (${sent.length})`
        if (sent.length == 0) {
            document.getElementById('sentrmailslist').replaceChildren(CreateEmptyPlaceholder(`You have not sent any rmails yet.`, true))
            document.getElementById('sentrmailslist').style = 'border: none;'
        } else {
            document.getElementById('sentrmailslist').replaceChildren(...sent)
            document.getElementById('sentrmailslist').style = "border: 2px solid white;"
        }
        finished_inboxes += 1
    }

    async function GetDrafts(formdata) {
        rmail_drafts_cache = await fetch(`https://mail.rotur.dev/api/v1/drafts?per_page=99999999`, {
            headers: formdata
        }).then(res => res.json()).then(res => res.data).catch(err => {
            document.getElementsByClassName('container')[0].setHTML(
                `<h1>Rmail</h1>
                <hr class="full-size">
                <h3>A communication error has occurred. If you're sure it's not your connection, then this part of Rotur may be down right now.</h3>`,
            {sanitizer: sanitizer})
        })
        rmail_drafts_cache.forEach(rmail => {
            all_cache.push(rmail)
            drafts.push(CreateRmailFeedCard(rmail))
        })
        document.getElementById('rmail_drafts').textContent = `Drafts (${drafts.length})`
        if (drafts.length == 0) {
            document.getElementById('rmaildraftslist').replaceChildren(CreateEmptyPlaceholder(`You have no drafts right now.`, true))
            document.getElementById('rmaildraftslist').style = 'border: none;'
        } else {
            document.getElementById('rmaildraftslist').replaceChildren(...drafts)
            document.getElementById('rmaildraftslist').style = "border: 2px solid white;"
        }
        finished_inboxes += 1
    }
    async function GetArchive(formdata) {
        rmail_archive_cache = await fetch(`https://mail.rotur.dev/api/v1/mailboxes/archive/rmails?per_page=99999999`, {
            headers: formdata
        }).then(res => res.json()).then(res => res.data).catch(err => {
            document.getElementsByClassName('container')[0].setHTML(
                `<h1>Rmail</h1>
                <hr class="full-size">
                <h3>A communication error has occurred. If you're sure it's not your connection, then this part of Rotur may be down right now.</h3>`,
            {sanitizer: sanitizer})
        })
        rmail_archive_cache.forEach(rmail => {
            all_cache.push(rmail)
            archived.push(CreateRmailFeedCard(rmail))
        })
        document.getElementById('rmail_archive').textContent = `Archived (${archived.length})`
        if (archived.length == 0) {
            document.getElementById('rmailarchivelist').replaceChildren(CreateEmptyPlaceholder(`You have not archived any rmails yet.`, true))
            document.getElementById('rmailarchivelist').style = 'border: none;'
        } else {
            document.getElementById('rmailarchivelist').replaceChildren(...archived)
            document.getElementById('rmailarchivelist').style = "border: 2px solid white;"
        }
        finished_inboxes += 1
    }
    async function GetTrash(formdata) {
        rmail_trash_cache = await fetch(`https://mail.rotur.dev/api/v1/mailboxes/trash/rmails?per_page=99999999`, {
            headers: formdata
        }).then(res => res.json()).then(res => res.data).catch(err => {
            document.getElementsByClassName('container')[0].setHTML(
                `<h1>Rmail</h1>
                <hr class="full-size">
                <h3>A communication error has occurred. If you're sure it's not your connection, then this part of Rotur may be down right now.</h3>`,
            {sanitizer: sanitizer})
        })
        rmail_trash_cache.forEach(rmail => {
            all_cache.push(rmail)
            trash.push(CreateRmailFeedCard(rmail))
        })
        document.getElementById('rmail_trash').textContent = `Trash (${trash.length})`
        if (trash.length == 0) {
            document.getElementById('rmailtrashlist').replaceChildren(CreateEmptyPlaceholder(`The trash can is empty right now.`, true))
            document.getElementById('rmailtrashlist').style = 'border: none;'
        } else {
            document.getElementById('rmailtrashlist').replaceChildren(...trash)
            document.getElementById('rmailtrashlist').style = 'border: 2px solid white;'
        }
        finished_inboxes += 1
    }
    async function CheckIfBanned(formdata) {
        me_cache = await fetch(`https://mail.rotur.dev/api/v1/me`, {
            headers: formdata
        }).then(res => res.json()).then(res => res.data).catch(err => {
            document.getElementsByClassName('container')[0].setHTML(
                `<h1>Rmail</h1>
                <hr class="full-size">
                <h3>A communication error has occurred. If you're sure it's not your connection, then this part of Rotur may be down right now.</h3>`,
            {sanitizer: sanitizer})
        })
        if (me_cache.is_banned) {
            document.getElementById('compose_rmail').disabled = true
            document.getElementById('compose_rmail').title = "You are currently banned from sending or replying to Rmails. In the meantime, you can still manage the properties of existing ones."
            Array.from(document.getElementsByClassName('rmailreply')).forEach(btn => {
                btn.disabled = true
                btn.title = "You are currently banned from sending or replying to Rmails. In the meantime, you can still manage the properties of existing ones."
            })
            const h4 = document.createElement('h4')
            h4.textContent = "You are currently banned from sending or replying to Rmails. In the meantime, you can still manage the properties of existing ones."
            const h4_2 = document.createElement('h4')
            h4_2.textContent = "You are currently banned from sending or replying to Rmails. In the meantime, you can still manage the properties of existing ones."
            document.getElementById('rmailcompositionbox').replaceChildren(h4)
            document.getElementById('rmailreplycompositionbox').replaceChildren(h4_2)
            if (ban_reason_cache == '') {
                const banreason = await fetch(`https://mail.rotur.dev/api/v1/rmails?to=Rotur_Assistant&subject=Ban%20Reason&body=${encodeURIComponent("This Rmail was automatically sent by Rotur Assistant in order to check a user's ban reason. Under normal circumstances, this Rmail should fail to send due to the user being banned.")}`, {
                    method: 'POST',
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return ({error: String(err)})
                })
                ban_reason_cache = banreason.error.message.substring(36, 9999999) // Get rid of the "you are banned" prefix and have just the ban reason
                document.getElementById('viewbanreasonbtn').style.display = 'block'
            }
        }
    }

    async function GetRmails() {
        all_cache = []
        sent.length = 0
        received.length = 0
        drafts.length = 0
        starred.length = 0
        archived.length = 0
        trash.length = 0
        finished_inboxes = 0

        let formdata = new FormData()
        let validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).catch(err => {
            document.getElementsByClassName('container')[0].setHTML(
                `<h1>Rmail</h1>
                <h3>A communication error has occurred. If you're sure it's not your connection, then this part of Rotur may be down right now.</h3>`,
            {sanitizer: sanitizer})
            throw new Error("A communication error has occurred.")
        })
        if (validator.error) {
            flagged.push(activeacc.uuid)
            chrome.storage.local.set({flagged: flagged})
            document.getElementsByClassName('container')[0].setHTML(
                `<h1>Rmail</h1>
                <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>`,
                {sanitizer: sanitizer}
            )
            return
        } else {
            validator = validator.validator
            formdata.append("Authorization", `Bearer ${validator}`)
        }
        const promises = []
        if (rmail_inbox_cache == '') {
            promises.push(GetInbox(formdata))
        }
        if (rmail_sent_cache == '') {
            promises.push(GetSent(formdata))
        }
        if (rmail_drafts_cache == '') {
            promises.push(GetDrafts(formdata))
        }
        if (rmail_archive_cache == '') {
            promises.push(GetArchive(formdata))
        }
        if (rmail_trash_cache == '') {
            promises.push(GetTrash(formdata))
        }
        if (me_cache == '') {
            promises.push(CheckIfBanned(formdata))
        }
        await Promise.all(promises)

        rmail_starred_cache = []
        all_cache.forEach(rmail => {
            if (rmail.is_starred) {
                rmail_starred_cache.push(rmail)
            }
        })
        rmail_starred_cache.forEach(rmail => {
            starred.push(CreateRmailFeedCard(rmail))
        })
        document.getElementById('rmail_starred').textContent = `Starred (${starred.length})`
        if (starred.length == 0) {
            document.getElementById('rmailstarredlist').replaceChildren(CreateEmptyPlaceholder(`You have not starred any rmails yet.`, true))
            document.getElementById('rmailstarredlist').style = 'border: none;'
        } else {
            document.getElementById('rmailstarredlist').replaceChildren(...starred)
            document.getElementById('rmailstarredlist').style = 'border: 2px solid white;'
        }
        rmail_archive_cache = ''
        rmail_drafts_cache = ''
        rmail_inbox_cache = ''
        rmail_sent_cache = ''
        rmail_starred_cache = ''
        rmail_trash_cache = ''
    }
    GetRmails()

    // Document Code

    document.addEventListener('click', async function(e) {
        switch (e.target.id) {
            case ('clearattachment'): {
                document.getElementById('clearattachment').style.display = 'none'
                document.getElementById('rmailimage').value = ''
                break;
            }
            case ('clearreplyattachment'): {
                document.getElementById('clearreplyattachment').style.display = 'none'
                document.getElementById('rmailreplyimage').value = ''
                break;
            }
            case ('rmailimage'): {
                if (e.shiftKey) {
                    e.preventDefault()
                    const target = e.target
                    try {
                        const clipboardItems = await navigator.clipboard.read();
                        for (const clipboardItem of clipboardItems) {
                            const imageType = clipboardItem.types.find(type => type.startsWith('image/'));
                            if (imageType) {
                                const blob = await clipboardItem.getType(imageType);
                                const file = new File([blob], `image.${blob.type.split('/')[1]}`, { type: blob.type });
                                const dataTransfer = new DataTransfer();
                                dataTransfer.items.add(file);
                                target.files = dataTransfer.files;
                                document.getElementById('clearattachment').style.display = 'flex';
                                return;
                            } else {
                                openErrorPopup('No image was detected on your clipboard.')
                            }
                        }
                    } catch (err) {
                        openErrorPopup('No image was detected on your clipboard.')
                    }
                }
                break;
            }
            case ('closebtn'): {
                closePopup()
                break;
            }
            case ('rmail_goback'):
            case ('rmail_goback2'): {
                document.getElementById('rmailpage1').style.display = 'block'
                document.getElementById('rmailpage2').style.display = 'none'
                document.getElementById('rmailpage3').style.display = 'none'
                draftprogressid = ''
                break;
            }
            case ('compose_rmail'): {
                editinginprogress = false
                document.getElementById('rmailpage1').style.display = 'none'
                document.getElementById('rmailpage3').style.display = 'block'
                if (draftprogressid) {
                    document.getElementById('rmail_comp_receipient').value = ''
                    document.getElementById('rmail_comp_title').value = ''
                    document.getElementById('rmail_comp_body').value = ''
                    draftprogressid = ''
                }
                break;
            }
            case ('viewbanreasonbtn'): {
                openErrorPopup(ban_reason_cache)
                document.getElementById('overlay').querySelector('h1').textContent = "Ban Reason"
                break;
            }
            case ('rmailnavleft'): {
                Array.from(document.getElementsByClassName('rmailtab')).forEach(tab => {
                    tab.style.display = "none"
                })
                document.getElementById('rmail_sent').style.display = 'block'
                document.getElementById('rmail_received').style.display = 'block'
                document.getElementById('rmail_starred').style.display = 'block'
                document.getElementById('rmailnavleft').style.display = 'none'
                document.getElementById('rmailnavright').style.display = 'block'
                break;
            }
            case ('rmailnavright'): {
                Array.from(document.getElementsByClassName('rmailtab')).forEach(tab => {
                    tab.style.display = "none"
                })
                document.getElementById('rmail_drafts').style.display = 'block'
                document.getElementById('rmail_archive').style.display = 'block'
                document.getElementById('rmail_trash').style.display = 'block'
                document.getElementById('rmailnavleft').style.display = 'block'
                document.getElementById('rmailnavright').style.display = 'none'
                break;
            }
            case ("reloadrmails"): {
                const target = e.target
                target.textContent = '...'
                target.disabled = true
                all_cache = ''
                rmail_archive_cache = ''
                rmail_drafts_cache = ''
                rmail_inbox_cache = ''
                rmail_sent_cache = ''
                rmail_starred_cache = ''
                rmail_trash_cache = ''
                finished_inboxes = 0
                await GetRmails()
                target.textContent = '⟳'
                target.disabled = false
                break;
            }
            case ("rmailundo"): {
                closePopup()
                const rmaildata = all_cache.find(rmail => rmail.id == e.target.dataset.id)
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const undosuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${e.target.dataset.id}/undo`, {
                    method: 'POST',
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return {error: {name: String(err)}}
                })
                if (undosuccess.error) {
                    openErrorPopup(undosuccess.error.name)
                } else {
                    document.querySelectorAll(`.rmailpreview[data-id="${e.target.dataset.id}"]`).forEach(card => {
                        card.remove()
                    })
                    all_cache = all_cache.filter(rmail => rmail.id != e.target.dataset.id)
                    document.getElementById('rmail_comp_receipient').value = rmaildata.to.username
                    document.getElementById('rmail_comp_title').value = rmaildata.subject
                    document.getElementById('rmail_comp_body').value = rmaildata.body
                    document.getElementById('burnafterreadoption').checked = rmaildata.burn_after_read
                    document.getElementById('encrypted').checked = rmaildata.is_encrypted
                    RefreshTabsAndInboxes()
                    openSuccessPopup("Rmail successfully retracted")
                }
                break;
            }
            case ('finalrmailadduser'): {
                const orig_target = e.target
                orig_target.disabled = true
                orig_target.textContent = '...'
                const currentrmail = all_cache.find(rmail => rmail.id == current_rmail_view)
                let threadusers = current_rmail.participants
                const newuser = document.getElementById('rmailthreadadduserfield').value
                if (newuser == '') {
                    orig_target.style.background = 'rgb(173, 0, 0)'
                    orig_target.disabled = false
                    orig_target.textContent = "+"
                    setTimeout(() => {
                        if (orig_target) {
                            orig_target.style = ''
                        }
                    }, 1000)
                    break;
                }
                const userexists = await fetch(`https://api.rotur.dev/exists?username=${newuser}`).then(res => res.json())
                if (!userexists.exists) {
                    orig_target.style.background = 'rgb(173, 0, 0)'
                    orig_target.disabled = false
                    orig_target.textContent = "+"
                    setTimeout(() => {
                        if (orig_target) {
                            orig_target.style = ''
                        }
                    }, 1000)
                    break;
                }
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const addsuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${current_rmail_view}/participants?username=${newuser}`, {
                    method: "POST",
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return ({error: {message: String(err)}})
                })
                if (addsuccess.error) {
                    orig_target.style.background = 'rgb(173, 0, 0)'
                    orig_target.disabled = false
                    orig_target.textContent = "+"
                    setTimeout(() => {
                        if (orig_target) {
                            orig_target.style = ''
                        }
                    }, 1000)
                    break;
                } else {
                    document.getElementById('rmailthreadadduserfield').value = ''
                    threadusers.push({username: newuser.toLowerCase()})
                    const usercard = document.getElementById('threaduserentry').content.cloneNode(true)
                    usercard.querySelector('li').dataset.user = newuser.toLowerCase()
                    usercard.querySelector('a').href = `lookup.html?user=${RmailCapitalize(newuser.toLowerCase())}`
                    usercard.querySelector('p').textContent = (RmailCapitalize(newuser.toLowerCase()) + ((currentrmail.owner.toLowerCase() == newuser.toLowerCase()) ? " 👑" : ""))
                    usercard.querySelector('img').src = `https://avatars.rotur.dev/${newuser}`
                    usercard.querySelector('img').alt = RmailCapitalize(newuser.toLowerCase())
                    usercard.querySelector('button').dataset.user = newuser.toLowerCase()
                    if ((currentrmail.owner.toLowerCase() != activeacc.name.toLowerCase()) || (newuser.toLowerCase() == activeacc.name.toLowerCase())) {
                        usercard.querySelector('button').remove()
                    }
                    if (!document.getElementById('rmailthreadpopuplist').querySelector('li')) {
                        document.getElementById('rmailthreadpopuplist').replaceChildren()
                    }
                    document.getElementById('rmailthreadpopuplist').appendChild(usercard)
                }
                orig_target.disabled = false
                orig_target.textContent = "+"
                break;
            }
        }
        switch (e.target.className) {
            case ('rmailtab'): {
                Array.from(document.getElementsByClassName('rmailtab')).forEach(tab => {
                    tab.style.borderBottom = "none"
                })
                e.target.style.borderBottom = "2px solid white"
                document.getElementById('rmailsenttab').style.display = ((e.target.id == 'rmail_sent') ? 'block' : 'none')
                document.getElementById('rmailreceivedtab').style.display = ((e.target.id == 'rmail_received') ? 'block' : 'none')
                document.getElementById('rmailstarredtab').style.display = ((e.target.id == 'rmail_starred') ? 'block' : 'none')
                document.getElementById('rmaildraftstab').style.display = ((e.target.id == 'rmail_drafts') ? 'block' : 'none')
                document.getElementById('rmailarchivetab').style.display = ((e.target.id == 'rmail_archive') ? 'block' : 'none')
                document.getElementById('rmailtrashtab').style.display = ((e.target.id == 'rmail_trash') ? 'block' : 'none')
                break;
            }
            case ('rmailpreview'): {
                const maildata = all_cache.find(rmail => rmail.id == e.target.dataset.id)
                current_rmail = maildata
                document.getElementById('original_rmail').replaceChildren(CreateRmailCard(maildata, {is_original: true}))
                document.getElementById('rmailpage2').style.display = 'block'
                document.getElementById('rmailpage1').style.display = 'none'
                scrollTo(0, 0)
                if (!me_cache.is_banned) {
                    document.getElementById('rmail_reply_receipient').value = ''
                    document.getElementById('rmail_reply_title').value = ''
                    document.getElementById('rmail_reply_comp_body').value = ''
                    document.getElementById('rmailreplyimage').value = ''
                    document.getElementById('replyencrypted').checked = false
                    document.getElementById('clearreplyattachment').disabled = false
                    document.getElementById('clearreplyattachment').style.display = 'none'
                }
                if (maildata.replies.length) {
                    document.getElementById('rmailreplyhr').style.display = 'block'
                    document.getElementById('rmailreplies').style.display = 'block'
                    document.getElementById('rmailreplies').replaceChildren(CreateEmptyPlaceholder('Loading Replies...'))
                    const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                    const formdata = new FormData()
                    formdata.append("Authorization", `Bearer ${validator}`)
                    const rmailthread = await fetch(`https://mail.rotur.dev/api/v1/rmails/${maildata.id}/thread`, {
                        headers: formdata
                    }).then(res => res.json()).catch(err => {
                        return ({error: String(err)})
                    })
                    if (rmailthread.error) {
                        openErrorPopup(rmailthread.error)
                        document.getElementById('rmailreplyhr').style.display = 'none'
                        document.getElementById('rmailreplies').style.display = 'none'
                    } else {
                        const replies = rmailthread.data.replies
                        replies_cache = [...replies]
                        const reply_elements = []
                        replies.forEach(reply => {
                            const li = document.createElement('li')
                            li.dataset.id = reply.id
                            li.replaceChildren(CreateRmailCard(reply, {}))
                            reply_elements.push(li)
                        })
                        document.getElementById('rmailreplies').replaceChildren(...reply_elements)
                    }
                } else {
                    replies_cache = []
                    document.getElementById('rmailreplyhr').style.display = 'none'
                    document.getElementById('rmailreplies').style.display = 'none'
                    document.getElementById('rmailreplies').replaceChildren()
                }
                if (me_cache.is_banned) {
                    document.querySelectorAll('.rmailreply, .rmailedit, .rmailedit2').forEach(rmailbtn => {
                        rmailbtn.disabled = true
                        rmailbtn.title = "This action is unavailable since you are currently banned from Rmail."
                    })
                }
                break;
            }
            case ('rmailreply'): {
                if (me_cache.is_banned) {
                    e.target.disabled = true;
                    break;
                }
                document.getElementById('rmail_reply_receipient').value = (e.target.dataset.rmailauthor ? e.target.dataset.rmailauthor : '')
                if (e.target.dataset.rmailtitle) {
                    const potentialrmailtitle = `Re: ${e.target.dataset.rmailtitle}`
                    const re_count = potentialrmailtitle.split('Re: ').length - 1
                    const originaltitle = potentialrmailtitle.split('Re: ')[re_count]
                    let finalvalue = hasSuperscript(e.target.dataset.rmailtitle) ? incrementSuperscriptChain(e.target.dataset.rmailtitle) : (re_count > 1 ? `Re${toSuperscript(String(re_count))}: ${originaltitle}` : potentialrmailtitle)
                    if (finalvalue.endsWith(')') && e.target.dataset.rmailtitle.startsWith('(Re:')) {
                        finalvalue = finalvalue.slice(0, -1)
                    }
                    document.getElementById('rmail_reply_title').value = finalvalue
                } else {
                    document.getElementById('rmail_reply_title').value = ''
                }
                scrollTo(0, 99999999)
                break;
            }
            case ('finalmarkread'): {
                closePopup() // No break here is intentional
            }
            case ('rmailmarkread'): {
                const rmaildata = (all_cache.find(rmail => rmail.id == e.target.dataset.id) ?? replies_cache.find(rmail => rmail.id == e.target.dataset.id))
                if (rmaildata.burn_after_read && (e.target.className == 'rmailmarkread')) {
                    openMarkReadPopup(e.target.dataset.id)
                } else {
                    const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                    const formdata = new FormData()
                    formdata.append("Authorization", `Bearer ${validator}`)
                    const readsuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${e.target.dataset.id}/read`, {
                        method: 'POST',
                        headers: formdata
                    }).then(res => res.json()).catch(err => {
                        return {error: {name: String(err)}}
                    })
                    if (readsuccess.error) {
                        openErrorPopup(readsuccess.error.name)
                    } else {
                        document.querySelectorAll(`.rmailmarkread[data-id="${e.target.dataset.id}"]`).forEach(btn => {
                            btn.className = 'rmailmarkunread'
                            btn.querySelector('img').src = '../images/misc_icons/invisible.png'
                            btn.title = 'Mark Rmail as Unread'
                        })
                        rmaildata.is_read = true
                        if (e.target.className == 'finalmarkread') {
                            openSuccessPopup('Successfully marked Rmail as read. Do note that the next time you open the Rmail app or refresh the feed, this Rmail will be gone.')
                        }
                    }
                }
                break;
            }
            case ('rmailmarkunread'): {
                const rmaildata = all_cache.find(rmail => rmail.id == e.target.dataset.id)
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const readsuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${e.target.dataset.id}/unread`, {
                    method: 'POST',
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return {error: {name: String(err)}}
                })
                if (readsuccess.error) {
                    openErrorPopup(readsuccess.error.name)
                } else {
                    document.querySelectorAll(`.rmailmarkunread[data-id="${e.target.dataset.id}"]`).forEach(btn => {
                        btn.className = 'rmailmarkread'
                        btn.querySelector('img').src = '../images/misc_icons/visible.png'
                        btn.title = 'Mark Rmail as Read'
                    })
                    rmaildata.is_read = false
                }
                break;
            }
            case ('rmailstar'): {
                const rmaildata = all_cache.find(rmail => rmail.id == e.target.dataset.id)
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const starsuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${e.target.dataset.id}/star`, {
                    method: 'POST',
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return {error: {name: String(err)}}
                })
                if (starsuccess.error) {
                    openErrorPopup(starsuccess.error.name)
                } else {
                    document.querySelectorAll(`.rmailstar[data-id="${e.target.dataset.id}"]`).forEach(btn => {
                        btn.className = 'rmailunstar'
                        btn.title = 'Unstar Rmail'
                    })
                    if (document.getElementById('rmailstarredlist').querySelector('h2') && !document.getElementById('rmailstarredlist').querySelector('li')) {
                        document.getElementById('rmailstarredlist').querySelector('h2').remove()
                    }
                    document.getElementById('rmailstarredlist').prepend(CreateRmailFeedCard(starsuccess.data))
                    RefreshTabsAndInboxes()
                    rmaildata.is_starred = true
                }
                break;
            }
            case ('rmailunstar'): {
                const rmaildata = all_cache.find(rmail => rmail.id == e.target.dataset.id)
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const unstarsuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${e.target.dataset.id}/unstar`, {
                    method: 'POST',
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return {error: {name: String(err)}}
                })
                if (unstarsuccess.error) {
                    openErrorPopup(unstarsuccess.error.name)
                } else {
                    document.querySelectorAll(`.rmailunstar[data-id="${e.target.dataset.id}"]`).forEach(btn => {
                        btn.className = 'rmailstar'
                        btn.title = 'Star Rmail'
                    })
                    document.getElementById('rmailstarredlist').querySelectorAll(`.rmailpreview[data-id="${e.target.dataset.id}"]`).forEach(rmailelement => {
                        rmailelement.remove()
                    })
                    RefreshTabsAndInboxes()
                    rmaildata.is_starred = false
                }
                break;
            }
            case ('rmaildelete'): {
                if (e.target.dataset.is_reply) {
                    openPermaDeletePopup(e.target.dataset.id, 'true')
                } else {
                    openDeletePopup(e.target.dataset.id)
                }
                break;
            }
            case ('rmaildiscard'): {
                openDiscardPopup(e.target.dataset.id)
                break;
            }
            case ('rmailundelete'): {
                openUndeletePopup(e.target.dataset.id)
                break;
            }
            case ('rmailpermadelete'): {
                openPermaDeletePopup(e.target.dataset.id)
                break;
            }
            case ('rmailarchive'): {
                openArchivePopup(e.target.dataset.id)
                break;
            }
            case ('rmailunarchive'): {
                openUnarchivePopup(e.target.dataset.id)
                break;
            }
            case ('rmailreport'): {
                openReportPopup(e.target.dataset.id)
                break;
            }
            case ('rmailedit'): {
                if (me_cache.is_banned) {
                    e.target.disabled = true
                    break;
                }
                editinginprogress = false
                draftprogressid = e.target.dataset.id
                document.getElementById('rmailpage1').style.display = 'none'
                document.getElementById('rmailpage2').style.display = 'none'
                document.getElementById('rmailpage3').style.display = 'block'
                const draftdata = all_cache.find(rmail => rmail.id == e.target.dataset.id)
                document.getElementById('rmail_comp_receipient').value = draftdata.to.username
                document.getElementById('rmail_comp_title').value = draftdata.subject
                document.getElementById('rmail_comp_body').value = draftdata.body
                document.getElementById('burnafterreadoption').checked = draftdata.burn_after_read
                document.getElementById('burnafterreadoption').checked = draftdata.is_encrypted
                break;
            }
            case ('rmailedit2'): {
                if (me_cache.is_banned) {
                    e.target.disabled = true
                    break;
                }
                const rmaildata = (all_cache.find(rmail => rmail.id == e.target.dataset.id) ?? replies_cache.find(rmail => rmail.id == e.target.dataset.id))
                const is_reply = replies_cache.some(rmail => rmail.id == e.target.dataset.id)
                openEditRmailPopup(rmaildata.id, rmaildata.subject, rmaildata.body, rmaildata.is_encrypted, String(is_reply))
                break;
            }
            case ('rmailthreads'): {
                const rmaildata = all_cache.find(rmail => rmail.id == e.target.dataset.id)
                openThreadManagerPopup(rmaildata.participants, rmaildata.owner)
                break;
            }
            case ('rmailthreadremoveuser'): {
                e.preventDefault()
                const target = e.target
                target.disabled = true
                target.textContent = '...'
                const currentrmail = all_cache.find(rmail => rmail.id == current_rmail_view)
                let threadusers = current_rmail.participants
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const removesuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${current_rmail_view}/participants/${e.target.dataset.user}`, {
                    method: "DELETE",
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return ({error: {message: String(err)}})
                })
                if (removesuccess.error) {
                    target.style.background = 'rgb(173, 0, 0)'
                    target.disabled = false
                    target.textContent = '✕'
                    setTimeout(() => {
                        if (target) {
                            target.style = ''
                        }
                    }, 1000)
                } else {
                    document.getElementById('rmailthreadpopuplist').querySelector(`li[data-user="${e.target.dataset.user}"]`)?.remove()
                    threadusers = threadusers.filter(user => user.username.toLowerCase() != e.target.dataset.user.toLowerCase())
                }
                break;
            }
            // Final actions
            case ('finaledit'): {
                closePopup()
                const id = e.target.dataset.id
                const newsubject = document.getElementById('editrmailtitle').value
                const newbody = document.getElementById('editrmailbody').value
                const newencryption = document.getElementById('editencrypted').checked
                const is_reply = e.target.dataset.is_reply
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const editsuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${id}/edit?subject=${encodeURIComponent(newsubject)}&body=${encodeURIComponent(newbody)}&encrypted=${newencryption}`, {
                    method: "POST",
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return ({error: {message: String(err)}})
                })
                if (editsuccess.error) {
                    openErrorPopup(editsuccess.error.message)
                } else {
                    if (is_reply == 'true') {
                        openSuccessPopup('Reply edited successfully')
                        const body = document.getElementById('rmailreplies').querySelector(`li[data-id="${id}"]`)
                        body.querySelector('h2').textContent = newsubject
                        body.querySelector('.viewrmailbodytext').textContent = (newbody.includes("[RAIMG]") ? parseImage2(newbody) : newbody)
                        replies_cache.find(reply => reply.id == id).subject = newsubject
                        replies_cache.find(reply => reply.id == id).body = newbody
                        AppendImages(newbody, replies_cache.find(reply => reply.id == id).attachments, body.querySelector('.rmailimageplaceholder'))
                    } else {
                        openSuccessPopup('Rmail edited successfully')
                        const base = document.getElementById('original_rmail')
                        base.querySelector('.viewrmailtitletext').textContent = newsubject
                        base.querySelector('.viewrmailbodytext').textContent = (newbody.includes("[RAIMG]") ? parseImage2(newbody) : newbody)
                        document.querySelectorAll(`.rmailpreview[data-id="${id}"]`).forEach(body => {
                            body.querySelector('h3').textContent = newsubject
                        })
                        all_cache.find(rmail => rmail.id == id).subject = newsubject
                        all_cache.find(rmail => rmail.id == id).body = newbody
                        AppendImages(newbody, all_cache.find(rmail => rmail.id == id).attachments, base.querySelector('.rmailimageplaceholder'))
                    }
                }
                break;
            }
            case ('finaldelete'): {
                closePopup()
                const rmaildata = all_cache.find(rmail => rmail.id == e.target.dataset.id)
                const id = e.target.dataset.id
                const permadelete = document.getElementById('permadeleteinstead').checked
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const deletesuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${id}${permadelete ? `` : `/trash`}`, {
                    method: (permadelete ? "DELETE" : "POST"),
                    headers: formdata
                }).catch(err => {
                    return ({error: String(err)})
                })
                const deletestatus = deletesuccess.status
                const deletedata = await (async () => {
                    try {
                        const deletejson = await deletesuccess.json()
                        return deletejson
                    } catch {
                        return ({error: "An unexpected error occurred"})
                    }
                })()
                if (deletestatus > 399) {
                    openErrorPopup("An error occurred while deleting this Rmail")
                } else {
                    openSuccessPopup(permadelete ? "Rmail deleted successfully" : "Rmail moved to trash")
                    document.querySelectorAll(`.rmailpreview[data-id="${id}"]`).forEach(rmailelement => {
                        rmailelement.remove()
                    })
                    if (!permadelete) {
                        if (!document.getElementById('rmailtrashlist').querySelector('li')) {
                            document.getElementById('rmailtrashlist').replaceChildren()
                        }
                        rmaildata.mailbox = 'trash'
                        document.getElementById('rmailtrashlist').prepend(CreateRmailFeedCard(deletedata.data))
                    } else {
                        document.getElementById('rmailpage1').style.display = 'block'
                        document.getElementById('rmailpage2').style.display = 'none'
                        document.getElementById('rmailpage3').style.display = 'none'
                    }
                    RefreshTabsAndInboxes()
                }
                break;
            }
            case ('finaldiscard'):
            case ('finalpermadelete'): {
                closePopup()
                const origin = e.target.className
                const id = e.target.dataset.id
                const is_reply = e.target.dataset.is_reply
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const deletesuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${id}`, {
                    method: 'DELETE',
                    headers: formdata
                }).then(res => res.status).catch(err => {
                    return ({error: String(err)})
                })
                if (deletesuccess > 399) {
                    openErrorPopup("An error occurred while deleting this Rmail")
                } else {
                    openSuccessPopup((origin == 'finaldiscard') ? "Rmail discarded successfully." : "Rmail deleted successfully.")
                    document.querySelectorAll(`.rmailpreview[data-id="${e.target.dataset.id}"]`).forEach(rmailelement => {
                        rmailelement.remove()
                    })
                    if (is_reply == 'true') {
                        const original_post = all_cache.find(rmail => rmail.id == current_rmail_view)
                        original_post.replies = original_post.replies.filter(newreply => newreply != id)
                        document.getElementById('rmailreplies').querySelectorAll(`[data-id="${id}"]`).forEach(rmailelement => {
                            rmailelement.remove()
                        })
                        if (document.getElementById('rmailreplies').childElementCount == 0) {
                            document.getElementById('rmailreplyhr').style.display = 'none'
                            document.getElementById('rmailreplies').style.display = 'none'
                        }
                    }
                    RefreshTabsAndInboxes()
                    if (!is_reply) {
                        document.getElementById('rmailpage1').style.display = 'block'
                        document.getElementById('rmailpage2').style.display = 'none'
                        document.getElementById('rmailpage3').style.display = 'none'
                    }
                }
                break;
            }
            case ('finalreport'): {
                closePopup()
                const id = e.target.dataset.id
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const reportsuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${id}/report?reason=${encodeURIComponent(document.getElementById('rmailreportfield').value)}`, {
                    method: 'POST',
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return ({error: String(err)})
                })
                if (reportsuccess.error) {
                    openErrorPopup(reportsuccess.error)
                } else {
                    openSuccessPopup("Rmail reported successfully.")
                }
                break;
            }
            case ('finalundelete'): {
                closePopup()
                const rmaildata = all_cache.find(rmail => rmail.id == e.target.dataset.id)
                const id = e.target.dataset.id
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const deletesuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${id}/restore`, {
                    method: "POST",
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return ({error: String(err)})
                })
                if (deletesuccess.error) {
                    openErrorPopup(deletesuccess.error)
                } else {
                    openSuccessPopup("Rmail restored successfully")
                    document.querySelectorAll(`.rmailpreview[data-id="${e.target.dataset.id}"]`).forEach(rmailelement => {
                        rmailelement.remove()
                    })
                    const restoremailbox = rmail_inbox_map[deletesuccess.data.mailbox]
                    if (document.getElementById(restoremailbox).querySelector('h2') && !document.getElementById(restoremailbox).querySelector('li')) {
                        document.getElementById(restoremailbox).querySelector('h2').remove()
                    }
                    document.getElementById(restoremailbox).prepend(CreateRmailFeedCard(deletesuccess.data))
                    rmaildata.mailbox = restoremailbox
                    RefreshTabsAndInboxes()
                }
                break;
            }
            case ('finalarchive'): {
                closePopup()
                const rmaildata = all_cache.find(rmail => rmail.id == e.target.dataset.id)
                const id = e.target.dataset.id
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const archivesuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${id}/archive`, {
                    method: "POST",
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return ({error: String(err)})
                })
                if (archivesuccess.error) {
                    openErrorPopup(archivesuccess.error.message)
                } else {
                    openSuccessPopup("Rmail archived successfully")
                    document.querySelectorAll(`.rmailpreview[data-id="${e.target.dataset.id}"]`).forEach(rmailelement => {
                        rmailelement.remove()
                    })
                    if (document.getElementById('rmailarchivelist').querySelector('h2') && !document.getElementById('rmailarchivelist').querySelector('li')) {
                        document.getElementById('rmailarchivelist').querySelector('h2').remove()
                    }
                    document.getElementById('rmailarchivelist').prepend(CreateRmailFeedCard(archivesuccess.data))
                    RefreshTabsAndInboxes()
                    document.querySelectorAll(`.rmailarchive[data-id="${e.target.dataset.id}"]`).forEach(btn => {
                        btn.className = 'rmailunarchive'
                        btn.querySelector('img').src = '../images/misc_icons/unarchive.png'
                        btn.title = 'Unarchive Rmail'
                    })
                    rmaildata.mailbox = 'archive'
                }
                break;
            }
            case ('finalunarchive'): {
                closePopup()
                const rmaildata = all_cache.find(rmail => rmail.id == e.target.dataset.id)
                const id = e.target.dataset.id
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const unarchivesuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${id}/unarchive`, {
                    method: "POST",
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return ({error: String(err)})
                })
                if (unarchivesuccess.error) {
                    openErrorPopup(unarchivesuccess.error.message)
                } else {
                    openSuccessPopup("Rmail unarchived successfully")
                    document.querySelectorAll(`.rmailpreview[data-id="${e.target.dataset.id}"]`).forEach(rmailelement => {
                        rmailelement.remove()
                    })
                    const restoremailbox = rmail_inbox_map[unarchivesuccess.data.mailbox]
                    if (document.getElementById(restoremailbox).querySelector('h2') && !document.getElementById(restoremailbox).querySelector('li')) {
                        document.getElementById(restoremailbox).querySelector('h2').remove()
                    }
                    document.getElementById(restoremailbox).prepend(CreateRmailFeedCard(unarchivesuccess.data))
                    RefreshTabsAndInboxes()
                    document.querySelectorAll(`.rmailunarchive[data-id="${e.target.dataset.id}"]`).forEach(btn => {
                        btn.className = 'rmailarchive'
                        btn.querySelector('img').src = '../images/misc_icons/archive.png'
                        btn.title = 'Archive Rmail'
                    })
                    rmaildata.mailbox = restoremailbox
                }
                break;
            }
        }
    })

    document.getElementById('rmailcompositionbox').addEventListener('submit', async function(e) {
        e.preventDefault();
        const recipient = document.getElementById('rmail_comp_receipient').value
        const title = document.getElementById('rmail_comp_title').value
        const body = document.getElementById('rmail_comp_body').value
        const postbutton = document.getElementById('send_rmail')
        const draftbutton = document.getElementById('rmailsavedraft')
        const burn = document.getElementById('burnafterreadoption').checked
        const encrypted = document.getElementById('encrypted').checked

        if (recipient == '') {
            openErrorPopup('Enter a valid recipient.')
            return;
        } else if (title == '') {
            openErrorPopup('Please enter a Title.')
            return;
        } else if (body == '' && !document.getElementById('rmailimage').files[0]) {
            openErrorPopup("You can't send a blank rmail.")
            return;
        } else if (title.length > 100) {
            openErrorPopup('Title cannot exceed 100 characters')
        } else if (body.length > 50000){
            openErrorPopup('Body cannot exceed 50,000 characters (Rmail has a packet limit of 50 KB)')
        }
        if (e.submitter.id == 'rmailsavedraft') {
            const draftdata = draftprogressid ? all_cache.find(rmail => rmail.id == draftprogressid) : {attachments: []}
            draftbutton.disabled = true
            postbutton.disabled = true
            draftbutton.textContent = 'Saving...'
            let potentialattachment = draftdata.attachments
            document.getElementById('clearattachment').disabled = true
            const attachments = document.getElementById('rmailimage').files
            if (attachments.length > 0) {
                potentialattachment = []
                for (let i=0; i<attachments.length; i++) {
                    const newimg = await UploadImage(attachments[i], (preferredcdn == 'ochost' ? 'ochost' : 'mistiums3'), true)
                    if (!newimg) {
                        openErrorPopup('One of your attachments failed to upload')
                        draftbutton.disabled = false
                        postbutton.disabled = false
                        draftbutton.textContent = 'Save Draft'
                        return;
                    } else {
                        potentialattachment.push(newimg)
                    }
                }
            }
            const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
            const formdata = new FormData()
            formdata.append("Authorization", `Bearer ${validator}`)
            const sendsuccess = await fetch(`https://mail.rotur.dev/api/v1/drafts?to=${recipient}&subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&attachments=${encodeURIComponent(JSON.stringify(potentialattachment))}${burn ? `&burn_after_read=true` : ``}${encrypted ? `&encrypted=true` : ``}${draftprogressid ? `&id=${draftprogressid}` : ``}`, {
                method: 'POST',
                headers: formdata
            }).then(res => res.json()).catch(err => {
                return ({error: String(err)})
            })
            if (sendsuccess.error) {
                if (typeof sendsuccess.error != 'string') {
                    openErrorPopup(sendsuccess.error.message ?? "An unknown error occurred")
                } else {
                    openErrorPopup(sendsuccess.error ?? "An unknown error occurred")
                }
            } else {
                openSuccessPopup("Draft saved successfully!")
                if (!draftprogressid) {
                    draftprogressid = sendsuccess.data.id
                }
                if (all_cache.some(rmail => rmail.id == sendsuccess.data.id)) {
                    document.querySelector(`.rmailpreview[data-id="${sendsuccess.data.id}"]`).replaceWith(CreateRmailFeedCard(sendsuccess.data))
                } else {
                    if (!document.getElementById('rmaildraftslist').querySelector('li')) {
                        document.getElementById('rmaildraftslist').replaceChildren()
                    }
                    document.getElementById('rmaildraftslist').appendChild(CreateRmailFeedCard(sendsuccess.data))
                    all_cache.push(sendsuccess.data)
                    RefreshTabsAndInboxes()
                }
            }
            draftbutton.disabled = false
            postbutton.disabled = false
            draftbutton.textContent = 'Save Draft'
        } else {
            postbutton.disabled = true
            draftbutton.disabled = true
            postbutton.textContent = 'Sending...'
            const recipient_exists = await fetch('https://api.rotur.dev/exists?username=' + recipient).then(res => res.json())
            if ((recipient_exists.exists && !recipient_exists.error) || recipient.includes('@')) {
                let potentialattachment = []
                document.getElementById('clearattachment').disabled = true

                const attachments = document.getElementById('rmailimage').files

                if (attachments.length > 0) {
                    for (let i=0; i<attachments.length; i++) {
                        const newimg = await UploadImage(attachments[i], (preferredcdn == 'ochost' ? 'ochost' : 'mistiums3'), true)
                        if (!newimg) {
                            openErrorPopup('One of your attachments failed to upload')
                            postbutton.disabled = false
                            draftbutton.disabled = false
                            postbutton.textContent = 'Send →'
                            return;
                        } else {
                            potentialattachment.push(newimg)
                        }
                    }
                }
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
                const formdata = new FormData()
                formdata.append("Authorization", `Bearer ${validator}`)
                const sendsuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails?to=${recipient}&subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&attachments=${encodeURIComponent(JSON.stringify(potentialattachment))}${burn ? `&burn_after_read=true` : ``}${encrypted ? `&encrypted=true` : ``}`, {
                    method: 'POST',
                    headers: formdata
                }).then(res => res.json()).catch(err => {
                    return ({error: String(err)})
                })
                if (sendsuccess.error) {
                    if (typeof sendsuccess.error != 'string') {
                        openErrorPopup(sendsuccess.error.message ?? "An unknown error occurred")
                    } else {
                        openErrorPopup(sendsuccess.error ?? "An unknown error occurred")
                    }
                } else {
                    openSuccessPopup("Rmail sent successfully!")
                    const undobtn = document.createElement('button')
                    undobtn.id = 'rmailundo'
                    undobtn.dataset.id = sendsuccess.data.id
                    undobtn.textContent = "Undo"
                    if (draftprogressid) {
                        undobtn.dataset.was_draft = "true"
                    }
                    document.getElementById('popup-choices').prepend(undobtn)
                    setTimeout(() => {
                        if (document.getElementById('rmailundo')) {
                            document.getElementById('rmailundo').disabled = true
                        }
                    }, 30000)
                    document.getElementById('rmailcompositionbox').reset()
                    document.getElementById('burnafterreadoption').checked = false
                    document.getElementById('encrypted').checked = false
                    document.getElementById('clearattachment').disabled = false
                    document.getElementById('clearattachment').style.display = 'none'
                    all_cache.push(sendsuccess.data)
                    if (!document.getElementById('sentrmailslist').querySelector('li')) {
                        document.getElementById('sentrmailslist').replaceChildren()
                    }
                    document.getElementById('sentrmailslist').prepend(CreateRmailFeedCard(sendsuccess.data))
                    if (draftprogressid) {
                        const deletedraftsuccess = await fetch(`https://mail.rotur.dev/api/v1/drafts/${draftprogressid}`, {
                            method: 'DELETE',
                            headers: formdata
                        }).then(res => res.json()).catch(err => {
                            return ({error: String(err)})
                        })
                        document.getElementById('rmaildraftslist').querySelectorAll(`[data-id="${draftprogressid}"]`).forEach(rmailelement => {
                            rmailelement.remove()
                        })
                        draftprogressid = ''
                    }
                    RefreshTabsAndInboxes()
                }            
            } else {
                openErrorPopup('Recipient does not exist')
            }
            postbutton.disabled = false
            draftbutton.disabled = false
            postbutton.textContent = 'Send →'
        }
    })

    document.getElementById('rmailreplycompositionbox').addEventListener('submit', async function(e) {
        e.preventDefault();
        const rmaildata = all_cache.find(rmail => rmail.id == current_rmail.id)
        const recipient = (document.getElementById('rmail_reply_receipient').value || current_rmail.from.username)
        const title = (document.getElementById('rmail_reply_title').value || `Re: ${current_rmail.subject}`)
        const body = document.getElementById('rmail_reply_comp_body').value
        const postbutton = document.getElementById('send_rmail_reply')
        const encrypted = document.getElementById('replyencrypted').checked

        if (recipient == '') {
            openErrorPopup('Invalid recipient.')
            return;
        } else if (title == '') {
            openErrorPopup('Invalid Title.')
            return;
        } else if (body == '' && !document.getElementById('rmailimage').files[0]) {
            openErrorPopup("You can't send a blank reply.")
            return;
        } else if (title.length > 100) {
            openErrorPopup('Title cannot exceed 100 characters')
        } else if (body.length > 50000){
            openErrorPopup('Body cannot exceed 50,000 characters (Rmail has a packet limit of 50 KB)')
        }
        postbutton.disabled = true
        postbutton.textContent = 'Sending...'
        const recipient_exists = await fetch('https://api.rotur.dev/exists?username=' + recipient).then(res => res.json())
        if ((recipient_exists.exists && !recipient_exists.error) || recipient.includes('@')) {
            let potentialattachment = []
            document.getElementById('clearattachment').disabled = true

            const attachments = document.getElementById('rmailreplyimage').files

            if (attachments.length > 0) {
                for (let i=0; i<attachments.length; i++) {
                    const newimg = await UploadImage(attachments[i], (preferredcdn == 'ochost' ? 'ochost' : 'mistiums3'), true)
                    if (!newimg) {
                        openErrorPopup('One of your attachments failed to upload')
                        postbutton.disabled = false
                        postbutton.textContent = 'Send →'
                        return;
                    } else {
                        potentialattachment.push(newimg)
                    }
                }
            }
            const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${encodeURIComponent(activeacc.token)}&key=rotur-mail`).then(res => res.json()).then(res => res.validator)
            const formdata = new FormData()
            formdata.append("Authorization", `Bearer ${validator}`)
            const sendsuccess = await fetch(`https://mail.rotur.dev/api/v1/rmails/${current_rmail.id}/reply?to=${recipient}&subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&attachments=${encodeURIComponent(JSON.stringify(potentialattachment))}${encrypted ? `&encrypted=true` : ``}`, {
                method: 'POST',
                headers: formdata
            }).then(res => res.json()).catch(err => {
                return ({error: String(err)})
            })
            if (sendsuccess.error) {
                if (typeof sendsuccess.error != 'string') {
                    openErrorPopup(sendsuccess.error.message)
                } else {
                    openErrorPopup(sendsuccess.error)
                }
            } else {
            //    openSuccessPopup("Reply sent successfully!")
                document.getElementById('rmailreplycompositionbox').reset()
                document.getElementById('replyencrypted').checked = false
                document.getElementById('clearreplyattachment').disabled = false
                document.getElementById('clearreplyattachment').style.display = 'none'
                document.getElementById('rmailreplies').style.display = 'block'
                document.getElementById('rmailreplyhr').style.display = 'block'
                document.getElementById('rmailreplies').appendChild(CreateRmailCard(sendsuccess.data, {}))
                rmaildata.replies.push(sendsuccess.data.id)
            }            
        } else {
            openErrorPopup('Recipient does not exist')
        }
        postbutton.disabled = false
        postbutton.textContent = 'Send →'
    })
}
if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    document.getElementById('rmailimage').addEventListener('change', async function(e) {
        document.getElementById('clearattachment').style.display = 'flex'
    })
    document.getElementById('rmailreplyimage').addEventListener('change', async function(e) {
        document.getElementById('clearreplyattachment').style.display = 'flex'
    })
}