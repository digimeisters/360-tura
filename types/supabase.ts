// GENERISANO skriptom scripts/gen-db-types.mjs (npm run db:types) - ne menjati ručno.
// Izvor: živa baza sajta (tmnaguwmzlwirhjprdbh), 2026-10-09.

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
      agency_branding: {
        Row: {
          agency_name: string
          logo_url: string
          updated_at: string
        }
        Insert: {
          agency_name: string
          logo_url: string
          updated_at?: string
        }
        Update: {
          agency_name?: string
          logo_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_admins: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
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
      project_buildings: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          sort: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          sort?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_buildings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_floors: {
        Row: {
          building_id: string | null
          created_at: string
          id: string
          label: string | null
          level: number
          plan_url: string | null
          polygon: Json | null
          project_id: string
          view_tour_id: string | null
        }
        Insert: {
          building_id?: string | null
          created_at?: string
          id?: string
          label?: string | null
          level: number
          plan_url?: string | null
          polygon?: Json | null
          project_id: string
          view_tour_id?: string | null
        }
        Update: {
          building_id?: string | null
          created_at?: string
          id?: string
          label?: string | null
          level?: number
          plan_url?: string | null
          polygon?: Json | null
          project_id?: string
          view_tour_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_floors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_floors_view_tour_id_fkey"
            columns: ["view_tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      project_inquiries: {
        Row: {
          contact: string
          created_at: string
          embedded: boolean
          handled_at: string | null
          handled_by: string | null
          id: string
          lang: string
          message: string | null
          name: string
          project_id: string
          unit_code: string
          unit_id: string | null
        }
        Insert: {
          contact: string
          created_at?: string
          embedded?: boolean
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          lang?: string
          message?: string | null
          name: string
          project_id: string
          unit_code: string
          unit_id?: string | null
        }
        Update: {
          contact?: string
          created_at?: string
          embedded?: boolean
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          lang?: string
          message?: string | null
          name?: string
          project_id?: string
          unit_code?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_inquiries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_inquiries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "project_units"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          author: string
          id: string
          important: boolean
          inquiry_id: string | null
          project_id: string
          text: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          author: string
          id?: string
          important?: boolean
          inquiry_id?: string | null
          project_id: string
          text: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          author?: string
          id?: string
          important?: boolean
          inquiry_id?: string | null
          project_id?: string
          text?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "project_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "project_units"
            referencedColumns: ["id"]
          },
        ]
      }
      project_progress: {
        Row: {
          created_at: string
          id: string
          month: string
          note: string | null
          project_id: string
          tour_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          note?: string | null
          project_id: string
          tour_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          note?: string | null
          project_id?: string
          tour_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_progress_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sales_links: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          person_name: string
          project_id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          person_name: string
          project_id: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          person_name?: string
          project_id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sales_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_unit_changes: {
        Row: {
          actor: string
          created_at: string
          field: string
          id: string
          link_id: string | null
          new_value: string | null
          old_value: string | null
          project_id: string
          unit_code: string
          unit_id: string | null
        }
        Insert: {
          actor: string
          created_at?: string
          field: string
          id?: string
          link_id?: string | null
          new_value?: string | null
          old_value?: string | null
          project_id: string
          unit_code: string
          unit_id?: string | null
        }
        Update: {
          actor?: string
          created_at?: string
          field?: string
          id?: string
          link_id?: string | null
          new_value?: string | null
          old_value?: string | null
          project_id?: string
          unit_code?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_unit_changes_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "project_sales_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_unit_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_unit_changes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "project_units"
            referencedColumns: ["id"]
          },
        ]
      }
      project_units: {
        Row: {
          area_sqm: number | null
          code: string
          floor_id: string
          id: string
          orientation: string | null
          photos: Json | null
          plan_url: string | null
          plan3d_url: string | null
          polygon: Json | null
          price: number | null
          project_id: string
          rooms: Json | null
          sort: number
          status: string
          structure: string | null
          terrace_sqm: number | null
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          area_sqm?: number | null
          code: string
          floor_id: string
          id?: string
          orientation?: string | null
          photos?: Json | null
          plan_url?: string | null
          plan3d_url?: string | null
          polygon?: Json | null
          price?: number | null
          project_id: string
          rooms?: Json | null
          sort?: number
          status?: string
          structure?: string | null
          terrace_sqm?: number | null
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          area_sqm?: number | null
          code?: string
          floor_id?: string
          id?: string
          orientation?: string | null
          photos?: Json | null
          plan_url?: string | null
          plan3d_url?: string | null
          polygon?: Json | null
          price?: number | null
          project_id?: string
          rooms?: Json | null
          sort?: number
          status?: string
          structure?: string | null
          terrace_sqm?: number | null
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_units_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "project_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_units_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      project_view_shapes: {
        Row: {
          building_id: string | null
          floor_id: string | null
          id: string
          polygon: Json
          project_id: string
          unit_id: string | null
          updated_at: string
          view_id: string
        }
        Insert: {
          building_id?: string | null
          floor_id?: string | null
          id?: string
          polygon: Json
          project_id: string
          unit_id?: string | null
          updated_at?: string
          view_id: string
        }
        Update: {
          building_id?: string | null
          floor_id?: string | null
          id?: string
          polygon?: Json
          project_id?: string
          unit_id?: string | null
          updated_at?: string
          view_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_view_shapes_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_view_shapes_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "project_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_view_shapes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_view_shapes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "project_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_view_shapes_view_id_fkey"
            columns: ["view_id"]
            isOneToOne: false
            referencedRelation: "project_views"
            referencedColumns: ["id"]
          },
        ]
      }
      project_views: {
        Row: {
          building_id: string | null
          created_at: string
          id: string
          image_url: string
          kind: string
          label: string | null
          project_id: string
          sort: number
        }
        Insert: {
          building_id?: string | null
          created_at?: string
          id?: string
          image_url: string
          kind?: string
          label?: string | null
          project_id: string
          sort?: number
        }
        Update: {
          building_id?: string | null
          created_at?: string
          id?: string
          image_url?: string
          kind?: string
          label?: string | null
          project_id?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_views_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          demo_tour_id: string | null
          description: string | null
          description_en: string | null
          developer_name: string | null
          facade_url: string | null
          id: string
          lat: number | null
          lng: number | null
          move_in: string | null
          nearby: Json | null
          nearby_updated_at: string | null
          notify_sales: boolean
          published: boolean
          show_all_tabs: boolean
          slug: string
          title: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          demo_tour_id?: string | null
          description?: string | null
          description_en?: string | null
          developer_name?: string | null
          facade_url?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          move_in?: string | null
          nearby?: Json | null
          nearby_updated_at?: string | null
          notify_sales?: boolean
          published?: boolean
          show_all_tabs?: boolean
          slug: string
          title: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          demo_tour_id?: string | null
          description?: string | null
          description_en?: string | null
          developer_name?: string | null
          facade_url?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          move_in?: string | null
          nearby?: Json | null
          nearby_updated_at?: string | null
          notify_sales?: boolean
          published?: boolean
          show_all_tabs?: boolean
          slug?: string
          title?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_demo_tour_id_fkey"
            columns: ["demo_tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
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
          panorama_url_mobile: string | null
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
          panorama_url_mobile?: string | null
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
          panorama_url_mobile?: string | null
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
          deposit: string | null
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
          nadir_logo: boolean
          panorama_url: string | null
          parking: string | null
          price: number | null
          property_type: string | null
          published: boolean
          registration: string | null
          slug: string
          status: string
          structure: string | null
          target_languages: string | null
          terrace: string | null
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
          deposit?: string | null
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
          nadir_logo?: boolean
          panorama_url?: string | null
          parking?: string | null
          price?: number | null
          property_type?: string | null
          published?: boolean
          registration?: string | null
          slug: string
          status?: string
          structure?: string | null
          target_languages?: string | null
          terrace?: string | null
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
          deposit?: string | null
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
          nadir_logo?: boolean
          panorama_url?: string | null
          parking?: string | null
          price?: number | null
          property_type?: string | null
          published?: boolean
          registration?: string | null
          slug?: string
          status?: string
          structure?: string | null
          target_languages?: string | null
          terrace?: string | null
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
