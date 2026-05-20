let userdata_cache = ''
let altdata_cache = ''
let image_cache = ''
let tosrecentlyaccepted = false

import { sanitize, formatDate, parseHTML, openErrorPopup, openWarningPopup, openSuccessPopup } from "../index.js"

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
        chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
    ) ?? [];

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
const requestlimit = setTimeout(() => controller.abort(), 3000);

const known_badges = ['Architext', "Asier System", "Bugger", "colon three", "dev", "discord", "friendly", "gingerbug", "Nex", "originOS", "orion", "pro", "rich", "Spark", "rotur", "Constellinux", "HuopaOS", "kyrOS", "flf", "Rotur Assistant", "geec os", "OliveOS", "Warpdrive", "passNet", "originChats", "Flouride", "flouride"]

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
        <p id="deleteconfirmdialogue">This is what your banner will look like. Change your banner to this? ${["Pro", "Max"].includes(altdata_cache.subscription) ? `Since you have ${altdata_cache.subscription ?? "Free"}, this process is free!` : `Do note that by proceeding, you will be charged 10 credits.`}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalbannerchange">Set${["Pro", "Max"].includes(altdata_cache.subscription ?? "Free") ? `` : ` (-10 RC)`}</button>
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
                <input type="password" id='oldpass'>
            </label>
            <label>
                New Password:
                <input type="password" id='newpass1'>
            </label>
            <label>
                Confirm New Password:
                <input type="password" id='newpass2'>
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
    let systemhtml = ``
    systems.forEach(system => {
        systemhtml += `<option value="${system}" ${system.toLowerCase() == defaultsys.toLowerCase() ? "selected" : ""}>${system}</option>`
    })
    return systemhtml;
}

function updateReplyCharLimit(postid, num) {
    const replycharlimit = document.getElementById(`limit-${postid}`)
    replycharlimit.style = `color: ${num > (premium ? 600 : 300) ? 'red' : 'white'};`
    replycharlimit.textContent = `${num}/${(premium ? '600' : '300')}`
    document.getElementById(`post-${postid}`).querySelector('[class="sendreply"]').disabled = (num > 300)
}

function createReplyElement(reply) {
    const li = `<li>
                    <div class='postauthor'>
                        <a href='../pages/lookup.html?user=${reply.user || "Spectator"}'>
                            <img class='clawpfp' src='https://avatars.rotur.dev/${reply.user || "Spectator"}' alt='${reply.user || "Spectator"}' width='32' height='32'>
                            <h2>${reply.user || "Unknown User"}</h2>
                        </a>
                        <button class='copypostid' data-postid='${reply.id}'>Copy Reply ID</button>
                    </div>
                    <p class='postcontent'>${sanitize(reply.content)}</p>
                    ${reply.attachment ? `<img class='clawattachment' src='${sanitize(reply.attachment)}'>` : ''}
                    <p class='postmetadata'>Posted on ${formatDate(reply.timestamp)}</p>
                </li>`;
    return li;
}

function appendReplies(postdata) {
    let replybody = ``
    for (let i=0; i<postdata.replies.length; i++) {
        replybody += createReplyElement(postdata.replies[i])
    }
    return replybody
}

function createPostElement(post) {
    const repost = post.is_repost
    
    const li = `<li id="post-${post.id}" class="clawpostbody"><div class='postauthor'>
        <a href='../pages/lookup.html?user=${post.user || "Spectator"}'>
            <img class='clawpfp' src='https://avatars.rotur.dev/${post.user || "Spectator"}' href='../pages/lookup.html?user=${post.user || "Spectator"}' alt='${post.user || "Spectator"}' width='32' height='32'>
            <h2>${(post.user || "Unknown User") + (repost ? " (Repost)" : "")}</h2>
        </a>
            ${post.user == activeobject.name ? `<button class='deletebtn' title="Delete Post" data-postid='${post.id}'><img src='../images/misc_icons/delete.png' width='24' height='24'></button>` : ``}
        </div>
        <p class='postcontent'>${sanitize(repost ? post.original_post.content : post.content)}</p>
        ${(repost ? post.original_post.attachment : post.attachment) ? `<img class='clawattachment' src='${sanitize(repost ? post.original_post.attachment : post.attachment)}'>` : ''}
        <p class='postmetadata'>Posted from ${(repost ? post.original_post.os : post.os) ?? "Unknown System"} on ${formatDate(repost ? post.original_post.timestamp : post.timestamp)}</p>
        <div class='feedbackbar'>
            <button class='likebutton' data-postid='${post.id}' ${activeobject.uuid ? '' : 'disabled'}>${post.likes && post.likes.includes(activeobject.name) ? `❤️ Unlike (${post.likes ? post.likes.length : 0})` : `🩶 Like (${post.likes ? post.likes.length : 0})`}</button>
            <button class='viewlikes' data-postid='${post.id}' ${post.likes ? `data-likes=${JSON.stringify(post.likes)}` : 'disabled'}>View Likes</button>
            <button class='copypostid' data-postid='${post.id}'>Copy Post ID</button>
        </div>
        <details class='repliesbtn' data-postid='${post.id}'>
        <summary class='replydropdownlabel'>View Replies (${post.replies ? post.replies.length : 0})</summary>
            <div class='repliesplaceholder'>
                ${post.replies ? `<ul class='reply' id='replies-${post.id}'>${appendReplies(post)}</ul>` : ``}
            </div>
            <div class='replyboxplaceholder'>
                ${activeobject.uuid ? `
                <textarea class='replybox' data-postid='${post.id}' placeholder='Add a reply for ${post.user}'></textarea>
                <p class="postcharlimit" id="limit-${post.id}">0/${premium ? "600" : "300"}</p>
                <button class='sendreply' data-postid='${post.id}'>Send</button>` 
                : `<h2>Sign in to add a reply</h2>`}
            </div>
            <div class='replyerrorplaceholder'></div>
        </details>
    </li>`;
    return li;
}

function renderClawFeed(feeddata) {
    let feed_html = ``
    feeddata.forEach(post => {
        feed_html += createPostElement(post)
    });
    return feed_html;
}

async function refreshClawFeed() {
    const userdata = await fetch(`https://api.rotur.dev/profile?name=${userdata_cache.username}`).then(res => res.json())
    document.getElementById('clawpostslist').replaceChildren(...parseHTML(renderClawFeed(userdata.posts)))
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
        replystatus.replaceChildren(...parseHTML(`<p class="failure">You can't post a blank reply</p>`))
    } else {
        replysuccess = await fetch(`https://api.rotur.dev/reply?id=${postid}&auth=${activeobject.token}&content=${message}`)
        if (replysuccess.error) {
            replystatus.replaceChildren(...parseHTML(`<p class="failure">${replysuccess.error}</p>`))
        } else {
            document.getElementById(`post-${postid}`).querySelector('[class="replybox"]').value = ``
            updateReplyCharLimit(postid, 0)
            if (!document.getElementById(`post-${postid}`).querySelector('[class="reply"]')) {
                document.getElementById(`post-${postid}`).querySelector('[class="repliesplaceholder"]').replaceChildren(...parseHTML(`<ul class='reply' id='replies-${postid}'></ul>`))
            }
            document.getElementById(`post-${postid}`).querySelector('[class="reply"]').appendChild(...parseHTML(createReplyElement({id: String(Date.now() + 32767), content: message, user: activeobject.name, timestamp: Date.now()})))
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
    let transfer_html = ``
    transferdata.forEach(item => {
        if (!(item.from == null || item.from == "Null")) {
            transfer_html += `<li>
            <p>From: <img src='https://avatars.rotur.dev/${item.from}' width=20 height=20> ${item.from}</p>
            <p>To:  <img src='https://avatars.rotur.dev/${item.to}' width=20 height=20> ${item.to}</p>
            ${item.timestamp ? `<p>On: ${formatDate(item.timestamp * 1000)}</p>` : ''}
            ${item.type ? `<p>Type: ${item.type}</p>` : ''}
            </li>`
        }
    })
    if (transfer_html == ``) {
        transfer_html = `<li><h2>No history yet</h2></li>`
    }
    return transfer_html;
}

function getItems(itemdata) {
    const myitems = itemdata
    let item_html = ``
    myitems.forEach(item => {
        item_html += `<li class='roturitem' id='roturitem_${encodeURIComponent(item.name)}'>
                    <h2>${sanitize(item.name)}</h2>
                    <p class='roturitemauthor'>Creator: <img src='https://avatars.rotur.dev/${item.author}' width=20 height=20> ${item.author} | Current Owner: <img src='https://avatars.rotur.dev/${item.owner}' width=20 height=20> ${item.owner} </p>
                    <p>${sanitize(item.description)}</p>
                    <ul class='itemmetadatar1'>
                        <li>
                            <h3>Price</h3>
                            <p>${item.price} RC</p>
                        </li>
                        <li>
                            <h3>Purchaseable</h3>
                            <p class='isitempurchaseable'>${item.selling ? "Yes" : "No"}</p>
                        </li>
                    </ul>
                    <ul class='itemmetadatar2'>
                        <li>
                            <h3>Created</h3>
                            <p>${formatDate(item.created * 1000)}</p>
                        </li>
                        <li>
                            <h3>Total Revenue</h3>
                            <p>${item.total_income}</p>
                        </li>
                    </ul>
                    <details class='itemtransferhistory'>
                        <summary>Transfer History</summary>
                        <ul class='transferhistory'>${formatTransferHistory(item.transfer_history)}</ul>
                    </details>
                </li>`
    })
    if (myitems.length == 0) {
        item_html = `<li><h2>You don't own any items yet.</h2></li>`
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

function md5Hex(str) {
    function safeAdd(x, y) { const lsw=(x&0xffff)+(y&0xffff); return (((x>>16)+(y>>16)+(lsw>>16))<<16)|(lsw&0xffff); }
    function bitRotateLeft(num, cnt) { return (num<<cnt)|(num>>>(32-cnt)); }
    function md5cmn(q,a,b,x,s,t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b); }
    function md5ff(a,b,c,d,x,s,t) { return md5cmn((b&c)|((~b)&d),a,b,x,s,t); }
    function md5gg(a,b,c,d,x,s,t) { return md5cmn((b&d)|(c&(~d)),a,b,x,s,t); }
    function md5hh(a,b,c,d,x,s,t) { return md5cmn(b^c^d,a,b,x,s,t); }
    function md5ii(a,b,c,d,x,s,t) { return md5cmn(c^(b|(~d)),a,b,x,s,t); }
    function md5cycle(x, k) {
        let [a,b,c,d] = x;
        a=md5ff(a,b,c,d,k[0],7,-680876936);d=md5ff(d,a,b,c,k[1],12,-389564586);c=md5ff(c,d,a,b,k[2],17,606105819);b=md5ff(b,c,d,a,k[3],22,-1044525330);
        a=md5ff(a,b,c,d,k[4],7,-176418897);d=md5ff(d,a,b,c,k[5],12,1200080426);c=md5ff(c,d,a,b,k[6],17,-1473231341);b=md5ff(b,c,d,a,k[7],22,-45705983);
        a=md5ff(a,b,c,d,k[8],7,1770035416);d=md5ff(d,a,b,c,k[9],12,-1958414417);c=md5ff(c,d,a,b,k[10],17,-42063);b=md5ff(b,c,d,a,k[11],22,-1990404162);
        a=md5ff(a,b,c,d,k[12],7,1804603682);d=md5ff(d,a,b,c,k[13],12,-40341101);c=md5ff(c,d,a,b,k[14],17,-1502002290);b=md5ff(b,c,d,a,k[15],22,1236535329);
        a=md5gg(a,b,c,d,k[1],5,-165796510);d=md5gg(d,a,b,c,k[6],9,-1069501632);c=md5gg(c,d,a,b,k[11],14,643717713);b=md5gg(b,c,d,a,k[0],20,-373897302);
        a=md5gg(a,b,c,d,k[5],5,-701558691);d=md5gg(d,a,b,c,k[10],9,38016083);c=md5gg(c,d,a,b,k[15],14,-660478335);b=md5gg(b,c,d,a,k[4],20,-405537848);
        a=md5gg(a,b,c,d,k[9],5,568446438);d=md5gg(d,a,b,c,k[14],9,-1019803690);c=md5gg(c,d,a,b,k[3],14,-187363961);b=md5gg(b,c,d,a,k[8],20,1163531501);
        a=md5gg(a,b,c,d,k[13],5,-1444681467);d=md5gg(d,a,b,c,k[2],9,-51403784);c=md5gg(c,d,a,b,k[7],14,1735328473);b=md5gg(b,c,d,a,k[12],20,-1926607734);
        a=md5hh(a,b,c,d,k[5],4,-378558);d=md5hh(d,a,b,c,k[8],11,-2022574463);c=md5hh(c,d,a,b,k[11],16,1839030562);b=md5hh(b,c,d,a,k[14],23,-35309556);
        a=md5hh(a,b,c,d,k[1],4,-1530992060);d=md5hh(d,a,b,c,k[4],11,1272893353);c=md5hh(c,d,a,b,k[7],16,-155497632);b=md5hh(b,c,d,a,k[10],23,-1094730640);
        a=md5hh(a,b,c,d,k[13],4,681279174);d=md5hh(d,a,b,c,k[0],11,-358537222);c=md5hh(c,d,a,b,k[3],16,-722521979);b=md5hh(b,c,d,a,k[6],23,76029189);
        a=md5hh(a,b,c,d,k[9],4,-640364487);d=md5hh(d,a,b,c,k[12],11,-421815835);c=md5hh(c,d,a,b,k[15],16,530742520);b=md5hh(b,c,d,a,k[2],23,-995338651);
        a=md5ii(a,b,c,d,k[0],6,-198630844);d=md5ii(d,a,b,c,k[7],10,1126891415);c=md5ii(c,d,a,b,k[14],15,-1416354905);b=md5ii(b,c,d,a,k[5],21,-57434055);
        a=md5ii(a,b,c,d,k[12],6,1700485571);d=md5ii(d,a,b,c,k[3],10,-1894986606);c=md5ii(c,d,a,b,k[10],15,-1051523);b=md5ii(b,c,d,a,k[1],21,-2054922799);
        a=md5ii(a,b,c,d,k[8],6,1873313359);d=md5ii(d,a,b,c,k[15],10,-30611744);c=md5ii(c,d,a,b,k[6],15,-1560198380);b=md5ii(b,c,d,a,k[13],21,1309151649);
        a=md5ii(a,b,c,d,k[4],6,-145523070);d=md5ii(d,a,b,c,k[11],10,-1120210379);c=md5ii(c,d,a,b,k[2],15,718787259);b=md5ii(b,c,d,a,k[9],21,-343485551);
        return [safeAdd(a,x[0]),safeAdd(b,x[1]),safeAdd(c,x[2]),safeAdd(d,x[3])];
    }
    function str2binl(str) {
        const bin = []; const mask = (1<<8)-1;
        for (let i=0;i<str.length*8;i+=8) bin[i>>5]|=(str.charCodeAt(i/8)&mask)<<(i%32);
        return bin;
    }
    function binl2hex(binarray) {
        const hexTab='0123456789abcdef'; let str='';
        for (let i=0;i<binarray.length*4;i++) str+=hexTab.charAt((binarray[i>>2]>>((i%4)*8+4))&0xf)+hexTab.charAt((binarray[i>>2]>>((i%4)*8))&0xf);
        return str;
    }
    function md5blk(s) {
        const md5blks=[]; for(let i=0;i<64;i+=4) md5blks[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24);
        return md5blks;
    }
    const n = str.length;
    let state = [1732584193,-271733879,-1732584194,271733878];
    let i;
    for (i=64;i<=n;i+=64) state = md5cycle(state, md5blk(str.substring(i-64,i)));
    const tail = str.substring(i-64);
    const length16 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    for (i=0;i<tail.length;i++) length16[i>>2]|=tail.charCodeAt(i)<<((i%4)*8);
    length16[i>>2]|=0x80<<((i%4)*8);
    if (i>55) { state=md5cycle(state,length16); for(i=0;i<16;i++) length16[i]=0; }
    length16[14]=n*8;
    state = md5cycle(state, length16);
    return binl2hex(state);
} // Thanks Milo for this function

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

function renderFollowingFollowers(list, x, action) {
    let return_html = ``
    for (let i=0;i<list.length;i++) {
        let currentuser = list[i]
        return_html += `
        <li class='listuser' data-user='${currentuser}'><a href='../pages/lookup.html?user=${currentuser || "Spectator"}'>
            <img src='https://avatars.rotur.dev/${currentuser || "Spectator"}' alt='${currentuser || "Spectator"}' width='40' height='40'>
            <p>${currentuser || "Unknown User"}</p>
            ${action == 'acceptdeclinereq' ? 
            `<div class='profilerequestactions'>
                <button class='profileacceptreq' title="Accept Friend Request" data-user="${currentuser}" data-action='acceptreq'>✓</button>
                <button class='profiledeclinereq' title="Decline Friend Request" data-user="${currentuser}" data-action='declinereq'>✕</button>
            </div>` :
            `${x ? `<button class='profileeditremoveuser' title='${action == "unfollow" ? "Unfollow" : action == "unfriend" ? "Unfriend" : "Unblock"}' data-user="${currentuser}" data-action='${action}'>✕</button>` : ``}`}
            
        </a></li>`
    }
    return return_html;
}

async function renderProfile(userdata, altdata, token) {
    biocharlimit = (altdata.subscription == 'Pro' || altdata.subscription == 'Max') ? 1000 : (altdata.subscription == 'Drive') ? 500 : 200
    const clawposts = altdata.posts ?? []
    const name = userdata.username
    const balance = userdata['sys.currency']
    const id = userdata['sys.id']
    const followingData = await fetch(`https://api.rotur.dev/following?username=${name}`).then(res => res.json())
    const followersData = await fetch(`https://api.rotur.dev/followers?username=${name}`).then(res => res.json())
    const friends = userdata['sys.friends']
    const requests = userdata['sys.requests']
    const blocked_users = userdata['sys.blocked']
    const useritems = await fetch(`https://api.rotur.dev/items/list/${name}`).then(res => res.json())
    const following = followingData.following
    const followers = followersData.followers
    const standingData = await fetch(`https://api.rotur.dev/get_standing?username=${name}`).then(res => res.json())
    const economydata = await fetch(`https://api.rotur.dev/stats/economy`).then(res => res.json())
    const cents = parseFloat(economydata.currency_comparison.cents.split('¢')[0])
    const pence = parseFloat(economydata.currency_comparison.pence.split('p')[0])

    old_values = [userdata.username ?? '', userdata.pronouns ?? '', userdata.bio ?? '', userdata.display_name ?? '', userdata.email ?? '', userdata.phone ?? '', userdata.system ?? 'Rotur Assistant', userdata.private ?? 'false']
    new_values = [...old_values]

    await getSystemData()

    let badge_html = `<ul id="badges">
    `
    for (let i=0; i<(userdata['sys.badges'] ?? []).length; i++) {
        let badge_name = known_badges.includes(userdata['sys.badges'][i].name) ? userdata['sys.badges'][i].name : `placeholder`
        if (badge_name == 'flouride') {
            badge_name = 'Flouride'
        }
        badge_html += `
        <li><img src="../images/badges/${badge_name}.png" alt="${badge_name}" title="${badge_name == "placeholder" ? `${userdata['sys.badges'][i].name}
        
The badge shown is a placeholder badge in case Rotur Assistant doesn't recognize that badge yet.
Original badge description: ${userdata['sys.badges'][i].description}` : `${userdata['sys.badges'][i].name}
        
${userdata['sys.badges'][i].description}`}" width="16" height="16"></li>`
    }
    badge_html += `
    </ul>`

    let joindate = formatDate(userdata.created)

    let economy_html = `<h2>General Statistics</h2>
    <p>${userdata.username} has $${(balance * (cents / 100)).toFixed(2)} or £${(balance * (pence / 100)).toFixed(2)} worth of credits.</p>
    <p>${userdata.username} has ${(balance / economydata.average).toFixed(2)} times the average balance.</p>
    <p>${userdata.username} has ${((balance * 100) / economydata.total).toFixed(2)}% of all the credits in circulation.</p>
    `

    document.getElementById('lookupplaceholder').style = 'border: 2px solid white;'
    document.getElementById('lookupplaceholder').replaceChildren(...parseHTML(`
    <div class='userbanner'>
        <img class='userbanneredit' id='userbannerimg' src="https://avatars.rotur.dev/.banners/${name}" alt="${name}'s Banner">
        <button id='changebannerbtn' title="Shift-click to paste image instead">Change... (${["Pro", "Max"].includes(altdata.subscription) ? "Free!" : "-10 RC"})</button>
    </div>
    <input type="file" id="changebannerfilebtn" accept="image/*" style="display: none;">
    <div class='useravatar'>
        <img class='useravataredit' id='useravatarimg' src="https://avatars.rotur.dev/${name}" alt="${name}'s Avatar">
        ${settings[0] == `0` ? `<img class='useravataroverlay' src="https://avatars.rotur.dev/.overlay/${name}" alt="${name}'s Avatar Decoration">` : ``}
        <button id='changeavatarbtn' title="Shift-click to paste image instead">Change...</button>
    </div>
    <input type="file" id="changeavatarfilebtn" accept="image/*" style="display: none;">
    <div class="userinfoedit">
        <button id='toggleprofileview' title="Profile View (Changes will not be saved)"><img src='../images/misc_icons/usericon.png' width=24 height=24></button>
        <button id='profilereloadedit' title="Refresh Profile">⟳</button>
        <div id='editusername'>
            <label for='usernamebox'>Name: </label>
            <input type='text' class='profileeditinput' id='usernamebox' value='${userdata.username ?? ''}' placeholder='Username'>
            <button class='profilesavebtn' title='Save' id='savename'><img src='../images/misc_icons/save.png' width=24 height=24></button>
        </div>
        <div id='editpronouns'>
            <label for='pronounsbox'>Pronouns: </label>
            <input type='text' class='profileeditinput' id='pronounsbox' value='${sanitize(userdata.pronouns ?? '')}' placeholder='Pronouns'>
            <button class='profilesavebtn' title='Save' id='savepronouns'><img src='../images/misc_icons/save.png' width=24 height=24></button>
        </div>
        <div id="pronounsandbadges">
            <label for='badges' class='badgelabel'>Badges: ${badge_html}</label>
        </div>
        <div id='editbio'>
            <label for='biobox'>Bio: </label>
            <textarea id='biobox' placeholder='Bio'>${sanitize(userdata.bio ?? '')}</textarea>
            <button title='Save' id='savebio'><img src='../images/misc_icons/save.png' width=24 height=24> Save Bio</button>
            <p id="profilebiocharlimit" style="color: ${(userdata.bio ?? '').length > biocharlimit ? 'red' : 'white'}"=>${(userdata.bio ?? '').length}/${biocharlimit}</p>
        </div>
    </div>
    <div class="userinfoedit2">
        <p class="joindate">Member since: ${joindate}</p>
        <hr class="dotted_separator">
        <div class='editwidgets'>
            <div class='editdisplayname'>
                <label for='displaynamebox'>Display Name¹: </label>
                <input type='text' class='profileeditinput' id='displaynamebox' value='${sanitize(userdata.display_name ?? '')}' placeholder='Display Name'>
                <button class='profilesavebtn' title='Save' id='savedisplayname'><img src='../images/misc_icons/save.png' width=24 height=24></button>
            </div>
            <div class='editemail'>
                <label for='emailbox'>E-mail: </label>
                <input type='text' class='profileeditinput' id='emailbox' value='${sanitize(userdata.email ?? '')}' placeholder='E-mail'>
                <button class='profilesavebtn' title='Save' id='saveemail'><img src='../images/misc_icons/save.png' width=24 height=24></button>
            </div>
            <div class='editphone'>
                <label for='phonebox'>Phone #¹: </label>
                <input type='text' class='profileeditinput' id='phonebox' value='${sanitize(userdata.phone ?? '')}' placeholder='Phone'>
                <button class='profilesavebtn' title='Save' id='savephone'><img src='../images/misc_icons/save.png' width=24 height=24></button>
            </div>
            <div class='systemsedit'>
                <label>System: </label>
                <select class='systemoptions' id='profileselectsystem'>${getSystemOptions(userdata.system)}</select>
                <button class='profilesavebtn' title='Save' id='savesystem'><img src='../images/misc_icons/save.png' width=24 height=24></button>
            </div>
            <div class='privateacc'>
                <input type='checkbox' id='privateacc' ${altdata.private ? 'checked' : ''}>
                <label for='privateacc'>Private Account²</label>
                <button class='profilesavebtn' title='Save' id='saveprivate'><img src='../images/misc_icons/save.png' width=24 height=24></button>
            </div>
            <div class='saveallbtncontainer'>
                <button id='profilesaveall' title='Save All'><img src='../images/misc_icons/save.png' width=24 height=24> Save All</button>
            </div>
            <p class=profilefineprint>¹Display Name and Phone are unused so far. These fields mainly exist here for parity with https://rotur.dev/me/</p>
            <p class=profilefineprint>²Setting your account to private does not stop any information, such as your balance, from being truly private, as it will still be available in the API.</p>
        </div>
        <ul id="morebasicinfo">
            <li>
                <h3 class="infolabel">Balance</h3>
                <p class='supplementaryinfo'>${balance}</p>
            </li>
            <li>
                <h3 class="infolabel">System</h3>
                <p class='supplementaryinfo'>${userdata.system || "Heaven"}</p>
            </li>
            <li>
                <h3 class="infolabel">Subscription</h3>
                <p class='supplementaryinfo'>${altdata.subscription || "Expired"}</p>
            </li>
        </ul>
        <ul id="evenmorebasicinfo">
            <li>
                <h3 class="infolabel">Account Index</h3>
                <p class='supplementaryinfo'>${altdata.index}</p>
            </li>
            <li>
                <h3 class="infolabel">Private</h3>
                <p class='supplementaryinfo'>${altdata.private ?? 'false'}</p>
            </li>
            <li>
                <h3 class="infolabel">Standing</h3>
                <p class='supplementaryinfo'>${standingData.error ? "Banned" : standingData.standing.replace(/^./, char => char.toUpperCase())}</p>
            </li>
        </ul>
        <h3 class="infolabel">Rotur UUID</h3>
        <p class='supplementaryinfo'>${id}</p>
        ${userdata.discord_id ? `
            <hr>
            <h3 class="infolabel">Discord ID</h3>
            <p class='supplementaryinfo'>${userdata.discord_id}</p>
            ` : ``}
        <hr>
    </div>
    <div class="userinfo3">
        <details class="followingpanel">
            <summary id='friendssummary'>Friends (${friends.length})</summary>
            <ul class='followuserlist' id="friendslist">${renderFollowingFollowers(friends, true, 'unfriend') || `<li><h2>You have not befriended any users yet.</h2></li>`}</ul>
        </details>
        <hr class="dotted_separator">
        <details class="followingpanel">
            <summary id='requestssummary'>Friend Requests (${requests.length})</summary>
            <ul class='followuserlist' id="requestslist">${renderFollowingFollowers(requests, true, 'acceptdeclinereq') || `<li><h2>You have no pending friend requests.</h2></li>`}</ul>
        </details>
        <hr class="dotted_separator">
        <details class="followingpanel">
            <summary id='followingsummary'>Following (${following.length})</summary>
            <ul class='followuserlist' id="followinglist">${renderFollowingFollowers(following, true, 'unfollow') || `<li><h2>You have not followed any users yet.</h2></li>`}</ul>
        </details>
        <hr class="dotted_separator">
        <details class="followingpanel">
            <summary id='followerssummary'>Followers (${followers.length})</summary>
            <ul class='followuserlist' id="followerslist">${renderFollowingFollowers(followers, false, 'do_nothing') || `<li><h2>You have no followers yet.</h2></li>`}</ul>
        </details>
        <hr class="dotted_separator">
        <details class="followingpanel">
            <summary id='blockedsummary'>Blocked (${blocked_users.length})</summary>
            <ul class='followuserlist' id="blockedlist">${renderFollowingFollowers(blocked_users, true, 'unblock') || `<li><h2>You have not blocked any users yet.</h2></li>`}</ul>
        </details>
        <hr class="dotted_separator">
        <details id="userclawposts">
            <summary id='clawpostssummary'>Claw Posts (${clawposts.length})</summary>
            ${altdata.posts ? `<ul id="clawpostslist">${renderClawFeed(altdata.posts)}</ul>` : `<h2>You have not created any claw posts yet.</h2>`}
        </details>
        <hr class="dotted_separator">
        <details id="useritems">
            <summary>Items (${useritems.length})</summary>
            ${useritems.length ? `<ul class="roturuseritemlist">${getItems(useritems)}</ul>` : `<h2>You do not own any items yet.</h2>`}
        </details>
        <hr class="dotted_separator">
        <details id="economicstats">
            <summary>Economic Info</summary>
            <div id="economicplaceholder">${economy_html}</div>
        </details>
        <hr class="dotted_separator">
        <details id="dangerousoptionscontainer">
            <summary>Danger Zone</summary>
            <p class='dangerzonefineprint'>Make sure you absolutely know what you're doing when messing with these settings. The developers of Rotur Assistant won't be responsible for loss of access to your account, or even worse: Account deletion.</p>
            <button id='changepass'>Change Password</button>
            <button id='copytoken'>Copy Account Token</button>
            <button id='accrefreshtoken'>Refresh Account Token</button>
            <button id='deleteacc_verydangerous'><img src='../images/misc_icons/delete.png' width=24 height=24>Delete Account</button>
        </details>
    </div>
    `))
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
    if (activeobject.uuid && !flagged.includes(activeobject.uuid)) {
        premium = await fetch(`https://api.rotur.dev/keys/check/${activeobject.name}?key=bd6249d2b87796a25c30b1f1722f784f`, {signal: controller.signal}).then(res => res.json()).catch((err) => {
            clearTimeout(requestlimit)
            console.warn('An error occurred while checking for Claw premium')
            return ({owned: false})
        })
        premium = premium.owned
    }
    const altdata = await fetch(`https://api.rotur.dev/profile?name=${user}&auth=${activeobject.token}`).then(res => res.json())
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
    if (e.target.id == 'profilesaveall') {
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
        if (successlogger > 0) {
            openSuccessPopup(`Settings successfully updated${errorlogger > 0 ? `, though there were issues updating ${errorlogger} of the values.` : `!`}`)
        }
        return;
    }

    // Social Action Buttons (unfriend, unfollow, unblock, etc.)

    if (e.target.className == 'profileeditremoveuser') {
        e.preventDefault();
        const btnaction = e.target.dataset.action
        const targetuser = e.target.dataset.user
        switch (btnaction) {
            case ('unfriend'): {
                openUnfriendPopup(targetuser)
                break;
            }
            case ('unfollow'): {
                openUnfollowPopup(targetuser)
                break;
            }
            case ('unblock'): {
                openUnblockPopup(targetuser)
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
        const oldpass = md5Hex(document.getElementById('oldpass').value)
        const newpass1 = document.getElementById('newpass1').value
        const newpass2 = document.getElementById('newpass2').value
        const user_check = await fetch(`https://api.rotur.dev/get_user?username=${activeobject.name}&password=${oldpass}`).then(res => res.json())
        if (user_check['sys.id'] == activeobject.uuid) {
            if ((newpass1 === newpass2) && (newpass1 != '')) {
                const passchangesuccess = await fetch(`https://api.rotur.dev/users`,
                {method: 'PATCH', body: JSON.stringify({auth: activeobject.token, key: "password", value: md5Hex(newpass1)})}).then(res => res.json())
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
        } else {
            openErrorPopup('Old password was invalid.')
        }
        return;
    }
    if (e.target.id == 'copytoken') {
        try {
            await navigator.clipboard.writeText(activeobject.token);
            openSuccessPopup('Account token copied successfully')
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
                document.getElementById('friendslist').replaceChildren(...parseHTML('<li><h2>You have not befriended any users yet.</h2></li>'))
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
                document.getElementById('blockedlist').replaceChildren(...parseHTML('<li><h2>You have not blocked any users yet.</h2></li>'))
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
                document.getElementById('followinglist').replaceChildren(...parseHTML('<li><h2>You have not followed any users yet.</h2></li>'))
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
                document.getElementById('requestslist').replaceChildren(...parseHTML('<li><h2>You have no pending friend requests.</h2></li>'))
            }
            if (document.getElementById('friendssummary').textContent.includes('0')) {
                document.getElementById('friendslist').replaceChildren()
            }
            document.getElementById('friendslist').appendChild(...parseHTML(`
            <li class='listuser' data-user='${user}'><a href='../pages/lookup.html?user=${user || "Spectator"}'>
            <img src='https://avatars.rotur.dev/${user || "Spectator"}' alt='${user || "Spectator"}' width='40' height='40'>
            <p>${user || "Unknown User"}</p>
            <button class='profileeditremoveuser' title='Unfriend' data-user=${user} data-action='unfriend'>✕</button>
            </a></li>`))
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
                document.getElementById('requestslist').replaceChildren(...parseHTML('<li><h2>>You have no pending friend requests.</h2></li>'))
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
        const newsystem = document.getElementById('profileselectsystem').value
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
            document.getElementById('userclawposts').appendChild(...parseHTML(`<h2>You have not created any claw posts yet.</h2>`))
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
                    openErrorPopup(`Failed to delete your Rotur account. ${voidcredits ? "" : "If you change your mind, you may have to ask Dominic for your credits back."}`)
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