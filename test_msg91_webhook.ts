import { POST } from "./src/app/api/webhooks/msg91/route";
import { NextRequest } from "next/server";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const mockRequest = new NextRequest("http://localhost/api/webhooks/msg91", {
    method: "POST",
    body: JSON.stringify({
        from: "919876543210",
        to: "911234567890",
        text: "This is a local direct function test",
        type: "text"
    })
});

async function runTest() {
    console.log("Testing POST handler locally...");
    try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
        console.log("Calling POST...");
        const resPromise = POST(mockRequest);
        const res = await Promise.race([resPromise, timeout]) as any;
        console.log("POST returned!");
        console.log("Status:", res.status);
        const json = await res.json();
        console.log("Response Body:", json);
        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}

runTest();
