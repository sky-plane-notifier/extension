chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.id === "openURL") {
        chrome.tabs.create({ url: request.url })
    }
})