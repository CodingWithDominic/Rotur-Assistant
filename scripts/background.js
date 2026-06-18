async function scheduleAlarm(id, label, triggerAt) {
    await chrome.alarms.create(id, {when: triggerAt});

    const alarms = await new Promise(resolve =>
        chrome.storage.local.get('alarms', data => resolve(data.alarms || {}))
    ) ?? {};
        alarms[id] = { label, triggerAt: triggerAt };
        chrome.storage.local.set({alarms: alarms});
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
    chrome.storage.local.get("alarms", async ({ alarms = {} }) => {
        const meta = alarms[alarm.name] ?? { label: alarm.name };
        const notifid = String(Date.now())
        const dailycreditsettings = await new Promise(resolve =>
            chrome.storage.local.get('dailycreditsettings', data => resolve(data.dailycreditsettings || []))
        ) ?? [];

        if (dailycreditsettings.includes(alarm.name)) {
            chrome.notifications.create((alarm.name + '_' + notifid), {
                type: "basic",
                iconUrl: "../images/icon128.png",
                title: `${meta.label}: Daily Credit available!`,
                message: `Your Daily Credit is ready to claim for the account: ${meta.label}`,
                buttons: [
                    { title: 'Claim Daily Credit' },
                ],
                priority: 2,
            });
        }

        delete alarms[alarm.name];
        chrome.storage.local.set({ alarms });
    });
});

let statusws = null
let rpcdata = ''
let nexhook = null
let nexinterval = null
let nexdata = null
let heartbeatInterval = null

function stopHeartbeat() {
    clearInterval(heartbeatInterval);
}

function startHeartbeat() {
    clearInterval(heartbeatInterval) // To ensure a fresh connection to prevent 2 simultaneous intervals from running, potentially overloading the Rotur WS;
    heartbeatInterval = setInterval(() => {
        if (statusws && statusws.readyState === WebSocket.OPEN) {
            statusws.send(JSON.stringify({ cmd: "ping" }));
        }
        if (nexhook && nexhook.readyState === WebSocket.OPEN) {
            statusws.send(JSON.stringify({ cmd: "ping" }));
        }
    }, 25000); 
}



function ActivateWebsockets(auth) { // This is why I don't like working with websockets
    // Websocket Stuff

    // NexRPC
    if (rpcdata.preference == 'auto') {
        nexhook.onopen = () => {
            // Everything in here is psuedocode so far
            setInterval(() => {
                nexhook.send(JSON.stringify({
                    cmd: 'get_activities'
                }))
            }, 10000)

            statusws.onmessage = (event) => {
                nexdata = event.data // Idk how NexRPC will do it, this psuedocode is loosely based on how Rotur does its websockets.
                statusws.send(nexdata)
            }
        }
    }

    // Rotur WS

    statusws.onopen = () => {
        statusws.send(JSON.stringify({
            "cmd": "auth",
            "key": auth
        }))
    }
    statusws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.cmd == 'ping') {
            statusws.send(JSON.stringify({
                "cmd": "pong",
            }))
        }
        if (data.cmd == 'error') {
            return;
        }
        if (data.cmd == 'ready') {
            statusws.send(JSON.stringify({
            "cmd": "join",
            "rooms": ["originChats", "rotur"]
            }))
            startHeartbeat()
        }
        if (data.cmd == 'join_ok') {
            if (rpcdata.preference == 'custom') {
                for (let i=0; i<rpcdata.customdata.length; i++) {
                    const item = rpcdata.customdata[i]
                    statusws.send(JSON.stringify({
                        "cmd": "add_activity",
                        "id": item.id,
                        "title": item.name,
                        "image": item.image,
                        "media": {
                            "title": item.title,
                            "artist": item.description1,
                            "album": item.description2
                        },
                    }))   
                }
            }

        }
    }
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SCHEDULE_ALARM") {
        scheduleAlarm(msg.id, msg.label, msg.triggerAt);
    }
    if (msg.type === "RPC_ON") {
        statusws?.close()
        nexhook?.close()
        stopHeartbeat()

        rpcdata = msg.data
        statusws = new WebSocket(`wss://api.rotur.dev/status/ws`)
        if (rpcdata.preference == 'auto') {
            nexhook = new WebSocket('Nex hook goes here')
        }
        ActivateWebsockets(msg.auth)
    }
    if (msg.type === "RPC_OFF") {
        statusws?.close()
        nexdata?.close()
        stopHeartbeat()
    }
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    if (buttonIndex == 0) {
        const acc_uuid = notificationId.split('_')[0]
        const accounts = await new Promise(resolve =>
            chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
        ) ?? [];
        const activeaccindex = accounts.findIndex(acc => acc.uuid == acc_uuid)
        if (activeaccindex == -1) {
            chrome.notifications.create(String(Date.now()), {
                type: "basic",
                iconUrl: "../images/icon128.png",
                title: `Daily Claim Failed`,
                message: `This account appears to no longer be on your roster.`,
                priority: 1,
            });
        } else {
            const activeacc = accounts[activeaccindex]
            const dailyclaimsuccess = await fetch(`https://api.rotur.dev/claim_daily?auth=${activeacc.token}`).then(res => res.json())
            if (dailyclaimsuccess.error) {
                chrome.notifications.create(String(Date.now()), {
                    type: "basic",
                    iconUrl: "../images/icon128.png",
                    title: `Daily Claim Failed`,
                    message: `${activeacc.name}: An error occurred while trying to claim the daily credit: ${dailyclaimsuccess.error}`,
                    priority: 1,
                });
            } else {
                chrome.notifications.create(String(Date.now()), {
                    type: "basic",
                    iconUrl: "../images/icon128.png",
                    title: `Daily Claim Successful`,
                    message: `${activeacc.name}: Daily credit claimed successfully!`,
                    priority: 1,
                });
            }
            scheduleAlarm(activeacc.uuid, activeacc.name, Date.now() + 86400000)
        }
    }
});

chrome.runtime.onStartup.addListener(async () => {
    chrome.storage.local.get("alarms", async function ({ alarms = {} }) {
        const dailycreditsettings = await new Promise(resolve => chrome.storage.local.get('dailycreditsettings', data => resolve(data.dailycreditsettings || []))
        ) ?? [];
        const now = Date.now();

        Object.entries(alarms).forEach(([id, meta]) => {

            const notifid = (id + '_' + String(now));
            if (meta.triggerAt > now) {
                chrome.alarms.get(id, (existing) => {
                    if (!existing) {
                        chrome.alarms.create(id, { when: meta.triggerAt });
                    }
                });
            } else {
                if (dailycreditsettings.includes(id)) {
                    chrome.notifications.create(notifid, {
                        type: "basic",
                        iconUrl: "../images/icon128.png",
                        title: `${alarm.label}: Daily Credit available!`,
                        message: `Your Daily Credit is ready to claim for the account: ${alarm.label}`,
                        buttons: [
                            { title: 'Claim Daily Credit' },
                        ],
                        priority: 2,
                    });
                }

                delete alarms[id];
            }
        });

        chrome.storage.local.set({ alarms });
    });

    const rpcactive = await new Promise(resolve =>
        chrome.storage.local.get('rpcactive', data => resolve(data.rpcactive || ''))
    ) ?? '';
    const rpcdata2 = await new Promise(resolve =>
        chrome.storage.local.get('rpcdata', data => resolve(data.rpcdata || {}))
    ) ?? {};
    if (rpcactive && rpcdata2[rpcactive]) {
        if (rpcdata[rpcactive].preference == 'custom') {
            const accounts = await new Promise(resolve =>
                chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
            ) ?? [];
            statusws?.close()
            nexhook?.close()
            stopHeartbeat()

            rpcdata = rpcdata2[rpcactive].customdata
            statusws = new WebSocket(`wss://api.rotur.dev/status/ws`)
            if (rpcdata.preference == 'auto') {
                nexhook = new WebSocket('Nex hook goes here')
            }
            ActivateWebsockets(accounts[accounts.findIndex(acc => acc.uuid == rpcactive)].token)
        } else {
            // Future code goes here once NexRPC integration is added.
        }
    }
});

// Popup and Sidebar toggle stuff

async function toggleExtensionMode(mode) {
    if (mode == 'sidebar') {
        await chrome.action.setPopup({ popup: '' });
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
        await chrome.sidePanel.setOptions({ enabled: true });
    } else {
        await chrome.action.setPopup({ popup: 'index.html' });
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    }
}

chrome.storage.onChanged.addListener((changes) => {
    if (changes.ui_mode) {
        toggleExtensionMode(changes.ui_mode.newValue);
    }
});

