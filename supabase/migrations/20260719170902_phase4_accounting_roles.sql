-- Phase 4 Accounting: new RBAC roles for the accounting module.
alter type public.app_role add value if not exists 'accountant';
alter type public.app_role add value if not exists 'finance_manager';
