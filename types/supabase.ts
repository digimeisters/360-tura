// GENERISANO skriptom scripts/gen-db-types.mjs (npm run db:types) - ne menjati ručno.
// Izvor: živa baza sajta (tmnaguwmzlwirhjprdbh), 2026-09-23.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contact_requests: {
        Row: {
          agency: string | null
          contact: string
          created_at: string
          id: string
          listing_type: string | null
          message: string | null
          name: string
          package: string | null
          size: string | null
          source: string | null
          status: string
        }
        Insert: {
          agency?: string | null
          contact: string
          created_at?: string
          id?: string
          listing_type?: string | null
          message?: string | null
          name: string
          package?: string | null
          size?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          agency?: string | null
          contact?: string
          created_at?: string
          id?: string
          listing_type?: string | null
          message?: string | null
          name?: string
          package?: string | null
          size?: string | null
          source?: string | null
          status?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          ai_listing_type: string | null
          ai_model: string | null
          client_value: Json | null
          created_at: string
          draft_data: string | null
          establish: Json | null
          establish_i18n: Json | null
          floorplan_x: number | null
          floorplan_y: number | null
          highlights_i18n: Json | null
          id: string
          listing_copy_i18n: Json | null
          order_index: number | null
          panorama_url: string | null
          panorama_url_cf: string | null
          preview_url: string | null
          status: string | null
          target_languages: string | null
          title: string | null
          title_i18n: Json | null
          tour_slug: string | null
          visual_analysis: Json | null
          waypoints: Json | null
          waypoints_i18n: Json | null
        }
        Insert: {
          ai_listing_type?: string | null
          ai_model?: string | null
          client_value?: Json | null
          created_at?: string
          draft_data?: string | null
          establish?: Json | null
          establish_i18n?: Json | null
          floorplan_x?: number | null
          floorplan_y?: number | null
          highlights_i18n?: Json | null
          id?: string
          listing_copy_i18n?: Json | null
          order_index?: number | null
          panorama_url?: string | null
          panorama_url_cf?: string | null
          preview_url?: string | null
          status?: string | null
          target_languages?: string | null
          title?: string | null
          title_i18n?: Json | null
          tour_slug?: string | null
          visual_analysis?: Json | null
          waypoints?: Json | null
          waypoints_i18n?: Json | null
        }
        Update: {
          ai_listing_type?: string | null
          ai_model?: string | null
          client_value?: Json | null
          created_at?: string
          draft_data?: string | null
          establish?: Json | null
          establish_i18n?: Json | null
          floorplan_x?: number | null
          floorplan_y?: number | null
          highlights_i18n?: Json | null
          id?: string
          listing_copy_i18n?: Json | null
          order_index?: number | null
          panorama_url?: string | null
          panorama_url_cf?: string | null
          preview_url?: string | null
          status?: string | null
          target_languages?: string | null
          title?: string | null
          title_i18n?: Json | null
          tour_slug?: string | null
          visual_analysis?: Json | null
          waypoints?: Json | null
          waypoints_i18n?: Json | null
        }
        Relationships: []
      }
      site_events: {
        Row: {
          created_at: string
          device: string | null
          event_type: string
          id: string
          session_id: string
          source: string | null
          target: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          event_type: string
          id?: string
          session_id: string
          source?: string | null
          target?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          event_type?: string
          id?: string
          session_id?: string
          source?: string | null
          target?: string | null
        }
        Relationships: []
      }
      tour_events: {
        Row: {
          created_at: string
          duration_ms: number | null
          event_type: string
          id: string
          lang: string | null
          room_id: string | null
          session_id: string
          tour_slug: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          event_type: string
          id?: string
          lang?: string | null
          room_id?: string | null
          session_id: string
          tour_slug: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          event_type?: string
          id?: string
          lang?: string | null
          room_id?: string | null
          session_id?: string
          tour_slug?: string
        }
        Relationships: []
      }
      tours: {
        Row: {
          about_text_i18n: Json | null
          address: string | null
          advertiser_type: string | null
          agency_name: string | null
          agent_email: string | null
          agent_name: string | null
          agent_phone: string | null
          area_sqm: number | null
          build_status: string | null
          category: string | null
          city: string | null
          created_at: string
          district: string | null
          faq_1_i18n: Json | null
          faq_2_i18n: Json | null
          faq_3_i18n: Json | null
          faq_4_i18n: Json | null
          faq_5_i18n: Json | null
          finish_status: string | null
          floor: string | null
          floorplan_url: string | null
          guide_path: string | null
          has_basement: string | null
          has_elevator: string | null
          heating: string | null
          id: string
          lat: number | null
          lng: number | null
          location_map_url: string | null
          location_text_i18n: Json | null
          panorama_url: string | null
          price: number | null
          property_type: string | null
          published: boolean
          slug: string
          status: string
          structure: string | null
          target_languages: string | null
          title: string | null
          title_i18n: Json | null
        }
        Insert: {
          about_text_i18n?: Json | null
          address?: string | null
          advertiser_type?: string | null
          agency_name?: string | null
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          area_sqm?: number | null
          build_status?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          faq_1_i18n?: Json | null
          faq_2_i18n?: Json | null
          faq_3_i18n?: Json | null
          faq_4_i18n?: Json | null
          faq_5_i18n?: Json | null
          finish_status?: string | null
          floor?: string | null
          floorplan_url?: string | null
          guide_path?: string | null
          has_basement?: string | null
          has_elevator?: string | null
          heating?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_map_url?: string | null
          location_text_i18n?: Json | null
          panorama_url?: string | null
          price?: number | null
          property_type?: string | null
          published?: boolean
          slug: string
          status?: string
          structure?: string | null
          target_languages?: string | null
          title?: string | null
          title_i18n?: Json | null
        }
        Update: {
          about_text_i18n?: Json | null
          address?: string | null
          advertiser_type?: string | null
          agency_name?: string | null
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          area_sqm?: number | null
          build_status?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          faq_1_i18n?: Json | null
          faq_2_i18n?: Json | null
          faq_3_i18n?: Json | null
          faq_4_i18n?: Json | null
          faq_5_i18n?: Json | null
          finish_status?: string | null
          floor?: string | null
          floorplan_url?: string | null
          guide_path?: string | null
          has_basement?: string | null
          has_elevator?: string | null
          heating?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_map_url?: string | null
          location_text_i18n?: Json | null
          panorama_url?: string | null
          price?: number | null
          property_type?: string | null
          published?: boolean
          slug?: string
          status?: string
          structure?: string | null
          target_languages?: string | null
          title?: string | null
          title_i18n?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
