export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WaitlistStatus = 'pending' | 'contacted' | 'not_interested' | 'converted';
export type AssignmentStatus = 'queued' | 'active' | 'completed' | 'dropped';
export type DealerStatus = 'prospect' | 'active' | 'inactive';
export type TeamRole = 'founder' | 'ops' | 'sales' | 'support';
export type SignupEventType = 'status_change' | 'note' | 'contact_attempt' | 'dealer_match';

export interface Database {
  public: {
    Tables: {
      waitlist_signups: {
        Row: {
          id: string;
          email: string;
          location: string | null;
          brief: string;
          source: string;
          status: WaitlistStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          location?: string | null;
          brief: string;
          source?: string;
          status?: WaitlistStatus;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          location?: string | null;
          brief?: string;
          source?: string;
          status?: WaitlistStatus;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      pilot_markets: {
        Row: {
          id: string;
          slug: string;
          name: string;
          state: string | null;
          timezone: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          state?: string | null;
          timezone?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          state?: string | null;
          timezone?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dealers: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          market_id: string | null;
          status: DealerStatus;
          website: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          market_id?: string | null;
          status?: DealerStatus;
          website?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          legal_name?: string | null;
          market_id?: string | null;
          status?: DealerStatus;
          website?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dealers_market_id_fkey';
            columns: ['market_id'];
            referencedRelation: 'pilot_markets';
            referencedColumns: ['id'];
          }
        ];
      };
      dealer_contacts: {
        Row: {
          id: string;
          dealer_id: string;
          full_name: string;
          title: string | null;
          email: string | null;
          phone: string | null;
          is_primary: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dealer_id: string;
          full_name: string;
          title?: string | null;
          email?: string | null;
          phone?: string | null;
          is_primary?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dealer_id?: string;
          full_name?: string;
          title?: string | null;
          email?: string | null;
          phone?: string | null;
          is_primary?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dealer_contacts_dealer_id_fkey';
            columns: ['dealer_id'];
            referencedRelation: 'dealers';
            referencedColumns: ['id'];
          }
        ];
      };
      team_members: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: TeamRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          role?: TeamRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: TeamRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      signup_assignments: {
        Row: {
          id: string;
          signup_id: string;
          team_member_id: string | null;
          status: AssignmentStatus;
          priority: number;
          assigned_at: string;
          accepted_at: string | null;
          released_at: string | null;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          signup_id: string;
          team_member_id?: string | null;
          status?: AssignmentStatus;
          priority?: number;
          assigned_at?: string;
          accepted_at?: string | null;
          released_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          signup_id?: string;
          team_member_id?: string | null;
          status?: AssignmentStatus;
          priority?: number;
          assigned_at?: string;
          accepted_at?: string | null;
          released_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'signup_assignments_signup_id_fkey';
            columns: ['signup_id'];
            referencedRelation: 'waitlist_signups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signup_assignments_team_member_id_fkey';
            columns: ['team_member_id'];
            referencedRelation: 'team_members';
            referencedColumns: ['id'];
          }
        ];
      };
      signup_events: {
        Row: {
          id: string;
          signup_id: string;
          event_type: SignupEventType;
          payload: Json | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          signup_id: string;
          event_type: SignupEventType;
          payload?: Json | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          signup_id?: string;
          event_type?: SignupEventType;
          payload?: Json | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'signup_events_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'team_members';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signup_events_signup_id_fkey';
            columns: ['signup_id'];
            referencedRelation: 'waitlist_signups';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      waitlist_status: WaitlistStatus;
      assignment_status: AssignmentStatus;
      dealer_status: DealerStatus;
      team_role: TeamRole;
      signup_event_type: SignupEventType;
    };
    CompositeTypes: {};
  };
}
