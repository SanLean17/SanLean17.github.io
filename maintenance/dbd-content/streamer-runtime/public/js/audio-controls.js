/* Shared presentation only: the sound engines and audio files are unchanged. */
(()=>{
  function update(input){
    const min=Number(input.min)||0,max=Number(input.max)||100,value=Number(input.value),percent=Math.max(0,Math.min(100,(value-min)/(max-min)*100));
    input.style.setProperty('--range-progress',percent+'%');input.setAttribute('aria-valuetext',value+' por ciento');
    const output=input.parentElement.querySelector('output');if(output)output.textContent=value+'%';
  }
  function sync(root=document){root.querySelectorAll('.selection-setting-value input[type="range"]').forEach(update);}
  document.querySelectorAll('.wheel-sound-fields,.audio-settings-row').forEach(row=>{
    row.classList.add('sanlean-audio-row');
    const choice=row.querySelector('.audio-choice'),volume=row.querySelector('.selection-setting'),enabled=row.querySelector('.audio-enabled')||row.firstElementChild;
    enabled.classList.add('audio-enabled');
    const value=volume.querySelector('.selection-setting-value'),label=volume.querySelector('label');
    value.remove();label.className='audio-field-label';label.htmlFor=value.querySelector('input').id;volume.appendChild(value);
    choice.querySelector('label').className='audio-field-label';
    row.prepend(enabled,choice,volume);
  });
  document.addEventListener('input',e=>{if(e.target.matches('.selection-setting-value input[type="range"]'))update(e.target);},true);
  window.SanLeanAudioControls={sync,update};sync();
})();
