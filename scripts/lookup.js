let is_banned = false;
let searchtype = 'auto'
let reloadinprogress = false

let userdata_cache = ''
let you_cache = ''
let outgoing_cache = ''

let user_cache = 'MRBELLY'

import { sanitize, formatDate, parseHTML, openErrorPopup, openWarningPopup, openSuccessPopup, CreateEmptyPlaceholder, MiniError } from "../index.js"

function desanitize(string) {
    return string.replaceAll('&sol;','/').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&lpar;', '(').replaceAll('&rpar;', ')').replaceAll("&equals;", "=").replaceAll(`&quot;`, `"`).replaceAll(`&#39;`, `'`).replaceAll('&amp;', '&') // Used for handling items since Rotur decided to use the direct item names as the IDs instead.
}

const accounts = await new Promise(resolve =>
        chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
    ) ?? [];

const settings = await new Promise(resolve =>
        chrome.storage.local.get('settings', data => resolve(data.settings || "0000000"))
    ) ?? "00000000";

let accountsarray = []
accounts.forEach(acc => {
    accountsarray.push(acc.name)
})

async function getNotes() {
    const notes1 = await new Promise(resolve =>
        chrome.storage.sync.get('notes1', data => resolve(data.notes1 || {}))
    ) ?? {};
    const notes2 = await new Promise(resolve =>
        chrome.storage.sync.get('notes2', data => resolve(data.notes2 || {}))
    ) ?? {};
    const notes3 = await new Promise(resolve =>
        chrome.storage.sync.get('notes3', data => resolve(data.notes3 || {}))
    ) ?? {};
    const notes4 = await new Promise(resolve =>
        chrome.storage.sync.get('notes4', data => resolve(data.notes4 || {}))
    ) ?? {};
    const notes5 = await new Promise(resolve =>
        chrome.storage.sync.get('notes5', data => resolve(data.notes5 || {}))
    ) ?? {};
    return ({...notes1, ...notes2, ...notes3, ...notes4, ...notes5})
}

async function setNotes(notesobject) {
    const notes1 = Object.fromEntries(Object.entries(notesobject).slice(0, 20)) ?? {};
    const notes2 = Object.fromEntries(Object.entries(notesobject).slice(20, 40)) ?? {};
    const notes3 = Object.fromEntries(Object.entries(notesobject).slice(40, 60)) ?? {};
    const notes4 = Object.fromEntries(Object.entries(notesobject).slice(60, 80)) ?? {};
    const notes5 = Object.fromEntries(Object.entries(notesobject).slice(80, 100)) ?? {};
    chrome.storage.sync.set({notes1: notes1})
    chrome.storage.sync.set({notes2: notes2})
    chrome.storage.sync.set({notes3: notes3})
    chrome.storage.sync.set({notes4: notes4})
    chrome.storage.sync.set({notes5: notes5})
}

const notes = await getNotes()

const activeacc = await new Promise(resolve =>
        chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
    ) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

const known_badges = ['Architext', "Asier System", "Bugger", "colon three", "dev", "discord", "friendly", "gingerbug", "Nex", "originOS", "orion", "pro", "rich", "Spark", "rotur", "Constellinux", "HuopaOS", "kyrOS", "flf", "Rotur Assistant", "OliveOS", "geec os", "Warpdrive", "passNet", "PassNet", "originChats", "Fluoride", "fluoride", 'plus']

// Re-using code from claw.js for the claw posts section

let premium = false;

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

function openFriendPopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm Request</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Send ${user} a friend request?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalsendreq" data-user='${user}'>Send Request</button>
        </div>
    `))
}

function openBlockPopup(user, isFriends, isFollowing, outgoing) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Block User?</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Block ${user}? Do note that the effectiveness of blocking them varies depending on what Rotur service you use.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalblock" data-user='${user}'>Block</button>
        </div>
        <div class='blockextraoptions'>
        ${isFriends ? `
            <label>
                <input type='checkbox' id='unfriendthenblock'>
                Also unfriend ${user}
            </label>
            ` : ``}
        ${outgoing ? `
            <label>
                <input type='checkbox' id='cancelthenblock'>
                Also cancel your friend request to ${user}
            </label>
            ` : ``}
        ${isFollowing ? `
            <label>
                <input type='checkbox' id='unfollowthenblock'>
                Also unfollow ${user}
            </label>
            ` : ``}
        </div>
    `))
}

function openRequestPopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Manage Request</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">${user} has sent you a friend request. What would you like to do?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Ignore</button>
            <button class="rejectreq" data-user='${user}'>Decline</button>
            <button class="acceptreq" data-user='${user}'>Accept</button>
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

function openUnblockPopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Unblock User</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to unblock ${user}?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalunblock" data-user='${user}'>Unblock</button>
        </div>
    `))
}

function openCancelRequestPopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Manage Request</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">You currently have an outgoing friend request to ${user}. Do you want to cancel it?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finalfriendcancel" data-user='${user}'>Yes</button>
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

//End of popup code. Now begins re-used claw.js code

function updateReplyCharLimit(postid, num) {
    const replycharlimit = document.getElementById(`limit-${postid}`)
    replycharlimit.style = `color: ${num > (premium ? 600 : 300) ? 'red' : 'white'};`
    replycharlimit.textContent = `${num}/${premium ? "600" : "300"}`
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
    if (!activeacc.uuid || flagged.includes(activeacc.uuid)) {
        clawpost.querySelector('.repostbtn').remove()
        clawpost.querySelector('.deletebtn').remove()
        clawpost.querySelector('.pinbtn').remove()
    } else if (post.user != activeacc.name) {
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

    clawpost.querySelector('.likebutton').textContent = `${post.likes && post.likes.includes(activeacc.name) ? `❤️ Unlike (${post.likes ? post.likes.length : 0})` : `🩶 Like (${post.likes ? post.likes.length : 0})`}`
    clawpost.querySelector('.likebutton').disabled = !activeacc.uuid
    if (post.likes) {
        clawpost.querySelector('.viewlikes').dataset.likes = JSON.stringify(post.likes)
    } else {
        clawpost.querySelector('.viewlikes').disabled = true
    }
    clawpost.querySelector('.replydropdownlabel').textContent = `View Replies (${post.replies ? post.replies.length : 0})`
    if (activeacc.uuid) {
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
        replysuccess = await fetch(`https://api.rotur.dev/reply?id=${postid}&auth=${activeacc.token}&content=${message}`)
        if (replysuccess.error) {
            replystatus.replaceChildren(MiniError('failure', replysuccess.error))
        } else {
            document.getElementById(`post-${postid}`).querySelector('[class="replybox"]').value = ``
            updateReplyCharLimit(postid, 0)
            if (!document.getElementById(`post-${postid}`).querySelector('[class="reply"]')) {
                document.getElementById(`post-${postid}`).querySelector('[class="repliesplaceholder"]').replaceChildren(...parseHTML(`<ul class='reply' id='replies-${postid}'></ul>`))
            }
            document.getElementById(`post-${postid}`).querySelector('[class="reply"]').appendChild(createReplyElement({id: String(Date.now() + 32767), content: message, user: activeacc.name, timestamp: Date.now()}))
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

// Some code borrowed from items.js

function openConfirmPurchasePopup(senderdata, recipientdata, amt, itemname) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm Purchase</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p>Confirm purchase of the item ${itemname}?</p>
        <p>Your Balance: ${senderdata['sys.currency']} -> ${senderdata['sys.currency'] - amt}</p>
        <p>${recipientdata.username}'s Balance: ${recipientdata.currency} -> ${recipientdata.currency + amt}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalitempurchase" data-itemname="${sanitize(itemname)}">Buy</button>
        </div>
    `))
}

function formatTransferHistory(transferdata) {
    const transfer_html = []
    const config = {
        elements: ['p', 'img'],
        attributes: ['src', 'width', 'height']
    }
    const sanitizer = new Sanitizer(config)
    transferdata.forEach(item => {
        if (!(item.from == null || item.from == "Null")) {
            const li = document.createElement('li')
            const p1 = document.createElement('p')
            p1.setHTML(`From: <img src="https://avatars.rotur.dev/${item.from}" width=20 height=20> ${item.from}`, {sanitizer: sanitizer})
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
    const config = {
        elements: ['p', 'img'],
        attributes: ['src', 'width', 'height'] // 
    }
    const sanitizer = new Sanitizer(config)
    if (myitems.length == 0) {
        const li = document.createElement('li')
        const h2 = document.createElement('h2')
        h2.textContent = "This user does not own any items yet."
        li.style = 'border-top: none;'
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

            const buybtn = roturitem.querySelector('.buyitem')
            buybtn.dataset.itemname = item.name
            buybtn.dataset.owner = item.owner
            buybtn.dataset.amt = item.price
            buybtn.textContent = `Buy (${item.price} RC)`
            buybtn.disabled = ((!item.selling) || item.owner == activeacc.name)

            roturitem.querySelector('.transferhistory').replaceChildren(...formatTransferHistory(item.transfer_history))
            item_html.push(roturitem)
        })
    }
    return item_html;
}

// End of all functions reused from other files

function openPopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>${is_banned ? 'Banned User' : 'Private Profile'}</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <h3>${is_banned ? "This user's account has been banned. View anyways?" : "This user's 'private' setting is set to true. View anyways?"}</h3>
        <div id="popup-choices">
            <button id="cancel" class="closebtn" data-closeprivate="true">No</button>
            <button id="viewanyway">Yes</button>
        </div>
    `))
}

function openConfirmClearNotePopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Clear Note</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to clear the note you have for this user?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finalnoteclear">Yes</button>
        </div>
    `))
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

function renderFollowingFollowers(list) {
    const return_html = []
    for (let i=0;i<list.length;i++) {
        let currentuser = list[i]
        const listusertemplate = document.getElementById('listusertemplate').content.cloneNode(true)
        listusertemplate.querySelector('li').dataset.user = (currentuser || "Spectator")
        listusertemplate.querySelector('a').href = `lookup.html?user=${currentuser}`
        listusertemplate.querySelector('img').src = `https://avatars.rotur.dev/${currentuser || "Spectator"}`
        listusertemplate.querySelector('p').textContent = (currentuser || "Unknown User")
        return_html.push(listusertemplate)
    }
    return return_html;
}

async function renderProfile(userdata, you) {
    const clawposts = userdata.posts ?? []
    const name = userdata.username
    const balance = userdata.currency
    const id = userdata.id
    const badges = userdata.badges ?? []
    const followingData = await fetch(`https://api.rotur.dev/following?username=${name}`).then(res => res.json())
    const followersData = await fetch(`https://api.rotur.dev/followers?username=${name}`).then(res => res.json())
    const following = followingData.following
    const followers = followersData.followers
    const standingData = await fetch(`https://api.rotur.dev/get_standing?username=${name}`).then(res => res.json())
    const economydata = await fetch(`https://api.rotur.dev/stats/economy`).then(res => res.json())
    const useritems = await fetch(`https://api.rotur.dev/items/list/${name}`).then(res => res.json())
    const userstatus = userdata.status ?? {}
    useritems.reverse()
    const cents = parseFloat(economydata.currency_comparison.cents.split('¢')[0])
    const pence = parseFloat(economydata.currency_comparison.pence.split('p')[0])
    let isfollowinguser = false
    let isfollowedbyuser = false
    let isfriends = false
    let requestinprogress = false
    let isBlocked = false
    let outgoingrequest = false
    if (activeacc.uuid && !flagged.includes(activeacc.uuid) && you) {
        isfollowinguser = following.includes(activeacc.name)
        isfollowedbyuser = followers.includes(activeacc.name)
        isfriends = you['sys.friends'] && you['sys.friends'].includes(name)
        requestinprogress = you['sys.requests'] && you['sys.requests'].includes(name)
        isBlocked = you['sys.blocked'] && you['sys.blocked'].includes(name)
        outgoingrequest = outgoing_cache.includes(name)
    }

    const profile = document.getElementById('profiletemplate').content.cloneNode(true)
    const joindate = formatDate(userdata.created)

    const config = {
        elements: ['p', 'img', 'a'],
        attributes: ['src', 'width', 'height', 'href', 'rel', 'target']
    }
    const sanitizer = new Sanitizer(config)

    if ((userdata.system.toLowerCase() == 'passnet') && !(badges.some(item => item.name.toLowerCase() == 'passnet'))) {
        badges.push({name: "PassNet", description: "This account was created on PassNet", icon: ''})
    }
    const badgelist = profile.querySelector('#badges')
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
        document.querySelector('#badges')?.remove()
    }

    const economy_html = []
    const h2 = document.createElement('h2')
    h2.textContent = "General Statistics"

    const p1 = document.createElement('p')
    const p2 = document.createElement('p')
    const p3 = document.createElement('p')

    p1.textContent = `${is_banned ? user_cache : name} has $${(balance * (cents / 100)).toFixed(2)} or £${(balance * (pence / 100)).toFixed(2)} worth of credits.`
    p2.textContent = `${is_banned ? user_cache : name} has ${(balance / economydata.average).toFixed(2)} times the average balance.`
    p3.textContent = `${is_banned ? user_cache : name} has ${((balance * 100) / economydata.total).toFixed(2)}% of all the credits in circulation.`

    economy_html.push(h2)
    economy_html.push(p1)
    economy_html.push(p2)
    economy_html.push(p3)

    if (you) {
        const yourcurrency = you['sys.currency']
        const hrbar = document.createElement('hr')
        const h2_2 = document.createElement('h2')
        h2_2.textContent = "Compared to you"
        hrbar.className = 'dotted_separator'
        const p4 = document.createElement('p')
        const p5 = document.createElement('p')
        economy_html.push(hrbar)
        economy_html.push(h2_2)
        if (yourcurrency > balance) {
            let multiplier = yourcurrency / balance
            let diff = yourcurrency - balance
            if (multiplier == Infinity) {
                multiplier = '∞';
            }
            p4.textContent = `You have ${(String(diff).length > 10) ? diff.toFixed(2) : diff} more credits than ${is_banned ? user_cache : name}.`
            p5.textContent = `Your balance is ${(String(multiplier).includes('.')) ? multiplier.toFixed(2) : multiplier}× that of ${is_banned ? user_cache : name}'s balance.`
            economy_html.push(p4)
            economy_html.push(p5)
        } else if (yourcurrency < balance) {
            let multiplier = balance / yourcurrency
            let diff = balance - yourcurrency
            if (multiplier == Infinity) {
                multiplier = '∞';
            }
            p4.textContent = `${name} has ${(String(diff).length > 10) ? diff.toFixed(2) : diff} more credits than you.`
            p5.textContent = `${name}'s balance is ${(String(multiplier).includes('.')) ? multiplier.toFixed(2) : multiplier}× that of yours.`
            economy_html.push(p4)
            economy_html.push(p5)
        } else {
            p4.textContent = `You and ${name} have the exact same number of credits (${balance}).`
            economy_html.push(p4)
            p5.remove()
        }
    }

    profile.querySelector('#usertitle').textContent = is_banned ? user_cache : name // Get around banned users showing up as "usernameloli" regardless of query
    profile.querySelector('#pronouns').innerText = (userdata.pronouns ?? '')
    profile.querySelector('#pronouns').title = `${name}'s Pronouns`
    if (userstatus.status) {
        profile.querySelector('.userstatus').textContent = userstatus.status
    } else {
        profile.querySelector('.userstatus').remove()
        profile.querySelector('#status_separator').remove()
    }
    if (settings[6] == '1') {
        profile.querySelector('.statusicon').remove()
    } else {
        profile.querySelector('.statusicon').style.background = (() => {
            switch (userstatus.presence) {
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
        profile.querySelector('.statusicon').title = (userstatus.presence ?? 'offline')
    }

    if (!userdata.pronouns) {
        profile.querySelector('#pronouns').remove()
    }
    if (userdata.bio) {
        profile.querySelector('.bio').innerText = (userdata.bio ?? '')
        profile.querySelector('.bio').title = `${name}'s Bio`
    } else {
        profile.querySelector('.bio').remove()
    }
    if (is_banned) {
        profile.querySelector(".userbanner").src = `../images/misc_assets/banned_banner.png`
    } else {
        profile.querySelector(".userbanner").src = `https://avatars.rotur.dev/.banners/${name}`
    }
    profile.querySelector(".userbanner").alt = `${name}'s Banner`

    profile.querySelector('.useravatarview').src = `https://avatars.rotur.dev/${name}`
    profile.querySelector('.useravatarview').alt = `${name}'s Avatar`
    if (settings[0] == '0') {
        profile.querySelector('.useravataroverlay').src = `https://avatars.rotur.dev/.overlay/${name}`
        profile.querySelector('.useravataroverlay').alt = `${name}'s Avatar Decoration`
    } else {
        profile.querySelector('.useravataroverlay').remove()
    }
    const socialactionbar = profile.querySelector('.socialactionbarbuttons')
    socialactionbar.querySelectorAll('[data-targetname]').forEach(btn => {
        btn.dataset.targetname = name
    })
    const followbtn = socialactionbar.querySelector('#followuser')
    const friendbtn = socialactionbar.querySelector('#addfriend')
    const blockbtn = socialactionbar.querySelector('#profileblockbutton')
    const editbtn = socialactionbar.querySelector('#profileeditbutton')
    const reloadbtn = socialactionbar.querySelector('#profilereload')
    if (!isfollowinguser) {
        profile.querySelector('.socialstatus').remove()
    }
    if (activeacc.uuid && !flagged.includes(activeacc.uuid) && name != activeacc.name && !is_banned) {
        followbtn.dataset.following = isfollowedbyuser
        followbtn.textContent = isfollowedbyuser ? `✕ Unfollow` : `+ Follow`

        friendbtn.dataset.friendstatus = isfriends ? "friend" : (requestinprogress ? "request" : (outgoingrequest ? "pending" : "nofriend"))
        friendbtn.title = isfriends ? "Friends" : (requestinprogress ? "Manage Incoming Request" : (outgoingrequest ? "Manage Outgoing Request" : "Add Friend"))
        friendbtn.querySelector('img').src = `../images/misc_icons/${isfriends ? "friend" : ((requestinprogress || outgoingrequest) ? "pendingrequest" : "add_friend")}.png`

        blockbtn.dataset.friendstatus = isfriends
        blockbtn.dataset.requeststatus = outgoingrequest
        blockbtn.dataset.following = isfollowedbyuser
        blockbtn.dataset.blocked = isBlocked
        blockbtn.title = isBlocked ? "Unblock User" : "Block User"
        blockbtn.querySelector('img').src = `../images/misc_icons/${isBlocked ? "unblock" : "block"}.png`
    } else {
        followbtn.remove()
        friendbtn.remove()
        blockbtn.remove()
    }
    if (!(activeacc.uuid && !flagged.includes(activeacc.uuid) && accountsarray.includes(name))) {
        editbtn.remove()
    }

    profile.querySelector('.joindate').textContent = `Member since: ${joindate}`
    profile.querySelector('#balanceinfo').textContent = balance
    profile.querySelector('#systeminfo').textContent = (userdata.system || "Heaven")
    profile.querySelector('#subinfo').textContent = (userdata.subscription || "Expired")
    profile.querySelector('#accidx').textContent = userdata.index
    profile.querySelector('#groupinfo').setHTML((userdata.group_tag ? `<a href="https://rotur.dev/groups/${sanitize(userdata.group_tag)}" target='_blank' rel='noopener noreferrer'>${sanitize(userdata.group_tag)}</a>` : 'None'), {sanitizer: sanitizer})
    profile.querySelector('#standinginfo').textContent = standingData.error ? "Banned" : standingData.standing.replace(/^./, char => char.toUpperCase())
    profile.querySelector('#uuidinfo').textContent = id
    profile.querySelector('#rausernotefield').value = (notes[name] ?? '')
    profile.querySelector('#ranotecharlimit').textContent = `${(notes[name] ?? '').length}/300`;
    if (!id) {
        profile.querySelector('#useruuidplaceholder').remove()
        profile.querySelector('.uuidbar').remove()
    }
    following.length ? profile.querySelector('#followinglist').replaceChildren(...renderFollowingFollowers(following)) : ``
    followers.length ? profile.querySelector('#followerslist').replaceChildren(...renderFollowingFollowers(followers)) : ``
    userdata.posts ? profile.querySelector('#clawpostslist').replaceChildren(...renderClawFeed(userdata.posts)) : ``
    useritems ? profile.querySelector('.roturuseritemlist').replaceChildren(...getItems(useritems)) : ``
    profile.querySelector('#followingsummary').textContent = `Following (${following.length})`
    profile.querySelector('#followerssummary').textContent = `Followers (${followers.length})`
    profile.querySelector('#clawpostssummary').textContent = `Claw Posts (${clawposts.length})`
    profile.querySelector('#useritemssummary').textContent = `Items (${useritems.length})`
    profile.querySelector('#economicplaceholder').replaceChildren(...economy_html)

    document.getElementsByClassName('beforeprofile')[0].style.display = 'block'
    document.getElementById('lookupplaceholder').replaceChildren(profile)
    document.getElementById('lookupplaceholder').style = 'border: 2px solid white; display: flex;'
    document.getElementById('lookuperror').replaceChildren()
}

async function performSearch(user) {
    user_cache = user
    const controller = new AbortController()
    const requestlimit = setTimeout(() => controller.abort(), 5000);
    const controller2 = new AbortController()
    const requestlimit2 = setTimeout(() => controller2.abort(), 12000);
    let searchtype2 = searchtype;
    if (user == '') {
        document.getElementById('lookuperror').replaceChildren(MiniError('failure', `Please enter a ${document.getElementById('usersearchbarinput').placeholder}`))
        setTimeout(function() {
            document.getElementById('lookuperror').replaceChildren()
        }, 10000)
        return;
    }
    is_banned = false;
    document.getElementById('lookuperror').replaceChildren()
    const number_regex = /^\d+$/

    if (searchtype == 'auto') { // Milo wanted me to add an option for automatically determining whether the input falls into one of the 3 search categories
        if (user.length > 21 && user.includes('-')) {
            searchtype2 = 'id'
        } else if (user.length > 15 && number_regex.test(user)) {
            searchtype2 = 'discord_id'
        } else {
            searchtype2 = 'name'
        }
    }
        document.getElementById('lookuperror').replaceChildren(MiniError('partialsuccess', 'Loading...'))
    const userdata = await fetch(`https://api.rotur.dev/profile?${searchtype2}=${user}${(activeacc.uuid && !flagged.includes(activeacc.uuid)) ? `&auth=${activeacc.token}` : ``}`, {signal: controller2.signal}).then(res => res.json()).catch((err) => {
        document.getElementById('lookuperror').replaceChildren(MiniError('failure', `An error occurred while searching this user's profile. This could be due to a deadlock, Rotur being down, or your internet connection. Please try again later.`))
        clearTimeout(requestlimit2)
        setTimeout(function() {
            document.getElementById('lookuperror').replaceChildren()
        }, 10000)
        return;
    }) // Added auth to decrease rate limits
    clearTimeout(requestlimit2)
    if (!userdata) {
        document.getElementById('lookuperror').replaceChildren(MiniError('failure', `An error occurred while searching this user's profile. This could be due to a deadlock, Rotur being down, or your internet connection. Please try again later.`))
        setTimeout(function() {
            document.getElementById('lookuperror').replaceChildren()
        }, 10000)
        return;   
    }
    if (userdata.error) {
        document.getElementById('lookuperror').replaceChildren(MiniError('failure', `${searchtype == 'auto' ? 'No account was found that matches the inputted username, UUID, or Discord ID' : searchtype2 == 'name' ? 'No account with that username was found' : (searchtype2 == 'id' ? 'No account with that UUID was found' : 'No account associated with that Discord ID was found.')}`))
        setTimeout(function() {
            document.getElementById('lookuperror').replaceChildren()
        }, 10000)
        return;
    }
    let you = null
    if (flagged.includes(activeacc.uuid)) {
        openWarningPopup('Due to an authentication issue that has been detected with your account, some interaction features have been disabled.')
        premium = false
    } else {
        you = activeacc.uuid ? (you_cache ? you_cache : await fetch(`https://api.rotur.dev/get_user?auth=${activeacc.token}`).then(res => res.json())) : null
        if (you) {
            if ((you.error && (you.error == 'Invalid authentication credentials') && !you.username) || (you['sys.banned'])) {
                flagged.push(activeacc.uuid)
                chrome.storage.local.set({flagged: flagged})
                openWarningPopup('Due to an authentication issue that has been detected with your account, some interaction features have been disabled.')
                you = null;
            }
            if (you && !(you['sys.tos_accepted'])){
                openWarningPopup('Since your current active account has not accepted the Rotur TOS (it may have been updated since your last visit), some interaction features have been disabled.')
                you = null;
            } else if (you && (you['sys.email_verified'] === false)) {
                openWarningPopup('Since your current active account has not verified its email yet, some interaction features have been disabled.')
                you = null;
            } else {
                outgoing_cache = activeacc.uuid ? (outgoing_cache ? outgoing_cache : await fetch(`https://api.rotur.dev/friends/requests_out?auth=${activeacc.token}`).then(res => res.json()).then(res => res.requests_out)) : []
            }
        }
    }
    if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
        premium = await fetch(`https://api.rotur.dev/keys/check/${activeacc.name}?key=bd6249d2b87796a25c30b1f1722f784f`, {signal: controller.signal}).then(res => res.json()).catch((err) => {
            clearTimeout(requestlimit)
            console.warn('An error occurred while checking for Claw premium')
            return ({owned: false})
        })
        premium = premium.owned
        clearTimeout(requestlimit)
    }
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    const bypassprivate = Boolean(urlParams.get('bypass')) || reloadinprogress; // Skip the private profile popup if one of these conditions is met
    userdata_cache = userdata

    you_cache = you

    if (userdata['sys.banned']) {
        is_banned = true
        openPopup()
        return;
    }
    is_banned = false;
    if (userdata.private && !bypassprivate) {
        openPopup()
        return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('user', userdata.username); // Cache the username in case you switch accounts while on someone's profile
    window.history.replaceState(null, '', url);

    renderProfile(userdata, you)
}

async function checkParam() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    const lookupuser = urlParams.get('user');
    const lookupid = urlParams.get('id')

    if (lookupuser) {
        searchtype = 'name'
        document.querySelector("#typeofsearch input[value='name']").checked = true
        document.getElementById('usersearchbarinput').value = lookupuser
        performSearch(lookupuser)
    } else if (lookupid) {
        searchtype = 'id'
        document.querySelector("#typeofsearch input[value='id']").checked = true
        document.getElementById('usersearchbarinput').value = lookupid
        performSearch(lookupid)
    }
}

checkParam()

document.getElementById('usersearchbar').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = document.getElementById('usersearchbarinput').value;
    performSearch(query);
});

document.addEventListener('click', async function(e) {
    if (e.target.id == 'profilereload') {
        document.getElementById('profilereload').textContent = '…'
        document.getElementById('profilereload').disabled = true;
        searchtype = 'name'
        reloadinprogress = true
        await performSearch(userdata_cache.username)
        document.getElementById('profilereload').textContent = '⟳'
        document.getElementById('profilereload').disabled = false;
        reloadinprogress = false
    }
    if (e.target.id == 'viewanyway') {
        closePopup()
        renderProfile(userdata_cache, you_cache)
        return;
    }
    if (e.target.id == 'followuser') {
        const target = e.target
        const name = target.dataset.targetname
        const isFollowed = JSON.parse(target.dataset.following)
        if (isFollowed) {
            const followsuccess = await fetch(`https://api.rotur.dev/unfollow?auth=${activeacc.token}&username=${name}`)
            if (followsuccess.error) {
                openErrorPopup(followsuccess.error)
            } else {
                target.textContent = '+ Follow'
                target.dataset.following = 'false'
            }
        } else {
            const followsuccess = await fetch(`https://api.rotur.dev/follow?auth=${activeacc.token}&username=${name}`)
            if (followsuccess.error) {
                openErrorPopup(followsuccess.error)
            } else {
                target.dataset.following = 'true'
                target.textContent = '✕ Unfollow'
            }
        }

        return;
    }
    if (e.target.id == 'addfriend') {
        const target = e.target
        const friendstatus = target.dataset.friendstatus
        switch (friendstatus) {
            case ('friend'): {
                openUnfriendPopup(target.dataset.targetname)
                break;
            }
            case ('request'): {
                openRequestPopup(target.dataset.targetname)
                break;
            }
            case ('pending'): {
                openCancelRequestPopup(target.dataset.targetname)
                break;
            }
            case ('nofriend'): {
                openFriendPopup(target.dataset.targetname)
                break;
            }
        }
        return;
    }
    if (e.target.id == 'profileblockbutton') {
        const target = e.target
        const blocked = JSON.parse(target.dataset.blocked)

        if (blocked) {
            openUnblockPopup(target.dataset.targetname)
        } else {
            openBlockPopup(target.dataset.targetname, JSON.parse(target.dataset.friendstatus), JSON.parse(target.dataset.following), JSON.parse(target.dataset.requeststatus))
        }
        return;
    }
    if (e.target.id == 'profileeditbutton') {
        this.location.href = `../pages/account.html?user=${e.target.dataset.targetname}`
        return;
    }

    // Final actions (social buttons bar popups)
    if (e.target.className == 'finalsendreq') {
        const friendbutton = document.getElementById('addfriend')
        closePopup()
        const user = e.target.dataset.user
        const request = await fetch(`https://api.rotur.dev/friends/request/${user}?auth=${activeacc.token}`, {method: 'POST'}).then(res => res.json())
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            friendbutton.dataset.friendstatus = 'pending'
            friendbutton.title = 'Manage Outgoing Request'
            friendbutton.replaceChildren(...parseHTML(`<img src="../images/misc_icons/pendingrequest.png" width=24 height=24>`))
            openSuccessPopup('Friend request sent successfully!')
            outgoing_cache.push(user)
        }
        return;
    }
    if (e.target.className == 'finalblock') {
        const user = e.target.dataset.user
        const unfriend = document.getElementById('unfriendthenblock') ? document.getElementById('unfriendthenblock').checked : false
        const unfollow = document.getElementById('unfollowthenblock') ? document.getElementById('unfollowthenblock').checked : false
        const cancel = document.getElementById('cancelthenblock') ? document.getElementById('cancelthenblock').checked : false
        closePopup()
        if (unfriend) {
            const unfriendreq = await fetch(`https://api.rotur.dev/friends/remove/${user}?auth=${activeacc.token}`, {method: 'POST'})
            if (!unfriendreq.error) {
                document.getElementById('addfriend').dataset.friendstatus = 'nofriend'
                document.getElementById('addfriend').title = 'Add Friend'
                document.getElementById('addfriend').replaceChildren(...parseHTML(`<img src="../images/misc_icons/add_friend.png" width=24 height=24>`))
            }
        }
        if (cancel) {
            const cancelreq = await fetch(`https://api.rotur.dev/friends/cancel/${user}?auth=${activeacc.token}`, {method: 'POST'})
            if (!cancelreq.error) {
                document.getElementById('addfriend').dataset.friendstatus = 'nofriend'
                document.getElementById('addfriend').title = 'Add Friend'
                document.getElementById('addfriend').replaceChildren(...parseHTML(`<img src="../images/misc_icons/add_friend.png" width=24 height=24>`))
            }
        }
        if (unfollow) {
            const unfollowreq = await fetch(`https://api.rotur.dev/unfollow?auth=${activeacc.token}&username=${user}`)
            if (!unfollowreq.error) {
                document.getElementById('followuser').dataset.following = 'false'
                document.getElementById('followuser').textContent = '+ Follow'
            }
        }
        const request = await fetch(`https://api.rotur.dev/me/block/${user}?auth=${activeacc.token}`, {method: 'POST'})
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            document.getElementById('profileblockbutton').dataset.blocked = 'true'
            document.getElementById('profileblockbutton').title = 'Unblock User'
            document.getElementById('profileblockbutton').replaceChildren(...parseHTML(`<img src="../images/misc_icons/unblock.png" width=24 height=24>`))
        }
        return;
    }
    if (e.target.className == 'rejectreq') {
        const user = e.target.dataset.user
        const request = await fetch(`https://api.rotur.dev/friends/reject/${user}?auth=${activeacc.token}`, {method: 'POST'})
        closePopup()
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            document.getElementById('addfriend').dataset.friendstatus = 'nofriend'
            document.getElementById('addfriend').title = 'Add Friend'
            document.getElementById('addfriend').replaceChildren(...parseHTML(`<img src="../images/misc_icons/add_friend.png" width=24 height=24>`))
        }
        return;
    }
    if (e.target.className == 'acceptreq') {
        const user = e.target.dataset.user
        closePopup()
        const request = await fetch(`https://api.rotur.dev/friends/accept/${user}?auth=${activeacc.token}`, {method: 'POST'})
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            document.getElementById('addfriend').dataset.friendstatus = 'friend'
            document.getElementById('addfriend').title = 'Friends'   
            document.getElementById('addfriend').replaceChildren(...parseHTML(`<img src="../images/misc_icons/friend.png" width=24 height=24>`))         
        }
        return;
    }
    if (e.target.className == 'finalfriendcancel') {
        const user = e.target.dataset.user
        closePopup()
        const cancel = await fetch(`https://api.rotur.dev/friends/cancel/${user}?auth=${activeacc.token}`, {method: 'POST'})
        if (cancel.error) {
            openErrorPopup(cancel.error)
        } else {
            document.getElementById('addfriend').dataset.friendstatus = 'nofriend'
            document.getElementById('addfriend').title = 'Add Friend'
            document.getElementById('addfriend').replaceChildren(...parseHTML(`<img src="../images/misc_icons/add_friend.png" width=24 height=24>`))
            outgoing_cache = outgoing_cache.filter(item => item.toLowerCase() != user.toLowerCase())
            openSuccessPopup("Friend request successfully cancelled.")
        }
        return;
    }
    if (e.target.className == 'finalunfriend') {
        const user = e.target.dataset.user
        closePopup()
        const request = await fetch(`https://api.rotur.dev/friends/remove/${user}?auth=${activeacc.token}`, {method: 'POST'})
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            document.getElementById('addfriend').dataset.friendstatus = 'nofriend'
            document.getElementById('addfriend').title = 'Add Friend'
            document.getElementById('addfriend').replaceChildren(...parseHTML(`<img src="../images/misc_icons/add_friend.png" width=24 height=24>`))
        }
        return;
    }
    if (e.target.className == 'finalunblock') {
        const user = e.target.dataset.user
        closePopup()
        const request = await fetch(`https://api.rotur.dev/me/unblock/${user}?auth=${activeacc.token}`, {method: 'POST'})
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            document.getElementById('profileblockbutton').title = 'Block User'
            document.getElementById('profileblockbutton').dataset.blocked = 'false'
            document.getElementById('profileblockbutton').replaceChildren(...parseHTML(`<img src="../images/misc_icons/block.png" width=24 height=24>`))
        }
        return;
    }
    if (e.target.id == 'rasavenotebtn') {
        if (document.getElementById('rausernotefield').value.length > 300) {
            openErrorPopup('Your note is too long.')
        } else {
            notes[userdata_cache.username] = document.getElementById('rausernotefield').value.replaceAll(`'`, `\'`)
            if (notes[userdata_cache.username] == '') {
                delete notes[userdata_cache.username]
            }
            if (Object.keys(notes).length > 100) {
                delete notes[userdata_cache.username]
                openErrorPopup('Due to Google limitations on sync storage, you can only have notes on up to 100 users.')
            } else {
                setNotes(notes)
                openSuccessPopup('Successfully updated note for ' + userdata_cache.username)
            }
        }
    }
    if (e.target.id == 'raclearnotebtn') {
        openConfirmClearNotePopup()
    }
    if (e.target.className == 'finalnoteclear') {
        closePopup()
        delete notes[userdata_cache.username]
        document.getElementById('rausernotefield').value = ''
        document.getElementById('ranotecharlimit').textContent = `0/300`
        document.getElementById('ranotecharlimit').style = `color: white;`
        setNotes(notes)
    }
    // items.js re-used code
    if (e.target.className == 'buyitem') {
        const target = e.target
        if (you_cache['sys.currency'] < parseFloat(target.dataset.amt)) {
            openErrorPopup(`Insufficient Funds (${you_cache['sys.currency']} < ${target.dataset.amt})`)
        } else {
            openConfirmPurchasePopup(you_cache, userdata_cache, parseFloat(target.dataset.amt), target.dataset.itemname)
        }
    }
    if (e.target.className == 'finalitempurchase') {
        closePopup()
        const target = e.target
        const itempurchasestatus = await fetch(`https://api.rotur.dev/items/buy/${desanitize(target.dataset.itemname)}?auth=${activeacc.token}`).then(res => res.json())
        if (itempurchasestatus.error) {
            openErrorPopup(itempurchasestatus.error)
        } else {
            openSuccessPopup(`Successfully purchased ${decodeURIComponent(target.dataset.itemname)}!`)
            document.getElementById(`roturitem_${target.dataset.itemname.replaceAll(' ', '~')}`).remove()
            document.getElementById('useritemssummary').textContent = `Items (${document.getElementsByClassName('roturuseritemlist')[0].childElementCount})`
            if (document.getElementsByClassName('roturuseritemlist')[0].childElementCount == 0) {
                document.getElementsByClassName('roturuseritemlist')[0].remove()
                const h2 = document.createElement('h2')
                h2.textContent = "This user does not own any items yet."
                document.getElementById('useritems').appendChild(h2)
            }
        }
    }

    // Now begins re-used functions from claw.js

    if (e.target.className == 'deletebtn') {
        openDeletePopup(e.target.dataset.postid)
        return;
    }
    if (e.target.className == 'closebtn') {
        closePopup()
        if (e.target.dataset?.closeprivate) {
            document.getElementById('lookuperror').replaceChildren()
        }
        return;
    }
    if (e.target.className == 'finaldelete') {
        const postid = e.target.dataset.postid
        const deletesuccess = await fetch(`https://api.rotur.dev/delete?auth=${activeacc.token}&id=${postid}`)
        closePopup()
        document.getElementById(`post-${postid}`).remove()
        document.getElementById(`clawpostssummary`).textContent = `Claw Posts (${document.getElementById(`clawpostslist`).childElementCount})`
        if (document.getElementById(`clawpostslist`).childElementCount == 0) {
            document.getElementById(`clawpostslist`).remove()
            document.getElementById('userclawposts').appendChild(CreateEmptyPlaceholder(`This user has not made any claw posts yet.`))
        }
        return;
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
    if (e.target.className == 'likebutton') {
        const likebtn = e.target
        let likes = parseInt(likebtn.textContent.match(/\d+\.?\d*/g));
        const like = await fetch(`https://api.rotur.dev/rate?id=${likebtn.dataset.postid}&auth=${activeacc.token}&rating=${Number(!likebtn.textContent.includes('Unlike'))}`)
        likebtn.textContent = (e.target.textContent.includes('Unlike') ? `🩶 Like (${likes - 1})` : `❤️ Unlike (${likes + 1})`)
        document.getElementById(`post-${e.target.dataset.postid}`).querySelector('[class*="viewlikes"]').disabled = ((likes - 1 == 0) && !likebtn.textContent.includes('Unlike'))
        return;
    }
    if (e.target.className == 'viewlikes') {
        const likes = JSON.parse(e.target.dataset.likes ?? "[]")
        if (document.getElementById(`post-${e.target.dataset.postid}`).querySelector('[class="likebutton"]').textContent.includes('Unlike') && !likes.includes(activeacc.name)) {
            likes.push(activeacc.name)
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
});

document.addEventListener('change', async function(e) {
    if (e.target.name == 'searchtype') {
        document.getElementById('usersearchbarinput').placeholder = e.target.dataset.placeholdervalue
        searchtype = e.target.value
    }
})

document.addEventListener('input', async function (e) {
    if (e.target.className == 'replybox') {
        const len = e.target.value.length
        updateReplyCharLimit(e.target.dataset.postid, len)
        return;
    }
    if (e.target.id == 'rausernotefield') {
        document.getElementById('ranotecharlimit').textContent = `${e.target.value.length}/300`
        document.getElementById('ranotecharlimit').style = `color: ${e.target.value.length > 300 ? 'red' : 'white'};`
        return;
    }
})