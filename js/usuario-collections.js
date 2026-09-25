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
  const samples = [
    ['tournamentPanel', 'TORNEO 1VS1', `<div class="ui-table-wrap" tabindex="0" role="region" aria-label="Resultados simulados; desplazamiento horizontal"><table class="tournament-table"><thead><tr><th scope="col">PUESTO</th><th scope="col">NOMBRE DE USUARIO</th><th scope="col">TIEMPO</th><th scope="col">ACCIONES</th></tr></thead><tbody>${[['1','Luna_demo','03:25.840'],['2','Usuario_de_prueba_con_nombre_largo','02:48.120'],['3','Nico_demo','01:06.005']].map(([rank,name,time]) => `<tr><td>${rank}</td><td>${name}</td><td>${time}</td><td><button class="remove-player" type="button" disabled aria-label="Eliminar ${name} (simulación)">×</button></td></tr>`).join('')}</tbody></table></div>`],
    ['section-collaborators', 'COLABORADORES', `<div class="collaborator-cards">${[['moderador.demo@example.com',['KILLERS','TORNEO 1VS1']],['colaborador.con.nombre.largo@example.com',['PERKS SUPERVIVIENTE','PERKS KILLER']]].map(([email,permissions]) => `<div class="collaborator-card-new"><div><strong>${email}</strong><div class="permission-tags">${permissions.map(p => `<span>${p}</span>`).join('')}</div></div><div class="collab-actions"><button type="button" disabled>EDITAR</button><button type="button" data-delete disabled>ELIMINAR</button></div></div>`).join('')}</div>`],
    ['streamGiveawaysPanel', 'SORTEOS', `<div class="participant-list">${[['Agus_demo','TWITCH'],['Participante_de_prueba_con_nombre_largo','KICK'],['Luna_demo','TWITCH']].map(([name,platform]) => `<div class="participant-row"><span class="participant-identity"><span>${name}</span><small class="ui-badge">ACEPTADO</small></span><span class="participant-row-meta">${platform}</span><button class="participant-expel" type="button" disabled aria-label="Expulsar a ${name} del sorteo (simulación)">EXPULSAR</button></div>`).join('')}</div>`],
    ['streamVotesPanel', 'VOTACIONES', `<div class="vote-live-head"><strong>MAZO DE EJEMPLO · FINALIZADA</strong><span>20 VOTOS SIMULADOS</span></div><div class="vote-result-list">${[['A','Reto de killers',12,60],['B','Perks de superviviente con descripción extensa',8,40],['C','Sin votos',0,0]].map(([slot,label,count,percent]) => `<div class="vote-result"><b>${slot}${slot==='A'?' ★':''}</b><div><span>${label}</span><div class="vote-result-bar" role="img" aria-label="${percent}% de votos"><i style="width:${percent}%"></i></div></div><strong>${count}</strong></div>`).join('')}</div>`]
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
})();
