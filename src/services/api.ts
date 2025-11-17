import type { AxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

const api = <T = unknown>(
    method: HttpMethod,
    url: string,
    params?: unknown,
    allData: boolean = false
): Promise<T | AxiosResponse<T>> => {
    return new Promise((resolve, reject) => {
        const data: AxiosRequestConfig = ["delete", "get"].includes(method)
            ? { params }
            : { data: params };

        axios({
            method,
            url: `${url}`,
            ...data,
            timeout: 10000, // 10 second timeout
        })
            .then((response: AxiosResponse<T>) => {
                resolve(allData ? response : response.data);
            })
            .catch((error: unknown) => {
                // Enhanced error handling for network issues
                const axiosError = error as {
                    code?: string;
                    response?: unknown;
                };

                if (axiosError.code === "ECONNABORTED") {
                    reject(
                        new Error(
                            "Request timeout - network connection is slow"
                        )
                    );
                } else if (
                    axiosError.code === "NETWORK_ERROR" ||
                    !axiosError.response
                ) {
                    reject(
                        new Error("Network error - unable to connect to server")
                    );
                } else {
                    reject(
                        error instanceof Error
                            ? error
                            : new Error(String(error))
                    );
                }
            });
    });
};

export default api;
