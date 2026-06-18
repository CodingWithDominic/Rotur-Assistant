let userdata_cache = ''
let altdata_cache = ''
let image_cache = ''
let blacklisted_ips = []
let tosrecentlyaccepted = false
let cosmetic_cache = ''
let active_cache = ''

const config = {
    elements: ['p', 'img', 'div', 'h1', 'h2', 'h3', 'h4', 'button', 'ul', 'li', 'select', 'option', 'input', 'hr', 'a', 'label', 'span'],
    attributes: ['src', 'alt', 'href', 'width', 'height', 'id', 'class', 'data', 'value', 'title', 'disabled', 'type', 'placeholder', 'step', 'rel', 'target']
}
const sanitizer = new Sanitizer(config)

import { sanitize, formatDate, parseHTML, openErrorPopup, openWarningPopup, openSuccessPopup, MiniError, CreateEmptyPlaceholder } from "../index.js"

const accounts = await new Promise(resolve =>
        chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
    ) ?? [];

let activeobject = ''

const profile_keys = ['username', 'pronouns', 'bio', 'display_name', 'email', 'phone', 'system', 'private']

let old_values = []
let new_values = []
let question_cache = ''

let biocharlimit = 200;

const activeacc = await new Promise(resolve =>
        chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
    ) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

const settings = await new Promise(resolve =>
        chrome.storage.local.get('settings', data => resolve(data.settings || "00000000"))
    ) ?? "00000000";

let systems = []
let systemcache = ''

let premium = false;

const controller = new AbortController()
const requestlimit = setTimeout(() => controller.abort(), 5000);

const known_badges = ['Architext', "Asier System", "Bugger", "colon three", "dev", "discord", "friendly", "gingerbug", "Nex", "originOS", "orion", "pro", "rich", "Spark", "rotur", "Constellinux", "HuopaOS", "kyrOS", "flf", "Rotur Assistant", "geec os", "OliveOS", "Warpdrive", "passNet", "PassNet", "originChats", "Fluoride", "fluoride", 'plus']

const security_questions = [
    {question: "Who created Rotur?", answers: ["sophie", "mist", "mistium"]},
    {question: "Who created Rotur Assistant?", answers: ["dominic"]},
    {question: "Name one member on the Rotur Team", answers: ['layz', "lay z", 'green panda', "green_panda", "b1j2754", "flufi", "iris", "sophie", "mist", "mistium", "mike", "mikedev"]},
    {question: "MathQuestion", answers: []},
    {question: "You can divide by 0 in mathematics. Type True or False", answers: ["false"]},
    {question: "Name one person who helped test Rotur Assistant prior to its release", answers: ["dominic", "milodev123", "allucat1000", "huopa", "mist", "dragocuven", "milo", "allucat", "drago"]},
    {question: "What is the name of this extension?", answers: ["rotur assistant"]},
    {question: "Name one service Rotur provides", answers: ["notes", "warptheme", "devfund", "origin", "originos", "gifts", "roturnotes", "roturgifts", "music", "photos", "git", "gate", "originchats", "claw", "rmail", "appsie", "roturmusic", "roturphotos", "roturgit", "roturgit"]},
]

// Re-using code from claw.js for the claw posts section

function openLikesPopup(likes) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Likes</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        ${likes}
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Close</button>
        </div>
    `))
}

function openDeletePopup(post_id) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Delete post</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Really delete this post?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finaldelete" data-postid='${post_id}'>Yes</button>
        </div>
    `))
}

function openUnfriendPopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Remove Friend?</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Remove ${user} from your friend list? If you change your mind, you're gonna have to wait for them to accept your friend request again.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalunfriend" data-user='${user}'>Remove Friend</button>
        </div>
    `))
}

function openUnfollowPopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Unfollow User?</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to unfollow ${user}?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalunfollow" data-user='${user}'>Unfollow</button>
        </div>
    `))
}

function openDeclinePopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Decline Request?</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to decline ${user}'s friend request?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finaldecline" data-user='${user}'>Decline Request</button>
        </div>
    `))
}

function openAcceptPopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Accept Request?</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to accept ${user}'s friend request?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalaccept" data-user='${user}'>Accept Request</button>
        </div>
    `))
}

function openUnblockPopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Unblock User?</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to unblock ${user}?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalunblock" data-user='${user}'>Unblock</button>
        </div>
    `))
}

function OpenCancelRequestPopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Cancel Request?</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to cancel your friend request to ${user}?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finalfriendcancel" data-user='${user}'>Yes</button>
        </div>
    `))
}

function openSystemPopup(system_name, owner) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm New System</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Change your system to ${system_name}? This will give the owner of the system, <img src='https://avatars.rotur.dev/${owner}' width=16 height=16> ${owner}, elevated permissions over your Rotur account, including the ability to ban or delete your Rotur account. Do note that Mistium, being the owner of Rotur, has elevated permissions over all Rotur accounts, regardless of system. On top of that, each time you claim a daily credit, the system owner will get 0.25 credits. Only proceed with this action if you trust the system's owner.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button id="finalsystemconfirm" data-keyname='system'>Confirm</button>
        </div>
    `))
}

function openPFPPopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm PFP Change</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <img src="${image_cache}" width=100 height=100>
        <p id="deleteconfirmdialogue">This is what your PFP will look like. Change your PFP to this?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalpfpchange">Set</button>
        </div>
    `))
}

function openBannerPopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm Banner</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <img src="${image_cache}" width=240 height=80>
        <p id="deleteconfirmdialogue">This is what your banner will look like. Change your banner to this? ${["Pro", "Max"].includes(altdata_cache.subscription) ? `Since you have ${altdata_cache.subscription ?? "Free"}, this process is free!` : `Do note that by proceeding, you will be charged 10 credits.`} Banners are stored as 900x300 images, meaning banners have a 3:1 aspect ratio.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalbannerchange">Set${["Pro", "Max"].includes(altdata_cache.subscription ?? "Free") ? `` : ` (-10 RC)`}</button>
        </div>
    `))
}

function openPinPopup(post_id) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Pin post</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Pin this post to the top of your profile?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalpin" data-postid='${post_id}'>Pin</button>
        </div>
    `))
}

function openUninPopup(post_id) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Unpin post</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Unpin this post?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalunpin" data-postid='${post_id}'>Unpin</button>
        </div>
    `))
}

function openRepostPopup(post_id) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Repost post</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Repost this post?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finalrepost" data-postid='${post_id}'>Yes</button>
        </div>
    `))
}

// Dangerous Popups

function openConfirmRefreshTokenPopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Refresh Token</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to refresh your account token? While Rotur Assistant will automatically update your token in the local storage to be the new token, this may cause issues on sites that are currently logged into this account.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finaltokenrefresh">Yes</button>
        </div>
    `))
}

function openChangePassPopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Change Password</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Change your password here. Make sure you remember your new password, because Rotur Assistant will not remember it for you.</p>
        <form id='password-container'>
            <label>
                Old Password:
                <input type="password" id='oldpass' autocomplete='current-password'>
            </label>
            <label>
                New Password:
                <input type="password" id='newpass1' autocomplete='new-password'>
            </label>
            <label>
                Confirm New Password:
                <input type="password" id='newpass2' autocomplete='new-password'>
            </label>
        </form>
        <button id='togglepassvisibility' data-visible='false'><img id='passbuttonvisibilityicon' src='../images/misc_icons/invisible.png' width='24' height='24'>Toggle Visibility</button>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalpasswordchange">Change Password</button>
        </div>
    `))
}

function openDeleteAccountPopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Delete Account</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to delete your account?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finaldeleteacc1">Confirm</button>
        </div>
    `))
}
function openDeleteAccountPopup2() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Delete Account</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you <i>really</i> sure you want to delete your account?</p>
        <div id="popup-choices">
            <button class="finaldeleteacc2">Confirm</button>
            <button id="cancel" class="closebtn">Cancel</button>
        </div>
    `))
}

function openDeleteAccountPopup3() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Delete Account</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you <b><i>absolutely</i></b> sure you want to delete your account? Do note that there is no going back. Any friends, followers, credits, and potential collectibles you have accumulated will be gone.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finaldeleteacc3">Confirm</button>
        </div>
    `))
}

function openDeleteAccountPopupFinal() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Delete Account (Final)</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <div id='securitycheckheader'>
            <h2 style='margin-bottom: 6px;'>Security Check</h2>
            <button id="newsecurityquestion" title="New Question">⟳</button>
        </div>
        <div id="securitycontainer">
            <p id="securityquestion"></p>
            <input type="text" id='securityanswer'>
            <p>In the box below, type the following: "I, (name), am completely sure that I want to delete my Rotur account."</p>
            <input type="text" id='securitystatement'>
            <p style='display: none;'>In the box below, type "Yes, I am sure of this"</p>
            <input type="text" id='securitystatement2' style='display: none;'>

            <p id='deletedisclaimercredits'>Since you're on Rotur Assistant, all your credits will be sent to the user "Dominic" for safekeeping upon proceeding.</p>
            <label id='voidcreditsinstead'>
                <input type="checkbox" id='voidcredits'>
                Void my credits instead
            </label>
        </div>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button id="finalfinaldeleteacc_extremelydangerous_theresnogoingback" title="There is no other confirmation screen beyond this one. Only proceed if you are ABSOLUTELY sure with deleting this account.">Delete Account</button>
        </div>
    `))
    document.getElementsByClassName('popup')[0].style.background = '#700000'
    document.getElementsByClassName('overlay')[0].style.background = '#b8000031'
}

function openDeleteSuccessPopup(msg) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Account Deleted</h1>
        </div>
        <p id="deleteconfirmdialogue">${msg}</p>
        <div id="popup-choices">
            <button id="toaccmanager">Back to Account Manager</button>
        </div>
    `))
}

//End of popup code. Now begins re-used claw.js code

async function getSystemData() {
    const systemdata = await fetch(`https://api.rotur.dev/systems`).then(res => res.json())
    systems = Object.keys(systemdata)
    systemcache = systemdata
}

function getSystemOptions(defaultsys) {
    document.getElementById('profileselectsystem').replaceChildren()
    systems.forEach(system => {
        const systemhtml = document.createElement('option')
        systemhtml.value = system
        systemhtml.selected = (system.toLowerCase() == defaultsys.toLowerCase())
        systemhtml.textContent = system
        document.getElementById('profileselectsystem').appendChild(systemhtml)
    })
}

function updateReplyCharLimit(postid, num) {
    const replycharlimit = document.getElementById(`limit-${postid}`)
    replycharlimit.style = `color: ${num > (premium ? 600 : 300) ? 'red' : 'white'};`
    replycharlimit.textContent = `${num}/${(premium ? '600' : '300')}`
    document.getElementById(`post-${postid}`).querySelector('[class="sendreply"]').disabled = (num > (premium ? 600 : 300))
}

function createReplyElement(reply) {
    const clawreply = document.getElementById('clawreplytemplate').content.cloneNode(true)

    clawreply.querySelector('a').href = `../pages/lookup.html?user=${reply.user || "Spectator"}`
    clawreply.querySelector('.copypostid').dataset.postid = reply.id
    clawreply.querySelector('.clawpfp').src = `https://avatars.rotur.dev/${reply.user || "Spectator"}`
    clawreply.querySelector('.clawpfp').alt = reply.user || "Spectator"
    clawreply.querySelector('h2').textContent = reply.user || "Unknown User"
    clawreply.querySelector('.postcontent').innerText = reply.content
    if (reply.attachment) {
        clawreply.querySelector('.clawattachment').src = reply.attachment
    } else {
        clawreply.querySelector('.clawattachment').remove()
    }
    clawreply.querySelector('.postmetadata').textContent = `Posted on ${formatDate(reply.timestamp)}`
    return clawreply;
}

function appendReplies(postdata) {
    const replybody = []
    for (let i=0; i<postdata.replies.length; i++) {
        replybody.push(createReplyElement(postdata.replies[i]))
    }
    return replybody
}

function createPostElement(post) {
    const repost = post.is_repost
    const clawpost = document.getElementById('clawposttemplate').content.cloneNode(true)
    clawpost.querySelector('li').id = `post-${post.id}`
    clawpost.querySelector('.clawpfp').src = `https://avatars.rotur.dev/${post.user || "Spectator"}`
    clawpost.querySelector('.clawpfp').alt = post.user || "Spectator"
    clawpost.querySelector('a').href = `../pages/lookup.html?user=${post.user || "Spectator"}`
    clawpost.querySelector('.clawpfp').href = `../pages/lookup.html?user=${post.user || "Spectator"}`
    clawpost.querySelectorAll('[data-postid]').forEach(elementnode => {
        elementnode.dataset.postid = post.id
    })
    clawpost.querySelectorAll('[data-user]').forEach(elementnode => {
        elementnode.dataset.user = post.user
    }) // Get around having to do it manually since it appears so often

    clawpost.querySelector('.clawpostauthortitle').textContent = ((post.user + ' ') || "Unknown User ")
    if (repost) {
        const mark = document.createElement('mark')
        mark.textContent = post.original_post.profile_only ? `Profile + Repost` : `Repost`
        mark.className = `repostbadge`
        clawpost.querySelector('.clawpostauthortitle').appendChild(mark)
        clawpost.querySelector('.repostbtn').disabled = true
        clawpost.querySelector('.repostbtn').title = "Repost (Cannot repost profile-only posts or other reposts)"
    } else if (post.profile_only) {
        const mark = document.createElement('mark')
        mark.textContent = `Profile`
        mark.className = `repostbadge`
        clawpost.querySelector('.clawpostauthortitle').appendChild(mark)  
        clawpost.querySelector('.repostbtn').disabled = true
        clawpost.querySelector('.repostbtn').title = "Repost (Cannot repost profile-only posts or other reposts)"
    }
    if (clawpost.querySelector('.repostbadge') && (post.user.length > 15)) {
        clawpost.querySelector('.clawpostauthortitle').style = 'font-size: 16px;'
        if (post.user.length > 18) {
            clawpost.querySelector('.clawpostauthortitle').style = 'font-size: 14px;'
        }
    }
    if (post.pinned) {
        clawpost.querySelector('.pinbtn').title = 'Unpin Post'
        clawpost.querySelector('.pinbtn').querySelector('img').src = '../images/misc_icons/unpin.png'
    } else {
        clawpost.querySelector('.pinnedpostlabel').style.display = 'none'
    }
    if (!activeobject.uuid || flagged.includes(activeobject.uuid)) {
        clawpost.querySelector('.repostbtn').remove()
        clawpost.querySelector('.deletebtn').remove()
        clawpost.querySelector('.pinbtn').remove()
    } else if (post.user != activeobject.name) {
        clawpost.querySelector('.deletebtn').remove()
        clawpost.querySelector('.pinbtn').remove()
    }
    if (post.attachment || (repost && post.original_post.attachment)) {
        clawpost.querySelector('.clawattachment').src = repost ? post.original_post.attachment : post.attachment
    } else {
        clawpost.querySelector('.clawattachment').remove()
    }
    clawpost.querySelector('.postcontent').innerText = repost ? post.original_post.content : post.content
    clawpost.querySelector('.postmetadata').textContent = `Posted from ${(repost ? post.original_post.os : post.os) ?? "Unknown System"} on ${formatDate(repost ? post.original_post.timestamp : post.timestamp)}`

    clawpost.querySelector('.likebutton').textContent = `${post.likes && post.likes.includes(activeobject.name) ? `❤️ Unlike (${post.likes ? post.likes.length : 0})` : `🩶 Like (${post.likes ? post.likes.length : 0})`}`
    clawpost.querySelector('.likebutton').disabled = !activeobject.uuid
    if (post.likes) {
        clawpost.querySelector('.viewlikes').dataset.likes = JSON.stringify(post.likes)
    } else {
        clawpost.querySelector('.viewlikes').disabled = true
    }
    clawpost.querySelector('.replydropdownlabel').textContent = `View Replies (${post.replies ? post.replies.length : 0})`
    if (activeobject.uuid) {
        clawpost.querySelector('.replyboxplaceholder').querySelector('h2').remove()
        clawpost.querySelector('.postcharlimit').id = `limit-${post.id}`
        clawpost.querySelector('.postcharlimit').textContent = `0/${premium ? "600" : "300"}`
        clawpost.querySelector('.replybox').placeholder = `Add a reply for ${post.user}`
    } else {
        clawpost.querySelector('.replyboxplaceholder').querySelectorAll(':not(h2)').forEach(elemNode => {
            elemNode.remove()
        })
    }
    if (post.replies) {
        clawpost.querySelector(`.reply`).id = `replies-${post.id}`
        clawpost.querySelector(`.reply`).replaceChildren(...appendReplies(post))
    } else {
        clawpost.querySelector(`.reply`).remove()
    }
    return clawpost;
}

function renderClawFeed(feeddata) {
    let feed_html = []
    feeddata.forEach(post => {
        feed_html.push(createPostElement(post))
    });
    return feed_html;
}

async function refreshClawFeed() {
    const userdata = await fetch(`https://api.rotur.dev/profile?name=${userdata_cache.username}`).then(res => res.json())
    document.getElementById('clawpostslist').replaceChildren(...renderClawFeed(userdata.posts))
}

async function reply(postid, message) {
    const content = document.getElementById(`post-${postid}`).querySelector('[class="replybox"]').value
    const replystatus = document.getElementById(`post-${postid}`).querySelector('[class="replyerrorplaceholder"]')
    const replybtn = document.getElementById(`post-${postid}`).querySelector('[class="sendreply"]')
    replybtn.disabled = true
    replybtn.textContent = 'Sending...'
    replystatus.replaceChildren()

    let replysuccess = ''
    if (content == '') {
        replystatus.replaceChildren(MiniError('failure', "You can't post a blank reply"))
    } else {
        replysuccess = await fetch(`https://api.rotur.dev/reply?id=${postid}&auth=${activeobject.token}&content=${message}`)
        if (replysuccess.error) {
            replystatus.replaceChildren(MiniError('failure', replysuccess.error))
        } else {
            document.getElementById(`post-${postid}`).querySelector('[class="replybox"]').value = ``
            updateReplyCharLimit(postid, 0)
            if (!document.getElementById(`post-${postid}`).querySelector('[class="reply"]')) {
                const ul = document.createElement(ul)
                ul.className = 'reply'
                ul.id = `replies-${postid}`
                document.getElementById(`post-${postid}`).querySelector('[class="repliesplaceholder"]').replaceChildren(ul)
            }
            document.getElementById(`post-${postid}`).querySelector('[class="reply"]').appendChild(createReplyElement({id: String(Date.now() + 32767), content: message, user: activeobject.name, timestamp: Date.now()}))
        }
    }
    replybtn.disabled = false
    replybtn.textContent = 'Send'
    setTimeout(function() {
    if (document.getElementById(`post-${postid}`)) {
        document.getElementById(`post-${postid}`).querySelector('[class="replyerrorplaceholder"]').replaceChildren()
    }
    }, 10000)
    return;
}

// End of code borrowed from claw.js

// Re-used items.js code

function formatTransferHistory(transferdata) {
    const transfer_html = []
    transferdata.forEach(item => {
        if (!(item.from == null || item.from == "Null")) {
            const li = document.createElement('li')
            const p1 = document.createElement('p')
            p1.setHTML(`From: <img src="https://avatars.rotur.dev/${item.from}" width=20 height=20>  ${item.from}`, {sanitizer: sanitizer})
            li.appendChild(p1)

            const p2 = document.createElement('p')
            p2.setHTML(`To: <img src="https://avatars.rotur.dev/${item.to}" width=20 height=20>  ${item.to}`, {sanitizer: sanitizer})
            li.appendChild(p2)

            if (item.timestamp) {
                const p3 = document.createElement('p')
                p3.textContent = `On: ${formatDate(item.timestamp * 1000)}`
                li.appendChild(p3)
            }
            if (item.type) {
                const p4 = document.createElement('p')
                p4.textContent = `Type: ${item.type}`
                li.appendChild(p4)
            }
            transfer_html.push(li)
        }
    })
    if (transfer_html.length == 0) {
        const li = document.createElement('li')
        const h2 = document.createElement('h2')
        h2.textContent = ('No history yet')
        li.appendChild(h2)
        transfer_html.push(li)
    }
    return transfer_html;
}

function getItems(itemdata) {
    const myitems = itemdata
    const item_html = []
    if (myitems.length == 0) {
        const li = document.createElement('li')
        const h2 = document.createElement('h2')
        h2.textContent = "You don't own any items yet."
        li.appendChild(h2)
        item_html.push(li)
    } else {
        myitems.forEach(item => {
            const roturitem = document.getElementById('roturitemtemplate').content.cloneNode(true)
            roturitem.querySelector('li').id = `roturitem_${encodeURIComponent(item.name)}`
            roturitem.querySelector('h2').textContent = item.name
            roturitem.querySelector('.roturitemauthor').setHTML(`Creator: <img src='https://avatars.rotur.dev/${item.author}' width=20 height=20> ${item.author} | Current Owner: <img src='https://avatars.rotur.dev/${item.owner}' width=20 height=20> ${item.owner}`, {sanitizer: sanitizer})
            roturitem.querySelector('.roturitemdesc').innerText = item.description

            roturitem.querySelector('.roturitemprice').textContent = `${item.price} RC`
            roturitem.querySelector('.isitempurchaseable').textContent = item.selling ? "Yes" : "No"
            roturitem.querySelector('.roturitemcreationdate').textContent = formatDate(item.created * 1000)
            roturitem.querySelector('.roturitemtotalrevenue').textContent = item.total_income

            roturitem.querySelector('.transferhistory').replaceChildren(...formatTransferHistory(item.transfer_history))
            item_html.push(roturitem)
        })
    }
    return item_html;
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementsByClassName('popup')[0].style.background = ''
    document.getElementsByClassName('overlay')[0].style.background = ''
    document.getElementById('finalfinaldeleteacc_extremelydangerous_theresnogoingback')?.remove()
    if (tosrecentlyaccepted) {
        tosrecentlyaccepted = false
        window.location.reload()
    }
}

// End of all reused code

function AppendIPs(ip_list) {
    const ips = []
    if (ip_list && ip_list.length > 0) {
        ip_list.forEach(ip => {
            const ip_card = document.getElementById('iptemplate').content.cloneNode(true)
            ip_card.querySelector('li').dataset.ip = ip
            ip_card.querySelector('p').textContent = ip
            ip_card.querySelector('button').dataset.ip = ip
            ips.push(ip_card)
        })
    } else {
        const li = document.createElement('li')
        const h2 = document.createElement('h2')
        h2.textContent = "You have not blocked any IPs yet."
        li.appendChild(h2)
        ips.push(li)
    }
    return ips;
}

function AppendLogins(logindata) {
    const logins = []
    if (logindata && logindata.length > 0) {
        logindata.forEach(login => {
            const logincard = document.getElementById('loginhistorycard').content.cloneNode(true)
            logincard.querySelector('#logindate').textContent = formatDate(login.timestamp)
            logincard.querySelector('#loginorigin').textContent = "Origin: " + (login.origin || "Unknown")
            logincard.querySelector('#logindevice').textContent = "Device: " + (login.device_type || "Unknown")
            logincard.querySelector('#loginagent').textContent = "User Agent: " + (login.userAgent || "Unknown")
            logincard.querySelector('#loginhash').textContent = "IP (Hashed): " + (login.ip_hmac || "Unknown")
            logincard.querySelector('#logincountry').textContent = "Country: " + (login.country || "Unknown")
            logincard.querySelector('#loginsrc').textContent = "Message: " + (login.message || "Unknown")
            logins.push(logincard)
        })
    } else {
        const li = document.createElement('li')
        const h2 = document.createElement('h2')
        h2.textContent = "No recent logins"
        li.appendChild(h2)
        logins.push(li)
    }
    return logins;
}

function getSecurityQuestion() {
    const question = { ...(security_questions[Math.floor(Math.random() * security_questions.length)] ?? security_questions[0]) }
    if (question.question == "MathQuestion") {
        const digit_1 = Math.floor(Math.random() * 11)
        const digit_2 = Math.floor(Math.random() * 11)
        const ops = ["+", "-"]
        const op = ops[Math.floor(Math.random() * ops.length)] ?? "+"
        const answer = (op == "+") ? (digit_1 + digit_2) : ((digit_2 > digit_1) ? digit_2 - digit_1 : digit_1 - digit_2 )
        question.question = `What's ${(digit_2 > digit_1 && op == "-") ? digit_2 : digit_1} ${op} ${(digit_2 > digit_1 && op == "-") ? digit_1 : digit_2}?`
        question.answers.push(String(answer))
    }
    question_cache = question
    document.getElementById('securityquestion').textContent = "Security question: " + question_cache.question
    document.getElementById('securityanswer').value = ''
}

async function readImageFromClipboard() {
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
                const blob = await item.getType(imageType);
                const imgUrl = URL.createObjectURL(blob);
                return imgUrl;
            }
        }
    } catch (err) {
        console.error('Failed to read clipboard:', err);
        return null;
    }
}

// cosmetics.js code

function CreateMyCosmeticElement(cosmetic) {
    const cosmeticcard = document.getElementById('overlaytemplate').content.cloneNode(true)
    cosmeticcard.querySelector('.cosmeticitem').id = `mine_${cosmetic.id}`
    cosmeticcard.querySelector('.overlaytemplatepreview').title = cosmetic.description
    cosmeticcard.querySelector('.overlaytemplatepreview').style = 'border-radius: 50%;'
    cosmeticcard.querySelector('.useravataroverlaypreview').src = `https://avatars.rotur.dev/${activeobject.name}`
    cosmeticcard.querySelector('.useravataroverlaypreview').alt = activeobject.name
    cosmeticcard.querySelector('.useravataroverlaypreview').style = 'border-radius: 50%;'
    cosmeticcard.querySelector('.shopoverlayimg').src = cosmetic.image_url
    cosmeticcard.querySelector('.shopoverlayimg').alt = cosmetic.name

    cosmeticcard.querySelector('.overlayname').textContent = cosmetic.name
    cosmeticcard.querySelector('.overlayname').title = cosmetic.description
    cosmeticcard.querySelector('.overlaytype').textContent = cosmetic.cosmetic_type
    cosmeticcard.querySelector('.overlaycreator').setHTML(`By: <img src='https://avatars.rotur.dev/${cosmetic.creator}' alt='${cosmetic.creator}' width='16' height='16' class='creatorpfp'> ${cosmetic.creator}`, {sanitizer: sanitizer})
    cosmeticcard.querySelector('.equipoverlay').dataset.cosmeticid = cosmetic.id
    cosmeticcard.querySelector('.viewoverlayinfo').remove()
    cosmeticcard.querySelector('.buyoverlay').remove()
    if (active_cache?.overlay?.id == cosmetic.id) {
        cosmeticcard.querySelector('.equipoverlay').textContent = "Unequip"
        cosmeticcard.querySelector('.equipoverlay').dataset.equipped = "true"
        cosmeticcard.querySelector('.cosmeticitem').style.background = '#00a2ff4b'
    }
    return cosmeticcard;
}

async function UnequipCosmetic(cosmetic) {
    const cosmeticdata = cosmetic_cache[cosmetic_cache.findIndex(cosmetic2 => cosmetic2.id == cosmetic)]
    const cosmeticsuccess = await fetch(`https://api.rotur.dev/cosmetics/unequip?type=${cosmeticdata.cosmetic_type}&auth=${activeacc.token}`, {method: 'POST'}).then(res => res.json()).catch(err => {
        openErrorPopup("An unknown error occurred")
        return;
    })
    if (cosmeticsuccess.error) {
        openErrorPopup(cosmeticsuccess.error)
    } else {
        active_cache = {}
        if (document.querySelector('[data-equipped="true"]')) {
            document.querySelector('[data-equipped="true"]').closest('.cosmeticitem').style.background = ''
            document.querySelector('[data-equipped="true"]').textContent = "Equip"
            document.querySelector('[data-equipped="true"]').dataset.equipped = ''
        }
    }
}

async function EquipCosmetic(cosmetic) {
    const cosmeticsuccess = await fetch(`https://api.rotur.dev/cosmetics/equip/${cosmetic}?auth=${activeacc.token}`, {method: 'POST'}).then(res => res.json())
    if (cosmeticsuccess.error) {
        openErrorPopup(cosmeticsuccess.error)
    } else {
        active_cache = cosmetic_cache[cosmetic_cache.findIndex(cosmetic2 => cosmetic.id == cosmetic)]
        if (document.querySelector('[data-equipped="true"]')) {
            document.querySelector('[data-equipped="true"]').closest('.cosmeticitem').style.background = ''
            document.querySelector('[data-equipped="true"]').textContent = "Equip"
            document.querySelector('[data-equipped="true"]').dataset.equipped = ''
        }
        document.getElementById(`mine_${cosmetic}`).querySelector('.equipoverlay').textContent = "Unequip"
        document.getElementById(`mine_${cosmetic}`).querySelector('.equipoverlay').dataset.equipped = 'true'
        document.getElementById(`mine_${cosmetic}`).style.background = '#00a2ff4b'
    }

}

async function GetMyCosmetics() {
    if (cosmetic_cache == '') {
        cosmetic_cache = await fetch(`https://api.rotur.dev/cosmetics/mine?auth=${activeobject.token}`).then(res => res.json())
        active_cache = { ...cosmetic_cache.active_cosmetics }
        cosmetic_cache = cosmetic_cache.owned_cosmetics
    }
    const cosmetic_html = []
    let supportwarning = false
    cosmetic_cache.forEach(cosmetic => {
        if (cosmetic.cosmetic_type == 'overlay') {
            cosmetic_html.push(CreateMyCosmeticElement(cosmetic))
        } else {
            supportwarning = true
        }
    })
    if (cosmetic_html.length == 0) {
        const h2 = document.createElement('h2')
        h2.textContent = "You don't own any overlays yet"
        return [h2];
    }
    if (supportwarning) {
        const warning = document.createElement('p')
        warning.textContent = 'As of now, Rotur Assistant only supports the "Overlay" cosmetic type. Support for different cosmetic types will be added in future updates, once Rotur adds them, if they are added.'
        cosmetic_html.unshift('warning')
    }
    return cosmetic_html
}

// End of cosmetics.js code

function renderFollowingFollowers(list, x, action, appendto) {
    const return_html = []
    for (let i=0;i<list.length;i++) {
        let currentuser = list[i]
        const listusertemplate = document.getElementById('listusertemplate').content.cloneNode(true)
        listusertemplate.querySelector('li').dataset.user = currentuser
        listusertemplate.querySelector('a').href = `lookup.html?user=${currentuser}`
        listusertemplate.querySelector('img').src = `https://avatars.rotur.dev/${currentuser || "Spectator"}`
        listusertemplate.querySelector('p').textContent = currentuser || "Unknown User"
        if (action == 'acceptdeclinereq') {
            listusertemplate.querySelector('button')?.remove()
            listusertemplate.querySelector('a').appendChild(document.getElementById('friendrequestbuttons').content.cloneNode(true))
            listusertemplate.querySelector('.profileacceptreq').dataset.user = currentuser
            listusertemplate.querySelector('.profiledeclinereq').dataset.user = currentuser
        } else if (x) {
            listusertemplate.querySelector('button').title = action
            listusertemplate.querySelector('button').dataset.user = currentuser
            listusertemplate.querySelector('button').dataset.action = action
        } else {
            listusertemplate.querySelector('button')?.remove()
        }
        return_html.push(listusertemplate)
    }
    document.getElementById(appendto).replaceChildren(...return_html)
}

async function renderProfile(userdata, altdata, token) {
    biocharlimit = (altdata.subscription == 'Pro' || altdata.subscription == 'Max') ? 1000 : (altdata.subscription == 'Drive') ? 500 : 200
    const clawposts = altdata.posts ?? []
    const name = userdata.username
    const balance = userdata['sys.currency'] ?? 0
    const id = userdata['sys.id'] ?? "Unknown ID"
    const followingData = await fetch(`https://api.rotur.dev/following?username=${name}`).then(res => res.json())
    const followersData = await fetch(`https://api.rotur.dev/followers?username=${name}`).then(res => res.json())
    const friends = userdata['sys.friends'] ?? []
    const requests = userdata['sys.requests'] ?? []
    const blocked_users = userdata['sys.blocked'] ?? []
    const useritems = await fetch(`https://api.rotur.dev/items/list/${name}`).then(res => res.json())
    const following = followingData.following
    const followers = followersData.followers
    const standingData = await fetch(`https://api.rotur.dev/get_standing?username=${name}`).then(res => res.json())
    const economydata = await fetch(`https://api.rotur.dev/stats/economy`).then(res => res.json())
    const outgoing_requests = await fetch(`https://api.rotur.dev/friends/requests_out?auth=${activeobject.token}`).then(res => res.json()).then(res => res.requests_out)
    const cosmeticdata = await GetMyCosmetics()
    const cents = parseFloat(economydata.currency_comparison.cents.split('¢')[0])
    const pence = parseFloat(economydata.currency_comparison.pence.split('p')[0])
    const badges = userdata['sys.badges'] ?? []
    const statusdata = userdata['sys.status'] ?? {presence: "invisible", status: ''}
    blacklisted_ips = userdata['blocked_ips'] ?? []
    if (typeof blacklisted_ips !== 'object') {
        try {
            blacklisted_ips = JSON.parse(userdata['blocked_ips'])
        } catch {
            blacklisted_ips = []
        }
    }
    if (!Array.isArray(blacklisted_ips)) {
        blacklisted_ips = []
    }
    const logins = (userdata["sys.logins"] ?? []).reverse()
    const total_logins = userdata["sys.total_logins"] ?? 0

    old_values = [userdata.username ?? '', userdata.pronouns ?? '', userdata.bio ?? '', userdata.display_name ?? '', userdata.email ?? '', userdata.phone ?? '', userdata.system ?? 'Rotur Assistant', userdata.private ?? false]
    new_values = [...old_values]

    await getSystemData()

    if ((userdata.system.toLowerCase() == 'passnet') && !(badges.some(item => item.name.toLowerCase() == 'passnet'))) {
        badges.push({name: "PassNet", description: "This account was created on PassNet", icon: ''})
    }
    const badgelist = document.getElementById('badges')
    badgelist.replaceChildren()
    for (let i=0; i<badges.length; i++) {
        let badge_name = known_badges.includes(badges[i].name) ? badges[i].name : `placeholder`
        if (badge_name == 'fluoride') {
            badge_name = 'Fluoride'
        }

        const li = document.createElement('li')
        const img = document.createElement('img')
        img.src = `../images/badges/${badge_name}.png`
        img.title = `${badge_name == "placeholder" ? `${badges[i].name}
        
The badge shown is a placeholder badge in case Rotur Assistant doesn't recognize that badge yet.
Original badge description: ${badges[i].description}` : `${badges[i].name}
        
${badges[i].description}`}`
        img.alt = badges[i].name
        img.width = 16
        img.height = 16
        li.appendChild(img)
        badgelist.appendChild(li)
    }
    if (badges.length == 0) {
        document.querySelector('.badgelabel').remove()
    }
    const joindate = formatDate(userdata.created)
    const economy_html = []
    const h2 = document.createElement('h2')
    h2.textContent = "General Statistics"

    const p1 = document.createElement('p')
    const p2 = document.createElement('p')
    const p3 = document.createElement('p')

    p1.textContent = `${userdata.username} has $${(balance * (cents / 100)).toFixed(2)} or £${(balance * (pence / 100)).toFixed(2)} worth of credits.`
    p2.textContent = `${userdata.username} has ${(balance / economydata.average).toFixed(2)} times the average balance.`
    p3.textContent = `${userdata.username} has ${((balance * 100) / economydata.total).toFixed(2)}% of all the credits in circulation.`

    economy_html.push(h2)
    economy_html.push(p1)
    economy_html.push(p2)
    economy_html.push(p3)
    const profile = document.getElementById('lookupplaceholder')
    profile.querySelector("#userbannerimg").src = `https://avatars.rotur.dev/.banners/${name}`
    profile.querySelector("#userbannerimg").alt = `${name}'s Banner`

    profile.querySelector('#changebannerbtn').textContent = `Change Banner... (${["Pro", "Max"].includes(altdata.subscription) ? "Free!" : "-10 RC"})`
    profile.querySelector('#useravatarimg').src = `https://avatars.rotur.dev/${name}`
    profile.querySelector('#useravatarimg').alt = `${name}'s Avatar`
    if (settings[0] == '0') {
        profile.querySelector('.useravataroverlay').src = `https://avatars.rotur.dev/.overlay/${name}`
        profile.querySelector('.useravataroverlay').alt = `${name}'s Avatar Decoration`
    } else {
        profile.querySelector('.useravataroverlay').remove()
    }
    profile.querySelector('#usernamebox').value = userdata.username ?? ''
    if (settings[6] == '1') {
        profile.querySelector('.statusicon').style.display = 'none'
    }
    profile.querySelector('.statusicon').style.background = (() => {
        switch (statusdata.presence) {
            case ('online'): {
                return 'green'
                break;
            }
            case ('idle'): {
                return 'rgb(221, 162, 0)'
                break;
            }
            case ('dnd'): {
                return 'red'
                break;
            }
            case ('invisible'): {
                return 'gray'
                break;
            }
            default: {
                return 'rgb(48, 48, 48)'
            }
        }
    })();
    
    profile.querySelector('#pronounsbox').value = userdata.pronouns ?? ''
    profile.querySelector('#biobox').value = userdata.bio ?? ''
    profile.querySelector('#profilebiocharlimit').textContent = `${(userdata.bio ?? '').length}/${biocharlimit}`
    profile.querySelector('#profilebiocharlimit').style = `color: ${(userdata.bio ?? '').length > biocharlimit ? 'red' : 'white'}`
    profile.querySelector(`option[value="${statusdata.presence}"]`).selected = true
    profile.querySelector('#statustextbox').value = statusdata.status
    profile.querySelector('.joindate').textContent = `Member since: ${joindate}`

    profile.querySelector('#displaynamebox').value = userdata.display_name ?? ''
    profile.querySelector('#emailbox').value = userdata.email ?? ''
    profile.querySelector('#phonebox').value = userdata.phone ?? ''
    getSystemOptions(userdata.system ?? "Rotur Assistant")
    profile.querySelector('#privateacc').checked = Boolean(altdata.private || false)
    
    profile.querySelector('#balanceinfo').textContent = balance
    profile.querySelector('#systeminfo').textContent = userdata.system
    profile.querySelector('#subinfo').textContent = altdata.subscription || "Expired"
    profile.querySelector('#accidx').textContent = altdata.index
    profile.querySelector('#grouptagstatus').setHTML((altdata.group_tag ? `<a href="https://rotur.dev/groups/${sanitize(altdata.group_tag)}" target='_blank' rel='noopener noreferrer'>${sanitize(altdata.group_tag)}</a>` : 'None'), {sanitizer: sanitizer})

    profile.querySelector('#standingstatus').textContent = standingData.error ? "Banned" : standingData.standing.replace(/^./, char => char.toUpperCase())
    profile.querySelector('#roturuuidinfo').textContent = id
    if (userdata.discord_id) {
        profile.querySelector('#discordidinfo').textContent = userdata.discord_id
    } else {
        profile.querySelector('#discordidcontainer').remove()
    }
    friends.length ? renderFollowingFollowers(friends, true, 'Unfriend', 'friendslist') : ``
    requests.length ? renderFollowingFollowers(requests, true, 'acceptdeclinereq', 'requestslist') : ``
    following.length ? renderFollowingFollowers(following, true, 'Unfollow', 'followinglist') : ``
    outgoing_requests.length ? renderFollowingFollowers(outgoing_requests, true, 'Cancel', 'outgoinglist') : ``
    followers.length ? renderFollowingFollowers(followers, false, 'do_nothing', 'followerslist') : ``
    blocked_users.length ? renderFollowingFollowers(blocked_users, true, 'Unblock', 'blockedlist') : ``
    altdata.posts ? profile.querySelector('#clawpostslist').replaceChildren(...renderClawFeed(altdata.posts)) : ``
    useritems ? profile.querySelector('#profileitemlist').replaceChildren(...getItems(useritems)) : ``

    profile.querySelector('#overlayssummary').textContent = `Overlays (${cosmetic_cache?.length ?? 0})`
    profile.querySelector('#friendssummary').textContent = `Friends (${friends.length})`
    profile.querySelector('#requestssummary').textContent = `Incoming Requests (${requests.length})`
    profile.querySelector('#outgoingsummary').textContent = `Outgoing Requests (${outgoing_requests.length})`
    profile.querySelector('#followingsummary').textContent = `Following (${following.length})`
    profile.querySelector('#followerssummary').textContent = `Followers (${followers.length})`
    profile.querySelector('#blockedsummary').textContent = `Blocked (${blocked_users.length})`
    profile.querySelector('#clawpostssummary').textContent = `Claw Posts (${clawposts.length})`
    profile.querySelector('#useritemssummary').textContent = `Items (${useritems.length})`

    profile.querySelector('#economicplaceholder').replaceChildren(...economy_html)
    profile.querySelector('#profileoverlays').replaceChildren(...cosmeticdata)
    profile.querySelector('.loginstats').textContent = `You have "logged in" a total of ${total_logins} time${total_logins == 1 ? "" : "s"}.`
    profile.querySelector('#loginsplaceholder').replaceChildren(...AppendLogins(logins))
    profile.querySelector('#blacklisted_ips_summary').textContent = `Blocked IPs (${blacklisted_ips.length})`
    profile.querySelector('#blacklistedipslist').replaceChildren(...AppendIPs(blacklisted_ips))

    profile.style = 'border: 2px solid white; display: flex;'
    document.getElementById('profileloadingscreen')?.remove()
    if (activeobject.token.startsWith('rotur_st_')) {
        profile.querySelector('#deleteacc_verydangerous').disabled = true
        profile.querySelector('#deleteacc_verydangerous').title = "This action is unavailable since this account is currently using a Rotur Sub-Token"
        profile.querySelector('#accrefreshtoken').disabled = true
        profile.querySelector('#accrefreshtoken').title = "This action is unavailable since this account is currently using a Rotur Sub-Token"
    }

// Everything else

    document.getElementById('changeavatarfilebtn').addEventListener('change', async function(e) {
        image_cache = document.getElementById('changeavatarfilebtn').files[0]
        const reader = new FileReader();

        reader.onloadend = () => {
            image_cache = reader.result
            openPFPPopup()
        };

        reader.readAsDataURL(image_cache);
    })
    document.getElementById('changebannerfilebtn').addEventListener('change', async function(e) {
        image_cache = document.getElementById('changebannerfilebtn').files[0]
        const reader = new FileReader();

        reader.onloadend = () => {
            image_cache = reader.result
            openBannerPopup()
        };

        reader.readAsDataURL(image_cache);
    })
    document.getElementById('biobox').addEventListener('input', function(e) {
        document.getElementById('profilebiocharlimit').textContent = String(e.target.value.length) + '/' + String(biocharlimit)
        document.getElementById('profilebiocharlimit').style.color = (e.target.value.length > biocharlimit) ? 'red' : 'white'
    })
}

async function performSearch(user) {
    const profile_index = accounts.findIndex(item => item.name == user)
    activeobject = accounts[profile_index]
    if (flagged.includes(activeobject.uuid)) {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
        <h2>An authentication issue has been detected with the selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h2>
        `))
        return;   
    }
    const userdata = await fetch(`https://api.rotur.dev/get_user?auth=${activeobject.token}`).then(res => res.json()).catch(err => {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h2>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h2>
        `))
        return;
    })
    if ((userdata.error && (userdata.error == "Invalid authentication credentials") && !userdata.username) || (userdata['sys.banned'])) {
        flagged.push(activeobject.uuid)
        chrome.storage.local.set({flagged: flagged})
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h2>An authentication issue has been detected with the selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h2>
            `))
        return;
    }
    if ((userdata['sys.email_verified'] === false)) {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <div id='toscontainer'>
                <h4>Your E-mail is not verified. Until you verify your E-mail address, some actions may be limited. To verify your e-mail, head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> and reauthenticate.</h4>
            </div>
        `))        
    }
    if (!userdata['sys.tos_accepted']) {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <div id='toscontainer'>
                <h4>The Rotur TOS was updated since this account's last visit. As a result, accounts can't access or perform certain actions until they accept the TOS again. Accept the new terms?</h4>
                <button id='accepttos'>Accept Terms</button>
                ${accounts.length > 1 ? `
                <label id='tosbulkaccept'>
                    <input type='checkbox' id='bulkacceptoption'>
                    Accept TOS on all added accounts
                </label>` : ``}
                <div id='tosiframeplaceholder'></div>
                <a href='https://rotur.dev/terms-of-service' target='_blank' rel='noopener noreferrer'>Rotur Terms of Service</a>
            </div>
        `))
        return;
    }
    const userid = userdata['sys.id']
    if (activeobject.uuid && !flagged.includes(activeobject.uuid)) {
        premium = await fetch(`https://api.rotur.dev/keys/check/${activeobject.name}?key=bd6249d2b87796a25c30b1f1722f784f`, {signal: controller.signal}).then(res => res.json()).catch((err) => {
            clearTimeout(requestlimit)
            console.warn('An error occurred while checking for Claw premium')
            return ({owned: false})
        })
        premium = premium.owned
    }
    const altdata = await fetch(`https://api.rotur.dev/profile?id=${userid}`).then(res => res.json())
    userdata_cache = userdata;
    altdata_cache = altdata;
    renderProfile(userdata, altdata, activeobject.token)
}

async function checkParam() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    const lookupuser = urlParams.get('user');

    if (lookupuser) {
        performSearch(lookupuser ?? activeacc.name)
    }
}

checkParam()

document.addEventListener('click', async function(e) {
    if (e.target.id == 'accepttos') {
        const target = e.target
        target.disabled = true
        await chrome.storage.session.setAccessLevel({ 
            accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' 
        });
        if (document.getElementById('bulkacceptoption')?.checked) {
            target.textContent = "Accepting... (This may take a while)"
            await chrome.storage.session.set({acceptinprogress: true})
        
            for (let i=0; i<accounts.length; i++) {
                if (flagged.includes(accounts[i].uuid)) {
                    continue;
                }
                if (document.getElementById('tosiframe')) {
                    document.getElementById('tosiframe').src = `https://rotur.dev/terms-of-service?token=${accounts[i].token}`
                } else {
                    document.getElementById('tosiframeplaceholder').replaceChildren(...parseHTML(`
                        <iframe id='tosiframe' src="https://rotur.dev/terms-of-service?token=${accounts[i].token}"></iframe>
                    `))
                }
                document.getElementById('tosiframe').style.display = 'none'
                const accept_process = new Promise((resolve) => {
                    chrome.runtime.onMessage.addListener(function listener(message) {
                        if (message.status == 'accepted') {
                            resolve(message)
                            chrome.runtime.onMessage.removeListener(listener)
                        }
                    })
                })
                await accept_process
            }
            chrome.storage.session.remove('acceptinprogress')
            document.getElementById('tosiframeplaceholder').replaceChildren()
            openSuccessPopup(`TOS successfully accepted on all accounts! The page will reload shortly.`)
            tosrecentlyaccepted = true
            target.remove()
            document.getElementById('tosbulkaccept')?.remove()
            setTimeout(function() {
                this.location.reload()
            }, 5000)
        } else {
            target.textContent = "Accepting..."
            await chrome.storage.session.set({acceptinprogress: true})
            document.getElementById('tosiframeplaceholder').replaceChildren(...parseHTML(`
                <iframe id='tosiframe' src="https://rotur.dev/terms-of-service?token=${activeobject.token}"></iframe>
            `))
            document.getElementById('tosiframe').style.display = 'none'
            chrome.runtime.onMessage.addListener(function listener(message) {
                if (message.status == 'accepted') {
                    chrome.storage.session.remove('acceptinprogress')
                    document.getElementById('tosiframeplaceholder').replaceChildren()
                    openSuccessPopup(`TOS successfully accepted! The page will reload shortly.`)
                    tosrecentlyaccepted = true
                    target.remove()
                    document.getElementById('tosbulkaccept')?.remove()
                    setTimeout(function() {
                        this.location.reload()
                    }, 5000)
                    chrome.runtime.onMessage.removeListener(listener)
                }
            })
        }
        return;
    }
    if (e.target.id == 'toggleprofileview') {
        this.location.href = `../pages/lookup.html?user=${activeobject.name}`
        return;
    }
    if (e.target.id == 'profilereloadedit') {
        document.getElementById('profilereloadedit').textContent = '…'
        document.getElementById('profilereloadedit').disabled = true;
        await performSearch(userdata_cache.username)
        document.getElementById('profilereloadedit').textContent = '⟳'
        document.getElementById('profilereloadedit').disabled = false;
        return;
    }
    // Save buttons
    if (e.target.id == 'savename') {
        const newname = document.getElementById('usernamebox').value
        new_values[0] = newname
        if (old_values[0] != new_values[0]) {
            const keyupdate = await fetch(`https://api.rotur.dev/users`,
                {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'username', value: newname})}).then(res => res.json())
            if (keyupdate.error) {
                openErrorPopup(keyupdate.error)
            } else {
                old_values = [...new_values]
                const exist_index = accounts.findIndex(user => user.uuid === activeobject.uuid);
                accounts[exist_index].name = newname
                chrome.storage.local.set({ userdata: accounts });
                if (activeobject.uuid == activeacc.uuid) {
                    const old_name = activeacc.name
                    activeacc.name = newname
                    chrome.storage.local.set({ activeacc: activeacc });
                    document.getElementById('headeractiveacc').textContent = "Active: " + newname
                    if (newname.length < 15) {
                        document.getElementById('headeractiveacc').title = ''
                        document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).title = ''
                    } else {
                        document.getElementById('headeractiveacc').title = newname
                        document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).title = newname
                    }
                    document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).textContent = newname
                    document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).dataset.accref = newname
                }
                openSuccessPopup('Username successfully updated')
            }
        } else {
            openErrorPopup("New value is equivalent to the old value.")
        }
        return;
    }
    if (e.target.id == 'savepronouns') {
        const newpronouns = document.getElementById('pronounsbox').value
        new_values[1] = newpronouns
        if (old_values[1] != new_values[1]) {
            const keyupdate = await fetch(`https://api.rotur.dev/users`,
                {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'pronouns', value: newpronouns})}).then(res => res.json())
            if (keyupdate.error) {
                openErrorPopup(keyupdate.error)
            } else {
                openSuccessPopup('Pronouns successfully updated')
                old_values = [...new_values]
            }
        } else {
            openErrorPopup("New value is equivalent to the old value.")
        }
        return;
    }
    if (e.target.id == 'savebio') {
        const newbio = document.getElementById('biobox').value
        new_values[2] = newbio
        if (old_values[2] != new_values[2]) {
            const keyupdate = await fetch(`https://api.rotur.dev/users`,
                {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'bio', value: newbio})}).then(res => res.json())
            if (keyupdate.error) {
                openErrorPopup(keyupdate.error)
            } else {
                openSuccessPopup('Bio successfully updated')
                old_values = [...new_values]
            }
        } else {
            openErrorPopup("New value is equivalent to the old value.")
        }
        return;
    }
    if (e.target.id == 'savedisplayname') {
        const newdisplayname = document.getElementById('displaynamebox').value
        new_values[3] = newdisplayname
        if (old_values[3] != new_values[3]) {
            const keyupdate = await fetch(`https://api.rotur.dev/users`,
                {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'display_name', value: newdisplayname})}).then(res => res.json())
            if (keyupdate.error) {
                openErrorPopup(keyupdate.error)
            } else {
                openSuccessPopup('Display Name successfully updated')
                old_values = [...new_values]
            }
        } else {
            openErrorPopup("New value is equivalent to the old value.")
        }
        return;
    }
    if (e.target.id == 'saveemail') {
        const newemail = document.getElementById('emailbox').value
        new_values[4] = newemail
        if (old_values[4] != new_values[4]) {
            const keyupdate = await fetch(`https://api.rotur.dev/users`,
                {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'email', value: newemail})}).then(res => res.json())
            if (keyupdate.error) {
                openErrorPopup(keyupdate.error)
            } else {
                openSuccessPopup('E-mail successfully updated')
                old_values = [...new_values]
            }
        } else {
            openErrorPopup("New value is equivalent to the old value.")
        }
        return;
    }
    if (e.target.id == 'savephone') {
        const newphone = document.getElementById('phonebox').value
        new_values[5] = newphone
        if (old_values[5] != new_values[5]) {
            const keyupdate = await fetch(`https://api.rotur.dev/users`,
                {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'phone', value: newphone})}).then(res => res.json())
            if (keyupdate.error) {
                openErrorPopup(keyupdate.error)
            } else {
                openSuccessPopup('Phone Number successfully updated')
                old_values = [...new_values]
            }
        } else {
            openErrorPopup("New value is equivalent to the old value.")
        }
        return;
    }
    if (e.target.id == 'savesystem') {
        const newsystem = document.getElementById('profileselectsystem').value
        if (old_values[6] == newsystem) {
            openErrorPopup("New value is equivalent to the old value.")
        } else {
            openSystemPopup(newsystem, systemcache[newsystem].owner.name)
        }
        return;
    }
    if (e.target.id == 'saveprivate') {
        const newprivate = JSON.stringify(document.getElementById('privateacc').checked)
        new_values[7] = newprivate
        if (old_values[7] != new_values[7]) {
            const keyupdate = await fetch(`https://api.rotur.dev/users`,
                {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'private', value: JSON.parse(newprivate)})}).then(res => res.json())
            if (keyupdate.error) {
                openErrorPopup(keyupdate.error)
            } else {
                openSuccessPopup('Private status successfully updated.')
                old_values = [...new_values]
            }
        } else {
            openErrorPopup("New value is equivalent to the old value.")
        }
        return;
    }
    if (e.target.id == 'savestatus') {
        const target = e.target
        target.disabled = true

        const oldstatus = userdata_cache['sys.status'] ?? {presence: 'invisible', status: ''}
        const newpresence = document.getElementById('statusselector').value
        const newstatus = document.getElementById('statustextbox').value

        if ((newpresence == oldstatus.presence) && (newstatus == oldstatus.status)) {
            openErrorPopup('Your new status is equal to your old status.')
            target.disabled = false
            return;
        }

        const statusws = new WebSocket(`wss://api.rotur.dev/status/ws`)
        statusws.onopen = () => {
            statusws.send(JSON.stringify({
                "cmd": "auth",
                "key": activeobject.token
            }))
        }
        statusws.onmessage = async (event) => {
            const data = JSON.parse(event.data)
            console.log(data)
            if (data.cmd == 'ready') {
                statusws.send(JSON.stringify({
                "cmd": "join",
                "rooms": "rotur"
                }))
            }
            if (data.cmd == 'join_ok') {
                statusws.send(JSON.stringify({
                    "cmd": "set_status",
                    "status": newstatus,
                    "presence": newpresence
                })) // Another case of the docs being misleading.
            }
            if (['status_update', 'member_join', 'member_leave'].includes(data.cmd) && (data.user_id == activeobject.uuid)) {
                openSuccessPopup('Status successfully updated!')
                userdata_cache['sys.status'] = {presence: newpresence, status: newstatus}
                document.querySelector('.statusicon').style.background = (() => {
                    switch (newpresence) {
                        case ('online'): {
                            return 'green'
                            break;
                        }
                        case ('idle'): {
                            return 'rgb(221, 162, 0)'
                            break;
                        }
                        case ('dnd'): {
                            return 'red'
                            break;
                        }
                        case ('invisible'): {
                            return 'gray'
                            break;
                        }
                        default: {
                            return 'rgb(48, 48, 48)'
                        }
                    }
                })();
                statusws.close()
                target.disabled = false
                return;
            }
            if (data.error || data.cmd == 'error') {
                openErrorPopup(data.error ?? data.message ?? 'An unknown error occurred while updating your status.')
                statusws.close()
                target.disabled = false
                return;
            }
        }
        statusws.onerror = (event) => {
            openErrorPopup('There was an issue with connecting to the Rotur Websocket to set your status.')
            statusws.close()
            return;
        }
    }
    if (e.target.id == 'profilesaveall') {
        const target = e.target
        target.disabled = true
        new_values[0] = document.getElementById('usernamebox').value
        new_values[1] = document.getElementById('pronounsbox').value
        new_values[2] = document.getElementById('biobox').value
        new_values[3] = document.getElementById('displaynamebox').value
        new_values[4] = document.getElementById('emailbox').value
        new_values[5] = document.getElementById('phonebox').value
        new_values[6] = document.getElementById('profileselectsystem').value
        new_values[7] = JSON.stringify(document.getElementById('privateacc').checked)

        let errorlogger = 0;
        let successlogger = 0;

        for (let i=0; i<new_values.length; i++) {
            if (old_values[i] != new_values[i]) {
                const keyupdate = await fetch(`https://api.rotur.dev/users`,
                    {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: profile_keys[i], value: new_values[i]})}).then(res => res.json())
                if (keyupdate.error) {
                    errorlogger += 1
                } else {
                    old_values[i] = new_values[i]
                    if (i = 0) {
                        const exist_index = accounts.findIndex(user => user.uuid === activeobject.uuid);
                        accounts[exist_index].name = new_values[0]
                        chrome.storage.local.set({ userdata: accounts });
                        if (activeobject.uuid == activeacc.uuid) {
                            const old_name = activeacc.name
                            activeacc.name = new_values[0]
                            chrome.storage.local.set({ activeacc: activeacc });
                            document.getElementById('headeractiveacc').textContent = "Active: " + new_values[0]
                            if (new_values[0].length < 15) {
                                document.getElementById('headeractiveacc').title = ''
                                document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).title = ''
                            } else {
                                document.getElementById('headeractiveacc').title = new_values[0]
                                document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).title = new_values[0]
                            }
                            document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).textContent = new_values[0]
                            document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).dataset.accref = new_values[0]
                        }
                    }
                successlogger += 1;
                }
            }
        }
        const oldstatus = userdata_cache['sys.status'] ?? {presence: 'invisible', status: ''}
        const newpresence = document.getElementById('statusselector').value
        const newstatus = document.getElementById('statustextbox').value

        let statusws = ''
        let statusupdated = false
        if (!((newpresence == oldstatus.presence) && (newstatus == oldstatus.status))) {
            statusupdated = true
            statusws = new WebSocket(`wss://api.rotur.dev/status/ws`)
            statusws.onopen = () => {
                statusws.send(JSON.stringify({
                    "cmd": "auth",
                    "key": activeobject.token
                }))
            }
            statusws.onmessage = async (event) => {
                const data = JSON.parse(event.data)
                console.log(data)
                if (data.cmd == 'ready') {
                    statusws.send(JSON.stringify({
                    "cmd": "join",
                    "rooms": "rotur"
                    }))
                }
                if (data.cmd == 'join_ok') {
                    statusws.send(JSON.stringify({
                        "cmd": "set_status",
                        "status": newstatus,
                        "presence": newpresence
                    }))
                }
                if (['status_update', 'member_join', 'member_leave'].includes(data.cmd) && (data.user_id == activeobject.uuid)) {
                    userdata_cache['sys.status'] = {presence: newpresence, status: newstatus}
                    document.querySelector('.statusicon').style.background = (() => {
                        switch (newpresence) {
                            case ('online'): {
                                return 'green'
                                break;
                            }
                            case ('idle'): {
                                return 'rgb(221, 162, 0)'
                                break;
                            }
                            case ('dnd'): {
                                return 'red'
                                break;
                            }
                            case ('invisible'): {
                                return 'gray'
                                break;
                            }
                            default: {
                                return 'rgb(48, 48, 48)'
                            }
                        }
                    })();
                    statusws.close()
                }
                if (data.error || data.cmd == 'error') {
                    statusws.close()
                }
            }
            statusws.onerror = (event) => {
                statusws.close()
            }
        }
        if (successlogger > 0) {
            openSuccessPopup(`Settings successfully updated${errorlogger > 0 ? `, though there were issues updating ${errorlogger} of the values.` : `!`}`)
        } else {
            if (statusupdated) {
                openSuccessPopup('Successfully updated status!')
            } else {
                openErrorPopup('None of the settings were modified.')
            }
        }
        target.disabled = false
        return;
    }
    // IP Block Management
    if (e.target.id == 'blockipbtn') {
        e.preventDefault()
        const ip = document.getElementById('iptoblock').value
        const target = e.target
        if (blacklisted_ips.includes(ip)) {
            openErrorPopup('You already have this IP blocked')
        } else if (ip.trim() == '') {
            openErrorPopup('Please enter an IP address to block')
        } else {
            blacklisted_ips.push(ip)
            const blocksuccess = await fetch(`https://api.rotur.dev/users`,
            {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'blocked_ips', value: blacklisted_ips})}).then(res => res.json())
            if (blocksuccess.error) {
                openErrorPopup(blocksuccess.error)
            } else {
                document.getElementById('blacklisted_ips_summary').textContent = `Blocked IPs (${blacklisted_ips.length})`
                if (blacklisted_ips.length == 0) {
                    const li = document.createElement('li')
                    const h2 = document.createElement('h2')
                    h2.textContent = "You have not blocked any IPs yet."
                    li.appendChild(h2)
                    document.getElementById('blacklistedipslist').replaceChildren(li)
                } else {
                    document.getElementById('blacklistedipslist').querySelector('h2')?.remove()
                    const ip_card = document.getElementById('iptemplate').content.cloneNode(true)
                    ip_card.querySelector('li').dataset.ip = ip
                    ip_card.querySelector('p').textContent = ip
                    ip_card.querySelector('button').dataset.ip = ip
                    document.getElementById('blacklistedipslist').appendChild(ip_card)
                }
                document.getElementById('iptoblock').value = ''
            }
        }
    }
    if (e.target.className == 'profileeditremoveip') {
        const ip = e.target.dataset.ip
        const target = e.target
        blacklisted_ips = blacklisted_ips.filter(item => item != ip)
        const blocksuccess = await fetch(`https://api.rotur.dev/users`,
        {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'blocked_ips', value: blacklisted_ips})}).then(res => res.json())
        if (blocksuccess.error) {
            openErrorPopup(blocksuccess.error)
        } else {
            document.getElementById('blacklisted_ips_summary').textContent = `Blocked IPs (${blacklisted_ips.length})`
            target.closest('.listip').remove()
            if (blacklisted_ips.length == 0) {
                const li = document.createElement('li')
                const h2 = document.createElement('h2')
                h2.textContent = "You have not blocked any IPs yet."
                li.appendChild(h2)
                document.getElementById('blacklistedipslist').replaceChildren(li)
            }
        }
    }
    // Social Action Buttons (unfriend, unfollow, unblock, etc.)

    if (e.target.className == 'profileeditremoveuser') {
        e.preventDefault();
        const btnaction = e.target.dataset.action
        const targetuser = e.target.dataset.user
        switch (btnaction) {
            case ('Unfriend'): {
                openUnfriendPopup(targetuser)
                break;
            }
            case ('Unfollow'): {
                openUnfollowPopup(targetuser)
                break;
            }
            case ('Unblock'): {
                openUnblockPopup(targetuser)
                break;
            }
            case ('Cancel'): {
                OpenCancelRequestPopup(targetuser)
                break;
            }
        }
        return;
    }

    if (e.target.className == 'profileacceptreq') {
        e.preventDefault();
        openAcceptPopup(e.target.dataset.user)
        return;
    }

    if (e.target.className == 'profiledeclinereq') {
        e.preventDefault();
        openDeclinePopup(e.target.dataset.user)
        return;
    }
    if (e.target.id == 'changepass') {
        openChangePassPopup()
        return;
    }
    if (e.target.id == 'deleteacc_verydangerous') {
        openDeleteAccountPopup()
        return;
    }
    if (e.target.className == 'finalpasswordchange') {
        closePopup()
        const oldpass = document.getElementById('oldpass').value
        const newpass1 = document.getElementById('newpass1').value
        const newpass2 = document.getElementById('newpass2').value
        if ((newpass1 === newpass2) && (newpass1 != '')) {
            const passchangesuccess = await fetch(`https://api.rotur.dev/me/change_password?auth=${activeobject.token}`,
            {method: 'POST', body: JSON.stringify({current_password: oldpass, new_password: newpass1})}).then(res => res.json())
            if (passchangesuccess.error) {
                openErrorPopup(passchangesuccess.error)
            } else {
                openSuccessPopup('Password changed successfully')
            }
        } else if (newpass1 == '') {
            openErrorPopup("New password can't be blank")
        } else {
            openErrorPopup("New passwords don't match")
        }
    return;
    }
    if (e.target.id == 'copytoken') {
        try {
            await navigator.clipboard.writeText(activeobject.token);
            openSuccessPopup('Account token copied successfully. Be careful of what you do with your token, because your token gives you full access to your Rotur account, including the ability to drain its funds or delete it. Do not share your token, especially in any public chats.')
        } catch (err) {
            console.error('Failed to copy: ', err);
            openErrorPopup('Failed to copy account token')
        }
        return;
    }
    if (e.target.id == 'accrefreshtoken') {
        openConfirmRefreshTokenPopup()
        return;
    }

    // Final actions (social buttons bar popups)
    if (e.target.className == 'finalunfriend') {
        const user = e.target.dataset.user
        closePopup()
        const request = await fetch(`https://api.rotur.dev/friends/remove/${user}?auth=${activeobject.token}`, {method: 'POST'}).then(res => res.json())
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            document.getElementById('friendslist').querySelector(`[data-user="${user}"]`).remove()
            document.getElementById('friendssummary').textContent = `Friends (${document.getElementById("friendslist").childElementCount})`
            if (document.getElementById('friendslist').childElementCount == 0) {
                document.getElementById('friendslist').replaceChildren(CreateEmptyPlaceholder("You have not befriended any users yet"))
            }
        }
        return;
    }
    if (e.target.className == 'finalunblock') {
        const user = e.target.dataset.user
        closePopup()
        const request = await fetch(`https://api.rotur.dev/me/unblock/${user}?auth=${activeobject.token}`, {method: 'POST'}).then(res => res.json())
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            document.getElementById('blockedlist').querySelector(`[data-user="${user}"]`).remove()
            document.getElementById('blockedsummary').textContent = `Blocked (${document.getElementById("blockedlist").childElementCount})`
            if (document.getElementById("blockedlist").childElementCount == 0) {
                document.getElementById('blockedlist').replaceChildren(CreateEmptyPlaceholder("You have not blocked any users yet"))
            }
        }
        return;
    }
    if (e.target.className == 'finalunfollow') {
        const user = e.target.dataset.user
        closePopup()
        const request = await fetch(`https://api.rotur.dev/unfollow?auth=${activeobject.token}&username=${user}`).then(res => res.json())
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            document.getElementById('followinglist').querySelector(`[data-user="${user}"]`).remove()
            document.getElementById('followingsummary').textContent = `Following (${document.getElementById("followinglist").childElementCount})`
            if (document.getElementById("followinglist").childElementCount == 0) {
                document.getElementById('followinglist').replaceChildren(CreateEmptyPlaceholder("You have not followed any users yet"))
            }
        }
        return;
    }
    if (e.target.className == 'finalfriendcancel') {
        const user = e.target.dataset.user
        closePopup()
        const request = await fetch(`https://api.rotur.dev/friends/cancel/${user}?auth=${activeobject.token}`, {method: 'POST'}).then(res => res.json())
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            document.getElementById('outgoinglist').querySelector(`[data-user="${user}"]`).remove()
            document.getElementById('outgoingsummary').textContent = `Outgoing Requests (${document.getElementById("outgoinglist").childElementCount})`
            if (document.getElementById("outgoinglist").childElementCount == 0) {
                document.getElementById('outgoinglist').replaceChildren(CreateEmptyPlaceholder("You have no outgoing friend requests."))
            }
        }
        return;
    }
    if (e.target.className == 'finalaccept') {
        const user = e.target.dataset.user
        closePopup()
        const request = await fetch(`https://api.rotur.dev/friends/accept/${user}?auth=${activeobject.token}`, {method: 'POST'}).then(res => res.json())
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            document.getElementById('requestslist').querySelector(`[data-user="${user}"]`).remove()
            document.getElementById('requestssummary').textContent = `Friend Requests (${document.getElementById("requestslist").childElementCount})`
            if (document.getElementById("requestslist").childElementCount == 0) {
                document.getElementById('requestslist').replaceChildren(CreateEmptyPlaceholder("You have no pending friend requests."))
            }
            if (document.getElementById('friendssummary').textContent.includes('0')) {
                document.getElementById('friendslist').replaceChildren()
            }

            const newfriend = document.getElementById('listusertemplate').content.cloneNode(true)
            newfriend.querySelector('li').dataset.user = user
            newfriend.querySelector('a').href = `lookup.html?user=${user}`
            newfriend.querySelector('img').src = `https://avatars.rotur.dev/${user || "Spectator"}`
            newfriend.querySelector('p').textContent = user || "Unknown User"
            newfriend.querySelector('button').title = "Unfriend"
            newfriend.querySelector('button').dataset.user = user
            newfriend.querySelector('button').dataset.action = "Unfriend"
            document.getElementById('friendslist').appendChild(newfriend)
            document.getElementById('friendssummary').textContent = `Friends (${document.getElementById('friendslist').childElementCount})`
        }
        return;
    }
    if (e.target.className == 'finaldecline') {
        const user = e.target.dataset.user
        closePopup()
        const request = await fetch(`https://api.rotur.dev/friends/reject/${user}?auth=${activeobject.token}`, {method: 'POST'}).then(res => res.json())
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            document.getElementById('requestslist').querySelector(`[data-user="${user}"]`).remove()
            document.getElementById('requestssummary').textContent = `Friend Requests (${document.getElementById("requestslist").childElementCount})`
            if (document.getElementById("requestslist").childElementCount == 0) {
                document.getElementById('requestslist').replaceChildren(CreateEmptyPlaceholder("You have no pending friend requests."))
            }
        }
        return;
    }

    if (e.target.className == 'finaltokenrefresh') {
        const refreshsuccess = await fetch(`https://api.rotur.dev/me/refresh_token?auth=${activeobject.token}`, {method: 'POST'}).then(res => res.json())
        if (refreshsuccess.error) {
            openErrorPopup(refreshsuccess.error)
        } else {
            openSuccessPopup("This account's Rotur token has been successfully refreshed.")
            activeobject.token = refreshsuccess.token
            if (activeacc.id == activeobject.id) {
                activeacc.token = refreshsuccess.token
                chrome.storage.local.set({activeacc: activeacc})
            }
            const activeindex = accounts.findIndex(id => id.uuid == activeobject.uuid)
            accounts[activeindex].token = refreshsuccess.token
            chrome.storage.local.set({userdata: accounts})
        }
        return;
    }
    // Confirm system change
    if (e.target.id == 'finalsystemconfirm') {
        const newsystem = (document.getElementById('profileselectsystem').value == "PassNet") ? "passNet" : document.getElementById('profileselectsystem').value  // Why does passNet have 2 separate edge cases
        new_values[6] = newsystem
        if (old_values[6] != new_values[6]) {
            const keyupdate = await fetch(`https://api.rotur.dev/users`,
                {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'system', value: newsystem})}).then(res => res.json())
            if (keyupdate.error) {
                openErrorPopup(keyupdate.error)
            } else {
                openSuccessPopup('System successfully updated')
                old_values = [...new_values]
            }
        } else {
            openErrorPopup("New value is equivalent to the old value.")
        }
    }
    if (e.target.className == 'repostbtn') {
        openRepostPopup(e.target.dataset.postid)
        return;
    }
    if (e.target.className == 'pinbtn') {
        if (e.target.title == 'Unpin Post') {
            openUninPopup(e.target.dataset.postid)
        } else {
            openPinPopup(e.target.dataset.postid)
        }
        return;

    }
    if (e.target.className == 'finalpin') {
        const postid = e.target.dataset.postid
        closePopup()
        const repostsuccess = await fetch(`https://api.rotur.dev/pin_post?auth=${activeacc.token}&id=${postid}`).then(res => res.json())
        if (repostsuccess.error) {
            openErrorPopup(repostsuccess.error)
        } else {
            openSuccessPopup("Successfully pinned post to profile!")
            /* This part is commented out because the docs say only one post can be pinned at a time. However, that is not true, according to my testing
            
            const old_pin = document.querySelector('.pinnedpostlabel:not([style="display: none"])')
            if (old_pin) {
                old_pin.style.display = 'none'
                old_pin.closest('li').querySelector('.pinbtn').querySelector('img').src = '../images/misc_icons/pin.png'
                old_pin.closest('li').querySelector('.pinbtn').title = 'Pin Post'
            }
            */
            const pinned_post = document.querySelector(`#post-${postid}`)
            pinned_post.querySelector('.pinnedpostlabel').style.display = 'block'
            pinned_post.querySelector('.pinbtn').querySelector('img').src = '../images/misc_icons/unpin.png'
            pinned_post.querySelector('.pinbtn').title = 'Unpin Post'
            document.getElementById('clawpostslist').insertBefore(pinned_post, document.getElementById('clawpostslist').firstChild)
        }
        return;
    }
    if (e.target.className == 'finalunpin') {
        const target = e.target
        const postid = e.target.dataset.postid
        closePopup()
        const repostsuccess = await fetch(`https://api.rotur.dev/unpin_post?auth=${activeacc.token}&id=${postid}`).then(res => res.json())
        if (repostsuccess.error) {
            openErrorPopup(repostsuccess.error)
        } else {
            openSuccessPopup("Successfully unpinned post from profile.")
            const pinned_post = document.querySelector(`#post-${postid}`)
            pinned_post.querySelector('.pinnedpostlabel').style.display = 'none'
            pinned_post.querySelector('.pinbtn').querySelector('img').src = '../images/misc_icons/pin.png'
            pinned_post.querySelector('.pinbtn').title = 'Pin Post'
        }
        return;
    }
    if (e.target.className == 'finalrepost') {
        const postid = e.target.dataset.postid
        closePopup()
        const repostsuccess = await fetch(`https://api.rotur.dev/repost?auth=${activeacc.token}&id=${postid}`).then(res => res.json())
        if (repostsuccess.error) {
            openErrorPopup(repostsuccess.error)
        } else {
            openSuccessPopup("This post has been reposted successfully!")
        }
        return;
    }

    // Now begins re-used functions from claw.js

    if (e.target.className == 'deletebtn') {
        openDeletePopup(e.target.dataset.postid)
        return;
    }
    if (e.target.className == 'closebtn') {
        image_cache = ''
        if (!tosrecentlyaccepted) {
            document.getElementById('changeavatarfilebtn').value = ''
            document.getElementById('changebannerfilebtn').value = ''
        }
        closePopup()
        return;
    }
    if (e.target.className == 'finaldelete') {
        const postid = e.target.dataset.postid
        const deletesuccess = await fetch(`https://api.rotur.dev/delete?auth=${activeobject.token}&id=${postid}`).then(res => res.json())
        closePopup()
        document.getElementById(`post-${postid}`).remove()
        document.getElementById(`clawpostssummary`).textContent = `Claw Posts (${document.getElementById(`clawpostslist`).childElementCount})`
        if (document.getElementById(`clawpostslist`).childElementCount == 0) {
            document.getElementById(`clawpostslist`).remove()
            document.getElementById('userclawposts').appendChild(CreateEmptyPlaceholder('You have not created any claw posts yet.', true))
        }
        return;
    }

    if (e.target.className == 'likebutton') {
        const likebtn = e.target
        let likes = parseInt(likebtn.textContent.match(/\d+\.?\d*/g));
        const like = await fetch(`https://api.rotur.dev/rate?id=${likebtn.dataset.postid}&auth=${activeobject.token}&rating=${Number(!likebtn.textContent.includes('Unlike'))}`)
        likebtn.textContent = (e.target.textContent.includes('Unlike') ? `🩶 Like (${likes - 1})` : `❤️ Unlike (${likes + 1})`)
        document.getElementById(`post-${e.target.dataset.postid}`).querySelector('[class*="viewlikes"]').disabled = ((likes - 1 == 0) && !likebtn.textContent.includes('Unlike'))
        return;
    }
    if (e.target.id == 'toaccmanager') {
        this.location.href = "../pages/accounts.html"
        return;
    }
    if (e.target.className == 'viewlikes') {
        const likes = JSON.parse(e.target.dataset.likes ?? "[]")
        if (document.getElementById(`post-${e.target.dataset.postid}`).querySelector('[class="likebutton"]').textContent.includes('Unlike') && !likes.includes(activeobject.name)) {
            likes.push(activeobject.name)
        }
        let likeshtml = `<ul class='likelist'>`
        for (let i=0; i<likes.length; i++) {
            likeshtml += `<li>
            <a href='lookup.html?user=${likes[i] || "Spectator"}'>
                <img src='https://avatars.rotur.dev/${likes[i] || "Spectator"}' alt='${likes[i] || "Spectator"}' width='24' height='24'>
                <p>${likes[i] || "Unknown User"}</p>
            </a>
            </li>`
        }
        likeshtml += `</ul>`
        openLikesPopup(likeshtml)
        return;
    }
    if (e.target.className == 'sendreply') {
        const postid = e.target.dataset.postid
        const content = document.getElementById(`post-${postid}`).querySelector('[class="replybox"]').value
        reply(postid, content)
    }
    if (e.target.className == 'copypostid') {
        try {
            await navigator.clipboard.writeText(e.target.dataset.postid);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
        return;
    }
    // Avatar and Banner handling
    if (e.target.id == 'changeavatarbtn') {
        if (e.shiftKey) {
            image_cache = await readImageFromClipboard()
            if (image_cache) {
                openPFPPopup()
            } else {
                openErrorPopup('No image was detected on your clipboard.')
            }
        } else {
            document.getElementById('changeavatarfilebtn').click()
        }
    }
    if (e.target.id == 'changebannerbtn') {
        if (e.shiftKey) {
            image_cache = await readImageFromClipboard()
            if (image_cache) {
                openBannerPopup()
            } else {
                openErrorPopup('No image was detected on your clipboard.')
            }
        } else {
            document.getElementById('changebannerfilebtn').click()
        }
    }
    if (e.target.className == 'finalpfpchange') {
        closePopup()
        const keyupdate = await fetch(`https://api.rotur.dev/users`,
            {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'pfp', value: image_cache})}).then(res => res.json())
        if (keyupdate.error) {
            openErrorPopup(keyupdate.error)
        } else {
            openSuccessPopup('Your PFP was successfully changed.')
            document.getElementById('useravatarimg').src = `https://avatars.rotur.dev/${activeobject.name}`
        }
        image_cache = ''
    }
    if (e.target.className == 'finalbannerchange') {
        closePopup()
        const keyupdate = await fetch(`https://api.rotur.dev/users`,
            {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: 'banner', value: image_cache})}).then(res => res.json())
        if (keyupdate.error) {
            openErrorPopup(keyupdate.error)
        } else {
            openSuccessPopup('Your banner was successfully changed.')
            document.getElementById('userbannerimg').src = `https://avatars.rotur.dev/.banners/${activeobject.name}`
        }
        image_cache = ''
    }
    if (e.target.id == 'togglepassvisibility') {
        if (e.target.dataset.visible == 'false') {
            e.target.dataset.visible = 'true'
            document.getElementById('oldpass').type = 'text'
            document.getElementById('newpass1').type = 'text'
            document.getElementById('newpass2').type = 'text'
            document.getElementById('passbuttonvisibilityicon').src = '../images/misc_icons/visible.png'
        } else {
            e.target.dataset.visible = 'false'
            document.getElementById('oldpass').type = 'password'
            document.getElementById('newpass1').type = 'password'
            document.getElementById('newpass2').type = 'password'
            document.getElementById('passbuttonvisibilityicon').src = '../images/misc_icons/invisible.png'
        }
    }
    // Cosmetic
    if (e.target.className == 'equipoverlay') {
        if (e.target.dataset.equipped == 'true') {
            UnequipCosmetic(e.target.dataset.cosmeticid)
        } else {
            EquipCosmetic(e.target.dataset.cosmeticid)
        }
    }
    // Dangerous Stuff
    if (e.target.id == 'newsecurityquestion') {
        getSecurityQuestion()
        const target = e.target
        target.disabled = true
        setTimeout(function() {target.disabled = false}, 30000)
    }
    if (e.target.className == 'finaldeleteacc1') {
        openDeleteAccountPopup2()
        return;
    }
    if (e.target.className == 'finaldeleteacc2') {
        openDeleteAccountPopup3()
        return;
    }
    if (e.target.className == 'finaldeleteacc3') {
        openDeleteAccountPopupFinal()
        getSecurityQuestion()
        return;
    }
    if (e.target.id == 'finalfinaldeleteacc_extremelydangerous_theresnogoingback') {
        const answer = document.getElementById('securityanswer').value
        const statement = document.getElementById('securitystatement').value
        const voidcredits = document.getElementById('voidcredits').checked
        const balance = altdata_cache.currency
        if (document.getElementById('securitystatement2').value == '') {
            if (question_cache.answers.includes(answer.toLowerCase())) {
                if (statement == `I, ${activeobject.name}, am completely sure that I want to delete my Rotur account.`) {
                    if (!voidcredits && balance > 0) {
                        const transferresult = await fetch(`https://api.rotur.dev/me/transfer?auth=${activeobject.token}`, {
                            method: "POST",
                            body: JSON.stringify({to: "Dominic", amount: balance, note: `(RA) Account deleted (Name: ${activeobject.name})`})
                        }).then(res => res.json())
                    }
                    const deletesuccess = await fetch(`https://api.rotur.dev/users/${activeobject.name}?auth=${activeobject.token}`, {method: 'DELETE'}).then(res => res.json()) // The smoking gun
                    if (deletesuccess.error) {
                        openErrorPopup(`Failed to delete your Rotur account. ${voidcredits ? "" : "If you change your mind, you may have to ask Dominic for your credits back. "}\nError Details: ${deletesuccess.error}`)
                    } else {
                        openDeleteSuccessPopup("Your Rotur account has been successfully deleted. Thank you for being a part of Rotur, and by extension, Rotur Assistant. We're sad to see you go. You will be returned to the account manager shortly.")
                        const newaccounts = accounts.filter(item => item.uuid != activeobject.uuid)
                        const newactiveacc = (activeacc.uuid == activeobject.uuid) ? (newaccounts[0] ?? {}) : activeacc
                        chrome.storage.local.set({userdata: newaccounts})
                        chrome.storage.local.set({activeacc: newactiveacc})
                        setTimeout(function() {
                            this.location.href = "../pages/accounts.html"
                        }, 15000)
                    }
                } else {
                    openErrorPopup("The security statement was wrong.")
                }
            } else {
                openErrorPopup('The security question was wrong.')
            }
        } else {
            openErrorPopup('A honeypot was triggered.')
        }
        document.getElementsByClassName('popup')[0].style.background = ''
        document.getElementsByClassName('overlay')[0].style.background = ''
        return;
    }
});

document.addEventListener('input', async function (e) {
    if (e.target.className == 'replybox') {
        const len = e.target.value.length
        updateReplyCharLimit(e.target.dataset.postid, len)
    }
})