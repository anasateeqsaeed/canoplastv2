export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounting_doc_counters: {
        Row: {
          last_no: number
          voucher_type: string
          year_label: string
        }
        Insert: {
          last_no?: number
          voucher_type: string
          year_label: string
        }
        Update: {
          last_no?: number
          voucher_type?: string
          year_label?: string
        }
        Relationships: []
      }
      accounting_periods: {
        Row: {
          end_date: string
          fiscal_year_id: string
          id: string
          name: string
          period_no: number
          start_date: string
          status: string
        }
        Insert: {
          end_date: string
          fiscal_year_id: string
          id?: string
          name: string
          period_no: number
          start_date: string
          status?: string
        }
        Update: {
          end_date?: string
          fiscal_year_id?: string
          id?: string
          name?: string
          period_no?: number
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_recoveries: {
        Row: {
          advance_transaction_id: string
          amount: number
          created_at: string
          created_by: string | null
          id: string
          operator_id: string
          recovery_date: string
          recovery_method: string
          remarks: string | null
          updated_at: string
        }
        Insert: {
          advance_transaction_id: string
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          operator_id: string
          recovery_date?: string
          recovery_method?: string
          remarks?: string | null
          updated_at?: string
        }
        Update: {
          advance_transaction_id?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          operator_id?: string
          recovery_date?: string
          recovery_method?: string
          remarks?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_recoveries_advance_transaction_id_fkey"
            columns: ["advance_transaction_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_recoveries_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_bill_lines: {
        Row: {
          account_id: string
          amount: number
          bill_id: string
          description: string | null
          id: string
        }
        Insert: {
          account_id: string
          amount: number
          bill_id: string
          description?: string | null
          id?: string
        }
        Update: {
          account_id?: string
          amount?: number
          bill_id?: string
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ap_bill_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_bill_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "ap_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_bills: {
        Row: {
          amount_paid: number
          bill_date: string
          bill_number: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          narration: string | null
          payment_status: string
          po_id: string | null
          status: string
          subtotal: number
          supplier_id: string
          tax_amount: number
          total_amount: number
          updated_at: string
          vendor_bill_no: string | null
          voucher_id: string | null
        }
        Insert: {
          amount_paid?: number
          bill_date: string
          bill_number: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          narration?: string | null
          payment_status?: string
          po_id?: string | null
          status?: string
          subtotal?: number
          supplier_id: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          vendor_bill_no?: string | null
          voucher_id?: string | null
        }
        Update: {
          amount_paid?: number
          bill_date?: string
          bill_number?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          narration?: string | null
          payment_status?: string
          po_id?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          vendor_bill_no?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_bills_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_bills_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_payment_allocations: {
        Row: {
          amount: number
          bill_id: string
          id: string
          payment_id: string
        }
        Insert: {
          amount: number
          bill_id: string
          id?: string
          payment_id: string
        }
        Update: {
          amount?: number
          bill_id?: string
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ap_payment_allocations_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "ap_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "ap_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          cheque_date: string | null
          cheque_number: string | null
          cheque_status: string | null
          created_at: string
          created_by: string | null
          id: string
          mode: string
          notes: string | null
          payment_date: string
          payment_number: string
          reference: string | null
          supplier_id: string
          voucher_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          cheque_status?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mode: string
          notes?: string | null
          payment_date: string
          payment_number: string
          reference?: string | null
          supplier_id: string
          voucher_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          cheque_status?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          notes?: string | null
          payment_date?: string
          payment_number?: string
          reference?: string | null
          supplier_id?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payments_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_receipt_allocations: {
        Row: {
          amount: number
          id: string
          invoice_id: string
          receipt_id: string
        }
        Insert: {
          amount: number
          id?: string
          invoice_id: string
          receipt_id: string
        }
        Update: {
          amount?: number
          id?: string
          invoice_id?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_receipt_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "ar_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_receipts: {
        Row: {
          amount: number
          bank_account_id: string | null
          cheque_date: string | null
          cheque_number: string | null
          cheque_status: string | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          mode: string
          notes: string | null
          receipt_date: string
          receipt_number: string
          reference: string | null
          voucher_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          cheque_status?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          mode: string
          notes?: string | null
          receipt_date: string
          receipt_number: string
          reference?: string | null
          voucher_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          cheque_status?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          notes?: string | null
          receipt_date?: string
          receipt_number?: string
          reference?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_receipts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_receipts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_receipts_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_disassembly_lots: {
        Row: {
          created_at: string
          failed_qty: number
          id: string
          inspection_lot_id: string
          pending_qty: number
          product_id: string
          regrind_kg: number
          remarks: string | null
          reuse_qty: number
          separated_at: string | null
          separated_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_qty?: number
          id?: string
          inspection_lot_id: string
          pending_qty?: number
          product_id: string
          regrind_kg?: number
          remarks?: string | null
          reuse_qty?: number
          separated_at?: string | null
          separated_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_qty?: number
          id?: string
          inspection_lot_id?: string
          pending_qty?: number
          product_id?: string
          regrind_kg?: number
          remarks?: string | null
          reuse_qty?: number
          separated_at?: string | null
          separated_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_disassembly_lots_inspection_lot_id_fkey"
            columns: ["inspection_lot_id"]
            isOneToOne: false
            referencedRelation: "assembly_inspection_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_disassembly_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_disassembly_reuse_items: {
        Row: {
          component_product_id: string
          created_at: string
          disassembly_lot_id: string
          id: string
          qty_returned: number
        }
        Insert: {
          component_product_id: string
          created_at?: string
          disassembly_lot_id: string
          id?: string
          qty_returned?: number
        }
        Update: {
          component_product_id?: string
          created_at?: string
          disassembly_lot_id?: string
          id?: string
          qty_returned?: number
        }
        Relationships: [
          {
            foreignKeyName: "assembly_disassembly_reuse_items_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_disassembly_reuse_items_disassembly_lot_id_fkey"
            columns: ["disassembly_lot_id"]
            isOneToOne: false
            referencedRelation: "assembly_disassembly_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_inspection_lots: {
        Row: {
          assembled_qty: number
          assembly_production_id: string | null
          created_at: string
          failed_qty: number
          id: string
          inspected_by: string | null
          inspection_done_at: string | null
          inspector_name: string | null
          job_id: string | null
          passed_qty: number
          product_id: string
          production_date: string
          remarks: string | null
          shift: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assembled_qty?: number
          assembly_production_id?: string | null
          created_at?: string
          failed_qty?: number
          id?: string
          inspected_by?: string | null
          inspection_done_at?: string | null
          inspector_name?: string | null
          job_id?: string | null
          passed_qty?: number
          product_id: string
          production_date: string
          remarks?: string | null
          shift?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assembled_qty?: number
          assembly_production_id?: string | null
          created_at?: string
          failed_qty?: number
          id?: string
          inspected_by?: string | null
          inspection_done_at?: string | null
          inspector_name?: string | null
          job_id?: string | null
          passed_qty?: number
          product_id?: string
          production_date?: string
          remarks?: string | null
          shift?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_inspection_lots_assembly_production_id_fkey"
            columns: ["assembly_production_id"]
            isOneToOne: false
            referencedRelation: "assembly_production"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_inspection_lots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_inspection_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_job_components: {
        Row: {
          component_product_id: string
          created_at: string
          id: string
          is_available: boolean | null
          job_id: string
          required_qty_per_assembly: number
          reserved_qty: number | null
          source_type: string
          updated_at: string
        }
        Insert: {
          component_product_id: string
          created_at?: string
          id?: string
          is_available?: boolean | null
          job_id: string
          required_qty_per_assembly?: number
          reserved_qty?: number | null
          source_type?: string
          updated_at?: string
        }
        Update: {
          component_product_id?: string
          created_at?: string
          id?: string
          is_available?: boolean | null
          job_id?: string
          required_qty_per_assembly?: number
          reserved_qty?: number | null
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_job_components_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_job_components_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_overhead_rates: {
        Row: {
          amount_per_set: number
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          notes: string | null
          rate_type: string
        }
        Insert: {
          amount_per_set: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          notes?: string | null
          rate_type: string
        }
        Update: {
          amount_per_set?: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          notes?: string | null
          rate_type?: string
        }
        Relationships: []
      }
      assembly_production: {
        Row: {
          assembled_qty: number
          components_consumed: Json | null
          created_at: string
          created_by: string | null
          entry_time: string | null
          hold_qty: number
          hour_slot: number
          id: string
          is_machine_stopped: boolean | null
          job_id: string | null
          labour_cost_per_set: number | null
          machine_id: string
          material_cost_per_set: number | null
          ok_qty: number
          operator_name: string | null
          operator_type: string | null
          overhead_cost_per_set: number | null
          production_date: string
          production_lot_id: string | null
          regrind_qty: number
          rejection_qty: number
          remarks: string | null
          shift: string | null
          stop_duration_mins: number | null
          stop_reason_id: string | null
          stop_remarks: string | null
          total_cost_per_set: number | null
          updated_at: string
        }
        Insert: {
          assembled_qty?: number
          components_consumed?: Json | null
          created_at?: string
          created_by?: string | null
          entry_time?: string | null
          hold_qty?: number
          hour_slot: number
          id?: string
          is_machine_stopped?: boolean | null
          job_id?: string | null
          labour_cost_per_set?: number | null
          machine_id: string
          material_cost_per_set?: number | null
          ok_qty?: number
          operator_name?: string | null
          operator_type?: string | null
          overhead_cost_per_set?: number | null
          production_date?: string
          production_lot_id?: string | null
          regrind_qty?: number
          rejection_qty?: number
          remarks?: string | null
          shift?: string | null
          stop_duration_mins?: number | null
          stop_reason_id?: string | null
          stop_remarks?: string | null
          total_cost_per_set?: number | null
          updated_at?: string
        }
        Update: {
          assembled_qty?: number
          components_consumed?: Json | null
          created_at?: string
          created_by?: string | null
          entry_time?: string | null
          hold_qty?: number
          hour_slot?: number
          id?: string
          is_machine_stopped?: boolean | null
          job_id?: string | null
          labour_cost_per_set?: number | null
          machine_id?: string
          material_cost_per_set?: number | null
          ok_qty?: number
          operator_name?: string | null
          operator_type?: string | null
          overhead_cost_per_set?: number | null
          production_date?: string
          production_lot_id?: string | null
          regrind_qty?: number
          rejection_qty?: number
          remarks?: string | null
          shift?: string | null
          stop_duration_mins?: number | null
          stop_reason_id?: string | null
          stop_remarks?: string | null
          total_cost_per_set?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_production_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_production_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_production_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_production_stop_reason_id_fkey"
            columns: ["stop_reason_id"]
            isOneToOne: false
            referencedRelation: "stop_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_edit_reasons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      attendance_record_edits: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_data: Json | null
          attendance_date: string
          attendance_record_id: string | null
          before_data: Json | null
          changed_at: string
          edit_reason: string | null
          edit_reason_code: string | null
          id: string
          person_id: string
          person_type: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          attendance_date: string
          attendance_record_id?: string | null
          before_data?: Json | null
          changed_at?: string
          edit_reason?: string | null
          edit_reason_code?: string | null
          id?: string
          person_id: string
          person_type: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          attendance_date?: string
          attendance_record_id?: string | null
          before_data?: Json | null
          changed_at?: string
          edit_reason?: string | null
          edit_reason_code?: string | null
          id?: string
          person_id?: string
          person_type?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_out: string | null
          edit_reason: string | null
          edit_reason_code: string | null
          hours_worked: number | null
          id: string
          marked_at: string
          marked_by: string | null
          person_id: string
          person_type: string
          remarks: string | null
          shift: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attendance_date: string
          check_in?: string | null
          check_out?: string | null
          edit_reason?: string | null
          edit_reason_code?: string | null
          hours_worked?: number | null
          id?: string
          marked_at?: string
          marked_by?: string | null
          person_id: string
          person_type: string
          remarks?: string | null
          shift?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          edit_reason?: string | null
          edit_reason_code?: string | null
          hours_worked?: number | null
          id?: string
          marked_at?: string
          marked_by?: string | null
          person_id?: string
          person_type?: string
          remarks?: string | null
          shift?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          bank_name: string | null
          coa_account_id: string
          created_at: string
          iban: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          coa_account_id: string
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          coa_account_id?: string
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_coa_account_id_fkey"
            columns: ["coa_account_id"]
            isOneToOne: true
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_group: boolean
          name: string
          parent_id: string | null
          system_key: string | null
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_group?: boolean
          name: string
          parent_id?: string | null
          system_key?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_group?: boolean
          name?: string
          parent_id?: string | null
          system_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_assignments: {
        Row: {
          assigned_by: string | null
          assigned_to: string
          created_at: string
          due_day_of_month: number | null
          due_day_of_week: number | null
          due_time: string | null
          equipment_type_id: string
          equipment_unit_id: string | null
          frequency: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to: string
          created_at?: string
          due_day_of_month?: number | null
          due_day_of_week?: number | null
          due_time?: string | null
          equipment_type_id: string
          equipment_unit_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string
          created_at?: string
          due_day_of_month?: number | null
          due_day_of_week?: number | null
          due_time?: string | null
          equipment_type_id?: string
          equipment_unit_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_assignments_equipment_type_id_fkey"
            columns: ["equipment_type_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_assignments_equipment_unit_id_fkey"
            columns: ["equipment_unit_id"]
            isOneToOne: false
            referencedRelation: "equipment_units"
            referencedColumns: ["id"]
          },
        ]
      }
      client_consignees: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_consignees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
          default_tax_percent: number | null
          email: string | null
          gst_number: string | null
          id: string
          is_active: boolean | null
          name: string
          payment_terms: number | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          default_tax_percent?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          payment_terms?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          default_tax_percent?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          payment_terms?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      component_hold_lots: {
        Row: {
          created_at: string | null
          held_by: string | null
          hold_date: string
          hold_qty: number
          id: string
          issue_description: string | null
          issue_type_id: string | null
          lot_number: string
          product_id: string
          release_remarks: string | null
          released_at: string | null
          released_by: string | null
          released_qty: number
          scrapped_qty: number
          source_reference: string | null
          source_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          held_by?: string | null
          hold_date?: string
          hold_qty?: number
          id?: string
          issue_description?: string | null
          issue_type_id?: string | null
          lot_number: string
          product_id: string
          release_remarks?: string | null
          released_at?: string | null
          released_by?: string | null
          released_qty?: number
          scrapped_qty?: number
          source_reference?: string | null
          source_type?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          held_by?: string | null
          hold_date?: string
          hold_qty?: number
          id?: string
          issue_description?: string | null
          issue_type_id?: string | null
          lot_number?: string
          product_id?: string
          release_remarks?: string | null
          released_at?: string | null
          released_by?: string | null
          released_qty?: number
          scrapped_qty?: number
          source_reference?: string | null
          source_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      component_stock: {
        Row: {
          created_at: string
          current_stock: number
          id: string
          last_transaction_date: string | null
          location: string | null
          min_stock_level: number | null
          product_id: string
          reserved_stock: number
          source_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          id?: string
          last_transaction_date?: string | null
          location?: string | null
          min_stock_level?: number | null
          product_id: string
          reserved_stock?: number
          source_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          id?: string
          last_transaction_date?: string | null
          location?: string | null
          min_stock_level?: number | null
          product_id?: string
          reserved_stock?: number
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      compound_dispatches: {
        Row: {
          created_at: string | null
          dispatch_date: string
          dispatch_number: string
          dispatched_at: string | null
          dispatched_by: string | null
          id: string
          mixing_batch_id: string | null
          quantity_kg: number
          received_at: string | null
          received_by: string | null
          remarks: string | null
          returned_qty_kg: number | null
          shift: string | null
          status: string
          target_department: string | null
          target_job_id: string | null
          target_machine_id: string | null
          updated_at: string | null
          used_qty_kg: number | null
        }
        Insert: {
          created_at?: string | null
          dispatch_date?: string
          dispatch_number: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          mixing_batch_id?: string | null
          quantity_kg?: number
          received_at?: string | null
          received_by?: string | null
          remarks?: string | null
          returned_qty_kg?: number | null
          shift?: string | null
          status?: string
          target_department?: string | null
          target_job_id?: string | null
          target_machine_id?: string | null
          updated_at?: string | null
          used_qty_kg?: number | null
        }
        Update: {
          created_at?: string | null
          dispatch_date?: string
          dispatch_number?: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          mixing_batch_id?: string | null
          quantity_kg?: number
          received_at?: string | null
          received_by?: string | null
          remarks?: string | null
          returned_qty_kg?: number | null
          shift?: string | null
          status?: string
          target_department?: string | null
          target_job_id?: string | null
          target_machine_id?: string | null
          updated_at?: string | null
          used_qty_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compound_dispatches_mixing_batch_id_fkey"
            columns: ["mixing_batch_id"]
            isOneToOne: false
            referencedRelation: "mixing_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compound_dispatches_target_job_id_fkey"
            columns: ["target_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compound_dispatches_target_machine_id_fkey"
            columns: ["target_machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_payments: {
        Row: {
          adjustments: number
          calculated_amount: number
          contractor_id: string
          created_at: string
          final_amount: number
          id: string
          paid_date: string | null
          period_end: string
          period_start: string
          remarks: string | null
          status: string
          total_ok_qty: number
          total_rejection_qty: number
          updated_at: string
        }
        Insert: {
          adjustments?: number
          calculated_amount?: number
          contractor_id: string
          created_at?: string
          final_amount?: number
          id?: string
          paid_date?: string | null
          period_end: string
          period_start: string
          remarks?: string | null
          status?: string
          total_ok_qty?: number
          total_rejection_qty?: number
          updated_at?: string
        }
        Update: {
          adjustments?: number
          calculated_amount?: number
          contractor_id?: string
          created_at?: string
          final_amount?: number
          id?: string
          paid_date?: string | null
          period_end?: string
          period_start?: string
          remarks?: string | null
          status?: string
          total_ok_qty?: number
          total_rejection_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_payments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "department_contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      costing_rates: {
        Row: {
          default_margin_pct: number
          default_scrap_pct: number
          foh_rate_per_machine_hour: number
          helper_rate_per_hour: number
          id: string
          is_active: boolean
          labour_rate_per_hour: number
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_margin_pct?: number
          default_scrap_pct?: number
          foh_rate_per_machine_hour?: number
          helper_rate_per_hour?: number
          id?: string
          is_active?: boolean
          labour_rate_per_hour?: number
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_margin_pct?: number
          default_scrap_pct?: number
          foh_rate_per_machine_hour?: number
          helper_rate_per_hour?: number
          id?: string
          is_active?: boolean
          labour_rate_per_hour?: number
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      crusher_machines: {
        Row: {
          capacity_kg_per_hour: number | null
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          machine_code: string
          machine_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          capacity_kg_per_hour?: number | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          machine_code: string
          machine_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity_kg_per_hour?: number | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          machine_code?: string
          machine_name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crusher_machines_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      crushing_daily_summary: {
        Row: {
          created_at: string | null
          crusher_id: string
          efficiency_percent: number | null
          id: string
          kg_per_hour_actual: number | null
          operating_hours: number | null
          operator_name: string | null
          remarks: string | null
          shift: string | null
          summary_date: string
          total_input_kg: number | null
          total_loss_kg: number | null
          total_output_kg: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          crusher_id: string
          efficiency_percent?: number | null
          id?: string
          kg_per_hour_actual?: number | null
          operating_hours?: number | null
          operator_name?: string | null
          remarks?: string | null
          shift?: string | null
          summary_date?: string
          total_input_kg?: number | null
          total_loss_kg?: number | null
          total_output_kg?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          crusher_id?: string
          efficiency_percent?: number | null
          id?: string
          kg_per_hour_actual?: number | null
          operating_hours?: number | null
          operator_name?: string | null
          remarks?: string | null
          shift?: string | null
          summary_date?: string
          total_input_kg?: number | null
          total_loss_kg?: number | null
          total_output_kg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crushing_daily_summary_crusher_id_fkey"
            columns: ["crusher_id"]
            isOneToOne: false
            referencedRelation: "crusher_machines"
            referencedColumns: ["id"]
          },
        ]
      }
      crushing_entries: {
        Row: {
          created_at: string | null
          crusher_id: string
          end_time: string | null
          entry_date: string
          hour_slot: number
          id: string
          input_qty_kg: number
          loss_kg: number | null
          operator_name: string | null
          output_client_id: string | null
          output_destination: string | null
          output_qty_kg: number
          quality_grade: string | null
          remarks: string | null
          shift: string | null
          source_client_id: string | null
          source_machine_ids: string[] | null
          source_product_ids: string[] | null
          source_type: string
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          crusher_id: string
          end_time?: string | null
          entry_date?: string
          hour_slot: number
          id?: string
          input_qty_kg?: number
          loss_kg?: number | null
          operator_name?: string | null
          output_client_id?: string | null
          output_destination?: string | null
          output_qty_kg?: number
          quality_grade?: string | null
          remarks?: string | null
          shift?: string | null
          source_client_id?: string | null
          source_machine_ids?: string[] | null
          source_product_ids?: string[] | null
          source_type?: string
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          crusher_id?: string
          end_time?: string | null
          entry_date?: string
          hour_slot?: number
          id?: string
          input_qty_kg?: number
          loss_kg?: number | null
          operator_name?: string | null
          output_client_id?: string | null
          output_destination?: string | null
          output_qty_kg?: number
          quality_grade?: string | null
          remarks?: string | null
          shift?: string | null
          source_client_id?: string | null
          source_machine_ids?: string[] | null
          source_product_ids?: string[] | null
          source_type?: string
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crushing_entries_crusher_id_fkey"
            columns: ["crusher_id"]
            isOneToOne: false
            referencedRelation: "crusher_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crushing_entries_output_client_id_fkey"
            columns: ["output_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crushing_entries_source_client_id_fkey"
            columns: ["source_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_checklist_assignments: {
        Row: {
          assigned_by: string | null
          assigned_to: string
          checklist_id: string
          created_at: string
          due_date: string | null
          due_day_of_month: number | null
          due_day_of_week: number | null
          due_time: string | null
          frequency: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to: string
          checklist_id: string
          created_at?: string
          due_date?: string | null
          due_day_of_month?: number | null
          due_day_of_week?: number | null
          due_time?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string
          checklist_id?: string
          created_at?: string
          due_date?: string | null
          due_day_of_month?: number | null
          due_day_of_week?: number | null
          due_time?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_checklist_assignments_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "custom_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_checklist_submissions: {
        Row: {
          assignment_id: string
          id: string
          remarks: string | null
          responses: Json
          submission_date: string
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          assignment_id: string
          id?: string
          remarks?: string | null
          responses?: Json
          submission_date?: string
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          assignment_id?: string
          id?: string
          remarks?: string | null
          responses?: Json
          submission_date?: string
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_checklist_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "custom_checklist_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_checklists: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          items: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_status_update: boolean
          can_view: boolean
          created_at: string
          custom_role_id: string
          id: string
          module: string
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_status_update?: boolean
          can_view?: boolean
          created_at?: string
          custom_role_id: string
          id?: string
          module: string
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_status_update?: boolean
          can_view?: boolean
          created_at?: string
          custom_role_id?: string
          id?: string
          module?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_role_permissions_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          code: string
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_material_ledger: {
        Row: {
          balance_after: number
          client_id: string
          created_at: string
          created_by: string | null
          deficit_applied: boolean | null
          id: string
          material_id: string | null
          material_lot_id: string | null
          product_id: string | null
          production_lot_id: string | null
          quantity_kg: number
          reference_id: string | null
          reference_type: string | null
          regrind_kg: number | null
          remarks: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          balance_after?: number
          client_id: string
          created_at?: string
          created_by?: string | null
          deficit_applied?: boolean | null
          id?: string
          material_id?: string | null
          material_lot_id?: string | null
          product_id?: string | null
          production_lot_id?: string | null
          quantity_kg?: number
          reference_id?: string | null
          reference_type?: string | null
          regrind_kg?: number | null
          remarks?: string | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          balance_after?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          deficit_applied?: boolean | null
          id?: string
          material_id?: string | null
          material_lot_id?: string | null
          product_id?: string | null
          production_lot_id?: string | null
          quantity_kg?: number
          reference_id?: string | null
          reference_type?: string | null
          regrind_kg?: number | null
          remarks?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_material_ledger_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_material_ledger_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_material_ledger_material_lot_id_fkey"
            columns: ["material_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_material_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_material_ledger_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_material_stages: {
        Row: {
          client_id: string
          created_at: string
          grade: string | null
          id: string
          material_lot_id: string | null
          product_id: string | null
          quantity_kg: number
          reference_id: string
          reference_type: string
          remarks: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          grade?: string | null
          id?: string
          material_lot_id?: string | null
          product_id?: string | null
          quantity_kg?: number
          reference_id: string
          reference_type: string
          remarks?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          grade?: string | null
          id?: string
          material_lot_id?: string | null
          product_id?: string | null
          quantity_kg?: number
          reference_id?: string
          reference_type?: string
          remarks?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_material_stages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_material_stages_material_lot_id_fkey"
            columns: ["material_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_material_stages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_material_waste: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          id: string
          reason: string | null
          remarks: string | null
          reported_by: string | null
          reported_date: string
          source_lot_id: string | null
          source_reference_id: string | null
          source_stage: string
          status: string
          updated_at: string
          waste_qty_kg: number
          waste_type: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          reason?: string | null
          remarks?: string | null
          reported_by?: string | null
          reported_date?: string
          source_lot_id?: string | null
          source_reference_id?: string | null
          source_stage?: string
          status?: string
          updated_at?: string
          waste_qty_kg?: number
          waste_type?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          remarks?: string | null
          reported_by?: string | null
          reported_date?: string
          source_lot_id?: string | null
          source_reference_id?: string | null
          source_stage?: string
          status?: string
          updated_at?: string
          waste_qty_kg?: number
          waste_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_material_waste_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_material_waste_source_lot_id_fkey"
            columns: ["source_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_check_readings: {
        Row: {
          created_at: string | null
          daily_check_id: string
          id: string
          numeric_value: number | null
          parameter_id: string
          remarks: string | null
          status: string
          text_value: string | null
        }
        Insert: {
          created_at?: string | null
          daily_check_id: string
          id?: string
          numeric_value?: number | null
          parameter_id: string
          remarks?: string | null
          status?: string
          text_value?: string | null
        }
        Update: {
          created_at?: string | null
          daily_check_id?: string
          id?: string
          numeric_value?: number | null
          parameter_id?: string
          remarks?: string | null
          status?: string
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_check_readings_daily_check_id_fkey"
            columns: ["daily_check_id"]
            isOneToOne: false
            referencedRelation: "daily_equipment_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_check_readings_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "equipment_check_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_consumption_log: {
        Row: {
          created_at: string
          daily_log_id: string
          id: string
          material_id: string
          qty_consumed_kg: number
          ratio_percent: number | null
        }
        Insert: {
          created_at?: string
          daily_log_id: string
          id?: string
          material_id: string
          qty_consumed_kg?: number
          ratio_percent?: number | null
        }
        Update: {
          created_at?: string
          daily_log_id?: string
          id?: string
          material_id?: string
          qty_consumed_kg?: number
          ratio_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_consumption_log_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_production_log"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_equipment_checks: {
        Row: {
          check_date: string
          check_time: string | null
          checked_by: string | null
          created_at: string | null
          equipment_type_id: string
          equipment_unit_id: string | null
          general_remarks: string | null
          has_critical: boolean | null
          has_warnings: boolean | null
          id: string
          shift: string
        }
        Insert: {
          check_date?: string
          check_time?: string | null
          checked_by?: string | null
          created_at?: string | null
          equipment_type_id: string
          equipment_unit_id?: string | null
          general_remarks?: string | null
          has_critical?: boolean | null
          has_warnings?: boolean | null
          id?: string
          shift?: string
        }
        Update: {
          check_date?: string
          check_time?: string | null
          checked_by?: string | null
          created_at?: string | null
          equipment_type_id?: string
          equipment_unit_id?: string | null
          general_remarks?: string | null
          has_critical?: boolean | null
          has_warnings?: boolean | null
          id?: string
          shift?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_equipment_checks_equipment_type_id_fkey"
            columns: ["equipment_type_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_equipment_checks_equipment_unit_id_fkey"
            columns: ["equipment_unit_id"]
            isOneToOne: false
            referencedRelation: "equipment_units"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_production_log: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          final_hold: number
          final_ok: number
          final_regrind_kg: number
          final_reject_kg: number
          finalised_at: string | null
          finalised_by: string | null
          hold_reason: string | null
          id: string
          job_id: string | null
          machine_id: string
          override_reason: string | null
          product_id: string | null
          production_date: string
          remarks: string | null
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          shift: string
          status: string
          suggested_consumption_kg: number
          suggested_hold: number
          suggested_ok: number
          suggested_regrind_kg: number
          suggested_reject_kg: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          final_hold?: number
          final_ok?: number
          final_regrind_kg?: number
          final_reject_kg?: number
          finalised_at?: string | null
          finalised_by?: string | null
          hold_reason?: string | null
          id?: string
          job_id?: string | null
          machine_id: string
          override_reason?: string | null
          product_id?: string | null
          production_date: string
          remarks?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          shift: string
          status?: string
          suggested_consumption_kg?: number
          suggested_hold?: number
          suggested_ok?: number
          suggested_regrind_kg?: number
          suggested_reject_kg?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          final_hold?: number
          final_ok?: number
          final_regrind_kg?: number
          final_reject_kg?: number
          finalised_at?: string | null
          finalised_by?: string | null
          hold_reason?: string | null
          id?: string
          job_id?: string | null
          machine_id?: string
          override_reason?: string | null
          product_id?: string | null
          production_date?: string
          remarks?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          shift?: string
          status?: string
          suggested_consumption_kg?: number
          suggested_hold?: number
          suggested_ok?: number
          suggested_regrind_kg?: number
          suggested_reject_kg?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_production_log_audit: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          log_id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          log_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          log_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_production_log_audit_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "daily_production_log"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_terms: {
        Row: {
          created_at: string
          delivery_cost_per_kg: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          packing_cost_per_kg: number
        }
        Insert: {
          created_at?: string
          delivery_cost_per_kg?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          packing_cost_per_kg?: number
        }
        Update: {
          created_at?: string
          delivery_cost_per_kg?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          packing_cost_per_kg?: number
        }
        Relationships: []
      }
      department_contractors: {
        Row: {
          contract_end_date: string | null
          contract_start_date: string
          created_at: string
          department_id: string | null
          fixed_target_amount: number
          id: string
          is_active: boolean
          monthly_target_qty: number
          name: string
          notes: string | null
          phone: string | null
          rate_per_piece: number
          updated_at: string
        }
        Insert: {
          contract_end_date?: string | null
          contract_start_date?: string
          created_at?: string
          department_id?: string | null
          fixed_target_amount?: number
          id?: string
          is_active?: boolean
          monthly_target_qty?: number
          name: string
          notes?: string | null
          phone?: string | null
          rate_per_piece?: number
          updated_at?: string
        }
        Update: {
          contract_end_date?: string | null
          contract_start_date?: string
          created_at?: string
          department_id?: string | null
          fixed_target_amount?: number
          id?: string
          is_active?: boolean
          monthly_target_qty?: number
          name?: string
          notes?: string | null
          phone?: string | null
          rate_per_piece?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_contractors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dispatch_items: {
        Row: {
          agreed_labour_price: number | null
          agreed_price_unit: string | null
          agreed_selling_price: number | null
          agreed_weight_per_piece: number | null
          created_at: string
          dispatch_id: string
          id: string
          loose_qty: number
          num_packs: number
          packing_type_id: string | null
          product_id: string
          rate_source: string | null
          remarks: string | null
          total_qty: number
          weight_kg: number | null
        }
        Insert: {
          agreed_labour_price?: number | null
          agreed_price_unit?: string | null
          agreed_selling_price?: number | null
          agreed_weight_per_piece?: number | null
          created_at?: string
          dispatch_id: string
          id?: string
          loose_qty?: number
          num_packs?: number
          packing_type_id?: string | null
          product_id: string
          rate_source?: string | null
          remarks?: string | null
          total_qty?: number
          weight_kg?: number | null
        }
        Update: {
          agreed_labour_price?: number | null
          agreed_price_unit?: string | null
          agreed_selling_price?: number | null
          agreed_weight_per_piece?: number | null
          created_at?: string
          dispatch_id?: string
          id?: string
          loose_qty?: number
          num_packs?: number
          packing_type_id?: string | null
          product_id?: string
          rate_source?: string | null
          remarks?: string | null
          total_qty?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_items_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_items_packing_type_id_fkey"
            columns: ["packing_type_id"]
            isOneToOne: false
            referencedRelation: "packing_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_return_items: {
        Row: {
          created_at: string
          dispatch_item_id: string
          dispatch_return_id: string
          id: string
          remarks: string | null
          return_qty: number
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          dispatch_item_id: string
          dispatch_return_id: string
          id?: string
          remarks?: string | null
          return_qty?: number
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          dispatch_item_id?: string
          dispatch_return_id?: string
          id?: string
          remarks?: string | null
          return_qty?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_return_items_dispatch_item_id_fkey"
            columns: ["dispatch_item_id"]
            isOneToOne: false
            referencedRelation: "dispatch_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_return_items_dispatch_return_id_fkey"
            columns: ["dispatch_return_id"]
            isOneToOne: false
            referencedRelation: "dispatch_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_returns: {
        Row: {
          created_at: string
          dispatch_id: string
          id: string
          reason: string | null
          remarks: string | null
          return_date: string
          return_number: string
          returned_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispatch_id: string
          id?: string
          reason?: string | null
          remarks?: string | null
          return_date?: string
          return_number: string
          returned_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispatch_id?: string
          id?: string
          reason?: string | null
          remarks?: string | null
          return_date?: string
          return_number?: string
          returned_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_returns_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          client_id: string
          consignee_name: string | null
          created_at: string
          created_by: string | null
          dispatch_date: string
          dispatch_number: string
          dispatched_by: string | null
          driver_name: string | null
          driver_phone: string | null
          gate_pass_number: string | null
          id: string
          is_third_party: boolean
          remarks: string | null
          skip_auto_invoice: boolean
          status: string
          total_cartons: number
          total_pieces: number
          total_weight_kg: number
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          client_id: string
          consignee_name?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_date?: string
          dispatch_number: string
          dispatched_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          gate_pass_number?: string | null
          id?: string
          is_third_party?: boolean
          remarks?: string | null
          skip_auto_invoice?: boolean
          status?: string
          total_cartons?: number
          total_pieces?: number
          total_weight_kg?: number
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          client_id?: string
          consignee_name?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_date?: string
          dispatch_number?: string
          dispatched_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          gate_pass_number?: string | null
          id?: string
          is_third_party?: boolean
          remarks?: string | null
          skip_auto_invoice?: boolean
          status?: string
          total_cartons?: number
          total_pieces?: number
          total_weight_kg?: number
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_counters: {
        Row: {
          doc_type: string
          last_number: number
          prefix: string
          updated_at: string
        }
        Insert: {
          doc_type: string
          last_number?: number
          prefix: string
          updated_at?: string
        }
        Update: {
          doc_type?: string
          last_number?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: []
      }
      electricity_meters: {
        Row: {
          created_at: string
          department: string | null
          display_order: number
          divisor_factor: number
          id: string
          is_active: boolean
          meter_code: string
          meter_name: string
          meter_type: string
          multiplier_factor: number
        }
        Insert: {
          created_at?: string
          department?: string | null
          display_order?: number
          divisor_factor?: number
          id?: string
          is_active?: boolean
          meter_code: string
          meter_name: string
          meter_type?: string
          multiplier_factor?: number
        }
        Update: {
          created_at?: string
          department?: string | null
          display_order?: number
          divisor_factor?: number
          id?: string
          is_active?: boolean
          meter_code?: string
          meter_name?: string
          meter_type?: string
          multiplier_factor?: number
        }
        Relationships: []
      }
      electricity_readings: {
        Row: {
          closing_reading: number | null
          created_at: string
          entered_by: string | null
          id: string
          meter_id: string
          opening_reading: number | null
          raw_reading: number | null
          reading_date: string
          reading_time: string | null
          remarks: string | null
          units_consumed: number | null
        }
        Insert: {
          closing_reading?: number | null
          created_at?: string
          entered_by?: string | null
          id?: string
          meter_id: string
          opening_reading?: number | null
          raw_reading?: number | null
          reading_date?: string
          reading_time?: string | null
          remarks?: string | null
          units_consumed?: number | null
        }
        Update: {
          closing_reading?: number | null
          created_at?: string
          entered_by?: string | null
          id?: string
          meter_id?: string
          opening_reading?: number | null
          raw_reading?: number | null
          reading_date?: string
          reading_time?: string | null
          remarks?: string | null
          units_consumed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "electricity_readings_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "electricity_meters"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_tariffs: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          ke_rate_per_unit: number
          notes: string | null
          solar_rate_per_unit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          ke_rate_per_unit?: number
          notes?: string | null
          solar_rate_per_unit?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          ke_rate_per_unit?: number
          notes?: string | null
          solar_rate_per_unit?: number
          updated_at?: string
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          doc_name: string
          doc_type: string
          employee_id: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          notes: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          doc_name: string
          doc_type: string
          employee_id: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          doc_name?: string
          doc_type?: string
          employee_id?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_types: {
        Row: {
          category: string
          code: string
          created_at: string
          default_work_pattern_id: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          default_work_pattern_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          default_work_pattern_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_types_default_work_pattern_id_fkey"
            columns: ["default_work_pattern_id"]
            isOneToOne: false
            referencedRelation: "hr_work_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          allowances: Json | null
          alt_phone: string | null
          bank_account: string | null
          bank_name: string | null
          basic_salary: number | null
          blood_group: string | null
          cnic: string | null
          created_at: string
          created_by: string | null
          current_address: string | null
          date_of_birth: string | null
          department_id: string | null
          designation: string | null
          device_punch_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employee_code: string
          employee_type: string
          employee_type_id: string | null
          employment_status: string
          father_name: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          joining_date: string
          marital_status: string | null
          notes: string | null
          overtime_rate: number | null
          payment_mode: string | null
          permanent_address: string | null
          phone: string
          photo_url: string | null
          probation_end_date: string | null
          reporting_to: string | null
          salary_type: string
          shift: string | null
          updated_at: string
          user_id: string | null
          work_pattern_id: string | null
        }
        Insert: {
          allowances?: Json | null
          alt_phone?: string | null
          bank_account?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          blood_group?: string | null
          cnic?: string | null
          created_at?: string
          created_by?: string | null
          current_address?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          designation?: string | null
          device_punch_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_code: string
          employee_type?: string
          employee_type_id?: string | null
          employment_status?: string
          father_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          joining_date?: string
          marital_status?: string | null
          notes?: string | null
          overtime_rate?: number | null
          payment_mode?: string | null
          permanent_address?: string | null
          phone: string
          photo_url?: string | null
          probation_end_date?: string | null
          reporting_to?: string | null
          salary_type?: string
          shift?: string | null
          updated_at?: string
          user_id?: string | null
          work_pattern_id?: string | null
        }
        Update: {
          allowances?: Json | null
          alt_phone?: string | null
          bank_account?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          blood_group?: string | null
          cnic?: string | null
          created_at?: string
          created_by?: string | null
          current_address?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          designation?: string | null
          device_punch_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_code?: string
          employee_type?: string
          employee_type_id?: string | null
          employment_status?: string
          father_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          joining_date?: string
          marital_status?: string | null
          notes?: string | null
          overtime_rate?: number | null
          payment_mode?: string | null
          permanent_address?: string | null
          phone?: string
          photo_url?: string | null
          probation_end_date?: string | null
          reporting_to?: string | null
          salary_type?: string
          shift?: string | null
          updated_at?: string
          user_id?: string | null
          work_pattern_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_employee_type_id_fkey"
            columns: ["employee_type_id"]
            isOneToOne: false
            referencedRelation: "employee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_work_pattern_id_fkey"
            columns: ["work_pattern_id"]
            isOneToOne: false
            referencedRelation: "hr_work_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_check_parameters: {
        Row: {
          check_type: string
          created_at: string | null
          critical_max: number | null
          critical_min: number | null
          equipment_type_id: string
          id: string
          is_active: boolean | null
          name: string
          normal_max: number | null
          normal_min: number | null
          options: string[] | null
          sequence_order: number
          unit: string | null
        }
        Insert: {
          check_type?: string
          created_at?: string | null
          critical_max?: number | null
          critical_min?: number | null
          equipment_type_id: string
          id?: string
          is_active?: boolean | null
          name: string
          normal_max?: number | null
          normal_min?: number | null
          options?: string[] | null
          sequence_order?: number
          unit?: string | null
        }
        Update: {
          check_type?: string
          created_at?: string | null
          critical_max?: number | null
          critical_min?: number | null
          equipment_type_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          normal_max?: number | null
          normal_min?: number | null
          options?: string[] | null
          sequence_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_check_parameters_equipment_type_id_fkey"
            columns: ["equipment_type_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_types: {
        Row: {
          code: string
          created_at: string | null
          department: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          department?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          department?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      equipment_units: {
        Row: {
          created_at: string
          equipment_type_id: string
          id: string
          location: string | null
          status: string
          unit_code: string
          unit_name: string
        }
        Insert: {
          created_at?: string
          equipment_type_id: string
          id?: string
          location?: string | null
          status?: string
          unit_code: string
          unit_name: string
        }
        Update: {
          created_at?: string
          equipment_type_id?: string
          id?: string
          location?: string | null
          status?: string
          unit_code?: string
          unit_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_units_equipment_type_id_fkey"
            columns: ["equipment_type_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          department_ids: string[] | null
          description: string | null
          expense_type: string
          id: string
          is_active: boolean
          name: string
          parent_category: string
          requires_approval_above: number | null
        }
        Insert: {
          created_at?: string
          department_ids?: string[] | null
          description?: string | null
          expense_type?: string
          id?: string
          is_active?: boolean
          name: string
          parent_category?: string
          requires_approval_above?: number | null
        }
        Update: {
          created_at?: string
          department_ids?: string[] | null
          description?: string | null
          expense_type?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_category?: string
          requires_approval_above?: number | null
        }
        Relationships: []
      }
      external_jobs: {
        Row: {
          actual_return_date: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          expected_return_date: string | null
          id: string
          job_description: string | null
          mold_id: string | null
          remarks: string | null
          sent_date: string
          status: string
          updated_at: string | null
          vendor_name: string
        }
        Insert: {
          actual_return_date?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          expected_return_date?: string | null
          id?: string
          job_description?: string | null
          mold_id?: string | null
          remarks?: string | null
          sent_date?: string
          status?: string
          updated_at?: string | null
          vendor_name: string
        }
        Update: {
          actual_return_date?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          expected_return_date?: string | null
          id?: string
          job_description?: string | null
          mold_id?: string | null
          remarks?: string | null
          sent_date?: string
          status?: string
          updated_at?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_jobs_mold_id_fkey"
            columns: ["mold_id"]
            isOneToOne: false
            referencedRelation: "molds"
            referencedColumns: ["id"]
          },
        ]
      }
      external_mold_job_stages: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean | null
          job_id: string
          remarks: string | null
          sequence_order: number
          stage_name: string
          status: string
          updated_at: string
          vendor_deadline: string | null
          vendor_reported_date: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          job_id: string
          remarks?: string | null
          sequence_order?: number
          stage_name: string
          status?: string
          updated_at?: string
          vendor_deadline?: string | null
          vendor_reported_date?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          job_id?: string
          remarks?: string | null
          sequence_order?: number
          stage_name?: string
          status?: string
          updated_at?: string
          vendor_deadline?: string | null
          vendor_reported_date?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_mold_job_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "external_mold_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      external_mold_jobs: {
        Row: {
          actual_cost: number | null
          actual_return_date: string | null
          created_at: string
          created_by: string | null
          current_stage_id: string | null
          description: string | null
          id: string
          job_number: string
          mold_category: string
          mold_id: string | null
          priority: string
          quoted_cost: number | null
          remarks: string | null
          sent_date: string
          status: string
          target_date: string | null
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_return_date?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          description?: string | null
          id?: string
          job_number: string
          mold_category?: string
          mold_id?: string | null
          priority?: string
          quoted_cost?: number | null
          remarks?: string | null
          sent_date?: string
          status?: string
          target_date?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_return_date?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          description?: string | null
          id?: string
          job_number?: string
          mold_category?: string
          mold_id?: string | null
          priority?: string
          quoted_cost?: number | null
          remarks?: string | null
          sent_date?: string
          status?: string
          target_date?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_mold_jobs_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "external_mold_job_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_mold_jobs_mold_id_fkey"
            columns: ["mold_id"]
            isOneToOne: false
            referencedRelation: "molds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_mold_jobs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: string
          year_label: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          year_label: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          year_label?: string
        }
        Relationships: []
      }
      formulation_groups: {
        Row: {
          base_material_type: string | null
          color: string | null
          created_at: string | null
          formulation_code: string
          formulation_name: string | null
          id: string
          signature: string
        }
        Insert: {
          base_material_type?: string | null
          color?: string | null
          created_at?: string | null
          formulation_code: string
          formulation_name?: string | null
          id?: string
          signature: string
        }
        Update: {
          base_material_type?: string | null
          color?: string | null
          created_at?: string | null
          formulation_code?: string
          formulation_name?: string | null
          id?: string
          signature?: string
        }
        Relationships: []
      }
      gate_movements: {
        Row: {
          attachment_url: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          direction: string
          dispatch_id: string | null
          dispatch_return_id: string | null
          driver_cnic: string | null
          driver_name: string | null
          gate_no: string | null
          gate_pass_no: string | null
          id: string
          item_description: string | null
          material_lot_id: string | null
          movement_date: string
          movement_time: string
          party_kind: string | null
          party_name: string | null
          quantity: number | null
          remarks: string | null
          returnable: boolean
          returned_at: string | null
          security_guard: string | null
          status: string
          type: string
          unit: string | null
          updated_at: string
          vehicle_no: string | null
          vendor_id: string | null
          vendor_issue_id: string | null
          vendor_return_id: string | null
          weight_kg: number | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction: string
          dispatch_id?: string | null
          dispatch_return_id?: string | null
          driver_cnic?: string | null
          driver_name?: string | null
          gate_no?: string | null
          gate_pass_no?: string | null
          id?: string
          item_description?: string | null
          material_lot_id?: string | null
          movement_date?: string
          movement_time?: string
          party_kind?: string | null
          party_name?: string | null
          quantity?: number | null
          remarks?: string | null
          returnable?: boolean
          returned_at?: string | null
          security_guard?: string | null
          status?: string
          type: string
          unit?: string | null
          updated_at?: string
          vehicle_no?: string | null
          vendor_id?: string | null
          vendor_issue_id?: string | null
          vendor_return_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction?: string
          dispatch_id?: string | null
          dispatch_return_id?: string | null
          driver_cnic?: string | null
          driver_name?: string | null
          gate_no?: string | null
          gate_pass_no?: string | null
          id?: string
          item_description?: string | null
          material_lot_id?: string | null
          movement_date?: string
          movement_time?: string
          party_kind?: string | null
          party_name?: string | null
          quantity?: number | null
          remarks?: string | null
          returnable?: boolean
          returned_at?: string | null
          security_guard?: string | null
          status?: string
          type?: string
          unit?: string | null
          updated_at?: string
          vehicle_no?: string | null
          vendor_id?: string | null
          vendor_issue_id?: string | null
          vendor_return_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_movements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_movements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_tolerance_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      hold_approval_history: {
        Row: {
          created_at: string | null
          decided_by: string | null
          decision_date: string | null
          further_hold_qty: number
          hourly_production_id: string
          id: string
          pass_qty: number
          reject_qty: number
          rejection_reason_id: string | null
          remarks: string | null
        }
        Insert: {
          created_at?: string | null
          decided_by?: string | null
          decision_date?: string | null
          further_hold_qty?: number
          hourly_production_id: string
          id?: string
          pass_qty?: number
          reject_qty?: number
          rejection_reason_id?: string | null
          remarks?: string | null
        }
        Update: {
          created_at?: string | null
          decided_by?: string | null
          decision_date?: string | null
          further_hold_qty?: number
          hourly_production_id?: string
          id?: string
          pass_qty?: number
          reject_qty?: number
          rejection_reason_id?: string | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hold_approval_history_hourly_production_id_fkey"
            columns: ["hourly_production_id"]
            isOneToOne: false
            referencedRelation: "hourly_production"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hold_approval_history_rejection_reason_id_fkey"
            columns: ["rejection_reason_id"]
            isOneToOne: false
            referencedRelation: "rejection_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      hold_inventory: {
        Row: {
          created_at: string
          disposed_at: string | null
          disposed_by: string | null
          disposition_reason: string | null
          id: string
          product_id: string
          qty_pcs: number
          remarks: string | null
          source_log_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disposed_at?: string | null
          disposed_by?: string | null
          disposition_reason?: string | null
          id?: string
          product_id: string
          qty_pcs?: number
          remarks?: string | null
          source_log_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disposed_at?: string | null
          disposed_by?: string | null
          disposition_reason?: string | null
          id?: string
          product_id?: string
          qty_pcs?: number
          remarks?: string | null
          source_log_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hold_inventory_source_log_id_fkey"
            columns: ["source_log_id"]
            isOneToOne: false
            referencedRelation: "daily_production_log"
            referencedColumns: ["id"]
          },
        ]
      }
      hourly_inspection_responses: {
        Row: {
          cavity_results: Json | null
          created_at: string
          criteria_id: string
          hourly_inspection_id: string
          id: string
          is_passed: boolean
          numeric_answer: number | null
          rating_answer: number | null
          remarks: string | null
          yes_no_answer: boolean | null
        }
        Insert: {
          cavity_results?: Json | null
          created_at?: string
          criteria_id: string
          hourly_inspection_id: string
          id?: string
          is_passed?: boolean
          numeric_answer?: number | null
          rating_answer?: number | null
          remarks?: string | null
          yes_no_answer?: boolean | null
        }
        Update: {
          cavity_results?: Json | null
          created_at?: string
          criteria_id?: string
          hourly_inspection_id?: string
          id?: string
          is_passed?: boolean
          numeric_answer?: number | null
          rating_answer?: number | null
          remarks?: string | null
          yes_no_answer?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hourly_inspection_responses_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "inspection_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_inspection_responses_hourly_inspection_id_fkey"
            columns: ["hourly_inspection_id"]
            isOneToOne: false
            referencedRelation: "hourly_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      hourly_inspections: {
        Row: {
          batch_number: string | null
          created_at: string
          created_by: string | null
          hour_slot: number
          hourly_production_id: string | null
          id: string
          inspection_context: string | null
          inspection_date: string
          inspection_type: string
          inspector_name: string | null
          job_id: string | null
          location: string | null
          lot_number: string | null
          machine_id: string | null
          material_id: string | null
          overall_status: string
          product_id: string
          remarks: string | null
          shift: string | null
          stock_quantity: number | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          hour_slot: number
          hourly_production_id?: string | null
          id?: string
          inspection_context?: string | null
          inspection_date?: string
          inspection_type?: string
          inspector_name?: string | null
          job_id?: string | null
          location?: string | null
          lot_number?: string | null
          machine_id?: string | null
          material_id?: string | null
          overall_status?: string
          product_id: string
          remarks?: string | null
          shift?: string | null
          stock_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          hour_slot?: number
          hourly_production_id?: string | null
          id?: string
          inspection_context?: string | null
          inspection_date?: string
          inspection_type?: string
          inspector_name?: string | null
          job_id?: string | null
          location?: string | null
          lot_number?: string | null
          machine_id?: string | null
          material_id?: string | null
          overall_status?: string
          product_id?: string
          remarks?: string | null
          shift?: string | null
          stock_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_hourly_inspections_material"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_hourly_inspections_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_inspections_hourly_production_id_fkey"
            columns: ["hourly_production_id"]
            isOneToOne: false
            referencedRelation: "hourly_production"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_inspections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_inspections_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_inspections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      hourly_production: {
        Row: {
          actual_material_kg: number | null
          approved_at: string | null
          approved_by: string | null
          approved_pass_qty: number | null
          approved_reject_qty: number | null
          created_at: string | null
          created_by: string | null
          draft_snapshot: Json | null
          electricity_units: number | null
          entry_status: string
          entry_time: string | null
          hold_qty: number | null
          hold_status: string | null
          hour_slot: number
          hours_covered: number
          id: string
          is_machine_stopped: boolean | null
          job_id: string | null
          machine_id: string
          mold_id: string | null
          ok_qty: number | null
          operator_name: string | null
          operator_type: string | null
          original_hold_qty: number | null
          production_date: string
          production_gms: number | null
          production_kg: number | null
          production_lot_id: string | null
          regrind_qty: number | null
          rejection_qty: number | null
          rejection_reason_id: string | null
          remarks: string | null
          shift: Database["public"]["Enums"]["shift_type"] | null
          stop_duration_mins: number | null
          stop_reason_id: string | null
          stop_remarks: string | null
          target_qty: number | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          actual_material_kg?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_pass_qty?: number | null
          approved_reject_qty?: number | null
          created_at?: string | null
          created_by?: string | null
          draft_snapshot?: Json | null
          electricity_units?: number | null
          entry_status?: string
          entry_time?: string | null
          hold_qty?: number | null
          hold_status?: string | null
          hour_slot: number
          hours_covered?: number
          id?: string
          is_machine_stopped?: boolean | null
          job_id?: string | null
          machine_id: string
          mold_id?: string | null
          ok_qty?: number | null
          operator_name?: string | null
          operator_type?: string | null
          original_hold_qty?: number | null
          production_date?: string
          production_gms?: number | null
          production_kg?: number | null
          production_lot_id?: string | null
          regrind_qty?: number | null
          rejection_qty?: number | null
          rejection_reason_id?: string | null
          remarks?: string | null
          shift?: Database["public"]["Enums"]["shift_type"] | null
          stop_duration_mins?: number | null
          stop_reason_id?: string | null
          stop_remarks?: string | null
          target_qty?: number | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          actual_material_kg?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_pass_qty?: number | null
          approved_reject_qty?: number | null
          created_at?: string | null
          created_by?: string | null
          draft_snapshot?: Json | null
          electricity_units?: number | null
          entry_status?: string
          entry_time?: string | null
          hold_qty?: number | null
          hold_status?: string | null
          hour_slot?: number
          hours_covered?: number
          id?: string
          is_machine_stopped?: boolean | null
          job_id?: string | null
          machine_id?: string
          mold_id?: string | null
          ok_qty?: number | null
          operator_name?: string | null
          operator_type?: string | null
          original_hold_qty?: number | null
          production_date?: string
          production_gms?: number | null
          production_kg?: number | null
          production_lot_id?: string | null
          regrind_qty?: number | null
          rejection_qty?: number | null
          rejection_reason_id?: string | null
          remarks?: string | null
          shift?: Database["public"]["Enums"]["shift_type"] | null
          stop_duration_mins?: number | null
          stop_reason_id?: string | null
          stop_remarks?: string | null
          target_qty?: number | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hourly_production_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_production_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_production_mold_id_fkey"
            columns: ["mold_id"]
            isOneToOne: false
            referencedRelation: "molds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_production_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_production_rejection_reason_id_fkey"
            columns: ["rejection_reason_id"]
            isOneToOne: false
            referencedRelation: "rejection_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_production_stop_reason_id_fkey"
            columns: ["stop_reason_id"]
            isOneToOne: false
            referencedRelation: "stop_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      hourly_production_corrections: {
        Row: {
          after_data: Json
          before_data: Json
          corrected_at: string
          corrected_by: string | null
          correction_type: string
          hourly_production_id: string
          id: string
          reason: string | null
        }
        Insert: {
          after_data: Json
          before_data: Json
          corrected_at?: string
          corrected_by?: string | null
          correction_type?: string
          hourly_production_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          after_data?: Json
          before_data?: Json
          corrected_at?: string
          corrected_by?: string | null
          correction_type?: string
          hourly_production_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hourly_production_corrections_hourly_production_id_fkey"
            columns: ["hourly_production_id"]
            isOneToOne: false
            referencedRelation: "hourly_production"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          changed_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          changed_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          changed_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      hr_work_patterns: {
        Row: {
          code: string
          color: string
          created_at: string
          end_hour: number
          end_minute: number
          grace_minutes: number
          id: string
          is_active: boolean
          lunch_minutes: number
          name: string
          ot_threshold_hours: number
          standard_days_per_month: number
          standard_hours: number
          start_hour: number
          start_minute: number
          updated_at: string
          weekly_off_days: number[]
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          end_hour?: number
          end_minute?: number
          grace_minutes?: number
          id?: string
          is_active?: boolean
          lunch_minutes?: number
          name: string
          ot_threshold_hours?: number
          standard_days_per_month?: number
          standard_hours?: number
          start_hour?: number
          start_minute?: number
          updated_at?: string
          weekly_off_days?: number[]
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          end_hour?: number
          end_minute?: number
          grace_minutes?: number
          id?: string
          is_active?: boolean
          lunch_minutes?: number
          name?: string
          ot_threshold_hours?: number
          standard_days_per_month?: number
          standard_hours?: number
          start_hour?: number
          start_minute?: number
          updated_at?: string
          weekly_off_days?: number[]
        }
        Relationships: []
      }
      ink_batches: {
        Row: {
          batch_number: string
          created_at: string
          expiry_date: string | null
          formulation_id: string | null
          id: string
          manufacture_date: string | null
          quantity_kg: number | null
          remaining_kg: number | null
          remarks: string | null
          status: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          expiry_date?: string | null
          formulation_id?: string | null
          id?: string
          manufacture_date?: string | null
          quantity_kg?: number | null
          remaining_kg?: number | null
          remarks?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          expiry_date?: string | null
          formulation_id?: string | null
          id?: string
          manufacture_date?: string | null
          quantity_kg?: number | null
          remaining_kg?: number | null
          remarks?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ink_batches_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "ink_formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ink_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      ink_formulations: {
        Row: {
          base_color: string
          components: Json | null
          created_at: string
          formulation_code: string
          formulation_name: string | null
          id: string
          is_active: boolean | null
          pantone_code: string | null
          updated_at: string
        }
        Insert: {
          base_color: string
          components?: Json | null
          created_at?: string
          formulation_code: string
          formulation_name?: string | null
          id?: string
          is_active?: boolean | null
          pantone_code?: string | null
          updated_at?: string
        }
        Update: {
          base_color?: string
          components?: Json | null
          created_at?: string
          formulation_code?: string
          formulation_name?: string | null
          id?: string
          is_active?: boolean | null
          pantone_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inspection_alerts: {
        Row: {
          alert_date: string
          alert_type: string
          created_at: string
          current_count: number
          hour_block_end: number | null
          hour_block_start: number | null
          id: string
          is_resolved: boolean
          job_id: string | null
          machine_id: string
          product_id: string | null
          required_count: number
          resolved_at: string | null
          resolved_by: string | null
          shift: string | null
        }
        Insert: {
          alert_date?: string
          alert_type: string
          created_at?: string
          current_count?: number
          hour_block_end?: number | null
          hour_block_start?: number | null
          id?: string
          is_resolved?: boolean
          job_id?: string | null
          machine_id: string
          product_id?: string | null
          required_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          shift?: string | null
        }
        Update: {
          alert_date?: string
          alert_type?: string
          created_at?: string
          current_count?: number
          hour_block_end?: number | null
          hour_block_start?: number | null
          id?: string
          is_resolved?: boolean
          job_id?: string | null
          machine_id?: string
          product_id?: string | null
          required_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          shift?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_alerts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_alerts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_criteria: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_critical: boolean
          max_value: number | null
          min_value: number | null
          product_id: string
          question_text: string
          question_type: string
          sequence_order: number
          target_value: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_critical?: boolean
          max_value?: number | null
          min_value?: number | null
          product_id: string
          question_text: string
          question_type?: string
          sequence_order?: number
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_critical?: boolean
          max_value?: number | null
          min_value?: number | null
          product_id?: string
          question_text?: string
          question_type?: string
          sequence_order?: number
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_criteria_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_rejections: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inspector: string | null
          machine_id: string | null
          product_id: string
          quantity: number
          reason: string | null
          rejected_at: string
          remarks: string | null
          shift: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inspector?: string | null
          machine_id?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          rejected_at?: string
          remarks?: string | null
          shift?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inspector?: string | null
          machine_id?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          rejected_at?: string
          remarks?: string | null
          shift?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_rejections_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_rejections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_template_items: {
        Row: {
          created_at: string
          id: string
          is_critical: boolean | null
          max_value: number | null
          min_value: number | null
          question_text: string
          question_type: string
          sequence_order: number
          target_value: number | null
          template_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_critical?: boolean | null
          max_value?: number | null
          min_value?: number | null
          question_text: string
          question_type?: string
          sequence_order?: number
          target_value?: number | null
          template_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_critical?: boolean | null
          max_value?: number | null
          min_value?: number | null
          question_text?: string
          question_type?: string
          sequence_order?: number
          target_value?: number | null
          template_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_templates: {
        Row: {
          created_at: string
          created_by: string | null
          department_code: string
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_code: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_code?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inspections: {
        Row: {
          created_at: string | null
          created_by: string | null
          failed_qty: number
          id: string
          inspected_qty: number
          inspection_date: string
          inspector_name: string | null
          job_id: string
          passed_qty: number
          rejection_reason_id: string | null
          remarks: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          failed_qty?: number
          id?: string
          inspected_qty?: number
          inspection_date?: string
          inspector_name?: string | null
          job_id: string
          passed_qty?: number
          rejection_reason_id?: string | null
          remarks?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          failed_qty?: number
          id?: string
          inspected_qty?: number
          inspection_date?: string
          inspector_name?: string | null
          job_id?: string
          passed_qty?: number
          rejection_reason_id?: string | null
          remarks?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_rejection_reason_id_fkey"
            columns: ["rejection_reason_id"]
            isOneToOne: false
            referencedRelation: "rejection_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_assets: {
        Row: {
          asset_type: string
          created_at: string
          depreciation_method: string | null
          depreciation_per_unit: number | null
          depreciation_rate_monthly: number | null
          id: string
          initial_value: number
          investor_id: string
          is_active: boolean
          machine_id: string | null
          mold_id: string | null
          ownership_end_date: string | null
          ownership_percentage: number | null
          ownership_start_date: string
          profit_rate_fixed_monthly: number | null
          profit_rate_per_piece: number | null
          profit_rate_per_shot: number | null
          reduction_rate_per_piece: number | null
          reduction_rate_per_shot: number | null
          total_amount_paid: number | null
          total_pieces_produced: number | null
          total_shots_used: number | null
          updated_at: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          depreciation_method?: string | null
          depreciation_per_unit?: number | null
          depreciation_rate_monthly?: number | null
          id?: string
          initial_value?: number
          investor_id: string
          is_active?: boolean
          machine_id?: string | null
          mold_id?: string | null
          ownership_end_date?: string | null
          ownership_percentage?: number | null
          ownership_start_date?: string
          profit_rate_fixed_monthly?: number | null
          profit_rate_per_piece?: number | null
          profit_rate_per_shot?: number | null
          reduction_rate_per_piece?: number | null
          reduction_rate_per_shot?: number | null
          total_amount_paid?: number | null
          total_pieces_produced?: number | null
          total_shots_used?: number | null
          updated_at?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          depreciation_method?: string | null
          depreciation_per_unit?: number | null
          depreciation_rate_monthly?: number | null
          id?: string
          initial_value?: number
          investor_id?: string
          is_active?: boolean
          machine_id?: string | null
          mold_id?: string | null
          ownership_end_date?: string | null
          ownership_percentage?: number | null
          ownership_start_date?: string
          profit_rate_fixed_monthly?: number | null
          profit_rate_per_piece?: number | null
          profit_rate_per_shot?: number | null
          reduction_rate_per_piece?: number | null
          reduction_rate_per_shot?: number | null
          total_amount_paid?: number | null
          total_pieces_produced?: number | null
          total_shots_used?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_assets_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_assets_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_assets_mold_id_fkey"
            columns: ["mold_id"]
            isOneToOne: false
            referencedRelation: "molds"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_monthly_ledger: {
        Row: {
          amount_paid_this_month: number | null
          closing_ownership_pct: number | null
          closing_ownership_percentage: number | null
          created_at: string
          cumulative_asset_value: number | null
          depreciation_amount: number | null
          depreciation_paid: boolean | null
          depreciation_paid_date: string | null
          gross_profit: number
          id: string
          investor_asset_id: string
          investor_id: string
          month_year: string
          net_profit: number
          opening_ownership_pct: number | null
          opening_ownership_percentage: number | null
          ownership_reduction_pct: number | null
          profit_amount: number | null
          reduction_amount: number | null
          remarks: string | null
          total_cycles: number | null
          total_payment: number | null
          total_units_produced: number
          units_dispatched: number | null
          units_pending_dispatch: number | null
          updated_at: string
        }
        Insert: {
          amount_paid_this_month?: number | null
          closing_ownership_pct?: number | null
          closing_ownership_percentage?: number | null
          created_at?: string
          cumulative_asset_value?: number | null
          depreciation_amount?: number | null
          depreciation_paid?: boolean | null
          depreciation_paid_date?: string | null
          gross_profit?: number
          id?: string
          investor_asset_id: string
          investor_id: string
          month_year: string
          net_profit?: number
          opening_ownership_pct?: number | null
          opening_ownership_percentage?: number | null
          ownership_reduction_pct?: number | null
          profit_amount?: number | null
          reduction_amount?: number | null
          remarks?: string | null
          total_cycles?: number | null
          total_payment?: number | null
          total_units_produced?: number
          units_dispatched?: number | null
          units_pending_dispatch?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid_this_month?: number | null
          closing_ownership_pct?: number | null
          closing_ownership_percentage?: number | null
          created_at?: string
          cumulative_asset_value?: number | null
          depreciation_amount?: number | null
          depreciation_paid?: boolean | null
          depreciation_paid_date?: string | null
          gross_profit?: number
          id?: string
          investor_asset_id?: string
          investor_id?: string
          month_year?: string
          net_profit?: number
          opening_ownership_pct?: number | null
          opening_ownership_percentage?: number | null
          ownership_reduction_pct?: number | null
          profit_amount?: number | null
          reduction_amount?: number | null
          remarks?: string | null
          total_cycles?: number | null
          total_payment?: number | null
          total_units_produced?: number
          units_dispatched?: number | null
          units_pending_dispatch?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_monthly_ledger_investor_asset_id_fkey"
            columns: ["investor_asset_id"]
            isOneToOne: false
            referencedRelation: "investor_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_monthly_ledger_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          address: string | null
          bank_details: Json | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          investor_code: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_details?: Json | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          investor_code: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_details?: Json | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          investor_code?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      job_changeover_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          current_job_id: string | null
          id: string
          is_acknowledged: boolean | null
          machine_id: string
          next_job_id: string | null
          scheduled_changeover_time: string | null
          threshold_percent: number | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          current_job_id?: string | null
          id?: string
          is_acknowledged?: boolean | null
          machine_id: string
          next_job_id?: string | null
          scheduled_changeover_time?: string | null
          threshold_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          current_job_id?: string | null
          id?: string
          is_acknowledged?: boolean | null
          machine_id?: string
          next_job_id?: string | null
          scheduled_changeover_time?: string | null
          threshold_percent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_changeover_alerts_current_job_id_fkey"
            columns: ["current_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_changeover_alerts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_changeover_alerts_next_job_id_fkey"
            columns: ["next_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_applications: {
        Row: {
          applied_by: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days: number
          employee_id: string
          from_date: string
          id: string
          leave_type_id: string
          reason: string | null
          remarks: string | null
          status: string
          to_date: string
          updated_at: string
        }
        Insert: {
          applied_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days: number
          employee_id: string
          from_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          remarks?: string | null
          status?: string
          to_date: string
          updated_at?: string
        }
        Update: {
          applied_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id?: string
          from_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          remarks?: string | null
          status?: string
          to_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          allocated: number
          carried_forward: number
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          updated_at: string
          used: number
          year: number
        }
        Insert: {
          allocated?: number
          carried_forward?: number
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          updated_at?: string
          used?: number
          year: number
        }
        Update: {
          allocated?: number
          carried_forward?: number
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          updated_at?: string
          used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          active: boolean
          annual_quota: number
          code: string
          color: string | null
          created_at: string
          id: string
          is_paid: boolean
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          annual_quota?: number
          code: string
          color?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          annual_quota?: number
          code?: string
          color?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      leftover_compounds: {
        Row: {
          compound_code: string
          created_at: string | null
          created_by: string | null
          created_date: string | null
          expiry_date: string | null
          formulation_group_id: string | null
          id: string
          location_type: string
          machine_id: string | null
          quality_status: string | null
          quantity_kg: number
          remarks: string | null
          source_batch_id: string | null
          source_job_id: string | null
          status: string | null
          storage_location_id: string | null
          updated_at: string | null
        }
        Insert: {
          compound_code: string
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          expiry_date?: string | null
          formulation_group_id?: string | null
          id?: string
          location_type?: string
          machine_id?: string | null
          quality_status?: string | null
          quantity_kg?: number
          remarks?: string | null
          source_batch_id?: string | null
          source_job_id?: string | null
          status?: string | null
          storage_location_id?: string | null
          updated_at?: string | null
        }
        Update: {
          compound_code?: string
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          expiry_date?: string | null
          formulation_group_id?: string | null
          id?: string
          location_type?: string
          machine_id?: string | null
          quality_status?: string | null
          quantity_kg?: number
          remarks?: string | null
          source_batch_id?: string | null
          source_job_id?: string | null
          status?: string | null
          storage_location_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leftover_compounds_formulation_group_id_fkey"
            columns: ["formulation_group_id"]
            isOneToOne: false
            referencedRelation: "formulation_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leftover_compounds_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leftover_compounds_source_batch_id_fkey"
            columns: ["source_batch_id"]
            isOneToOne: false
            referencedRelation: "mixing_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leftover_compounds_source_job_id_fkey"
            columns: ["source_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leftover_compounds_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_material_usage: {
        Row: {
          created_at: string
          id: string
          issue_date: string
          material_lot_id: string
          production_lot_id: string
          quantity_used: number
          recorded_by: string | null
          remarks: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          issue_date?: string
          material_lot_id: string
          production_lot_id: string
          quantity_used?: number
          recorded_by?: string | null
          remarks?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          issue_date?: string
          material_lot_id?: string
          production_lot_id?: string
          quantity_used?: number
          recorded_by?: string | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_material_usage_material_lot_id_fkey"
            columns: ["material_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_material_usage_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          assembly_type: string | null
          assumed_power_kw: number | null
          created_at: string | null
          current_mold_id: string | null
          cycle_time: number | null
          department_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          last_maintenance: string | null
          location: string | null
          machine_id: string
          machine_type: string | null
          next_maintenance: string | null
          requires_air_pressure: boolean | null
          shot_capacity: number
          stations_count: number | null
          status: Database["public"]["Enums"]["machine_status"] | null
          stop_reason: string | null
          stopped_at: string | null
          target_per_hour: number | null
          tie_bar_size: string | null
          tonnage: number
          tool_jig_reference: string | null
          updated_at: string | null
        }
        Insert: {
          assembly_type?: string | null
          assumed_power_kw?: number | null
          created_at?: string | null
          current_mold_id?: string | null
          cycle_time?: number | null
          department_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_maintenance?: string | null
          location?: string | null
          machine_id: string
          machine_type?: string | null
          next_maintenance?: string | null
          requires_air_pressure?: boolean | null
          shot_capacity: number
          stations_count?: number | null
          status?: Database["public"]["Enums"]["machine_status"] | null
          stop_reason?: string | null
          stopped_at?: string | null
          target_per_hour?: number | null
          tie_bar_size?: string | null
          tonnage: number
          tool_jig_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          assembly_type?: string | null
          assumed_power_kw?: number | null
          created_at?: string | null
          current_mold_id?: string | null
          cycle_time?: number | null
          department_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_maintenance?: string | null
          location?: string | null
          machine_id?: string
          machine_type?: string | null
          next_maintenance?: string | null
          requires_air_pressure?: boolean | null
          shot_capacity?: number
          stations_count?: number | null
          status?: Database["public"]["Enums"]["machine_status"] | null
          stop_reason?: string | null
          stopped_at?: string | null
          target_per_hour?: number | null
          tie_bar_size?: string | null
          tonnage?: number
          tool_jig_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_machines_current_mold"
            columns: ["current_mold_id"]
            isOneToOne: false
            referencedRelation: "molds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_parts_usage: {
        Row: {
          created_at: string
          id: string
          issued_at: string
          issued_by: string | null
          quantity_used: number
          remarks: string | null
          spare_part_id: string
          total_cost: number | null
          unit_cost: number | null
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          quantity_used?: number
          remarks?: string | null
          spare_part_id: string
          total_cost?: number | null
          unit_cost?: number | null
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          quantity_used?: number
          remarks?: string | null
          spare_part_id?: string
          total_cost?: number | null
          unit_cost?: number | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_parts_usage_spare_part_id_fkey"
            columns: ["spare_part_id"]
            isOneToOne: false
            referencedRelation: "maintenance_spare_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_parts_usage_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "maintenance_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedule: {
        Row: {
          asset_type: Database["public"]["Enums"]["maintenance_asset_type"]
          checklist_items: Json | null
          created_at: string
          frequency_days: number | null
          frequency_shots: number | null
          id: string
          is_active: boolean | null
          last_performed: string | null
          machine_id: string | null
          mold_id: string | null
          next_due: string | null
          schedule_name: string
          schedule_type: Database["public"]["Enums"]["maintenance_schedule_type"]
          updated_at: string
        }
        Insert: {
          asset_type?: Database["public"]["Enums"]["maintenance_asset_type"]
          checklist_items?: Json | null
          created_at?: string
          frequency_days?: number | null
          frequency_shots?: number | null
          id?: string
          is_active?: boolean | null
          last_performed?: string | null
          machine_id?: string | null
          mold_id?: string | null
          next_due?: string | null
          schedule_name: string
          schedule_type?: Database["public"]["Enums"]["maintenance_schedule_type"]
          updated_at?: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["maintenance_asset_type"]
          checklist_items?: Json | null
          created_at?: string
          frequency_days?: number | null
          frequency_shots?: number | null
          id?: string
          is_active?: boolean | null
          last_performed?: string | null
          machine_id?: string | null
          mold_id?: string | null
          next_due?: string | null
          schedule_name?: string
          schedule_type?: Database["public"]["Enums"]["maintenance_schedule_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedule_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedule_mold_id_fkey"
            columns: ["mold_id"]
            isOneToOne: false
            referencedRelation: "molds"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_spare_parts: {
        Row: {
          category: string | null
          compatible_assets: string[] | null
          created_at: string
          current_stock: number | null
          id: string
          is_active: boolean | null
          location: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          part_code: string
          part_name: string
          supplier_id: string | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          compatible_assets?: string[] | null
          created_at?: string
          current_stock?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          part_code: string
          part_name: string
          supplier_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          compatible_assets?: string[] | null
          created_at?: string
          current_stock?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          part_code?: string
          part_name?: string
          supplier_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_spare_parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_stages_master: {
        Row: {
          created_at: string
          default_duration_hours: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sequence_order: number
          updated_at: string
          work_order_types: string[] | null
        }
        Insert: {
          created_at?: string
          default_duration_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sequence_order?: number
          updated_at?: string
          work_order_types?: string[] | null
        }
        Update: {
          created_at?: string
          default_duration_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sequence_order?: number
          updated_at?: string
          work_order_types?: string[] | null
        }
        Relationships: []
      }
      maintenance_work_order_stages: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assigned_worker: string | null
          created_at: string
          id: string
          planned_end: string | null
          planned_start: string | null
          remarks: string | null
          sequence_order: number
          stage_id: string | null
          stage_name: string
          status: Database["public"]["Enums"]["maintenance_stage_status"]
          time_spent_mins: number | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_worker?: string | null
          created_at?: string
          id?: string
          planned_end?: string | null
          planned_start?: string | null
          remarks?: string | null
          sequence_order?: number
          stage_id?: string | null
          stage_name: string
          status?: Database["public"]["Enums"]["maintenance_stage_status"]
          time_spent_mins?: number | null
          updated_at?: string
          work_order_id: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_worker?: string | null
          created_at?: string
          id?: string
          planned_end?: string | null
          planned_start?: string | null
          remarks?: string | null
          sequence_order?: number
          stage_id?: string | null
          stage_name?: string
          status?: Database["public"]["Enums"]["maintenance_stage_status"]
          time_spent_mins?: number | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_work_order_stages_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "maintenance_stages_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_work_order_stages_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "maintenance_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_work_orders: {
        Row: {
          actual_completion_date: string | null
          asset_type: Database["public"]["Enums"]["maintenance_asset_type"]
          assigned_to: string | null
          created_at: string
          current_stage_id: string | null
          department_id: string | null
          downtime_end: string | null
          downtime_start: string | null
          id: string
          machine_id: string | null
          mold_id: string | null
          priority: Database["public"]["Enums"]["maintenance_priority"]
          problem_description: string | null
          remarks: string | null
          reported_by: string | null
          resolution: string | null
          root_cause: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          target_completion_date: string | null
          total_downtime_mins: number | null
          updated_at: string
          work_order_number: string | null
          work_order_type: Database["public"]["Enums"]["maintenance_work_order_type"]
        }
        Insert: {
          actual_completion_date?: string | null
          asset_type?: Database["public"]["Enums"]["maintenance_asset_type"]
          assigned_to?: string | null
          created_at?: string
          current_stage_id?: string | null
          department_id?: string | null
          downtime_end?: string | null
          downtime_start?: string | null
          id?: string
          machine_id?: string | null
          mold_id?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          problem_description?: string | null
          remarks?: string | null
          reported_by?: string | null
          resolution?: string | null
          root_cause?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          target_completion_date?: string | null
          total_downtime_mins?: number | null
          updated_at?: string
          work_order_number?: string | null
          work_order_type?: Database["public"]["Enums"]["maintenance_work_order_type"]
        }
        Update: {
          actual_completion_date?: string | null
          asset_type?: Database["public"]["Enums"]["maintenance_asset_type"]
          assigned_to?: string | null
          created_at?: string
          current_stage_id?: string | null
          department_id?: string | null
          downtime_end?: string | null
          downtime_start?: string | null
          id?: string
          machine_id?: string | null
          mold_id?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          problem_description?: string | null
          remarks?: string | null
          reported_by?: string | null
          resolution?: string | null
          root_cause?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          target_completion_date?: string | null
          total_downtime_mins?: number | null
          updated_at?: string
          work_order_number?: string | null
          work_order_type?: Database["public"]["Enums"]["maintenance_work_order_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_maintenance_wo_current_stage"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "maintenance_work_order_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_mold_id_fkey"
            columns: ["mold_id"]
            isOneToOne: false
            referencedRelation: "molds"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_work_entries: {
        Row: {
          created_at: string
          created_by: string | null
          custom_work_type: string | null
          duration_mins: number | null
          end_time: string | null
          entry_number: string | null
          hour_slot: number
          id: string
          item_description: string
          labor_cost: number
          labor_rate: number
          operator_id: string | null
          operator_name: string
          operator_type: string
          plan_id: string | null
          product_id: string | null
          qty_done: number
          remarks: string | null
          shift: string | null
          start_time: string | null
          unit: string
          updated_at: string
          work_date: string
          work_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_work_type?: string | null
          duration_mins?: number | null
          end_time?: string | null
          entry_number?: string | null
          hour_slot: number
          id?: string
          item_description?: string
          labor_cost?: number
          labor_rate?: number
          operator_id?: string | null
          operator_name?: string
          operator_type?: string
          plan_id?: string | null
          product_id?: string | null
          qty_done?: number
          remarks?: string | null
          shift?: string | null
          start_time?: string | null
          unit?: string
          updated_at?: string
          work_date?: string
          work_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_work_type?: string | null
          duration_mins?: number | null
          end_time?: string | null
          entry_number?: string | null
          hour_slot?: number
          id?: string
          item_description?: string
          labor_cost?: number
          labor_rate?: number
          operator_id?: string | null
          operator_name?: string
          operator_type?: string
          plan_id?: string | null
          product_id?: string | null
          qty_done?: number
          remarks?: string | null
          shift?: string | null
          start_time?: string | null
          unit?: string
          updated_at?: string
          work_date?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_work_entries_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_work_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "manual_work_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_work_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_work_plan_assignments: {
        Row: {
          assigned_qty: number | null
          created_at: string
          id: string
          operator_id: string | null
          operator_name: string
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_qty?: number | null
          created_at?: string
          id?: string
          operator_id?: string | null
          operator_name: string
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_qty?: number | null
          created_at?: string
          id?: string
          operator_id?: string | null
          operator_name?: string
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_work_plan_assignments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_work_plan_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "manual_work_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_work_plans: {
        Row: {
          created_at: string
          created_by: string | null
          custom_work_type: string | null
          id: string
          item_description: string
          labor_rate: number
          plan_date: string
          plan_number: string
          priority: number
          product_id: string | null
          remarks: string | null
          shift: string
          status: string
          target_qty: number
          unit: string
          updated_at: string
          work_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_work_type?: string | null
          id?: string
          item_description: string
          labor_rate?: number
          plan_date?: string
          plan_number: string
          priority?: number
          product_id?: string | null
          remarks?: string | null
          shift?: string
          status?: string
          target_qty?: number
          unit?: string
          updated_at?: string
          work_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_work_type?: string | null
          id?: string
          item_description?: string
          labor_rate?: number
          plan_date?: string
          plan_number?: string
          priority?: number
          product_id?: string | null
          remarks?: string | null
          shift?: string
          status?: string
          target_qty?: number
          unit?: string
          updated_at?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_work_plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_work_types: {
        Row: {
          created_at: string
          default_labor_rate: number
          id: string
          is_active: boolean
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_labor_rate?: number
          id?: string
          is_active?: boolean
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_labor_rate?: number
          id?: string
          is_active?: boolean
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_inspection_criteria: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_critical: boolean | null
          material_id: string
          max_value: number | null
          min_value: number | null
          question_text: string
          question_type: string
          sequence_order: number | null
          target_value: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          material_id: string
          max_value?: number | null
          min_value?: number | null
          question_text: string
          question_type?: string
          sequence_order?: number | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          material_id?: string
          max_value?: number | null
          min_value?: number | null
          question_text?: string
          question_type?: string
          sequence_order?: number | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_inspection_criteria_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_issues: {
        Row: {
          created_at: string | null
          dispatched_qty: number | null
          from_location_id: string | null
          id: string
          issue_date: string
          issue_number: string
          issued_by: string | null
          job_id: string | null
          material_lot_id: string | null
          picking_by: string | null
          picking_completed_at: string | null
          purpose: string | null
          quantity_issued: number
          received_at: string | null
          received_by: string | null
          received_qty: number | null
          remarks: string | null
          shortage_reason: string | null
          status: string
          to_department: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dispatched_qty?: number | null
          from_location_id?: string | null
          id?: string
          issue_date?: string
          issue_number: string
          issued_by?: string | null
          job_id?: string | null
          material_lot_id?: string | null
          picking_by?: string | null
          picking_completed_at?: string | null
          purpose?: string | null
          quantity_issued?: number
          received_at?: string | null
          received_by?: string | null
          received_qty?: number | null
          remarks?: string | null
          shortage_reason?: string | null
          status?: string
          to_department: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dispatched_qty?: number | null
          from_location_id?: string | null
          id?: string
          issue_date?: string
          issue_number?: string
          issued_by?: string | null
          job_id?: string | null
          material_lot_id?: string | null
          picking_by?: string | null
          picking_completed_at?: string | null
          purpose?: string | null
          quantity_issued?: number
          received_at?: string | null
          received_by?: string | null
          received_qty?: number | null
          remarks?: string | null
          shortage_reason?: string | null
          status?: string
          to_department?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_issues_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_material_lot_id_fkey"
            columns: ["material_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      material_lots: {
        Row: {
          adjustment_reason: string | null
          created_at: string
          created_by: string | null
          customer_balance_kg: number | null
          customer_client_id: string | null
          expiry_date: string | null
          grade: string | null
          grn_number: string | null
          id: string
          inspection_status: string
          invoice_number: string | null
          is_adjustment: boolean
          is_customer_material: boolean | null
          lot_number: string
          material_id: string | null
          po_item_id: string | null
          product_id: string | null
          put_away_by: string | null
          put_away_date: string | null
          quantity: number
          received_date: string
          remaining_qty: number
          remarks: string | null
          storage_location: string | null
          storage_location_id: string | null
          supplier_id: string | null
          unit: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          adjustment_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_balance_kg?: number | null
          customer_client_id?: string | null
          expiry_date?: string | null
          grade?: string | null
          grn_number?: string | null
          id?: string
          inspection_status?: string
          invoice_number?: string | null
          is_adjustment?: boolean
          is_customer_material?: boolean | null
          lot_number: string
          material_id?: string | null
          po_item_id?: string | null
          product_id?: string | null
          put_away_by?: string | null
          put_away_date?: string | null
          quantity?: number
          received_date?: string
          remaining_qty?: number
          remarks?: string | null
          storage_location?: string | null
          storage_location_id?: string | null
          supplier_id?: string | null
          unit?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_balance_kg?: number | null
          customer_client_id?: string | null
          expiry_date?: string | null
          grade?: string | null
          grn_number?: string | null
          id?: string
          inspection_status?: string
          invoice_number?: string | null
          is_adjustment?: boolean
          is_customer_material?: boolean | null
          lot_number?: string
          material_id?: string | null
          po_item_id?: string | null
          product_id?: string | null
          put_away_by?: string | null
          put_away_date?: string | null
          quantity?: number
          received_date?: string
          remaining_qty?: number
          remarks?: string | null
          storage_location?: string | null
          storage_location_id?: string | null
          supplier_id?: string | null
          unit?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_lots_customer_client_id_fkey"
            columns: ["customer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      material_returns: {
        Row: {
          created_at: string | null
          from_department: string
          from_machine_id: string | null
          id: string
          quantity_kg: number
          received_by: string | null
          remarks: string | null
          return_date: string
          return_number: string
          return_type: string
          returned_by: string | null
          shift: string | null
          status: string
          to_department: string | null
          to_location_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_department: string
          from_machine_id?: string | null
          id?: string
          quantity_kg?: number
          received_by?: string | null
          remarks?: string | null
          return_date?: string
          return_number: string
          return_type?: string
          returned_by?: string | null
          shift?: string | null
          status?: string
          to_department?: string | null
          to_location_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_department?: string
          from_machine_id?: string | null
          id?: string
          quantity_kg?: number
          received_by?: string | null
          remarks?: string | null
          return_date?: string
          return_number?: string
          return_type?: string
          returned_by?: string | null
          shift?: string | null
          status?: string
          to_department?: string | null
          to_location_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_returns_from_machine_id_fkey"
            columns: ["from_machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_returns_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          current_stock: number | null
          deny_extra_tolerance: boolean | null
          grade: string | null
          hsn_code: string | null
          id: string
          is_active: boolean | null
          material_type: string
          max_stock: number | null
          min_stock: number | null
          name: string
          reorder_level: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          current_stock?: number | null
          deny_extra_tolerance?: boolean | null
          grade?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          material_type: string
          max_stock?: number | null
          min_stock?: number | null
          name: string
          reorder_level?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          current_stock?: number | null
          deny_extra_tolerance?: boolean | null
          grade?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          material_type?: string
          max_stock?: number | null
          min_stock?: number | null
          name?: string
          reorder_level?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mixer_machines: {
        Row: {
          capacity_kg: number
          created_at: string | null
          current_batch_id: string | null
          department: string
          id: string
          is_active: boolean | null
          machine_code: string
          machine_name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          capacity_kg?: number
          created_at?: string | null
          current_batch_id?: string | null
          department?: string
          id?: string
          is_active?: boolean | null
          machine_code: string
          machine_name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          capacity_kg?: number
          created_at?: string | null
          current_batch_id?: string | null
          department?: string
          id?: string
          is_active?: boolean | null
          machine_code?: string
          machine_name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mixing_batch_materials: {
        Row: {
          created_at: string | null
          id: string
          material_lot_id: string | null
          material_type: string
          mixing_batch_id: string
          owner_client_id: string | null
          quantity_used: number
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_lot_id?: string | null
          material_type?: string
          mixing_batch_id: string
          owner_client_id?: string | null
          quantity_used?: number
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_lot_id?: string | null
          material_type?: string
          mixing_batch_id?: string
          owner_client_id?: string | null
          quantity_used?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mixing_batch_materials_material_lot_id_fkey"
            columns: ["material_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_batch_materials_mixing_batch_id_fkey"
            columns: ["mixing_batch_id"]
            isOneToOne: false
            referencedRelation: "mixing_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_batch_materials_owner_client_id_fkey"
            columns: ["owner_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      mixing_batch_slots: {
        Row: {
          actual_weight_kg: number | null
          created_at: string | null
          duration_mins: number | null
          end_time: string | null
          id: string
          mixer_machine_id: string | null
          mixing_batch_id: string | null
          operator_id: string | null
          operator_name: string | null
          slot_number: number
          start_time: string | null
          status: string
          target_weight_kg: number
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          actual_weight_kg?: number | null
          created_at?: string | null
          duration_mins?: number | null
          end_time?: string | null
          id?: string
          mixer_machine_id?: string | null
          mixing_batch_id?: string | null
          operator_id?: string | null
          operator_name?: string | null
          slot_number: number
          start_time?: string | null
          status?: string
          target_weight_kg: number
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          actual_weight_kg?: number | null
          created_at?: string | null
          duration_mins?: number | null
          end_time?: string | null
          id?: string
          mixer_machine_id?: string | null
          mixing_batch_id?: string | null
          operator_id?: string | null
          operator_name?: string | null
          slot_number?: number
          start_time?: string | null
          status?: string
          target_weight_kg?: number
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mixing_batch_slots_mixer_machine_id_fkey"
            columns: ["mixer_machine_id"]
            isOneToOne: false
            referencedRelation: "mixer_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_batch_slots_mixing_batch_id_fkey"
            columns: ["mixing_batch_id"]
            isOneToOne: false
            referencedRelation: "mixing_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_batch_slots_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "mixing_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mixing_batches: {
        Row: {
          actual_weight_kg: number | null
          additives_gms: number | null
          base_material_kg: number | null
          batch_date: string
          batch_number: string
          batch_type: string
          created_at: string | null
          customer_client_id: string | null
          end_time: string | null
          id: string
          inspected_by: string | null
          masterbatch_gms: number | null
          mixer_operator: string | null
          mixing_duration_mins: number | null
          mixing_machine_id: string | null
          product_id: string | null
          quality_status: string | null
          regrind_kg: number | null
          remarks: string | null
          shift: string | null
          slot_id: string | null
          start_time: string | null
          status: string
          target_weight_kg: number | null
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          actual_weight_kg?: number | null
          additives_gms?: number | null
          base_material_kg?: number | null
          batch_date?: string
          batch_number: string
          batch_type?: string
          created_at?: string | null
          customer_client_id?: string | null
          end_time?: string | null
          id?: string
          inspected_by?: string | null
          masterbatch_gms?: number | null
          mixer_operator?: string | null
          mixing_duration_mins?: number | null
          mixing_machine_id?: string | null
          product_id?: string | null
          quality_status?: string | null
          regrind_kg?: number | null
          remarks?: string | null
          shift?: string | null
          slot_id?: string | null
          start_time?: string | null
          status?: string
          target_weight_kg?: number | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          actual_weight_kg?: number | null
          additives_gms?: number | null
          base_material_kg?: number | null
          batch_date?: string
          batch_number?: string
          batch_type?: string
          created_at?: string | null
          customer_client_id?: string | null
          end_time?: string | null
          id?: string
          inspected_by?: string | null
          masterbatch_gms?: number | null
          mixer_operator?: string | null
          mixing_duration_mins?: number | null
          mixing_machine_id?: string | null
          product_id?: string | null
          quality_status?: string | null
          regrind_kg?: number | null
          remarks?: string | null
          shift?: string | null
          slot_id?: string | null
          start_time?: string | null
          status?: string
          target_weight_kg?: number | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mixing_batches_customer_client_id_fkey"
            columns: ["customer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_batches_mixing_machine_id_fkey"
            columns: ["mixing_machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_batches_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "mixing_batch_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_batches_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "mixing_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mixing_material_receipts: {
        Row: {
          created_at: string | null
          id: string
          material_id: string | null
          material_lot_id: string | null
          mixing_batch_id: string | null
          quantity_kg: number
          receipt_date: string
          receipt_number: string
          received_by: string | null
          remarks: string | null
          shift: string | null
          source_reference_id: string | null
          source_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_id?: string | null
          material_lot_id?: string | null
          mixing_batch_id?: string | null
          quantity_kg?: number
          receipt_date?: string
          receipt_number: string
          received_by?: string | null
          remarks?: string | null
          shift?: string | null
          source_reference_id?: string | null
          source_type: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_id?: string | null
          material_lot_id?: string | null
          mixing_batch_id?: string | null
          quantity_kg?: number
          receipt_date?: string
          receipt_number?: string
          received_by?: string | null
          remarks?: string | null
          shift?: string | null
          source_reference_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mixing_material_receipts_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_material_receipts_material_lot_id_fkey"
            columns: ["material_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_material_receipts_mixing_batch_id_fkey"
            columns: ["mixing_batch_id"]
            isOneToOne: false
            referencedRelation: "mixing_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      mixing_work_order_materials: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          id: string
          leftover_compound_id: string | null
          material_lot_id: string | null
          quantity_kg: number
          source_type: string
          work_order_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          leftover_compound_id?: string | null
          material_lot_id?: string | null
          quantity_kg?: number
          source_type: string
          work_order_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          leftover_compound_id?: string | null
          material_lot_id?: string | null
          quantity_kg?: number
          source_type?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mixing_work_order_materials_leftover_compound_id_fkey"
            columns: ["leftover_compound_id"]
            isOneToOne: false
            referencedRelation: "leftover_compounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_work_order_materials_material_lot_id_fkey"
            columns: ["material_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_work_order_materials_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "mixing_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mixing_work_orders: {
        Row: {
          approved_at: string | null
          assigned_operator_id: string | null
          completed_kg: number
          created_at: string | null
          department: string
          formulation_group_id: string | null
          has_shortfall: boolean | null
          id: string
          order_number: string
          priority: string
          product_id: string | null
          production_job_id: string | null
          requested_by: string | null
          status: string
          total_required_kg: number
          updated_at: string | null
          visible_to_mixing: boolean | null
        }
        Insert: {
          approved_at?: string | null
          assigned_operator_id?: string | null
          completed_kg?: number
          created_at?: string | null
          department?: string
          formulation_group_id?: string | null
          has_shortfall?: boolean | null
          id?: string
          order_number: string
          priority?: string
          product_id?: string | null
          production_job_id?: string | null
          requested_by?: string | null
          status?: string
          total_required_kg?: number
          updated_at?: string | null
          visible_to_mixing?: boolean | null
        }
        Update: {
          approved_at?: string | null
          assigned_operator_id?: string | null
          completed_kg?: number
          created_at?: string | null
          department?: string
          formulation_group_id?: string | null
          has_shortfall?: boolean | null
          id?: string
          order_number?: string
          priority?: string
          product_id?: string | null
          production_job_id?: string | null
          requested_by?: string | null
          status?: string
          total_required_kg?: number
          updated_at?: string | null
          visible_to_mixing?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "mixing_work_orders_formulation_group_id_fkey"
            columns: ["formulation_group_id"]
            isOneToOne: false
            referencedRelation: "formulation_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_work_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixing_work_orders_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      molds: {
        Row: {
          can_send_external: boolean | null
          cavities: number
          client_id: string | null
          created_at: string | null
          current_shots: number | null
          department_id: string | null
          id: string
          last_maintenance: string | null
          location: string | null
          mold_number: string
          mold_type: string | null
          ownership: Database["public"]["Enums"]["mold_ownership"] | null
          products: string[] | null
          shot_life: number | null
          status: Database["public"]["Enums"]["mold_status"] | null
          updated_at: string | null
        }
        Insert: {
          can_send_external?: boolean | null
          cavities?: number
          client_id?: string | null
          created_at?: string | null
          current_shots?: number | null
          department_id?: string | null
          id?: string
          last_maintenance?: string | null
          location?: string | null
          mold_number: string
          mold_type?: string | null
          ownership?: Database["public"]["Enums"]["mold_ownership"] | null
          products?: string[] | null
          shot_life?: number | null
          status?: Database["public"]["Enums"]["mold_status"] | null
          updated_at?: string | null
        }
        Update: {
          can_send_external?: boolean | null
          cavities?: number
          client_id?: string | null
          created_at?: string | null
          current_shots?: number | null
          department_id?: string | null
          id?: string
          last_maintenance?: string | null
          location?: string | null
          mold_number?: string
          mold_type?: string | null
          ownership?: Database["public"]["Enums"]["mold_ownership"] | null
          products?: string[] | null
          shot_life?: number | null
          status?: Database["public"]["Enums"]["mold_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "molds_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "molds_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          code: string
          created_at: string | null
          default_shift: string
          department_id: string | null
          employee_id: string | null
          id: string
          is_active: boolean | null
          name: string
          operator_type: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          default_shift?: string
          department_id?: string | null
          employee_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          operator_type?: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          default_shift?: string
          department_id?: string | null
          employee_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          operator_type?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operators_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_entries: {
        Row: {
          client_id: string | null
          created_at: string
          entry_number: string
          id: string
          labor_cost: number
          loose_qty: number
          num_packs: number
          packed_by: string | null
          packing_date: string
          packing_type_id: string
          product_id: string
          remarks: string | null
          total_pieces: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          entry_number: string
          id?: string
          labor_cost?: number
          loose_qty?: number
          num_packs?: number
          packed_by?: string | null
          packing_date?: string
          packing_type_id: string
          product_id: string
          remarks?: string | null
          total_pieces?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          entry_number?: string
          id?: string
          labor_cost?: number
          loose_qty?: number
          num_packs?: number
          packed_by?: string | null
          packing_date?: string
          packing_type_id?: string
          product_id?: string
          remarks?: string | null
          total_pieces?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_entries_packing_type_id_fkey"
            columns: ["packing_type_id"]
            isOneToOne: false
            referencedRelation: "packing_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_sizes: {
        Row: {
          bag_cost: number
          created_at: string
          id: string
          is_active: boolean
          is_strike: boolean
          name: string
          notes: string | null
          pieces_per_bag: number
          updated_at: string
        }
        Insert: {
          bag_cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_strike?: boolean
          name: string
          notes?: string | null
          pieces_per_bag?: number
          updated_at?: string
        }
        Update: {
          bag_cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_strike?: boolean
          name?: string
          notes?: string | null
          pieces_per_bag?: number
          updated_at?: string
        }
        Relationships: []
      }
      packing_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          labor_rate_per_unit: number
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          labor_rate_per_unit?: number
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          labor_rate_per_unit?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_terms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          price_adjust_pct: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          price_adjust_pct?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          price_adjust_pct?: number
          sort_order?: number
        }
        Relationships: []
      }
      payroll_advance_links: {
        Row: {
          advance_transaction_id: string
          amount_recovered: number
          created_at: string
          id: string
          payroll_item_id: string
        }
        Insert: {
          advance_transaction_id: string
          amount_recovered?: number
          created_at?: string
          id?: string
          payroll_item_id: string
        }
        Update: {
          advance_transaction_id?: string
          amount_recovered?: number
          created_at?: string
          id?: string
          payroll_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_advance_links_advance_transaction_id_fkey"
            columns: ["advance_transaction_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_advance_links_payroll_item_id_fkey"
            columns: ["payroll_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          advance_deduction: number
          allowances_amount: number
          created_at: string
          daily_wage: number
          days_absent: number
          days_half: number
          days_holiday: number
          days_late: number
          days_leave: number
          days_off: number
          days_present: number
          earned_basic: number
          employee_id: string
          gross_pay: number
          id: string
          net_pay: number
          ot_amount: number
          ot_hours: number
          ot_rate: number
          other_deduction: number
          paid_on: string | null
          payable_days: number
          payment_mode: string
          payment_ref: string | null
          payment_status: string
          remarks: string | null
          run_id: string
          updated_at: string
        }
        Insert: {
          advance_deduction?: number
          allowances_amount?: number
          created_at?: string
          daily_wage?: number
          days_absent?: number
          days_half?: number
          days_holiday?: number
          days_late?: number
          days_leave?: number
          days_off?: number
          days_present?: number
          earned_basic?: number
          employee_id: string
          gross_pay?: number
          id?: string
          net_pay?: number
          ot_amount?: number
          ot_hours?: number
          ot_rate?: number
          other_deduction?: number
          paid_on?: string | null
          payable_days?: number
          payment_mode?: string
          payment_ref?: string | null
          payment_status?: string
          remarks?: string | null
          run_id: string
          updated_at?: string
        }
        Update: {
          advance_deduction?: number
          allowances_amount?: number
          created_at?: string
          daily_wage?: number
          days_absent?: number
          days_half?: number
          days_holiday?: number
          days_late?: number
          days_leave?: number
          days_off?: number
          days_present?: number
          earned_basic?: number
          employee_id?: string
          gross_pay?: number
          id?: string
          net_pay?: number
          ot_amount?: number
          ot_hours?: number
          ot_rate?: number
          other_deduction?: number
          paid_on?: string | null
          payable_days?: number
          payment_mode?: string
          payment_ref?: string | null
          payment_status?: string
          remarks?: string | null
          run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          created_by: string | null
          finalized_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          period_month: string
          run_code: string | null
          status: string
          total_deductions: number
          total_gross: number
          total_net: number
          updated_at: string
          working_days: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_month: string
          run_code?: string | null
          status?: string
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
          working_days?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_month?: string
          run_code?: string | null
          status?: string
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
          working_days?: number
        }
        Relationships: []
      }
      petty_cash_register_users: {
        Row: {
          can_post: boolean | null
          can_replenish: boolean | null
          created_at: string | null
          id: string
          register_id: string
          user_id: string
        }
        Insert: {
          can_post?: boolean | null
          can_replenish?: boolean | null
          created_at?: string | null
          id?: string
          register_id: string
          user_id: string
        }
        Update: {
          can_post?: boolean | null
          can_replenish?: boolean | null
          created_at?: string | null
          id?: string
          register_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_register_users_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_registers: {
        Row: {
          created_at: string
          current_balance: number
          custodian_name: string | null
          department_id: string | null
          float_amount: number
          id: string
          is_active: boolean
          last_reconciled_at: string | null
          last_reconciled_by: string | null
          opening_balance: number | null
          register_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          custodian_name?: string | null
          department_id?: string | null
          float_amount?: number
          id?: string
          is_active?: boolean
          last_reconciled_at?: string | null
          last_reconciled_by?: string | null
          opening_balance?: number | null
          register_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          custodian_name?: string | null
          department_id?: string | null
          float_amount?: number
          id?: string
          is_active?: boolean
          last_reconciled_at?: string | null
          last_reconciled_by?: string | null
          opening_balance?: number | null
          register_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_registers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          balance_after: number
          balance_before: number | null
          cash_source: string | null
          category: string | null
          created_at: string
          created_by: string | null
          created_by_user_id: string | null
          department_id: string | null
          description: string | null
          expense_type: string | null
          id: string
          machine_id: string | null
          maintenance_wo_id: string | null
          mold_id: string | null
          operator_id: string | null
          receipt_image_url: string | null
          receipt_number: string | null
          received_from: string | null
          reference_id: string | null
          reference_type: string | null
          register_id: string
          supplier_id: string | null
          tooling_job_id: string | null
          transaction_date: string
          transaction_number: string
          transaction_type: Database["public"]["Enums"]["petty_cash_transaction_type"]
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          balance_after?: number
          balance_before?: number | null
          cash_source?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_by_user_id?: string | null
          department_id?: string | null
          description?: string | null
          expense_type?: string | null
          id?: string
          machine_id?: string | null
          maintenance_wo_id?: string | null
          mold_id?: string | null
          operator_id?: string | null
          receipt_image_url?: string | null
          receipt_number?: string | null
          received_from?: string | null
          reference_id?: string | null
          reference_type?: string | null
          register_id: string
          supplier_id?: string | null
          tooling_job_id?: string | null
          transaction_date?: string
          transaction_number: string
          transaction_type?: Database["public"]["Enums"]["petty_cash_transaction_type"]
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          balance_after?: number
          balance_before?: number | null
          cash_source?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_by_user_id?: string | null
          department_id?: string | null
          description?: string | null
          expense_type?: string | null
          id?: string
          machine_id?: string | null
          maintenance_wo_id?: string | null
          mold_id?: string | null
          operator_id?: string | null
          receipt_image_url?: string | null
          receipt_number?: string | null
          received_from?: string | null
          reference_id?: string | null
          reference_type?: string | null
          register_id?: string
          supplier_id?: string | null
          tooling_job_id?: string | null
          transaction_date?: string
          transaction_number?: string
          transaction_type?: Database["public"]["Enums"]["petty_cash_transaction_type"]
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_transactions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_maintenance_wo_id_fkey"
            columns: ["maintenance_wo_id"]
            isOneToOne: false
            referencedRelation: "maintenance_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_mold_id_fkey"
            columns: ["mold_id"]
            isOneToOne: false
            referencedRelation: "molds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_tooling_job_id_fkey"
            columns: ["tooling_job_id"]
            isOneToOne: false
            referencedRelation: "tooling_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      price_calc_qty_slabs: {
        Row: {
          calc_id: string
          discount_factor: number
          id: string
          label: string | null
          max_qty: number | null
          min_qty: number | null
          slab_order: number
        }
        Insert: {
          calc_id: string
          discount_factor?: number
          id?: string
          label?: string | null
          max_qty?: number | null
          min_qty?: number | null
          slab_order: number
        }
        Update: {
          calc_id?: string
          discount_factor?: number
          id?: string
          label?: string | null
          max_qty?: number | null
          min_qty?: number | null
          slab_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_calc_qty_slabs_calc_id_fkey"
            columns: ["calc_id"]
            isOneToOne: false
            referencedRelation: "price_calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      price_calculations: {
        Row: {
          agreed_weight_g: number
          calc_number: string
          cavities: number
          client_id: string | null
          created_at: string
          created_by: string | null
          cycle_seconds: number
          delivery_term_id: string | null
          extra_inputs: Json
          id: string
          margin_pct: number
          masterbatch_pct: number
          masterbatch_rate_per_kg: number
          material_id: string | null
          material_name_snapshot: string | null
          material_rate_per_kg: number
          matrix_json: Json
          notes: string | null
          product_code_snapshot: string | null
          product_id: string | null
          product_name_snapshot: string | null
          quotation_id: string | null
          scrap_pct: number
        }
        Insert: {
          agreed_weight_g?: number
          calc_number: string
          cavities?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          cycle_seconds?: number
          delivery_term_id?: string | null
          extra_inputs?: Json
          id?: string
          margin_pct?: number
          masterbatch_pct?: number
          masterbatch_rate_per_kg?: number
          material_id?: string | null
          material_name_snapshot?: string | null
          material_rate_per_kg?: number
          matrix_json?: Json
          notes?: string | null
          product_code_snapshot?: string | null
          product_id?: string | null
          product_name_snapshot?: string | null
          quotation_id?: string | null
          scrap_pct?: number
        }
        Update: {
          agreed_weight_g?: number
          calc_number?: string
          cavities?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          cycle_seconds?: number
          delivery_term_id?: string | null
          extra_inputs?: Json
          id?: string
          margin_pct?: number
          masterbatch_pct?: number
          masterbatch_rate_per_kg?: number
          material_id?: string | null
          material_name_snapshot?: string | null
          material_rate_per_kg?: number
          matrix_json?: Json
          notes?: string | null
          product_code_snapshot?: string | null
          product_id?: string | null
          product_name_snapshot?: string | null
          quotation_id?: string | null
          scrap_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_calculations_delivery_term_id_fkey"
            columns: ["delivery_term_id"]
            isOneToOne: false
            referencedRelation: "delivery_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      printing_jobs: {
        Row: {
          actual_qty: number | null
          client_id: string | null
          colors_count: number | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          ink_formulation_id: string | null
          job_number: string
          machine_id: string | null
          planned_qty: number | null
          print_design: string | null
          product_id: string | null
          remarks: string | null
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          actual_qty?: number | null
          client_id?: string | null
          colors_count?: number | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          ink_formulation_id?: string | null
          job_number: string
          machine_id?: string | null
          planned_qty?: number | null
          print_design?: string | null
          product_id?: string | null
          remarks?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          actual_qty?: number | null
          client_id?: string | null
          colors_count?: number | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          ink_formulation_id?: string | null
          job_number?: string
          machine_id?: string | null
          planned_qty?: number | null
          print_design?: string | null
          product_id?: string | null
          remarks?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printing_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printing_jobs_ink_formulation_id_fkey"
            columns: ["ink_formulation_id"]
            isOneToOne: false
            referencedRelation: "ink_formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printing_jobs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printing_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      printing_production: {
        Row: {
          created_at: string
          created_by: string | null
          entry_time: string | null
          hour_slot: number
          id: string
          ink_batch_id: string | null
          ink_consumption_gms: number | null
          is_machine_stopped: boolean | null
          machine_id: string
          ok_qty: number | null
          operator_name: string | null
          operator_type: string | null
          printing_job_id: string | null
          product_id: string | null
          production_date: string
          rejection_qty: number | null
          remarks: string | null
          shift: string | null
          stop_duration_mins: number | null
          stop_reason_id: string | null
          stop_remarks: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_time?: string | null
          hour_slot: number
          id?: string
          ink_batch_id?: string | null
          ink_consumption_gms?: number | null
          is_machine_stopped?: boolean | null
          machine_id: string
          ok_qty?: number | null
          operator_name?: string | null
          operator_type?: string | null
          printing_job_id?: string | null
          product_id?: string | null
          production_date?: string
          rejection_qty?: number | null
          remarks?: string | null
          shift?: string | null
          stop_duration_mins?: number | null
          stop_reason_id?: string | null
          stop_remarks?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_time?: string | null
          hour_slot?: number
          id?: string
          ink_batch_id?: string | null
          ink_consumption_gms?: number | null
          is_machine_stopped?: boolean | null
          machine_id?: string
          ok_qty?: number | null
          operator_name?: string | null
          operator_type?: string | null
          printing_job_id?: string | null
          product_id?: string | null
          production_date?: string
          rejection_qty?: number | null
          remarks?: string | null
          shift?: string | null
          stop_duration_mins?: number | null
          stop_reason_id?: string | null
          stop_remarks?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printing_production_ink_batch_id_fkey"
            columns: ["ink_batch_id"]
            isOneToOne: false
            referencedRelation: "ink_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printing_production_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printing_production_printing_job_id_fkey"
            columns: ["printing_job_id"]
            isOneToOne: false
            referencedRelation: "printing_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printing_production_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printing_production_stop_reason_id_fkey"
            columns: ["stop_reason_id"]
            isOneToOne: false
            referencedRelation: "stop_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      product_inspection_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          product_id: string
          sequence_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sequence_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_inspection_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_materials: {
        Row: {
          created_at: string | null
          id: string
          material_id: string
          material_role: string
          product_id: string
          ratio_percent: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_id: string
          material_role?: string
          product_id: string
          ratio_percent?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_id?: string
          material_role?: string
          product_id?: string
          ratio_percent?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_molds: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          mold_id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          mold_id: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          mold_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_molds_mold_id_fkey"
            columns: ["mold_id"]
            isOneToOne: false
            referencedRelation: "molds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_molds_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_packing_config: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          labor_rate_override: number | null
          packing_type_id: string
          product_id: string
          qty_per_pack: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          labor_rate_override?: number | null
          packing_type_id: string
          product_id: string
          qty_per_pack?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          labor_rate_override?: number | null
          packing_type_id?: string
          product_id?: string
          qty_per_pack?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_packing_config_packing_type_id_fkey"
            columns: ["packing_type_id"]
            isOneToOne: false
            referencedRelation: "packing_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packing_config_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          labour_price: number
          note: string | null
          price_unit: string
          product_id: string
          selling_price: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from: string
          id?: string
          labour_price?: number
          note?: string | null
          price_unit?: string
          product_id: string
          selling_price?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          labour_price?: number
          note?: string | null
          price_unit?: string
          product_id?: string
          selling_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sets: {
        Row: {
          component_product_id: string
          created_at: string | null
          id: string
          quantity: number
          set_product_id: string
          updated_at: string | null
        }
        Insert: {
          component_product_id: string
          created_at?: string | null
          id?: string
          quantity?: number
          set_product_id: string
          updated_at?: string | null
        }
        Update: {
          component_product_id?: string
          created_at?: string | null
          id?: string
          quantity?: number
          set_product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_sets_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sets_set_product_id_fkey"
            columns: ["set_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_cost_defaults: {
        Row: {
          created_at: string
          id: string
          ke_rate_per_unit: number
          labour_rate_per_min: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ke_rate_per_unit?: number
          labour_rate_per_min?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ke_rate_per_unit?: number
          labour_rate_per_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      production_jobs: {
        Row: {
          actual_qty: number | null
          client_id: string
          created_at: string | null
          cycle_time: number | null
          department_id: string | null
          end_date: string | null
          end_hour: number | null
          final_product_id: string | null
          good_qty: number | null
          id: string
          is_assembly_job: boolean | null
          job_number: string
          job_type: Database["public"]["Enums"]["job_type"]
          machine_id: string | null
          machine_ready: boolean | null
          material_ready: boolean | null
          mold_id: string | null
          mold_ready: boolean | null
          planned_qty: number
          priority: string | null
          product_code: string
          product_id: string | null
          product_name: string
          regrind_qty: number | null
          rejection_qty: number | null
          requisition_status: string | null
          sales_order_item_id: string | null
          scheduled_date: string | null
          scheduled_shift: string | null
          start_date: string | null
          start_hour: number | null
          status: Database["public"]["Enums"]["job_status"] | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          actual_qty?: number | null
          client_id: string
          created_at?: string | null
          cycle_time?: number | null
          department_id?: string | null
          end_date?: string | null
          end_hour?: number | null
          final_product_id?: string | null
          good_qty?: number | null
          id?: string
          is_assembly_job?: boolean | null
          job_number: string
          job_type?: Database["public"]["Enums"]["job_type"]
          machine_id?: string | null
          machine_ready?: boolean | null
          material_ready?: boolean | null
          mold_id?: string | null
          mold_ready?: boolean | null
          planned_qty?: number
          priority?: string | null
          product_code: string
          product_id?: string | null
          product_name: string
          regrind_qty?: number | null
          rejection_qty?: number | null
          requisition_status?: string | null
          sales_order_item_id?: string | null
          scheduled_date?: string | null
          scheduled_shift?: string | null
          start_date?: string | null
          start_hour?: number | null
          status?: Database["public"]["Enums"]["job_status"] | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_qty?: number | null
          client_id?: string
          created_at?: string | null
          cycle_time?: number | null
          department_id?: string | null
          end_date?: string | null
          end_hour?: number | null
          final_product_id?: string | null
          good_qty?: number | null
          id?: string
          is_assembly_job?: boolean | null
          job_number?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          machine_id?: string | null
          machine_ready?: boolean | null
          material_ready?: boolean | null
          mold_id?: string | null
          mold_ready?: boolean | null
          planned_qty?: number
          priority?: string | null
          product_code?: string
          product_id?: string | null
          product_name?: string
          regrind_qty?: number | null
          rejection_qty?: number | null
          requisition_status?: string | null
          sales_order_item_id?: string | null
          scheduled_date?: string | null
          scheduled_shift?: string | null
          start_date?: string | null
          start_hour?: number | null
          status?: Database["public"]["Enums"]["job_status"] | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_final_product_id_fkey"
            columns: ["final_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_mold_id_fkey"
            columns: ["mold_id"]
            isOneToOne: false
            referencedRelation: "molds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_sales_order_item_id_fkey"
            columns: ["sales_order_item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      production_lots: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_hour: number | null
          id: string
          job_id: string | null
          lot_number: string
          machine_id: string
          product_id: string | null
          production_date: string
          remarks: string | null
          shift: string
          start_hour: number | null
          status: string
          total_hold_qty: number
          total_ok_qty: number
          total_regrind_qty: number
          total_reject_qty: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_hour?: number | null
          id?: string
          job_id?: string | null
          lot_number: string
          machine_id: string
          product_id?: string | null
          production_date?: string
          remarks?: string | null
          shift: string
          start_hour?: number | null
          status?: string
          total_hold_qty?: number
          total_ok_qty?: number
          total_regrind_qty?: number
          total_reject_qty?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_hour?: number | null
          id?: string
          job_id?: string | null
          lot_number?: string
          machine_id?: string
          product_id?: string | null
          production_date?: string
          remarks?: string | null
          shift?: string
          start_hour?: number | null
          status?: string
          total_hold_qty?: number
          total_ok_qty?: number
          total_regrind_qty?: number
          total_reject_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_lots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lots_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_material_receipts: {
        Row: {
          compound_dispatch_id: string | null
          created_at: string | null
          hour_slot: number | null
          id: string
          job_id: string | null
          machine_id: string
          quantity_received_kg: number
          receipt_date: string
          received_by: string | null
          shift: string | null
          updated_at: string | null
        }
        Insert: {
          compound_dispatch_id?: string | null
          created_at?: string | null
          hour_slot?: number | null
          id?: string
          job_id?: string | null
          machine_id: string
          quantity_received_kg?: number
          receipt_date?: string
          received_by?: string | null
          shift?: string | null
          updated_at?: string | null
        }
        Update: {
          compound_dispatch_id?: string | null
          created_at?: string | null
          hour_slot?: number | null
          id?: string
          job_id?: string | null
          machine_id?: string
          quantity_received_kg?: number
          receipt_date?: string
          received_by?: string | null
          shift?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_material_receipts_compound_dispatch_id_fkey"
            columns: ["compound_dispatch_id"]
            isOneToOne: false
            referencedRelation: "compound_dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_material_receipts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_material_receipts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          additives: Json | null
          agreed_weight_notes: string | null
          agreed_weight_per_piece: number | null
          agreed_weight_unit: string | null
          carton_packing_override: number | null
          category: string | null
          cavities: number | null
          client_id: string | null
          code: string
          color: string | null
          created_at: string | null
          cycle_time: number | null
          description: string | null
          fitting_assembly_labour: number | null
          fitting_component1_cost: number | null
          fitting_component2_cost: number | null
          fitting_labour_override: number | null
          formulation_group_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_assembled: boolean
          ke_rate_override: number | null
          labour_price: number | null
          labour_rate_per_min_override: number | null
          masterbatch_id: string | null
          masterbatch_ratio: number | null
          material_id: string | null
          mold_id: string | null
          name: string
          pieces_per_hour_override: number | null
          price_unit: string | null
          product_type: string | null
          quality_inspection_override: number | null
          selling_price: number | null
          transport_override: number | null
          updated_at: string | null
          waste_percent: number | null
          weight_per_piece: number | null
        }
        Insert: {
          additives?: Json | null
          agreed_weight_notes?: string | null
          agreed_weight_per_piece?: number | null
          agreed_weight_unit?: string | null
          carton_packing_override?: number | null
          category?: string | null
          cavities?: number | null
          client_id?: string | null
          code: string
          color?: string | null
          created_at?: string | null
          cycle_time?: number | null
          description?: string | null
          fitting_assembly_labour?: number | null
          fitting_component1_cost?: number | null
          fitting_component2_cost?: number | null
          fitting_labour_override?: number | null
          formulation_group_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_assembled?: boolean
          ke_rate_override?: number | null
          labour_price?: number | null
          labour_rate_per_min_override?: number | null
          masterbatch_id?: string | null
          masterbatch_ratio?: number | null
          material_id?: string | null
          mold_id?: string | null
          name: string
          pieces_per_hour_override?: number | null
          price_unit?: string | null
          product_type?: string | null
          quality_inspection_override?: number | null
          selling_price?: number | null
          transport_override?: number | null
          updated_at?: string | null
          waste_percent?: number | null
          weight_per_piece?: number | null
        }
        Update: {
          additives?: Json | null
          agreed_weight_notes?: string | null
          agreed_weight_per_piece?: number | null
          agreed_weight_unit?: string | null
          carton_packing_override?: number | null
          category?: string | null
          cavities?: number | null
          client_id?: string | null
          code?: string
          color?: string | null
          created_at?: string | null
          cycle_time?: number | null
          description?: string | null
          fitting_assembly_labour?: number | null
          fitting_component1_cost?: number | null
          fitting_component2_cost?: number | null
          fitting_labour_override?: number | null
          formulation_group_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_assembled?: boolean
          ke_rate_override?: number | null
          labour_price?: number | null
          labour_rate_per_min_override?: number | null
          masterbatch_id?: string | null
          masterbatch_ratio?: number | null
          material_id?: string | null
          mold_id?: string | null
          name?: string
          pieces_per_hour_override?: number | null
          price_unit?: string | null
          product_type?: string | null
          quality_inspection_override?: number | null
          selling_price?: number | null
          transport_override?: number | null
          updated_at?: string | null
          waste_percent?: number | null
          weight_per_piece?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_formulation_group_id_fkey"
            columns: ["formulation_group_id"]
            isOneToOne: false
            referencedRelation: "formulation_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_masterbatch_id_fkey"
            columns: ["masterbatch_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_mold_id_fkey"
            columns: ["mold_id"]
            isOneToOne: false
            referencedRelation: "molds"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          allow_extra_receipt: boolean | null
          created_at: string
          id: string
          line_total: number | null
          material_id: string
          ordered_qty: number
          pending_qty: number | null
          po_id: string
          received_qty: number
          remarks: string | null
          tolerance_percent: number | null
          unit_id: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          allow_extra_receipt?: boolean | null
          created_at?: string
          id?: string
          line_total?: number | null
          material_id: string
          ordered_qty?: number
          pending_qty?: number | null
          po_id: string
          received_qty?: number
          remarks?: string | null
          tolerance_percent?: number | null
          unit_id?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          allow_extra_receipt?: boolean | null
          created_at?: string
          id?: string
          line_total?: number | null
          material_id?: string
          ordered_qty?: number
          pending_qty?: number | null
          po_id?: string
          received_qty?: number
          remarks?: string | null
          tolerance_percent?: number | null
          unit_id?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          delivery_date: string | null
          id: string
          po_date: string
          po_number: string
          remarks: string | null
          source_type: string
          status: string
          supplier_id: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          po_date?: string
          po_number: string
          remarks?: string | null
          source_type?: string
          status?: string
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          po_date?: string
          po_number?: string
          remarks?: string | null
          source_type?: string
          status?: string
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          id: string
          labour_price: number
          line_total: number
          product_id: string
          qty: number
          quotation_id: string
          selling_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          labour_price?: number
          line_total?: number
          product_id: string
          qty?: number
          quotation_id: string
          selling_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          labour_price?: number
          line_total?: number
          product_id?: string
          qty?: number
          quotation_id?: string
          selling_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          quote_date: string
          quote_number: string
          status: string
          subtotal: number
          tax_amount: number
          tax_percent: number
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quote_date?: string
          quote_number: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_percent?: number
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quote_date?: string
          quote_number?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_percent?: number
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      regrind_availability: {
        Row: {
          available_qty_kg: number
          client_id: string | null
          id: string
          last_updated: string | null
          material_id: string | null
          source_department: string | null
          source_location_id: string | null
        }
        Insert: {
          available_qty_kg?: number
          client_id?: string | null
          id?: string
          last_updated?: string | null
          material_id?: string | null
          source_department?: string | null
          source_location_id?: string | null
        }
        Update: {
          available_qty_kg?: number
          client_id?: string | null
          id?: string
          last_updated?: string | null
          material_id?: string | null
          source_department?: string | null
          source_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regrind_availability_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regrind_availability_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regrind_availability_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      rejected_fg_stock: {
        Row: {
          created_at: string
          current_stock: number
          id: string
          last_updated: string
          product_id: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          id?: string
          last_updated?: string
          product_id: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          id?: string
          last_updated?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rejected_fg_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      rejection_reasons: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          columns: Json | null
          created_at: string | null
          created_by: string | null
          display_options: Json | null
          filters: Json
          grouping: string[] | null
          id: string
          is_default: boolean | null
          name: string
          report_type: string
          sort_by: string | null
          sort_direction: string | null
          updated_at: string | null
        }
        Insert: {
          columns?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_options?: Json | null
          filters?: Json
          grouping?: string[] | null
          id?: string
          is_default?: boolean | null
          name: string
          report_type: string
          sort_by?: string | null
          sort_direction?: string | null
          updated_at?: string | null
        }
        Update: {
          columns?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_options?: Json | null
          filters?: Json
          grouping?: string[] | null
          id?: string
          is_default?: boolean | null
          name?: string
          report_type?: string
          sort_by?: string | null
          sort_direction?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      requisition_items: {
        Row: {
          adjusted_at: string | null
          adjusted_by: string | null
          adjusted_qty_kg: number | null
          adjustment_reason: string | null
          available_qty_kg: number | null
          created_at: string | null
          id: string
          is_regrind: boolean | null
          issued_qty_kg: number | null
          material_id: string | null
          material_role: string | null
          original_qty_kg: number | null
          remarks: string | null
          required_qty_kg: number
          requisition_id: string
          source_location_id: string | null
          source_type: string | null
          status: string | null
        }
        Insert: {
          adjusted_at?: string | null
          adjusted_by?: string | null
          adjusted_qty_kg?: number | null
          adjustment_reason?: string | null
          available_qty_kg?: number | null
          created_at?: string | null
          id?: string
          is_regrind?: boolean | null
          issued_qty_kg?: number | null
          material_id?: string | null
          material_role?: string | null
          original_qty_kg?: number | null
          remarks?: string | null
          required_qty_kg?: number
          requisition_id: string
          source_location_id?: string | null
          source_type?: string | null
          status?: string | null
        }
        Update: {
          adjusted_at?: string | null
          adjusted_by?: string | null
          adjusted_qty_kg?: number | null
          adjustment_reason?: string | null
          available_qty_kg?: number | null
          created_at?: string | null
          id?: string
          is_regrind?: boolean | null
          issued_qty_kg?: number | null
          material_id?: string | null
          material_role?: string | null
          original_qty_kg?: number | null
          remarks?: string | null
          required_qty_kg?: number
          requisition_id?: string
          source_location_id?: string | null
          source_type?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisition_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_items_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "store_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_items_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          role: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          role?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          role?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_status_update: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_status_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_status_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      sales_invoice_corrections: {
        Row: {
          created_at: string
          dispatch_item_id: string | null
          id: string
          invoice_id: string
          line_label: string | null
          qty: number | null
          rate: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispatch_item_id?: string | null
          id?: string
          invoice_id: string
          line_label?: string | null
          qty?: number | null
          rate?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispatch_item_id?: string | null
          id?: string
          invoice_id?: string
          line_label?: string | null
          qty?: number | null
          rate?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_corrections_dispatch_item_id_fkey"
            columns: ["dispatch_item_id"]
            isOneToOne: false
            referencedRelation: "dispatch_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_corrections_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_dispatches: {
        Row: {
          created_at: string
          dispatch_id: string
          id: string
          invoice_id: string
        }
        Insert: {
          created_at?: string
          dispatch_id: string
          id?: string
          invoice_id: string
        }
        Update: {
          created_at?: string
          dispatch_id?: string
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_dispatches_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: true
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_dispatches_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          amount_paid: number
          bill_to_address: string | null
          bill_to_gst: string | null
          bill_to_name: string | null
          client_id: string
          created_at: string
          created_by: string | null
          freight_charges: number
          gl_voucher_id: string | null
          id: string
          invoice_date: string
          invoice_number: string
          invoice_number_override: string | null
          invoice_type: string
          notes: string | null
          other_charges: number
          payment_status: string
          period_from: string | null
          period_to: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_percent: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          bill_to_address?: string | null
          bill_to_gst?: string | null
          bill_to_name?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          freight_charges?: number
          gl_voucher_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_number_override?: string | null
          invoice_type?: string
          notes?: string | null
          other_charges?: number
          payment_status?: string
          period_from?: string | null
          period_to?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_percent?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          bill_to_address?: string | null
          bill_to_gst?: string | null
          bill_to_name?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          freight_charges?: number
          gl_voucher_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_number_override?: string | null
          invoice_type?: string
          notes?: string | null
          other_charges?: number
          payment_status?: string
          period_from?: string | null
          period_to?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_percent?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_gl_voucher_id_fkey"
            columns: ["gl_voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          dispatched_qty: number
          id: string
          labour_price: number
          line_total: number
          notes: string | null
          ordered_qty: number
          produced_qty: number
          product_id: string
          sales_order_id: string
          selling_price: number
        }
        Insert: {
          created_at?: string
          dispatched_qty?: number
          id?: string
          labour_price?: number
          line_total?: number
          notes?: string | null
          ordered_qty?: number
          produced_qty?: number
          product_id: string
          sales_order_id: string
          selling_price?: number
        }
        Update: {
          created_at?: string
          dispatched_qty?: number
          id?: string
          labour_price?: number
          line_total?: number
          notes?: string | null
          ordered_qty?: number
          produced_qty?: number
          product_id?: string
          sales_order_id?: string
          selling_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          customer_po_date: string | null
          customer_po_number: string | null
          id: string
          notes: string | null
          order_date: string
          quotation_id: string | null
          required_date: string | null
          so_number: string
          status: string
          subtotal: number
          tax_amount: number
          tax_percent: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          customer_po_date?: string | null
          customer_po_number?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          quotation_id?: string | null
          required_date?: string | null
          so_number: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_percent?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          customer_po_date?: string | null
          customer_po_number?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          quotation_id?: string | null
          required_date?: string | null
          so_number?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_percent?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_production: {
        Row: {
          created_at: string | null
          downtime_minutes: number | null
          downtime_reason: string | null
          good_qty: number | null
          id: string
          job_id: string
          machine_id: string
          operator_name: string | null
          production_date: string
          regrind_qty: number | null
          rejection_qty: number | null
          remarks: string | null
          shift: Database["public"]["Enums"]["shift_type"]
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          downtime_minutes?: number | null
          downtime_reason?: string | null
          good_qty?: number | null
          id?: string
          job_id: string
          machine_id: string
          operator_name?: string | null
          production_date?: string
          regrind_qty?: number | null
          rejection_qty?: number | null
          remarks?: string | null
          shift: Database["public"]["Enums"]["shift_type"]
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          downtime_minutes?: number | null
          downtime_reason?: string | null
          good_qty?: number | null
          id?: string
          job_id?: string
          machine_id?: string
          operator_name?: string | null
          production_date?: string
          regrind_qty?: number | null
          rejection_qty?: number | null
          remarks?: string | null
          shift?: Database["public"]["Enums"]["shift_type"]
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_production_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_production_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_rosters: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          person_id: string
          person_type: string
          roster_date: string
          shift: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          person_id: string
          person_type: string
          roster_date: string
          shift: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          person_id?: string
          person_type?: string
          roster_date?: string
          shift?: string
          updated_at?: string
        }
        Relationships: []
      }
      shift_settings: {
        Row: {
          color: string | null
          created_at: string | null
          display_name: string | null
          end_hour: number
          end_minute: number
          grace_minutes: number
          id: string
          is_active: boolean | null
          lunch_minutes: number
          ot_threshold_hours: number
          shift_name: string
          standard_hours: number
          start_hour: number
          start_minute: number
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_name?: string | null
          end_hour: number
          end_minute?: number
          grace_minutes?: number
          id?: string
          is_active?: boolean | null
          lunch_minutes?: number
          ot_threshold_hours?: number
          shift_name: string
          standard_hours?: number
          start_hour: number
          start_minute?: number
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_name?: string | null
          end_hour?: number
          end_minute?: number
          grace_minutes?: number
          id?: string
          is_active?: boolean | null
          lunch_minutes?: number
          ot_threshold_hours?: number
          shift_name?: string
          standard_hours?: number
          start_hour?: number
          start_minute?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          created_at: string
          employee_id: string | null
          id: string
          is_active: boolean
          name: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustment_log: {
        Row: {
          adjusted_at: string
          adjusted_by: string | null
          after_qty: number
          as_of_date: string
          before_qty: number
          client_id: string | null
          consumption_ledger_id: string | null
          consumption_material_id: string | null
          created_at: string
          delta: number
          id: string
          item_code: string | null
          item_id: string
          item_name: string | null
          material_lot_id: string | null
          reason: string
          reason_type: string | null
          regrind_lot_id: string | null
          reverse_labour_revenue: boolean
          reverse_material_consumption: boolean
          scope: string
          stock_transaction_id: string | null
        }
        Insert: {
          adjusted_at?: string
          adjusted_by?: string | null
          after_qty?: number
          as_of_date: string
          before_qty?: number
          client_id?: string | null
          consumption_ledger_id?: string | null
          consumption_material_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          item_code?: string | null
          item_id: string
          item_name?: string | null
          material_lot_id?: string | null
          reason: string
          reason_type?: string | null
          regrind_lot_id?: string | null
          reverse_labour_revenue?: boolean
          reverse_material_consumption?: boolean
          scope: string
          stock_transaction_id?: string | null
        }
        Update: {
          adjusted_at?: string
          adjusted_by?: string | null
          after_qty?: number
          as_of_date?: string
          before_qty?: number
          client_id?: string | null
          consumption_ledger_id?: string | null
          consumption_material_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          item_code?: string | null
          item_id?: string
          item_name?: string | null
          material_lot_id?: string | null
          reason?: string
          reason_type?: string | null
          regrind_lot_id?: string | null
          reverse_labour_revenue?: boolean
          reverse_material_consumption?: boolean
          scope?: string
          stock_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_log_consumption_ledger_id_fkey"
            columns: ["consumption_ledger_id"]
            isOneToOne: false
            referencedRelation: "customer_material_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_log_consumption_material_id_fkey"
            columns: ["consumption_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_log_regrind_lot_id_fkey"
            columns: ["regrind_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          balance_after: number
          created_at: string
          id: string
          performed_by: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          remarks: string | null
          settled_at: string | null
          settled_by: string | null
          transaction_type: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          id?: string
          performed_by?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          remarks?: string | null
          settled_at?: string | null
          settled_by?: string | null
          transaction_type: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          id?: string
          performed_by?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          remarks?: string | null
          settled_at?: string | null
          settled_by?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stop_reasons: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      storage_locations: {
        Row: {
          bin: string | null
          bin_number: string | null
          capacity_kg: number | null
          created_at: string | null
          current_stock_kg: number | null
          id: string
          is_active: boolean | null
          location_code: string
          location_name: string
          material_type: string | null
          rack_number: string | null
          row: string | null
          row_number: string | null
          store_id: string | null
          sub_zone: string | null
          updated_at: string | null
          zone: string
        }
        Insert: {
          bin?: string | null
          bin_number?: string | null
          capacity_kg?: number | null
          created_at?: string | null
          current_stock_kg?: number | null
          id?: string
          is_active?: boolean | null
          location_code: string
          location_name: string
          material_type?: string | null
          rack_number?: string | null
          row?: string | null
          row_number?: string | null
          store_id?: string | null
          sub_zone?: string | null
          updated_at?: string | null
          zone?: string
        }
        Update: {
          bin?: string | null
          bin_number?: string | null
          capacity_kg?: number | null
          created_at?: string | null
          current_stock_kg?: number | null
          id?: string
          is_active?: boolean | null
          location_code?: string
          location_name?: string
          material_type?: string | null
          rack_number?: string | null
          row?: string | null
          row_number?: string | null
          store_id?: string | null
          sub_zone?: string | null
          updated_at?: string | null
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_requisitions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          department_id: string | null
          id: string
          job_id: string | null
          machine_id: string | null
          manager_approved: boolean | null
          manager_approved_at: string | null
          manager_approved_by: string | null
          planned_production_qty: number | null
          rejection_reason: string | null
          remarks: string | null
          requested_by: string | null
          requires_approval: boolean | null
          requisition_date: string
          requisition_number: string
          shift: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          job_id?: string | null
          machine_id?: string | null
          manager_approved?: boolean | null
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          planned_production_qty?: number | null
          rejection_reason?: string | null
          remarks?: string | null
          requested_by?: string | null
          requires_approval?: boolean | null
          requisition_date?: string
          requisition_number: string
          shift?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          job_id?: string | null
          machine_id?: string | null
          manager_approved?: boolean | null
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          planned_production_qty?: number | null
          rejection_reason?: string | null
          remarks?: string | null
          requested_by?: string | null
          requires_approval?: boolean | null
          requisition_date?: string
          requisition_number?: string
          shift?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_requisitions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_requisitions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_requisitions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          floor_location: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          floor_location?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          floor_location?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          bank_details: string | null
          category: string | null
          code: string
          contact_person: string | null
          created_at: string | null
          email: string | null
          expense_category: string | null
          gst_number: string | null
          id: string
          is_active: boolean | null
          labor_rate: number | null
          labor_rate_unit: string | null
          lead_time_days: number | null
          linked_client_id: string | null
          min_order_qty: number | null
          name: string
          ntn_number: string | null
          payment_terms: number | null
          petty_cash_limit: number | null
          phone: string | null
          process_types: string[] | null
          supplier_type: string
          turnaround_days: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          category?: string | null
          code: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          expense_category?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          labor_rate?: number | null
          labor_rate_unit?: string | null
          lead_time_days?: number | null
          linked_client_id?: string | null
          min_order_qty?: number | null
          name: string
          ntn_number?: string | null
          payment_terms?: number | null
          petty_cash_limit?: number | null
          phone?: string | null
          process_types?: string[] | null
          supplier_type?: string
          turnaround_days?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          category?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          expense_category?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          labor_rate?: number | null
          labor_rate_unit?: string | null
          lead_time_days?: number | null
          linked_client_id?: string | null
          min_order_qty?: number | null
          name?: string
          ntn_number?: string | null
          payment_terms?: number | null
          petty_cash_limit?: number | null
          phone?: string | null
          process_types?: string[] | null
          supplier_type?: string
          turnaround_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_linked_client_id_fkey"
            columns: ["linked_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      system_overhead_categories: {
        Row: {
          category_type: string
          created_at: string
          id: string
          is_active: boolean
          monthly_amount: number
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          category_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_amount?: number
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          category_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_amount?: number
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_overhead_settings: {
        Row: {
          apply_to_costing: boolean
          id: string
          operating_hours_per_month: number
          updated_at: string
        }
        Insert: {
          apply_to_costing?: boolean
          id?: string
          operating_hours_per_month?: number
          updated_at?: string
        }
        Update: {
          apply_to_costing?: boolean
          id?: string
          operating_hours_per_month?: number
          updated_at?: string
        }
        Relationships: []
      }
      tooling_external_work: {
        Row: {
          actual_return: string | null
          cost: number | null
          created_at: string | null
          expected_return: string | null
          id: string
          job_id: string
          process_name: string
          remarks: string | null
          sent_date: string | null
          status: string | null
          updated_at: string | null
          vendor_name: string
        }
        Insert: {
          actual_return?: string | null
          cost?: number | null
          created_at?: string | null
          expected_return?: string | null
          id?: string
          job_id: string
          process_name: string
          remarks?: string | null
          sent_date?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_name: string
        }
        Update: {
          actual_return?: string | null
          cost?: number | null
          created_at?: string | null
          expected_return?: string | null
          id?: string
          job_id?: string
          process_name?: string
          remarks?: string | null
          sent_date?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tooling_external_work_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "tooling_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      tooling_job_materials: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          issue_date: string | null
          job_id: string
          material_type: string
          quantity: number
          remarks: string | null
          supplier_name: string | null
          total_cost: number | null
          unit: string | null
          unit_rate: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          issue_date?: string | null
          job_id: string
          material_type: string
          quantity?: number
          remarks?: string | null
          supplier_name?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          issue_date?: string | null
          job_id?: string
          material_type?: string
          quantity?: number
          remarks?: string | null
          supplier_name?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tooling_job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "tooling_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      tooling_job_stages: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          assigned_worker: string | null
          created_at: string | null
          estimated_hours: number | null
          external_work_id: string | null
          id: string
          is_custom: boolean
          is_external: boolean | null
          is_redo: boolean | null
          job_id: string
          last_status_update: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          redo_of_stage_id: string | null
          remarks: string | null
          sequence_order: number
          stage_id: string | null
          stage_name: string
          status: string | null
          time_spent_hours: number | null
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_worker?: string | null
          created_at?: string | null
          estimated_hours?: number | null
          external_work_id?: string | null
          id?: string
          is_custom?: boolean
          is_external?: boolean | null
          is_redo?: boolean | null
          job_id: string
          last_status_update?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          redo_of_stage_id?: string | null
          remarks?: string | null
          sequence_order?: number
          stage_id?: string | null
          stage_name: string
          status?: string | null
          time_spent_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_worker?: string | null
          created_at?: string | null
          estimated_hours?: number | null
          external_work_id?: string | null
          id?: string
          is_custom?: boolean
          is_external?: boolean | null
          is_redo?: boolean | null
          job_id?: string
          last_status_update?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          redo_of_stage_id?: string | null
          remarks?: string | null
          sequence_order?: number
          stage_id?: string | null
          stage_name?: string
          status?: string | null
          time_spent_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tooling_job_stages_external_work_id_fkey"
            columns: ["external_work_id"]
            isOneToOne: false
            referencedRelation: "tooling_external_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooling_job_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "tooling_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooling_job_stages_redo_of_stage_id_fkey"
            columns: ["redo_of_stage_id"]
            isOneToOne: false
            referencedRelation: "tooling_job_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooling_job_stages_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tooling_stages_master"
            referencedColumns: ["id"]
          },
        ]
      }
      tooling_job_tooling: {
        Row: {
          created_at: string | null
          id: string
          issue_date: string | null
          job_id: string
          quantity: number
          remarks: string | null
          specification: string | null
          tool_type: string
          total_cost: number | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          issue_date?: string | null
          job_id: string
          quantity?: number
          remarks?: string | null
          specification?: string | null
          tool_type: string
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          issue_date?: string | null
          job_id?: string
          quantity?: number
          remarks?: string | null
          specification?: string | null
          tool_type?: string
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tooling_job_tooling_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "tooling_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      tooling_jobs: {
        Row: {
          actual_delivery_date: string | null
          assigned_to: string | null
          cavities: number | null
          client_id: string | null
          created_at: string | null
          current_stage_id: string | null
          department_id: string | null
          description: string | null
          id: string
          image_url: string | null
          job_number: string
          job_type: string
          mold_category: string | null
          order_date: string | null
          priority: string | null
          quoted_amount: number | null
          remarks: string | null
          specifications: string | null
          status: string | null
          sub_category_id: string | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          assigned_to?: string | null
          cavities?: number | null
          client_id?: string | null
          created_at?: string | null
          current_stage_id?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          job_number: string
          job_type?: string
          mold_category?: string | null
          order_date?: string | null
          priority?: string | null
          quoted_amount?: number | null
          remarks?: string | null
          specifications?: string | null
          status?: string | null
          sub_category_id?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          assigned_to?: string | null
          cavities?: number | null
          client_id?: string | null
          created_at?: string | null
          current_stage_id?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          job_number?: string
          job_type?: string
          mold_category?: string | null
          order_date?: string | null
          priority?: string | null
          quoted_amount?: number | null
          remarks?: string | null
          specifications?: string | null
          status?: string | null
          sub_category_id?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tooling_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooling_jobs_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "tooling_job_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooling_jobs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooling_jobs_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "tooling_sub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tooling_stage_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          job_id: string
          stage_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          job_id: string
          stage_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          job_id?: string
          stage_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tooling_stage_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "tooling_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooling_stage_attachments_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tooling_job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      tooling_stage_notes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          job_id: string
          note_text: string
          stage_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          job_id: string
          note_text: string
          stage_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          job_id?: string
          note_text?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tooling_stage_notes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "tooling_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooling_stage_notes_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tooling_job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      tooling_stage_time_logs: {
        Row: {
          created_at: string | null
          hours_worked: number
          id: string
          job_id: string
          log_date: string
          stage_id: string
          updated_at: string | null
          work_description: string | null
          worker_name: string
        }
        Insert: {
          created_at?: string | null
          hours_worked: number
          id?: string
          job_id: string
          log_date?: string
          stage_id: string
          updated_at?: string | null
          work_description?: string | null
          worker_name: string
        }
        Update: {
          created_at?: string | null
          hours_worked?: number
          id?: string
          job_id?: string
          log_date?: string
          stage_id?: string
          updated_at?: string | null
          work_description?: string | null
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tooling_stage_time_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "tooling_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooling_stage_time_logs_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tooling_job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      tooling_stages_master: {
        Row: {
          created_at: string | null
          default_duration_days: number | null
          description: string | null
          id: string
          is_active: boolean | null
          mold_category: string[] | null
          name: string
          sequence_order: number
          sub_categories: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_duration_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          mold_category?: string[] | null
          name: string
          sequence_order?: number
          sub_categories?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_duration_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          mold_category?: string[] | null
          name?: string
          sequence_order?: number
          sub_categories?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tooling_sub_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_category: string
          sequence_order: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_category: string
          sequence_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_category?: string
          sequence_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tooling_update_log: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          new_value: string | null
          old_value: string | null
          stage_id: string | null
          update_type: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          new_value?: string | null
          old_value?: string | null
          stage_id?: string | null
          update_type: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          new_value?: string | null
          old_value?: string | null
          stage_id?: string | null
          update_type?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tooling_update_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "tooling_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooling_update_log_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tooling_job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_logs: {
        Row: {
          allocation_type: string | null
          client_id: string | null
          company_share: number | null
          created_at: string
          created_by: string | null
          customer_share: number | null
          delivery_stops: Json | null
          direction: Database["public"]["Enums"]["transport_direction"]
          dispatch_number: string | null
          distance_km: number | null
          driver_name: string | null
          from_location: string | null
          fuel_cost: number | null
          grn_number: string | null
          id: string
          is_customer_paid: boolean | null
          log_date: string
          log_number: string
          other_charges: number | null
          paid_by: string | null
          payment_method: string | null
          petty_cash_register_id: string | null
          petty_cash_txn_id: string | null
          purpose: string | null
          remarks: string | null
          to_location: string | null
          toll_charges: number | null
          total_cost: number | null
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          allocation_type?: string | null
          client_id?: string | null
          company_share?: number | null
          created_at?: string
          created_by?: string | null
          customer_share?: number | null
          delivery_stops?: Json | null
          direction?: Database["public"]["Enums"]["transport_direction"]
          dispatch_number?: string | null
          distance_km?: number | null
          driver_name?: string | null
          from_location?: string | null
          fuel_cost?: number | null
          grn_number?: string | null
          id?: string
          is_customer_paid?: boolean | null
          log_date?: string
          log_number: string
          other_charges?: number | null
          paid_by?: string | null
          payment_method?: string | null
          petty_cash_register_id?: string | null
          petty_cash_txn_id?: string | null
          purpose?: string | null
          remarks?: string | null
          to_location?: string | null
          toll_charges?: number | null
          total_cost?: number | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          allocation_type?: string | null
          client_id?: string | null
          company_share?: number | null
          created_at?: string
          created_by?: string | null
          customer_share?: number | null
          delivery_stops?: Json | null
          direction?: Database["public"]["Enums"]["transport_direction"]
          dispatch_number?: string | null
          distance_km?: number | null
          driver_name?: string | null
          from_location?: string | null
          fuel_cost?: number | null
          grn_number?: string | null
          id?: string
          is_customer_paid?: boolean | null
          log_date?: string
          log_number?: string
          other_charges?: number | null
          paid_by?: string | null
          payment_method?: string | null
          petty_cash_register_id?: string | null
          petty_cash_txn_id?: string | null
          purpose?: string | null
          remarks?: string | null
          to_location?: string | null
          toll_charges?: number | null
          total_cost?: number | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_logs_petty_cash_register_id_fkey"
            columns: ["petty_cash_register_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_logs_petty_cash_txn_id_fkey"
            columns: ["petty_cash_txn_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_settings: {
        Row: {
          adda_bora_rate: number
          adda_fixed_km: number
          id: string
          karachi_load_per_trip_pcs: number
          km_per_litre: number
          petrol_rate_per_litre: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          adda_bora_rate?: number
          adda_fixed_km?: number
          id?: string
          karachi_load_per_trip_pcs?: number
          km_per_litre?: number
          petrol_rate_per_litre?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          adda_bora_rate?: number
          adda_fixed_km?: number
          id?: string
          karachi_load_per_trip_pcs?: number
          km_per_litre?: number
          petrol_rate_per_litre?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      units_of_measure: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          activity_type: string
          created_at: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_custom_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          custom_role_id: string
          expires_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          custom_role_id: string
          expires_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          custom_role_id?: string
          expires_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_departments: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_status_update: boolean | null
          can_view: boolean | null
          created_at: string | null
          expires_at: string | null
          id: string
          module: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_status_update?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          module: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_status_update?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          module?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_material_issue_items: {
        Row: {
          component_id: string | null
          created_at: string
          description: string | null
          finished_good_id: string | null
          id: string
          issue_id: string
          item_type: string
          material_lot_id: string | null
          product_id: string | null
          quantity: number
          remarks: string | null
          source_location_id: string | null
          total_value: number | null
          unit: string
          unit_cost: number | null
        }
        Insert: {
          component_id?: string | null
          created_at?: string
          description?: string | null
          finished_good_id?: string | null
          id?: string
          issue_id: string
          item_type: string
          material_lot_id?: string | null
          product_id?: string | null
          quantity: number
          remarks?: string | null
          source_location_id?: string | null
          total_value?: number | null
          unit?: string
          unit_cost?: number | null
        }
        Update: {
          component_id?: string | null
          created_at?: string
          description?: string | null
          finished_good_id?: string | null
          id?: string
          issue_id?: string
          item_type?: string
          material_lot_id?: string | null
          product_id?: string | null
          quantity?: number
          remarks?: string | null
          source_location_id?: string | null
          total_value?: number | null
          unit?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_material_issue_items_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "vendor_material_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_material_issue_items_material_lot_id_fkey"
            columns: ["material_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_material_issue_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_material_issues: {
        Row: {
          created_at: string
          created_by: string | null
          external_job_id: string | null
          external_mold_job_id: string | null
          id: string
          issue_date: string
          issue_number: string | null
          issued_by: string | null
          purpose: string
          remarks: string | null
          status: string
          updated_at: string
          vehicle_no: string | null
          vendor_name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          external_job_id?: string | null
          external_mold_job_id?: string | null
          id?: string
          issue_date?: string
          issue_number?: string | null
          issued_by?: string | null
          purpose?: string
          remarks?: string | null
          status?: string
          updated_at?: string
          vehicle_no?: string | null
          vendor_name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          external_job_id?: string | null
          external_mold_job_id?: string | null
          id?: string
          issue_date?: string
          issue_number?: string | null
          issued_by?: string | null
          purpose?: string
          remarks?: string | null
          status?: string
          updated_at?: string
          vehicle_no?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_material_issues_external_job_id_fkey"
            columns: ["external_job_id"]
            isOneToOne: false
            referencedRelation: "external_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_material_issues_external_mold_job_id_fkey"
            columns: ["external_mold_job_id"]
            isOneToOne: false
            referencedRelation: "external_mold_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_material_return_items: {
        Row: {
          component_id: string | null
          created_at: string
          description: string | null
          dest_location_id: string | null
          finished_good_id: string | null
          id: string
          issue_item_id: string | null
          material_lot_id: string | null
          product_id: string | null
          quantity: number
          remarks: string | null
          return_id: string
          return_type: string
          unit: string
          variance_qty: number | null
        }
        Insert: {
          component_id?: string | null
          created_at?: string
          description?: string | null
          dest_location_id?: string | null
          finished_good_id?: string | null
          id?: string
          issue_item_id?: string | null
          material_lot_id?: string | null
          product_id?: string | null
          quantity: number
          remarks?: string | null
          return_id: string
          return_type: string
          unit?: string
          variance_qty?: number | null
        }
        Update: {
          component_id?: string | null
          created_at?: string
          description?: string | null
          dest_location_id?: string | null
          finished_good_id?: string | null
          id?: string
          issue_item_id?: string | null
          material_lot_id?: string | null
          product_id?: string | null
          quantity?: number
          remarks?: string | null
          return_id?: string
          return_type?: string
          unit?: string
          variance_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_material_return_items_issue_item_id_fkey"
            columns: ["issue_item_id"]
            isOneToOne: false
            referencedRelation: "vendor_material_issue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_material_return_items_material_lot_id_fkey"
            columns: ["material_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_material_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_material_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "vendor_material_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_material_returns: {
        Row: {
          created_at: string
          created_by: string | null
          external_job_id: string | null
          external_mold_job_id: string | null
          id: string
          issue_id: string | null
          received_by: string | null
          remarks: string | null
          return_date: string
          return_number: string | null
          status: string
          updated_at: string
          vehicle_no: string | null
          vendor_name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          external_job_id?: string | null
          external_mold_job_id?: string | null
          id?: string
          issue_id?: string | null
          received_by?: string | null
          remarks?: string | null
          return_date?: string
          return_number?: string | null
          status?: string
          updated_at?: string
          vehicle_no?: string | null
          vendor_name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          external_job_id?: string | null
          external_mold_job_id?: string | null
          id?: string
          issue_id?: string | null
          received_by?: string | null
          remarks?: string | null
          return_date?: string
          return_number?: string | null
          status?: string
          updated_at?: string
          vehicle_no?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_material_returns_external_job_id_fkey"
            columns: ["external_job_id"]
            isOneToOne: false
            referencedRelation: "external_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_material_returns_external_mold_job_id_fkey"
            columns: ["external_mold_job_id"]
            isOneToOne: false
            referencedRelation: "external_mold_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_material_returns_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "vendor_material_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          is_reconciled: boolean
          line_no: number
          party_id: string | null
          party_type: string | null
          reconciled_on: string | null
          voucher_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          is_reconciled?: boolean
          line_no?: number
          party_id?: string | null
          party_type?: string | null
          reconciled_on?: string | null
          voucher_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          is_reconciled?: boolean
          line_no?: number
          party_id?: string | null
          party_type?: string | null
          reconciled_on?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_lines_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          attachment_url: string | null
          created_at: string
          created_by: string | null
          id: string
          narration: string | null
          posted_at: string | null
          posted_by: string | null
          reference: string | null
          reversal_of: string | null
          source_id: string | null
          source_table: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          updated_at: string
          voucher_date: string
          voucher_number: string
          voucher_type: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          narration?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          reversal_of?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          voucher_date: string
          voucher_number: string
          voucher_type: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          narration?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          reversal_of?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          voucher_date?: string
          voucher_number?: string
          voucher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      attendance_reason_stats: {
        Row: {
          distinct_editors: number | null
          edit_count: number | null
          edit_reason_code: string | null
          first_at: string | null
          last_at: string | null
          person_id: string | null
          person_type: string | null
          reason_label: string | null
        }
        Relationships: []
      }
      cheque_register: {
        Row: {
          amount: number | null
          bank_account_name: string | null
          cheque_date: string | null
          cheque_number: string | null
          cheque_status: string | null
          direction: string | null
          doc_number: string | null
          entry_date: string | null
          party_name: string | null
          source_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _acc_create_posted_voucher: {
        Args: {
          _lines: Json
          _narration: string
          _reference: string
          _source_id: string
          _source_table: string
          _vdate: string
          _vnumber: string
          _vtype: string
        }
        Returns: string
      }
      acc_system_account: { Args: { _key: string }; Returns: string }
      account_opening_balance: {
        Args: { p_account_id: string; p_before: string }
        Returns: number
      }
      ap_aging: {
        Args: { p_as_of: string }
        Returns: {
          current_0_30: number
          days_31_60: number
          days_61_90: number
          days_over_90: number
          supplier_id: string
          supplier_name: string
          total_outstanding: number
        }[]
      }
      ar_aging: {
        Args: { p_as_of: string }
        Returns: {
          client_id: string
          client_name: string
          current_0_30: number
          days_31_60: number
          days_61_90: number
          days_over_90: number
          total_outstanding: number
        }[]
      }
      assert_open_period: { Args: { _date: string }; Returns: undefined }
      auto_mark_absent_for_date: {
        Args: { target_date: string }
        Returns: number
      }
      balance_sheet: {
        Args: { p_as_of: string }
        Returns: {
          account_id: string
          amount: number
          code: string
          name: string
          section: string
        }[]
      }
      can_edit_invoice: { Args: { _invoice_id: string }; Returns: boolean }
      create_ap_payment: {
        Args: {
          p_allocations?: Json
          p_amount: number
          p_bank_account_id?: string
          p_cheque_date?: string
          p_cheque_number?: string
          p_mode: string
          p_notes?: string
          p_payment_date: string
          p_reference?: string
          p_supplier_id: string
        }
        Returns: string
      }
      create_ar_receipt: {
        Args: {
          p_allocations?: Json
          p_amount: number
          p_bank_account_id?: string
          p_cheque_date?: string
          p_cheque_number?: string
          p_client_id: string
          p_mode: string
          p_notes?: string
          p_receipt_date: string
          p_reference?: string
        }
        Returns: string
      }
      create_bank_account: {
        Args: {
          p_account_number?: string
          p_bank_name?: string
          p_iban?: string
          p_name: string
        }
        Returns: string
      }
      dispose_hold_inventory: {
        Args: { p_action: string; p_hold_id: string; p_reason?: string }
        Returns: undefined
      }
      general_ledger: {
        Args: { p_account_id: string; p_from: string; p_to: string }
        Returns: {
          credit: number
          debit: number
          description: string
          entry_date: string
          narration: string
          party_id: string
          party_type: string
          running_balance: number
          voucher_id: string
          voucher_number: string
          voucher_type: string
        }[]
      }
      generate_external_mold_job_number: { Args: never; Returns: string }
      generate_hold_lot_number: { Args: never; Returns: string }
      generate_material_lot_number: { Args: never; Returns: string }
      generate_production_lot_number: {
        Args: {
          p_machine_id: string
          p_production_date: string
          p_shift: string
        }
        Returns: string
      }
      generate_tooling_job_number: { Args: never; Returns: string }
      get_employee_work_pattern: {
        Args: { _employee_id: string }
        Returns: {
          code: string
          color: string
          created_at: string
          end_hour: number
          end_minute: number
          grace_minutes: number
          id: string
          is_active: boolean
          lunch_minutes: number
          name: string
          ot_threshold_hours: number
          standard_days_per_month: number
          standard_hours: number
          start_hour: number
          start_minute: number
          updated_at: string
          weekly_off_days: number[]
        }
        SetofOptions: {
          from: "*"
          to: "hr_work_patterns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_machine_performance_summary: {
        Args: { p_date?: string; p_machine_id: string; p_shift?: string }
        Returns: {
          current_job_id: string
          last_hour_ok_qty: number
          machine_id: string
          mtd_breakdown_count: number
          open_work_orders: number
          shift_ok_qty: number
          shift_rejection_qty: number
          today_hold_qty: number
          today_ok_qty: number
          today_production_kg: number
          today_regrind_qty: number
          today_rejection_qty: number
          today_stop_mins: number
        }[]
      }
      get_overhead_rate: {
        Args: { p_date: string; p_type: string }
        Returns: number
      }
      get_product_price_on: {
        Args: { _on_date: string; _product_id: string }
        Returns: {
          labour_price: number
          price_unit: string
          selling_price: number
        }[]
      }
      get_user_activity_with_email: {
        Args: { limit_count?: number }
        Returns: {
          activity_type: string
          created_at: string
          email: string
          id: string
          user_agent: string
          user_id: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_accounting_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_role_activity: {
        Args: {
          p_action: string
          p_actor_id: string
          p_details?: Json
          p_role?: string
          p_target_user_id?: string
        }
        Returns: string
      }
      mark_ap_cheque_bounced: {
        Args: { p_payment_id: string }
        Returns: undefined
      }
      mark_ar_cheque_bounced: {
        Args: { p_receipt_id: string }
        Returns: undefined
      }
      next_doc_number: {
        Args: { _doc_type: string; _prefix: string }
        Returns: string
      }
      next_quotation_number: { Args: never; Returns: string }
      next_sales_order_number: { Args: never; Returns: string }
      next_voucher_number: {
        Args: { _vdate: string; _vtype: string }
        Returns: string
      }
      party_ledger: {
        Args: {
          p_from: string
          p_party_id: string
          p_party_type: string
          p_to: string
        }
        Returns: {
          credit: number
          debit: number
          description: string
          entry_date: string
          narration: string
          running_balance: number
          voucher_id: string
          voucher_number: string
          voucher_type: string
        }[]
      }
      party_opening_balance: {
        Args: { p_before: string; p_party_id: string; p_party_type: string }
        Returns: number
      }
      post_ap_bill: { Args: { p_bill_id: string }; Returns: string }
      post_payroll_run: { Args: { p_run_id: string }; Returns: string }
      post_sales_invoice_to_gl: {
        Args: { p_invoice_id: string }
        Returns: string
      }
      post_voucher: { Args: { p_voucher_id: string }; Returns: undefined }
      profit_and_loss: {
        Args: { p_from: string; p_to: string }
        Returns: {
          account_id: string
          account_type: string
          amount: number
          code: string
          name: string
        }[]
      }
      propagate_daily_log_finalise: {
        Args: { p_actor: string; p_log_id: string }
        Returns: undefined
      }
      recalc_quotation_totals: { Args: { _qid: string }; Returns: undefined }
      recalc_sales_order_totals: { Args: { _soid: string }; Returns: undefined }
      recalc_so_item_progress: { Args: { _soi_id: string }; Returns: undefined }
      recalc_so_status: { Args: { _so_id: string }; Returns: undefined }
      recompute_assembled_product: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      recompute_invoice_totals: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
      recompute_sales_invoice_totals: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      refresh_daily_log_suggestions: {
        Args: { p_log_id: string }
        Returns: undefined
      }
      resolve_shift: {
        Args: { _date: string; _person_id: string; _person_type: string }
        Returns: string
      }
      reverse_daily_log_finalise: {
        Args: { p_actor: string; p_log_id: string }
        Returns: undefined
      }
      reverse_voucher: {
        Args: { p_date?: string; p_reason?: string; p_voucher_id: string }
        Returns: string
      }
      save_invoice_corrections: {
        Args: { p_header: Json; p_invoice_id: string; p_lines: Json }
        Returns: undefined
      }
      settle_assembly_reserves: {
        Args: { p_product_id: string; p_qty: number }
        Returns: number
      }
      trial_balance: {
        Args: { p_from: string; p_to: string }
        Returns: {
          account_id: string
          account_type: string
          closing: number
          code: string
          is_group: boolean
          name: string
          opening: number
          parent_id: string
          period_credit: number
          period_debit: number
        }[]
      }
      upsert_daily_log_for_hourly: {
        Args: { p_hourly_id: string }
        Returns: string
      }
      verify_hourly_entry: {
        Args: {
          p_hold: number
          p_hourly_id: string
          p_ok: number
          p_reason?: string
          p_regrind: number
          p_rejection: number
        }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "income" | "expense"
      app_role:
        | "admin"
        | "production_manager"
        | "quality_manager"
        | "operator"
        | "assistant"
        | "data_entry"
        | "store_incharge"
        | "mixer_operator"
        | "tooling_maintenance"
        | "maintenance_operator"
        | "hr_manager"
        | "super_user"
        | "sales_manager"
        | "accountant"
        | "finance_manager"
      job_status: "planned" | "in_progress" | "completed" | "on_hold"
      job_type: "labour_job" | "job_with_material" | "own_product"
      machine_status: "running" | "idle" | "stopped" | "maintenance"
      maintenance_asset_type: "machine" | "mold"
      maintenance_priority: "critical" | "high" | "medium" | "low"
      maintenance_schedule_type: "time_based" | "usage_based"
      maintenance_stage_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "skipped"
      maintenance_status:
        | "pending"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
      maintenance_work_order_type: "preventive" | "breakdown" | "inspection"
      mold_ownership: "company" | "client"
      mold_status: "active" | "maintenance" | "retired"
      petty_cash_transaction_type: "expense" | "replenishment" | "adjustment"
      shift_type: "morning" | "afternoon" | "night" | "day"
      transport_direction: "inward" | "outward" | "internal"
      voucher_status: "draft" | "posted" | "reversed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "income", "expense"],
      app_role: [
        "admin",
        "production_manager",
        "quality_manager",
        "operator",
        "assistant",
        "data_entry",
        "store_incharge",
        "mixer_operator",
        "tooling_maintenance",
        "maintenance_operator",
        "hr_manager",
        "super_user",
        "sales_manager",
        "accountant",
        "finance_manager",
      ],
      job_status: ["planned", "in_progress", "completed", "on_hold"],
      job_type: ["labour_job", "job_with_material", "own_product"],
      machine_status: ["running", "idle", "stopped", "maintenance"],
      maintenance_asset_type: ["machine", "mold"],
      maintenance_priority: ["critical", "high", "medium", "low"],
      maintenance_schedule_type: ["time_based", "usage_based"],
      maintenance_stage_status: [
        "pending",
        "in_progress",
        "completed",
        "skipped",
      ],
      maintenance_status: [
        "pending",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
      maintenance_work_order_type: ["preventive", "breakdown", "inspection"],
      mold_ownership: ["company", "client"],
      mold_status: ["active", "maintenance", "retired"],
      petty_cash_transaction_type: ["expense", "replenishment", "adjustment"],
      shift_type: ["morning", "afternoon", "night", "day"],
      transport_direction: ["inward", "outward", "internal"],
      voucher_status: ["draft", "posted", "reversed"],
    },
  },
} as const
