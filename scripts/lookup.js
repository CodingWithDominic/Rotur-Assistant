let is_banned = false;
let searchtype = 'auto'
let reloadinprogress = false

let userdata_cache = ''
let you_cache = ''

import { sanitize, formatDate, parseHTML } from "../index.js"

function desanitize(string) {
    return string.replace('&sol;','/').replace('&lt;', '<').replace('&gt;', '>').replace('&lpar;', '(').replace('&rpar;', ')').replace("&equals;", "=").replace(`&quot;`, `"`).replace(`&#39;`, `'`).replace('&amp;', '&') // Used for handling items since Rotur decided to use the direct item names as the IDs instead.
}

const accounts = await new Promise(resolve =>
        chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
    ) ?? [];

let accountsarray = []
accounts.forEach(acc => {
    accountsarray.push(acc.name)
})

const activeacc = await new Promise(resolve =>
        chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
    ) ?? [];

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

const known_badges = ['Architext', "Asier System", "Bugger", "colon three", "dev", "discord", "friendly", "gingerbug", "Nex", "originOS", "orion", "pro", "rich", "Spark", "rotur", "Constellinux", "HuopaOS", "kyrOS", "flf", "Rotur Assistant"]

// Re-using code from claw.js for the claw posts section

let premium = false;

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    premium = await fetch(`https://api.rotur.dev/keys/check/${activeacc.name}?key=bd6249d2b87796a25c30b1f1722f784f`).then(res => res.json())
    premium = premium.owned
}

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
        <p id="deleteconfirmdialogue">Send ${user} a friend request? Do note that as of now, there is no way to cancel friend requests from the senders' end once they are sent.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalsendreq" data-user='${user}'>Send Request</button>
        </div>
    `))
}

function openBlockPopup(user, isFriends, isFollowing) {
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

function openSuccessPopup(msg) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Success</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">${msg}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">OK</button>
        </div>
    `))
}

function openErrorPopup(error) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Error</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">${error}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">OK</button>
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
            <h1>Unblock ${user}?</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Unblock ${user}?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalunblock" data-user='${user}'>Unblock</button>
        </div>
    `))
}

//End of popup code. Now begins re-used claw.js code

function updateReplyCharLimit(postid, num) {
    const replycharlimit = document.getElementById(`limit-${postid}`)
    replycharlimit.style = `color: ${num > (premium ? 600 : 300) ? 'red' : 'white'};`
    replycharlimit.textContent = `${num}/${premium ? "600" : "300"}`
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
            ${(post.user == activeacc.name) && !flagged.includes(activeacc.uuid) ? `<button class='deletebtn' title="Delete Post" data-postid='${post.id}'><img src='../images/misc_icons/delete.png' width='24' height='24'></button>` : ``}
        </div>
        <p class='postcontent'>${sanitize(repost ? post.original_post.content : post.content)}</p>
        ${(repost ? post.original_post.attachment : post.attachment) ? `<img class='clawattachment' src='${sanitize(repost ? post.original_post.attachment : post.attachment)}'>` : ''}
        <p class='postmetadata'>Posted from ${(repost ? post.original_post.os : post.os) ?? "Unknown System"} on ${formatDate(repost ? post.original_post.timestamp : post.timestamp)}</p>
        <div class='feedbackbar'>
            <button class='likebutton' data-postid='${post.id}' ${activeacc.uuid && !flagged.includes(activeacc.uuid) ? '' : 'disabled'}>${post.likes && post.likes.includes(activeacc.name) ? `❤️ Unlike (${post.likes ? post.likes.length : 0})` : `🩶 Like (${post.likes ? post.likes.length : 0})`}</button>
            <button class='viewlikes' data-postid='${post.id}' ${post.likes ? `data-likes=${JSON.stringify(post.likes)}` : 'disabled'}>View Likes</button>
            <button class='copypostid' data-postid='${post.id}'>Copy Post ID</button>
        </div>
        <details class='repliesbtn' data-postid='${post.id}'>
        <summary class='replydropdownlabel'>View Replies (${post.replies ? post.replies.length : 0})</summary>
            <div class='repliesplaceholder'>
                ${post.replies ? `<ul class='reply' id='replies-${post.id}'>${appendReplies(post)}</ul>` : ``}
            </div>
            <div class='replyboxplaceholder'>
                ${activeacc.uuid && !flagged.includes(activeacc.uuid) ? `
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
        replysuccess = await fetch(`https://api.rotur.dev/reply?id=${postid}&auth=${activeacc.token}&content=${message}`)
        console.log(replysuccess)
        if (replysuccess.error) {
            replystatus.replaceChildren(...parseHTML(`<p class="failure">${replysuccess.error}</p>`))
        } else {
            document.getElementById(`post-${postid}`).querySelector('[class="replybox"]').value = ``
            updateReplyCharLimit(postid, 0)
            if (!document.getElementById(`post-${postid}`).querySelector('[class="reply"]')) {
                document.getElementById(`post-${postid}`).querySelector('[class="repliesplaceholder"]').replaceChildren(...parseHTML(`<ul class='reply' id='replies-${postid}'></ul>`))
            }
            document.getElementById(`post-${postid}`).querySelector('[class="reply"]').appendChild(...parseHTML(createReplyElement({id: String(Date.now() + 32767), content: message, user: activeacc.name, timestamp: Date.now()})))
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
        <p>Your Balance: ${senderdata.currency} -> ${senderdata.currency - amt}</p>
        <p>${recipientdata.username}'s Balance: ${recipientdata.currency} -> ${recipientdata.currency + amt}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalitempurchase" data-itemname="${sanitize(itemname)}">Buy</button>
        </div>
    `))
}

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
        item_html += `<li class='roturitem' id='roturitem_${sanitize(item.name)}'>
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
                    ${activeacc.uuid && !flagged.includes(activeacc.uuid) ? `
                        <button class='buyitem' data-itemname='${sanitize(item.name)}' data-amt='${item.price}' data-owner='${item.owner}' ${(item.owner == activeacc.name || !item.selling) ? 'disabled' : ''}>Buy (${item.price} RC)</button>
                    ` : ``}
                    <details class='itemtransferhistory'>
                        <summary>Transfer History</summary>
                        <ul class='transferhistory'>${formatTransferHistory(item.transfer_history)}</ul>
                    </details>
                </li>`
    })
    if (myitems.length == 0) {
        item_html = `<li><h2>This user doesn't own any items yet.</h2></li>`
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
            <button id="cancel" class="closebtn">No</button>
            <button id="viewanyway">Yes</button>
        </div>
    `))
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

function renderFollowingFollowers(list) {
    let return_html = ``
    for (let i=0;i<list.length;i++) {
        let currentuser = list[i]
        return_html += `
        <li class='listuser'><a href='../pages/lookup.html?user=${currentuser || "Spectator"}'>
            <img src='https://avatars.rotur.dev/${currentuser || "Spectator"}' alt='${currentuser || "Spectator"}' width='40' height='40'>
            <p>${currentuser || "Unknown User"}</p>
        </a></li>`
    }
    return return_html;
}

async function renderProfile(userdata, you) {
    const clawposts = userdata.posts ?? []
    const name = userdata.username
    const balance = userdata.currency
    const id = userdata.id
    const followingData = await fetch(`https://api.rotur.dev/following?username=${name}`).then(res => res.json())
    const followersData = await fetch(`https://api.rotur.dev/followers?username=${name}`).then(res => res.json())
    const following = followingData.following
    const followers = followersData.followers
    const standingData = await fetch(`https://api.rotur.dev/get_standing?username=${name}`).then(res => res.json())
    const economydata = await fetch(`https://api.rotur.dev/stats/economy`).then(res => res.json())
    const useritems = await fetch(`https://api.rotur.dev/items/list/${name}`).then(res => res.json())
    useritems.reverse()
    const cents = parseFloat(economydata.currency_comparison.cents.split('¢')[0])
    const pence = parseFloat(economydata.currency_comparison.pence.split('p')[0])
    let isfollowinguser = false
    let isfollowedbyuser = false
    let isfriends = false
    let requestinprogress = false
    let isBlocked = false
    if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
        isfollowinguser = following.includes(activeacc.name)
        isfollowedbyuser = followers.includes(activeacc.name)
        isfriends = you['sys.friends'].includes(name)
        requestinprogress = you['sys.requests'].includes(name)
        isBlocked = you['sys.blocked'].includes(name)
    }

    let badge_html = `<ul id="badges">
    `
    for (let i=0; i<(userdata.badges ?? []).length; i++) {
        let badge_name = known_badges.includes(userdata.badges[i].name) ? userdata.badges[i].name : `placeholder`
        badge_html += `
        <li><img src="../images/badges/${badge_name}.png" alt="${badge_name}" title="${badge_name == "placeholder" ? `${userdata.badges[i].name}
        
The badge shown is a placeholder badge in case Rotur Assistant doesn't recognize that badge yet.
Original badge description: ${userdata.badges[i].description}` : `${userdata.badges[i].name}
        
${userdata.badges[i].description}`}" width="16" height="16"></li>`
    }
    badge_html += `
    </ul>`

    let joindate = formatDate(userdata.created)

    const bar = document.getElementsByClassName('beforeprofile')[0]
    if (!bar) {
        document.getElementById('lookuperror').insertAdjacentHTML('afterend', '<hr class="beforeprofile">')
    }

    let economy_html = `<h2>General Statistics</h2>
    <p>${userdata.username} has $${(balance * (cents / 100)).toFixed(2)} or £${(userdata.currency * (pence / 100)).toFixed(2)} worth of credits.</p>
    <p>${userdata.username} has ${(balance / economydata.average).toFixed(2)} times the average balance.</p>
    <p>${userdata.username} has ${((balance * 100) / economydata.total).toFixed(2)}% of all the credits in circulation.</p>
    `
    if (you) {
        const yourcurrency = you['sys.currency']
        economy_html += `
        <hr class='dotted_separator'>
        <h2>Compared to you</h2>`
        if (yourcurrency > balance) {
            let multiplier = yourcurrency / balance
            let diff = yourcurrency - balance
            if (multiplier == Infinity) {
                multiplier = '∞';
            }
            economy_html += `
            <p>You have ${(String(diff).length > 10) ? diff.toFixed(2) : diff} more credits than ${userdata.username}.
            <p>Your balance is ${(String(multiplier).includes('.')) ? multiplier.toFixed(2) : multiplier}× that of ${userdata.username}'s balance.`
        } else if (yourcurrency < balance) {
            let multiplier = balance / yourcurrency
            let diff = balance - yourcurrency
            if (multiplier == Infinity) {
                multiplier = '∞';
            }
            economy_html += `
            <p>${userdata.username} has ${(String(diff).length > 10) ? diff.toFixed(2) : diff} more credits than you.
            <p>${userdata.username}'s balance is ${(String(multiplier).includes('.')) ? multiplier.toFixed(2) : multiplier}× that of yours.`
        } else {
            economy_html += `
            <p>You and ${userdata.username} have the exact same number of credits (${balance}).
            `
        }
    }

    document.getElementById('lookupplaceholder').style = 'border: 2px solid white;'
    document.getElementById('lookupplaceholder').replaceChildren(...parseHTML(`
    <img class='userbanner' src="https://avatars.rotur.dev/.banners/${name}" alt="${name}'s Banner">
    <div class="useravatar">
        <img class='useravatarview' src="https://avatars.rotur.dev/${name}" alt="${name}'s Avatar">
        <img class='useravataroverlay' src="https://avatars.rotur.dev/.overlay/${name}" alt="${name}'s Avatar Decoration">
    </div>
    <div class="userinfo">
        <div class="socialactionbar">
            <div class="socialactionbarbuttons">
                ${activeacc.uuid && !flagged.includes(activeacc.uuid) && name != activeacc.name && !is_banned ? `
                    <button id='followuser' data-targetname ='${name}' data-following='${isfollowedbyuser}'>${isfollowedbyuser ? `✕ Unfollow` : `+ Follow`}</button>
                    <button id='addfriend' data-targetname ='${name}' data-friendstatus='${isfriends ? "friend" : (requestinprogress ? "request" : "nofriend")}' title="${isfriends ? "Friends" : (requestinprogress ? "Manage Incoming Request" : "Add Friend")}"><img src="../images/misc_icons/${isfriends ? "friend" : (requestinprogress ? "pendingrequest" : "add_friend")}.png" width=24 height=24></button>
                    <button id='profileblockbutton' data-friendstatus='${isfriends}' data-following='${isfollowedbyuser}' data-targetname='${name}' data-blocked='${isBlocked}' title="${isBlocked ? "Unblock User" : "Block User"}"><img src="../images/misc_icons/${isBlocked ? "unblock" : "block"}.png" width=24 height=24></button>`
                    : ``}
                ${activeacc.uuid && !flagged.includes(activeacc.uuid) && accountsarray.includes(name) ?
                    `<button id='profileeditbutton' title="Edit Profile" data-targetname ='${name}'><img src="../images/misc_icons/edit.png" width=24 height=24></button>`
                    : ``}
                <button id='profilereload' title="Refresh Profile">⟳</button>
            </div>
            ${isfollowinguser ? `<p class='socialstatus'>Follows you</p>` : ``}
        </div>

        <h1 id="usertitle">${name}</h1>
        <div id="pronounsandbadges">
            ${userdata.pronouns ? `<h3 id="pronouns" title="${name}'s Pronouns">${sanitize(userdata.pronouns)}</h3>` : ``}
            ${badge_html}
        </div>
        <p class='bio' title="${name}'s Bio">${sanitize(userdata.bio)}</p>
    </div>
    <div class="userinfo2" ${userdata['sys.banned'] ? `style='margin-bottom: -7px;'` : ``}>
        <p class="joindate">Member since: ${joindate}</p>
        <ul id="morebasicinfo">
            <li>
                <h3 class="infolabel">Balance</h3>
                <p class='supplementaryinfo'>${userdata['sys.banned'] ? `---` : balance}</p>
            </li>
            <li>
                <h3 class="infolabel">System</h3>
                <p class='supplementaryinfo'>${userdata.system || "Heaven"}</p>
            </li>
            <li>
                <h3 class="infolabel">Subscription</h3>
                <p class='supplementaryinfo'>${userdata.subscription || "Expired"}</p>
            </li>
        </ul>
        <ul id="evenmorebasicinfo">
            <li>
                <h3 class="infolabel">Account Index</h3>
                <p class='supplementaryinfo'>${userdata['sys.banned'] ? `&infin;` : userdata.index}</p>
            </li>
            <li>
                <h3 class="infolabel">Private</h3>
                <p class='supplementaryinfo'>${userdata.private ?? 'false'}</p>
            </li>
            <li>
                <h3 class="infolabel">Standing</h3>
                <p class='supplementaryinfo'>${standingData.error ? "Banned" : standingData.standing.replace(/^./, char => char.toUpperCase())}</p>
            </li>
        </ul>
        ${userdata.id ? `<h3 class="infolabel">Rotur UUID</h3>
            <p class='supplementaryinfo'>${id}</p>
            <hr class="dotted_separator">
            ` : ``}
    </div>
    ${userdata['sys.banned'] ? `` : `
        <div class="userinfo3">
            <details id="followingpanel">
                <summary>Following (${following.length})</summary>
                <ul class='followuserlist' id="followinglist">${renderFollowingFollowers(following) || `<li><h2>This user has not followed anyone yet.</h2></li>`}</ul>
            </details>
            <hr class="dotted_separator">
            <details id="followerspanel">
                <summary>Followers (${followers.length})</summary>
                <ul class='followuserlist' id="followerslist">${renderFollowingFollowers(followers) || `<li><h2>This user has no followers yet.</h2></li>`}</ul>
            </details>
            <hr class="dotted_separator">
            <details id="userclawposts">
                <summary id='clawpostssummary'>Claw Posts (${clawposts.length})</summary>
                ${userdata.posts ? `<ul id="clawpostslist">${renderClawFeed(userdata.posts)}</ul>` : `<h2>This user has not made any claw posts yet.</h2>`}
            </details>
            <hr class="dotted_separator">
            <details id="useritems">
                <summary id='useritemssummary'>Items (${useritems.length})</summary>
                ${useritems.length ? `<ul class="roturuseritemlist">${getItems(useritems)}</ul>` : `<h2>This user does not own any items yet.</h2>`}
            </details>
            <hr class="dotted_separator">
            <details id="economicstats">
                <summary>Economic Info</summary>
                <div id="economicplaceholder">${economy_html}</div>
            </details>
        </div>
    `}
    `))
}

async function performSearch(user) {
    let searchtype2 = searchtype;
    if (user == '') {
        document.getElementById('lookuperror').replaceChildren(...parseHTML(`<p class='failure'>Please enter a ${document.getElementById('usersearchbarinput').placeholder}</p>`))
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
    
    const userdata = await fetch(`https://api.rotur.dev/profile?${searchtype2}=${user}${activeacc.uuid && !flagged.includes(activeacc.uuid) ? `&auth=${activeacc.token}` : ``}`).then(res => res.json()) // Added auth to decrease rate limits
    if (userdata.error) {
        document.getElementById('lookuperror').replaceChildren(...parseHTML(`<p class='failure'>${searchtype == 'auto' ? 'No account was found that matches the inputted username, UUID, or Discord ID' : searchtype2 == 'name' ? 'No account with that username was found' : (searchtype2 == 'id' ? 'No account with that UUID was found' : 'No account associated with that Discord ID was found.')}</p>`))
        return;
    }
    let you = null
    if (flagged.includes(activeacc.uuid)) {
        openErrorPopup('Due to an authentication issue that has been detected with your account, some interaction features have been disabled.')
        premium = false
    } else {
        you = activeacc.uuid ? await fetch(`https://api.rotur.dev/get_user?auth=${activeacc.token}`).then(res => res.json()) : null
        if ((you && you.error && (you.error == 'Invalid authentication credentials') && !you.username) || (you['sys.banned'])) {
            flagged.push(activeacc.uuid)
            chrome.storage.local.set({flagged: flagged})
            openErrorPopup('Due to an authentication issue that has been detected with your account, some interaction features have been disabled.')
            you = null;
        }
    }
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    const bypassprivate = Boolean(urlParams.get('bypass')) || reloadinprogress; // Skip the private profile popup if one of these conditions is met
    userdata_cache = userdata

    if (userdata['sys.banned']) {
        is_banned = true
        you_cache = you
        openPopup()
        return;
    }
    is_banned = false;
    if (userdata.private && !bypassprivate) {
        you_cache = you
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

    if (lookupuser) {
        searchtype = 'name'
        document.getElementById('usersearchbarinput').value = lookupuser
        performSearch(lookupuser)
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
            openBlockPopup(target.dataset.targetname, JSON.parse(target.dataset.friendstatus), JSON.parse(target.dataset.following))
        }
        return;
    }
    if (e.target.id == 'profileeditbutton') {
        this.location.href = `../pages/account.html?user=${e.target.dataset.targetname}`
        return;
    }

    // Final actions (social buttons bar popups)
    if (e.target.className == 'finalsendreq') {
        closePopup()
        const user = e.target.dataset.user
        const request = await fetch(`https://api.rotur.dev/friends/request/${user}?auth=${activeacc.token}`, {method: 'POST'})
        if (request.error) {
            openErrorPopup(request.error)
        } else {
            openSuccessPopup('Friend request sent successfully!')
        }
        return;
    }
    if (e.target.className == 'finalblock') {
        const user = e.target.dataset.user
        const unfriend = document.getElementById('unfriendthenblock') ? document.getElementById('unfriendthenblock').checked : false
        const unfollow = document.getElementById('unfollowthenblock') ? document.getElementById('unfollowthenblock').checked : false
        closePopup()
        if (unfriend) {
            const unfriendreq = await fetch(`https://api.rotur.dev/friends/remove/${user}?auth=${activeacc.token}`, {method: 'POST'})
            if (!unfriendreq.error) {
                document.getElementById('addfriend').replaceChildren(...parseHTML(`<img src="../images/misc_icons/friend.png" width=24 height=24>`))
                document.getElementById('addfriend').dataset.friendstatus = 'nofriend'
                document.getElementById('addfriend').title = 'Add Friend'
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
            document.getElementById('addfriend').replaceChildren(...parseHTML(`<img src="../images/misc_icons/add_friend.png" width=24 height=24>`))
            document.getElementById('addfriend').dataset.friendstatus = 'nofriend'
            document.getElementById('addfriend').title = 'Add Friend'
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
            document.getElementById('addfriend').replaceChildren(...parseHTML(`<img src="../images/misc_icons/friend.png" width=24 height=24>`))
            document.getElementById('addfriend').dataset.friendstatus = 'friend'
            document.getElementById('addfriend').title = 'Friends'            
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
            document.getElementById('addfriend').replaceChildren(...parseHTML(`<img src="../images/misc_icons/add_friend.png" width=24 height=24>`))
            document.getElementById('addfriend').dataset.friendstatus = 'nofriend'
            document.getElementById('addfriend').title = 'Add Friend'
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
            document.getElementById('profileblockbutton').replaceChildren(...parseHTML(`<img src="../images/misc_icons/block.png" width=24 height=24>`))
            document.getElementById('profileblockbutton').title = 'Block User'
            document.getElementById('profileblockbutton').dataset.blocked = 'false'
        }
        return;
    }

    // items.js re-used code
    if (e.target.className == 'buyitem') {
        const target = e.target
        if (yourdata.currency < parseFloat(target.dataset.amt)) {
            openErrorPopup(`Insufficient Funds (${yourdata.currency} < ${target.dataset.amt})`)
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
            document.getElementById(`roturitem_${target.dataset.itemname}`).remove()
            document.getElementById('useritemssummary').textContent = `Items (${document.getElementById('roturuseritemlist').childElementCount})`
            if (document.getElementById('roturuseritemlist').childElementCount == 0) {
                document.getElementById('roturuseritemlist').remove()
                const h2 = document.childElementCount('h2')
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
            document.getElementById('userclawposts').appendChild(...parseHTML(`<h2>This user has not made any claw posts yet.</h2>`))
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
            <img src='https://avatars.rotur.dev/${likes[i] || "Spectator"}' alt='${likes[i] || "Spectator"}' width='24' height='24'>
            <p>${likes[i] || "Unknown User"}</p>
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
    }
})