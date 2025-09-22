import type { AxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

interface ApiResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: any;
}

const api = <T = any>(
    method: HttpMethod,
    url: string,
    params?: any,
    allData: boolean = false
): Promise<T | ApiResponse<T>> => {
    return new Promise((resolve, reject) => {
        const data: AxiosRequestConfig = ["delete", "get"].includes(method)
            ? { params }
            : { data: params };

        axios({ method, url: `${url}`, ...data })
            .then((response: AxiosResponse<T>) => {
                resolve(allData ? response : response.data);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export default api;
