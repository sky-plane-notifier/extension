export default class CustomWebSocket {

    get RECONNECT_DELAY_START() {
        return 1000
    }

    constructor(url, withRetry = true, maxRetries = 5) {
        this.url = url

        this.withRetry = withRetry
        this.maxRetries = maxRetries
        this.retries = 0
        this.reconnectDelay = this.RECONNECT_DELAY_START

        this.ws = null
        this.keepAliveIntervalId = null
        this.connect = this.connect.bind(this)
    }
    
    connect() {
        this.ws = new WebSocket(this.url)
        this.ws.onopen = this.onopen.bind(this)
        this.ws.onmessage = this.onmessage.bind(this)
        this.ws.onclose = this.onclose.bind(this)
        this.ws.onerror = this.onerror.bind(this)

    }

    onopen() {
        chrome.notifications.create({
            type: "basic",
            title: "Connection Open",
            message: `The connection to the server has been opened`,
            iconUrl: "../icons/icon48.png"
        })

        this.retries = 0; // Reset retries
        this.reconnectDelay = this.RECONNECT_DELAY_START; // Reset reconnect delay
        this.keepAliveIntervalId = this.wsKeepAlive()
    }

    onmessage(e) {
        const data = JSON.parse(e.data)
        for (const [key, value] of Object.entries(data)) {
            chrome.notifications.create({
                type: "basic",
                title: "New Tracking",
                message: `A flight with the specified min price have been found through the <<${value.flight_matches[0].airline.name}>> Airline`,
                iconUrl: "../icons/icon48.png"
            })
        }
    }

    onclose() {
            
        chrome.notifications.create({
            type: "basic",
            title: "Connection Closed",
            message: `Connection closed, attempting to reconnect...`,
            iconUrl: "../icons/icon48.png"
        })
        clearInterval(this.keepAliveIntervalId)
        if (this.withRetry && this.retries <= this.maxRetries) {
            this.retryConnecting()
        }
    }

    onerror(error) {
        console.error("Websocket error:", error)
        if (this.ws) {
            this.ws.close() // Close and trigger reconnection logic
        } else if (this.withRetry && this.retries <= this.maxRetries) {
            this.retryConnecting()
        }
    }


    wsKeepAlive() {
        const intervalId = setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send("ping");  // Send a keep-alive message every 30 seconds
            }
        }, 30 * 1000)
        
        return intervalId
    }

    retryConnecting() {
        
        if (this.retries >= this.maxRetries) {
            console.error(`Max retries reached: ${this.maxRetries}, giving up`)
            this.reconnectDelay = this.RECONNECT_DELAY_START // Reset reconnect delay
            return
        }

        setTimeout(this.connect, this.reconnectDelay)
        this.retries += 1
        console.log(`Reconnecting in ${this.reconnectDelay}ms (retry ${this.retries})`)

        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000) // Exponential backoff (max 30s)
    }
  }


  