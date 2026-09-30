(()=>{
 const p=new URLSearchParams(location.search),filter=['harmful','beneficial'].includes(p.get('filter'))?p.get('filter'):'';
 if(!filter)return;
 window.__SANLEAN_BITS_ALERT_FILTER__=filter;
})();