import { supabaseAdmin } from '@/lib/supabase/admin';
import WarRoomDashboard from '@/components/WarRoomDashboard';

export const revalidate = 0; 

export default async function WarRoom() {
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-10">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center max-w-md">
          <h2 className="text-red-400 font-black uppercase tracking-widest mb-4">Erreur de Connexion Base de Données</h2>
          <p className="text-slate-400 text-sm italic">"{error.message}"</p>
        </div>
      </div>
    );
  }

  // Casting data to ensure type safety for the client component
  const typedLeads = (leads || []).map(lead => ({
    ...lead,
    // Ensure nested objects exist to avoid crashes
    audit_data: lead.audit_data || {},
    strategy: lead.strategy || {},
    archi_data: lead.archi_data || {},
    qualification: lead.qualification || {},
    business_potential_score: lead.business_potential_score || 0,
    estimated_deal_value: lead.estimated_deal_value || 0,
    closer_output: lead.closer_output || {},
    proposition_data: lead.proposition_data || {},
    proposal_data: lead.proposal_data || {},
    commercial_status: lead.commercial_status || { budget_validated: false, authority_confirmed: false, timing_confirmed: false }
  }));

  return <WarRoomDashboard initialLeads={typedLeads} />;
}
