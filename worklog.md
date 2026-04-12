---
Task ID: 1
Agent: main
Task: Add Supabase Management API integration with Personal Access Token support

Work Log:
- Created 8 API proxy routes under /api/supabase/: projects/[ref] (GET/DELETE), pause, restore, health, api-keys, branches, organizations
- Created supabase-projects.tsx component with full project management UI: PAT connection flow, project list, project detail view (health, API keys, branches), create project dialog, pause/restore/delete actions
- Added "Supabase Projects" navigation icon to the icon rail in dashboard.tsx
- Added SupabaseManagementSection component to Settings view in sidebar.tsx for PAT input/disconnect
- Wired SupabaseProjects component into sidebar's "supabase" view
- Updated SidebarView type to include "bookmarks" and "supabase" across dashboard.tsx

Stage Summary:
- 8 new API proxy routes: /api/supabase/projects/[ref], pause, restore, health, api-keys, branches, /api/supabase/organizations
- 1 new UI component: supabase-projects.tsx (550+ lines) with project list, detail, create views
- PAT can be added from both the Supabase Projects view and the Settings view
- Lint passes clean
