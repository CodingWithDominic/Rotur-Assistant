import { sanitize, formatDate, openErrorPopup, openSuccessPopup, openWarningPopup, CreateEmptyPlaceholder, MiniError, UploadImage, FixDecimal } from "../index.js"

let currentfeeddata = [];
let lastquery = 'feed'
let system_cache = []

const controller = new AbortController()
const requestlimit = setTimeout(() => controller.abort(), 10000);

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

const config = {
    removeElements: ['iframe', 'script', 'style', 'object', 'embed', 'applet', 'meta', 'link', 'base', 'form'],
    removeAttributes: ['onload', 'onclick', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onkeydown', 'onchange', 'onsubmit', 'srcdoc', 'formaction']
}
const sanitizer = new Sanitizer(config)

const real_time = await new Promise(resolve =>
    chrome.storage.local.get('claw_realtime', data => resolve(data.claw_realtime || false))
) ?? false;

if (!navigator.onLine) {
    document.getElementsByClassName('container')[0].setHTML(`
        <h1>Claw</h1>
        <hr class="full-size">
        <h3>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h3>
    `, {sanitizer: sanitizer})
    throw new Error("No Internet Connection")
}

if (real_time) {
    document.getElementById('realtime').checked = true
    document.getElementById('reloadfeed').disabled = true
}

async function getSystems(elementid) {
    if (system_cache.length == 0) {
        const systems = await fetch(`https://api.rotur.dev/v2/systems`).then(res => res.json())
        system_cache = Object.keys(systems)
    }
    let systemoptions = ``
    for (let i=0; i<system_cache.length; i++) {
        systemoptions += `<option value="${sanitize(system_cache[i])}" ${system_cache[i] == "Rotur Assistant" ? 'selected' : ''}>${sanitize(system_cache[i])}</option>`
    }
    systemoptions += `<option value="Random">Random System</option>`
    systemoptions += `<option value="Unknown">"Unknown"</option>`
    if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
        document.getElementById(elementid).setHTML(systemoptions, {sanitizer: sanitizer})
    }
}

function openPopup(post_id) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Delete post</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Really delete this post?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finaldelete" data-postid='${post_id}'>Yes</button>
        </div>
    `, {sanitizer: sanitizer})
}

function openRepostPopup(post_id) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Repost post</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Repost this post?</p>
        <textarea id="clawrepostquote" placeholder="Optional Quote..."></textarea>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalrepost" data-postid='${post_id}'>Repost</button>
        </div>
    `, {sanitizer: sanitizer})
}

function openLikesPopup(likes) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Likes</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        ${likes}
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Close</button>
        </div>
    `, {sanitizer: sanitizer})
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

const authform = new FormData()
authform.append("Authorization", `Bearer ${activeacc.token}`)

const charlimitmap =
{
    Free: 300,
    Lite: 400,
    Plus: 600,
    Pro: 800,
    Max: 1000
}
let charlimit = 300
if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    charlimit = await fetch(`https://api.rotur.dev/profile?id=${activeacc.uuid}`).then(res => res.json()).then(res => (charlimit[res.subscription] ?? 300)).catch(err => {
        document.getElementsByClassName('container')[0].setHTML(`
            <h1>Claw</h1>
            <hr class="full-size">
            <h3>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h3>
        `, {sanitizer: sanitizer})
        return 300;
    })
    document.getElementById('postcontent').placeholder = `Share something to Claw...\n(Posting as ${activeacc.name})`
}
if (!activeacc.uuid) {
    const h3 = document.createElement('h3')
    h3.textContent = 'Sign in to create posts!'
    document.getElementById('postwindow').replaceChildren(h3)
}
if (flagged.includes(activeacc.uuid)) {
    const h3 = document.createElement('h3')
    h3.textContent = 'Due to an authentication issue that has been detected with your current account, interaction features has been disabled.'
    document.getElementById('postwindow').replaceChildren(h3)
}

getSystems('system')

const clawerrorattachment = "https://i.postimg.cc/BZMMMNWw/RA-Error-Attachment.png"

function createReplyElement(reply) {
    const clawreply = document.getElementById('clawreplytemplate').content.cloneNode(true)
    let replyuser = reply.user
    if ((replyuser.length > 28) && replyuser.includes('-')) {
        replyuser = null
    }
    clawreply.querySelector('a').href = `../pages/lookup.html?user=${replyuser || "Spectator"}`
    clawreply.querySelector('.copypostid').dataset.postid = reply.id
    clawreply.querySelector('.clawpfp').src = `https://avatars.rotur.dev/${replyuser || "Spectator"}`
    clawreply.querySelector('.clawpfp').alt = replyuser || "Spectator"
    clawreply.querySelector('h2').textContent = replyuser || "Unknown User"
    clawreply.querySelector('.postcontent').innerText = reply.content
    if (reply.attachment) {
        const attachment = clawreply.querySelector('.clawattachment')
        attachment.src = reply.attachment
        const imgload = (e) => {
            attachment.removeEventListener('load', imgload)
            attachment.removeEventListener('error', imgerror)
        }
        const imgerror = (e) => {
            e.target.src = 'https://i.postimg.cc/BZMMMNWw/RA-Error-Attachment.png'
            attachment.removeEventListener('load', imgload)
            attachment.removeEventListener('error', imgerror)
        }
        attachment.addEventListener('load', imgload)
        attachment.addEventListener('error', imgerror)
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
    const repost = (post.is_repost && post.original_post)
    const clawpost = document.getElementById('clawposttemplate').content.cloneNode(true)
    let postauthor = (repost ? post.original_post.user : post.user)
    if (postauthor.includes('-') && (postauthor.length > 26)) {
        postauthor = null
    }
    clawpost.querySelector('li').id = `post-${post.id}`
    clawpost.querySelector('.clawpfp').src = `https://avatars.rotur.dev/${postauthor || "Spectator"}`
    clawpost.querySelector('.clawpfp').alt = post.user || "Spectator"
    clawpost.querySelector('a').href = `../pages/lookup.html?user=${postauthor || "Spectator"}`
    clawpost.querySelector('.clawpfp').href = `../pages/lookup.html?user=${postauthor || "Spectator"}`
    clawpost.querySelectorAll('[data-postid]').forEach(elementnode => {
        elementnode.dataset.postid = post.id
    })
    clawpost.querySelectorAll('[data-user]').forEach(elementnode => {
        elementnode.dataset.user = post.user
    }) // Get around having to do it manually since it appears so often

    clawpost.querySelector('.clawpostauthortitle').textContent = postauthor ? (postauthor + ' ') : "Unknown User "
    if (repost) {
        const mark = document.createElement('mark')
        mark.textContent = post.original_post.profile_only ? `Profile + Repost` : `Repost`
        mark.className = `repostbadge`
        clawpost.querySelector('.clawpostauthortitle').appendChild(mark)
        clawpost.querySelector('.repostbtn').disabled = true
        clawpost.querySelector('.repostbtn').title = "Repost (Cannot repost profile-only posts or other reposts)"
        clawpost.querySelector('.repostlabel').setHTML(`<img src='../images/misc_icons/repost.png' width='12' height='12'> Reposted by ${post.user}${post.content ? ` with quote: ${sanitize(post.content)}` : ``}`, {sanitizer: sanitizer})
    } else if (post.profile_only) {
        const mark = document.createElement('mark')
        mark.textContent = `Profile`
        mark.className = `repostbadge`
        clawpost.querySelector('.clawpostauthortitle').appendChild(mark)  
        clawpost.querySelector('.repostbtn').disabled = true
        clawpost.querySelector('.repostbtn').title = "Repost (Cannot repost profile-only posts or other reposts)"
    }
    if (!repost) {
        clawpost.querySelector('.repostlabel').remove()
    }
    if (!activeacc.uuid || flagged.includes(activeacc.uuid)) {
        clawpost.querySelector('.repostbtn').remove()
        clawpost.querySelector('.deletebtn').remove()
    } else if (post.user == activeacc.name) {
        clawpost.querySelector('.repostbtn').style = 'right: 36px;'
    } else {
        clawpost.querySelector('.deletebtn').remove()
    }
    if (post.attachment || (repost && post.original_post.attachment)) {
        const attachment = clawpost.querySelector('.clawattachment')
        attachment.src = repost ? post.original_post.attachment : post.attachment
        const imgload = (e) => {
            attachment.removeEventListener('load', imgload)
            attachment.removeEventListener('error', imgerror)
        }
        const imgerror = (e) => {
            e.target.src = 'https://i.postimg.cc/BZMMMNWw/RA-Error-Attachment.png'
            attachment.removeEventListener('load', imgload)
            attachment.removeEventListener('error', imgerror)
        }
        attachment.addEventListener('load', imgload)
        attachment.addEventListener('error', imgerror)
    } else {
        clawpost.querySelector('.clawattachment').remove()
    }
    clawpost.querySelector('.postcontent').innerText = repost ? post.original_post.content : post.content
    clawpost.querySelector('.postmetadata').textContent = `Posted from ${(repost ? post.original_post.os : post.os) ?? "Unknown System"} • ${formatDate(repost ? post.original_post.timestamp : post.timestamp)}`

    clawpost.querySelector('.likebutton').textContent = `${post.likes && post.likes.includes(activeacc.name) ? `❤️ Unlike (${post.likes ? post.likes.length : 0})` : `🩶 Like (${post.likes ? post.likes.length : 0})`}`
    clawpost.querySelector('.likebutton').disabled = (!activeacc.uuid || flagged.includes(activeacc.uuid))
    if (post.likes) {
        clawpost.querySelector('.viewlikes').dataset.likes = JSON.stringify(post.likes)
    } else {
        clawpost.querySelector('.viewlikes').disabled = true
    }
    clawpost.querySelector('.replydropdownlabel').textContent = `View Replies - ${post.replies ? post.replies.length : 0}`
    if (activeacc.uuid) {
        if (flagged.includes(activeacc.uuid)) {
            clawpost.querySelector('.replyboxplaceholder').querySelectorAll(':not(h2)').forEach(elemNode => {
                elemNode.remove()
            })
            clawpost.querySelector('.replyboxplaceholder').querySelector('h2').textContent = 'Due to an authentication issue that has been detected with your current account, interaction features has been disabled.'
            clawpost.querySelector('.replyboxplaceholder').querySelector('h2').style = "font-size: 16px;"
        } else {
            clawpost.querySelector('.replyboxplaceholder').querySelector('h2').remove()
            clawpost.querySelector('.postcharlimit').id = `limit-${post.id}`
            clawpost.querySelector('.postcharlimit').textContent = `0/${charlimit}`
            clawpost.querySelector('.replybox').placeholder = `Add a reply for ${post.user}\n(Replying as ${activeacc.name})`
        }
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
    if (post.poll) {
        const poll = clawpost.querySelector(`.clawpolloptionslist`)
        let currentoption = 0
        post.poll.options.forEach(option => {
            const polloption = document.getElementById('clawpolloptiontemplate').content.cloneNode(true)
            const percentage = FixDecimal((option.count / post.poll.total) * 100)
            polloption.querySelector('input').name = `poll-${post.id}`
            polloption.querySelector('input').value = currentoption
            polloption.querySelector('.clawpollprogressbar').style = `width: ${percentage}%; height: 28px;`
            polloption.querySelector('span').textContent = `${option.text} (${percentage}%)`
            poll.appendChild(polloption)
            currentoption += 1
        })
        let newmetadata = clawpost.querySelector('.postmetadata').textContent
        newmetadata = (newmetadata + " • Total votes: " + post.poll.total)
        clawpost.querySelector('.postmetadata').textContent = newmetadata
        clawpost.querySelector('.pollsubmit').dataset.postid = post.id
    } else {
        clawpost.querySelector(`.clawpoll`).remove()
    }
    return clawpost;
}

async function renderClawFeed() {
    if (!navigator.onLine) {
        document.getElementsByClassName('container')[0].setHTML(`
            <h1>Claw</h1>
            <hr class="full-size">
            <h3>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h3>
        `, {sanitizer: sanitizer})
        return;
    }
    const feed = await fetch(`https://claw.rotur.dev/${lastquery}`, {signal: controller.signal, headers: (lastquery == 'following_feed' ? authform : (new FormData()))}).then(res => res.json()).catch(err => {
        document.getElementsByClassName('container')[0].setHTML(`
            <h1>Claw</h1>
            <hr class="full-size">
            <h3>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h3>
        `, {sanitizer: sanitizer})
        return;
    })
    if (feed.error) {
        openErrorPopup(feed.error)
        return;
    }
    clearTimeout(requestlimit)
    const feedbody = document.getElementById('feed').querySelector('[id="clawfeed"]')

    if (feed.length == 0) {
        const errorjson = {"top_posts":"There have been no popular posts recently. Try liking a few of them to have them show up here!",
                           "feed":"Nobody has made a post yet... maybe you can be the first!"
                            }
        feedbody.style = 'border: none;'
        feedbody.setHTML(`<li id='noclawposts'><h2>${errorjson[lastquery] ? sanitize(errorjson[lastquery]) : lastquery.includes('following_feed') ? "Either you aren't following anybody or none of the people you follow has made a claw post yet." : "No posts match this search."}</h2></li>`, {sanitizer: sanitizer})
        currentfeeddata = []
        return;
    } else {
        feedbody.style = 'border: 2px solid white;'
        document.getElementById('noclawposts')?.remove()
    }

    if (currentfeeddata.length == 0) {
        currentfeeddata = feed;
        feedbody.replaceChildren();
        feed.forEach(post => {
            try {
                feedbody.appendChild(createPostElement(post));
            } catch {
                openErrorPopup('An error occurred while trying to load some Claw posts. The posts causing the error were skipped.')
            }
        });
        return;
    }
    const newPosts = feed.filter(post1 =>
        !currentfeeddata.some(post2 => post2.id === post1.id)
    );

    const deletedPosts = currentfeeddata.filter(post1 =>
        !feed.some(post2 => post2.id === post1.id)
    );
    currentfeeddata = feed;
    deletedPosts.forEach(post => {
        document.getElementById(`post-${post.id}`)?.remove();
    });
    // Add new posts
    newPosts.reverse() // Fixes a bug with new posts showing up in reverse order if you refresh and there's more than one new post
    newPosts.forEach(post => {
        try {
            if ((feed[1] ?? feed[0]).timestamp > newPosts[newPosts.length - 1].timestamp) {
                feedbody.appendChild(createPostElement(post));
            } else {
                feedbody.prepend(createPostElement(post));
            }
        } catch {
            openErrorPopup('An error occurred while trying to load some Claw posts. The posts causing the error were skipped.')
        }
    });
    newPosts.reverse()

    feed.forEach(post => {
        const likebtn = document.getElementById(`post-${post.id}`).querySelector('[class="likebutton"]')
        likebtn.textContent = (post.likes && post.likes.includes(activeacc.name)) ? `❤️ Unlike (${post.likes ? post.likes.length : 0})` : `🩶 Like (${post.likes ? post.likes.length : 0})`
        if (post.likes) {
            document.querySelector(`#post-${post.id}`).querySelector('.viewlikes').disabled = (post.likes.length == 0)
            document.querySelector(`#post-${post.id}`).querySelector('.viewlikes').dataset.likes = JSON.stringify(post.likes)
        } else {
            document.querySelector(`#post-${post.id}`).querySelector('.viewlikes').disabled = true
        }
        if (post.replies) {
            if (!document.getElementById(`post-${post.id}`).querySelector('[class="reply"]')) {
                const ul = document.createElement('ul')
                ul.className = "reply"
                ul.id = `replies-${post.id}`
                document.getElementById(`post-${post.id}`).querySelector('[class="repliesplaceholder"]').appendChild(ul)
            }
            const replies = document.getElementById(`post-${post.id}`).querySelector('[class="reply"]')
            replies.replaceChildren(...appendReplies(post))
            document.getElementById(`post-${post.id}`).querySelector('[class="replydropdownlabel"]').textContent = `View Replies - ${post.replies ? post.replies.length : 0}`
        }
    })
}

renderClawFeed()

function updateCharLimit(num) {
    const postlimit = document.getElementById('limit-post')
    postlimit.style = `color: ${num > charlimit ? 'red' : 'white'};`
    postlimit.textContent = `${num}/${charlimit}`
    document.getElementById('sendpost').disabled = (num > charlimit)
}
function updateReplyCharLimit(postid, num) {
    const replycharlimit = document.getElementById(`limit-${postid}`)
    replycharlimit.style = `color: ${num > charlimit ? 'red' : 'white'};`
    replycharlimit.textContent = `${num}/${charlimit}`
    document.getElementById(`post-${postid}`).querySelector('[class="sendreply"]').disabled = (num > charlimit)
}

async function post(message, system, systemextra) {
    if ((message == '') && !document.getElementById('clawimage').files[0]) {
        document.getElementById('posterrorplaceholder').replaceChildren(MiniError('failure', "You can't post a blank post"))
        setTimeout(function() {
            document.getElementById('posterrorplaceholder').replaceChildren()
        }, 10000)
        return;
    } else {
        let potentialattachment = ''
        const postbutton = document.getElementById('sendpost')
        document.getElementById('clearattachment').disabled = true
        postbutton.disabled = true
        postbutton.textContent = 'Sending...'

        const attachment = document.getElementById('clawimage').files[0]

        if (attachment) {
            potentialattachment = await UploadImage(attachment)
            if (!potentialattachment) {
                document.getElementById('posterrorplaceholder').replaceChildren(MiniError('failure', "Attachment failed to upload"))
                postbutton.disabled = false
                postbutton.textContent = 'Send →'
                document.getElementById('clearattachment').disabled = false
                setTimeout(function() {
                    document.getElementById('posterrorplaceholder').replaceChildren()
                }, 10000)
                return;
            }
        }
        let postsuccess = ''
        document.getElementById('posterrorplaceholder').replaceChildren()
        postsuccess = await fetch(`https://api.rotur.dev/post?content=${encodeURIComponent(message)}${potentialattachment ? `&attachment=${encodeURIComponent(potentialattachment)}` : ``}${system != `Unknown` ? `&os=${system == "Random" ? (system_cache[Math.floor(Math.random() * system_cache.length)] ?? "Rotur Assistant") : system}${systemextra ? `: ${systemextra}` : ''}` : ``}${document.getElementById('profileonly').checked ? `&profile_only=1` : ``}`, {headers: authform}).then(res => res.json())
        if (postsuccess.error) {
            document.getElementById('posterrorplaceholder').replaceChildren(MiniError('failure', postsuccess.error))
        } else {
            document.getElementById('postcontent').value = ''
            document.getElementById('systemmiscinfo').value = ''
            document.getElementById('clawimage').value = ''
            document.getElementById('clearattachment').disabled = false
            document.getElementById('clearattachment').style.display = 'none'
            updateCharLimit(0)
            if (document.getElementById('profileonly').checked) {
                document.getElementById('profileonly').checked = false
                document.getElementById('posterrorplaceholder').replaceChildren(MiniError('success', "Successfully posted to your profile!"))
            } else {
                renderClawFeed()
            }
        }
        document.getElementById('clearattachment').disabled = false
        postbutton.disabled = false
        postbutton.textContent = 'Send →'
        setTimeout(function() {
            document.getElementById('posterrorplaceholder').replaceChildren()
        }, 10000)
    }
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
        replysuccess = await fetch(`https://api.rotur.dev/reply?id=${postid}&content=${encodeURIComponent(message)}`, {headers: authform}).then(res => res.json())
        if (replysuccess.error) {
            replystatus.replaceChildren(MiniError('failure', replysuccess.error))
        } else {
            document.getElementById(`post-${postid}`).querySelector('[class="replybox"]').value = ``
            updateReplyCharLimit(postid, 0)
            renderClawFeed()
        }
    }
    replybtn.disabled = false
    replybtn.textContent = 'Send →'
    setTimeout(function() {
    if (document.getElementById(`post-${postid}`)) {
        document.getElementById(`post-${postid}`).querySelector('[class="replyerrorplaceholder"]').replaceChildren()
    }
    }, 10000)
    return;
}

function updatepostcontrols() {
    document.getElementById('postcontent').disabled = (lastquery != 'feed')
    document.getElementById('clawimage').disabled = (lastquery != 'feed')
    document.getElementById('system').disabled = (lastquery != 'feed')
    document.getElementById('systemmiscinfo').disabled = (lastquery != 'feed')
    document.getElementById('profileonly').disabled = (lastquery != 'feed')
    document.getElementById('sendpost').disabled = ((lastquery != 'feed') || (document.getElementById('sendpost').value.length > charlimit))
}

var claw_ws = null
let errorflag = false

function connectWebSocket() {
    // Prevent duplicate connections if one is already open
    if (claw_ws && (claw_ws.readyState === WebSocket.OPEN || claw_ws.readyState === WebSocket.CONNECTING)) {
        return;
    }
    claw_ws = new WebSocket("wss://socialws.rotur.dev");
    claw_ws.onmessage = (event) => {
        let data = JSON.parse(event.data);
        if (data.cmd == 'ping') {
            claw_ws.send(JSON.stringify({cmd: 'pong'}));
        }
        if (!(data.cmd == 'ping' || data.cmd == 'handshake')) {
            renderClawFeed();
        }
    };

    claw_ws.onerror = (event) => {
        openErrorPopup('An error occurred while connecting to the Claw websocket');
        errorflag = true;
        document.getElementById('realtime').checked = false;
        document.getElementById('reloadfeed').disabled = false;
        claw_ws?.close();
        claw_ws = null;
        chrome.storage.local.set({claw_realtime: false});
    };

    claw_ws.onclose = (event) => {
        if (document.getElementById('realtime').checked && !errorflag) {
            setTimeout(() => {
                connectWebSocket(); 
            }, 1000); // Get around "pong" not keeping the websocket connection alive
        }
        errorflag = false;
    };
}

document.getElementById('realtime').addEventListener('change', async function(e) {
    if (document.getElementById('realtime').checked) {
        chrome.storage.local.set({claw_realtime: true});
        document.getElementById('reloadfeed').disabled = true;
        connectWebSocket();
    } else {
        document.getElementById('reloadfeed').disabled = false;
        chrome.storage.local.set({claw_realtime: false});
        claw_ws?.close();
        claw_ws = null;
    }
});

if (real_time) {
    const loadevent = new Event('change')
    document.getElementById('realtime').dispatchEvent(loadevent)
}

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    document.getElementById('post').addEventListener('submit', (event) => {
        event.preventDefault();
        const content = document.getElementById('postcontent').value
        const system = document.getElementById('system').value
        const systemextra = document.getElementById('systemmiscinfo').value
        post(content, system, systemextra)
    })
}

document.getElementById('postsearchbar').addEventListener('submit', (event) => {
    event.preventDefault();
    if (document.getElementById('postsearchbarinput').value) {
        lastquery = 'search_posts?q=' + document.getElementById('postsearchbarinput').value
        updatepostcontrols()
        renderClawFeed()
    } else {
        openErrorPopup('A search query is required')
    }
})

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

document.addEventListener('click', async function(e) {
    switch (e.target.id) {
        case ('clawimage'): {
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
        case ('reloadfeed'): {
            const target = e.target
            target.disabled = true
            target.textContent = "..."
            await renderClawFeed()
            target.disabled = false
            target.textContent = '⟳'
            break;
        }
        case ('clearsearch'): {
            if (lastquery.includes('search_posts')) {
                currentfeeddata = []
                lastquery = document.getElementById('feedfilter').value ?? 'feed'
                updatepostcontrols()
                renderClawFeed()
            }
            document.getElementById('postsearchbarinput').value = ''
            break;
        }
        case ('clearattachment'): {
            document.getElementById('clearattachment').style.display = 'none'
            document.getElementById('clawimage').value = ''
            break;
        }
    }
    switch (e.target.className) {
        case ('deletebtn'): {
            openPopup(e.target.dataset.postid)
            break;
        }
        case ('repostbtn'): {
            openRepostPopup(e.target.dataset.postid)
            break;
        }
        case ('closebtn'): {
            closePopup()
            break;
        }
        case ('finaldelete'): {
            const postid = e.target.dataset.postid
            const deletesuccess = await fetch(`https://api.rotur.dev/delete?id=${postid}`, {headers: authform}).then(res => res.json())
            closePopup()
            if (deletesuccess.error) {
                openErrorPopup(deletesuccess.error)
            } else {
                renderClawFeed()
            }
            break;
        }
        case ('finalrepost'): {
            const postid = e.target.dataset.postid
            const quote = document.getElementById('clawrepostquote').value
            const repostsuccess = await fetch(`https://api.rotur.dev/repost?id=${postid}${quote ? `&content=${encodeURIComponent(quote)}` : ``}`, {headers: authform}).then(res => res.json())
            closePopup()
            if (repostsuccess.error) {
                openErrorPopup(repostsuccess.error)
            } else {
                if (quote) {
                    document.getElementById('clawrepostquote').value = ''
                    renderClawFeed()
                } else {
                    openSuccessPopup("This post has been reposted to your profile successfully!")
                }
            }
            break;
        }
        case ('likebutton'): {
            const likebtn = e.target
            let likes = parseInt(likebtn.textContent.match(/\d+\.?\d*/g));
            const like = await fetch(`https://api.rotur.dev/rate?id=${likebtn.dataset.postid}&rating=${Number(!likebtn.textContent.includes('Unlike'))}`, {headers: authform})
            likebtn.textContent = (e.target.textContent.includes('Unlike') ? `🩶 Like (${likes - 1})` : `❤️ Unlike (${likes + 1})`)
            document.getElementById(`post-${e.target.dataset.postid}`).querySelector('[class*="viewlikes"]').disabled = ((likes - 1 == 0) && !likebtn.textContent.includes('Unlike'))
            break;
        }
        case ('viewlikes'): {
            const likes = JSON.parse(e.target.dataset.likes ?? "[]")
            if (document.getElementById(`post-${e.target.dataset.postid}`).querySelector('[class="likebutton"]').textContent.includes('Unlike') && !likes.includes(activeacc.name)) {
                likes.push(activeacc.name)
            }
            let likeshtml = `<ul class='likelist'>`
            for (let i=0; i<likes.length; i++) {
                if (likes[i].length > 25 && likes[i].includes('-')) {
                    likes[i] = ''
                }
                likeshtml += `<li>
                <a href="lookup.html?user=${likes[i] || "Spectator"}">
                    <img src='https://avatars.rotur.dev/${sanitize(likes[i]) || "Spectator"}' alt='${sanitize(likes[i]) || "Spectator"}' width='24' height='24'>
                    <p>${likes[i] || "Unknown User"}</p>
                </a>
                </li>`
            }
            likeshtml += `</ul>`
            openLikesPopup(likeshtml)
            break;
        }
        case ('sendreply'): {
            const postid = e.target.dataset.postid
            const content = document.getElementById(`post-${postid}`).querySelector('[class="replybox"]').value
            reply(postid, content)
            break;
        }
        case ('copypostid'): {
            try {
                await navigator.clipboard.writeText(e.target.dataset.postid);
                const target = e.target
                const oldtextcontent = target.textContent
                target.textContent = 'Copied!'
                target.style.background = 'rgb(0, 179, 0)'
                target.disabled = true
                setTimeout(() => {
                    target.textContent = oldtextcontent.includes('Reply') ? 'Copy Reply ID' : 'Copy Post ID'
                    target.style.background = ''
                    target.disabled = false
                }, 1500)
            } catch (err) {
                const target = e.target
                const oldtextcontent = target.textContent
                target.textContent = 'Copy Failed'
                target.style.background = 'rgb(179, 0, 0)'
                target.disabled = true
                setTimeout(() => {
                    target.textContent = oldtextcontent.includes('Reply') ? 'Copy Reply ID' : 'Copy Post ID'
                    target.style.background = ''
                    target.disabled = false
                }, 1500)
            }
            break;
        }
        case ('pollsubmit'): {
            e.preventDefault()
            const target = e.target
            target.disabled = true
            target.textContent = 'Submitting...'
            const postid = target.dataset.postid
            const chosen_option = target.closest('form').querySelector(`input[name="poll-${postid}"]:checked`).value
            if (chosen_option == null) {
                openErrorPopup("Please choose an option")
                break;
            }
            const pollsuccess = await fetch(`https://api.rotur.dev/vote_poll?id=${postid}&option=${chosen_option}`, {headers: authform}).then(res => res.json())
            if (pollsuccess.error) {
                openErrorPopup(String(pollsuccess.error))
            } else {
                openSuccessPopup('Your vote was successfully cast.')
                const postdata = currentfeeddata.find(clawpost => clawpost.id == postid)
                postdata.poll = pollsuccess.poll
                const newpost = document.querySelector(`.clawpostbody[id="post-${postid}"]`).replaceWith(createPostElement(postdata))
                target.closest('form').reset()
                target.disabled = true
            }
            target.textContent = "Submit Choice"
            break;
        }
    }
})

document.addEventListener('input', async function (e) {
    if (e.target.id == 'system') {
        document.getElementById('systemmiscinfo').disabled = (e.target.value == 'Unknown')
        if (e.target.value == 'Unknown') {
            document.getElementById('systemmiscinfo').title = "Unknown systems can't have system notes"
        } else {
            document.getElementById('systemmiscinfo').removeAttribute('title')
        }
        return;
    }
    if (e.target.id == 'postcontent') {
        const len = e.target.value.length
        updateCharLimit(len)
    }
    if (e.target.className == 'replybox') {
        const len = e.target.value.length
        updateReplyCharLimit(e.target.dataset.postid, len)
    }
})

document.getElementById('feedfilter').addEventListener('change', async function(e) {
    currentfeeddata = []
    lastquery = document.getElementById('feedfilter').value
    document.getElementById('postsearchbarinput').value = ''
    if (lastquery == 'following_feed') {
        if (!activeacc.uuid || flagged.includes(activeacc.uuid)) {
            document.getElementById('feedfilter').value = 'feed'
            lastquery = 'feed';
        }
    }
    updatepostcontrols()
    renderClawFeed()
})

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    document.getElementById('clawimage').addEventListener('change', async function(e) {
        document.getElementById('clearattachment').style.display = 'flex'
    })
}

document.addEventListener('change', function(e) {
    if (e.target.name.startsWith('poll-')) {
        e.target.closest('form').querySelector('.pollsubmit').disabled = false
        return;
    }
})