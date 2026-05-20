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
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SCHEDULE_ALARM") {
        scheduleAlarm(msg.id, msg.label, msg.triggerAt);
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
                    message: `An error occurred while trying to claim the daily credit: ${dailyclaimsuccess.error}`,
                    priority: 1,
                });
            } else {
                chrome.notifications.create(String(Date.now()), {
                    type: "basic",
                    iconUrl: "../images/icon128.png",
                    title: `Daily Claim Successful`,
                    message: `Daily credit claimed successfully!`,
                    priority: 1,
                });
            }
            scheduleAlarm(activeacc.uuid, activeacc.name, Date.now() + 86400000)
        }
    }
});