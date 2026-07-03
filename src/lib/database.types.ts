export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'editor' | 'viewer' | 'external_viewer';
export type PropertyVisibility = 'internal' | 'external';
export type DocumentSource = 'supabase_storage' | 'google_drive';
export type AnalysisJobStatus = 'queued' | 'processing' | 'review_required' | 'completed' | 'failed';

export type Property = {
  id: string;
  source_google_sheet_row_id: string | null;
  name: string;
  asset_type: string | null;
  address: string;
  price_amount_yen: number | null;
  price_raw_text: string | null;
  land_area_sqm: number | null;
  floor_area_sqm: number | null;
  zoning: string | null;
  coverage_ratio_raw: string | null;
  road_access: string | null;
  transaction_type: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  visibility: PropertyVisibility;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyDocument = {
  id: string;
  property_id: string | null;
  source: DocumentSource;
  storage_bucket: string | null;
  storage_path: string | null;
  drive_file_id: string | null;
  url: string | null;
  original_filename: string;
  mime_type: string;
  file_size: number | null;
  created_at: string;
};

export type AnalysisJob = {
  id: string;
  document_id: string | null;
  status: AnalysisJobStatus;
  extracted_payload: Json | null;
  error_message: string | null;
  approved_property_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: Property;
        Insert: Partial<Property> & Pick<Property, 'name' | 'address'>;
        Update: Partial<Property>;
      };
      property_documents: {
        Row: PropertyDocument;
        Insert: Partial<PropertyDocument> & Pick<PropertyDocument, 'source' | 'original_filename'>;
        Update: Partial<PropertyDocument>;
      };
      analysis_jobs: {
        Row: AnalysisJob;
        Insert: Partial<AnalysisJob>;
        Update: Partial<AnalysisJob>;
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, 'id' | 'email'>;
        Update: Partial<Profile>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_properties: {
        Args: {
          search_text?: string | null;
          min_price?: number | null;
          max_price?: number | null;
          transaction_type_filter?: string | null;
          asset_type_filter?: string | null;
          north?: number | null;
          south?: number | null;
          east?: number | null;
          west?: number | null;
        };
        Returns: Property[];
      };
    };
    Enums: {
      user_role: UserRole;
      property_visibility: PropertyVisibility;
      document_source: DocumentSource;
      analysis_job_status: AnalysisJobStatus;
    };
  };
};
