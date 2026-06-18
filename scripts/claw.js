import { sanitize, formatDate, openErrorPopup, openSuccessPopup, openWarningPopup, CreateEmptyPlaceholder, MiniError, UploadImage } from "../index.js"

let currentfeeddata = [];
let lastquery = 'feed'
let system_cache = []
let isTalon = false
const talon_beta = false // Dev flag for when Talon is out and ready to be supported (hopefully it will be a drop-in API swap)

const controller = new AbortController()
const requestlimit = setTimeout(() => controller.abort(), 5000);

const config = {
    elements: ['p', 'img', 'div', 'h1', 'h2', 'h3', 'h4', 'button', 'ul', 'li', 'select', 'option', 'a'],
    attributes: ['src', 'alt', 'href', 'width', 'height', 'id', 'class', 'data', 'value', 'title', 'disabled', 'selected']
}
const sanitizer = new Sanitizer(config)

if (talon_beta) {
    document.getElementById('clawtalon').setHTML(`<select id='clawtalonoption'>
        <option value='Claw' selected>Claw</option>
        <option value='Talon'>Talon</option>
        </select>`, {sanitizer: sanitizer})
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
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finalrepost" data-postid='${post_id}'>Yes</button>
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

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

let premium = false

if (!activeacc.uuid) {
    document.getElementById('postwindow').replaceChildren(CreateEmptyPlaceholder('Sign in to create posts!', true))
} else {
    premium = await fetch(`https://api.rotur.dev/keys/check/${activeacc.name}?key=bd6249d2b87796a25c30b1f1722f784f`, {signal: controller.signal}).then(res => res.json()).catch((err) => {
        clearTimeout(requestlimit)
        openWarningPopup('An error occurred while checking for Claw premium.')
        return ({owned: false})
    })
    premium = premium.owned
    clearTimeout(requestlimit)
    if (premium) {
        document.getElementById('limit-post').innerText = `0/600`
    }
}

if (flagged.includes(activeacc.uuid)) {
    const h3 = document.createElement('h3')
    h3.textContent = 'Due to an authentication issue that has been detected with your current account, interaction features has been disabled.'
    document.getElementById('postwindow').replaceChildren(h3)
}

async function getSystems() {
    const systems = await fetch(`https://api.rotur.dev/systems`).then(res => res.json())
    const systemsarray = Object.keys(systems)
    system_cache = systemsarray

    let systemoptions = ``

    for (let i=0; i<systemsarray.length; i++) {
            systemoptions += `<option value="${sanitize(systemsarray[i])}" ${systemsarray[i] == "Rotur Assistant" ? 'selected' : ''}>${sanitize(systemsarray[i])}</option>`
    }
    systemoptions += `<option value="Random">Random System</option>`
    systemoptions += `<option value="Unknown">"Unknown"</option>`
    if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
        document.getElementById('system').setHTML(systemoptions, {sanitizer: sanitizer})
    }
}

getSystems()

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

    clawpost.querySelector('.clawpostauthortitle').textContent = post.user ? (post.user + ' ') : "Unknown User "
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
    if (!activeacc.uuid || flagged.includes(activeacc.uuid)) {
        clawpost.querySelector('.repostbtn').remove()
        clawpost.querySelector('.deletebtn').remove()
    } else if (post.user == activeacc.name) {
        clawpost.querySelector('.repostbtn').style = 'right: 36px;'
    } else {
        clawpost.querySelector('.deletebtn').remove()
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

async function renderClawFeed() {
    const feed = await fetch(`https://claw.rotur.dev/${lastquery}`).then(res => res.json()).catch(err => {
        document.getElementsByClassName('container')[0].setHTML(`
            <h1>Claw</h1>
            <h3>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h3>
        `, {sanitizer: sanitizer})
        return;
    })
    if (feed.error) {
        openErrorPopup(feed.error)
        return;
    }
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
            feedbody.appendChild(createPostElement(post));
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
    newPosts.forEach(post => {
        if ((feed[1] ?? feed[0]).timestamp > newPosts[newPosts.length - 1].timestamp) {
            feedbody.appendChild(createPostElement(post));
        } else {
            feedbody.prepend(createPostElement(post));
        }
    });

    feed.forEach(post => {
        const likebtn = document.getElementById(`post-${post.id}`).querySelector('[class="likebutton"]')
        likebtn.textContent = (post.likes && post.likes.includes(activeacc.name)) ? `❤️ Unlike (${post.likes ? post.likes.length : 0})` : `🩶 Like (${post.likes ? post.likes.length : 0})`
        if (post.replies) {
            if (!document.getElementById(`post-${post.id}`).querySelector('[class="reply"]')) {
                const ul = document.createElement('ul')
                ul.className = "reply"
                ul.id = `replies-${post.id}`
                document.getElementById(`post-${post.id}`).querySelector('[class="repliesplaceholder"]').appendChild(ul)
            }
            const replies = document.getElementById(`post-${post.id}`).querySelector('[class="reply"]')
            replies.replaceChildren(...appendReplies(post))
            document.getElementById(`post-${post.id}`).querySelector('[class="replydropdownlabel"]').textContent = `View Replies (${post.replies ? post.replies.length : 0})`
        }
    }
    )
}

renderClawFeed()

function updateCharLimit(num) {
    const postlimit = document.getElementById('limit-post')
    postlimit.style = `color: ${num > (premium ? 600 : 300) ? 'red' : 'white'};`
    postlimit.textContent = `${num}/${premium ? '600' : '300'}`
    document.getElementById('sendpost').disabled = (num > (premium ? 600 : 300))
}
function updateReplyCharLimit(postid, num) {
    const replycharlimit = document.getElementById(`limit-${postid}`)
    replycharlimit.style = `color: ${num > (premium ? 600 : 300) ? 'red' : 'white'};`
    replycharlimit.textContent = `${num}/${premium ? '600' : '300'}`
    document.getElementById(`post-${postid}`).querySelector('[class="sendreply"]').disabled = (num > (premium ? 600 : 300))
}

async function post(message, system) {
    if (message == '') {
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
                postbutton.textContent = 'Send'
                document.getElementById('clearattachment').disabled = false
                setTimeout(function() {
                    document.getElementById('posterrorplaceholder').replaceChildren()
                }, 10000)
                return;
            }
        }
        let postsuccess = ''
        document.getElementById('posterrorplaceholder').replaceChildren()
        postsuccess = await fetch(`https://api.rotur.dev/post${system != `Unknown` ? `?os=${system == "Random" ? (system_cache[Math.floor(Math.random() * system_cache.length)] ?? "Rotur Assistant") : system}` : ``}${system == "Unknown" ? `?` : `&`}auth=${activeacc.token}&content=${message}${potentialattachment ? `&attachment=${encodeURIComponent(potentialattachment)}` : ``}${document.getElementById('profileonly').checked ? `&profile_only=1` : ``}`).then(res => res.json())
        if (postsuccess.error) {
            document.getElementById('posterrorplaceholder').replaceChildren(MiniError('failure', postsuccess.error))
        } else {
            document.getElementById('postcontent').value = ''
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
        postbutton.disabled = false
        postbutton.textContent = 'Send'
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
        replysuccess = await fetch(`https://api.rotur.dev/reply?id=${postid}&auth=${activeacc.token}&content=${message}`)
        if (replysuccess.error) {
            replystatus.replaceChildren(MiniError('failure', replysuccess.error))
        } else {
            document.getElementById(`post-${postid}`).querySelector('[class="replybox"]').value = ``
            updateReplyCharLimit(postid, 0)
            renderClawFeed()
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

function updatepostcontrols() {
    document.getElementById('postcontent').disabled = (lastquery != 'feed')
    document.getElementById('clawimage').disabled = (lastquery != 'feed')
    document.getElementById('system').disabled = (lastquery != 'feed')
    document.getElementById('profileonly').disabled = (lastquery != 'feed')
    document.getElementById('sendpost').disabled = ((lastquery != 'feed') || (document.getElementById('sendpost').value.length > (premium ? 600 : 300)))
}

let livefeed = ''
let claw_ws = null

document.getElementById('realtime').addEventListener('change', async function(e) {
    if (document.getElementById('realtime').checked) {
        document.getElementById('reloadfeed').disabled = true;
        claw_ws = new WebSocket("wss://socialws.rotur.dev")
        claw_ws.onmessage = function(e) {
            let data = JSON.parse(e.data)
            if (!(data.cmd == 'ping' || data.cmd == 'handshake')) {
                renderClawFeed()
            }
        }
        livefeed = setInterval(() => {
            claw_ws.send(JSON.stringify({cmd: "ping"}))
        }, 30000);
    } else {
        document.getElementById('reloadfeed').disabled = false;
        clearInterval(livefeed)
        claw_ws.close()
        claw_ws = null
    }
})

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    document.getElementById('post').addEventListener('submit', (event) => {
        event.preventDefault();
        const content = document.getElementById('postcontent').value
        const system = document.getElementById('system').value
        post(content, system)
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
    if (e.target.className == 'deletebtn') {
        openPopup(e.target.dataset.postid)
        return;
    }
    if (e.target.id == 'clawimage' && e.shiftKey) {
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
    if (e.target.className == 'repostbtn') {
        openRepostPopup(e.target.dataset.postid)
        return;
    }
    if (e.target.className == 'closebtn') {
        closePopup()
        return;
    }
    if (e.target.className == 'finaldelete') {
        const postid = e.target.dataset.postid
        const deletesuccess = await fetch(`https://api.rotur.dev/delete?auth=${activeacc.token}&id=${postid}`).then(res => res.json())
        closePopup()
        if (deletesuccess.error) {
            openErrorPopup(deletesuccess.error)
        } else {
            renderClawFeed()
        }
        return;
    }
    if (e.target.className == 'finalrepost') {
        const postid = e.target.dataset.postid
        const repostsuccess = await fetch(`https://api.rotur.dev/repost?auth=${activeacc.token}&id=${postid}`).then(res => res.json())
        closePopup()
        if (repostsuccess.error) {
            openErrorPopup(repostsuccess.error)
        } else {
            openSuccessPopup("This post has been reposted successfully!")
        }
        return;
    }
    if (e.target.id == 'reloadfeed') {
        const target = e.target
        target.disabled = true
        target.textContent = "..."
        await renderClawFeed()
        target.disabled = false
        target.textContent = '⟳'
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
            <a href="lookup.html?user=${likes[i] || "Spectator"}">
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
    
    if (e.target.id == 'clearsearch') {
        if (lastquery.includes('search_posts')) {
            currentfeeddata = []
            lastquery = document.getElementById('feedfilter').value ?? 'feed'
            updatepostcontrols()
            renderClawFeed()
        }
        document.getElementById('postsearchbarinput').value = ''
        return;
    }
    if (e.target.id == 'clearattachment') {
        document.getElementById('clearattachment').style.display = 'none'
        document.getElementById('clawimage').value = ''
        return;
    }
})

document.addEventListener('input', async function (e) {
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
        if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
            lastquery += `?auth=${activeacc.token}`
        } else {
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

document.getElementById('clawtalon').addEventListener('change', async function(e) {
    isTalon = (document.getElementById('clawtalonoption').value == 'Talon')
    if (isTalon) {
        // Future code for transitioning things from Claw over to Talon
    } else {
        // Future code for transitioning things from Talon over to Claw
    }

})