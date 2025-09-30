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

        axios({ method, url: `${url}`, ...data })
            .then((response: AxiosResponse<T>) => {
                resolve(allData ? response : response.data);
            })
            .catch((error) => {
                reject(error instanceof Error ? error : new Error(String(error)));
            });
    });
};

export default api;
