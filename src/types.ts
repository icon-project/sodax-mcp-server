// Type definitions for SODAX Brand Bible MCP Server

export interface BrandSection {
  id: string;
  title: string;
  content: string;
  subsections: BrandSubsection[];
}

export interface BrandSubsection {
  id: string;
  title: string;
  content: string;
}

export interface BrandBibleData {
  version: string;
  lastUpdated: string;
  sections: BrandSection[];
  rawContent: string;
  fetchedAt: Date;
}

export interface SearchResult {
  sectionId: string;
  sectionTitle: string;
  subsectionId?: string;
  subsectionTitle?: string;
  content: string;
  relevance: number;
}

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

export interface BrandQueryResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  source: string;
  lastUpdated: string;
}

export interface SectionResponse {
  sectionId: string;
  title: string;
  content: string;
  subsections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  source: string;
  lastUpdated: string;
}

export interface BrandOverviewResponse {
  version: string;
  lastUpdated: string;
  source: string;
  sections: Array<{
    id: string;
    title: string;
    subsectionCount: number;
  }>;
  summary: string;
}
