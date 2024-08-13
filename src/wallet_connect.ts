import { ErmisChat } from "client";
import { DefaultGenerics, ExtendableGenerics } from "types";

export class WalletConnect<ErmisChatGenerics extends ExtendableGenerics = DefaultGenerics> {
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
    getClient(): ErmisChat<ErmisChatGenerics> {
        if (this.disconnected) {
            throw new Error("WalletConnect is disconnected");
        }
        return this._client;
    }
    _walletConnectUrl() {
        return this.getClient().baseURL + "uss/v1";
    }
    async startAuth() {
        return this.getClient().post(this._walletConnectUrl() + "/wallets/auth/start", {
            address: this.address,
        }, true)
    }
    async endAuth(signature: string, nonce: string) {
        return this.getClient().post(this._walletConnectUrl() + "/wallets/auth", {
            address: this.address,
            signature,
            nonce,
        }, true)
    }
    async getToken() {
        return this.getClient().get(this._walletConnectUrl() + "/get_token", {
            address: this.address,
        }, true)
    }
    _disconnect() {
        this._client.logger('info', 'WalletConnect - Disconnected', {
            tags: ['wallet_connect'],
        });
        this.disconnected = true;
    }
}