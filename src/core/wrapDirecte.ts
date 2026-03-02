import { Fetcher, RequestOptions } from "../utils/fetcher";
import { AuthManager } from "./auth";
import { EDSessionData, EDAccount, QCMChallenge } from "../types/auth";
import { EDAuthError, EDModuleDisabledError } from "../types";
import { GradesManager } from "../modules/GradesManager";
import { TimetableManager } from "../modules/TimetableManager";
import { HomeworkManager } from "../modules/HomeworkManager";
import { MessagingManager } from "../modules/MessagingManager";
import { DocumentsManager } from "../modules/DocumentsManager";
import { SchoolLifeManager } from "../modules/SchoolLifeManager";
import { imageUrlToBase64 } from "../utils/base64";

export class wrapDirecte {
    private fetcher: Fetcher;
    private auth: AuthManager;
    private sessionData: EDSessionData;

    public grades: GradesManager;
    public timetable: TimetableManager;
    public homework: HomeworkManager;
    public messaging: MessagingManager;
    public documents: DocumentsManager;
    public schoolLife: SchoolLifeManager;

    constructor(sessionData?: EDSessionData) {
        this.sessionData = sessionData || { enabledModules: [] };
        this.fetcher = new Fetcher(
            this.sessionData.token,
            this.sessionData.twoFaToken,
            undefined,
            this.sessionData.uuid
        );
        this.auth = new AuthManager(this.fetcher);

        this.grades = new GradesManager(this.fetcher, this);
        this.timetable = new TimetableManager(this.fetcher, this);
        this.homework = new HomeworkManager(this.fetcher, this);
        this.messaging = new MessagingManager(this.fetcher, this);
        this.documents = new DocumentsManager(this.fetcher, this);
        this.schoolLife = new SchoolLifeManager(this.fetcher, this);
    }

    static fromSession(data: EDSessionData): evoDirecte {
        return new evoDirecte(data);
    }

    getSessionData(): EDSessionData {
        return { ...this.sessionData };
    }

    async login(username: string, password: string, uuid?: string): Promise<{ success: boolean, requires2FA?: boolean, qcm?: QCMChallenge }> {
        if (uuid) this.sessionData.uuid = uuid;
        this.sessionData.username = username;

        const res = await this.auth.login(username, password, this.sessionData.uuid);

        if (res.code === 250) {
            const qcm = await this.auth.getQCM();
            return { success: false, requires2FA: true, qcm };
        }

        await this.handleLoginResponse(res, username, password);
        return { success: true };
    }

    async validate2FA(username: string, password: string, answer: string): Promise<boolean> {
        const fa = await this.auth.solveQCM(answer);
        const res = await this.auth.login(username, password, this.sessionData.uuid, [fa]);

        if (res.code === 200) {
            await this.handleLoginResponse(res, username, password);
            return true;
        }
        return false;
    }

    private async handleLoginResponse(res: any, username: string, password: string) {
        const account = res.data.accounts[0] as EDAccount;
        this.sessionData.token = res.token;
        this.sessionData.accessToken = account.accessToken;
        this.sessionData.accountType = account.typeCompte;
        this.sessionData.accountId = account.id;
        this.sessionData.username = username;

        this.sessionData.enabledModules = account.modules
            .filter(m => {
                const isEnabled = m.enable === true || m.enable === "true" || m.enable === "1" || m.enable === 1;
                return isEnabled;
            })
            .map(m => m.code);

        if (account.profile.photo) {
            try {
                const photoUrl = account.profile.photo.startsWith("http")
                    ? account.profile.photo
                    : `https:${account.profile.photo}`;
                account.profile.photo = await imageUrlToBase64(photoUrl).catch(() => account.profile.photo);
            } catch (e) {
                console.error("Failed to fetch profile photo", e);
            }
        }
    }

    checkModule(moduleCode: string) {
        if (!this.sessionData.enabledModules.includes(moduleCode)) {
            throw new EDModuleDisabledError(moduleCode);
        }
    }

    async request<T>(options: RequestOptions): Promise<T> {
        try {
            const res = await this.fetcher.request<T>(options);
            return res.data;
        } catch (e) {
            if (e instanceof EDAuthError && e.code === 525 && this.sessionData.uuid && this.sessionData.accessToken) {
                const refreshRes = await this.auth.refresh(
                    this.sessionData.username || "",
                    this.sessionData.uuid,
                    this.sessionData.accessToken,
                    this.sessionData.accountType!
                );
                this.sessionData.token = refreshRes.token;
                this.fetcher.setToken(refreshRes.token!);
                const retryRes = await this.fetcher.request<T>(options);
                return retryRes.data;
            }
            throw e;
        }
    }

    get accountId(): number {
        if (!this.sessionData.accountId) throw new Error("Not logged in");
        return this.sessionData.accountId;
    }

    get accountType(): string {
        return this.sessionData.accountType || "E";
    }
}
