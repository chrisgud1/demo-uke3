// Store IP addresses and their request timestamps
const requests = new Map();

// Default configuration
const DEFAULT_MAX_REQUESTS = 20;
const DEFAULT_TIME_WINDOW = 60000; // 1 minute in milliseconds

// Clean old requests for an IP address
function cleanOldRequests(ip, timeWindow) {
    const now = Date.now();
    const userRequests = requests.get(ip) || [];
    const validRequests = userRequests.filter(timestamp => 
        now - timestamp < timeWindow
    );
    requests.set(ip, validRequests);
    return validRequests;
}

// Add a new request for an IP address
function addRequest(ip) {
    const userRequests = requests.get(ip) || [];
    userRequests.push(Date.now());
    requests.set(ip, userRequests);
}

// Check if an IP is rate limited
function isRateLimited(ip, maxRequests, timeWindow) {
    const validRequests = cleanOldRequests(ip, timeWindow);
    return validRequests.length >= maxRequests;
}

// Create middleware function
export function createRateLimiter(maxRequests = DEFAULT_MAX_REQUESTS, timeWindow = DEFAULT_TIME_WINDOW) {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        
        if (isRateLimited(clientIP, maxRequests, timeWindow)) {
            console.log(`Rate limit exceeded for IP: ${clientIP}`); // Add logging
            res.status(429).json({
                error: 'Too many requests, please try again later.',
                retryAfter: `${timeWindow/1000} seconds`
            });
            res.locals.rateLimited = true;
            return; // Make sure we return here
        }
        
        addRequest(clientIP);
        next();
    };
}