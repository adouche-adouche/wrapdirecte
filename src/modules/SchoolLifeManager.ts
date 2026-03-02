import { Fetcher } from "../utils/fetcher";
import { wrapDirecte } from "../core/wrapDirecte";
import { SchoolLifeItem } from "../types/schoollife";

export class SchoolLifeManager {
    constructor(private fetcher: Fetcher, private client: wrapDirecte) {}

    async getSchoolLife(): Promise<SchoolLifeItem[]> {
        this.client.checkModule("VIE_SCOLAIRE");
        const accountType = this.client.accountType === "E" ? "eleves" : "professeurs";
        const data = await this.client.request<any>({
            method: "POST",
            path: `/${accountType}/${this.client.accountId}/viescolaire.awp`,
            params: { verbe: "get" },
            body: {}
        });

        const absences = (data.absencesRetards || []).map((a: any) => ({
            id: a.id,
            type: a.typeElement,
            date: a.date,
            displayDate: a.displayDate,
            label: a.libelle,
            reason: a.motif,
            isJustified: a.justifie,
            comment: a.commentaire
        }));

        const sanctions = (data.sanctionsEncouragements || []).map((s: any) => ({
            id: s.id,
            type: s.typeElement,
            date: s.date,
            displayDate: s.displayDate,
            label: s.libelle,
            reason: s.motif,
            isJustified: s.justifie,
            comment: s.commentaire
        }));

        return [...absences, ...sanctions];
    }
}
