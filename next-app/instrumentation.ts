export function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        console.log("[startup] Environment variables:", JSON.stringify(process.env, null, 2));
    }
}