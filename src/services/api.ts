import { toast } from "@/components/ui/sonner";
import { triggerLogout } from "@/context/AuthContext";
import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from "axios";

// Base URL from the Postman collection
const API_BASE_URL =
  "http://localhost:8000/";
  // "http://ac5a69a19fced4eb28258d1c65ad6249-2b9c28116275af4b.elb.eu-west-1.amazonaws.com/";
// "http://a9b0b240dfca44171930862fbd75d67e-76ccfa1469ee44ae.elb.eu-west-1.amazonaws.com/";

// API Timeout (2 hours in milliseconds)
const API_TIMEOUT = 2 * 60 * 60 * 1000;

// Cache configuration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  maxAge: number; // milliseconds
  maxSize: number; // maximum number of entries
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;

  constructor(config: CacheConfig = { maxAge: 5 * 60 * 1000, maxSize: 100 }) {
    this.config = config;
  }

  private generateKey(endpoint: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : "";
    return `${endpoint}:${paramString}`;
  }

  set<T>(endpoint: string, params: any, data: T): void {
    const key = this.generateKey(endpoint, params);
    const now = Date.now();

    // Clean up expired entries first
    this.cleanup();

    // Check if cache is full
    if (this.cache.size >= this.config.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.config.maxAge,
    });
  }

  get<T>(endpoint: string, params?: any): T | null {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
    };
  }
}

// Create cache instance with different TTLs for different types of data
const apiCache = new ApiCache({
  maxAge: 5 * 60 * 1000, // 5 minutes default
  maxSize: 100,
});

// Cache configuration for different endpoints
const CACHE_CONFIG = {
  document: 10 * 60 * 1000, // 10 minutes for document data
  metadata: 5 * 60 * 1000, // 5 minutes for metadata
  list: 2 * 60 * 1000, // 2 minutes for document lists
  user: 30 * 60 * 1000, // 30 minutes for user data
};

// Create Axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Interfaces for API responses based on collection
interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface RegisterResponse {
  email: string;
  username: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface UserProfileResponse {
  email: string;
  username: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

// Helper function to handle API responses
async function handleApiResponse<T>(
  responsePromise: Promise<AxiosResponse<T>>
): Promise<ApiResponse<T>> {
  try {
    const response = await responsePromise;

    // Check if response is a Blob (for Excel files)
    if (response.data instanceof Blob) {
      return { data: response.data as any };
    }

    return { data: response.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Check specifically for 401 Unauthorized status
      if (axiosError.response?.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        // Trigger logout to clear user session
        setTimeout(() => triggerLogout(), 500);
        return { error: "Unauthorized. Please log in again." };
      }

      // Handle other API errors
      if (axiosError.response?.data) {
        try {
          // If the error response is a Blob, it's not actually an error
          if (axiosError.response.data instanceof Blob) {
            return { data: axiosError.response.data as any };
          }

          const errorData = axiosError.response.data as any;
          return {
            error: errorData.message || errorData.error || "An error occurred",
          };
        } catch {
          return { error: `Error: ${axiosError.response.status}` };
        }
      } else if (axiosError.code === "ECONNABORTED") {
        return { error: "Request timeout after 2 hours" };
      } else {
        return { error: axiosError.message || "Network error occurred" };
      }
    }

    return { error: "An unexpected error occurred" };
  }
}

// Authentication APIs
export async function loginUser(email: string, password: string) {
  return handleApiResponse(
    apiClient.post<LoginResponse>("/api/v1/auth/login", {
      email,
      password,
    })
  );
}

export async function registerUser(
  email: string,
  username: string,
  password: string
) {
  return handleApiResponse(
    apiClient.post<RegisterResponse>("/api/v1/auth/register", {
      email,
      username,
      password,
    })
  );
}

export async function getCurrentUser(token: string) {
  return handleApiResponse(
    apiClient.get<UserProfileResponse>("/api/v1/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );
}

// Document API response interfaces
export interface DocumentMetadata {
  file_size: number;
  char_count: number;
  word_count: number;
  line_count: number;
  paragraph_count: number;
  page_count: number;
  mime_type: string;
  encoding: string;
  summary: string;
  document_title: string | null;
  content_type: string | null;
  domain: string | null;
  content_categories: any;
  rule_matches: any[];
  extended: {
    document_sections: any | null;
    document_themes: any | null;
    lessons: string[];
    objectives: string[];
    subject_areas: any | null;
    grade_levels: any | null;
    language: any | null;
    search_terms: any | null;
    standards_alignments: any | null;
    target_audience: any | null;
    description: any | null;
    custom_labels: any | null;
    label_hierarchy: any | null;
    domain_entities: any | null;
    summary_short: any | null;
    summary_detailed: any | null;
    media_summaries: any | null;
    education_specific_summaries: any | null;
    keyword_statistics: any | null;
    font_statistics: any;
    document_structure: any;
    bullet_point_count: any | null;
    quality_metrics: any;
    extraction_statistics: any;
    processing_info: any;
    is_html: any | null;
    llm_enhanced: any | null;
  };
}

export interface DocumentLabels {
  labels: Array<{
    name: string;
    confidence: number;
    reason: string;
  }>;
  metadata: {
    document_type: string;
    primary_subject: string;
    grade_level: string;
  };
}

export interface EducationalSummary {
  title: string;
  summary: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
  metadata: {
    audience: string;
    format: string;
    grade_level: string;
    subject: string;
    time_estimate: string;
  };
  generation_details: {
    audience: string;
    format_type: string;
    generated_at: string;
    model: string;
  };
  document_info: any;
  chapter_summaries: any;
}

export interface DocumentUploadResponse {
  filename: string;
  mime_type: string;
  document_id: string;
  client_id: string;
  s3_path: string;
  path_type: string;
  id: number;
  s3_paths: string[];
  content: string;
  chunks: string[];
  metadata: DocumentMetadata;
  created_at: string;
  updated_at: string;
  excel_metadata: any | null;
  labels: DocumentLabels;
  educational_summary: EducationalSummary;
  excel_metadata_available?: {
    message: string;
    endpoint: string;
  };
  error?: string;
  document_info: any;
}

export interface DocumentUploadTaskResponse {
  task_id: string;
  status: string;
  message: string;
  progress_endpoint: string;
}

// Document APIs
export async function uploadDocument(
  file: File,
  token: string,
  autoCategorize: boolean = true,
  useCelery: boolean
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("auto_categorize", autoCategorize.toString());
  // Always send use_celery parameter to override backend default
  formData.append("use_celery", useCelery ? "true" : "false");

  const response = await handleApiResponse(
    apiClient.post<DocumentUploadTaskResponse>("/api/v1/documents/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    })
  );

  // Invalidate document list cache when uploading new documents
  if (response.data && !response.error) {
    apiCache.invalidate(`/api/v1/documents/`);
  }

  return response;
}

export async function getDocument(documentId: string, token: string) {
  // Check cache first
  const cacheKey = `/api/v1/documents/${documentId}`;
  const cachedData = apiCache.get<ApiResponse<DocumentUploadResponse>>(
    cacheKey,
    { token }
  );

  if (cachedData) {
    return cachedData;
  }

  // If not in cache, make API call
  const response = await handleApiResponse(
    apiClient.get<DocumentUploadResponse>(`/api/v1/documents/${documentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );

  // Cache successful responses
  if (response.data && !response.error) {
    apiCache.set(cacheKey, { token }, response);
  }

  return response;
}

// Metadata APIs - NOTE: Typically not needed as metadata is included in the main document response
export async function getDocumentMetadata(
  documentId: string,
  token: string,
  includeCjFallon: boolean = true
) {
  // Check cache first
  const cacheKey = `/api/v1/documents/${documentId}/metadata`;
  const cacheParams = { token, includeCjFallon };
  const cachedData = apiCache.get<ApiResponse<DocumentMetadata>>(
    cacheKey,
    cacheParams
  );

  if (cachedData) {
    return cachedData;
  }

  // If not in cache, make API call
  const response = await handleApiResponse(
    apiClient.get<DocumentMetadata>(
      `/api/v1/documents/${documentId}/metadata?include_cj_fallon=${includeCjFallon}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );

  // Cache successful responses
  if (response.data && !response.error) {
    apiCache.set(cacheKey, cacheParams, response);
  }

  return response;
}

export async function extractEducationalMetadata(
  documentId: string,
  token: string,
  enableAdvancedFeatures: boolean = true
) {
  // This endpoint is used to refresh or regenerate educational metadata if needed
  return handleApiResponse(
    apiClient.post<Record<string, any>>(
      `/api/v1/documents/${documentId}/educational-metadata?enable_advanced_features=${enableAdvancedFeatures}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
}

// Labeling APIs - NOTE: Typically not needed as labels are included in the main document response
export async function generateDocumentLabels(
  documentId: string,
  token: string,
  maxLabels: number = 10,
  minConfidence: number = 0.7
) {
  // This endpoint is used to refresh or regenerate document labels if needed
  return handleApiResponse(
    apiClient.post<DocumentLabels>(
      `/api/v1/documents/${documentId}/chapter-labels`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
}

export async function createLabelHierarchy(
  documentId: string,
  hierarchyStructure: any,
  token: string
) {
  return handleApiResponse(
    apiClient.post(
      `/api/v1/documents/${documentId}/label-hierarchy`,
      { hierarchy_structure: hierarchyStructure },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
}

export async function applyCustomLabels(
  documentId: string,
  customLabels: any[],
  token: string
) {
  return handleApiResponse(
    apiClient.post(
      `/api/v1/documents/${documentId}/custom-labels`,
      { custom_labels: customLabels },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
}

export async function extractDomainEntities(
  documentId: string,
  token: string,
  domain: string = "education",
  entityTypes: string[] = ["curriculum_standard", "learning_objective"]
) {
  let url = `/api/v1/documents/${documentId}/domain-entities?domain=${domain}`;
  entityTypes.forEach((type) => {
    url += `&entity_types=${type}`;
  });

  return handleApiResponse(
    apiClient.post(
      url,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
}

// Summarization APIs - NOTE: Typically not needed as educational summary is included in the main document response
export async function summarizeDocument(
  documentId: string,
  token: string,
  level:
    | "ultra_short"
    | "short"
    | "medium"
    | "detailed"
    | "comprehensive" = "medium",
  maxLength: number = 500,
  updateDocument: boolean = true,
  temperature: number = 0.7,
  topP: number = 0.7,
  topK: number = 0.7,
  byChapter: boolean = false
) {
  // This endpoint is used to refresh or regenerate document summary if needed
  return handleApiResponse(
    apiClient.post<EducationalSummary>(
      `/api/v1/documents/${documentId}/summarize`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          level,
          max_length: maxLength,
          update_document: updateDocument,
          temperature: temperature,
          top_p: topP,
          top_k: topK,
          by_chapter: byChapter,
        },
      }
    )
  );
}

export async function generateMultiLevelSummaries(
  documentId: string,
  token: string
) {
  return handleApiResponse(
    apiClient.post(
      `/api/v1/documents/${documentId}/multi-level-summaries`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
}

export async function createEducationalSummary(
  documentId: string,
  token: string
) {
  // This endpoint is used to refresh or regenerate educational summary if needed
  return handleApiResponse(
    apiClient.post<EducationalSummary>(
      `/api/v1/documents/${documentId}/educational-summary`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
}

export async function summarizeMediaContent(
  documentId: string,
  token: string,
  mediaType: "image" | "audio" | "video" | "all" = "all",
  level: "short" | "medium" | "detailed" = "detailed"
) {
  return handleApiResponse(
    apiClient.post(
      `/api/v1/documents/${documentId}/media-summaries?media_type=${mediaType}&level=${level}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
}

// Gap Analysis APIs
export async function analyzeDocumentGaps(
  parentDocumentId: string,
  childDocumentId: string,
  token: string
) {
  return handleApiResponse(
    apiClient.post(
      `/api/v1/documents/gap-analysis?parent_document_id=${parentDocumentId}&child_document_id=${childDocumentId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
}

export interface StandardsAnalysisResponse {
  document_name: string;
  standard_set: string;
  grade_level: string;
  subject: string;
  standards_analysis: {
    client_item_id: string;
    grades: string[];
    title: string;
    description: string;
    subject: string;
    standard_set: string;
    standard_grade: string;
    standard_code: string;
    standard_description: string;
  }[];
  missing_standards: {
    client_item_id: string;
    grades: string[];
    title: string;
    description: string;
    subject: string;
    standard_set: string;
    standard_grade: string;
    standard_code: string;
    standard_description: string;
  }[];
  extracted_standards: any[];
  processing_info: {
    total_chunks: number;
    total_standards_found: number;
    total_missing_standards: number;
    processing_timestamp: string;
  };
}

export async function uploadFileForStandardsAnalysis(
  file: File,
  standardSet: string,
  token: string
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("standard_set", standardSet);
  formData.append("chunk_size", "50000");

  // Option to receive the response as a blob for files
  return handleApiResponse(
    apiClient.post(
      `/api/v1/gap-analysis/analyze?chunk_size=50000&standard_set=${encodeURIComponent(
        standardSet
      )}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      }
    )
  );
}

export async function getAvailableDocumentsForGapAnalysis(token: string) {
  return handleApiResponse(
    apiClient.get(`/api/v1/documents/gap-analysis/available-documents`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );
}

// Excel Metadata API
export async function getExcelMetadata(documentId: string, token: string) {
  return handleApiResponse(
    apiClient.post(
      `/api/v1/excel-metadata/${documentId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
}

export async function getChapterLabels(documentId: string, token: string) {
  return handleApiResponse(
    apiClient.get(`/api/v1/documents/${documentId}/chapter-labels`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );
}

export async function getDocumentInfo(documentId: string, token: string) {
  return handleApiResponse(
    apiClient.get(`/api/v1/documents/${documentId}/info`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );
}

// New API endpoints to replace IndexedDB functionality

export interface DocumentListItem {
  document_id: string;
  filename: string;
  mime_type: string;
  created_at: string;
  updated_at: string;
  document_info?: {
    title?: string;
  };
  labels?: {
    labels?: Array<{
      name: string;
      confidence: number;
    }>;
  };
  metadata?: {
    document_themes?: string[];
    [key: string]: any;
  };
}

export interface DocumentListResponse {
  documents: DocumentListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface TaskProgressResponse {
  task_id: string;
  step: string;
  percentage: number;
  message: string;
  data: any;
  timestamp: string;
  status: string;
}

// List documents (replaces IndexedDB.getAll)
export async function listDocuments(
  skip: number = 0,
  limit: number = 100,
  token: string
) {
  // Check cache first
  const cacheKey = `/api/v1/documents/`;
  const cacheParams = { token, skip, limit };
  const cachedData = apiCache.get<ApiResponse<DocumentListResponse>>(
    cacheKey,
    cacheParams
  );

  if (cachedData) {
    return cachedData;
  }

  // If not in cache, make API call
  const response = await handleApiResponse(
    apiClient.get<DocumentListResponse>(
      `/api/v1/documents/?skip=${skip}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );

  // Cache successful responses
  if (response.data && !response.error) {
    apiCache.set(cacheKey, cacheParams, response);
  }

  return response;
}

// Get task progress (for upload progress tracking)
export async function getTaskProgress(taskId: string, token: string) {
  return handleApiResponse(
    apiClient.get<TaskProgressResponse>(
      `/api/v1/documents/progress/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
}

// Task list interfaces
export interface TaskSummary {
  task_id: string;
  task_name: string;
  status: string;
  filename?: string;
  content_type?: string;
  created_at?: string;
  duration?: number;
  percentage?: number;
  current_step?: string;
  user_name?: string;
}

export interface TaskListResponse {
  tasks: TaskSummary[];
  total: number;
  skip: number;
  limit: number;
  filters?: Record<string, any>;
}

// List tasks with filtering and pagination
export async function listTasks(
  skip: number = 0,
  limit: number = 10,
  status?: string,
  taskType?: string,
  token?: string
) {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  if (status) {
    params.append("status", status);
  }
  if (taskType) {
    params.append("task_type", taskType);
  }

  return handleApiResponse(
    apiClient.get<TaskListResponse>(`/api/v1/tasks/?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );
}

// Delete document (replaces IndexedDB.deleteById)
export async function deleteDocument(documentId: string, token: string) {
  const response = await handleApiResponse(
    apiClient.delete(`/api/v1/documents/${documentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );

  // Invalidate cache entries related to this document
  if (response.data && !response.error) {
    apiCache.invalidate(`/api/v1/documents/${documentId}`);
    apiCache.invalidate(`/api/v1/documents/`); // Invalidate document list cache
  }

  return response;
}

// Cache management utilities
export function invalidateDocumentCache(documentId?: string) {
  if (documentId) {
    apiCache.invalidate(`/api/v1/documents/${documentId}`);
  } else {
    apiCache.invalidate(`/api/v1/documents/`);
  }
}

export function clearAllCache() {
  apiCache.invalidate();
}

export function getCacheStats() {
  return apiCache.getStats();
}

// Debug utilities for development
export function debugCache() {
  const stats = apiCache.getStats();
  console.log("API Cache Stats:", stats);
  return stats;
}

// Force refresh specific document data
export function forceRefreshDocument(documentId: string) {
  apiCache.invalidate(`/api/v1/documents/${documentId}`);
  console.log(`Cache invalidated for document: ${documentId}`);
}

// Force refresh document list
export function forceRefreshDocumentList() {
  apiCache.invalidate(`/api/v1/documents/`);
  console.log("Document list cache invalidated");
}

// Cache configuration for different endpoints
export const CACHE_TTL = {
  DOCUMENT: 10 * 60 * 1000, // 10 minutes for document data
  METADATA: 5 * 60 * 1000, // 5 minutes for metadata
  LIST: 2 * 60 * 1000, // 2 minutes for document lists
  USER: 30 * 60 * 1000, // 30 minutes for user data
  TASK_PROGRESS: 30 * 1000, // 30 seconds for task progress
} as const;
