(() => {
  const cfg = window.SANLEAN_SUPABASE;
  if (!cfg || !window.supabase) return;
  const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.sanleanSupabase = client;
  window.SanLeanAccount = {
    async session(){ return (await client.auth.getSession()).data.session; },
    async signIn(email,password){ return client.auth.signInWithPassword({email,password}); },
    async signOut(){ return client.auth.signOut(); },
    async resetPassword(email){ return client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/Usuario/'}); },
    async updatePassword(password){ return client.auth.updateUser({password}); },
    async loadSettings(){
      const session=(await client.auth.getSession()).data.session;
      if(!session) return null;
      const {data,error}=await client.from('user_roulette_settings').select('settings').eq('user_id',session.user.id).maybeSingle();
      if(error) throw error;
      return data?.settings || {weights:{},bonusEntries:{}};
    },
    async saveSettings(settings){
      const session=(await client.auth.getSession()).data.session;
      if(!session) throw new Error('No authenticated session');
      const {error}=await client.from('user_roulette_settings').upsert({user_id:session.user.id,settings},{onConflict:'user_id'});
      if(error) throw error;
    },
    onAuthChange(callback){ return client.auth.onAuthStateChange(callback); }
  };
})();
