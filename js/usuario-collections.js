/* Review fixtures stay in their own DOM: no storage, API calls or live record IDs. */
(() => {
  document.querySelectorAll('.tournament-table,.finished-table').forEach(table => {
    const wrap = document.createElement('div');
    wrap.className = 'ui-table-wrap';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Resultados del torneo; desplazamiento horizontal en pantallas pequeñas');
    table.before(wrap);
    wrap.append(table);
    table.querySelectorAll('th').forEach(th => th.scope = 'col');
    if (table.classList.contains('tournament-table')) table.querySelector('th:last-child').textContent = 'ACCIONES';
  });
  const voteCards = [
    ['A',33,41,'3 PERKS'],['B',26,32,'0 PERKS'],['C',12,15,'4 PERKS'],['D',10,12,'1 PERK'],['E',0,0,'2 PERKS']
  ];
  const specialCards = [
    ['A',8,24,'0 PERKS · 0 ADD-ONS'],['B',12,36,'RESULTADO ESPECIAL'],['C',5,15,'RESULTADO ESPECIAL'],['D',8,24,'RESULTADO ESPECIAL'],['E',0,0,'RESULTADO ESPECIAL']
  ];
  const voteCardsMarkup = (cards,{special=false,winner='A'}={}) => `<div class="vote-sim-mode"><span>${special?'EVENTO ESPECIAL':'RONDA NORMAL'}</span><strong>${special?'VOTOS ACUMULABLES':'1 VOTO ACTIVO POR USUARIO'}</strong></div><div class="vote-sim-cards">${cards.map(([slot,count,percent,result]) => `<article class="vote-sim-card${special?' is-special':''}${slot===winner?' is-winner':''}"><div class="vote-sim-card-face"><b>${slot}</b></div><div class="vote-sim-card-hidden"><small>CONTENIDO OCULTO</small><strong>${result}</strong></div></article>`).join('')}</div><div class="vote-result-list">${cards.map(([slot,count,percent])=>`<div class="vote-result"><b>${slot}</b><div><span>${count} VOTOS · ${percent}%</span><div class="vote-result-bar" role="img" aria-label="${percent}% de votos"><i style="width:${percent}%"></i></div></div><strong>${count}</strong></div>`).join('')}</div>`;
  const samples = [
    ['tournamentPanel', 'TORNEO 1VS1', `<div class="ui-table-wrap" tabindex="0" role="region" aria-label="Resultados simulados; desplazamiento horizontal"><table class="tournament-table"><thead><tr><th scope="col">PUESTO</th><th scope="col">NOMBRE DE USUARIO</th><th scope="col">TIEMPO</th><th scope="col">ACCIONES</th></tr></thead><tbody>${[['1','Luna_demo','03:25.840'],['2','Usuario_de_prueba_con_nombre_largo','02:48.120'],['3','Nico_demo','01:06.005']].map(([rank,name,time]) => `<tr><td>${rank}</td><td>${name}</td><td>${time}</td><td><button class="remove-player" type="button" disabled aria-label="Eliminar ${name} (simulación)">×</button></td></tr>`).join('')}</tbody></table></div>`],
    ['section-collaborators', 'COLABORADORES', `<div class="collaborator-cards">${[['moderador.demo@example.com',['KILLERS','TORNEO 1VS1']],['colaborador.con.nombre.largo@example.com',['PERKS SUPERVIVIENTE','PERKS KILLER']]].map(([email,permissions]) => `<div class="collaborator-card-new"><div><strong>${email}</strong><div class="permission-tags">${permissions.map(p => `<span>${p}</span>`).join('')}</div></div><div class="collab-actions"><button type="button" disabled>EDITAR</button><button type="button" data-delete disabled>ELIMINAR</button></div></div>`).join('')}</div>`],
    ['streamGiveawaysPanel', 'SORTEOS', `<div class="participant-list">${[['Agus_demo','TWITCH'],['Participante_de_prueba_con_nombre_largo','KICK'],['Luna_demo','TWITCH']].map(([name,platform]) => `<div class="participant-row"><span class="participant-identity"><span>${name}</span><small class="ui-badge">ACEPTADO</small></span><span class="participant-row-meta">${platform}</span><button class="participant-expel" type="button" disabled aria-label="Expulsar a ${name} del sorteo (simulación)">EXPULSAR</button></div>`).join('')}</div>`],
    ['streamVotesPanel', 'CARTAS', `<div class="vote-sim-shell"><div class="vote-sim-toolbar"><span class="ui-badge">MODO CHAT</span><span class="ui-badge">SUPERVIVIENTE</span><strong>00:00 · VOTACIÓN CERRADA</strong></div>${voteCardsMarkup(voteCards,{winner:'A'})}<div class="vote-sim-actions"><button type="button" disabled>REVELAR CARTA GANADORA</button><button type="button" disabled>IR A PERKS DE SUPERVIVIENTE</button></div><p class="vote-sim-help">La cantidad y el porcentaje de votos aparecen debajo de las cartas. Después del reveal, el streamer puede mostrar también las otras cartas.</p><div class="vote-sim-separator"></div>${voteCardsMarkup(specialCards,{special:true,winner:'B'})}</div>`]
  ];
  samples.forEach(([id,title,content]) => {
    const section = document.getElementById(id);
    if (!section) return;
    const sample = document.createElement('details');
    sample.className = 'ui-simulation';
    sample.open = true;
    sample.innerHTML = `<summary>SIMULACIÓN · ${title}</summary><p>Datos ficticios para revisar el diseño. No se guardan ni afectan tu cuenta. Las acciones de ejemplo están deshabilitadas. Podés plegar esta vista.</p>${content}`;
    section.append(sample);
  });

  function renameCollaboratorPermission(){
    document.querySelectorAll('.account-page .permission-grid label span,.account-page .permission-tags span').forEach(span=>{
      if(span.textContent.trim()==='VOTACIONES')span.textContent='CARTAS';
    });
  }
  renameCollaboratorPermission();
  if(document.body.classList.contains('account-page'))new MutationObserver(renameCollaboratorPermission).observe(document.body,{childList:true,subtree:true});

  if(document.body.classList.contains('user-page')&&!document.querySelector('script[data-sanlean-cards]')){
    const script=document.createElement('script');
    script.src='../js/usuario-cartas.js?v=20260925-1';
    script.dataset.sanleanCards='true';
    document.body.appendChild(script);
  }
})();
