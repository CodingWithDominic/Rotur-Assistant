import { sanitize, formatDate, parseHTML } from "../index.js"

let currentfeeddata = [];
let lastquery = 'feed'
let system_cache = []

function openPopup(post_id) {
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

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
) ?? [];

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

let premium = false

if (!activeacc.uuid) {
    document.getElementById('postwindow').replaceChildren(...parseHTML(`<h2>Sign in to create posts!</h2>`))
} else {
    premium = await fetch(`https://api.rotur.dev/keys/check/${activeacc.name}?key=bd6249d2b87796a25c30b1f1722f784f`).then(res => res.json())
    premium = premium.owned
    if (premium) {
        document.getElementById('limit-post').innerText = `0/600`
    }
}

if (flagged.includes(activeacc.uuid)) {
    document.getElementById('postwindow').replaceChildren(...parseHTML(`<h3>Due to an authentication issue that has been detected with your current account, interaction features has been disabled.</h3>`))
}

async function getSystems() {
    const systems = await fetch(`https://api.rotur.dev/systems`).then(res => res.json())
    const systemsarray = Object.keys(systems)
    system_cache = systemsarray

    let systemoptions = ``

    for (let i=0; i<systemsarray.length; i++) {
            systemoptions += `<option value="${systemsarray[i]}" ${systemsarray[i] == "Rotur Assistant" ? 'selected' : ''}>${systemsarray[i]}</option>`
    }
    systemoptions += `<option value="Random">Random System</option>`
    systemoptions += `<option value="Unknown">"Unknown"</option>`
    if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
        document.getElementById('system').replaceChildren(...parseHTML(systemoptions))
    }
}

getSystems()

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
    const li = document.createElement('li');
    li.id = `post-${post.id}`;
    li.className = 'clawpostbody'
    li.replaceChildren(...parseHTML(`<div class='postauthor'>
        <a href='../pages/lookup.html?user=${post.user || "Spectator"}'>
            <img class='clawpfp' src='https://avatars.rotur.dev/${post.user || "Spectator"}' href='../pages/lookup.html?user=${post.user}' alt='${post.user}' width='32' height='32'>
            <h2>${post.user || "Unknown User"}</h2>
        </a>
            ${(activeacc.uuid && !flagged.includes(activeacc.uuid)) ? `${post.user == activeacc.name ? `<button class='deletebtn' title="Delete" data-postid='${post.id}'><img src='../images/misc_icons/delete.png' width='24' height='24'></button>` : `<button class='repostbtn' title="Repost" data-postid='${post.id}'><img src='../images/misc_icons/repost.png' width='24' height='24'></button></button>`}` : ``}
        </div>
        <p class='postcontent'>${sanitize(post.content)}</p>
        ${post.attachment ? `<img class='clawattachment' src='${sanitize(post.attachment)}'>` : ''}
        <p class='postmetadata'>Posted from ${post.os ?? "Unknown System"} on ${formatDate(post.timestamp)}</p>
        <div class='feedbackbar'>
            <button class='likebutton' data-postid='${post.id}' ${(activeacc.uuid && !flagged.includes(activeacc.uuid)) ? '' : 'disabled'}>${post.likes && post.likes.includes(activeacc.name) ? `❤️ Unlike (${post.likes ? post.likes.length : 0})` : `🩶 Like (${post.likes ? post.likes.length : 0})`}</button>
            <button class='viewlikes' data-postid='${post.id}' ${post.likes ? `data-likes=${JSON.stringify(post.likes)}` : 'disabled'}>View Likes</button>
            <button class='copypostid' data-postid='${post.id}'>Copy Post ID</button>
        </div>
        <details class='repliesbtn' data-postid='${post.id}'>
        <summary class='replydropdownlabel'>View Replies (${post.replies ? post.replies.length : 0})</summary>
            <div class='repliesplaceholder'>
                ${post.replies ? `<ul class='reply' id='replies-${post.id}'>${appendReplies(post)}</ul>` : ``}
            </div>
            <div class='replyboxplaceholder'>
            ${(activeacc.uuid && !flagged.includes(activeacc.uuid)) ? `
                <textarea class='replybox' data-postid='${post.id}' placeholder='Add a reply for ${post.user}'></textarea>
                <p class="postcharlimit" id="limit-${post.id}">0/${premium ? '600' : '300'}</p>
                <button class='sendreply' data-postid='${post.id}'>Send</button>`
                : `${flagged.includes(activeacc.uuid) ? `<h3>Due to an authentication issue with your current account, this feature has been disabled.</h3>` : `<h2>Sign in to add a reply</h2>`}`}
            </div>
            <div class='replyerrorplaceholder'></div>
        </details>`))
    return li;
}

async function renderClawFeed() {
    const feed = await fetch(`https://claw.rotur.dev/${lastquery}`).then(res => res.json())
    const feedbody = document.getElementById('feed').querySelector('[id="clawfeed"]')

    if (feed.length == 0) {
        const errorjson = {"top_posts":"There have been no popular posts recently. Try liking a few of them to have them show up here!",
                           "feed":"Nobody has made a post yet... maybe you can be the first!"
                            }
        feedbody.style = 'border: none;'
        feedbody.replaceChildren(...parseHTML(`<li><h2>${errorjson[lastquery] ? errorjson[lastquery] : lastquery.includes('following_feed') ? "Either you aren't following anybody or none of the people you follow has made a claw post yet." : "No posts match this search."}</h2></li>`))
        return;
    } else {
        feedbody.style = 'border: 2px solid white;'
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
    // Add new posts
    newPosts.forEach(post => {
        if (feed[1].timestamp > newPosts[newPosts.length - 1].timestamp) {
            feedbody.appendChild(createPostElement(post));
        } else {
            feedbody.prepend(createPostElement(post));
        }
    });

    deletedPosts.forEach(post => {
        const el = document.getElementById(`post-${post.id}`);
        if (el) el.remove();
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
            replies.replaceChildren(...parseHTML(appendReplies(post)))
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
   let potentialattachment = ''
   const postbutton = document.getElementById('sendpost')
   document.getElementById('clearattachment').disabled = true
   postbutton.disabled = true
   postbutton.textContent = 'Sending...'

   const attachment = document.getElementById('clawimage').files[0]

    if (attachment) {
        const reader = new FileReader();

        reader.onloadend = () => {
            potentialattachment = reader.result
        };

        reader.readAsDataURL(attachment);
        const response = await fetch('https://roturcdn.milosantos.com/api/image/upload?public=true', {
            method: 'POST',
            body: attachment
        }).then(res => res.json());

        potentialattachment = `https://roturcdn.milosantos.com/${response.id}`;
        if (potentialattachment.includes('undefined')) {
            document.getElementById('posterrorplaceholder').replaceChildren(...parseHTML(`<p class="failure">Attachment failed to upload</p>`))
            postbutton.disabled = false
            postbutton.textContent = 'Send'
            setTimeout(function() {
                document.getElementById('posterrorplaceholder').replaceChildren()
            }, 10000)
            return;
        }
    }


    let postsuccess = ''
    document.getElementById('posterrorplaceholder').replaceChildren()
    if (message == '') {
        document.getElementById('posterrorplaceholder').replaceChildren(...parseHTML(`<p class="failure">You can't post a blank post</p>`))
    } else {
        postsuccess = await fetch(`https://api.rotur.dev/post${system != `Unknown` ? `?os=${system == "Random" ? (system_cache[Math.floor(Math.random() * system_cache.length)] ?? "Nex") : system}` : ``}${system == "Unknown" ? `?` : `&`}auth=${activeacc.token}&content=${message}${potentialattachment ? `&attachment=${encodeURIComponent(potentialattachment)}` : ``}${document.getElementById('profileonly').checked ? `&profile_only=1` : ``}`)
        if (postsuccess.error) {
            document.getElementById('posterrorplaceholder').replaceChildren(...parseHTML(`<p class="failure">${postsuccess.error}</p>`))
        } else {
            document.getElementById('postcontent').value = ''
            document.getElementById('clawimage').value = ''
            document.getElementById('clearattachment').disabled = false
            document.getElementById('clearattachment').style.display = 'none'
            updateCharLimit(0)
            if (document.getElementById('profileonly').checked) {
                document.getElementById('profileonly').checked = false
                openSuccessPopup('Successfully posted to your profile!')
            } else {
                renderClawFeed()
            }
        }
    }
   postbutton.disabled = false
   postbutton.textContent = 'Send'
    setTimeout(function() {
        document.getElementById('posterrorplaceholder').replaceChildren()
    }, 10000)
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
        if (replysuccess.error) {
            replystatus.replaceChildren(...parseHTML(`<p class="failure">${replysuccess.error}</p>`))
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
    document.getElementById('sendpost').disabled = ((lastquery != 'feed') || (document.getElementById('sendpost').value.length > (premium ? 600 : 300)))
}

let livefeed = ''

document.getElementById('realtime').addEventListener('change', async function(e) {
    if (document.getElementById('realtime').checked) {
        document.getElementById('reloadfeed').disabled = true;
        renderClawFeed()
        livefeed = setInterval(() => {
            renderClawFeed()
        }, 5000);
    } else {
        document.getElementById('reloadfeed').disabled = false;
        clearInterval(livefeed)
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
    lastquery = 'search_posts?q=' + document.getElementById('postsearchbarinput').value
    updatepostcontrols()
    renderClawFeed()
})

document.addEventListener('click', async function(e) {
    if (e.target.className == 'deletebtn') {
        openPopup(e.target.dataset.postid)
        return;
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
        renderClawFeed()
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

document.getElementById('clawimage').addEventListener('change', async function(e) {
    document.getElementById('clearattachment').style.display = 'flex'
})
