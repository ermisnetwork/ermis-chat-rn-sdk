import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ErmisChat } from "client";
import { APIErrorResponse, DefaultGenerics, ErmisChatOptions, ErrorFromResponse, ExtendableGenerics, GetTokenResponse, Logger, ServerType, StartAuthResponse } from "types";
import https from 'https';
import { chatCodes, isFunction, randomId, retryInterval, sleep } from "utils";
import { isErrorResponse } from "errors";
export class WalletConnect<ErmisChatGenerics extends ExtendableGenerics = DefaultGenerics> {
    private static _instance?: unknown | WalletConnect;

    address: string;
    disconnected: boolean;
    axiosInstance: AxiosInstance;
    options: ErmisChatOptions;
    browser: boolean;
    node: boolean;
    key: string;
    baseURL?: string;
    logger: Logger;
    consecutiveFailures: number;
    userAgent?: string;
    constructor(
        key: string,
        address: string,
        options?: ErmisChatOptions
    ) {
        this.key = key;
        this.address = address;
        this.disconnected = false;
        const inputOptions = options || {};
        this.browser = typeof inputOptions.browser !== 'undefined' ? inputOptions.browser : typeof window !== 'undefined';
        this.node = !this.browser;
        this.options = {
            timeout: 3000,
            withCredentials: false, // making sure cookies are not sent
            warmUp: false,
            recoverStateOnReconnect: true,
        };
        if (this.node && !this.options.httpsAgent) {
            this.options.httpsAgent = new https.Agent({
                keepAlive: true,
                keepAliveMsecs: 3000,
            });
        }
        this.axiosInstance = axios.create(this.options);
        this.setBaseURL(this.options.baseURL || 'https://api.ermis.network/uss/v1');
        this.logger = isFunction(inputOptions.logger) ? inputOptions.logger : () => null;
        this.consecutiveFailures = 0;
    }
    setBaseURL(baseURL: string) {
        this.baseURL = baseURL;
    }

    _logApiRequest(
        type: string,
        url: string,
        data: unknown,
        config: AxiosRequestConfig & {
            config?: AxiosRequestConfig & { maxBodyLength?: number };
        },
    ) {
        this.logger('info', `client: ${type} - Request - ${url}- ${JSON.stringify(data)} - ${JSON.stringify(config.params)}`, {
            tags: ['api', 'api_request', 'client'],
            url,
            payload: data,
            config,
        });
    }

    _logApiResponse<T>(type: string, url: string, response: AxiosResponse<T>) {
        this.logger('info', `client:${type} - Response - url: ${url} > status ${response.status}`, {
            tags: ['api', 'api_response', 'client'],
            url,
            response,
        });
    }

    _logApiError(type: string, url: string, error: unknown, options: unknown) {
        this.logger('error', `client:${type} - Error: ${JSON.stringify(error)} - url: ${url} - options: ${JSON.stringify(options)}`, {
            tags: ['api', 'api_response', 'client'],
            url,
            error,
        });
    }

    doAxiosRequest = async <T>(
        type: string,
        url: string,
        data?: unknown,
        options: AxiosRequestConfig & {
            config?: AxiosRequestConfig & { maxBodyLength?: number };
        } = {},
    ): Promise<T> => {

        const requestConfig = this._enrichAxiosOptions(options);

        try {
            let response: AxiosResponse<T>;
            this._logApiRequest(type, url, data, requestConfig);
            switch (type) {
                case 'get':
                    response = await this.axiosInstance.get(url, requestConfig);
                    break;
                case 'delete':
                    response = await this.axiosInstance.delete(url, requestConfig);
                    break;
                case 'post':
                    response = await this.axiosInstance.post(url, data, requestConfig);
                    break;
                case 'postForm':
                    response = await this.axiosInstance.postForm(url, data, requestConfig);
                    break;
                case 'put':
                    response = await this.axiosInstance.put(url, data, requestConfig);
                    break;
                case 'patch':
                    response = await this.axiosInstance.patch(url, data, requestConfig);
                    break;
                case 'options':
                    response = await this.axiosInstance.options(url, requestConfig);
                    break;
                default:
                    throw new Error('Invalid request type');
            }
            this._logApiResponse<T>(type, url, response);
            this.consecutiveFailures = 0;
            return this.handleResponse(response);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any /**TODO: generalize error types  */) {
            e.client_request_id = requestConfig.headers?.['x-client-request-id'];
            this._logApiError(type, url, e, options);
            this.consecutiveFailures += 1;
            if (e.response) {
                /** connection_fallback depends on this token expiration logic */
                if (e.response.data.code === chatCodes.TOKEN_EXPIRED) {
                    if (this.consecutiveFailures > 1) {
                        await sleep(retryInterval(this.consecutiveFailures));
                    }
                    return await this.doAxiosRequest<T>(type, url, data, requestConfig);
                }
                return this.handleResponse(e.response);
            } else {
                throw e as AxiosError<APIErrorResponse>;
            }
        }
    };

    get<T>(url: string, params?: AxiosRequestConfig['params']) {
        return this.doAxiosRequest<T>('get', url, null, { params });
    }

    put<T>(url: string, data?: unknown) {
        return this.doAxiosRequest<T>('put', url, data);
    }

    post<T>(url: string, data?: unknown, params?: AxiosRequestConfig['params']) {
        return this.doAxiosRequest<T>('post', url, data, { params });
    }

    patch<T>(url: string, data?: unknown) {
        return this.doAxiosRequest<T>('patch', url, data);
    }

    delete<T>(url: string, params?: AxiosRequestConfig['params']) {
        return this.doAxiosRequest<T>('delete', url, null, { params });
    }
    errorFromResponse(response: AxiosResponse<APIErrorResponse>): ErrorFromResponse<APIErrorResponse> {
        let err: ErrorFromResponse<APIErrorResponse>;
        err = new ErrorFromResponse(`ErmisChat error HTTP code: ${response.status}`);
        if (response.data && response.data.code) {
            err = new Error(`ErmisChat error code ${response.data.code}: ${response.data.message}`);
            err.code = response.data.code;
        }
        err.response = response;
        err.status = response.status;
        return err;
    }

    handleResponse<T>(response: AxiosResponse<T>) {
        const data = response.data;
        if (isErrorResponse(response)) {
            throw this.errorFromResponse(response);
        }
        return data;
    }

    getUserAgent() {
        return (
            this.userAgent || `ermis-chat-sdk-javascript-client-${this.node ? 'node' : 'browser'}-${process.env.PKG_VERSION}`
        );
    }
    setUserAgent(userAgent: string) {
        this.userAgent = userAgent;
    }
    _enrichAxiosOptions(
        options: AxiosRequestConfig & { config?: AxiosRequestConfig } = {
            params: {},
            headers: {},
            config: {},
        },
    ): AxiosRequestConfig {

        let signal: AbortSignal | null = null;

        if (!options.headers?.['x-client-request-id']) {
            options.headers = {
                ...options.headers,
                'x-client-request-id': randomId(),
            };
        }
        const { params: axiosRequestConfigParams, headers: axiosRequestConfigHeaders, ...axiosRequestConfigRest } =
            this.options.axiosRequestConfig || {};

        let user_service_params = {
            api_key: this.key,
            ...options.params,
            ...(axiosRequestConfigParams || {}),
        }

        return {
            params: user_service_params,
            headers: {
                'X-Stream-Client': this.getUserAgent(),
                ...options.headers,
                ...(axiosRequestConfigHeaders || {}),
            },
            ...(signal ? { signal } : {}),
            ...options.config,
            ...(axiosRequestConfigRest || {}),
        };
    }

    // api methods
    async startAuth(): Promise<StartAuthResponse> {
        return this.post<StartAuthResponse>(this.baseURL + "/wallets/auth/start", {
            address: this.address,
        })
    };

    async getAuth(signature: string, nonce: string) {
        return this.post(this.baseURL + "/wallets/auth", {
            address: this.address,
            signature,
            nonce,
        })
    };

    async getToken(api_key?: string): Promise<GetTokenResponse> {
        let key = api_key || this.key;
        return this.get<GetTokenResponse>(this.baseURL + "/get_token", {
            api_key: key,
            address: this.address,
        })
    };

    _disconnect() {
        this.logger('info', 'WalletConnect - Disconnected', {
            tags: ['wallet_connect'],
        });
        this.disconnected = true;
    };
}