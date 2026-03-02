import { Fetcher } from "../utils/fetcher";
import { wrapDirecte } from "../core/wrapDirecte";
import { MessageSummary, MessageDetails } from "../types/messaging";
import { htmlToMarkdown, markdownToHtml } from "../utils/markdown";
import { decodeBase64, encodeBase64 } from "../utils/base64";

export class MessagingManager {
    constructor(private fetcher: Fetcher, private client: wrapDirecte) {}

    async getMessages(folder: string = "received"): Promise<MessageSummary[]> {
        this.client.checkModule("MESSAGERIE");
        const accountType = this.client.accountType === "E" ? "eleves" : "professeurs";
        const data = await this.client.request<any>({
            method: "POST",
            path: `/${accountType}/${this.client.accountId}/messages.awp`,
            params: { verbe: "get", mode: "destinataire" },
            body: { anneeMessages: "" }
        });

        return data.messages.received.map((m: any) => ({
            id: m.id,
            subject: m.subject,
            excerpt: m.content,
            date: m.date,
            read: m.read,
            from: m.from.name,
            hasAttachments: m.files.length > 0
        }));
    }

    async getMessageDetails(id: number): Promise<MessageDetails> {
        this.client.checkModule("MESSAGERIE");
        const accountType = this.client.accountType === "E" ? "eleves" : "professeurs";
        const data = await this.client.request<any>({
            method: "POST",
            path: `/${accountType}/${this.client.accountId}/messages/${id}.awp`,
            params: { verbe: "get", mode: "destinataire" },
            body: { anneeMessages: "" }
        });

        return {
            id: data.id,
            subject: data.subject,
            excerpt: "",
            date: data.date,
            read: true,
            from: data.from.name,
            content: htmlToMarkdown(decodeBase64(data.content)),
            attachments: data.files.map((f: any) => ({
                id: f.id,
                label: f.libelle,
                size: f.taille
            })),
            hasAttachments: data.files.length > 0
        };
    }

    async sendMessage(toId: number, subject: string, content: string): Promise<void> {
        this.client.checkModule("MESSAGERIE");
        const accountType = this.client.accountType === "E" ? "eleves" : "professeurs";
        await this.client.request({
            method: "POST",
            path: `/${accountType}/${this.client.accountId}/messages.awp`,
            params: { verbe: "post" },
            body: {
                message: {
                    subject,
                    content: encodeBase64(markdownToHtml(content)),
                    destinataires: [{ id: toId, type: "P" }]
                }
            }
        });
    }
}
