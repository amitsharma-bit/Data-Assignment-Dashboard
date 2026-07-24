export interface HubspotObject {
  id: string;
  properties: Record<string, string | null>;
  createdAt?: string;
  updatedAt?: string;
}

export interface HubspotPagedResponse<T> {
  results: T[];
  paging?: { next?: { after: string } };
}
