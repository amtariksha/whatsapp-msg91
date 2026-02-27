import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlaceholderName } from "@/lib/utils";

// ─── POST /api/webhooks/msg91 — Receive inbound messages ──
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Log the full payload for debugging
        console.log("[MSG91 Webhook] Received payload:", JSON.stringify(body));

        /*
         * MSG91 "On Inbound Request Received" payload fields:
         *   customerNumber  — sender phone (e.g. "919876543210")
         *   content         — message text
         *   requestId       — MSG91 request ID
         *   eventName       — event type
         *   crqid           — conversation request ID
         *   companyId       — MSG91 company ID
         *   requestedAt     — timestamp
         *   reason          — reason field
         *   uuid            — unique message ID
         *
         * We also handle alternative field names for flexibility.
         */
        const senderPhone =
            body.customerNumber ||
            body.from ||
            body.sender ||
            body.mobile ||
            body.phone ||
            "";
        const receiverNumber =
            body.to ||
            body.receiver ||
            body.integrated_number ||
            "";
        let messageBody =
            body.content ||
            body.message ||
            body.text ||
            body.body ||
            "";

        // Handle MSG91 pushing objects like { text: "actual message" } in the text field
        if (typeof messageBody === 'object' && messageBody !== null) {
            messageBody = messageBody.text || JSON.stringify(messageBody);
        } else if (typeof messageBody === 'string') {
            try {
                // Sometimes MSG91 sends stringified JSON: '{"text":"Refunded mam"}'
                const parsed = JSON.parse(messageBody);
                if (parsed && typeof parsed === 'object' && parsed.text) {
                    messageBody = parsed.text;
                }
            } catch (e) {
                // Ignore parse errors, it's just a normal string
            }
        }

        const contentType = body.type || "text";
        const mediaUrl = body.media_url || body.mediaUrl || null;
        const fileName = body.file_name || body.fileName || null;
        const externalId = body.uuid || body.requestId || null;

        // Extract sender name from MSG91 payload if available
        const senderName =
            body.customerName ||
            body.profile?.name ||
            body.senderName ||
            body.name ||
            body.contact_name ||
            "";

        // Extract location data if present
        let locationData = null;
        if (contentType === "location" && (body.location || (body.latitude && body.longitude))) {
            locationData = {
                longitude: body.location?.longitude || body.longitude,
                latitude: body.location?.latitude || body.latitude,
                name: body.location?.name || "",
                address: body.location?.address || ""
            };
            if (!messageBody || messageBody === "[media]") {
                messageBody = `[Location]`;
            }
        }

        // Extract contact data if present
        let contactData = null;
        // MSG91 inbound webhook uses 'contacts' for the type, but let's be safe and check both.
        if ((contentType === "contacts" || contentType === "contact") && body.contacts) {
            contactData = body.contacts; // this is usually an array of contacts
            if (!messageBody || messageBody === "[media]") {
                messageBody = `[Contact: ${contactData?.[0]?.name?.formatted_name || "Shared Contact"}]`;
            }
        }

        // Use webhookType to identify the exact event type if present
        const webhookType = body.webhookType?.toString() || "";
        const eventName = body.eventName?.toString() || body.event?.toString() || "";
        const messageStatus = body.status?.toString() || "";

        // Let's identify the specific kind of the payload:
        const isDeliveryReport =
            webhookType === "3" /* Delivery/Status Event (assuming 3 based on structure, can vary) */ ||
            /* Known status event names */
            ['sent', 'delivered', 'read', 'failed'].includes(messageStatus.toLowerCase()) ||
            ['sent', 'delivered', 'read', 'failed'].includes(eventName.toLowerCase());

        const isOutboundRequestReceived = webhookType === "2" || (!isDeliveryReport && body.direction === "outbound");

        if (!senderPhone && !isDeliveryReport) {
            console.log("[MSG91 Webhook] No sender phone found. Payload keys:", Object.keys(body));
            return NextResponse.json(
                { error: "No sender phone found in payload" },
                { status: 400 }
            );
        }

        // Normalize phone (remove + prefix if present)
        const normalizedPhone = senderPhone.replace(/^\+/, "");
        console.log(`[MSG91 Webhook] Processing message from ${normalizedPhone}`);

        // ─── Detect Business App Messages ────────────────────
        // MSG91 doesn't send webhookType or direction for messages sent from the
        // WhatsApp Business App. Detect them by checking if the sender phone
        // matches a known business number.
        let isSenderBusinessNumber = false;
        if (normalizedPhone && !isDeliveryReport) {
            // Check 1: Look up in integrated_numbers DB table
            const { data: matchedNumber } = await supabaseAdmin
                .from("integrated_numbers")
                .select("number")
                .eq("number", normalizedPhone)
                .eq("active", true)
                .limit(1)
                .maybeSingle();
            if (matchedNumber) {
                isSenderBusinessNumber = true;
            }

            // Check 2: Fallback to env var (numbers may not be in DB)
            if (!isSenderBusinessNumber) {
                const envSingleNumber = (process.env.MSG91_INTEGRATED_NUMBER || "").replace(/^\+/, "");
                const envMultipleNumbers = (process.env.MSG91_INTEGRATED_NUMBERS || "")
                    .split(",")
                    .map(entry => entry.split(":")[0].trim().replace(/^\+/, ""))
                    .filter(Boolean);
                const allEnvNumbers = [envSingleNumber, ...envMultipleNumbers].filter(Boolean);
                if (allEnvNumbers.includes(normalizedPhone)) {
                    isSenderBusinessNumber = true;
                }
            }

            if (isSenderBusinessNumber) {
                console.log(`[MSG91 Webhook] Sender ${normalizedPhone} is a known business number`);
            }
        }

        // ─── Handle Delivery Reports (Outbound Message Status) ───

        // This denotes if the webhook represents an outbound message initiated from *outside* our CRM
        let isExternalOutbound = isOutboundRequestReceived || isSenderBusinessNumber;

        if (isDeliveryReport) {
            // Determine actual status
            const finalStatus = (eventName || messageStatus).toLowerCase();
            if (externalId) {
                console.log(`[MSG91 Webhook] Processing delivery report for message ${externalId}: ${finalStatus}`);

                // Try to update the message status in our database
                // First try external_id, then fallback to request_id
                let updatedMsg: any[] | null = null;
                let updateError: any = null;

                const result1 = await supabaseAdmin
                    .from("messages")
                    .update({ status: finalStatus })
                    .eq("external_id", externalId)
                    .select("id");
                updatedMsg = result1.data;
                updateError = result1.error;

                // Fallback: try request_id for backward compatibility
                if (!updatedMsg || updatedMsg.length === 0) {
                    const result2 = await supabaseAdmin
                        .from("messages")
                        .update({ status: finalStatus })
                        .eq("request_id", externalId)
                        .select("id");
                    if (result2.data && result2.data.length > 0) {
                        updatedMsg = result2.data;
                        updateError = result2.error;
                    }
                }

                if (updateError) {
                    console.error("[MSG91 Webhook] Error updating message status:", updateError);
                }

                // If the message wasn't found in our DB, it means it was sent directly from the MSG91 app (external outbound)
                if ((!updatedMsg || updatedMsg.length === 0) && messageBody) {
                    console.log(`[MSG91 Webhook] Delivery report message not found in DB. Treating as external outbound message. body: ${messageBody}`);
                    isExternalOutbound = true;
                } else if (!updatedMsg || updatedMsg.length === 0) {
                    // No body, just a status for an unknown message. Ignore.
                    return NextResponse.json({ success: true, type: "delivery_report_unknown" });
                } else {
                    // Message was successfully updated
                    return NextResponse.json({ success: true, type: "delivery_report" });
                }
            } else if (messageBody) {
                // No externalId, but has body and is a sent event. Probably external outbound without ID.
                isExternalOutbound = true;
            } else {
                return NextResponse.json({ success: true, type: "delivery_report_no_id" });
            }
        }

        // Determine actual customer and business numbers based on direction
        let actualCustomerPhone = normalizedPhone;
        let actualBusinessPhone = receiverNumber;
        let messageDirection = "inbound";

        if (isExternalOutbound) {
            // For external outbound, the 'sender' of the webhook payload is actually the business number
            // and the 'receiver' is the customer number.
            actualCustomerPhone = receiverNumber.replace(/^\+/, "");
            actualBusinessPhone = normalizedPhone;
            messageDirection = "outbound";
            console.log(`[MSG91 Webhook] External outbound message detected. Customer: ${actualCustomerPhone}, Business: ${actualBusinessPhone}`);

            if (!actualCustomerPhone) {
                return NextResponse.json(
                    { error: "No customer phone found for external outbound message" },
                    { status: 400 }
                );
            }
        }


        // ─── 1. Upsert Contact ─────────────────────────────
        let { data: contact } = await supabaseAdmin
            .from("contacts")
            .select("id, name")
            .eq("phone", actualCustomerPhone)
            .single();

        if (!contact) {
            const contactDisplayName = senderName || actualCustomerPhone;
            const { data: newContact, error: contactError } = await supabaseAdmin
                .from("contacts")
                .insert({
                    name: contactDisplayName,
                    phone: actualCustomerPhone,
                })
                .select("id, name")
                .single();

            if (contactError) {
                console.error("[MSG91 Webhook] Upsert contact error:", contactError);
                return NextResponse.json({ error: "Failed to upsert contact" }, { status: 500 });
            }
            contact = newContact;
            console.log(`[MSG91 Webhook] Created contact: ${contact!.id}`);
        } else if (senderName && isPlaceholderName(contact.name) && !isPlaceholderName(senderName)) {
            // Update contact name if we have a better one from the webhook
            await supabaseAdmin
                .from("contacts")
                .update({ name: senderName })
                .eq("id", contact.id);
            console.log(`[MSG91 Webhook] Updated contact name to "${senderName}"`);
        }

        // ─── 2. Upsert Conversation ────────────────────────
        let { data: conversation } = await supabaseAdmin
            .from("conversations")
            .select("id")
            .eq("contact_id", contact!.id)
            .eq("integrated_number", actualBusinessPhone || "default")
            .single();

        if (!conversation) {
            const { data: newConv, error: convError } = await supabaseAdmin
                .from("conversations")
                .insert({
                    contact_id: contact!.id,
                    integrated_number: actualBusinessPhone || "default",
                    status: "open",
                    last_message: messageBody || "[media]",
                    last_message_time: new Date().toISOString(),
                    last_incoming_timestamp: isExternalOutbound ? undefined : new Date().toISOString(),
                    unread_count: isExternalOutbound ? 0 : 1,
                })
                .select("id")
                .single();

            if (convError) {
                console.error("[MSG91 Webhook] Create conversation error:", convError);
                return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
            }
            conversation = newConv;
            console.log(`[MSG91 Webhook] Created conversation: ${conversation!.id}`);
        } else {
            // Update existing conversation
            const updatePayload: any = {
                status: "open",
                last_message: messageBody || "[media]",
                last_message_time: new Date().toISOString(),
            };
            if (!isExternalOutbound) {
                updatePayload.last_incoming_timestamp = new Date().toISOString();
            }

            await supabaseAdmin
                .from("conversations")
                .update(updatePayload)
                .eq("id", conversation.id);

            // Increment unread count only if inbound
            if (!isExternalOutbound) {
                const { data: convData } = await supabaseAdmin
                    .from("conversations")
                    .select("unread_count")
                    .eq("id", conversation.id)
                    .single();

                if (convData) {
                    await supabaseAdmin
                        .from("conversations")
                        .update({ unread_count: (convData.unread_count || 0) + 1 })
                        .eq("id", conversation.id);
                }
            }
        }

        // ─── Deduplication Check ─────────────────────────
        // MSG91 echoes back outbound messages as webhook events that look like
        // inbound messages. Check ALL conversations for this contact for a
        // recent outbound message with matching content (exact body or shared URL).
        if (contact?.id && messageBody) {
            const twoMinutesAgo = new Date(Date.now() - 120_000).toISOString();

            // Get all conversation IDs for this contact
            const { data: contactConvs } = await supabaseAdmin
                .from("conversations")
                .select("id")
                .eq("contact_id", contact.id);
            const contactConvIds = (contactConvs || []).map((c: { id: string }) => c.id);

            if (contactConvIds.length > 0) {
                // Check 1: Exact body match against recent outbound messages
                let dupMsg: { id: string } | null = null;
                const { data: exactMatch } = await supabaseAdmin
                    .from("messages")
                    .select("id")
                    .in("conversation_id", contactConvIds)
                    .eq("direction", "outbound")
                    .eq("body", messageBody)
                    .gte("created_at", twoMinutesAgo)
                    .limit(1)
                    .maybeSingle();
                dupMsg = exactMatch;

                // Check 2: URL-based match (for payment links where CRM stores
                // a compact body but MSG91 echoes the full text with the same URL)
                if (!dupMsg) {
                    const urls = messageBody.match(/https?:\/\/[^\s]+/g) || [];
                    for (const url of urls) {
                        const { data: urlMatch } = await supabaseAdmin
                            .from("messages")
                            .select("id")
                            .in("conversation_id", contactConvIds)
                            .eq("direction", "outbound")
                            .ilike("body", `%${url}%`)
                            .gte("created_at", twoMinutesAgo)
                            .limit(1)
                            .maybeSingle();
                        if (urlMatch) {
                            dupMsg = urlMatch;
                            break;
                        }
                    }
                }

                if (dupMsg) {
                    // Update the existing message's external_id for delivery report correlation
                    if (externalId) {
                        await supabaseAdmin
                            .from("messages")
                            .update({ external_id: externalId })
                            .eq("id", dupMsg.id);
                    }
                    console.log(`[MSG91 Webhook] Skipping duplicate message for contact ${contact.id} (matched msg ${dupMsg.id})`);
                    return NextResponse.json({ success: true, type: "duplicate_skipped" });
                }
            }
        }

        // ─── 3. Insert Message ─────────────────────────────

        // If it's a template payload or campaign, let's parse those properties
        const msgTemplateName = body.templateName || null;
        const msgCampaignName = body.campaignName || null;

        // If it's outbound, we want to represent it accurately
        let finalBody = messageBody;
        if (isExternalOutbound && !messageBody && msgTemplateName) {
            finalBody = `[Template: ${msgTemplateName}]`;
        }

        // Determine message source for sender icon differentiation
        let messageSource = "customer"; // default: inbound from customer
        if (isExternalOutbound) {
            if (msgCampaignName) {
                messageSource = "broadcast";
            } else if (isSenderBusinessNumber) {
                messageSource = "mobile_app"; // sent from WhatsApp Business mobile app
            } else {
                messageSource = "api"; // sent via MSG91 API from external system
            }
        }

        const insertPayload: any = {
            conversation_id: conversation!.id,
            direction: messageDirection,
            content_type: contentType === "contacts" ? "contact" : contentType, // Normalize 'contacts' to 'contact'
            body: finalBody,
            media_url: mediaUrl,
            file_name: fileName,
            template_name: msgTemplateName,
            status: isExternalOutbound ? "sent" : "delivered",
            source: messageSource,
        };

        if (locationData) {
            insertPayload.body = JSON.stringify({ text: messageBody, location: locationData });
        } else if (contactData) {
            insertPayload.body = JSON.stringify({ text: messageBody, contacts: contactData });
        }

        const { error: msgError } = await supabaseAdmin.from("messages").insert(insertPayload);

        if (msgError) {
            console.error("[MSG91 Webhook] Insert message error:", msgError);
            return NextResponse.json({ error: "Failed to insert message" }, { status: 500 });
        }

        console.log(`[MSG91 Webhook] Message saved for conversation ${conversation!.id}`);
        return NextResponse.json({ success: true, conversationId: conversation!.id });
    } catch (err) {
        console.error("[MSG91 Webhook] Error:", err);
        return NextResponse.json(
            { error: "Invalid payload" },
            { status: 400 }
        );
    }
}
