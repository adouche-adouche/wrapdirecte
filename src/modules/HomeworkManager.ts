import { Fetcher } from "../utils/fetcher";
import { wrapDirecte } from "../core/wrapDirecte";
import { HomeworkDay, HomeworkItem, HomeworkDetails } from "../types/homework";
import { htmlToMarkdown } from "../utils/markdown";

export class HomeworkManager {
    constructor(private fetcher: Fetcher, private client: wrapDirecte) {}

    async getHomeworkList(): Promise<HomeworkDay[]> {
        this.client.checkModule("CAHIER_DE_TEXTES");
        const accountType = this.client.accountType === "E" ? "Eleves" : "Professeurs";
        const data = await this.client.request<Record<string, any[]>>({
            method: "POST",
            path: `/${accountType}/${this.client.accountId}/cahierdetexte.awp`,
            params: { verbe: "get" },
            body: {}
        });

        return Object.entries(data).map(([date, items]) => ({
            date,
            items: items.map((i: any) => ({
                id: i.idDevoir,
                subject: i.matiere,
                subjectCode: i.codeMatiere,
                isDone: i.effectue,
                isTest: i.interrogation,
                mustSubmitOnline: i.rendreEnLigne,
                givenOn: i.donneLe
            }))
        }));
    }

    async getHomeworkDetails(date: string): Promise<HomeworkDetails[]> {
        this.client.checkModule("CAHIER_DE_TEXTES");
        const accountType = this.client.accountType === "E" ? "Eleves" : "Professeurs";
        const data = await this.client.request<any>({
            method: "POST",
            path: `/${accountType}/${this.client.accountId}/cahierdetexte/${date}.awp`,
            params: { verbe: "get" },
            body: {}
        });

        return data.matieres.map((m: any) => ({
            id: m.id,
            subject: m.matiere,
            subjectCode: m.codeMatiere,
            teacher: m.nomProf,
            content: htmlToMarkdown(m.aFaire?.contenu || ""),
            isDone: m.aFaire?.effectue || false,
            isTest: m.interrogation,
            givenOn: m.aFaire?.donneLe,
            attachments: (m.aFaire?.documents || []).map((doc: any) => ({
                id: doc.id,
                label: doc.libelle,
                type: doc.type,
                size: doc.taille
            })),
            sessionContent: m.contenuDeSeance ? {
                content: htmlToMarkdown(m.contenuDeSeance.contenu || ""),
                attachments: (m.contenuDeSeance.documents || []).map((doc: any) => ({
                    id: doc.id,
                    label: doc.libelle,
                    type: doc.type,
                    size: doc.taille
                }))
            } : undefined
        }));
    }

    async setDone(homeworkIds: number[], done: boolean = true): Promise<void> {
        this.client.checkModule("CAHIER_DE_TEXTES");
        const accountType = this.client.accountType === "E" ? "Eleves" : "Professeurs";
        await this.client.request({
            method: "PUT",
            path: `/${accountType}/${this.client.accountId}/cahierdetexte.awp`,
            body: {
                idDevoirsEffectues: done ? homeworkIds : [],
                idDevoirsNonEffectues: done ? [] : homeworkIds
            }
        });
    }
}
