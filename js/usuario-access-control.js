// SANLEAN — roles y permisos de USUARIO.
(()=>{
  if(window.SanLeanAccess)return;

  const ADMIN_EMAIL='leandrosanchez10@gmail.com';
  const ALL_PERMISSIONS=['overlays','votes','challenges','giveaways','bits','platforms','killers','killerPerks','survivor','tournament'];
  const LABELS={
    overlays:'OVERLAYS OBS',votes:'CARTAS',challenges:'DESAFÍOS',giveaways:'SORTEOS',
    bits:'BITS / ALERTAS',platforms:'TWITCH / KICK',killers:'KILLERS',
    killerPerks:'PERKS DE KILLERS',survivor:'PERKS DE SUPERVIVIENTES',tournament:'TORNEO 1VS1'
  };
  let context={role:'guest',permissions:[],permissionsByWorkspace:{},ownedWorkspaceIds:[],activeWorkspaceId:null,email:'',username:'',ready:false};

  const normalize=v=>String(v||'').trim().toLowerCase();
  const unique=a=>[...new Set((Array.isArray(a)?a:[]).filter(x=>ALL_PERMISSIONS.includes(x)))];

  function previewCollaboratorPermissions(identity){
    try{
      const list=JSON.parse(localStorage.getItem('sanlean-collaborators-preview')||'[]');
      const id=normalize(identity);
      const match=(Array.isArray(list)?list:[]).find(c=>normalize(c?.identifier||c?.email)===id);
      return unique(match?.permissions);
    }catch{return []}
  }

  function metadataPermissions(user){
    const m=user?.user_metadata||{};
    return unique(m.collaborator_permissions||m.permissions||[]);
  }

  async function resolve(){
    const account=window.SanLeanAccount;
    const db=window.sanleanSupabase||window.SanLeanConnectionsClient||null;
    if(!db)return context;
    const session=account?await account.session():(await db.auth.getSession()).data.session;
    if(!session){context={role:'guest',permissions:[],permissionsByWorkspace:{},ownedWorkspaceIds:[],activeWorkspaceId:null,email:'',username:'',ready:true};return context}

    const email=normalize(session.user.email);
    let profile=null;
    try{
      if(account)profile=await account.loadProfile();
      else {
        const {data}=await db.from('user_profiles').select('first_name,last_name,username,role,onboarding_completed').eq('user_id',session.user.id).maybeSingle();
        profile=data||null;
      }
    }catch{}
    const username=normalize(profile?.username);
    let role=normalize(profile?.role)||'owner';
    let permissions=[];
    let permissionsByWorkspace={};

    let ownedWorkspaceIds=[];
    if(email===ADMIN_EMAIL){
      role='admin';
      permissions=[...ALL_PERMISSIONS];
    }else{
      let memberships=[];
      try{
        const [{data:memberData},{data:ownedData}]=await Promise.all([
          db.from('workspace_members').select('workspace_id,role,permissions').eq('user_id',session.user.id),
          db.from('streamer_workspaces').select('id').eq('owner_user_id',session.user.id)
        ]);
        memberships=Array.isArray(memberData)?memberData:[];
        ownedWorkspaceIds=(Array.isArray(ownedData)?ownedData:[]).map(x=>x.id);
      }catch{}
      memberships.forEach(m=>{permissionsByWorkspace[m.workspace_id]=unique(m.permissions)});
      const membershipPermissions=unique(memberships.flatMap(m=>m.permissions||[]));

      if(ownedWorkspaceIds.length){
        role='owner';
        permissions=[...ALL_PERMISSIONS];
      }else if(role==='collaborator'||memberships.length){
        role='collaborator';
        permissions=membershipPermissions;
        if(!permissions.length)permissions=metadataPermissions(session.user);
        if(!permissions.length)permissions=previewCollaboratorPermissions(email);
        if(!permissions.length&&username)permissions=previewCollaboratorPermissions(username);
      }else{
        role='owner';
        permissions=[...ALL_PERMISSIONS];
      }
    }

    context={role,permissions,permissionsByWorkspace,ownedWorkspaceIds,activeWorkspaceId:null,email,username,ready:true};
    document.documentElement.dataset.sanleanRole=role;
    window.dispatchEvent(new CustomEvent('sanlean:access-ready',{detail:{...context}}));
    return context;
  }

  function can(section){
    if(context.role==='admin')return true;
    if(section==='home')return true;
    if(context.activeWorkspaceId&&context.ownedWorkspaceIds?.includes(context.activeWorkspaceId))return true;
    if(context.activeWorkspaceId){
      const scoped=context.permissionsByWorkspace?.[context.activeWorkspaceId];
      if(Array.isArray(scoped))return scoped.includes(section)||scoped.includes('*');
    }
    if(context.role==='owner')return true;
    if(context.role!=='collaborator')return false;
    return context.permissions.includes(section)||context.permissions.includes('*');
  }

  function setWorkspace(workspaceId){
    context.activeWorkspaceId=workspaceId||null;
    window.dispatchEvent(new CustomEvent('sanlean:access-changed',{detail:{...context,permissions:[...context.permissions]}}));
  }

  function firstAllowed(){
    return ALL_PERMISSIONS.find(can)||'home';
  }

  window.SanLeanAccess={
    resolve,
    get:()=>({...context,permissions:[...context.permissions]}),
    can,
    setWorkspace,
    firstAllowed,
    labels:{...LABELS},
    allPermissions:[...ALL_PERMISSIONS],
    adminEmail:ADMIN_EMAIL
  };

  window.addEventListener('sanlean:workspace-changed',e=>setWorkspace(e.detail?.workspaceId||null));
  window.addEventListener('DOMContentLoaded',()=>resolve().catch(()=>{}),{once:true});
})();