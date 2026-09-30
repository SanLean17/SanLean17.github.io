// SANLEAN — helpers exclusivos de USUARIO para las tarjetas de KILLERS/PERKS.
// 1) Enriquece el buscador de PERKS DE KILLERS con el asesino propietario y sus aliases.
// 2) Mantiene KILLERS/PERKS ocultos por defecto y permite mostrarlos sin desplazar el viewport.
(()=>{
  const OWNER_BY_KEY={
    '00_aNursesCalling':'nurse enfermera sally smithson la enfermera',
    '49_stridor':'nurse enfermera sally smithson la enfermera',
    '52_thanatophobia':'nurse enfermera sally smithson la enfermera',
    '01_agitation':'trapper trampero evan macmillan el trampero',
    '08_brutalStrength':'trapper trampero evan macmillan el trampero',
    '54_unnervingPresence':'trapper trampero evan macmillan el trampero',
    '02_bamboozle':'clown payaso kenneth chase el payaso',
    '10_coulrophobia':'clown payaso kenneth chase el payaso',
    '40_popGoesTheWeasel':'clown payaso kenneth chase el payaso',
    '03_barbecueAndChilli':'leatherface cannibal canibal bubba el canibal',
    '18_franklinsDemise':'leatherface cannibal canibal bubba el canibal',
    '31_knockOut':'leatherface cannibal canibal bubba el canibal',
    '04_beastOfPrey':'huntress cazadora anna la cazadora',
    '22_hexHuntressLullaby':'huntress cazadora anna la cazadora',
    '51_territorialImperative':'huntress cazadora anna la cazadora',
    '06_bloodWarden':'freddy nightmare pesadilla la pesadilla freddy krueger',
    '17_fireUp':'freddy nightmare pesadilla la pesadilla freddy krueger',
    '43_rememberMe':'freddy nightmare pesadilla la pesadilla freddy krueger',
    '07_bloodhound':'wraith espectro philip ojomo el espectro',
    '41_predator':'wraith espectro philip ojomo el espectro',
    '45_shadowborn':'wraith espectro philip ojomo el espectro',
    '09_corruptIntervention':'plague plaga adiris la plaga',
    '11_darkDevotion':'plague plaga adiris la plaga',
    '27_infectiousFright':'plague plaga adiris la plaga',
    '35_monitorAndAbuse':'doctor herman carter el doctor',
    '37_overcharge':'doctor herman carter el doctor',
    '38_overwhelmingPresence':'doctor herman carter el doctor',
    '13_discordance':'legion frank julie susie joey la legion el legion',
    '30_ironMaiden':'legion frank julie susie joey la legion el legion',
    '33_madGrit':'legion frank julie susie joey la legion el legion',
    '15_dyingLight':'myers shape forma michael myers la forma',
    '39_playWithYourFood':'myers shape forma michael myers la forma',
    '44_saveTheBestForLast':'myers shape forma michael myers la forma',
    '16_enduring':'hillbilly pueblerino max thompson el pueblerino',
    '32_lightborn':'hillbilly pueblerino max thompson el pueblerino',
    '53_tinkerer':'hillbilly pueblerino max thompson el pueblerino',
    '19_hangmansTrick':'pig cerda amanda young la cerda',
    '34_makeYourChoice':'pig cerda amanda young la cerda',
    '50_surveillance':'pig cerda amanda young la cerda',
    '20_hexDevourHope':'hag bruja lisa sherwood la bruja',
    '24_hexRuin':'hag bruja lisa sherwood la bruja',
    '25_hexTheThirdSeal':'hag bruja lisa sherwood la bruja',
    '21_hexHauntedGround':'spirit espiritu rin yamaoka el espiritu la espiritu',
    '42_rancor':'spirit espiritu rin yamaoka el espiritu la espiritu',
    '48_spiritFury':'spirit espiritu rin yamaoka el espiritu la espiritu',
    '57_imAllEars':'ghost face ghostface cara fantasma el ghost face',
    '58_thrillingTremors':'ghost face ghostface cara fantasma el ghost face',
    '59_furtiveChase':'ghost face ghostface cara fantasma el ghost face'
  };
  const OWNER_RANGES=[
    [60,62,'demogorgon demo el demogorgon'],
    [63,65,'oni kazan yamaoka el oni'],
    [66,68,'deathslinger arponero caleb quinn el arponero'],
    [69,71,'pyramid head executioner verdugo el verdugo pyramidhead'],
    [72,74,'blight deterioro talbot grimes el deterioro'],
    [75,77,'twins gemelos charlotte victor los gemelos'],
    [78,80,'trickster traicionero ji woon hak el traicionero'],
    [81,83,'nemesis el nemesis'],
    [84,86,'cenobite pinhead cenobita el cenobita'],
    [87,89,'artist artista carmina mora la artista'],
    [90,92,'onryo sadako la onryo el onryo'],
    [93,95,'dredge draga la draga'],
    [97,99,'wesker mastermind mente maestra albert wesker la mente maestra'],
    [100,102,'knight caballero tarhos kovacs el caballero'],
    [103,105,'skull merchant comerciante de calaveras adriana imai la comerciante de calaveras'],
    [106,108,'singularity singularidad hux la singularidad'],
    [109,111,'xenomorph alien xenomorfo el xenomorfo'],
    [112,114,'chucky good guy chico bueno el chico bueno'],
    [115,117,'unknown the unknown desconocido lo desconocido el desconocido'],
    [118,120,'vecna lich liche el liche'],
    [121,123,'dracula dark lord señor oscuro el señor oscuro'],
    [124,126,'houndmaster adiestradora canina la adiestradora canina'],
    [127,129,'ghoul kaneki el ghoul'],
    [130,132,'animatronic springtrap animatronico el animatronico'],
    [133,135,'krasue la krasue'],
    [136,138,'first lich primer liche el primer liche'],
    [139,141,'jason slasher el slasher'],
    [142,144,'judgment sentencia la sentencia']
  ];

  const perkNumber=key=>{const m=String(key||'').match(/^(\d+)_/);return m?Number(m[1]):-1};
  const ownerAliases=item=>{
    if(OWNER_BY_KEY[item?.key])return OWNER_BY_KEY[item.key];
    const n=perkNumber(item?.key),group=OWNER_RANGES.find(([from,to])=>n>=from&&n<=to);
    return group?group[2]:'';
  };

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(...args)=>{
    const response=await nativeFetch(...args);
    let url='';
    try{url=typeof args[0]==='string'?args[0]:args[0]?.url||''}catch{}
    if(!/data\/perks-killer\.json(?:$|[?#])/.test(url))return response;
    try{
      const data=await response.clone().json();
      if(!Array.isArray(data))return response;
      data.forEach(item=>{
        const owner=ownerAliases(item);
        if(owner)item.aliases=`${item.aliases||''} ${owner}`.trim();
      });
      const headers=new Headers(response.headers);
      headers.set('content-type','application/json; charset=utf-8');
      return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
    }catch{return response}
  };

  const rouletteTabs=new Set(['killers','survivor','killerPerks']);
  const labelFor=key=>({
    killers:'TODOS LOS KILLERS SE ENCUENTRAN OCULTOS',
    survivor:'TODAS LAS PERKS DE SUPERVIVIENTES SE ENCUENTRAN OCULTAS',
    killerPerks:'TODAS LAS PERKS DE KILLERS SE ENCUENTRAN OCULTAS'
  }[key]||'TODAS LAS TARJETAS SE ENCUENTRAN OCULTAS');

  function installCollapseControl(){
    const tools=document.querySelector('#roulettePanel .panel-tools'),grid=document.getElementById('weightGrid'),search=document.getElementById('panelSearch');
    if(!tools||!grid||!search||document.getElementById('toggleWeightCards'))return;

    let collapsed=true,currentKey=document.querySelector('.panel-tabs button[data-tab].active')?.dataset.tab||'killers';
    const nativeAppend=grid.appendChild.bind(grid);
    const ensureMessage=()=>{
      if(!collapsed)return;
      let message=grid.querySelector('.roulette-collapsed-message');
      if(!message){
        message=document.createElement('div');
        message.className='roulette-collapsed-message';
        nativeAppend(message);
      }
      message.textContent=labelFor(currentKey);
    };

    grid.appendChild=node=>{
      if(collapsed&&node?.classList?.contains('weight-card'))return node;
      return nativeAppend(node);
    };

    const button=document.createElement('button');
    button.id='toggleWeightCards';
    button.className='roulette-collapse-toggle';
    button.type='button';
    button.setAttribute('aria-controls','weightGrid');
    button.innerHTML='<span class="roulette-collapse-chevron" aria-hidden="true"></span>';
    tools.appendChild(button);

    const preserveViewport=callback=>{
      const top=window.scrollY,left=window.scrollX;
      callback();
      button.blur();
      requestAnimationFrame(()=>{
        window.scrollTo({top,left,behavior:'auto'});
        requestAnimationFrame(()=>window.scrollTo({top,left,behavior:'auto'}));
      });
    };

    const sync=state=>{
      collapsed=state;
      grid.classList.toggle('is-collapsed',collapsed);
      button.setAttribute('aria-expanded',collapsed?'false':'true');
      button.setAttribute('aria-label',collapsed?'Mostrar todas las tarjetas':'Ocultar todas las tarjetas');
      button.title=collapsed?'MOSTRAR TARJETAS':'OCULTAR TARJETAS';
      if(collapsed){
        grid.replaceChildren();
        ensureMessage();
      }
    };

    const observer=new MutationObserver(()=>{
      if(collapsed&&!grid.querySelector('.roulette-collapsed-message'))ensureMessage();
    });
    observer.observe(grid,{childList:true});

    button.addEventListener('click',event=>{
      event.preventDefault();
      preserveViewport(()=>{
        if(collapsed){
          sync(false);
          search.dispatchEvent(new Event('input',{bubbles:true}));
        }else sync(true);
      });
    });

    document.addEventListener('click',event=>{
      const tab=event.target.closest('.panel-tabs button[data-tab]');
      if(!tab||!rouletteTabs.has(tab.dataset.tab))return;
      currentKey=tab.dataset.tab;
      sync(true);
    },true);

    document.addEventListener('input',event=>{
      if(event.target!==search||collapsed)return;
      const y=window.scrollY,x=window.scrollX;
      requestAnimationFrame(()=>window.scrollTo({top:y,left:x,behavior:'auto'}));
    },true);

    sync(true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installCollapseControl,{once:true});
  else installCollapseControl();
})();
