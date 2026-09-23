(() => {
  const cfg = window.SANLEAN_SUPABASE;
  if (!cfg || !window.supabase) return;
  const SIM_KEY='sanlean-roulette-simulation-v1';
  const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.sanleanSupabase = client;
  let syncing=false, saveTimer=null;
  const api=window.SanLeanAccount={
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
      if(!session) return;
      const clean={weights:settings?.weights||{},bonusEntries:settings?.bonusEntries||{}};
      const {error}=await client.from('user_roulette_settings').upsert({user_id:session.user.id,settings:clean},{onConflict:'user_id'});
      if(error) throw error;
    },
    async syncToBrowser(){
      const settings=await api.loadSettings();
      if(!settings)return false;
      syncing=true; localStorage.setItem(SIM_KEY,JSON.stringify({...settings,updatedAt:Date.now(),source:'supabase'})); syncing=false;
      return true;
    },
    onAuthChange(callback){ return client.auth.onAuthStateChange(callback); }
  };

  // Keep the existing, already-tested roulette data format as a local cache,
  // while Supabase is the persistent source for authenticated accounts.
  const nativeSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    nativeSet.call(this,key,value);
    if(this===localStorage && key===SIM_KEY && !syncing){
      clearTimeout(saveTimer);
      saveTimer=setTimeout(async()=>{try{const parsed=JSON.parse(value);await api.saveSettings(parsed)}catch(err){console.error('SanLean Supabase save:',err)}},180);
    }
  };

  function msg(text,isError=false){const el=document.getElementById('loginMessage');if(el){el.textContent=text||'';el.classList.toggle('error',!!isError)}}
  function showPanel(session){
    const login=document.getElementById('loginView'),panel=document.getElementById('panelView');
    if(login)login.hidden=true;if(panel)panel.hidden=false;
    const email=session?.user?.email||'';
    const pe=document.getElementById('profileEmail');if(pe)pe.value=email;
    setTimeout(()=>{const active=document.querySelector('.panel-tabs button.active');if(active)active.click()},0);
  }
  function showLogin(){const login=document.getElementById('loginView'),panel=document.getElementById('panelView');if(panel)panel.hidden=true;if(login)login.hidden=false}

  // Capture auth actions before the old demo handlers. This lets us migrate safely
  // without changing the stable roulette rendering code.
  document.addEventListener('submit',async e=>{
    if(e.target?.id!=='demoLogin')return;
    e.preventDefault();e.stopImmediatePropagation();
    const email=document.getElementById('loginEmail')?.value.trim();
    const password=document.getElementById('loginPassword')?.value||'';
    msg('INGRESANDO...');
    const {data,error}=await api.signIn(email,password);
    if(error){msg('No se pudo iniciar sesión. Revisá el correo y la contraseña.',true);return}
    try{await api.syncToBrowser()}catch(err){console.error(err);msg('La cuenta ingresó, pero no se pudo cargar MI PANEL.',true);return}
    msg('');showPanel(data.session);
  },true);

  document.addEventListener('click',async e=>{
    const logout=e.target.closest?.('#demoLogout');
    if(logout){e.preventDefault();e.stopImmediatePropagation();await api.signOut();localStorage.removeItem(SIM_KEY);showLogin();return}
    const forgot=e.target.closest?.('#forgotPassword');
    if(forgot){e.preventDefault();e.stopImmediatePropagation();const email=document.getElementById('loginEmail')?.value.trim();if(!email){msg('Escribí primero tu correo electrónico.',true);return}const {error}=await api.resetPassword(email);msg(error?'No se pudo enviar el correo de recuperación.':'Te enviamos un correo para recuperar tu contraseña.',!!error);return}
    const change=e.target.closest?.('#changePassword');
    if(change){e.preventDefault();e.stopImmediatePropagation();const a=document.getElementById('newPassword')?.value||'',b=document.getElementById('repeatPassword')?.value||'',out=document.getElementById('passwordMessage');if(a.length<8){if(out)out.textContent='La contraseña debe tener al menos 8 caracteres.';return}if(a!==b){if(out)out.textContent='Las contraseñas no coinciden.';return}const {error}=await api.updatePassword(a);if(out)out.textContent=error?'No se pudo cambiar la contraseña.':'Contraseña actualizada correctamente.';if(!error){document.getElementById('newPassword').value='';document.getElementById('repeatPassword').value=''}return}
  },true);

  window.addEventListener('DOMContentLoaded',async()=>{
    const session=await api.session();
    if(!session){showLogin();return}
    try{await api.syncToBrowser()}catch(err){console.error('SanLean Supabase load:',err)}
    showPanel(session);
  });
})();
