export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      orders: {
        Row: {
          created_at: string;
          delivered_at: string | null;
          game_id: string;
          game_name: string;
          id: string;
          notes: string | null;
          package_amt: string;
          paid_at: string | null;
          payment: string;
          payment_expires_at: string | null;
          payment_hash: string | null;
          payment_md5: string | null;
          payment_qr: string | null;
          player_id: string;
          player_name: string | null;
          player_zone: string | null;
          price_usd: number;
          status: string;
          supplier_order_id: string | null;
          supplier_status: string | null;
          updated_at: string;
          user_email: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          delivered_at?: string | null;
          game_id: string;
          game_name: string;
          id?: string;
          notes?: string | null;
          package_amt: string;
          paid_at?: string | null;
          payment?: string;
          payment_expires_at?: string | null;
          payment_hash?: string | null;
          payment_md5?: string | null;
          payment_qr?: string | null;
          player_id: string;
          player_name?: string | null;
          player_zone?: string | null;
          price_usd: number;
          status?: string;
          supplier_order_id?: string | null;
          supplier_status?: string | null;
          updated_at?: string;
          user_email: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          delivered_at?: string | null;
          game_id?: string;
          game_name?: string;
          id?: string;
          notes?: string | null;
          package_amt?: string;
          paid_at?: string | null;
          payment?: string;
          payment_expires_at?: string | null;
          payment_hash?: string | null;
          payment_md5?: string | null;
          payment_qr?: string | null;
          player_id?: string;
          player_name?: string | null;
          player_zone?: string | null;
          price_usd?: number;
          status?: string;
          supplier_order_id?: string | null;
          supplier_status?: string | null;
          updated_at?: string;
          user_email?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      package_offers: {
        Row: {
          fazer_offer: string;
          game_id: string;
          package_amt: string;
          updated_at: string;
        };
        Insert: {
          fazer_offer: string;
          game_id: string;
          package_amt: string;
          updated_at?: string;
        };
        Update: {
          fazer_offer?: string;
          game_id?: string;
          package_amt?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_prices: {
        Row: {
          active: boolean;
          game_id: string;
          game_name: string;
          package_amt: string;
          price_usd: number;
        };
        Insert: {
          active?: boolean;
          game_id: string;
          game_name: string;
          package_amt: string;
          price_usd: number;
        };
        Update: {
          active?: boolean;
          game_id?: string;
          game_name?: string;
          package_amt?: string;
          price_usd?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string;
          id: string;
          telegram: string | null;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email: string;
          id: string;
          telegram?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string;
          id?: string;
          telegram?: string | null;
        };
        Relationships: [];
      };
      site_images: {
        Row: {
          slot: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          slot: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          slot?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          hidden_games: string[];
          id: number;
          sales_open: boolean;
          updated_at: string;
        };
        Insert: {
          hidden_games?: string[];
          id?: number;
          sales_open?: boolean;
          updated_at?: string;
        };
        Update: {
          hidden_games?: string[];
          id?: number;
          sales_open?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      supplier_offers: {
        Row: {
          game_id: string;
          gamesdrop_offer_id: number;
          package_amt: string;
          updated_at: string;
        };
        Insert: {
          game_id: string;
          gamesdrop_offer_id: number;
          package_amt: string;
          updated_at?: string;
        };
        Update: {
          game_id?: string;
          gamesdrop_offer_id?: number;
          package_amt?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
