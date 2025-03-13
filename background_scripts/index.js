import CustomWebSocket from "./websocket.js"

chrome.runtime.onInstalled.addListener(() => {
    const clientId = navigator.userAgent.includes("Edg") ? "edg" : "chrome"
    const ws = new CustomWebSocket(`ws://localhost:8000/trackings/ws/${clientId}`)
    ws.connect()
})

chrome.runtime.onStartup.addListener(() => {
    const clientId = navigator.userAgent.includes("Edg") ? "edg" : "chrome"
    const ws = new CustomWebSocket(`ws://localhost:8000/trackings/ws/${clientId}`)
    ws.connect()
})


chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.id === "openURL") {
        chrome.tabs.create({ url: request.url })
    }
})
