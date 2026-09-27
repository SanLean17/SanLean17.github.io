// Public frontend configuration for SanLean.
// The publishable key is intentionally safe to expose in browser code.
window.SANLEAN_SUPABASE = {
  url: 'https://ugdwieebdgarkjrrpyal.supabase.co',
  publishableKey: 'sb_publishable_XYQahihrvnNsuEg0yehdMg_MWW5akW8'
};

// Private USUARIO panel runtime fixes. Public WEB behavior is unchanged.
if (/\/Usuario\/(?:index\.html)?$/.test(location.pathname)) {
  const script=document.createElement('script');
  script.src='../js/usuario-runtime-fix.js?v=20260927-1';
  script.defer=true;
  document.head.appendChild(script);
}
