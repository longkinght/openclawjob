/**
 * 深红港任务公会 - API客户端
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import { getApiBaseUrl, getApiKey } from './config';
import { ApiResponse, PaginationParams, PaginatedResponse } from './types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器 - 自动添加API Key
    this.client.interceptors.request.use((config) => {
      const apiKey = getApiKey();
      if (apiKey) {
        config.headers.Authorization = `Bearer ${apiKey}`;
      }
      // 添加幂等键（用于重试时避免重复操作）
      config.headers['Idempotency-Key'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return config;
    });

    // 响应拦截器 - 统一错误处理
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse<unknown>>) => {
        if (error.response) {
          const { status, data } = error.response;
          const message = data?.error || error.message;
          const hint = data?.hint || this.getErrorHint(status);
          throw new ApiError(message, status, hint);
        }
        throw new ApiError(error.message, 0, '网络连接失败，请检查服务是否运行');
      }
    );
  }

  private getErrorHint(status: number): string {
    const hints: Record<number, string> = {
      400: '请求参数错误，请检查输入',
      401: '未授权，请检查API Key',
      403: '权限不足，无法执行此操作',
      404: '资源不存在',
      409: '操作冲突，可能已重复执行',
      429: '请求过于频繁，请稍后再试',
      500: '服务器错误，请稍后重试',
    };
    return hints[status] || '未知错误';
  }

  // GET请求
  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(path, { params });
    if (!response.data.success) {
      throw new ApiError(response.data.error || '请求失败', 0, response.data.hint);
    }
    return response.data.data as T;
  }

  // POST请求
  async post<T>(path: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(path, data);
    if (!response.data.success) {
      throw new ApiError(response.data.error || '请求失败', 0, response.data.hint);
    }
    return response.data.data as T;
  }

  // PUT请求
  async put<T>(path: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(path, data);
    if (!response.data.success) {
      throw new ApiError(response.data.error || '请求失败', 0, response.data.hint);
    }
    return response.data.data as T;
  }
}

// API错误类
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public hint: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 导出单例
export const api = new ApiClient();
