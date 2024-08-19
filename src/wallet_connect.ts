import { ErmisChat } from "client";
import { DefaultGenerics, ExtendableGenerics, GetTokenResponse, StartAuthResponse } from "types";

export class WalletConnect<ErmisChatGenerics extends ExtendableGenerics = DefaultGenerics> {
    private static _instance?: unknown | WalletConnect;

    _client: ErmisChat<ErmisChatGenerics>;
    address: string;
    disconnected: boolean;
    constructor(
        client: ErmisChat<ErmisChatGenerics>,
        address: string,
    ) {
        this._client = client;
        this.address = address;
        this.disconnected = false;
    }
    public static getInstance<ErmisChatGenerics extends ExtendableGenerics = DefaultGenerics>(
        client: ErmisChat<ErmisChatGenerics>,
        address: string,
    ): WalletConnect<ErmisChatGenerics> {
        if (!WalletConnect._instance) {
            WalletConnect._instance = new WalletConnect<ErmisChatGenerics>(client, address);
        }
        return WalletConnect._instance as WalletConnect<ErmisChatGenerics>;
    };

    getClient(): ErmisChat<ErmisChatGenerics> {
        if (this.disconnected) {
            throw new Error("WalletConnect is disconnected");
        }
        return this._client;
    };

    _walletConnectUrl() {
        return this.getClient().baseURL + "/uss/v1";
    };

    async startAuth(): Promise<StartAuthResponse> {
        return this.getClient().post<StartAuthResponse>(this._walletConnectUrl() + "/wallets/auth/start", {
            address: this.address,
        }, undefined, 'wallet')
    };

    async getAuth(signature: string, nonce: string) {
        return this.getClient().post(this._walletConnectUrl() + "/wallets/auth", {
            address: this.address,
            signature,
            nonce,
        }, undefined, 'wallet')
    };

    async getToken(api_key?: string): Promise<GetTokenResponse> {
        let key = api_key || this._client.key;
        return this.getClient().get<GetTokenResponse>(this._walletConnectUrl() + "/get_token", {
            api_key: key,
            address: this.address,
        }, 'wallet')
    };

    _disconnect() {
        this._client.logger('info', 'WalletConnect - Disconnected', {
            tags: ['wallet_connect'],
        });
        this.disconnected = true;
    };
}